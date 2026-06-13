import type { RecoveryScheme, TrialRound } from '@/types'
import {
  getVisibleTrials,
  getAvg,
  getAvgEfficiency,
  getAvgComponentWear
} from '@/services/statistics.service'

export const DEFAULT_PALETTE = [
  '#18a058', '#2080f0', '#f0a020', '#d03050',
  '#722ed1', '#13c2c2', '#eb2f96'
]

function baseGrid() {
  return { left: '3%', right: '4%', bottom: '3%', containLabel: true }
}

function axisTooltip(type: 'axis' | 'item' = 'axis') {
  return type === 'axis'
    ? { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } }
    : { trigger: 'item' as const }
}

export function createBarOption(
  names: string[],
  values: number[],
  options: {
    yName?: string
    valueFormatter?: (v: number) => string
    colorFn?: (v: number, i: number) => string | undefined
    yMax?: number
    markLine?: any
    barMaxWidth?: number
    palette?: string[]
  } = {}
) {
  const palette = options.palette || DEFAULT_PALETTE
  return {
    tooltip: axisTooltip(),
    grid: baseGrid(),
    xAxis: { type: 'category' as const, data: names },
    yAxis: {
      type: 'value' as const,
      name: options.yName || '',
      ...(options.yMax !== undefined ? { max: options.yMax } : {})
    },
    series: [{
      type: 'bar' as const,
      data: values.map((v, i) => ({
        value: v,
        itemStyle: {
          color: options.colorFn ? (options.colorFn(v, i) || palette[i % palette.length]) : palette[i % palette.length]
        }
      })),
      label: {
        show: true,
        position: 'top' as const,
        formatter: (params: any) =>
          options.valueFormatter ? options.valueFormatter(params.value) : '{c}'
      },
      ...(options.markLine ? { markLine: options.markLine } : {}),
      ...(options.barMaxWidth !== undefined ? { barMaxWidth: options.barMaxWidth } : { barMaxWidth: 60 })
    }]
  }
}

export function createGroupedBarOption(
  names: string[],
  series: Array<{
    name: string
    data: number[]
    color: string
  }>,
  options: {
    yName?: string
    yMax?: number
    legend?: string[]
    barMaxWidth?: number
  } = {}
) {
  return {
    tooltip: axisTooltip(),
    legend: { data: options.legend || series.map(s => s.name) },
    grid: baseGrid(),
    xAxis: { type: 'category' as const, data: names },
    yAxis: {
      type: 'value' as const,
      name: options.yName || '',
      ...(options.yMax !== undefined ? { max: options.yMax } : {})
    },
    series: series.map(s => ({
      name: s.name,
      type: 'bar' as const,
      data: s.data,
      itemStyle: { color: s.color },
      ...(options.barMaxWidth !== undefined ? { barMaxWidth: options.barMaxWidth } : { barMaxWidth: 40 })
    }))
  }
}

export function createPieOption(
  data: Array<{ value: number; name: string; itemStyle?: any }>,
  options: {
    formatter?: string
  } = {}
) {
  const filtered = data.filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item' as const, formatter: options.formatter || '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: filtered
    }]
  }
}

export function createLineOption(
  labels: string[],
  series: Array<{
    name: string
    data: (number | null)[]
    color: string
    smooth?: boolean
    area?: boolean
    yAxisIndex?: number
    markLine?: any
  }>,
  options: {
    yNames?: string[]
    yMaxes?: (number | undefined)[]
    yAxisPositions?: ('left' | 'right')[]
    dataZoom?: boolean
    legend?: string[]
    top?: number
  } = {}
) {
  const yAxisDefs = options.yNames?.length
    ? options.yNames.map((name, i) => ({
        type: 'value' as const,
        name,
        position: options.yAxisPositions?.[i] || (i === 0 ? 'left' : 'right'),
        ...(options.yMaxes?.[i] !== undefined ? { max: options.yMaxes[i] } : {})
      }))
    : [{ type: 'value' as const, ...(options.yMaxes?.[0] !== undefined ? { max: options.yMaxes[0] } : {}) }]

  return {
    tooltip: { trigger: 'axis' as const },
    legend: { data: options.legend || series.map(s => s.name), ...(options.top ? { top: options.top } : { type: 'scroll' as const }) },
    grid: { ...baseGrid(), ...(options.top !== undefined ? { top: options.top } : { top: 50 }) },
    xAxis: { type: 'category' as const, data: labels },
    yAxis: yAxisDefs,
    ...(options.dataZoom ? {
      dataZoom: [
        { type: 'inside' as const, start: 0, end: 100 },
        { type: 'slider' as const, start: 0, end: 100 }
      ]
    } : {}),
    series: series.map(s => ({
      name: s.name,
      type: 'line' as const,
      smooth: s.smooth !== false,
      data: s.data,
      itemStyle: { color: s.color },
      ...(s.area ? { areaStyle: { opacity: 0.2 } } : {}),
      ...(s.yAxisIndex !== undefined ? { yAxisIndex: s.yAxisIndex } : {}),
      ...(s.markLine ? { markLine: s.markLine } : {})
    }))
  }
}

