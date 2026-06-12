<template>
  <div>
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">🧠 复原试验知识图谱与推荐决策中心</span>
          <n-space>
            <n-tag>🔒 已排除隐藏轮次与未审查异常轮次</n-tag>
            <n-button type="default" @click="handleExportTraceable">
              📤 导出可追溯明细
            </n-button>
          </n-space>
        </div>
      </template>

      <n-tabs type="line" animated v-model:value="analysisTab">
        <n-tab-pane name="scheme" tab="📊 方案对比">
          <n-space vertical :size="16" style="width: 100%">
            <div>
              <div style="font-weight: 600; margin-bottom: 8px">选择要对比的方案（至少1个，建议≤5个）：</div>
              <n-space style="flex-wrap: wrap">
                <n-checkbox
                  v-for="s in availableSchemesList"
                  :key="s.id"
                  v-model:checked="checkedIds"
                  :value="s.id"
                  :disabled="!s.hasVisibleTrials"
                  :label="s.hasVisibleTrials
                    ? `${s.name} (${s.visibleRounds}/${s.completedRounds}轮)`
                    : `${s.name} (${s.completedRounds}轮 - 全部已隐藏)`"
                />
                <n-tag v-if="availableSchemesList.length === 0" type="warning">
                  暂无带试验记录的方案，请先进行汲水试验
                </n-tag>
              </n-space>
            </div>

            <n-alert v-if="selectedSchemes.length === 0 && checkedIds.length > 0" type="warning" :show-icon="true">
              ⚠️ 您勾选的方案已全部隐藏轮次，请先在试验记录中取消隐藏至少1轮再分析。
            </n-alert>
            <n-alert v-if="checkedIds.length === 0" type="info" :show-icon="true">
              请选择至少 1 个有可见试验轮次的方案进行分析。
            </n-alert>
          </n-space>

          <template v-if="selectedSchemes.length > 0">
            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" style="margin-top: 16px">
              <n-gi>
                <n-card title="📈 提水效率对比 (L/s)">
                  <v-chart class="chart" :option="efficiencyOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="⏱️ 平均提水耗时对比 (秒)">
                  <v-chart class="chart" :option="timeCostOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="💧 平均漏水率对比 (%)">
                  <v-chart class="chart" :option="leakageOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="📊 磨损对比：构件 / 井绳 / 汲桶">
                  <v-chart class="chart" :option="wearOption" autoresize />
                </n-card>
              </n-gi>
            </n-grid>

            <n-card title="📋 方案指标汇总表" style="margin-top: 16px">
              <n-data-table
                :columns="summaryColumns"
                :data="summaryData"
                :row-key="(row: any) => row.id"
                :pagination="false"
                size="small"
                bordered
              />
            </n-card>

            <n-space vertical :size="16" style="margin-top: 16px; width: 100%">
              <n-card
                v-for="sch in selectedSchemes"
                :key="sch.id"
                :title="`🔬 方案「${sch.name}」单方案轮次趋势`"
              >
                <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
                  <n-gi>
                    <div style="font-weight: 500; margin-bottom: 8px">提水耗时 & 漏水率 趋势</div>
                    <v-chart class="chart-sm" :option="getSingleTrendOption(sch, 'timeAndLeak')" autoresize />
                  </n-gi>
                  <n-gi>
                    <div style="font-weight: 500; margin-bottom: 8px">提水效率 趋势 (L/s)</div>
                    <v-chart class="chart-sm" :option="getSingleTrendOption(sch, 'efficiency')" autoresize />
                  </n-gi>
                  <n-gi :span="2">
                    <div style="font-weight: 500; margin-bottom: 8px">各构件累计磨损 (每轮记录)</div>
                    <v-chart class="chart-sm" :option="getSingleWearOption(sch)" autoresize />
                  </n-gi>
                </n-grid>
              </n-card>
            </n-space>
          </template>
        </n-tab-pane>

        <n-tab-pane name="template" tab="📑 模板间对比">
          <n-space vertical :size="16" style="width: 100%">
            <div>
              <div style="font-weight: 600; margin-bottom: 8px">选择要对比的模板（至少2个）：</div>
              <n-space style="flex-wrap: wrap">
                <n-checkbox
                  v-for="t in templateListForCompare"
                  :key="t.id"
                  v-model:checked="checkedTemplateIds"
                  :value="t.id"
                  :label="`${t.name} (${t.schemeCount}方案/${t.totalRounds}轮)`"
                />
                <n-tag v-if="templateListForCompare.length === 0" type="warning">
                  暂无模板或无模板关联方案，请先创建模板并使用
                </n-tag>
              </n-space>
            </div>

            <n-alert v-if="checkedTemplateIds.length < 2" type="info" :show-icon="true">
              请选择至少 2 个模板进行对比分析。
            </n-alert>
          </n-space>

          <template v-if="checkedTemplateIds.length >= 2">
            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" style="margin-top: 16px">
              <n-gi>
                <n-card title="📈 模板间平均效率对比 (L/s)">
                  <v-chart class="chart" :option="templateEfficiencyOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="📊 模板间异常占比对比 (%)">
                  <v-chart class="chart" :option="templateAbnormalOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="💧 模板间平均漏水率对比 (%)">
                  <v-chart class="chart" :option="templateLeakageOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="🔧 模板间磨损对比">
                  <v-chart class="chart" :option="templateWearOption" autoresize />
                </n-card>
              </n-gi>
            </n-grid>

            <n-card title="📋 模板对比汇总表" style="margin-top: 16px">
              <n-data-table
                :columns="templateCompareColumns"
                :data="templateCompareData"
                :row-key="(row: any) => row.templateId"
                :pagination="false"
                size="small"
                bordered
              />
            </n-card>
          </template>
        </n-tab-pane>

        <n-tab-pane name="abnormal" tab="⚠️ 异常占比分析">
          <n-card title="全局异常占比统计">
            <n-space :size="24" style="flex-wrap: wrap; margin-bottom: 16px">
              <n-statistic label="总轮次" :value="abnormalStats.totalTrials" />
              <n-statistic label="正常轮次" :value="abnormalStats.abnormalByType.none || 0" value-style="color: #18a058" />
              <n-statistic label="异常轮次" :value="abnormalStats.abnormalTrials" value-style="color: #d03050" />
              <n-statistic label="异常占比" :value="Number(abnormalStats.abnormalRate.toFixed(1))" suffix="%" value-style="color: #f0a020" />
            </n-space>

            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
              <n-gi>
                <n-card title="异常类型分布">
                  <v-chart class="chart" :option="abnormalPieOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="审查状态分布">
                  <v-chart class="chart" :option="reviewPieOption" autoresize />
                </n-card>
              </n-gi>
            </n-grid>
          </n-card>

          <n-card title="各方案异常率" style="margin-top: 16px">
            <v-chart class="chart" :option="schemeAbnormalBarOption" autoresize />
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="wear" tab="📉 磨损累计趋势">
          <n-card title="全局磨损累计趋势（所有已通过轮次按时间排列）">
            <n-alert v-if="!globalWearData" type="info" :show-icon="true">
              暂无已通过审查的轮次数据，请先完成试验并审查异常轮次。
            </n-alert>
            <v-chart v-else class="chart-lg" :option="globalWearOption" autoresize />
          </n-card>
        </n-tab-pane>

        <n-tab-pane name="knowledgeGraph" tab="🕸️ 知识图谱">
          <KnowledgeGraphView />
        </n-tab-pane>

        <n-tab-pane name="riskWarning" tab="⚠️ 风险预警">
          <RiskWarningPanel />
        </n-tab-pane>

        <n-tab-pane name="similarSchemes" tab="🔍 相似方案">
          <SimilarSchemeSearch />
        </n-tab-pane>

        <n-tab-pane name="maintenance" tab="🔧 维护策略">
          <MaintenanceStrategy />
        </n-tab-pane>

        <n-tab-pane name="prediction" tab="🔮 效率预测">
          <EfficiencyPrediction />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useMessage, type DataTableColumns } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import { useKnowledgeGraphStore } from '@/stores/knowledgeGraph'
