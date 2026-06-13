import type {
  RecoveryScheme,
  TraceableTrialDetail
} from '@/types'
import {
  WELL_TYPE_OPTIONS,
  WEATHER_OPTIONS,
  WIND_LEVEL_OPTIONS,
  OPERATOR_ROLE_OPTIONS,
  LIFTING_POSTURE_OPTIONS,
  ABNORMAL_TYPE_LABELS,
  REVIEW_STATUS_LABELS
} from '@/types'
import { getTrialEfficiency, getTrialEffectiveWater, getTrialAvgComponentWear } from './statistics.service'

function getLabelFromOptions(options: Array<{ label: string; value: string }>, value?: string): string {
  if (!value) return ''
  return options.find(o => o.value === value)?.label || value
}

export function buildTraceableDetails(schemes: RecoveryScheme[]): TraceableTrialDetail[] {
  const details: TraceableTrialDetail[] = []

  schemes.forEach(scheme => {
    scheme.trials.forEach(trial => {
      if (trial.hidden) return

      const bucket = scheme.buckets.find(b => b.id === trial.bucketId) || scheme.buckets[0]
      const rope = scheme.ropes.find(r => r.id === trial.ropeId) || scheme.ropes[0]

      const efficiency = bucket ? getTrialEfficiency(trial, bucket.capacity) : 0
      const effectiveWater = bucket ? getTrialEffectiveWater(trial, bucket.capacity) : 0
      const avgCompWear = getTrialAvgComponentWear(trial)

      const weather = trial.environmentConditions?.weather
      const windLevel = trial.environmentConditions?.windLevel
      const liftingPosture = trial.humanOperation?.liftingPosture

      const operatorNames = trial.humanOperation?.operators.map(o => o.name).join('、') || ''
      const operatorRoles = trial.humanOperation?.operators
        .map(o => getLabelFromOptions(OPERATOR_ROLE_OPTIONS, o.role))
        .join('、') || ''

      const hasMaintenance = (trial.humanOperation?.maintenanceInterventions?.length || 0) > 0
      const maintenanceCount = trial.humanOperation?.maintenanceInterventions?.length || 0

      const detail: TraceableTrialDetail = {
        schemeId: scheme.id,
        schemeName: scheme.name,
        templateId: scheme.templateId,
        templateName: undefined,
        roundNo: trial.roundNo,
        timeCost: trial.timeCost,
        leakageRate: trial.leakageRate,
        effectiveWater,
        efficiency,
        ropeNo: rope?.ropeNo || '',
        bucketNo: bucket?.bucketNo || '',
        ropeWear: trial.ropeWear,
        bucketWear: trial.bucketWear,
        avgComponentWear: avgCompWear,
        abnormalType: trial.abnormalType,
        abnormalTypeLabel: ABNORMAL_TYPE_LABELS[trial.abnormalType],
        abnormalReason: trial.abnormalReason,
        reviewStatus: trial.reviewStatus,
        reviewStatusLabel: REVIEW_STATUS_LABELS[trial.reviewStatus],
        reviewer: trial.reviewer || '',
        reviewComment: trial.reviewComment || '',
        createdAt: new Date(trial.createdAt).toLocaleString('zh-CN'),
        reviewedAt: trial.reviewedAt ? new Date(trial.reviewedAt).toLocaleString('zh-CN') : '',
        ropeId: trial.ropeId,
        bucketId: trial.bucketId,
        componentWear: trial.componentWear,
        weather,
        weatherLabel: weather ? getLabelFromOptions(WEATHER_OPTIONS, weather) : undefined,
        temperature: trial.environmentConditions?.temperature,
        humidity: trial.environmentConditions?.humidity,
        windLevel,
        windLevelLabel: windLevel ? getLabelFromOptions(WIND_LEVEL_OPTIONS, windLevel) : undefined,
        waterLevelFluctuation: trial.environmentConditions?.waterLevelFluctuation,
        operatorCount: trial.humanOperation?.operatorCount,
        operatorNames,
        operatorRoles,
        liftingPosture,
        liftingPostureLabel: liftingPosture ? getLabelFromOptions(LIFTING_POSTURE_OPTIONS, liftingPosture) : undefined,
        midPauseCount: trial.humanOperation?.midPauseCount,
        totalPauseDuration: trial.humanOperation?.totalPauseDuration,
        hasMaintenance,
        maintenanceCount,
        operationNotes: trial.humanOperation?.operationNotes
      }

      details.push(detail)
    })
  })

  return details
}

export function buildCsvFromTraceableDetails(details: TraceableTrialDetail[]): string {
  const headers = [
    '方案ID', '方案名称', '轮次', '提水耗时(秒)', '漏水率(%)',
    '有效水量(L)', '提水效率(L/s)', '井绳编号', '汲桶编号',
    '井绳磨损', '汲桶磨损', '平均构件磨损',
    '异常类型', '异常原因',
    '审查状态', '审查人', '审查意见', '审查时间',
    '天气', '温度(℃)', '湿度(%)', '风力等级', '水位波动',
    '操作者人数', '操作者姓名', '操作者角色',
    '提水姿势', '中途暂停次数', '总暂停时长',
    '是否有维护', '维护次数', '记录时间', '备注'
  ]

  const rows = details.map(d => [
    d.schemeId,
    d.schemeName,
    d.roundNo,
    d.timeCost,
    d.leakageRate,
    d.effectiveWater.toFixed(2),
    d.efficiency.toFixed(3),
    d.ropeNo,
    d.bucketNo,
    d.ropeWear,
    d.bucketWear,
    d.avgComponentWear.toFixed(2),
    d.abnormalTypeLabel,
    d.abnormalReason.replace(/,/g, '，'),
    d.reviewStatusLabel,
    d.reviewer,
    d.reviewComment.replace(/,/g, '，'),
    d.reviewedAt,
    d.weatherLabel || '',
    d.temperature ?? '',
    d.humidity ?? '',
    d.windLevelLabel || '',
    d.waterLevelFluctuation ?? '',
    d.operatorCount ?? '',
    (d.operatorNames || '').replace(/,/g, '，'),
    (d.operatorRoles || '').replace(/,/g, '，'),
    d.liftingPostureLabel || '',
    d.midPauseCount ?? '',
    d.totalPauseDuration ?? '',
    d.hasMaintenance ? '是' : '否',
    d.maintenanceCount ?? '',
    d.createdAt,
    (d.operationNotes || '').replace(/,/g, '，').replace(/\n/g, ' ')
  ])

  const csvLines = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ]

  return '\uFEFF' + csvLines.join('\n')
}

export function exportTraceableDetailsAsCsv(schemes: RecoveryScheme[]): string {
  const details = buildTraceableDetails(schemes)
  if (details.length === 0) return ''
  return buildCsvFromTraceableDetails(details)
}

export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (!csvContent) return
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportSchemesAsJson(
  schemes: RecoveryScheme[],
  pretty: boolean = true
): string {
  return JSON.stringify(schemes, null, pretty ? 2 : 0)
}
