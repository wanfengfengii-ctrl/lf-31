import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSchemeStore } from './scheme'
import type {
  KnowledgeGraph,
  KnowledgeNode,
  RiskAssessment,
  SchemeRecommendation,
  MaintenanceStrategy,
  EfficiencyPrediction,
  SimilarSchemeSearchCriteria
} from '@/types'
import {
  buildKnowledgeGraph,
  getNodeById as _getNodeById,
  getRelatedNodes as _getRelatedNodes,
  convertGraphToECharts,
  getGraphStats,
  nodeTypeLabels,
  nodeTypeColors,
  type GraphStats
} from '@/services/knowledge-graph.service'
import { assessRisksForGraph } from '@/services/risk.service'
import {
  searchSimilarSchemes as _searchSimilarSchemes,
  recommendOptimalScheme as _recommendOptimalScheme
} from '@/services/similarity.service'
import { generateStrategiesForScheme } from '@/services/maintenance.service'
import { predictEfficiencyForScheme } from '@/services/prediction.service'

export const useKnowledgeGraphStore = defineStore('knowledgeGraph', () => {
  const schemeStore = useSchemeStore()

  const graph = ref<KnowledgeGraph>({ nodes: [], relations: [] })
  const selectedNodeId = ref<string | null>(null)
  const highlightedRelations = ref<string[]>([])

  const highRiskNodes = computed(() => {
    return graph.value.nodes.filter(n => n.riskLevel === 'high')
  })

  const mediumRiskNodes = computed(() => {
    return graph.value.nodes.filter(n => n.riskLevel === 'medium')
  })

  const stats = computed<GraphStats>(() => getGraphStats(graph.value))

  function buildGraph(): KnowledgeGraph {
    graph.value = buildKnowledgeGraph(schemeStore.schemes)
    return graph.value
  }

  function assessRisks(schemeId?: string): RiskAssessment[] {
    return assessRisksForGraph(graph.value, schemeId)
  }

  function searchSimilarSchemes(
    criteria: SimilarSchemeSearchCriteria,
    targetSchemeId?: string
  ): SchemeRecommendation[] {
    return _searchSimilarSchemes(schemeStore.schemes, criteria, targetSchemeId)
  }

  function recommendOptimalScheme(
    criteria?: SimilarSchemeSearchCriteria
  ): SchemeRecommendation | null {
    return _recommendOptimalScheme(schemeStore.schemes, criteria)
  }

  function generateMaintenanceStrategies(schemeId: string): MaintenanceStrategy[] {
    const scheme = schemeStore.schemes.find(s => s.id === schemeId)
    if (!scheme) return []
    return generateStrategiesForScheme(scheme)
  }

  function predictEfficiency(schemeId: string): EfficiencyPrediction | null {
    const scheme = schemeStore.schemes.find(s => s.id === schemeId)
    if (!scheme) return null
    return predictEfficiencyForScheme(scheme)
  }

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
    return _getNodeById(graph.value, id)
  }

  function getRelatedNodes(nodeId: string): KnowledgeNode[] {
    return _getRelatedNodes(graph.value, nodeId)
  }

  function getGraphForECharts(schemeId?: string) {
    return convertGraphToECharts(
      graph.value,
      highlightedRelations.value,
      schemeId
    )
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
