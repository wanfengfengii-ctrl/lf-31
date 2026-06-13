import type {
  RecoveryScheme,
  TrialRound,
  AbnormalType,
  ReviewStatus,
  ComponentConfig,
  RopeConfig,
  BucketConfig,
  TrialTemplate
} from '@/types'
import {
  ABNORMAL_TYPE_LABELS,
  WELL_TYPE_OPTIONS,
  ROPE_MATERIAL_OPTIONS,
  BUCKET_MATERIAL_OPTIONS,
  COMPONENT_TYPE_OPTIONS,
  WEATHER_OPTIONS,
  WIND_LEVEL_OPTIONS,
  OPERATOR_ROLE_OPTIONS,
  LIFTING_POSTURE_OPTIONS
} from '@/types'

export interface SchemeStatSummary {
  avgTimeCost: number
  avgLeakage: number
  avgRopeWear: number
  avgBucketWear: number
  avgEfficiency: number
  visibleCount: number
  abnormalRate: number
  abnormalCount: number
}

export interface GlobalAbnormalStats {
  totalTrials: number
  abnormalTrials: number
  abnormalRate: number
  abnormalByType: Record<AbnormalType | 'none', number>
  approvedReviews: number
  pendingReviews: number
  rejectedReviews: number
}

export interface GlobalCumulativeWearData {
  labels: string[]
  ropeCumulative: number[]
  bucketCumulative: number[]
}

export interface TemplateComparisonDetail {
  templateId: string
  templateName: string
  wellType: string
  tag: string
  schemeCount: number
  approvedTrials: number
  abnormalTrials: number
  abnormalRate: number
  avgTimeCost: number
  avgLeakageRate: number
  avgEfficiency: number
  avgRopeWear: number
  avgBucketWear: number
}

export interface AvailableSchemeItem {
  id: string
  name: string
  completedRounds: number
  totalRounds: number
  visibleRounds: number
  hasVisibleTrials: boolean
}

export interface SummaryDataRow {
  id: string
  name: string
  visibleRounds: number
  componentCount: number
  bucketInfo: string
  avgTime: string
  avgLeakage: string
  avgEfficiency: string
  totalWater: string
  ropeWear: string
  bucketWear: string
  compWear: string
  abnormalRate: string
}

function getOptionLabel<T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T | string
): string {
  return options.find(o => o.value === value)?.label || String(value)
}

export function getWellTypeLabel(value: string): string {
  return getOptionLabel(WELL_TYPE_OPTIONS, value)
}

export function getRopeMaterialLabel(value: string): string {
  return getOptionLabel(ROPE_MATERIAL_OPTIONS, value)
}

export function getBucketMaterialLabel(value: string): string {
  return getOptionLabel(BUCKET_MATERIAL_OPTIONS, value)
}

export function getComponentTypeLabel(value: string): string {
  return getOptionLabel(COMPONENT_TYPE_OPTIONS, value)
}

export function getWeatherLabel(value: string): string {
  return getOptionLabel(WEATHER_OPTIONS, value)
}

export function getWindLevelLabel(value: string): string {
  return getOptionLabel(WIND_LEVEL_OPTIONS, value)
}

export function getOperatorRoleLabel(value: string): string {
  return getOptionLabel(OPERATOR_ROLE_OPTIONS, value)
}

export function getLiftingPostureLabel(value: string): string {
  return getOptionLabel(LIFTING_POSTURE_OPTIONS, value)
}

export function getAbnormalTypeLabel(type: AbnormalType): string {
  return ABNORMAL_TYPE_LABELS[type]
}

export function getVisibleTrials(sch: RecoveryScheme): TrialRound[] {
  return sch.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
}

export function getApprovedTrials(sch: RecoveryScheme): TrialRound[] {
  return sch.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
}

export function getAvg(sch: RecoveryScheme, key: keyof TrialRound): number {
  const trials = getVisibleTrials(sch)
  if (trials.length === 0) return 0
  const total = trials.reduce((sum, t) => {
    const v = (t as any)[key]
    return sum + (typeof v === 'number' ? v : 0)
  }, 0)
  return total / trials.length
}

export function getAvgEfficiency(sch: RecoveryScheme): number {
  const trials = getVisibleTrials(sch)
  if (trials.length === 0 || !sch.buckets[0]) return 0
  const bucketCap = sch.buckets[0].capacity
  const totalEff = trials.reduce((sum, t) => {
    const eff = t.timeCost > 0 ? (bucketCap * (1 - t.leakageRate / 100)) / t.timeCost : 0
    return sum + eff
  }, 0)
  return totalEff / trials.length
}

export function getTrialEfficiency(trial: TrialRound, bucketCapacity: number): number {
  if (trial.timeCost <= 0) return 0
  return (bucketCapacity * (1 - trial.leakageRate / 100)) / trial.timeCost
}