import { ABNORMAL_TYPE_LABELS, WELL_TYPE_OPTIONS, type RecoveryScheme, type TrialRound } from '@/types'
import KnowledgeGraphView from '@/components/KnowledgeGraphView.vue'
import RiskWarningPanel from '@/components/RiskWarningPanel.vue'
import SimilarSchemeSearch from '@/components/SimilarSchemeSearch.vue'
import MaintenanceStrategy from '@/components/MaintenanceStrategy.vue'
import EfficiencyPrediction from '@/components/EfficiencyPrediction.vue'

const schemeStore = useSchemeStore()
const knowledgeGraphStore = useKnowledgeGraphStore()
const message = useMessage()

const analysisTab = ref('scheme')
const checkedIds = ref<string[]>([])
const checkedTemplateIds = ref<string[]>([])

interface AvailableSchemeItem {
  id: string
  name: string
  completedRounds: number
  totalRounds: number
  visibleRounds: number
  hasVisibleTrials: boolean
}

const availableSchemesList = computed<AvailableSchemeItem[]>(() => {
  const list: AvailableSchemeItem[] = []
  schemeStore.schemes.forEach(s => {
    if (s.trials.length > 0) {
      const visibleRounds = s.trials.filter(t => !t.hidden).length
      list.push({
        id: s.id,
        name: s.name,
        completedRounds: s.completedRounds,
        totalRounds: s.totalRounds,
        visibleRounds,
        hasVisibleTrials: visibleRounds > 0
      })
    }
  })
  return list
})

