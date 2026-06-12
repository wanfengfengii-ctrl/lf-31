<template>
  <n-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px">
        <span style="font-size: 18px; font-weight: 600">知识图谱</span>
        <n-space :size="12" wrap>
          <n-select
            v-model:value="selectedSchemeId"
            :options="schemeOptions"
            placeholder="按方案筛选"
            clearable
            style="width: 200px"
            @update:value="handleSchemeFilter"
          />
          <n-select
            v-model:value="layoutType"
            :options="layoutOptions"
            style="width: 140px"
          />
          <n-button type="default" @click="handleRefresh">
            🔄 刷新图谱
          </n-button>
        </n-space>
      </div>
    </template>

    <n-space v-if="graphStore.stats.totalNodes > 0" :size="16" style="margin-bottom: 16px; flex-wrap: wrap">
      <n-tag>节点总数: {{ graphStore.stats.totalNodes }}</n-tag>
      <n-tag>关系总数: {{ graphStore.stats.totalRelations }}</n-tag>
      <n-tag v-if="graphStore.stats.highRiskCount > 0" type="error">
        ⚠️ 高风险节点: {{ graphStore.stats.highRiskCount }}
      </n-tag>
      <n-tag v-if="graphStore.stats.mediumRiskCount > 0" type="warning">
        ⚡ 中风险节点: {{ graphStore.stats.mediumRiskCount }}
      </n-tag>
    </n-space>

    <div style="display: flex; gap: 16px; min-height: 600px">
      <div
        ref="chartContainer"
        style="flex: 1; min-width: 0; position: relative; border: 1px solid #e8e8ee; border-radius: 6px"
      >
        <v-chart
          v-if="chartOption"
          ref="chartRef"
          :option="chartOption"
          :autoresize="true"
          style="width: 100%; height: 100%; min-height: 600px"
          @click="handleChartClick"
        />
        <n-alert
          v-else
          type="info"
          :show-icon="true"
          style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%"
        >
          暂无图谱数据，请先创建试验方案并记录试验数据。
        </n-alert>
      </div>

      <n-card
        v-if="selectedNode"
        style="width: 360px; flex-shrink: 0"
        :bordered="true"
      >
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <n-space :size="8">
              <n-tag :color="nodeTypeColor" :bordered="false">
                {{ nodeTypeLabel }}
              </n-tag>
              <n-tag
                v-if="selectedNode.riskLevel === 'high'"
                type="error"
                size="small"
              >
                高风险
              </n-tag>
              <n-tag
                v-else-if="selectedNode.riskLevel === 'medium'"
                type="warning"
                size="small"
              >
                中风险
              </n-tag>
            </n-space>
            <n-button text size="small" @click="closeDetailPanel">✕</n-button>
          </div>
        </template>

        <n-space vertical :size="16" style="width: 100%">
          <div>
            <div style="font-weight: 600; margin-bottom: 8px; color: #333">节点名称</div>
            <div style="word-break: break-all">{{ selectedNode.label }}</div>
          </div>

          <n-divider style="margin: 0" />

          <div v-if="selectedNode.description">
            <div style="font-weight: 600; margin-bottom: 8px; color: #333">描述</div>
            <div style="color: #666">{{ selectedNode.description }}</div>
          </div>

          <div v-if="selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0">
            <div style="font-weight: 600; margin-bottom: 8px; color: #333">元数据</div>
            <n-descriptions :column="1" size="small" bordered>
              <n-descriptions-item
                v-for="(value, key) in selectedNode.metadata"
                :key="key"
                :label="formatMetadataLabel(String(key))"
              >
                {{ formatMetadataValue(value) }}
              </n-descriptions-item>
            </n-descriptions>
          </div>

          <n-divider style="margin: 0" />

          <div>
            <div style="font-weight: 600; margin-bottom: 8px; color: #333">
              关联节点 ({{ relatedNodes.length }})
            </div>
            <n-space vertical :size="8" style="width: 100%">
              <div
                v-for="node in relatedNodes"
                :key="node.id"
                class="related-node-item"
                @click="handleRelatedNodeClick(node)"
              >
                <n-space :size="8">
                  <div
                    class="node-color-dot"
                    :style="{ background: graphStore.nodeTypeColors[node.type] }"
                  />
                  <span style="font-size: 13px">{{ node.label }}</span>
                </n-space>
                <n-tag size="small" :color="graphStore.nodeTypeColors[node.type]" :bordered="false">
                  {{ graphStore.nodeTypeLabels[node.type] }}
                </n-tag>
              </div>
            </n-space>
          </div>
        </n-space>
      </n-card>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMessage } from 'naive-ui'
import type { EChartsOption } from 'echarts'
import { useKnowledgeGraphStore } from '@/stores/knowledgeGraph'
import { useSchemeStore } from '@/stores/scheme'
import type { KnowledgeNode } from '@/types'

const graphStore = useKnowledgeGraphStore()
const schemeStore = useSchemeStore()
const message = useMessage()

const chartRef = ref()
const chartContainer = ref<HTMLElement | null>(null)
const selectedSchemeId = ref<string | null>(null)
const layoutType = ref<'force' | 'circular' | 'none'>('force')

const layoutOptions = [
  { label: '力导向布局', value: 'force' },
  { label: '环形布局', value: 'circular' },
  { label: '无布局', value: 'none' }
]

const schemeOptions = computed(() => {
  return schemeStore.schemes.map(s => ({
    label: s.name,
    value: s.id
  }))
})

const selectedNode = computed<KnowledgeNode | null>(() => {
  if (!graphStore.selectedNodeId) return null
  return graphStore.getNodeById(graphStore.selectedNodeId) || null
})

