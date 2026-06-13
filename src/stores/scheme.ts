import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  RecoveryScheme,
  ComponentConfig,
  RopeConfig,
  BucketConfig,
  TrialRound,
  SchemeImportResult,
  TrialTemplate,
  TemplateImportResult
} from '@/types'
import {
  calcSchemeStats,
  calcGlobalAbnormalStats,
  calcGlobalCumulativeWear,
  calcTemplateComparisonDetail,
  calcTemplateListForCompare,
  type SchemeStatSummary,
  type GlobalAbnormalStats,
  type GlobalCumulativeWearData,
  type TemplateComparisonDetail
} from '@/services/statistics.service'
import {
  exportTraceableDetailsAsCsv,
  triggerCsvDownload
} from '@/services/export.service'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function createEmptyScheme(name: string): RecoveryScheme {
  const now = Date.now()
  return {
    id: generateId(),
    name,
    description: '',
    wellConfig: null,
    components: [],
    ropes: [],
    buckets: [],
    totalRounds: 10,
    completedRounds: 0,
    trials: [],
    assemblyComplete: false,
    createdAt: now,
    updatedAt: now,
    abnormalRules: {
      timeoutThreshold: 120,
      highLeakageThreshold: 30,
      wearSpikeThreshold: 3
    }
  }
}

