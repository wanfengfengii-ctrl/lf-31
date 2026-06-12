<template>
  <div>
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px">
          <span style="font-size: 18px; font-weight: 600">提水效率预测</span>
          <n-space style="flex-wrap: wrap">
            <n-select
              v-model:value="selectedSchemeId"
              :options="schemeOptions"
              placeholder="请选择试验方案"
              style="width: 240px"
              clearable
              @update:value="handleSchemeChange"
            />
            <n-button type="primary" @click="predict" :disabled="!selectedSchemeId">
              🔮 生成预测
            </n-button>
          </n-space>
        </div>
      </template>

      <n-alert v-if="!selectedSchemeId" type="info" :show-icon="true" style="margin-bottom: 16px">
        请先选择一个试验方案以进行效率预测分析。
      </n-alert>

      <n-alert v-else-if="!prediction" type="warning" :show-icon="true">
        暂无预测数据，请点击「生成预测」按钮或确保该方案已有足够的试验记录。
      </n-alert>

      <template v-else>
        <n-space :size="24" style="flex-wrap: wrap; margin-bottom: 16px">
          <n-statistic
            label="预测效率"
            :value="Number(prediction.predictedEfficiency.toFixed(4))"
            suffix="L/s"
            value-style="color: #18a058; font-size: 28px"
          >
            <template #prefix>
              <span style="font-size: 20px">📈</span>
            </template>
          </n-statistic>
          <n-statistic
            label="历史平均效率"
            :value="Number(prediction.historicalData.avgEfficiency.toFixed(4))"
            suffix="L/s"
            value-style="color: #2080f0"
          />
          <n-statistic
            label="预测置信度"
            :value="prediction.confidence"
            suffix="%"
            :value-style="{ color: prediction.confidence >= 80 ? '#18a058' : prediction.confidence >= 60 ? '#f0a020' : '#d03050' }"
          />
          <n-statistic
            label="效率趋势"
            :value="trendLabel"
            :value-style="{ color: trendColor }"
          />
          <n-statistic
            label="有效数据点"
            :value="prediction.historicalData.dataPoints"
            suffix="轮"
          />
        </n-space>

        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <n-gi>
            <n-card title="📊 效率趋势对比">
              <v-chart class="chart" :option="trendChartOption" autoresize />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="🎯 影响因素分析">
              <v-chart class="chart" :option="factorChartOption" autoresize />
            </n-card>
          </n-gi>
        </n-grid>

        <n-card title="📋 影响因素明细" style="margin-top: 16px">
          <n-data-table
            :columns="factorColumns"
            :data="prediction.factors"
            :row-key="(row: any) => row.factor"
            :pagination="false"
            size="small"
          />
        </n-card>

        <n-card title="💡 优化建议" style="margin-top: 16px">
          <n-list bordered>
            <n-list-item v-for="(rec, idx) in prediction.recommendations" :key="idx">
              <n-list-item-meta>
                <template #avatar>
                  <n-avatar :size="32" :style="{ background: getRecColor(idx) }">
                    {{ idx + 1 }}
                  </n-avatar>
                </template>
                <template #title>
                  <span style="font-weight: 500">{{ rec }}</span>
                </template>
              </n-list-item-meta>
            </n-list-item>
          </n-list>
        </n-card>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useMessage, type DataTableColumns, type SelectOption } from 'naive-ui'
import { useKnowledgeGraphStore } from '@/stores/knowledgeGraph'
import { useSchemeStore } from '@/stores/scheme'
import type { EfficiencyPrediction as EfficiencyPredictionType } from '@/types'

const knowledgeGraphStore = useKnowledgeGraphStore()
const schemeStore = useSchemeStore()
const message = useMessage()

const selectedSchemeId = ref<string | null>(null)
const prediction = ref<EfficiencyPredictionType | null>(null)

const schemeOptions = computed<SelectOption[]>(() => {
  return schemeStore.schemeList.map(s => ({
    label: `${s.name} (${s.completedRounds}/${s.totalRounds}轮)`,
    value: s.id,
    disabled: !s.hasTrials
  }))
})

const trendLabel = computed(() => {
  if (!prediction.value) return '-'
  const trendMap: Record<string, string> = {
    improving: '📈 提升中',
    stable: '➡️ 稳定',
    declining: '📉 下降中'
  }
  return trendMap[prediction.value.historicalData.trend] || '-'
})

const trendColor = computed(() => {
  if (!prediction.value) return '#999'
  const colorMap: Record<string, string> = {
    improving: '#18a058',
    stable: '#2080f0',
    declining: '#d03050'
  }
  return colorMap[prediction.value.historicalData.trend] || '#999'
})

