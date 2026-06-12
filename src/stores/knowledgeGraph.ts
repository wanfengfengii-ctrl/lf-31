import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSchemeStore } from './scheme'
import type {
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeRelation,
  KnowledgeNodeType,
  RiskAssessment,
  RiskPattern,
  SchemeRecommendation,
  MaintenanceStrategy,
  EfficiencyPrediction,
  SimilarSchemeSearchCriteria,
  RecoveryScheme,
  TrialRound
} from '@/types'
import {
  RISK_PATTERNS,
  WELL_TYPE_OPTIONS,
  ROPE_MATERIAL_OPTIONS,
  BUCKET_MATERIAL_OPTIONS,
  COMPONENT_TYPE_OPTIONS,
  WEATHER_OPTIONS,
  WIND_LEVEL_OPTIONS,
  LIFTING_POSTURE_OPTIONS,
  ABNORMAL_TYPE_LABELS
} from '@/types'

function generateKGId(): string {
  return 'kg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export const useKnowledgeGraphStore = defineStore('knowledgeGraph', () => {
  const schemeStore = useSchemeStore()

  const graph = ref<KnowledgeGraph>({ nodes: [], relations: [] })
  const selectedNodeId = ref<string | null>(null)
  const highlightedRelations = ref<string[]>([])

  const nodeTypeLabels: Record<KnowledgeNodeType, string> = {
    wellType: '井型',
    component: '辘轳构件',
    ropeMaterial: '井绳材质',
    bucketType: '汲桶类型',
    environment: '环境条件',
    humanIntervention: '人力干预',
    abnormalRound: '异常轮次',
    maintenance: '维护记录',
    scheme: '试验方案'
  }

  const nodeTypeColors: Record<KnowledgeNodeType, string> = {
    wellType: '#18a058',
    component: '#2080f0',
    ropeMaterial: '#f0a020',
    bucketType: '#722ed1',
    environment: '#13c2c2',
    humanIntervention: '#eb2f96',
    abnormalRound: '#d03050',
    maintenance: '#fa8c16',
    scheme: '#1e3a5f'
  }

  function getNodeLabel(type: KnowledgeNodeType, value: string): string {
    const maps: Record<string, Array<{ label: string; value: string }>> = {
      wellType: WELL_TYPE_OPTIONS,
      ropeMaterial: ROPE_MATERIAL_OPTIONS,
      bucketMaterial: BUCKET_MATERIAL_OPTIONS,
      componentType: COMPONENT_TYPE_OPTIONS,
      weather: WEATHER_OPTIONS,
      windLevel: WIND_LEVEL_OPTIONS,
      liftingPosture: LIFTING_POSTURE_OPTIONS
    }
    for (const map of Object.values(maps)) {
      const found = map.find(o => o.value === value)
      if (found) return found.label
    }
    return value
  }

  function buildGraph(): KnowledgeGraph {
    const nodes: KnowledgeNode[] = []
    const relations: KnowledgeRelation[] = []
    const nodeMap = new Map<string, KnowledgeNode>()

    function addNode(node: KnowledgeNode) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node)
        nodes.push(node)
      }
      return nodeMap.get(node.id)!
    }

    function addRelation(source: string, target: string, type: string, label: string, weight: number = 1) {
      const relId = `${source}_${target}_${type}`
      if (!relations.find(r => r.id === relId)) {
        relations.push({
          id: relId,
          source,
          target,
          type,
          label,
          weight
        })
      }
    }

    schemeStore.schemes.forEach(scheme => {
      const schemeNode: KnowledgeNode = {
        id: `scheme_${scheme.id}`,
        type: 'scheme',
        label: scheme.name,
        description: scheme.description,
        metadata: {
          completedRounds: scheme.completedRounds,
          totalRounds: scheme.totalRounds,
          assemblyComplete: scheme.assemblyComplete
        }
      }
      addNode(schemeNode)

      if (scheme.wellConfig) {
        const wellNodeId = `wellType_${scheme.wellConfig.type}`
        addNode({
          id: wellNodeId,
          type: 'wellType',
          label: getNodeLabel('wellType', scheme.wellConfig.type),
          value: scheme.wellConfig.type,
          metadata: {
            depth: scheme.wellConfig.depth,
            diameter: scheme.wellConfig.diameter,
            waterLevel: scheme.wellConfig.waterLevel
          }
        })
        addRelation(schemeNode.id, wellNodeId, 'uses', '采用井型', 3)
      }

      scheme.components.forEach(comp => {
        const compNodeId = `component_${comp.id}`
        const avgWear = scheme.trials.length > 0
          ? scheme.trials.reduce((sum, t) => sum + (t.componentWear[comp.id] || 0), 0) / scheme.trials.length
          : 0
        addNode({
          id: compNodeId,
          type: 'component',
          label: `${comp.componentNo} (${getNodeLabel('componentType', comp.type)})`,
          value: comp.type,
          riskLevel: avgWear > 7 ? 'high' : avgWear > 4 ? 'medium' : 'low',
          metadata: {
            componentNo: comp.componentNo,
            material: comp.material,
            wearResistance: comp.wearResistance,
            avgWear: Number(avgWear.toFixed(2))
          }
        })
        addRelation(schemeNode.id, compNodeId, 'includes', '包含构件', 2)
      })

      scheme.ropes.forEach(rope => {
        const ropeNodeId = `rope_${rope.id}`
        const ropeTrials = scheme.trials.filter(t => t.ropeId === rope.id)
        const avgWear = ropeTrials.length > 0
          ? ropeTrials.reduce((sum, t) => sum + t.ropeWear, 0) / ropeTrials.length
          : 0
        addNode({
          id: ropeNodeId,
          type: 'ropeMaterial',
          label: `${rope.ropeNo} (${getNodeLabel('ropeMaterial', rope.material)})`,
          value: rope.material,
          riskLevel: avgWear > 7 ? 'high' : avgWear > 4 ? 'medium' : 'low',
          metadata: {
            ropeNo: rope.ropeNo,
            diameter: rope.diameter,
            breakingStrength: rope.breakingStrength,
            avgWear: Number(avgWear.toFixed(2))
          }
        })
        addRelation(schemeNode.id, ropeNodeId, 'uses', '使用井绳', 2)
      })

      scheme.buckets.forEach(bucket => {
        const bucketNodeId = `bucket_${bucket.id}`
        const bucketTrials = scheme.trials.filter(t => t.bucketId === bucket.id)
        const avgWear = bucketTrials.length > 0
          ? (bucketTrials.reduce((sum, t) => sum + t.bucketWear, 0) / bucketTrials.length)
          : 0
        addNode({
          id: bucketNodeId,
          type: 'bucketType',
          label: `${bucket.bucketNo} (${getNodeLabel('bucketMaterial', bucket.material)})`,
          value: bucket.material,
          riskLevel: avgWear > 7 ? 'high' : avgWear > 4 ? 'medium' : 'low',
          metadata: {
            bucketNo: bucket.bucketNo,
            capacity: bucket.capacity,
            weight: bucket.weight,
            avgWear: Number(avgWear.toFixed(2))
          }
        })
        addRelation(schemeNode.id, bucketNodeId, 'uses', '使用汲桶', 2)
      })

      const envWeathers = new Map<string, number>()
      const windLevels = new Map<string, number>()
      scheme.trials.forEach(trial => {
        if (trial.environmentConditions) {
          const w = trial.environmentConditions.weather
          envWeathers.set(w, (envWeathers.get(w) || 0) + 1)
          const wl = trial.environmentConditions.windLevel
          windLevels.set(wl, (windLevels.get(wl) || 0) + 1)
        }
      })

      envWeathers.forEach((count, weather) => {
        const envNodeId = `env_weather_${scheme.id}_${weather}`
        addNode({
          id: envNodeId,
          type: 'environment',
          label: `${getNodeLabel('weather', weather)} (${count}次)`,
          value: weather,
          metadata: { type: 'weather', count }
        })
        addRelation(schemeNode.id, envNodeId, 'testedIn', '试验环境', 1)
      })

      windLevels.forEach((count, windLevel) => {
        const windNodeId = `env_wind_${scheme.id}_${windLevel}`
        addNode({
          id: windNodeId,
          type: 'environment',
          label: `${getNodeLabel('windLevel', windLevel)} (${count}次)`,
          value: windLevel,
          metadata: { type: 'windLevel', count }
        })
        addRelation(schemeNode.id, windNodeId, 'testedIn', '试验风力', 1)
      })

      const postures = new Map<string, number>()
      scheme.trials.forEach(trial => {
        if (trial.humanOperation) {
          const p = trial.humanOperation.liftingPosture
          postures.set(p, (postures.get(p) || 0) + 1)
        }
      })

      postures.forEach((count, posture) => {
        const humanNodeId = `human_posture_${scheme.id}_${posture}`
        addNode({
          id: humanNodeId,
          type: 'humanIntervention',
          label: `${getNodeLabel('liftingPosture', posture)} (${count}次)`,
          value: posture,
          metadata: { type: 'liftingPosture', count }
        })
        addRelation(schemeNode.id, humanNodeId, 'operatedBy', '操作方式', 1)
      })

      const abnormalTypes = new Map<string, number>()
      scheme.trials.forEach(trial => {
        if (trial.abnormalType !== 'none') {
          abnormalTypes.set(trial.abnormalType, (abnormalTypes.get(trial.abnormalType) || 0) + 1)
        }
      })

      abnormalTypes.forEach((count, abnormalType) => {
        const abnormalNodeId = `abnormal_${scheme.id}_${abnormalType}`
        addNode({
          id: abnormalNodeId,
          type: 'abnormalRound',
          label: `${ABNORMAL_TYPE_LABELS[abnormalType as keyof typeof ABNORMAL_TYPE_LABELS]} (${count}次)`,
          value: abnormalType,
          riskLevel: 'high',
          metadata: { type: abnormalType, count }
        })
        addRelation(schemeNode.id, abnormalNodeId, 'hasAbnormal', '存在异常', 2)
      })

      const maintTypes = new Map<string, number>()
      scheme.trials.forEach(trial => {
        if (trial.humanOperation?.maintenanceInterventions) {
          trial.humanOperation.maintenanceInterventions.forEach(m => {
            maintTypes.set(m.type, (maintTypes.get(m.type) || 0) + 1)
          })
        }
      })

      maintTypes.forEach((count, maintType) => {
        const maintNodeId = `maint_${scheme.id}_${maintType}`
        const maintLabels: Record<string, string> = {
          lubrication: '润滑',
          adjustment: '调整',
          repair: '修理',
          replacement: '更换',
          cleaning: '清洁'
        }
        addNode({
          id: maintNodeId,
          type: 'maintenance',
          label: `${maintLabels[maintType] || maintType} (${count}次)`,
          value: maintType,
          metadata: { type: maintType, count }
        })
        addRelation(schemeNode.id, maintNodeId, 'hasMaintenance', '执行维护', 1)
      })

      scheme.trials.forEach(trial => {
        if (trial.ropeId) {
          addRelation(`trial_${scheme.id}_${trial.roundNo}`, `rope_${trial.ropeId}`, 'usedRope', '使用绳', 1)
        }
        if (trial.bucketId) {
          addRelation(`trial_${scheme.id}_${trial.roundNo}`, `bucket_${trial.bucketId}`, 'usedBucket', '使用桶', 1)
        }
      })
    })

    schemeStore.schemes.forEach(scheme => {
      const stats = schemeStore.getSchemeStats(scheme.id)
      if (stats) {
        const schemeNode = nodeMap.get(`scheme_${scheme.id}`)
        if (schemeNode) {
          schemeNode.metadata = {
            ...schemeNode.metadata,
            avgEfficiency: Number(stats.avgEfficiency.toFixed(3)),
            avgTimeCost: Number(stats.avgTimeCost.toFixed(2)),
            avgLeakage: Number(stats.avgLeakage.toFixed(2)),
            abnormalRate: Number(stats.abnormalRate.toFixed(2))
          }
        }
      }
    })

    graph.value = { nodes, relations }
    return graph.value
  }

  function evaluateCondition(
    node: KnowledgeNode,
    condition: { property: string; operator: string; value: any }
  ): boolean {
    const nodeValue = node.metadata?.[condition.property] ?? node.value
    if (nodeValue === undefined) return false

    switch (condition.operator) {
      case 'eq': return nodeValue === condition.value
      case 'gt': return Number(nodeValue) > condition.value
      case 'lt': return Number(nodeValue) < condition.value
      case 'gte': return Number(nodeValue) >= condition.value
      case 'lte': return Number(nodeValue) <= condition.value
      case 'contains': 
        return String(nodeValue).toLowerCase().includes(String(condition.value).toLowerCase())
      default: return false
    }
  }

  function assessRisks(schemeId?: string): RiskAssessment[] {
    const assessments: RiskAssessment[] = []
    const targetNodes = schemeId
      ? graph.value.nodes.filter(n => 
          n.id.startsWith(`scheme_${schemeId}`) || 
          graph.value.relations.some(r => 
            r.source === `scheme_${schemeId}` && r.target === n.id
          )
        )
      : graph.value.nodes

    RISK_PATTERNS.forEach(pattern => {
      const matchedNodes: string[] = []
      let allConditionsMet = true

      for (const condition of pattern.conditions) {
        const matchingNodes = targetNodes.filter(n => 
          n.type === condition.nodeType && evaluateCondition(n, condition)
        )
        if (matchingNodes.length === 0) {
          allConditionsMet = false
          break
        }
        matchedNodes.push(...matchingNodes.map(n => n.id))
      }

      if (allConditionsMet && matchedNodes.length > 0) {
        const relatedSchemes = schemeId ? [schemeId] : [...new Set(
          matchedNodes.map(nodeId => {
            const rel = graph.value.relations.find(r => r.target === nodeId && r.source.startsWith('scheme_'))
            return rel ? rel.source.replace('scheme_', '') : null
          }).filter(Boolean)
        )] as string[]

        const confidence = Math.min(100, matchedNodes.length * 20 + relatedSchemes.length * 10)

        assessments.push({
          patternId: pattern.id,
          patternName: pattern.name,
          riskLevel: pattern.riskLevel,
          matchedNodes: [...new Set(matchedNodes)],
          description: pattern.description,
          suggestion: pattern.suggestion,
          confidence
        })
      }
    })

    return assessments.sort((a, b) => {
      const levelOrder = { high: 0, medium: 1, low: 2 }
      return levelOrder[a.riskLevel] - levelOrder[b.riskLevel] || b.confidence - a.confidence
    })
  }

  function calculateSchemeSimilarity(scheme1: RecoveryScheme, scheme2: RecoveryScheme): number {
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
    const stats1 = schemeStore.getSchemeStats(scheme1.id)
    const stats2 = schemeStore.getSchemeStats(scheme2.id)
    if (stats1 && stats2) {
      const effDiff = Math.abs(stats1.avgEfficiency - stats2.avgEfficiency)
      const maxEff = Math.max(stats1.avgEfficiency, stats2.avgEfficiency, 0.001)
      score += (1 - effDiff / maxEff) * 20
    } else if (!stats1 && !stats2) {
      score += 10
    }

    return maxScore > 0 ? Number((score / maxScore * 100).toFixed(1)) : 0
  }

  function searchSimilarSchemes(criteria: SimilarSchemeSearchCriteria, targetSchemeId?: string): SchemeRecommendation[] {
    const recommendations: SchemeRecommendation[] = []
    const targetScheme = targetSchemeId 
      ? schemeStore.schemes.find(s => s.id === targetSchemeId)
      : null

    schemeStore.schemes.forEach(scheme => {
      if (targetSchemeId && scheme.id === targetSchemeId) return

      let match = true
      if (criteria.wellType && scheme.wellConfig?.type !== criteria.wellType) match = false
      if (criteria.ropeMaterial && !scheme.ropes.some(r => r.material === criteria.ropeMaterial)) match = false
      if (criteria.bucketMaterial && !scheme.buckets.some(b => b.material === criteria.bucketMaterial)) match = false
      if (criteria.componentTypes && !criteria.componentTypes.every(ct => 
        scheme.components.some(c => c.type === ct)
      )) match = false

      const stats = schemeStore.getSchemeStats(scheme.id)
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
      if (scheme.wellConfig) keyFeatures.push(`井型: ${getNodeLabel('wellType', scheme.wellConfig.type)}`)
      scheme.ropes.forEach(r => keyFeatures.push(`绳: ${getNodeLabel('ropeMaterial', r.material)}`))
      scheme.buckets.forEach(b => keyFeatures.push(`桶: ${getNodeLabel('bucketMaterial', b.material)}`))

      let reason = '匹配配置特征'
      if (stats) {
        if (stats.avgEfficiency > 0.3) reason = '提水效率优秀'
        else if (stats.abnormalRate < 10) reason = '运行稳定性好'
      }

      recommendations.push({
        id: generateKGId(),
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

  function recommendOptimalScheme(criteria?: SimilarSchemeSearchCriteria): SchemeRecommendation | null {
    const candidates = searchSimilarSchemes(criteria || {})
    
    if (candidates.length === 0) {
      const allSchemes = schemeStore.schemes.filter(s => s.trials.length > 0)
      if (allSchemes.length === 0) return null

      let best = allSchemes[0]
      let bestScore = -Infinity

      allSchemes.forEach(scheme => {
        const stats = schemeStore.getSchemeStats(scheme.id)
        if (stats) {
          const score = stats.avgEfficiency * 100 - stats.abnormalRate - stats.avgRopeWear - stats.avgBucketWear
          if (score > bestScore) {
            bestScore = score
            best = scheme
          }
        }
      })

      const bestStats = schemeStore.getSchemeStats(best.id)
      const keyFeatures: string[] = []
      if (best.wellConfig) keyFeatures.push(`井型: ${getNodeLabel('wellType', best.wellConfig.type)}`)
      best.ropes.forEach(r => keyFeatures.push(`绳: ${getNodeLabel('ropeMaterial', r.material)}`))
      best.buckets.forEach(b => keyFeatures.push(`桶: ${getNodeLabel('bucketMaterial', b.material)}`))

      return {
        id: generateKGId(),
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

  function generateMaintenanceStrategies(schemeId: string): MaintenanceStrategy[] {
    const scheme = schemeStore.schemes.find(s => s.id === schemeId)
    if (!scheme) return []

    const strategies: MaintenanceStrategy[] = []
    const approvedTrials = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')

    scheme.components.forEach(comp => {
      const wearHistory = approvedTrials.map(t => t.componentWear[comp.id] || 0)
      const currentWear = wearHistory.length > 0 ? wearHistory[wearHistory.length - 1] : 0
      const avgWear = wearHistory.length > 0 
        ? wearHistory.reduce((a, b) => a + b, 0) / wearHistory.length 
        : 0

      let wearTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
      if (wearHistory.length >= 3) {
        const recent = wearHistory.slice(-3)
        const earlier = wearHistory.slice(-6, -3)
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        if (earlier.length > 0) {
          const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
          if (recentAvg > earlierAvg * 1.2) wearTrend = 'increasing'
          else if (recentAvg < earlierAvg * 0.8) wearTrend = 'decreasing'
        }
      }

      const wearResistance = comp.wearResistance || 5
      const estimatedRemainingLife = Math.max(0, Math.round((10 - currentWear) / Math.max(avgWear, 0.1) * wearResistance / 5))

      let recommendedAction: MaintenanceStrategy['recommendedAction'] = 'monitoring'
      let priority: 'low' | 'medium' | 'high' = 'low'
      let estimatedDuration = 300
      let description = ''

      if (currentWear >= 8 || (wearTrend === 'increasing' && currentWear >= 6)) {
        recommendedAction = 'replacement'
        priority = 'high'
        estimatedDuration = 1800
        description = '磨损严重，建议立即更换'
      } else if (currentWear >= 6 || (wearTrend === 'increasing' && currentWear >= 4)) {
        recommendedAction = 'repair'
        priority = 'high'
        estimatedDuration = 1200
        description = '磨损较高，建议修理加固'
      } else if (currentWear >= 4) {
        recommendedAction = 'lubrication'
        priority = 'medium'
        estimatedDuration = 600
        description = '中度磨损，建议润滑维护'
      } else if (currentWear >= 2) {
        recommendedAction = 'adjustment'
        priority = 'medium'
        estimatedDuration = 300
        description = '轻度磨损，建议调整紧固'
      } else {
        description = '磨损正常，持续监控即可'
      }

      strategies.push({
        id: generateKGId(),
        targetComponent: comp.id,
        componentType: comp.type,
        componentNo: comp.componentNo,
        currentWear: Number(currentWear.toFixed(2)),
        wearTrend,
        estimatedRemainingLife,
        recommendedAction,
        priority,
        estimatedDuration,
        description
      })
    })

    scheme.ropes.forEach(rope => {
      const ropeTrials = approvedTrials.filter(t => t.ropeId === rope.id)
      const wearHistory = ropeTrials.map(t => t.ropeWear)
      const currentWear = wearHistory.length > 0 ? wearHistory[wearHistory.length - 1] : 0
      const avgWear = wearHistory.length > 0 
        ? wearHistory.reduce((a, b) => a + b, 0) / wearHistory.length 
        : 0

      let wearTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
      if (wearHistory.length >= 3) {
        const recent = wearHistory.slice(-3)
        const earlier = wearHistory.slice(-6, -3)
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        if (earlier.length > 0) {
          const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
          if (recentAvg > earlierAvg * 1.2) wearTrend = 'increasing'
          else if (recentAvg < earlierAvg * 0.8) wearTrend = 'decreasing'
        }
      }

      const wearResistance = rope.wearResistance || 5
      const estimatedRemainingLife = Math.max(0, Math.round((10 - currentWear) / Math.max(avgWear, 0.1) * wearResistance / 5))

      let recommendedAction: MaintenanceStrategy['recommendedAction'] = 'monitoring'
      let priority: 'low' | 'medium' | 'high' = 'low'
      let estimatedDuration = 120
      let description = ''

      if (currentWear >= 7 || (wearTrend === 'increasing' && currentWear >= 5)) {
        recommendedAction = 'replacement'
        priority = 'high'
        estimatedDuration = 600
        description = '井绳磨损严重，建议更换'
      } else if (currentWear >= 4) {
        recommendedAction = 'lubrication'
        priority = 'medium'
        estimatedDuration = 300
        description = '井绳中度磨损，建议涂油保养'
      } else {
        description = '井绳磨损正常'
      }

      strategies.push({
        id: generateKGId(),
        targetComponent: rope.id,
        componentType: 'rope',
        componentNo: rope.ropeNo,
        currentWear: Number(currentWear.toFixed(2)),
        wearTrend,
        estimatedRemainingLife,
        recommendedAction,
        priority,
        estimatedDuration,
        description
      })
    })

    scheme.buckets.forEach(bucket => {
      const bucketTrials = approvedTrials.filter(t => t.bucketId === bucket.id)
      const wearHistory = bucketTrials.map(t => t.bucketWear)
      const currentWear = wearHistory.length > 0 ? wearHistory[wearHistory.length - 1] : 0
      const avgWear = wearHistory.length > 0 
        ? wearHistory.reduce((a, b) => a + b, 0) / wearHistory.length 
        : 0

      let wearTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
      if (wearHistory.length >= 3) {
        const recent = wearHistory.slice(-3)
        const earlier = wearHistory.slice(-6, -3)
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        if (earlier.length > 0) {
          const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
          if (recentAvg > earlierAvg * 1.2) wearTrend = 'increasing'
          else if (recentAvg < earlierAvg * 0.8) wearTrend = 'decreasing'
        }
      }

      const wearResistance = bucket.wearResistance || 5
      const estimatedRemainingLife = Math.max(0, Math.round((10 - currentWear) / Math.max(avgWear, 0.1) * wearResistance / 5))

      let recommendedAction: MaintenanceStrategy['recommendedAction'] = 'monitoring'
      let priority: 'low' | 'medium' | 'high' = 'low'
      let estimatedDuration = 120
      let description = ''

      if (currentWear >= 8 || (wearTrend === 'increasing' && currentWear >= 6)) {
        recommendedAction = 'replacement'
        priority = 'high'
        estimatedDuration = 900
        description = '汲桶磨损严重，建议更换'
      } else if (currentWear >= 5) {
        recommendedAction = 'repair'
        priority = 'medium'
        estimatedDuration = 600
        description = '汲桶中度磨损，建议修补加固'
      } else if (currentWear >= 2) {
        recommendedAction = 'cleaning'
        priority = 'low'
        estimatedDuration = 300
        description = '汲桶轻度磨损，建议清洁保养'
      } else {
        description = '汲桶磨损正常'
      }

      strategies.push({
        id: generateKGId(),
        targetComponent: bucket.id,
        componentType: 'bucket',
        componentNo: bucket.bucketNo,
        currentWear: Number(currentWear.toFixed(2)),
        wearTrend,
        estimatedRemainingLife,
        recommendedAction,
        priority,
        estimatedDuration,
        description
      })
    })

    return strategies.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.currentWear - a.currentWear
    })
  }

  function predictEfficiency(schemeId: string): EfficiencyPrediction | null {
    const scheme = schemeStore.schemes.find(s => s.id === schemeId)
    if (!scheme) return null

    const approvedTrials = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
    if (approvedTrials.length === 0) return null

    const bucket = scheme.buckets[0]
    const efficiencies = approvedTrials.map(t => {
      if (!bucket || t.timeCost <= 0) return 0
      return (bucket.capacity * (1 - t.leakageRate / 100)) / t.timeCost
    })

    const avgEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length

    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (efficiencies.length >= 5) {
      const recent = efficiencies.slice(-3)
      const earlier = efficiencies.slice(-6, -3)
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
      if (recentAvg > earlierAvg * 1.05) trend = 'improving'
      else if (recentAvg < earlierAvg * 0.95) trend = 'declining'
    }

    const factors: EfficiencyPrediction['factors'] = []
    let predictedEfficiency = avgEfficiency

    const avgRopeWear = approvedTrials.reduce((sum, t) => sum + t.ropeWear, 0) / approvedTrials.length
    const avgBucketWear = approvedTrials.reduce((sum, t) => sum + t.bucketWear, 0) / approvedTrials.length
    const compWearValues = approvedTrials.map(t => {
      const vals = Object.values(t.componentWear)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    })
    const avgCompWear = compWearValues.reduce((a, b) => a + b, 0) / compWearValues.length

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

  const highRiskNodes = computed(() => {
    return graph.value.nodes.filter(n => n.riskLevel === 'high')
  })

  const mediumRiskNodes = computed(() => {
    return graph.value.nodes.filter(n => n.riskLevel === 'medium')
  })

  const stats = computed(() => {
    const nodeCountByType: Record<string, number> = {}
    graph.value.nodes.forEach(n => {
      nodeCountByType[n.type] = (nodeCountByType[n.type] || 0) + 1
    })

    const relationCountByType: Record<string, number> = {}
    graph.value.relations.forEach(r => {
      relationCountByType[r.type] = (relationCountByType[r.type] || 0) + 1
    })

    return {
      totalNodes: graph.value.nodes.length,
      totalRelations: graph.value.relations.length,
      nodeCountByType,
      relationCountByType,
      highRiskCount: highRiskNodes.value.length,
      mediumRiskCount: mediumRiskNodes.value.length
    }
  })

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
    if (nodeId) {
      highlightedRelations.value = graph.value.relations
        .filter(r => r.source === nodeId || r.target === nodeId)
        .map(r => r.id)
    } else {
      highlightedRelations.value = []
    }
  }

  function getNodeById(id: string): KnowledgeNode | undefined {
    return graph.value.nodes.find(n => n.id === id)
  }

  function getRelatedNodes(nodeId: string): KnowledgeNode[] {
    const relatedIds = new Set<string>()
    graph.value.relations.forEach(r => {
      if (r.source === nodeId) relatedIds.add(r.target)
      if (r.target === nodeId) relatedIds.add(r.source)
    })
    return graph.value.nodes.filter(n => relatedIds.has(n.id))
  }

  function getGraphForECharts(schemeId?: string) {
    let nodes = graph.value.nodes
    let relations = graph.value.relations

    if (schemeId) {
      const schemeNodeId = `scheme_${schemeId}`
      const relatedNodeIds = new Set<string>([schemeNodeId])
      
      relations.forEach(r => {
        if (r.source === schemeNodeId) relatedNodeIds.add(r.target)
        if (r.target === schemeNodeId) relatedNodeIds.add(r.source)
      })

      nodes = nodes.filter(n => relatedNodeIds.has(n.id))
      relations = relations.filter(r => 
        relatedNodeIds.has(r.source) && relatedNodeIds.has(r.target)
      )
    }

    const echartsNodes = nodes.map(n => ({
      id: n.id,
      name: n.label,
      category: n.type,
      symbolSize: n.type === 'scheme' ? 60 : n.type === 'abnormalRound' ? 45 : 35,
      itemStyle: {
        color: nodeTypeColors[n.type],
        borderColor: n.riskLevel === 'high' ? '#d03050' : n.riskLevel === 'medium' ? '#f0a020' : '#fff',
        borderWidth: n.riskLevel ? 3 : 1,
        shadowBlur: n.riskLevel === 'high' ? 15 : 0,
        shadowColor: n.riskLevel === 'high' ? '#d03050' : 'transparent'
      },
      label: {
        show: true,
        fontSize: 11,
        formatter: (params: any) => {
          const text = params.name
          return text.length > 8 ? text.slice(0, 8) + '\n' + text.slice(8) : text
        }
      },
      value: n.metadata
    }))

    const echartsLinks = relations.map(r => ({
      source: r.source,
      target: r.target,
      name: r.label,
      value: r.weight,
      lineStyle: {
        width: r.weight * 2,
        color: highlightedRelations.value.includes(r.id) ? '#18a058' : '#999',
        opacity: highlightedRelations.value.length > 0 
          ? (highlightedRelations.value.includes(r.id) ? 1 : 0.2)
          : 0.5,
        curveness: 0.1
      },
      label: {
        show: r.weight >= 2,
        fontSize: 10,
        formatter: r.label
      }
    }))

    const categories = Object.entries(nodeTypeLabels).map(([key, label]) => ({
      name: key,
      itemStyle: { color: nodeTypeColors[key as KnowledgeNodeType] }
    }))

    return {
      nodes: echartsNodes,
      links: echartsLinks,
      categories,
      legendData: Object.values(nodeTypeLabels)
    }
  }

  return {
    graph,
    selectedNodeId,
    highlightedRelations,
    nodeTypeLabels,
    nodeTypeColors,
    stats,
    highRiskNodes,
    mediumRiskNodes,
    buildGraph,
    assessRisks,
    searchSimilarSchemes,
    recommendOptimalScheme,
    generateMaintenanceStrategies,
    predictEfficiency,
    selectNode,
    getNodeById,
    getRelatedNodes,
    getGraphForECharts
  }
})