const relatedNodes = computed<KnowledgeNode[]>(() => {
  if (!graphStore.selectedNodeId) return []
  return graphStore.getRelatedNodes(graphStore.selectedNodeId)
})

const nodeTypeLabel = computed(() => {
  if (!selectedNode.value) return ''
  return graphStore.nodeTypeLabels[selectedNode.value.type]
})

const nodeTypeColor = computed(() => {
  if (!selectedNode.value) return '#999'
  return graphStore.nodeTypeColors[selectedNode.value.type]
})

const chartOption = computed(() => {
  const graphData = graphStore.getGraphForECharts(selectedSchemeId.value || undefined)
  
  if (graphData.nodes.length === 0) return null

  const layoutConfig = getLayoutConfig()

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = graphStore.getNodeById(params.data.id)
          if (!node) return params.name
          
          let content = `<div style="font-weight: 600; margin-bottom: 4px">${params.name}</div>`
          content += `<div style="color: #999; margin-bottom: 4px">${graphStore.nodeTypeLabels[node.type]}</div>`
          
          if (node.riskLevel) {
            const riskColor = node.riskLevel === 'high' ? '#d03050' : node.riskLevel === 'medium' ? '#f0a020' : '#18a058'
            const riskLabel = node.riskLevel === 'high' ? '高风险' : node.riskLevel === 'medium' ? '中风险' : '低风险'
            content += `<div style="color: ${riskColor}">${riskLabel}</div>`
          }
          
          if (node.metadata && Object.keys(node.metadata).length > 0) {
            content += '<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee">'
            for (const [key, value] of Object.entries(node.metadata)) {
              content += `<div style="font-size: 12px; color: #666">${formatMetadataLabel(key)}: ${formatMetadataValue(value)}</div>`
            }
            content += '</div>'
          }
          
          return content
        } else if (params.dataType === 'edge') {
          return `<div style="font-weight: 600">${params.data.name}</div>`
        }
        return ''
      }
    },
    legend: {
      data: graphData.legendData,
      orient: 'vertical',
      right: 20,
      top: 20,
      textStyle: {
        fontSize: 12
      },
      itemGap: 12
    },
    toolbox: {
      show: true,
      feature: {
        restore: { title: '重置' },
        saveAsImage: { title: '保存图片' }
      },
      left: 20,
      top: 20
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        name: '知识图谱',
        type: 'graph',
        layout: layoutConfig.type,
        circular: layoutConfig.circular,
        force: layoutConfig.force,
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        nodeScaleRatio: 0.6,
        data: graphData.nodes,
        links: graphData.links,
        categories: graphData.categories,
        label: {
          show: true,
          position: 'bottom',
          fontSize: 11
        },
        lineStyle: {
          color: 'source',
          curveness: 0.1,
          width: 2
        },
        edgeLabel: {
          show: false,
          formatter: '{b}',
          fontSize: 10
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        select: {
          itemStyle: {
            borderWidth: 4,
            borderColor: '#18a058',
            shadowBlur: 25,
            shadowColor: '#18a058'
          }
        },
        selectedMode: 'single'
      }
    ]
  } as EChartsOption
})

function getLayoutConfig() {
  switch (layoutType.value) {
    case 'circular':
      return {
        type: 'circular' as const,
        circular: {
          rotateLabel: true,
          sortBy: 'degree'
        },
        force: undefined
      }
    case 'none':
      return {
        type: 'none' as const,
        circular: undefined,
        force: undefined
      }
    default:
      return {
        type: 'force' as const,
        circular: undefined,
        force: {
          repulsion: 400,
          gravity: 0.1,
          edgeLength: [80, 200],
          friction: 0.6
        }
      }
  }
}

function formatMetadataLabel(key: string): string {
  const labelMap: Record<string, string> = {
    depth: '井深 (m)',
    diameter: '直径 (m)',
    waterLevel: '水位 (m)',
    componentNo: '构件编号',
    material: '材质',
    wearResistance: '耐磨性',
    avgWear: '平均磨损',
    capacity: '容量 (L)',
    weight: '自重 (kg)',
    wallThickness: '壁厚 (mm)',
    ropeNo: '井绳编号',
    breakingStrength: '断裂强度',
    type: '类型',
    count: '出现次数',
    completedRounds: '已完成轮次',
    totalRounds: '总轮次',
    assemblyComplete: '装配完成',
    avgEfficiency: '平均效率 (L/s)',
    avgTimeCost: '平均耗时 (s)',
    avgLeakage: '平均漏水率 (%)',
    abnormalRate: '异常率 (%)',
    avgRopeWear: '平均井绳磨损',
    avgBucketWear: '平均汲桶磨损'
  }
  return labelMap[key] || key
}

function formatMetadataValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (value === null || value === undefined) {
    return '-'
  }
  return String(value)
}

function handleChartClick(params: any) {
  if (params.dataType === 'node') {
    graphStore.selectNode(params.data.id)
  }
}

function handleRelatedNodeClick(node: KnowledgeNode) {
  graphStore.selectNode(node.id)
}

function closeDetailPanel() {
  graphStore.selectNode(null)
}

function handleSchemeFilter() {
  graphStore.selectNode(null)
  message.info(selectedSchemeId.value ? '已按方案筛选' : '已显示全部数据')
}

function handleRefresh() {
  graphStore.buildGraph()
  graphStore.selectNode(null)
  message.success('图谱已刷新')
}

watch(layoutType, () => {
  graphStore.selectNode(null)
})

onMounted(() => {
  graphStore.buildGraph()
})
</script>

<style scoped>
:deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
}

.related-node-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f7;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.related-node-item:hover {
  background: #e8e8ee;
}

.node-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
