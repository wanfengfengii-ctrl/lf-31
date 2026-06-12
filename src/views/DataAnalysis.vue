<template>
  <div>
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">数据分析 · 多方案对比</span>
          <n-tag>🔒 已自动排除所有隐藏轮次</n-tag>
        </div>
      </template>

      <n-space vertical :size="16" style="width: 100%">
        <div>
          <div style="font-weight: 600; margin-bottom: 8px">选择要对比的方案（至少1个，建议≤5个）：</div>
          <n-space style="flex-wrap: wrap">
            <n-checkbox
              v-for="s in availableSchemes"
              :key="s.id"
              v-model:checked="checkedIds"
              :value="s.id"
              :label="`${s.name} (${s.completedRounds}/${s.totalRounds}轮)`"
            />
            <n-tag v-if="availableSchemes.length === 0" type="warning">
              暂无带试验记录的方案，请先进行汲水试验
            </n-tag>
          </n-space>
        </div>

        <n-alert v-if="selectedSchemes.length === 0" type="info" :show-icon="true">
          请选择至少 1 个有试验记录的方案进行分析。
        </n-alert>
      </n-space>
    </n-card>

    <template v-if="selectedSchemes.length > 0">
      <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import type { RecoveryScheme, TrialRound } from '@/types'

const schemeStore = useSchemeStore()

const checkedIds = ref<string[]>([])

const availableSchemes = computed(() => {
  return schemeStore.schemeList.filter(s => s.hasTrials)
})

const selectedSchemes = computed((): RecoveryScheme[] => {
  return schemeStore.schemes.filter(s =>
    checkedIds.value.includes(s.id) && s.trials.some(t => !t.hidden)
  )
})

function getVisibleTrials(sch: RecoveryScheme): TrialRound[] {
  return sch.trials.filter(t => !t.hidden)
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
      compWear: getAvgComponentWear(sch).toFixed(2)
    }
  })
})

const summaryColumns: DataTableColumns<any> = [
  { title: '方案名称', key: 'name', width: 160, fixed: 'left' },
  { title: '参与统计轮次', key: 'visibleRounds', width: 120 },
  { title: '辘轳构件数', key: 'componentCount', width: 110 },
  { title: '汲桶配置', key: 'bucketInfo', width: 120 },
  { title: '平均耗时(s)', key: 'avgTime', width: 110 },
  { title: '平均漏水率(%)', key: 'avgLeakage', width: 120 },
  { title: '平均效率(L/s)', key: 'avgEfficiency', width: 130 },
  { title: '累计产水(L)', key: 'totalWater', width: 120 },
  { title: '井绳磨损', key: 'ropeWear', width: 100 },
  { title: '汲桶磨损', key: 'bucketWear', width: 100 },
  { title: '构件磨损均值', key: 'compWear', width: 120 }
]

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

  const series: any[] = comps.map((c, i) => ({
    name: `${c.componentNo}`,
    type: 'line',
    stack: 'wear',
    smooth: true,
    data: trials.map(t => Number((t.componentWear[c.id] || 0).toFixed(2))),
    itemStyle: { color: palette[i % palette.length] }
  }))

  series.push({
    name: '井绳',
    type: 'line',
    stack: 'wear',
    smooth: true,
    data: trials.map(t => t.ropeWear),
    itemStyle: { color: '#000000' }
  })
  series.push({
    name: '汲桶',
    type: 'line',
    stack: 'wear',
    smooth: true,
    data: trials.map(t => t.bucketWear),
    itemStyle: { color: '#722ed1' }
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 50, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: '磨损等级' },
    series
  }
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
</style>
