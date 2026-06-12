<template>
  <div style="width: 100%">
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px">
          <span style="font-size: 18px; font-weight: 600">维护策略建议</span>
          <n-space style="flex-wrap: wrap">
            <n-select
              v-model:value="selectedSchemeId"
              :options="schemeOptions"
              placeholder="请选择试验方案"
              style="width: 240px"
              clearable
              @update:value="handleSchemeChange"
            />
            <n-select
              v-model:value="priorityFilter"
              :options="priorityOptions"
              placeholder="按优先级筛选"
              style="width: 140px"
              clearable
            />
            <n-button type="primary" @click="generateStrategies" :disabled="!selectedSchemeId">
              🔄 生成策略
            </n-button>
          </n-space>
        </div>
      </template>

      <n-alert v-if="!selectedSchemeId" type="info" :show-icon="true" style="margin-bottom: 16px">
        请先选择一个试验方案以生成维护策略建议。
      </n-alert>

      <n-alert v-else-if="strategies.length === 0" type="warning" :show-icon="true">
        暂无维护策略数据，请点击「生成策略」按钮或确保该方案已有试验记录。
      </n-alert>

      <template v-else>
        <n-space :size="24" style="flex-wrap: wrap; margin-bottom: 16px">
          <n-statistic
            label="高优先级任务"
            :value="highPriorityCount"
            value-style="color: #d03050"
          />
          <n-statistic
            label="中优先级任务"
            :value="mediumPriorityCount"
            value-style="color: #f0a020"
          />
          <n-statistic
            label="低优先级任务"
            :value="lowPriorityCount"
            value-style="color: #18a058"
          />
          <n-statistic
            label="预计总耗时"
            :value="formatDuration(totalEstimatedDuration)"
          />
          <n-statistic
            label="已完成任务"
            :value="completedCount"
            suffix="/ "
            :value-style="{ color: completedCount === strategies.length ? '#18a058' : '#2080f0' }"
          >
            <template #suffix>
              <span style="color: #999; font-size: 14px">/ {{ strategies.length }}</span>
            </template>
          </n-statistic>
        </n-space>
      </template>
    </n-card>

    <n-card v-if="filteredStrategies.length > 0">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>维护任务列表</span>
          <n-tag v-if="priorityFilter" type="info">
            当前筛选：{{ priorityLabelMap[priorityFilter] }}优先级
          </n-tag>
        </div>
      </template>

      <n-data-table
        :columns="columns"
        :data="filteredStrategies"
        :row-key="(row: any) => row.id"
        :pagination="{ pageSize: 10 }"
        size="medium"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch } from 'vue'
import { useMessage, type DataTableColumns, type SelectOption } from 'naive-ui'
import { useKnowledgeGraphStore } from '@/stores/knowledgeGraph'
import { useSchemeStore } from '@/stores/scheme'
import { COMPONENT_TYPE_OPTIONS, type MaintenanceStrategy } from '@/types'

const knowledgeGraphStore = useKnowledgeGraphStore()
const schemeStore = useSchemeStore()
const message = useMessage()

const selectedSchemeId = ref<string | null>(null)
const priorityFilter = ref<string | null>(null)
const strategies = ref<MaintenanceStrategy[]>([])
const completedTaskIds = ref<Set<string>>(new Set())

const schemeOptions = computed<SelectOption[]>(() => {
  return schemeStore.schemeList.map(s => ({
    label: `${s.name} (${s.completedRounds}/${s.totalRounds}轮)`,
    value: s.id,
    disabled: !s.hasTrials
  }))
})

const priorityOptions: SelectOption[] = [
  { label: '高优先级', value: 'high' },
  { label: '中优先级', value: 'medium' },
  { label: '低优先级', value: 'low' }
]

const priorityLabelMap: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

const actionLabelMap: Record<string, string> = {
  lubrication: '润滑',
  adjustment: '调整',
  repair: '修理',
  replacement: '更换',
  cleaning: '清洁',
  monitoring: '监控'
}

const typeLabelMap: Record<string, string> = {}
COMPONENT_TYPE_OPTIONS.forEach(o => { typeLabelMap[o.value] = o.label })
typeLabelMap['rope'] = '井绳'
typeLabelMap['bucket'] = '汲桶'

const activeStrategies = computed(() => {
  return strategies.value.filter(s => !completedTaskIds.value.has(s.id))
})

const highPriorityCount = computed(() => 
  activeStrategies.value.filter(s => s.priority === 'high').length
)

const mediumPriorityCount = computed(() => 
  activeStrategies.value.filter(s => s.priority === 'medium').length
)

const lowPriorityCount = computed(() => 
  activeStrategies.value.filter(s => s.priority === 'low').length
)

const totalEstimatedDuration = computed(() => 
  activeStrategies.value.reduce((sum, s) => sum + s.estimatedDuration, 0)
)

const completedCount = computed(() => completedTaskIds.value.size)