watch(availableSchemesList, (list) => {
  const enabledIds = list.filter(s => s.hasVisibleTrials).map(s => s.id)
  const cleaned = checkedIds.value.filter(id => enabledIds.includes(id))
  if (cleaned.length !== checkedIds.value.length) {
    checkedIds.value = cleaned
  }
}, { immediate: true, deep: true })

const selectedSchemes = computed((): RecoveryScheme[] => {
  return schemeStore.schemes.filter(s =>
    checkedIds.value.includes(s.id) && s.trials.some(t => !t.hidden)
  )
})

const abnormalStats = computed(() => schemeStore.getGlobalAbnormalStats())

const globalWearData = computed(() => schemeStore.getGlobalCumulativeWear())

const templateListForCompare = computed(() =>
  schemeStore.templates
    .filter(t => schemeStore.schemes.some(s => s.templateId === t.id && s.trials.length > 0))
    .map(t => {
      const schemeCount = schemeStore.schemes.filter(s => s.templateId === t.id).length
      return { id: t.id, name: t.name, schemeCount, totalRounds: t.totalRounds }
    })
)

const templateCompareData = computed(() => {
  if (checkedTemplateIds.value.length < 2) return []
  return schemeStore.getTemplateComparisonDetail(checkedTemplateIds.value) as any[]
})

function getVisibleTrials(sch: RecoveryScheme): TrialRound[] {
  return sch.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
}

function getAvg(sch: RecoveryScheme, key: keyof TrialRound): number {
  const trials = getVisibleTrials(sch)
  if (trials.length === 0) return 0
  const total = trials.reduce((sum, t) => {
    const v = (t as any)[key]
    return sum + (typeof v === 'number' ? v : 0)
  }, 0)
  return total / trials.length
}

function getAvgEfficiency(sch: RecoveryScheme): number {
  const trials = getVisibleTrials(sch)
  if (trials.length === 0 || !sch.buckets[0]) return 0
  const bucketCap = sch.buckets[0].capacity
  const totalEff = trials.reduce((sum, t) => {
    const eff = t.timeCost > 0 ? (bucketCap * (1 - t.leakageRate / 100)) / t.timeCost : 0
    return sum + eff
  }, 0)
  return totalEff / trials.length
}

function getAvgComponentWear(sch: RecoveryScheme): number {
  const trials = getVisibleTrials(sch)
  if (trials.length === 0) return 0
  let total = 0
  let count = 0
  trials.forEach(t => {
    const vals = Object.values(t.componentWear)
    if (vals.length > 0) {
      total += vals.reduce((a, b) => a + b, 0) / vals.length
      count++
    }
  })
  return count > 0 ? total / count : 0
}

const palette = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#722ed1', '#13c2c2', '#eb2f96']

