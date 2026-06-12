<template>
  <n-card title="风险预警">
    <n-space vertical :size="16" style="width: 100%">
      <n-space :size="12" wrap>
        <n-select
          v-model:value="selectedSchemeId"
          placeholder="全部方案"
          :options="schemeOptions"
          clearable
          style="width: 200px"
        />
        <n-select
          v-model:value="selectedRiskLevel"
          placeholder="全部风险等级"
          :options="riskLevelOptions"
          clearable
          style="width: 160px"
        />
      </n-space>

      <n-grid :cols="3" :x-gap="12">
        <n-grid-item>
          <n-card size="small" :bordered="false" style="background: rgba(208, 48, 80, 0.08)">
            <n-statistic label="高风险" :value="highRiskCount" value-style="color: #d03050">
              <template #suffix>
                <n-tag type="error" size="small">HIGH</n-tag>
              </template>
            </n-statistic>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" style="background: rgba(240, 160, 32, 0.08)">
            <n-statistic label="中风险" :value="mediumRiskCount" value-style="color: #f0a020">
              <template #suffix>
                <n-tag type="warning" size="small">MEDIUM</n-tag>
              </template>
            </n-statistic>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" style="background: rgba(24, 160, 88, 0.08)">
            <n-statistic label="低风险" :value="lowRiskCount" value-style="color: #18a058">
              <template #suffix>
                <n-tag type="success" size="small">LOW</n-tag>
              </template>
            </n-statistic>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-alert v-if="filteredRisks.length === 0" type="info" :show-icon="true">
        暂无风险预警信息
      </n-alert>

      <n-list
        v-else
        :bordered="true"
        hoverable
        clickable
        style="max-height: 480px; overflow-y: auto"
      >
        <n-list-item
          v-for="risk in filteredRisks"
          :key="risk.patternId"
          @click="handleRiskClick(risk)"
          :style="{
            background: highlightedRiskId === risk.patternId ? 'rgba(32, 128, 240, 0.08)' : undefined,
            borderLeft: highlightedRiskId === risk.patternId ? '3px solid #2080f0' : undefined
          }"
        >
          <n-list-item-meta :title="risk.patternName">
            <template #avatar>
              <n-avatar
                :size="40"
                :style="{ background: getRiskColor(risk.riskLevel) }"
              >
                <template #icon>
                  <warning-icon style="font-size: 20px" />
                </template>
              </n-avatar>
            </template>
            <template #description>
              <n-space vertical :size="8" style="width: 100%">
                <n-space :size="8" wrap>
                  <n-tag :type="getRiskTagType(risk.riskLevel)" size="small">
                    {{ getRiskLabel(risk.riskLevel) }}
                  </n-tag>
                  <n-tag size="small" type="info">
                    置信度: {{ risk.confidence }}%
                  </n-tag>
                  <n-tag v-if="risk.matchedNodes.length > 0" size="small">
                    关联节点: {{ risk.matchedNodes.length }}
                  </n-tag>
                </n-space>
                <n-text depth="3" style="font-size: 13px; line-height: 1.5">
                  {{ risk.description }}
                </n-text>
                <n-space vertical :size="4" style="width: 100%">
                  <n-text type="success" style="font-size: 12px; font-weight: 500">
                    💡 建议:
                  </n-text>
                  <n-text depth="2" style="font-size: 12px; line-height: 1.5">
                    {{ risk.suggestion }}
                  </n-text>
                </n-space>
              </n-space>
            </template>
          </n-list-item-meta>
          <template #action>
            <n-space :size="8">
              <n-button
                size="small"
                type="primary"
                @click.stop="handleConfirm(risk)"
              >
                确认
              </n-button>
              <n-button
                size="small"
                @click.stop="handleIgnore(risk)"
              >
                忽略
              </n-button>
            </n-space>
          </template>
        </n-list-item>
      </n-list>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { Warning as WarningIcon } from '@vicons/ionicons5'
import { useKnowledgeGraphStore } from '@/stores/knowledgeGraph'
import { useSchemeStore } from '@/stores/scheme'
import type { RiskAssessment } from '@/types'

const knowledgeGraphStore = useKnowledgeGraphStore()
const schemeStore = useSchemeStore()
const message = useMessage()

const selectedSchemeId = ref<string | null>(null)
const selectedRiskLevel = ref<string | null>(null)
const highlightedRiskId = ref<string | null>(null)
const ignoredRisks = ref<Set<string>>(new Set())

const schemeOptions = computed(() =>
  schemeStore.schemes.map(s => ({
    label: s.name,
    value: s.id
  }))
)

const riskLevelOptions = [
  { label: '高风险', value: 'high' },
  { label: '中风险', value: 'medium' },
  { label: '低风险', value: 'low' }
]

const allRisks = computed(() => {
  const risks = knowledgeGraphStore.assessRisks(selectedSchemeId.value || undefined)
  return risks.filter(r => !ignoredRisks.value.has(r.patternId))
})

const filteredRisks = computed(() => {
  if (!selectedRiskLevel.value) return allRisks.value
  return allRisks.value.filter(r => r.riskLevel === selectedRiskLevel.value)
})

const highRiskCount = computed(() =>
  allRisks.value.filter(r => r.riskLevel === 'high').length
)

const mediumRiskCount = computed(() =>
  allRisks.value.filter(r => r.riskLevel === 'medium').length
)

const lowRiskCount = computed(() =>
  allRisks.value.filter(r => r.riskLevel === 'low').length
)

function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    high: '#d03050',
    medium: '#f0a020',
    low: '#18a058'
  }
  return colors[level] || '#999'
}

function getRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险'
  }
  return labels[level] || '未知'
}

function getRiskTagType(level: string): 'error' | 'warning' | 'success' {
  const types: Record<string, 'error' | 'warning' | 'success'> = {
    high: 'error',
    medium: 'warning',
    low: 'success'
  }
  return types[level] || 'default'
}

function handleRiskClick(risk: RiskAssessment) {
  highlightedRiskId.value = risk.patternId
  if (risk.matchedNodes.length > 0) {
    knowledgeGraphStore.selectNode(risk.matchedNodes[0])
    const relatedIds = new Set(risk.matchedNodes)
    risk.matchedNodes.forEach(nodeId => {
      knowledgeGraphStore.getRelatedNodes(nodeId).forEach(n => relatedIds.add(n.id))
    })
    message.info(`已高亮 ${relatedIds.size} 个关联节点`)
  }
}

function handleConfirm(risk: RiskAssessment) {
  message.success(`已确认风险: ${risk.patternName}`)
  console.log('Confirmed risk:', risk)
}

function handleIgnore(risk: RiskAssessment) {
  ignoredRisks.value.add(risk.patternId)
  message.info(`已忽略风险: ${risk.patternName}`)
}
</script>