const trendChartOption = computed(() => {
  if (!prediction.value) return {}
  
  const scheme = schemeStore.schemes.find(s => s.id === selectedSchemeId.value)
  if (!scheme) return {}
  
  const approvedTrials = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
  const bucket = scheme.buckets[0]
  
  const historicalEfficiencies = approvedTrials.map(t => {
    if (!bucket || t.timeCost <= 0) return 0
    return Number(((bucket.capacity * (1 - t.leakageRate / 100)) / t.timeCost).toFixed(4))
  })
  
  const labels = approvedTrials.map((_, i) => `第${i + 1}轮`)
  
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['历史效率', '预测值'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: [...labels, '预测'],
      axisLabel: { rotate: 45 }
    },
    yAxis: {
      type: 'value',
      name: 'L/s'
    },
    series: [
      {
        name: '历史效率',
        type: 'line',
        smooth: true,
        data: [...historicalEfficiencies, null],
        itemStyle: { color: '#2080f0' },
        areaStyle: { opacity: 0.1 },
        markLine: {
          data: [
            { type: 'average', name: '历史平均', lineStyle: { color: '#2080f0' } },
            { 
              yAxis: prediction.value.predictedEfficiency, 
              name: '预测值', 
              lineStyle: { color: '#18a050', type: 'dashed' },
              label: { formatter: '预测: {c}' }
            }
          ]
        }
      },
      {
        name: '预测值',
        type: 'scatter',
        data: [
          {
            value: [labels.length, prediction.value.predictedEfficiency],
            symbolSize: 20,
            itemStyle: { color: '#18a058' }
          }
        ],
        tooltip: {
          formatter: (params: any) => {
            return `预测效率<br/>${params.value[1]} L/s<br/>置信度: ${prediction.value?.confidence}%`
          }
        }
      }
    ]
  }
})

const factorChartOption = computed(() => {
  if (!prediction.value) return {}
  
  const positiveFactors = prediction.value.factors.filter(f => f.impact === 'positive')
  const negativeFactors = prediction.value.factors.filter(f => f.impact === 'negative')
  const neutralFactors = prediction.value.factors.filter(f => f.impact === 'neutral')
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const factor = prediction.value?.factors.find(f => f.factor === params.name)
        if (!factor) return params.name
        return `<div style="font-weight: 600">${factor.factor}</div>
                <div>影响: ${factor.impact === 'positive' ? '正面' : factor.impact === 'negative' ? '负面' : '中性'}</div>
                <div>权重: ${(factor.weight * 100).toFixed(0)}%</div>
                <div style="color: #666; margin-top: 4px">${factor.description}</div>`
      }
    },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 20
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%'
        },
        data: [
          ...positiveFactors.map(f => ({
            value: f.weight * 100,
            name: f.factor,
            itemStyle: { color: '#18a058' }
          })),
          ...negativeFactors.map(f => ({
            value: f.weight * 100,
            name: f.factor,
            itemStyle: { color: '#d03050' }
          })),
          ...neutralFactors.map(f => ({
            value: f.weight * 100,
            name: f.factor,
            itemStyle: { color: '#f0a020' }
          }))
        ].filter(d => d.value > 0)
      }
    ]
  }
})

const factorColumns: DataTableColumns<any> = [
  {
    title: '影响因素',
    key: 'factor',
    width: 140,
    render: (row) => h(
      'span',
      { style: { fontWeight: 500 } },
      row.factor
    )
  },
  {
    title: '影响方向',
    key: 'impact',
    width: 100,
    render: (row) => {
      const colors: Record<string, string> = {
        positive: '#18a058',
        negative: '#d03050',
        neutral: '#f0a020'
      }
      const labels: Record<string, string> = {
        positive: '正面',
        negative: '负面',
        neutral: '中性'
      }
      return h(
        'n-tag',
        {
          size: 'small',
          style: {
            backgroundColor: colors[row.impact],
            color: '#fff',
            border: 'none'
          }
        },
        () => labels[row.impact]
      )
    }
  },
  {
    title: '权重',
    key: 'weight',
    width: 100,
    render: (row) => `${(row.weight * 100).toFixed(0)}%`
  },
  {
    title: '说明',
    key: 'description',
    ellipsis: { tooltip: true }
  }
]

function getRecColor(idx: number): string {
  const colors = ['#18a058', '#2080f0', '#f0a020', '#722ed1', '#13c2c2', '#eb2f96']
  return colors[idx % colors.length]
}

function handleSchemeChange() {
  prediction.value = null
}

function predict() {
  if (!selectedSchemeId.value) {
    message.warning('请先选择试验方案')
    return
  }
  const scheme = schemeStore.schemes.find(s => s.id === selectedSchemeId.value)
  if (!scheme || scheme.trials.length < 3) {
    message.warning('该方案试验记录不足（至少需要3轮），无法进行可靠预测')
    return
  }
  
  knowledgeGraphStore.buildGraph()
  prediction.value = knowledgeGraphStore.predictEfficiency(selectedSchemeId.value)
  
  if (prediction.value) {
    message.success('预测分析已完成')
  } else {
    message.error('预测失败，请检查数据')
  }
}

watch(selectedSchemeId, (newId) => {
  if (newId) {
    predict()
  }
})
</script>

<style scoped>
.chart {
  width: 100%;
  height: 320px;
}
</style>
