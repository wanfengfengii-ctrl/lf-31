import type {
  RecoveryScheme,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeRelation,
  KnowledgeNodeType
} from '@/types'
import {
  WELL_TYPE_OPTIONS,
  ROPE_MATERIAL_OPTIONS,
  BUCKET_MATERIAL_OPTIONS,
  COMPONENT_TYPE_OPTIONS,
  WEATHER_OPTIONS,
  WIND_LEVEL_OPTIONS,
  LIFTING_POSTURE_OPTIONS,
  ABNORMAL_TYPE_LABELS
} from '@/types'
import { calcSchemeStats } from './statistics.service'

function generateKGId(): string {
  return 'kg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export const nodeTypeLabels: Record<KnowledgeNodeType, string> = {
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

export const nodeTypeColors: Record<KnowledgeNodeType, string> = {
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

function getNodeLabel(type: KnowledgeNodeType | string, value: string): string {
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

export function buildKnowledgeGraph(schemes: RecoveryScheme[]): KnowledgeGraph {
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

  schemes.forEach(scheme => {
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

  schemes.forEach(scheme => {
    const stats = calcSchemeStats(scheme)
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

  return { nodes, relations }
}

export function getNodeById(
  graph: KnowledgeGraph,
  id: string
): KnowledgeNode | undefined {
  return graph.nodes.find(n => n.id === id)
}

export function getRelatedNodes(
  graph: KnowledgeGraph,
  nodeId: string
): KnowledgeNode[] {
  const relatedIds = new Set<string>()
  graph.relations.forEach(r => {
    if (r.source === nodeId) relatedIds.add(r.target)
    if (r.target === nodeId) relatedIds.add(r.source)
  })
  return graph.nodes.filter(n => relatedIds.has(n.id))
}

export interface EChartsGraphData {
  nodes: any[]
  links: any[]
  categories: any[]
  legendData: string[]
}

export function convertGraphToECharts(
  graph: KnowledgeGraph,
  highlightedRelations: string[] = [],
  schemeId?: string
): EChartsGraphData {
  let nodes = graph.nodes
  let relations = graph.relations

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
      color: highlightedRelations.includes(r.id) ? '#18a058' : '#999',
      opacity: highlightedRelations.length > 0
        ? (highlightedRelations.includes(r.id) ? 1 : 0.2)
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

export interface GraphStats {
  totalNodes: number
  totalRelations: number
  nodeCountByType: Record<string, number>
  relationCountByType: Record<string, number>
  highRiskCount: number
  mediumRiskCount: number
}

export function getGraphStats(graph: KnowledgeGraph): GraphStats {
  const nodeCountByType: Record<string, number> = {}
  graph.nodes.forEach(n => {
    nodeCountByType[n.type] = (nodeCountByType[n.type] || 0) + 1
  })

  const relationCountByType: Record<string, number> = {}
  graph.relations.forEach(r => {
    relationCountByType[r.type] = (relationCountByType[r.type] || 0) + 1
  })

  return {
    totalNodes: graph.nodes.length,
    totalRelations: graph.relations.length,
    nodeCountByType,
    relationCountByType,
    highRiskCount: graph.nodes.filter(n => n.riskLevel === 'high').length,
    mediumRiskCount: graph.nodes.filter(n => n.riskLevel === 'medium').length
  }
}