export const chartFactory = {
  createBarOption,
  createGroupedBarOption,
  createPieOption,
  createLineOption,
  DEFAULT_PALETTE
}

export function createEfficiencyComparisonOption(schemes: RecoveryScheme[]) {
  const names = schemes.map(s => s.name)
  const vals = schemes.map(s => Number(getAvgEfficiency(s).toFixed(3)))
  return createBarOption(names, vals, {
    yName: 'L/s',
    valueFormatter: (v) => String(v)
  })
}

export function createTimeCostComparisonOption(schemes: RecoveryScheme[]) {
  const names = schemes.map(s => s.name)
  const vals = schemes.map(s => Number(getAvg(s, 'timeCost').toFixed(2)))
  return createBarOption(names, vals, {
    yName: '秒',
    valueFormatter: (v) => `${v}s`
  })
}

export function createLeakageComparisonOption(schemes: RecoveryScheme[]) {
  const names = schemes.map(s => s.name)
  const vals = schemes.map(s => Number(getAvg(s, 'leakageRate').toFixed(2)))
  return createBarOption(names, vals, {
    yName: '%',
    yMax: 100,
    colorFn: (v) => v > 20 ? '#d03050' : undefined,
    valueFormatter: (v) => `${v}%`,
    markLine: {
      data: [{ yAxis: 20, name: '漏水警戒线20%', lineStyle: { color: '#d03050', type: 'dashed' } }]
    }
  })
}

export function createWearComparisonOption(schemes: RecoveryScheme[]) {
  const names = schemes.map(s => s.name)
  return createGroupedBarOption(
    names,
    [
      {
        name: '构件磨损均值',
        data: schemes.map(s => Number(getAvgComponentWear(s).toFixed(2))),
        color: '#2080f0'
      },
      {
        name: '井绳磨损',
        data: schemes.map(s => Number(getAvg(s, 'ropeWear').toFixed(2))),
        color: '#f0a020'
      },
      {
        name: '汲桶磨损',
        data: schemes.map(s => Number(getAvg(s, 'bucketWear').toFixed(2))),
        color: '#d03050'
      }
    ],
    { yName: '磨损等级', yMax: 10 }
  )
}

export function createSingleTrendOption(
  sch: RecoveryScheme,
  mode: 'timeAndLeak' | 'efficiency'
) {
  const trials = getVisibleTrials(sch)
  const labels = trials.map(t => `第${t.roundNo}轮`)
  const bucket = sch.buckets[0]

  if (mode === 'timeAndLeak') {
    return createLineOption(
      labels,
      [
        {
          name: '提水耗时(s)',
          data: trials.map(t => t.timeCost),
          color: '#2080f0',
          area: true,
          yAxisIndex: 0
        },
        {
          name: '漏水率(%)',
          data: trials.map(t => t.leakageRate),
          color: '#f0a020',
          yAxisIndex: 1
        }
      ],
      {
        yNames: ['秒', '%'],
        yMaxes: [undefined, 100],
        yAxisPositions: ['left', 'right']
      }
    )
  }

  return createLineOption(
    labels,
    [{
      name: '提水效率(L/s)',
      data: trials.map(t =>
        bucket && t.timeCost > 0
          ? Number(((bucket.capacity * (1 - t.leakageRate / 100)) / t.timeCost).toFixed(3))
          : 0
      ),
      color: '#18a058',
      area: true,
      markLine: {
        data: [{ type: 'average' as const, name: '平均值' }]
      }
    }],
    { yNames: ['L/s'] }
  )
}

export function createSingleWearOption(sch: RecoveryScheme, palette: string[] = DEFAULT_PALETTE) {
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
    grid: { ...baseGrid(), top: 50 },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: '累计磨损等级' },
    series
  }
}