function ensureAnalysisDemoData() {
  const selectableScheme = schemeStore.schemes.find(s => s.name === '测试方案-待审查不可统计')
  const wearScheme = schemeStore.schemes.find(s => s.name === '测试方案-磨损标题验证')
  if (selectableScheme && wearScheme) return

  const createBaseScheme = (name: string) => {
    const id = schemeStore.createScheme(name)
    schemeStore.updateSchemeMeta(id, name, '自动注入测试数据', 5)
    schemeStore.updateWellConfig(id, {
      type: 'cylindrical',
      depth: 8,
      diameter: 1.2,
      waterLevel: 5,
      wallMaterial: 'stone'
    })
    schemeStore.addComponent(id, {
      componentNo: 'CMP-001',
      type: 'wheel',
      material: 'hardwood',
      diameter: 40,
      length: 120,
      weight: 20,
      wearResistance: 7,
      notes: ''
    })
    schemeStore.addRope(id, {
      ropeNo: 'ROP-001',
      material: 'hemp',
      diameter: 8,
      length: 15,
      breakingStrength: 200,
      wearResistance: 5,
      notes: ''
    })
    schemeStore.addBucket(id, {
      bucketNo: 'BKT-001',
      material: 'wood',
      capacity: 20,
      weight: 3,
      wallThickness: 8,
      wearResistance: 5,
      notes: ''
    })
    return id
  }

  if (!selectableScheme) {
    const id = createBaseScheme('测试方案-待审查不可统计')
    const scheme = schemeStore.schemes.find(s => s.id === id)
    schemeStore.addTrial(id, {
      roundNo: 0,
      hidden: false,
      timeCost: 300,
      leakageRate: 80,
      componentWear: scheme?.components.reduce((acc, c) => {
        acc[c.id] = 2
        return acc
      }, {} as Record<string, number>) || {},
      ropeWear: 2,
      bucketWear: 2,
      notes: '待审查测试轮次',
      ropeId: scheme?.ropes[0]?.id || null,
      bucketId: scheme?.buckets[0]?.id || null,
      abnormalType: 'none',
      abnormalReason: '',
      reviewStatus: 'approved'
    })
  }

  if (!wearScheme) {
    const id = createBaseScheme('测试方案-磨损标题验证')
    const scheme = schemeStore.schemes.find(s => s.id === id)
    const compWear = (value: number) => scheme?.components.reduce((acc, c) => {
      acc[c.id] = value
      return acc
    }, {} as Record<string, number>) || {}

    ;[
      { ropeWear: 1, bucketWear: 1, timeCost: 60, leakageRate: 10 },
      { ropeWear: 3, bucketWear: 2, timeCost: 62, leakageRate: 12 },
      { ropeWear: 2, bucketWear: 4, timeCost: 58, leakageRate: 9 }
    ].forEach((item, index) => {
      schemeStore.addTrial(id, {
        roundNo: 0,
        hidden: false,
        timeCost: item.timeCost,
        leakageRate: item.leakageRate,
        componentWear: compWear(index + 1),
        ropeWear: item.ropeWear,
        bucketWear: item.bucketWear,
        notes: `磨损验证轮次${index + 1}`,
        ropeId: scheme?.ropes[0]?.id || null,
        bucketId: scheme?.buckets[0]?.id || null,
        abnormalType: 'none',
        abnormalReason: '',
        reviewStatus: 'approved'
      })
    })
  }
}

onMounted(() => {
  ensureAnalysisDemoData()
  knowledgeGraphStore.buildGraph()
})

watch(analysisTab, (newTab) => {
  if (newTab === 'knowledgeGraph' || newTab === 'riskWarning' || newTab === 'maintenance' || newTab === 'prediction') {
    knowledgeGraphStore.buildGraph()
  }
})

const efficiencyOption = computed(() => {
  const names = selectedSchemes.value.map(s => s.name)
  const vals = selectedSchemes.value.map(s => Number(getAvgEfficiency(s).toFixed(3)))
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: 'L/s' },
    series: [{
      type: 'bar',
      data: vals.map((v, i) => ({ value: v, itemStyle: { color: palette[i % palette.length] } })),
      label: { show: true, position: 'top', formatter: '{c}' },
      barMaxWidth: 60
    }]
  }
})

const timeCostOption = computed(() => {
  const names = selectedSchemes.value.map(s => s.name)
  const vals = selectedSchemes.value.map(s => Number(getAvg(s, 'timeCost').toFixed(2)))
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '秒' },
    series: [{
      type: 'bar',
      data: vals.map((v, i) => ({ value: v, itemStyle: { color: palette[i % palette.length] } })),
      label: { show: true, position: 'top', formatter: '{c}s' },
      barMaxWidth: 60
    }]
  }
})