export function getTrialEffectiveWater(trial: TrialRound, bucketCapacity: number): number {
  return bucketCapacity * (1 - trial.leakageRate / 100)
}

export function getAvgComponentWear(sch: RecoveryScheme): number {
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

export function getTrialAvgComponentWear(trial: TrialRound): number {
  const vals = Object.values(trial.componentWear)
  if (vals.length === 0) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function getComponentAvgWearByCompId(
  sch: RecoveryScheme,
  componentId: string
): number {
  const trials = getVisibleTrials(sch)
  if (trials.length === 0) return 0
  const total = trials.reduce((sum, t) => sum + (t.componentWear[componentId] || 0), 0)
  return total / trials.length
}

export function getRopeAvgWearByRopeId(
  sch: RecoveryScheme,
  ropeId: string
): number {
  const ropeTrials = getVisibleTrials(sch).filter(t => t.ropeId === ropeId)
  if (ropeTrials.length === 0) return 0
  return ropeTrials.reduce((sum, t) => sum + t.ropeWear, 0) / ropeTrials.length
}

export function getBucketAvgWearByBucketId(
  sch: RecoveryScheme,
  bucketId: string
): number {
  const bucketTrials = getVisibleTrials(sch).filter(t => t.bucketId === bucketId)
  if (bucketTrials.length === 0) return 0
  return bucketTrials.reduce((sum, t) => sum + t.bucketWear, 0) / bucketTrials.length
}

export function calcSchemeStats(sch: RecoveryScheme): SchemeStatSummary | null {
  const visibleTrials = sch.trials.filter(t => !t.hidden)
  if (visibleTrials.length === 0) return null

  const avgTimeCost = visibleTrials.reduce((sum, t) => sum + t.timeCost, 0) / visibleTrials.length
  const avgLeakage = visibleTrials.reduce((sum, t) => sum + t.leakageRate, 0) / visibleTrials.length
  const avgRopeWear = visibleTrials.reduce((sum, t) => sum + t.ropeWear, 0) / visibleTrials.length
  const avgBucketWear = visibleTrials.reduce((sum, t) => sum + t.bucketWear, 0) / visibleTrials.length

  const bucket = sch.buckets[0]
  const avgEfficiency = bucket ? (bucket.capacity * (1 - avgLeakage / 100)) / avgTimeCost : 0

  const abnormalCount = visibleTrials.filter(t => t.abnormalType !== 'none').length
  const abnormalRate = (abnormalCount / visibleTrials.length) * 100

  return {
    avgTimeCost,
    avgLeakage,
    avgRopeWear,
    avgBucketWear,
    avgEfficiency,
    visibleCount: visibleTrials.length,
    abnormalRate,
    abnormalCount
  }
}

export function calcAvailableSchemesList(schemes: RecoveryScheme[]): AvailableSchemeItem[] {
  const list: AvailableSchemeItem[] = []
  schemes.forEach(s => {
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
}

export function calcSummaryDataRow(
  sch: RecoveryScheme,
  stats: SchemeStatSummary | null
): SummaryDataRow {
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
    compWear: getAvgComponentWear(sch).toFixed(2),
    abnormalRate: stats ? stats.abnormalRate.toFixed(1) + '%' : '-'
  }
}

export function calcGlobalAbnormalStats(schemes: RecoveryScheme[]): GlobalAbnormalStats {
  const abnormalByType: Record<AbnormalType | 'none', number> = {
    none: 0,
    timeout: 0,
    highLeakage: 0,
    wearSpike: 0
  }
  let approvedReviews = 0
  let pendingReviews = 0
  let rejectedReviews = 0
  let totalTrials = 0

  schemes.forEach(scheme => {
    scheme.trials.forEach(trial => {
      totalTrials++
      abnormalByType[trial.abnormalType] = (abnormalByType[trial.abnormalType] || 0) + 1
      if (trial.reviewStatus === 'approved') approvedReviews++
      else if (trial.reviewStatus === 'pending') pendingReviews++
      else if (trial.reviewStatus === 'rejected') rejectedReviews++
    })
  })

  const abnormalTrials = totalTrials - abnormalByType.none
  const abnormalRate = totalTrials > 0 ? (abnormalTrials / totalTrials) * 100 : 0

  return {
    totalTrials,
    abnormalTrials,
    abnormalRate,
    abnormalByType,
    approvedReviews,
    pendingReviews,
    rejectedReviews
  }
}

export function calcGlobalCumulativeWear(
  schemes: RecoveryScheme[]
): GlobalCumulativeWearData | null {
  const allApproved: Array<{ trial: TrialRound; scheme: RecoveryScheme }> = []

  schemes.forEach(scheme => {
    scheme.trials
      .filter(t => !t.hidden && t.reviewStatus === 'approved')
      .forEach(t => allApproved.push({ trial: t, scheme }))
  })

  allApproved.sort((a, b) => a.trial.createdAt - b.trial.createdAt)

  if (allApproved.length === 0) return null

  const labels: string[] = []
  const ropeCumulative: number[] = []
  const bucketCumulative: number[] = []
  let ropeSum = 0
  let bucketSum = 0

  allApproved.forEach((item, idx) => {
    labels.push(`${item.scheme.name} 第${item.trial.roundNo}轮`)
    ropeSum += item.trial.ropeWear
    bucketSum += item.trial.bucketWear
    ropeCumulative.push(Number(ropeSum.toFixed(2)))
    bucketCumulative.push(Number(bucketSum.toFixed(2)))
  })

  return { labels, ropeCumulative, bucketCumulative }
}

export function calcTemplateComparisonDetail(
  templates: TrialTemplate[],
  schemes: RecoveryScheme[],
  templateIds: string[]
): TemplateComparisonDetail[] {
  return templateIds.map(tid => {
    const tpl = templates.find(t => t.id === tid)
    const relatedSchemes = schemes.filter(s => s.templateId === tid)
    const allTrials: TrialRound[] = []
    relatedSchemes.forEach(s => allTrials.push(...s.trials.filter(t => !t.hidden)))

    const approvedTrials = allTrials.filter(t => t.reviewStatus === 'approved').length
    const abnormalTrials = allTrials.filter(t => t.abnormalType !== 'none').length

    const avgTimeCost = allTrials.length > 0
      ? allTrials.reduce((sum, t) => sum + t.timeCost, 0) / allTrials.length
      : 0
    const avgLeakageRate = allTrials.length > 0
      ? allTrials.reduce((sum, t) => sum + t.leakageRate, 0) / allTrials.length
      : 0

    let avgEfficiency = 0
    if (tpl) {
      const tplBucket = (tpl.buckets[0] as BucketConfig | undefined)
      if (tplBucket && avgTimeCost > 0) {
        avgEfficiency = (tplBucket.capacity * (1 - avgLeakageRate / 100)) / avgTimeCost
      }
    }

    const avgRopeWear = allTrials.length > 0
      ? allTrials.reduce((sum, t) => sum + t.ropeWear, 0) / allTrials.length
      : 0
    const avgBucketWear = allTrials.length > 0
      ? allTrials.reduce((sum, t) => sum + t.bucketWear, 0) / allTrials.length
      : 0

    return {
      templateId: tid,
      templateName: tpl?.name || '-',
      wellType: tpl?.wellConfig?.type || '-',
      tag: tpl?.tag || '-',
      schemeCount: relatedSchemes.length,
      approvedTrials,
      abnormalTrials,
      abnormalRate: allTrials.length > 0 ? (abnormalTrials / allTrials.length) * 100 : 0,
      avgTimeCost,
      avgLeakageRate,
      avgEfficiency,
      avgRopeWear,
      avgBucketWear
    }
  })
}

export function calcTemplateListForCompare(
  templates: TrialTemplate[],
  schemes: RecoveryScheme[]
): Array<{ id: string; name: string; schemeCount: number; totalRounds: number }> {
  return templates
    .filter(t => schemes.some(s => s.templateId === t.id && s.trials.length > 0))
    .map(t => {
      const schemeCount = schemes.filter(s => s.templateId === t.id).length
      return { id: t.id, name: t.name, schemeCount, totalRounds: t.totalRounds }
    })
}

export function detectAbnormalType(
  timeCost: number,
  leakageRate: number,
  prevAvgComponentWear: number,
  currentComponentWearTotal: number,
  componentCount: number,
  rules: { timeoutThreshold: number; highLeakageThreshold: number; wearSpikeThreshold: number }
): { type: AbnormalType; reason: string } {
  const currentAvgCompWear = componentCount > 0 ? currentComponentWearTotal / componentCount : 0
  const wearDelta = currentAvgCompWear - prevAvgComponentWear

  if (timeCost > rules.timeoutThreshold) {
    return { type: 'timeout', reason: `提水耗时 ${timeCost.toFixed(1)}s 超过阈值 ${rules.timeoutThreshold}s` }
  }
  if (leakageRate > rules.highLeakageThreshold) {
    return { type: 'highLeakage', reason: `漏水率 ${leakageRate.toFixed(1)}% 超过阈值 ${rules.highLeakageThreshold}%` }
  }
  if (wearDelta > rules.wearSpikeThreshold) {
    return { type: 'wearSpike', reason: `构件磨损突增 ${wearDelta.toFixed(1)} 级，超过阈值 ${rules.wearSpikeThreshold}级` }
  }
  return { type: 'none', reason: '' }
}