const filteredStrategies = computed(() => {
  let result = strategies.value
  if (priorityFilter.value) {
    result = result.filter(s => s.priority === priorityFilter.value)
  }
  return result
})

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'increasing':
      return h(
        'span',
        { style: { color: '#d03050', fontWeight: 600 } },
        '📈 上升'
      )
    case 'decreasing':
      return h(
        'span',
        { style: { color: '#18a058', fontWeight: 600 } },
        '📉 下降'
      )
    default:
      return h(
        'span',
        { style: { color: '#f0a020', fontWeight: 600 } },
        '➡️ 稳定'
      )
  }
}

function getPriorityTag(priority: string) {
  const colors: Record<string, string> = {
    high: '#d03050',
    medium: '#f0a020',
    low: '#18a058'
  }
  return h(
    'n-tag',
    {
      style: {
        backgroundColor: colors[priority],
        color: '#fff',
        border: 'none'
      },
      size: 'small'
    },
    () => priorityLabelMap[priority] + '优先级'
  )
}

function handleSchemeChange() {
  strategies.value = []
  completedTaskIds.value.clear()
}

function generateStrategies() {
  if (!selectedSchemeId.value) {
    message.warning('请先选择试验方案')
    return
  }
  const scheme = schemeStore.schemes.find(s => s.id === selectedSchemeId.value)
  if (!scheme || scheme.trials.length === 0) {
    message.warning('该方案暂无试验记录，无法生成维护策略')
    return
  }
  knowledgeGraphStore.buildGraph()
  strategies.value = knowledgeGraphStore.generateMaintenanceStrategies(selectedSchemeId.value)
  completedTaskIds.value.clear()
  message.success(`已生成 ${strategies.value.length} 条维护策略建议`)
}

function toggleComplete(row: MaintenanceStrategy) {
  if (completedTaskIds.value.has(row.id)) {
    completedTaskIds.value.delete(row.id)
    message.info('已取消标记完成')
  } else {
    completedTaskIds.value.add(row.id)
    message.success('任务已标记为完成')
  }
}

const columns: DataTableColumns<MaintenanceStrategy> = [
  {
    title: '构件编号',
    key: 'componentNo',
    width: 120,
    render: (row) => h(
      'div',
      { style: { fontWeight: 600 } },
      row.componentNo
    )
  },
  {
    title: '类型',
    key: 'componentType',
    width: 120,
    render: (row) => typeLabelMap[row.componentType] || row.componentType
  },
  {
    title: '当前磨损',
    key: 'currentWear',
    width: 100,
    render: (row) => h(
      'span',
      {
        style: {
          color: row.currentWear >= 7 ? '#d03050' : row.currentWear >= 4 ? '#f0a020' : '#18a058',
          fontWeight: 500
        }
      },
      `${row.currentWear} / 10`
    )
  },
  {
    title: '磨损趋势',
    key: 'wearTrend',
    width: 100,
    render: (row) => getTrendIcon(row.wearTrend)
  },
  {
    title: '预计剩余寿命',
    key: 'estimatedRemainingLife',
    width: 120,
    render: (row) => {
      const life = row.estimatedRemainingLife
      return h(
        'span',
        {
          style: {
            color: life <= 5 ? '#d03050' : life <= 20 ? '#f0a020' : '#18a058',
            fontWeight: 500
          }
        },
        `约 ${life} 轮`
      )
    }
  },
  {
    title: '推荐措施',
    key: 'recommendedAction',
    width: 100,
    render: (row) => h(
      'n-tag',
      { type: 'info', size: 'small' },
      () => actionLabelMap[row.recommendedAction] || row.recommendedAction
    )
  },
  {
    title: '优先级',
    key: 'priority',
    width: 100,
    render: (row) => getPriorityTag(row.priority)
  },
  {
    title: '预计耗时',
    key: 'estimatedDuration',
    width: 100,
    render: (row) => formatDuration(row.estimatedDuration)
  },
  {
    title: '描述',
    key: 'description',
    width: 200,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => completedTaskIds.value.has(row.id)
      ? h('n-tag', { type: 'success', size: 'small' }, () => '✅ 已完成')
      : h('n-tag', { type: 'warning', size: 'small' }, () => '⏳ 待处理')
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(
      'div',
      { style: { display: 'flex', gap: '8px' } },
      [
        h(
          'button',
          {
            style: {
              padding: '0 12px',
              height: '28px',
              fontSize: '12px',
              borderRadius: '3px',
              border: completedTaskIds.value.has(row.id)
                ? '1px solid #f0a020'
                : '1px solid #18a058',
              background: '#fff',
              color: completedTaskIds.value.has(row.id) ? '#f0a020' : '#18a058',
              cursor: 'pointer'
            },
            onClick: () => toggleComplete(row)
          },
          completedTaskIds.value.has(row.id) ? '撤销完成' : '标记完成'
        )
      ]
    )
  }
]

watch(selectedSchemeId, (newId) => {
  if (newId) {
    generateStrategies()
  }
})
</script>