export const useSchemeStore = defineStore('scheme', () => {
  const schemes = ref<RecoveryScheme[]>([])
  const currentSchemeId = ref<string | null>(null)
  const templates = ref<TrialTemplate[]>([])

  const currentScheme = computed(() => {
    return schemes.value.find(s => s.id === currentSchemeId.value) || null
  })

  const schemeList = computed(() => {
    return schemes.value.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      totalRounds: s.totalRounds,
      completedRounds: s.completedRounds,
      componentCount: s.components.length,
      hasTrials: s.trials.length > 0,
      assemblyComplete: s.assemblyComplete,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }))
  })

  function setCurrentScheme(id: string | null) {
    currentSchemeId.value = id
  }

  function createScheme(name: string): string {
    const scheme = createEmptyScheme(name)
    schemes.value.push(scheme)
    return scheme.id
  }

  function deleteScheme(id: string): boolean {
    const idx = schemes.value.findIndex(s => s.id === id)
    if (idx === -1) return false
    schemes.value.splice(idx, 1)
    if (currentSchemeId.value === id) {
      currentSchemeId.value = null
    }
    return true
  }

  function schemeHasTrials(id: string): boolean {
    const scheme = schemes.value.find(s => s.id === id)
    return scheme ? scheme.trials.length > 0 : false
  }

  function updateSchemeMeta(id: string, name: string, description: string, totalRounds: number) {
    const scheme = schemes.value.find(s => s.id === id)
    if (!scheme) return
    scheme.name = name
    scheme.description = description
    if (totalRounds > 0 && totalRounds >= scheme.completedRounds) {
      scheme.totalRounds = totalRounds
    }
    scheme.updatedAt = Date.now()
  }

  function updateWellConfig(id: string, config: RecoveryScheme['wellConfig']) {
    const scheme = schemes.value.find(s => s.id === id)
    if (!scheme) return
    scheme.wellConfig = config
    scheme.updatedAt = Date.now()
    checkAssemblyComplete(id)
  }

  function isComponentNoDuplicate(schemeId: string, componentNo: string, excludeId?: string): boolean {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return false
    return scheme.components.some(c => c.componentNo === componentNo && c.id !== excludeId)
  }

  function isRopeNoDuplicate(schemeId: string, ropeNo: string, excludeId?: string): boolean {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return false
    return scheme.ropes.some(r => r.ropeNo === ropeNo && r.id !== excludeId)
  }

  function isBucketNoDuplicate(schemeId: string, bucketNo: string, excludeId?: string): boolean {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return false
    return scheme.buckets.some(b => b.bucketNo === bucketNo && b.id !== excludeId)
  }

  function addComponent(schemeId: string, component: Omit<ComponentConfig, 'id'>) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    scheme.components.push({ ...component, id: generateId() })
    scheme.updatedAt = Date.now()
    checkAssemblyComplete(schemeId)
  }

  function updateComponent(schemeId: string, id: string, data: Partial<ComponentConfig>) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const comp = scheme.components.find(c => c.id === id)
    if (!comp) return
    Object.assign(comp, data)
    scheme.updatedAt = Date.now()
  }

  function removeComponent(schemeId: string, id: string) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const idx = scheme.components.findIndex(c => c.id === id)
    if (idx !== -1) {
      scheme.components.splice(idx, 1)
      scheme.updatedAt = Date.now()
      checkAssemblyComplete(schemeId)
    }
  }

  function addRope(schemeId: string, rope: Omit<RopeConfig, 'id'>) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    scheme.ropes.push({ ...rope, id: generateId() })
    scheme.updatedAt = Date.now()
    checkAssemblyComplete(schemeId)
  }

  function updateRope(schemeId: string, id: string, data: Partial<RopeConfig>) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const rope = scheme.ropes.find(r => r.id === id)
    if (!rope) return
    Object.assign(rope, data)
    scheme.updatedAt = Date.now()
  }

  function removeRope(schemeId: string, id: string) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const idx = scheme.ropes.findIndex(r => r.id === id)
    if (idx !== -1) {
      scheme.ropes.splice(idx, 1)
      scheme.updatedAt = Date.now()
      checkAssemblyComplete(schemeId)
    }
  }

  function addBucket(schemeId: string, bucket: Omit<BucketConfig, 'id'>) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    scheme.buckets.push({ ...bucket, id: generateId() })
    scheme.updatedAt = Date.now()
    checkAssemblyComplete(schemeId)
  }

  function updateBucket(schemeId: string, id: string, data: Partial<BucketConfig>) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const bucket = scheme.buckets.find(b => b.id === id)
    if (!bucket) return
    Object.assign(bucket, data)
    scheme.updatedAt = Date.now()
  }

  function removeBucket(schemeId: string, id: string) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const idx = scheme.buckets.findIndex(b => b.id === id)
    if (idx !== -1) {
      scheme.buckets.splice(idx, 1)
      scheme.updatedAt = Date.now()
      checkAssemblyComplete(schemeId)
    }
  }

  function checkAssemblyComplete(schemeId: string) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const hasWell = !!scheme.wellConfig
    const hasComponents = scheme.components.length > 0
    const hasRope = scheme.ropes.length > 0
    const hasBucket = scheme.buckets.length > 0
    scheme.assemblyComplete = hasWell && hasComponents && hasRope && hasBucket
  }

  function canStartTrials(schemeId: string): boolean {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return false
    return scheme.assemblyComplete
  }

  function isValidTimeCost(value: number): boolean {
    return typeof value === 'number' && value >= 0 && !isNaN(value)
  }

  function isValidLeakageRate(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100 && !isNaN(value)
  }

  function addTrial(schemeId: string, trial: Omit<TrialRound, 'createdAt' | 'roundNo'> & { roundNo?: number }): { success: boolean; error?: string } {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return { success: false, error: '方案不存在' }
    if (!scheme.assemblyComplete) return { success: false, error: '构件未完整装配，不能开始汲水试验' }
    if (scheme.completedRounds >= scheme.totalRounds) return { success: false, error: '已达到总试验轮次' }
    if (!isValidTimeCost(trial.timeCost)) return { success: false, error: '提水耗时不能小于 0' }
    if (!isValidLeakageRate(trial.leakageRate)) return { success: false, error: '漏水率必须在 0-100 范围内' }

    const roundNo = scheme.trials.length + 1
    const newTrial: TrialRound = {
      ...trial,
      ropeId: trial.ropeId ?? scheme.ropes[0]?.id ?? null,
      bucketId: trial.bucketId ?? scheme.buckets[0]?.id ?? null,
      abnormalType: trial.abnormalType ?? 'none',
      abnormalReason: trial.abnormalReason ?? '',
      reviewStatus: trial.reviewStatus ?? 'pending',
      roundNo,
      createdAt: Date.now()
    }
    scheme.trials.push(newTrial)
    scheme.completedRounds = scheme.trials.length
    scheme.updatedAt = Date.now()
    return { success: true }
  }

  function updateTrial(schemeId: string, roundNo: number, data: Partial<TrialRound>): { success: boolean; error?: string } {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return { success: false, error: '方案不存在' }
    const trial = scheme.trials.find(t => t.roundNo === roundNo)
    if (!trial) return { success: false, error: '该轮次记录不存在' }
    if (data.timeCost !== undefined && !isValidTimeCost(data.timeCost)) {
      return { success: false, error: '提水耗时不能小于 0' }
    }
    if (data.leakageRate !== undefined && !isValidLeakageRate(data.leakageRate)) {
      return { success: false, error: '漏水率必须在 0-100 范围内' }
    }
    Object.assign(trial, data)
    scheme.updatedAt = Date.now()
    return { success: true }
  }

  function removeTrial(schemeId: string, roundNo: number) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const idx = scheme.trials.findIndex(t => t.roundNo === roundNo)
    if (idx !== -1) {
      scheme.trials.splice(idx, 1)
      scheme.trials.forEach((t, i) => { t.roundNo = i + 1 })
      scheme.completedRounds = scheme.trials.length
      scheme.updatedAt = Date.now()
    }
  }

  function getVisibleTrials(schemeId: string): TrialRound[] {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return []
    return scheme.trials.filter(t => !t.hidden)
  }

  function exportSchemes(ids: string[]): RecoveryScheme[] {
    return schemes.value.filter(s => ids.includes(s.id))
  }

  function validateSchemeData(data: any): data is RecoveryScheme {
    if (!data || typeof data !== 'object') return false
    if (typeof data.id !== 'string' || typeof data.name !== 'string') return false
    if (!Array.isArray(data.components) || !Array.isArray(data.ropes) || !Array.isArray(data.buckets)) return false
    if (!Array.isArray(data.trials)) return false
    if (typeof data.totalRounds !== 'number' || typeof data.completedRounds !== 'number') return false
    return true
  }

  function importSchemes(jsonData: string, overwrite: boolean = false): SchemeImportResult {
    try {
      const parsed = JSON.parse(jsonData)
      let incoming: any[] = []
      if (Array.isArray(parsed)) {
        incoming = parsed
      } else if (validateSchemeData(parsed)) {
          incoming = [parsed]
      } else {
        return { success: false, schemes: [], error: '数据格式无效：不是有效的方案文件' }
      }

      const validSchemes: RecoveryScheme[] = []
      for (const item of incoming) {
        if (validateSchemeData(item)) {
          validSchemes.push(item as RecoveryScheme)
        }
      }

      if (validSchemes.length === 0) {
        return { success: false, schemes: [], error: '没有有效的方案数据可导入' }
      }

      if (!overwrite) {
        validSchemes.forEach(s => {
          s.id = generateId()
          s.createdAt = Date.now()
          s.updatedAt = Date.now()
          schemes.value.push(s)
        })
      } else {
        validSchemes.forEach(s => {
          const existingIdx = schemes.value.findIndex(x => x.name === s.name)
          if (existingIdx !== -1) {
            schemes.value[existingIdx] = { ...s, updatedAt: Date.now() }
          } else {
            schemes.value.push({ ...s, createdAt: Date.now(), updatedAt: Date.now() })
          }
        })
      }

      return { success: true, schemes: validSchemes }
    } catch (e) {
      return { success: false, schemes: [], error: '解析失败：JSON 格式不正确' }
    }
  }

  function getSchemeStats(schemeId: string): SchemeStatSummary | null {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return null
    return calcSchemeStats(scheme)
  }

  function getGlobalAbnormalStats(): GlobalAbnormalStats {
    return calcGlobalAbnormalStats(schemes.value)
  }

  function getGlobalCumulativeWear(): GlobalCumulativeWearData | null {
    return calcGlobalCumulativeWear(schemes.value)
  }

  function getTemplateComparisonDetail(templateIds: string[]): TemplateComparisonDetail[] {
    return calcTemplateComparisonDetail(templates.value, schemes.value, templateIds)
  }

  function exportTraceableDetails(): string {
    return exportTraceableDetailsAsCsv(schemes.value)
  }

  function exportTraceableDetailsAndDownload(): void {
    const csv = exportTraceableDetailsAsCsv(schemes.value)
    if (!csv || csv.split('\n').length <= 1) {
      return
    }
    triggerCsvDownload(csv, `可追溯试验明细_${Date.now()}.csv`)
  }

  function createTemplate(name: string, baseSchemeId?: string): string {
    const baseScheme = baseSchemeId ? schemes.value.find(s => s.id === baseSchemeId) : undefined
    const now = Date.now()
    const tpl: TrialTemplate = {
      id: generateId(),
      name,
      description: baseScheme?.description || '',
      wellConfig: baseScheme?.wellConfig || null,
      components: baseScheme?.components.map(c => {
        const { id: any, ...rest } = c
        return rest
      }) || [],
      ropes: baseScheme?.ropes.map(r => {
        const { id: any, ...rest } = r
        return rest
      }) || [],
      buckets: baseScheme?.buckets.map(b => {
        const { id: any, ...rest } = b
        return rest
      }) || [],
      totalRounds: baseScheme?.totalRounds || 10,
      abnormalRules: baseScheme?.abnormalRules || {
        timeoutThreshold: 120,
        highLeakageThreshold: 30,
        wearSpikeThreshold: 3
      },
      tag: '',
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    }
    templates.value.push(tpl)
    return tpl.id
  }

  function deleteTemplate(id: string): boolean {
    const idx = templates.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    templates.value.splice(idx, 1)
    return true
  }

  function updateTemplate(id: string, data: Partial<TrialTemplate>) {
    const tpl = templates.value.find(t => t.id === id)
    if (!tpl) return
    Object.assign(tpl, data)
    tpl.updatedAt = Date.now()
  }

  function createSchemeFromTemplate(templateId: string, schemeName: string): string | null {
    const tpl = templates.value.find(t => t.id === templateId)
    if (!tpl) return null
    const schemeId = createScheme(schemeName)
    updateWellConfig(schemeId, tpl.wellConfig)
    tpl.components.forEach(c => addComponent(schemeId, c))
    tpl.ropes.forEach(r => addRope(schemeId, r))
    tpl.buckets.forEach(b => addBucket(schemeId, b))
    updateSchemeMeta(schemeId, schemeName, tpl.description || '', tpl.totalRounds)
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (scheme) {
      scheme.templateId = tpl.id
      scheme.abnormalRules = { ...tpl.abnormalRules }
    }
    tpl.usageCount = (tpl.usageCount || 0) + 1
    tpl.updatedAt = Date.now()
    return schemeId
  }

  function validateTemplateData(data: any): data is TrialTemplate {
    if (!data || typeof data !== 'object') return false
    if (typeof data.id !== 'string' || typeof data.name !== 'string') return false
    if (!Array.isArray(data.components) || !Array.isArray(data.ropes) || !Array.isArray(data.buckets)) return false
    return true
  }

  function importTemplates(jsonData: string, overwrite: boolean = false): TemplateImportResult {
    try {
      const parsed = JSON.parse(jsonData)
      let incoming: any[] = []
      if (Array.isArray(parsed)) {
        incoming = parsed
      } else if (validateTemplateData(parsed)) {
        incoming = [parsed]
      } else {
        return { success: false, templates: [], error: '数据格式无效：不是有效的模板文件' }
      }
      const validTpls: TrialTemplate[] = []
      for (const item of incoming) {
        if (validateTemplateData(item)) validTpls.push(item as TrialTemplate)
      }
      if (validTpls.length === 0) return { success: false, templates: [], error: '没有有效的模板数据可导入' }
      if (!overwrite) {
        validTpls.forEach(t => {
          t.id = generateId()
          t.createdAt = Date.now()
          t.updatedAt = Date.now()
          templates.value.push(t)
        })
      } else {
          validTpls.forEach(t => {
            const existingIdx = templates.value.findIndex(x => x.name === t.name)
            if (existingIdx !== -1) {
              templates.value[existingIdx] = { ...t, updatedAt: Date.now() }
            } else {
              templates.value.push({ ...t, createdAt: Date.now(), updatedAt: Date.now() })
            }
          })
        }
      return { success: true, templates: validTpls }
    } catch (e) {
      return { success: false, templates: [], error: '解析失败：JSON 格式不正确' }
    }
  }

  return {
    schemes,
    templates,
    currentSchemeId,
    currentScheme,
    schemeList,
    setCurrentScheme,
    createScheme,
    deleteScheme,
    schemeHasTrials,
    updateSchemeMeta,
    updateWellConfig,
    isComponentNoDuplicate,
    isRopeNoDuplicate,
    isBucketNoDuplicate,
    addComponent,
    updateComponent,
    removeComponent,
    addRope,
    updateRope,
    removeRope,
    addBucket,
    updateBucket,
    removeBucket,
    canStartTrials,
    isValidTimeCost,
    isValidLeakageRate,
    addTrial,
    updateTrial,
    removeTrial,
    getVisibleTrials,
    exportSchemes,
    importSchemes,
    validateSchemeData,
    getSchemeStats,
    getGlobalAbnormalStats,
    getGlobalCumulativeWear,
    getTemplateComparisonDetail,
    exportTraceableDetails,
    exportTraceableDetailsAndDownload,
    createTemplate,
    deleteTemplate,
    updateTemplate,
    createSchemeFromTemplate,
    validateTemplateData,
    importTemplates,
    checkAssemblyComplete
  }
})
