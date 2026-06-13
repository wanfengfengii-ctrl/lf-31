import type {
  RecoveryScheme,
  SchemeRecommendation,
  SimilarSchemeSearchCriteria
} from '@/types'
import {
  calcSchemeStats,
  getWellTypeLabel,
  getRopeMaterialLabel,
  getBucketMaterialLabel
} from './statistics.service'

export function generateId(prefix: string = 'rec'): string {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function calculateSchemeSimilarity(
  scheme1: RecoveryScheme,
  scheme2: RecoveryScheme
): number {
  let score = 0
  let maxScore = 0

  maxScore += 10
  if (scheme1.wellConfig?.type === scheme2.wellConfig?.type) score += 10

  maxScore += 15
  const ropeMats1 = new Set(scheme1.ropes.map(r => r.material))
  const ropeMats2 = new Set(scheme2.ropes.map(r => r.material))
  const ropeIntersection = [...ropeMats1].filter(x => ropeMats2.has(x))
  score += (ropeIntersection.length / Math.max(ropeMats1.size, ropeMats2.size, 1)) * 15

  maxScore += 15
  const bucketMats1 = new Set(scheme1.buckets.map(b => b.material))
  const bucketMats2 = new Set(scheme2.buckets.map(b => b.material))
  const bucketIntersection = [...bucketMats1].filter(x => bucketMats2.has(x))
  score += (bucketIntersection.length / Math.max(bucketMats1.size, bucketMats2.size, 1)) * 15

  maxScore += 20
  const compTypes1 = new Set(scheme1.components.map(c => c.type))
  const compTypes2 = new Set(scheme2.components.map(c => c.type))
  const compIntersection = [...compTypes1].filter(x => compTypes2.has(x))
  score += (compIntersection.length / Math.max(compTypes1.size, compTypes2.size, 1)) * 20

  maxScore += 10
  const weathers1 = new Set(scheme1.trials.map(t => t.environmentConditions?.weather).filter(Boolean))
  const weathers2 = new Set(scheme2.trials.map(t => t.environmentConditions?.weather).filter(Boolean))
  const weatherIntersection = [...weathers1].filter(x => weathers2.has(x))
  if (weathers1.size > 0 || weathers2.size > 0) {
    score += (weatherIntersection.length / Math.max(weathers1.size, weathers2.size, 1)) * 10
  } else {
    score += 5
  }

  maxScore += 10
  const postures1 = new Set(scheme1.trials.map(t => t.humanOperation?.liftingPosture).filter(Boolean))
  const postures2 = new Set(scheme2.trials.map(t => t.humanOperation?.liftingPosture).filter(Boolean))
  const postureIntersection = [...postures1].filter(x => postures2.has(x))
  if (postures1.size > 0 || postures2.size > 0) {
    score += (postureIntersection.length / Math.max(postures1.size, postures2.size, 1)) * 10
  } else {
    score += 5
  }

  maxScore += 20
  const stats1 = calcSchemeStats(scheme1)
  const stats2 = calcSchemeStats(scheme2)
  if (stats1 && stats2) {
    const effDiff = Math.abs(stats1.avgEfficiency - stats2.avgEfficiency)
    const maxEff = Math.max(stats1.avgEfficiency, stats2.avgEfficiency, 0.001)
    score += (1 - effDiff / maxEff) * 20
  } else if (!stats1 && !stats2) {
    score += 10
  }

  return maxScore > 0 ? Number((score / maxScore * 100).toFixed(1)) : 0
}

export function searchSimilarSchemes(
  schemes: RecoveryScheme[],
  criteria: SimilarSchemeSearchCriteria,
  targetSchemeId?: string
): SchemeRecommendation[] {
  const recommendations: SchemeRecommendation[] = []
  const targetScheme = targetSchemeId
    ? schemes.find(s => s.id === targetSchemeId)
    : null

  schemes.forEach(scheme => {
    if (targetSchemeId && scheme.id === targetSchemeId) return

    let match = true
    if (criteria.wellType && scheme.wellConfig?.type !== criteria.wellType) match = false
    if (criteria.ropeMaterial && !scheme.ropes.some(r => r.material === criteria.ropeMaterial)) match = false
    if (criteria.bucketMaterial && !scheme.buckets.some(b => b.material === criteria.bucketMaterial)) match = false
    if (criteria.componentTypes && !criteria.componentTypes.every(ct =>
      scheme.components.some(c => c.type === ct)
    )) match = false

    const stats = calcSchemeStats(scheme)
    if (criteria.minEfficiency && stats && stats.avgEfficiency < criteria.minEfficiency) match = false
    if (criteria.maxAbnormalRate !== undefined && stats && stats.abnormalRate > criteria.maxAbnormalRate) match = false

    if (criteria.environment) {
      const hasMatchingEnv = scheme.trials.some(t => {
        if (!t.environmentConditions) return false
        if (criteria.environment!.weather && t.environmentConditions.weather !== criteria.environment!.weather) return false
        if (criteria.environment!.windLevel && t.environmentConditions.windLevel !== criteria.environment!.windLevel) return false
        return true
      })
      if (!hasMatchingEnv) match = false
    }

    if (!match) return

    const similarity = targetScheme ? calculateSchemeSimilarity(targetScheme, scheme) : 80

    const keyFeatures: string[] = []
    if (scheme.wellConfig) keyFeatures.push(`井型: ${getWellTypeLabel(scheme.wellConfig.type)}`)
    scheme.ropes.forEach(r => keyFeatures.push(`绳: ${getRopeMaterialLabel(r.material)}`))
    scheme.buckets.forEach(b => keyFeatures.push(`桶: ${getBucketMaterialLabel(b.material)}`))

    let reason = '匹配配置特征'
    if (stats) {
      if (stats.avgEfficiency > 0.3) reason = '提水效率优秀'
      else if (stats.abnormalRate < 10) reason = '运行稳定性好'
    }

    recommendations.push({
      id: generateId('rec'),
      schemeId: scheme.id,
      schemeName: scheme.name,
      similarity,
      avgEfficiency: stats?.avgEfficiency || 0,
      abnormalRate: stats?.abnormalRate || 0,
      avgWear: stats ? (stats.avgRopeWear + stats.avgBucketWear) / 2 : 0,
      reason,
      keyFeatures: keyFeatures.slice(0, 5)
    })
  })

  return recommendations
    .sort((a, b) => b.similarity - a.similarity || b.avgEfficiency - a.avgEfficiency)
    .slice(0, 10)
}

export function recommendOptimalScheme(
  schemes: RecoveryScheme[],
  criteria?: SimilarSchemeSearchCriteria
): SchemeRecommendation | null {
  const candidates = searchSimilarSchemes(schemes, criteria || {})

  if (candidates.length === 0) {
    const allSchemes = schemes.filter(s => s.trials.length > 0)
    if (allSchemes.length === 0) return null

    let best = allSchemes[0]
    let bestScore = -Infinity

    allSchemes.forEach(scheme => {
      const stats = calcSchemeStats(scheme)
      if (stats) {
        const score = stats.avgEfficiency * 100 - stats.abnormalRate - stats.avgRopeWear - stats.avgBucketWear
        if (score > bestScore) {
          bestScore = score
          best = scheme
        }
      }
    })

    const bestStats = calcSchemeStats(best)
    const keyFeatures: string[] = []
    if (best.wellConfig) keyFeatures.push(`井型: ${getWellTypeLabel(best.wellConfig.type)}`)
    best.ropes.forEach(r => keyFeatures.push(`绳: ${getRopeMaterialLabel(r.material)}`))
    best.buckets.forEach(b => keyFeatures.push(`桶: ${getBucketMaterialLabel(b.material)}`))

    return {
      id: generateId('rec'),
      schemeId: best.id,
      schemeName: best.name,
      similarity: 100,
      avgEfficiency: bestStats?.avgEfficiency || 0,
      abnormalRate: bestStats?.abnormalRate || 0,
      avgWear: bestStats ? (bestStats.avgRopeWear + bestStats.avgBucketWear) / 2 : 0,
      reason: '综合评分最高',
      keyFeatures: keyFeatures.slice(0, 5)
    }
  }

  let best = candidates[0]
  let bestScore = -Infinity

  candidates.forEach(c => {
    const score = c.similarity * 0.3 + c.avgEfficiency * 100 * 0.5 - c.abnormalRate * 0.2
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  })

  return best
}