const leakageOption = computed(() => {
  const names = selectedSchemes.value.map(s => s.name)
  const vals = selectedSchemes.value.map(s => Number(getAvg(s, 'leakageRate').toFixed(2)))
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '%', max: 100 },
    series: [{
      type: 'bar',
      data: vals.map((v, i) => ({
        value: v,
        itemStyle: { color: v > 20 ? '#d03050' : palette[i % palette.length] }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' },
      markLine: {
        data: [{ yAxis: 20, name: '漏水警戒线20%', lineStyle: { color: '#d03050', type: 'dashed' } }]
      },
      barMaxWidth: 60
    }]
  }
})

const wearOption = computed(() => {
  const names = selectedSchemes.value.map(s => s.name)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['构件磨损均值', '井绳磨损', '汲桶磨损'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '磨损等级', max: 10 },
    series: [
      {
        name: '构件磨损均值',
        type: 'bar',
        data: selectedSchemes.value.map(s => Number(getAvgComponentWear(s).toFixed(2))),
        itemStyle: { color: '#2080f0' },
        barMaxWidth: 40
      },
      {
        name: '井绳磨损',
        type: 'bar',
        data: selectedSchemes.value.map(s => Number(getAvg(s, 'ropeWear').toFixed(2))),
        itemStyle: { color: '#f0a020' },
        barMaxWidth: 40
      },
      {
        name: '汲桶磨损',
        type: 'bar',
        data: selectedSchemes.value.map(s => Number(getAvg(s, 'bucketWear').toFixed(2))),
        itemStyle: { color: '#d03050' },
        barMaxWidth: 40
      }
    ]
  }
})

const summaryData = computed(() => {
  return selectedSchemes.value.map(sch => {
    const trials = getVisibleTrials(sch)
    const bucket = sch.buckets[0]
    const avgTime = getAvg(sch, 'timeCost')
    const avgLeak = getAvg(sch, 'leakageRate')
    const avgEff = getAvgEfficiency(sch)
    const totalWater = bucket
      ? trials.reduce((sum, t) => sum + bucket.capacity * (1 - t.leakageRate / 100), 0)
      : 0
    const stats = schemeStore.getSchemeStats(sch.id)
    return {
      id: sch.id,
      name: sch.name,
      visibleRounds: trials.length,
      componentCount: sch.components.length,
      bucketInfo: bucket ? `${bucket.capacity}L ${bucket.material}` : '-',
      avgTime: avgTime.toFixed(2),
      avgLeakage: avgLeak.toFixed(2),
      avgEfficiency: avgEff.toFixed(3),
      totalWater: totalWater.toFixed(1),
      ropeWear: getAvg(sch, 'ropeWear').toFixed(2),
      bucketWear: getAvg(sch, 'bucketWear').toFixed(2),
      compWear: getAvgComponentWear(sch).toFixed(2),
      abnormalRate: stats ? stats.abnormalRate.toFixed(1) + '%' : '-'
    }
  })
})

const summaryColumns: DataTableColumns<any> = [
  { title: '方案名称', key: 'name', width: 160, fixed: 'left' },
  { title: '统计轮次', key: 'visibleRounds', width: 100 },
  { title: '辘轳构件数', key: 'componentCount', width: 100 },
  { title: '汲桶配置', key: 'bucketInfo', width: 120 },
  { title: '平均耗时(s)', key: 'avgTime', width: 110 },
  { title: '平均漏水率(%)', key: 'avgLeakage', width: 120 },
  { title: '平均效率(L/s)', key: 'avgEfficiency', width: 130 },
  { title: '累计产水(L)', key: 'totalWater', width: 110 },
  { title: '井绳磨损', key: 'ropeWear', width: 90 },
  { title: '汲桶磨损', key: 'bucketWear', width: 90 },
  { title: '构件磨损均值', key: 'compWear', width: 110 },
  { title: '异常占比', key: 'abnormalRate', width: 90 }
]

const templateEfficiencyOption = computed(() => {
  const data = templateCompareData.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map((d: any) => d.templateName) },
    yAxis: { type: 'value', name: 'L/s' },
    series: [{
      type: 'bar',
      data: data.map((d: any, i: number) => ({
        value: Number(d.avgEfficiency.toFixed(3)),
        itemStyle: { color: palette[i % palette.length] }
      })),
      label: { show: true, position: 'top', formatter: '{c}' },
      barMaxWidth: 60
    }]
  }
})

