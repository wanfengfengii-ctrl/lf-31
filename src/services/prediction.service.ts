import type {
  RecoveryScheme,
  EfficiencyPrediction as EfficiencyPredictionType
} from '@/types'
import { getApprovedTrials, getTrialEfficiency } from './statistics.service'

export type EfficiencyTrend = 'improving' | 'stable' | 'declining'

export function analyzeEfficiencyTrend(efficiencies: number[]): EfficiencyTrend {
  if (efficiencies.length < 5) return 'stable'

  const recent = efficiencies.slice(-3)
  const earlier = efficiencies.slice(-6, -3)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length

  if (recentAvg > earlierAvg * 1.05) return 'improving'
  if (recentAvg < earlierAvg * 0.95) return 'declining'
  return 'stable'
}

export interface PredictionFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  description: string
  weight: number
}

export interface EfficiencyPredictionResult {
  predictedEfficiency: number
  confidence: number
  factors: PredictionFactor[]
  historicalData: {
    avgEfficiency: number
    trend: EfficiencyTrend
    dataPoints: number
  }
  recommendations: string[]
}

export function predictEfficiencyForScheme(
  scheme: RecoveryScheme
): EfficiencyPredictionType | null {
  const approvedTrials = getApprovedTrials(scheme)
  if (approvedTrials.length === 0) return null

  const bucket = scheme.buckets[0]
  const efficiencies = approvedTrials.map(t => getTrialEfficiency(t, bucket?.capacity || 0))

  const avgEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
  const trend = analyzeEfficiencyTrend(efficiencies)

  const factors: PredictionFactor[] = []
  let predictedEfficiency = avgEfficiency

  const avgRopeWear = approvedTrials.reduce((sum, t) => sum + t.ropeWear, 0) / approvedTrials.length
  const avgBucketWear = approvedTrials.reduce((sum, t) => sum + t.bucketWear, 0) / approvedTrials.length
  const compWearValues = approvedTrials.map(t => {
    const vals = Object.values(t.componentWear)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  })
  const avgCompWear = compWearValues.length > 0
    ? compWearValues.reduce((a, b) => a + b, 0) / compWearValues.length
    : 0

  if (avgCompWear > 5) {
    factors.push({
      factor: '构件磨损',
      impact: 'negative',
      description: `平均构件磨损 ${avgCompWear.toFixed(1)} 级，较高磨损会降低效率`,
      weight: 0.2
    })
    predictedEfficiency *= (1 - avgCompWear * 0.02)
  } else if (avgCompWear < 2) {
    factors.push({
      factor: '构件状态',
      impact: 'positive',
      description: `构件磨损低 (${avgCompWear.toFixed(1)}级)，运行顺畅`,
      weight: 0.15
    })
    predictedEfficiency *= 1.03
  }

  if (avgRopeWear > 5) {
    factors.push({
      factor: '井绳磨损',
      impact: 'negative',
      description: `井绳平均磨损 ${avgRopeWear.toFixed(1)} 级，摩擦阻力增大`,
      weight: 0.2
    })
    predictedEfficiency *= (1 - avgRopeWear * 0.015)
  }

  if (avgBucketWear > 5) {
    factors.push({
      factor: '汲桶磨损',
      impact: 'negative',
      description: `汲桶平均磨损 ${avgBucketWear.toFixed(1)} 级，可能导致漏水增加`,
      weight: 0.15
    })
    predictedEfficiency *= (1 - avgBucketWear * 0.01)
  }

  const abnormalRate = approvedTrials.filter(t => t.abnormalType !== 'none').length / approvedTrials.length * 100
  if (abnormalRate > 20) {
    factors.push({
      factor: '异常率',
      impact: 'negative',
      description: `异常率 ${abnormalRate.toFixed(1)}%，异常会降低整体效率`,
      weight: 0.2
    })
    predictedEfficiency *= (1 - abnormalRate * 0.003)
  } else if (abnormalRate < 5) {
    factors.push({
      factor: '运行稳定性',
      impact: 'positive',
      description: `异常率仅 ${abnormalRate.toFixed(1)}%，运行稳定`,
      weight: 0.1
    })
    predictedEfficiency *= 1.02
  }

  const envImpact = approvedTrials.filter(t =>
    t.environmentConditions && ['rainy', 'windy', 'snowy'].includes(t.environmentConditions.weather)
  ).length / approvedTrials.length
  if (envImpact > 0.3) {
    factors.push({
      factor: '环境影响',
      impact: 'negative',
      description: `${(envImpact * 100).toFixed(0)}% 的试验在恶劣天气进行`,
      weight: 0.1
    })
    predictedEfficiency *= 0.95
  }

  const confidence = Math.min(95, 50 + efficiencies.length * 5 + (bucket ? 10 : 0))

  const recommendations: string[] = []
  if (avgCompWear > 4) recommendations.push('建议对磨损较高的构件进行润滑或更换')
  if (avgRopeWear > 4) recommendations.push('建议更换井绳或进行涂油保养')
  if (avgBucketWear > 4) recommendations.push('建议修补或更换汲桶')
  if (abnormalRate > 15) recommendations.push('建议分析异常原因，优化操作流程')
  if (trend === 'declining') recommendations.push('效率呈下降趋势，建议排查设备状态')
  if (recommendations.length === 0) recommendations.push('当前状态良好，继续保持定期维护')

  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    predictedEfficiency: Number(Math.max(0, predictedEfficiency).toFixed(4)),
    confidence,
    factors,
    historicalData: {
      avgEfficiency: Number(avgEfficiency.toFixed(4)),
      trend,
      dataPoints: efficiencies.length
    },
    recommendations
  }
}

export function getHistoricalEfficiencies(scheme: RecoveryScheme): number[] {
  const approvedTrials = getApprovedTrials(scheme)
  const bucket = scheme.buckets[0]
  return approvedTrials.map(t =>
    bucket && t.timeCost > 0
      ? Number(getTrialEfficiency(t, bucket.capacity).toFixed(4))
      : 0
  )
}

export const trendLabels: Record<EfficiencyTrend | 'stable', string> = {
  improving: '📈 提升中',
  stable: '➡️ 稳定',
  declining: '📉 下降中'
}

export const trendColors: Record<EfficiencyTrend | 'stable', string> = {
  improving: '#18a058',
  stable: '#2080f0',
  declining: '#d03050'
}

export const factorImpactColors: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: '#18a058',
  negative: '#d03050',
  neutral: '#f0a020'
}
