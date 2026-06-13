import type {
  RecoveryScheme,
  TrialRound,
  MaintenanceStrategy as MaintenanceStrategyType
} from '@/types'

export function generateId(prefix: string = 'strat'): string {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export type WearTrend = 'increasing' | 'stable' | 'decreasing'

export function analyzeWearTrend(wearHistory: number[]): WearTrend {
  if (wearHistory.length < 3) return 'stable'

  const recent = wearHistory.slice(-3)
  const earlier = wearHistory.slice(-6, -3)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length

  if (earlier.length === 0) return 'stable'

  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  if (recentAvg > earlierAvg * 1.2) return 'increasing'
  if (recentAvg < earlierAvg * 0.8) return 'decreasing'
  return 'stable'
}

export function estimateRemainingLife(
  currentWear: number,
  avgWear: number,
  wearResistance: number = 5
): number {
  return Math.max(0, Math.round((10 - currentWear) / Math.max(avgWear, 0.1) * wearResistance / 5))
}

export interface MaintenanceDecision {
  recommendedAction: MaintenanceStrategyType['recommendedAction']
  priority: 'low' | 'medium' | 'high'
  estimatedDuration: number
  description: string
}

export function decideComponentMaintenance(
  currentWear: number,
  wearTrend: WearTrend
): MaintenanceDecision {
  if (currentWear >= 8 || (wearTrend === 'increasing' && currentWear >= 6)) {
    return {
      recommendedAction: 'replacement',
      priority: 'high',
      estimatedDuration: 1800,
      description: '磨损严重，建议立即更换'
    }
  }
  if (currentWear >= 6 || (wearTrend === 'increasing' && currentWear >= 4)) {
    return {
      recommendedAction: 'repair',
      priority: 'high',
      estimatedDuration: 1200,
      description: '磨损较高，建议修理加固'
    }
  }
  if (currentWear >= 4) {
    return {
      recommendedAction: 'lubrication',
      priority: 'medium',
      estimatedDuration: 600,
      description: '中度磨损，建议润滑维护'
    }
  }
  if (currentWear >= 2) {
    return {
      recommendedAction: 'adjustment',
      priority: 'medium',
      estimatedDuration: 300,
      description: '轻度磨损，建议调整紧固'
    }
  }
  return {
    recommendedAction: 'monitoring',
    priority: 'low',
    estimatedDuration: 300,
    description: '磨损正常，持续监控即可'
  }
}

export function decideRopeMaintenance(
  currentWear: number,
  wearTrend: WearTrend
): MaintenanceDecision {
  if (currentWear >= 7 || (wearTrend === 'increasing' && currentWear >= 5)) {
    return {
      recommendedAction: 'replacement',
      priority: 'high',
      estimatedDuration: 600,
      description: '井绳磨损严重，建议更换'
    }
  }
  if (currentWear >= 4) {
    return {
      recommendedAction: 'lubrication',
      priority: 'medium',
      estimatedDuration: 300,
      description: '井绳中度磨损，建议涂油保养'
    }
  }
  return {
    recommendedAction: 'monitoring',
    priority: 'low',
    estimatedDuration: 120,
    description: '井绳磨损正常'
  }
}

export function decideBucketMaintenance(
  currentWear: number,
  wearTrend: WearTrend
): MaintenanceDecision {
  if (currentWear >= 8 || (wearTrend === 'increasing' && currentWear >= 6)) {
    return {
      recommendedAction: 'replacement',
      priority: 'high',
      estimatedDuration: 900,
      description: '汲桶磨损严重，建议更换'
    }
  }
  if (currentWear >= 5) {
    return {
      recommendedAction: 'repair',
      priority: 'medium',
      estimatedDuration: 600,
      description: '汲桶中度磨损，建议修补加固'
    }
  }
  if (currentWear >= 2) {
    return {
      recommendedAction: 'adjustment',
      priority: 'low',
      estimatedDuration: 300,
      description: '汲桶轻度磨损，建议清洁保养'
    }
  }
  return {
    recommendedAction: 'monitoring',
    priority: 'low',
    estimatedDuration: 120,
    description: '汲桶磨损正常'
  }
}

export function generateStrategiesForScheme(
  scheme: RecoveryScheme
): MaintenanceStrategyType[] {
  const strategies: MaintenanceStrategyType[] = []
  const approvedTrials = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')

  scheme.components.forEach(comp => {
    const wearHistory = approvedTrials.map(t => t.componentWear[comp.id] || 0)
    const currentWear = wearHistory.length > 0 ? wearHistory[wearHistory.length - 1] : 0
    const avgWear = wearHistory.length > 0
      ? wearHistory.reduce((a, b) => a + b, 0) / wearHistory.length
      : 0

    const wearTrend = analyzeWearTrend(wearHistory)
    const estimatedRemainingLife = estimateRemainingLife(currentWear, avgWear, comp.wearResistance)
    const decision = decideComponentMaintenance(currentWear, wearTrend)

    strategies.push({
      id: generateId('strat'),
      targetComponent: comp.id,
      componentType: comp.type,
      componentNo: comp.componentNo,
      currentWear: Number(currentWear.toFixed(2)),
      wearTrend,
      estimatedRemainingLife,
      recommendedAction: decision.recommendedAction,
      priority: decision.priority,
      estimatedDuration: decision.estimatedDuration,
      description: decision.description
    })
  })

  scheme.ropes.forEach(rope => {
    const ropeTrials = approvedTrials.filter(t => t.ropeId === rope.id)
    const wearHistory = ropeTrials.map(t => t.ropeWear)
    const currentWear = wearHistory.length > 0 ? wearHistory[wearHistory.length - 1] : 0
    const avgWear = wearHistory.length > 0
      ? wearHistory.reduce((a, b) => a + b, 0) / wearHistory.length
      : 0

    const wearTrend = analyzeWearTrend(wearHistory)
    const estimatedRemainingLife = estimateRemainingLife(currentWear, avgWear, rope.wearResistance)
    const decision = decideRopeMaintenance(currentWear, wearTrend)

    strategies.push({
      id: generateId('strat'),
      targetComponent: rope.id,
      componentType: 'rope',
      componentNo: rope.ropeNo,
      currentWear: Number(currentWear.toFixed(2)),
      wearTrend,
      estimatedRemainingLife,
      recommendedAction: decision.recommendedAction,
      priority: decision.priority,
      estimatedDuration: decision.estimatedDuration,
      description: decision.description
    })
  })

  scheme.buckets.forEach(bucket => {
    const bucketTrials = approvedTrials.filter(t => t.bucketId === bucket.id)
    const wearHistory = bucketTrials.map(t => t.bucketWear)
    const currentWear = wearHistory.length > 0 ? wearHistory[wearHistory.length - 1] : 0
    const avgWear = wearHistory.length > 0
      ? wearHistory.reduce((a, b) => a + b, 0) / wearHistory.length
      : 0

    const wearTrend = analyzeWearTrend(wearHistory)
    const estimatedRemainingLife = estimateRemainingLife(currentWear, avgWear, bucket.wearResistance)
    const decision = decideBucketMaintenance(currentWear, wearTrend)

    strategies.push({
      id: generateId('strat'),
      targetComponent: bucket.id,
      componentType: 'bucket',
      componentNo: bucket.bucketNo,
      currentWear: Number(currentWear.toFixed(2)),
      wearTrend,
      estimatedRemainingLife,
      recommendedAction: decision.recommendedAction,
      priority: decision.priority,
      estimatedDuration: decision.estimatedDuration,
      description: decision.description
    })
  })

  return strategies.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority] || b.currentWear - a.currentWear
  })
}

export const actionLabels: Record<string, string> = {
  lubrication: '润滑',
  adjustment: '调整',
  repair: '修理',
  replacement: '更换',
  cleaning: '清洁',
  monitoring: '监控'
}

export const priorityLabels: Record<'low' | 'medium' | 'high', string> = {
  high: '高',
  medium: '中',
  low: '低'
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
}