const templateAbnormalOption = computed(() => {
  const data = templateCompareData.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map((d: any) => d.templateName) },
    yAxis: { type: 'value', name: '%', max: 100 },
    series: [{
      type: 'bar',
      data: data.map((d: any, i: number) => ({
        value: Number(d.abnormalRate.toFixed(1)),
        itemStyle: { color: d.abnormalRate > 30 ? '#d03050' : palette[i % palette.length] }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' },
      barMaxWidth: 60
    }]
  }
})

const templateLeakageOption = computed(() => {
  const data = templateCompareData.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map((d: any) => d.templateName) },
    yAxis: { type: 'value', name: '%' },
    series: [{
      type: 'bar',
      data: data.map((d: any, i: number) => ({
        value: Number(d.avgLeakageRate.toFixed(2)),
        itemStyle: { color: palette[i % palette.length] }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' },
      barMaxWidth: 60
    }]
  }
})

const templateWearOption = computed(() => {
  const data = templateCompareData.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['井绳磨损', '汲桶磨损'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map((d: any) => d.templateName) },
    yAxis: { type: 'value', name: '磨损等级' },
    series: [
      {
        name: '井绳磨损',
        type: 'bar',
        data: data.map((d: any) => Number(d.avgRopeWear.toFixed(2))),
        itemStyle: { color: '#f0a020' },
        barMaxWidth: 40
      },
      {
        name: '汲桶磨损',
        type: 'bar',
        data: data.map((d: any) => Number(d.avgBucketWear.toFixed(2))),
        itemStyle: { color: '#d03050' },
        barMaxWidth: 40
      }
    ]
  }
})

const templateCompareColumns: DataTableColumns<any> = [
  { title: '模板名称', key: 'templateName', width: 140 },
  { title: '井型', key: 'wellType', width: 90, render: (row) => WELL_TYPE_OPTIONS.find(o => o.value === row.wellType)?.label || row.wellType },
  { title: '标签', key: 'tag', width: 80 },
  { title: '方案数', key: 'schemeCount', width: 80 },
  { title: '通过轮次', key: 'approvedTrials', width: 90 },
  { title: '异常轮次', key: 'abnormalTrials', width: 90 },
  { title: '异常占比(%)', key: 'abnormalRate', width: 100, render: (row) => row.abnormalRate.toFixed(1) },
  { title: '平均耗时(s)', key: 'avgTimeCost', width: 110, render: (row) => row.avgTimeCost.toFixed(2) },
  { title: '平均漏水率(%)', key: 'avgLeakageRate', width: 120, render: (row) => row.avgLeakageRate.toFixed(2) },
  { title: '平均效率(L/s)', key: 'avgEfficiency', width: 130, render: (row) => row.avgEfficiency.toFixed(3) },
  { title: '井绳磨损', key: 'avgRopeWear', width: 90, render: (row) => row.avgRopeWear.toFixed(2) },
  { title: '汲桶磨损', key: 'avgBucketWear', width: 90, render: (row) => row.avgBucketWear.toFixed(2) }
]

const abnormalPieOption = computed(() => {
  const stats = abnormalStats.value
  const data = [
    { value: stats.abnormalByType.none || 0, name: '正常', itemStyle: { color: '#18a058' } },
    { value: stats.abnormalByType.timeout || 0, name: '超时异常', itemStyle: { color: '#f0a020' } },
    { value: stats.abnormalByType.highLeakage || 0, name: '漏水过高', itemStyle: { color: '#d03050' } },
    { value: stats.abnormalByType.wearSpike || 0, name: '磨损突增', itemStyle: { color: '#2080f0' } }
  ].filter(d => d.value > 0)

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data
    }]
  }
})

const reviewPieOption = computed(() => {
  const stats = abnormalStats.value
  const data = [
    { value: stats.approvedReviews, name: '已通过', itemStyle: { color: '#18a058' } },
    { value: stats.pendingReviews, name: '待审查', itemStyle: { color: '#f0a020' } },
    { value: stats.rejectedReviews, name: '已驳回', itemStyle: { color: '#d03050' } }
  ].filter(d => d.value > 0)

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data
    }]
  }
})

