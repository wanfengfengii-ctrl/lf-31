import type {
  KnowledgeGraph,
  KnowledgeNode,
  RiskAssessment,
  RiskPattern,
  KnowledgeNodeType
} from '@/types'
import { RISK_PATTERNS } from '@/types'

export function evaluateCondition(
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

export function assessRisksForGraph(
  graph: KnowledgeGraph,
  schemeId?: string,
  patterns: RiskPattern[] = RISK_PATTERNS
): RiskAssessment[] {
  const assessments: RiskAssessment[] = []

  const targetNodes = schemeId
    ? graph.nodes.filter(n =>
        n.id.startsWith(`scheme_${schemeId}`) ||
        graph.relations.some(r =>
          r.source === `scheme_${schemeId}` && r.target === n.id
        )
      )
    : graph.nodes

  patterns.forEach(pattern => {
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
          const rel = graph.relations.find(r => r.target === nodeId && r.source.startsWith('scheme_'))
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

export function assessRisksByTrials(
  trials: Array<{
    ropeMaterial?: string
    weather?: string
    windLevel?: string
    componentMaterials?: string[]
    bucketMaterial?: string
    wellType?: string
    avgComponentWear?: number
    abnormalType?: string
    operatorCount?: number
    avgExperience?: number
  }>
): RiskAssessment[] {
  const assessments: RiskAssessment[] = []

  RISK_PATTERNS.forEach(pattern => {
    const matchedNodes: string[] = []
    let allConditionsMet = true

    for (const condition of pattern.conditions) {
      const matching = trials.filter(trial => {
        const property = condition.property
        let trialValue: any

        switch (condition.nodeType) {
          case 'ropeMaterial':
            trialValue = trial.ropeMaterial; break
          case 'environment':
            if (property === 'weather') trialValue = trial.weather
            else if (property === 'windLevel') trialValue = trial.windLevel
            break
          case 'component':
            if (property === 'material') {
              const found = trial.componentMaterials?.some(m =>
                String(m).toLowerCase().includes(String(condition.value).toLowerCase())
              )
              return found === true
            } else if (property === 'wear') {
              trialValue = trial.avgComponentWear
            }
            break
          case 'bucketType':
            trialValue = trial.bucketMaterial; break
          case 'wellType':
            trialValue = trial.wellType; break
          case 'abnormalRound':
            if (property === 'type') {
              return String(trial.abnormalType || '').toLowerCase().includes(String(condition.value).toLowerCase())
            }
            break
          case 'humanIntervention':
            if (property === 'operatorCount') trialValue = trial.operatorCount
            else if (property === 'avgExperience') trialValue = trial.avgExperience
            break
        }

        if (trialValue === undefined) return false

        switch (condition.operator) {
          case 'eq': return trialValue === condition.value
          case 'gt': return Number(trialValue) > condition.value
          case 'lt': return Number(trialValue) < condition.value
          case 'gte': return Number(trialValue) >= condition.value
          case 'lte': return Number(trialValue) <= condition.value
          case 'contains':
            return String(trialValue).toLowerCase().includes(String(condition.value).toLowerCase())
        }
        return false
      })
      if (matching.length === 0) {
        allConditionsMet = false
        break
      }
      matchedNodes.push(...matching.map((_, i) => `${pattern.id}_${condition.nodeType}_${i}`))
    }

    if (allConditionsMet && matchedNodes.length > 0) {
      const confidence = Math.min(100, matchedNodes.length * 20 + trials.length * 5)
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

export const riskLevelLabels: Record<'low' | 'medium' | 'high', string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
}

export const riskLevelColors: Record<'low' | 'medium' | 'high', string> = {
  low: '#18a058',
  medium: '#f0a020',
  high: '#d03050'
}

export function getRiskColor(level: string): string {
  return riskLevelColors[level as 'low' | 'medium' | 'high'] || '#999'
}

export function getRiskLabel(level: string): string {
  return riskLevelLabels[level as 'low' | 'medium' | 'high'] || '未知'
}

export function getRiskTagType(level: string): 'success' | 'warning' | 'error' | 'info' {
  switch (level) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'info'
  }
}