const schemeAbnormalBarOption = computed(() => {
  const schemesWithTrials = schemeStore.schemes.filter(s => s.trials.length > 0)
  const names = schemesWithTrials.map(s => s.name)
  const rates = schemesWithTrials.map(s => {
    const stats = schemeStore.getSchemeStats(s.id)
    return stats ? Number(stats.abnormalRate.toFixed(1)) : 0
  })
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value', name: '%', max: 100 },
    series: [{
      type: 'bar',
      data: rates.map((v, i) => ({
        value: v,
        itemStyle: { color: v > 30 ? '#d03050' : v > 15 ? '#f0a020' : '#18a058' }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' },
      barMaxWidth: 60
    }]
  }
})

const globalWearOption = computed(() => {
  const data = globalWearData.value
  if (!data) return {}

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['井绳累计磨损', '汲桶累计磨损'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.labels },
    yAxis: { type: 'value', name: '累计磨损等级' },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 }
    ],
    series: [
      {
        name: '井绳累计磨损',
        type: 'line',
        smooth: true,
        data: data.ropeCumulative,
        itemStyle: { color: '#f0a020' },
        areaStyle: { opacity: 0.2 }
      },
      {
        name: '汲桶累计磨损',
        type: 'line',
        smooth: true,
        data: data.bucketCumulative,
        itemStyle: { color: '#d03050' },
        areaStyle: { opacity: 0.2 }
      }
    ]
  }
})

function getSingleTrendOption(sch: RecoveryScheme, mode: 'timeAndLeak' | 'efficiency') {
  const trials = getVisibleTrials(sch)
  const labels = trials.map(t => `第${t.roundNo}轮`)
  const bucket = sch.buckets[0]

  if (mode === 'timeAndLeak') {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['提水耗时(s)', '漏水率(%)'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: labels },
      yAxis: [
        { type: 'value', name: '秒', position: 'left' },
        { type: 'value', name: '%', position: 'right', max: 100 }
      ],
      series: [
        {
          name: '提水耗时(s)',
          type: 'line',
          smooth: true,
          data: trials.map(t => t.timeCost),
          itemStyle: { color: '#2080f0' },
          yAxisIndex: 0,
          areaStyle: { opacity: 0.15 }
        },
        {
          name: '漏水率(%)',
          type: 'line',
          smooth: true,
          data: trials.map(t => t.leakageRate),
          itemStyle: { color: '#f0a020' },
          yAxisIndex: 1
        }
      ]
    }
  } else {
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', name: 'L/s' },
      series: [{
        name: '提水效率(L/s)',
        type: 'line',
        smooth: true,
        data: trials.map(t =>
          bucket && t.timeCost > 0
            ? Number(((bucket.capacity * (1 - t.leakageRate / 100)) / t.timeCost).toFixed(3))
            : 0
        ),
        itemStyle: { color: '#18a058' },
        areaStyle: { opacity: 0.2 },
        markLine: {
          data: [{ type: 'average', name: '平均值' }]
        }
      }]
    }
  }
}

function getSingleWearOption(sch: RecoveryScheme) {
  const trials = getVisibleTrials(sch)
  const labels = trials.map(t => `第${t.roundNo}轮`)
  const comps = sch.components

  const series: any[] = comps.map((c, i) => {
    let cumulative = 0
    return {
      name: `${c.componentNo}`,
      type: 'line',
      smooth: true,
      data: trials.map(t => {
        cumulative += (t.componentWear[c.id] || 0)
        return Number(cumulative.toFixed(2))
      }),
      itemStyle: { color: palette[i % palette.length] }
    }
  })

  let ropeCum = 0
  series.push({
    name: '井绳',
    type: 'line',
    smooth: true,
    data: trials.map(t => {
      ropeCum += t.ropeWear
      return Number(ropeCum.toFixed(2))
    }),
    itemStyle: { color: '#000000' }
  })
  let bucketCum = 0
  series.push({
    name: '汲桶',
    type: 'line',
    smooth: true,
    data: trials.map(t => {
      bucketCum += t.bucketWear
      return Number(bucketCum.toFixed(2))
    }),
    itemStyle: { color: '#722ed1' }
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 50, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: '累计磨损等级' },
    series
  }
}

function handleExportTraceable() {
  const csv = schemeStore.exportTraceableDetails()
  if (!csv || csv.split('\n').length <= 1) {
    message.warning('暂无数据可导出')
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `可追溯试验明细_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}
</script>

<style scoped>
.chart {
  width: 100%;
  height: 320px;
}
.chart-sm {
  width: 100%;
  height: 280px;
}
.chart-lg {
  width: 100%;
  height: 420px;
}
</style>
