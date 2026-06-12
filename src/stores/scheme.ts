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
  TemplateImportResult,
  AbnormalType,
  AbnormalRuleConfig,
  ReviewStatus,
  TemplateFilterCriteria,
  TraceableTrialDetail,
  EnvHumanFilterCriteria,
  WeatherType,
  WindLevel,
  OperatorRole,
  LiftingPosture
} from '@/types'
import {
  DEFAULT_ABNORMAL_RULES,
  ABNORMAL_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  WEATHER_OPTIONS,
  WIND_LEVEL_OPTIONS,
  OPERATOR_ROLE_OPTIONS,
  LIFTING_POSTURE_OPTIONS
} from '@/types'

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
    abnormalRules: { ...DEFAULT_ABNORMAL_RULES }
  }
}

function createEmptyTemplate(name: string): TrialTemplate {
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
    abnormalRules: { ...DEFAULT_ABNORMAL_RULES },
    tag: '',
    createdAt: now,
    updatedAt: now,
    usageCount: 0
  }
}

export const useSchemeStore = defineStore('scheme', () => {
  const schemes = ref<RecoveryScheme[]>([])
  const templates = ref<TrialTemplate[]>([])
  const currentSchemeId = ref<string | null>(null)

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
      updatedAt: s.updatedAt,
      templateId: s.templateId,
      pendingReviewCount: s.trials.filter(t => t.reviewStatus === 'pending' && t.abnormalType !== 'none').length
    }))
  })

  const templateList = computed(() => {
    return templates.value.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      tag: t.tag,
      componentCount: t.components.length,
      ropeCount: t.ropes.length,
      bucketCount: t.buckets.length,
      hasWellConfig: !!t.wellConfig,
      totalRounds: t.totalRounds,
      usageCount: t.usageCount,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
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

  function detectAbnormal(
    trial: Omit<TrialRound, 'createdAt' | 'roundNo'>,
    rules: AbnormalRuleConfig,
    prevTrials: TrialRound[]
  ): { type: AbnormalType; reason: string } {
    const reasons: string[] = []

    if (trial.timeCost > rules.timeoutThreshold) {
      reasons.push(`提水耗时 ${trial.timeCost}s 超过阈值 ${rules.timeoutThreshold}s`)
    }

    if (trial.leakageRate > rules.highLeakageThreshold) {
      reasons.push(`漏水率 ${trial.leakageRate}% 超过阈值 ${rules.highLeakageThreshold}%`)
    }

    if (prevTrials.length > 0) {
      const avgPrevRopeWear = prevTrials.reduce((sum, t) => sum + t.ropeWear, 0) / prevTrials.length
      const avgPrevBucketWear = prevTrials.reduce((sum, t) => sum + t.bucketWear, 0) / prevTrials.length
      const compIds = Object.keys(trial.componentWear)
      let avgPrevCompWear = 0
      if (compIds.length > 0) {
        const totalCompWear = prevTrials.reduce((sum, t) => {
          const vals = Object.values(t.componentWear)
          return sum + (vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0)
        }, 0)
        avgPrevCompWear = totalCompWear / prevTrials.length
      }
      const currentAvgCompWear = compIds.length > 0
        ? Object.values(trial.componentWear).reduce((a, b) => a + b, 0) / compIds.length
        : 0

      const ropeWearIncrease = trial.ropeWear - avgPrevRopeWear
      const bucketWearIncrease = trial.bucketWear - avgPrevBucketWear
      const compWearIncrease = currentAvgCompWear - avgPrevCompWear

      if (ropeWearIncrease > rules.wearSpikeThreshold ||
          bucketWearIncrease > rules.wearSpikeThreshold ||
          compWearIncrease > rules.wearSpikeThreshold) {
        reasons.push(`磨损突增超过阈值 ${rules.wearSpikeThreshold} 级`)
      }
    }

    if (reasons.length === 0) {
      return { type: 'none', reason: '' }
    }

    let type: AbnormalType = 'none'
    if (trial.timeCost > rules.timeoutThreshold &&
        trial.leakageRate > rules.highLeakageThreshold) {
      type = 'highLeakage'
    } else if (trial.timeCost > rules.timeoutThreshold) {
      type = 'timeout'
    } else if (trial.leakageRate > rules.highLeakageThreshold) {
      type = 'highLeakage'
    } else {
      type = 'wearSpike'
    }

    return { type, reason: reasons.join('；') }
  }

  function addTrial(schemeId: string, trial: Omit<TrialRound, 'createdAt'>): { success: boolean; error?: string } {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return { success: false, error: '方案不存在' }
    if (!scheme.assemblyComplete) return { success: false, error: '构件未完整装配，不能开始汲水试验' }
    if (scheme.completedRounds >= scheme.totalRounds) return { success: false, error: '已达到总试验轮次' }
    if (!isValidTimeCost(trial.timeCost)) return { success: false, error: '提水耗时不能小于 0' }
    if (!isValidLeakageRate(trial.leakageRate)) return { success: false, error: '漏水率必须在 0-100 范围内' }

    const prevTrials = scheme.trials.filter(t => t.reviewStatus === 'approved' || t.reviewStatus === 'pending')
    const abnormalResult = detectAbnormal(trial, scheme.abnormalRules, prevTrials)

    const roundNo = scheme.trials.length + 1
    const newTrial: TrialRound = {
      ...trial,
      roundNo,
      abnormalType: abnormalResult.type,
      abnormalReason: abnormalResult.reason,
      reviewStatus: abnormalResult.type === 'none' ? 'approved' : 'pending',
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

    const prevTrials = scheme.trials.filter(t => t.roundNo !== roundNo && (t.reviewStatus === 'approved' || t.reviewStatus === 'pending'))
    const { roundNo: _rn, createdAt: _ct, ...mergedWithoutMeta } = { ...trial, ...data }
    const abnormalResult = detectAbnormal(
      mergedWithoutMeta,
      scheme.abnormalRules,
      prevTrials
    )

    const finalData: Partial<TrialRound> = {
      ...data,
      abnormalType: abnormalResult.type,
      abnormalReason: abnormalResult.reason,
      reviewStatus: abnormalResult.type === 'none' ? 'approved' : (data.reviewStatus || 'pending')
    }

    Object.assign(trial, finalData)
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

  function getApprovedTrials(schemeId: string): TrialRound[] {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return []
    return scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
  }

  function getPendingReviewTrials(schemeId: string): TrialRound[] {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return []
    return scheme.trials.filter(t => t.reviewStatus === 'pending' && t.abnormalType !== 'none')
  }

  function getAllPendingReviews(): Array<{ schemeId: string; schemeName: string; trial: TrialRound }> {
    const result: Array<{ schemeId: string; schemeName: string; trial: TrialRound }> = []
    schemes.value.forEach(s => {
      s.trials.forEach(t => {
        if (t.reviewStatus === 'pending' && t.abnormalType !== 'none') {
          result.push({ schemeId: s.id, schemeName: s.name, trial: t })
        }
      })
    })
    return result
  }

  function reviewTrial(schemeId: string, roundNo: number, status: ReviewStatus, reviewer: string, comment: string): boolean {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return false
    const trial = scheme.trials.find(t => t.roundNo === roundNo)
    if (!trial) return false
    trial.reviewStatus = status
    trial.reviewer = reviewer
    trial.reviewComment = comment
    trial.reviewedAt = Date.now()
    scheme.updatedAt = Date.now()
    return true
  }

  function getRopeById(schemeId: string, ropeId: string): RopeConfig | undefined {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return undefined
    return scheme.ropes.find(r => r.id === ropeId)
  }

  function getBucketById(schemeId: string, bucketId: string): BucketConfig | undefined {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return undefined
    return scheme.buckets.find(b => b.id === bucketId)
  }

  function updateAbnormalRules(schemeId: string, rules: AbnormalRuleConfig) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    scheme.abnormalRules = { ...rules }
    scheme.trials.forEach(trial => {
      const prevTrials = scheme!.trials.filter(
        t => t.roundNo < trial.roundNo && (t.reviewStatus === 'approved' || t.reviewStatus === 'pending')
      )
      const { roundNo: _rn2, createdAt: _ct2, ...trialWithoutMeta } = trial
      const abnormalResult = detectAbnormal(
        trialWithoutMeta,
        rules,
        prevTrials
      )
      trial.abnormalType = abnormalResult.type
      trial.abnormalReason = abnormalResult.reason
      if (trial.reviewStatus === 'pending' && abnormalResult.type === 'none') {
        trial.reviewStatus = 'approved'
      }
    })
    scheme.updatedAt = Date.now()
  }

  function exportSchemes(ids: string[]): RecoveryScheme[] {
    return schemes.value.filter(s => ids.includes(s.id))
  }

  function validateComponent(c: any): boolean {
    if (!c || typeof c !== 'object') return false
    if (typeof c.id !== 'string' || typeof c.componentNo !== 'string' || typeof c.type !== 'string') return false
    if (typeof c.material !== 'string' || typeof c.wearResistance !== 'number') return false
    if (c.diameter !== undefined && typeof c.diameter !== 'number') return false
    if (c.length !== undefined && typeof c.length !== 'number') return false
    if (c.weight !== undefined && typeof c.weight !== 'number') return false
    if (c.notes !== undefined && typeof c.notes !== 'string') return false
    return true
  }

  function validateRope(r: any): boolean {
    if (!r || typeof r !== 'object') return false
    if (typeof r.id !== 'string' || typeof r.ropeNo !== 'string' || typeof r.material !== 'string') return false
    if (typeof r.diameter !== 'number' || typeof r.length !== 'number') return false
    if (typeof r.breakingStrength !== 'number' || typeof r.wearResistance !== 'number') return false
    if (r.notes !== undefined && typeof r.notes !== 'string') return false
    return true
  }

  function validateBucket(b: any): boolean {
    if (!b || typeof b !== 'object') return false
    if (typeof b.id !== 'string' || typeof b.bucketNo !== 'string' || typeof b.material !== 'string') return false
    if (typeof b.capacity !== 'number' || typeof b.weight !== 'number') return false
    if (typeof b.wearResistance !== 'number') return false
    if (b.wallThickness !== undefined && typeof b.wallThickness !== 'number') return false
    if (b.notes !== undefined && typeof b.notes !== 'string') return false
    return true
  }

  function validateWellConfig(w: any): boolean {
    if (w === null) return true
    if (!w || typeof w !== 'object') return false
    if (typeof w.type !== 'string') return false
    if (typeof w.depth !== 'number' || typeof w.diameter !== 'number' || typeof w.waterLevel !== 'number') return false
    if (w.wallMaterial !== undefined && typeof w.wallMaterial !== 'string') return false
    return true
  }

  function validateTrial(t: any): boolean {
    if (!t || typeof t !== 'object') return false
    if (typeof t.roundNo !== 'number' || typeof t.hidden !== 'boolean') return false
    if (typeof t.timeCost !== 'number' || t.timeCost < 0 || isNaN(t.timeCost)) return false
    if (typeof t.leakageRate !== 'number' || t.leakageRate < 0 || t.leakageRate > 100 || isNaN(t.leakageRate)) return false
    if (!t.componentWear || typeof t.componentWear !== 'object' || Array.isArray(t.componentWear)) return false
    for (const k of Object.keys(t.componentWear)) {
      if (typeof t.componentWear[k] !== 'number') return false
    }
    if (typeof t.ropeWear !== 'number' || typeof t.bucketWear !== 'number') return false
    if (typeof t.createdAt !== 'number') return false
    if (t.notes !== undefined && typeof t.notes !== 'string') return false
    return true
  }

  function validateSchemeData(data: any): data is RecoveryScheme {
    if (!data || typeof data !== 'object') return false
    if (typeof data.id !== 'string' || typeof data.name !== 'string') return false
    if (data.name.trim().length === 0) return false
    if (data.description !== undefined && typeof data.description !== 'string') return false
    if (!validateWellConfig(data.wellConfig)) return false
    if (!Array.isArray(data.components) || !Array.isArray(data.ropes) || !Array.isArray(data.buckets)) return false
    if (!Array.isArray(data.trials)) return false
    if (typeof data.totalRounds !== 'number' || typeof data.completedRounds !== 'number') return false
    if (data.totalRounds < 0 || data.completedRounds < 0) return false
    if (typeof data.assemblyComplete !== 'boolean') return false
    if (typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') return false
    if (!data.components.every(validateComponent)) return false
    if (!data.ropes.every(validateRope)) return false
    if (!data.buckets.every(validateBucket)) return false
    if (!data.trials.every(validateTrial)) return false
    const compNos = data.components.map((c: any) => c.componentNo)
    if (new Set(compNos).size !== compNos.length) return false
    const ropeNos = data.ropes.map((r: any) => r.ropeNo)
    if (new Set(ropeNos).size !== ropeNos.length) return false
    const bucketNos = data.buckets.map((b: any) => b.bucketNo)
    if (new Set(bucketNos).size !== bucketNos.length) return false
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

  function createTemplate(name: string): string {
    const template = createEmptyTemplate(name)
    templates.value.push(template)
    return template.id
  }

  function saveSchemeAsTemplate(schemeId: string, templateName: string, description: string, tag: string): string | null {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return null

    const components = scheme.components.map(c => {
      const { id, ...rest } = c
      return rest
    })
    const ropes = scheme.ropes.map(r => {
      const { id, ...rest } = r
      return rest
    })
    const buckets = scheme.buckets.map(b => {
      const { id, ...rest } = b
      return rest
    })

    const template: TrialTemplate = {
      id: generateId(),
      name: templateName,
      description,
      wellConfig: scheme.wellConfig ? { ...scheme.wellConfig } : null,
      components,
      ropes,
      buckets,
      totalRounds: scheme.totalRounds,
      abnormalRules: { ...scheme.abnormalRules },
      tag,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    }

    templates.value.push(template)
    return template.id
  }

  function createSchemeFromTemplate(templateId: string, schemeName: string): string | null {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return null

    const scheme = createEmptyScheme(schemeName)
    scheme.description = template.description || ''
    scheme.wellConfig = template.wellConfig ? { ...template.wellConfig } : null
    scheme.components = template.components.map(c => ({ ...c, id: generateId() }))
    scheme.ropes = template.ropes.map(r => ({ ...r, id: generateId() }))
    scheme.buckets = template.buckets.map(b => ({ ...b, id: generateId() }))
    scheme.totalRounds = template.totalRounds
    scheme.abnormalRules = { ...template.abnormalRules }
    scheme.templateId = template.id
    scheme.assemblyComplete = !!scheme.wellConfig &&
      scheme.components.length > 0 &&
      scheme.ropes.length > 0 &&
      scheme.buckets.length > 0

    template.usageCount++
    template.updatedAt = Date.now()

    schemes.value.push(scheme)
    return scheme.id
  }

  function updateTemplateMeta(id: string, name: string, description: string, tag: string, totalRounds: number) {
    const template = templates.value.find(t => t.id === id)
    if (!template) return
    template.name = name
    template.description = description
    template.tag = tag
    template.totalRounds = totalRounds
    template.updatedAt = Date.now()
  }

  function deleteTemplate(id: string): boolean {
    const idx = templates.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    templates.value.splice(idx, 1)
    return true
  }

  function getTemplate(id: string): TrialTemplate | null {
    return templates.value.find(t => t.id === id) || null
  }

  function updateTemplateWellConfig(templateId: string, config: TrialTemplate['wellConfig']) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.wellConfig = config
    template.updatedAt = Date.now()
  }

  function addTemplateComponent(templateId: string, component: Omit<ComponentConfig, 'id'>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.components.push(component)
    template.updatedAt = Date.now()
  }

  function updateTemplateComponent(templateId: string, index: number, data: Partial<Omit<ComponentConfig, 'id'>>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template || !template.components[index]) return
    Object.assign(template.components[index], data)
    template.updatedAt = Date.now()
  }

  function removeTemplateComponent(templateId: string, index: number) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.components.splice(index, 1)
    template.updatedAt = Date.now()
  }

  function addTemplateRope(templateId: string, rope: Omit<RopeConfig, 'id'>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.ropes.push(rope)
    template.updatedAt = Date.now()
  }

  function updateTemplateRope(templateId: string, index: number, data: Partial<Omit<RopeConfig, 'id'>>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template || !template.ropes[index]) return
    Object.assign(template.ropes[index], data)
    template.updatedAt = Date.now()
  }

  function removeTemplateRope(templateId: string, index: number) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.ropes.splice(index, 1)
    template.updatedAt = Date.now()
  }

  function addTemplateBucket(templateId: string, bucket: Omit<BucketConfig, 'id'>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.buckets.push(bucket)
    template.updatedAt = Date.now()
  }

  function updateTemplateBucket(templateId: string, index: number, data: Partial<Omit<BucketConfig, 'id'>>) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template || !template.buckets[index]) return
    Object.assign(template.buckets[index], data)
    template.updatedAt = Date.now()
  }

  function removeTemplateBucket(templateId: string, index: number) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.buckets.splice(index, 1)
    template.updatedAt = Date.now()
  }

  function updateTemplateAbnormalRules(templateId: string, rules: AbnormalRuleConfig) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.abnormalRules = { ...rules }
    template.updatedAt = Date.now()
  }

  function validateTemplateData(data: any): data is TrialTemplate {
    if (!data || typeof data !== 'object') return false
    if (typeof data.id !== 'string' || typeof data.name !== 'string') return false
    if (data.name.trim().length === 0) return false
    if (!validateWellConfig(data.wellConfig)) return false
    if (!Array.isArray(data.components) || !Array.isArray(data.ropes) || !Array.isArray(data.buckets)) return false
    if (typeof data.totalRounds !== 'number') return false
    if (typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') return false
    if (typeof data.usageCount !== 'number') return false
    return true
  }

  function exportTemplates(ids: string[]): TrialTemplate[] {
    return templates.value.filter(t => ids.includes(t.id))
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

      const validTemplates: TrialTemplate[] = []
      for (const item of incoming) {
        if (validateTemplateData(item)) {
          validTemplates.push(item as TrialTemplate)
        }
      }

      if (validTemplates.length === 0) {
        return { success: false, templates: [], error: '没有有效的模板数据可导入' }
      }

      if (!overwrite) {
        validTemplates.forEach(t => {
          t.id = generateId()
          t.createdAt = Date.now()
          t.updatedAt = Date.now()
          t.usageCount = 0
          templates.value.push(t)
        })
      } else {
        validTemplates.forEach(t => {
          const existingIdx = templates.value.findIndex(x => x.name === t.name)
          if (existingIdx !== -1) {
            templates.value[existingIdx] = { ...t, updatedAt: Date.now() }
          } else {
            templates.value.push({ ...t, createdAt: Date.now(), updatedAt: Date.now() })
          }
        })
      }

      return { success: true, templates: validTemplates }
    } catch (e) {
      return { success: false, templates: [], error: '解析失败：JSON 格式不正确' }
    }
  }

  function getSchemeStats(schemeId: string) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return null
    const approvedTrials = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
    if (approvedTrials.length === 0) return null

    const avgTimeCost = approvedTrials.reduce((sum, t) => sum + t.timeCost, 0) / approvedTrials.length
    const avgLeakage = approvedTrials.reduce((sum, t) => sum + t.leakageRate, 0) / approvedTrials.length
    const avgRopeWear = approvedTrials.reduce((sum, t) => sum + t.ropeWear, 0) / approvedTrials.length
    const avgBucketWear = approvedTrials.reduce((sum, t) => sum + t.bucketWear, 0) / approvedTrials.length

    const bucket = scheme.buckets[0]
    const avgEfficiency = bucket ? (bucket.capacity * (1 - avgLeakage / 100)) / avgTimeCost : 0

    const totalTrials = scheme.trials.length
    const abnormalCount = approvedTrials.filter(t => t.abnormalType !== 'none').length
    const pendingCount = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'pending' && t.abnormalType !== 'none').length
    const rejectedCount = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'rejected').length

    return {
      avgTimeCost,
      avgLeakage,
      avgRopeWear,
      avgBucketWear,
      avgEfficiency,
      visibleCount: approvedTrials.length,
      totalTrials,
      abnormalCount,
      pendingCount,
      rejectedCount,
      abnormalRate: approvedTrials.length > 0 ? (abnormalCount / approvedTrials.length) * 100 : 0
    }
  }

  function getCumulativeWear(schemeId: string) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return null
    const approvedTrials = scheme.trials.filter(t => !t.hidden && t.reviewStatus === 'approved')
    if (approvedTrials.length === 0) return null

    const compCumulative: Record<string, number[]> = {}
    scheme.components.forEach(c => { compCumulative[c.id] = [] })

    const ropeCumulative: number[] = []
    const bucketCumulative: number[] = []
    const labels: string[] = []

    let ropeSum = 0
    let bucketSum = 0
    const compSums: Record<string, number> = {}
    scheme.components.forEach(c => { compSums[c.id] = 0 })

    approvedTrials.forEach(t => {
      labels.push(`第${t.roundNo}轮`)
      ropeSum += t.ropeWear
      bucketSum += t.bucketWear
      ropeCumulative.push(Number(ropeSum.toFixed(2)))
      bucketCumulative.push(Number(bucketSum.toFixed(2)))
      scheme.components.forEach(c => {
        compSums[c.id] += t.componentWear[c.id] || 0
        compCumulative[c.id].push(Number(compSums[c.id].toFixed(2)))
      })
    })

    return { labels, compCumulative, ropeCumulative, bucketCumulative }
  }

  function getTemplateComparisonStats(templateIds: string[]) {
    const result: Array<{
      templateId: string
      templateName: string
      schemeCount: number
      avgTrials: number
      avgEfficiency: number
      avgAbnormalRate: number
    }> = []

    templateIds.forEach(tid => {
      const template = templates.value.find(t => t.id === tid)
      if (!template) return

      const relatedSchemes = schemes.value.filter(s => s.templateId === tid)
      if (relatedSchemes.length === 0) {
        result.push({
          templateId: tid,
          templateName: template.name,
          schemeCount: 0,
          avgTrials: 0,
          avgEfficiency: 0,
          avgAbnormalRate: 0
        })
        return
      }

      let totalTrials = 0
      let totalEfficiency = 0
      let totalAbnormalRate = 0
      let validSchemeCount = 0

      relatedSchemes.forEach(s => {
        totalTrials += s.completedRounds
        const stats = getSchemeStats(s.id)
        if (stats) {
          totalEfficiency += stats.avgEfficiency
          totalAbnormalRate += stats.abnormalRate
          validSchemeCount++
        }
      })

      result.push({
        templateId: tid,
        templateName: template.name,
        schemeCount: relatedSchemes.length,
        avgTrials: Number((totalTrials / relatedSchemes.length).toFixed(2)),
        avgEfficiency: validSchemeCount > 0 ? Number((totalEfficiency / validSchemeCount).toFixed(3)) : 0,
        avgAbnormalRate: validSchemeCount > 0 ? Number((totalAbnormalRate / validSchemeCount).toFixed(2)) : 0
      })
    })

    return result
  }

  function exportTrialDetails(schemeId: string): string {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return ''

    const rows: string[] = []
    const headers = [
      '轮次', '提水耗时(秒)', '漏水率(%)', '有效水量(L)', '效率(L/s)',
      '井绳编号', '汲桶编号', '井绳磨损', '汲桶磨损', '平均构件磨损',
      '异常类型', '异常原因', '审查状态', '审查人', '审查意见', '记录时间'
    ]
    rows.push(headers.join(','))

    scheme.trials.forEach(t => {
      const bucket = scheme.buckets[0]
      const effectiveWater = bucket ? bucket.capacity * (1 - t.leakageRate / 100) : 0
      const efficiency = t.timeCost > 0 ? effectiveWater / t.timeCost : 0
      const compVals = Object.values(t.componentWear)
      const avgCompWear = compVals.length > 0
        ? compVals.reduce((a, b) => a + b, 0) / compVals.length
        : 0

      const rope = scheme.ropes.find(r => r.id === t.ropeId)
      const bkt = scheme.buckets.find(b => b.id === t.bucketId)

      const row = [
        t.roundNo,
        t.timeCost,
        t.leakageRate,
        effectiveWater.toFixed(2),
        efficiency.toFixed(3),
        rope?.ropeNo || '-',
        bkt?.bucketNo || '-',
        t.ropeWear,
        t.bucketWear,
        avgCompWear.toFixed(2),
        ABNORMAL_TYPE_LABELS[t.abnormalType],
        t.abnormalReason || '-',
        t.reviewStatus === 'pending' ? '待审查' : t.reviewStatus === 'approved' ? '已通过' : '已驳回',
        t.reviewer || '-',
        t.reviewComment || '-',
        new Date(t.createdAt).toLocaleString('zh-CN')
      ]
      rows.push(row.map(v => `"${v}"`).join(','))
    })

    return '\uFEFF' + rows.join('\n')
  }

  function generateStandardRounds(schemeId: string, roundCount: number, defaultRopeId: string | null, defaultBucketId: string | null): { success: boolean; generated: number; error?: string } {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return { success: false, generated: 0, error: '方案不存在' }
    if (!scheme.assemblyComplete) return { success: false, generated: 0, error: '构件未完整装配' }

    const remaining = scheme.totalRounds - scheme.completedRounds
    const toGenerate = Math.min(roundCount, remaining)
    if (toGenerate <= 0) return { success: false, generated: 0, error: '已达到总试验轮次' }

    const defaultRope = defaultRopeId || scheme.ropes[0]?.id || null
    const defaultBucket = defaultBucketId || scheme.buckets[0]?.id || null

    for (let i = 0; i < toGenerate; i++) {
      const roundNo = scheme.trials.length + 1
      const newTrial: TrialRound = {
        roundNo,
        hidden: false,
        timeCost: 0,
        leakageRate: 0,
        componentWear: (() => {
          const m: Record<string, number> = {}
          scheme.components.forEach(c => { m[c.id] = 0 })
          return m
        })(),
        ropeWear: 0,
        bucketWear: 0,
        notes: '模板自动生成轮次',
        createdAt: Date.now(),
        ropeId: defaultRope,
        bucketId: defaultBucket,
        abnormalType: 'none',
        abnormalReason: '',
        reviewStatus: 'approved'
      }
      scheme.trials.push(newTrial)
    }
    scheme.completedRounds = scheme.trials.length
    scheme.updatedAt = Date.now()
    return { success: true, generated: toGenerate }
  }

  function filterTemplates(criteria: TemplateFilterCriteria): TrialTemplate[] {
    return templates.value.filter(t => {
      if (criteria.wellType && t.wellConfig?.type !== criteria.wellType) return false
      if (criteria.componentType && !t.components.some(c => c.type === criteria.componentType)) return false
      if (criteria.ropeMaterial && !t.ropes.some(r => r.material === criteria.ropeMaterial)) return false
      if (criteria.bucketMaterial && !t.buckets.some(b => b.material === criteria.bucketMaterial)) return false
      if (criteria.tag && t.tag !== criteria.tag) return false
      return true
    })
  }

  function getTemplateTags(): string[] {
    const tags = new Set<string>()
    templates.value.forEach(t => {
      if (t.tag && t.tag.trim()) tags.add(t.tag.trim())
    })
    return Array.from(tags).sort()
  }

  function getGlobalAbnormalStats() {
    let totalTrials = 0
    let approvedTrials = 0
    let abnormalTrials = 0
    let pendingReviews = 0
    let approvedReviews = 0
    let rejectedReviews = 0
    const abnormalByType: Record<string, number> = { timeout: 0, highLeakage: 0, wearSpike: 0, none: 0 }

    schemes.value.forEach(s => {
      s.trials.forEach(t => {
        if (t.hidden) return
        totalTrials++
        if (t.reviewStatus === 'approved') {
          approvedTrials++
          if (t.abnormalType !== 'none') {
            abnormalTrials++
            abnormalByType[t.abnormalType] = (abnormalByType[t.abnormalType] || 0) + 1
          } else {
            abnormalByType.none = (abnormalByType.none || 0) + 1
          }
          approvedReviews++
        }
        if (t.reviewStatus === 'pending' && t.abnormalType !== 'none') pendingReviews++
        if (t.reviewStatus === 'rejected') rejectedReviews++
      })
    })

    return {
      totalTrials,
      abnormalTrials,
      abnormalRate: approvedTrials > 0 ? (abnormalTrials / approvedTrials) * 100 : 0,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      abnormalByType
    }
  }

  function getGlobalCumulativeWear() {
    const allApprovedTrials: Array<{ trial: TrialRound; scheme: RecoveryScheme }> = []
    schemes.value.forEach(s => {
      s.trials.filter(t => !t.hidden && t.reviewStatus === 'approved').forEach(t => {
        allApprovedTrials.push({ trial: t, scheme: s })
      })
    })
    allApprovedTrials.sort((a, b) => a.trial.createdAt - b.trial.createdAt)

    if (allApprovedTrials.length === 0) return null

    const labels: string[] = []
    const ropeCumulative: number[] = []
    const bucketCumulative: number[] = []
    let ropeSum = 0
    let bucketSum = 0

    allApprovedTrials.forEach(({ trial, scheme }) => {
      labels.push(`${scheme.name} 第${trial.roundNo}轮`)
      ropeSum += trial.ropeWear
      bucketSum += trial.bucketWear
      ropeCumulative.push(Number(ropeSum.toFixed(2)))
      bucketCumulative.push(Number(bucketSum.toFixed(2)))
    })

    return { labels, ropeCumulative, bucketCumulative, total: allApprovedTrials.length }
  }

  function exportTraceableDetails(schemeIds?: string[]): string {
    const rows: string[] = []
    const headers = [
      '方案名称', '关联模板', '轮次', '提水耗时(秒)', '漏水率(%)', '有效水量(L)', '效率(L/s)',
      '井绳编号', '汲桶编号', '井绳磨损', '汲桶磨损', '平均构件磨损',
      '异常类型', '异常原因', '审查状态', '审查人', '审查意见',
      '记录时间', '审查时间'
    ]
    rows.push(headers.join(','))

    const targetSchemes = schemeIds
      ? schemes.value.filter(s => schemeIds.includes(s.id))
      : schemes.value

    targetSchemes.forEach(s => {
      const templateName = s.templateId
        ? (templates.value.find(t => t.id === s.templateId)?.name || '-')
        : '-'

      s.trials.forEach(t => {
        const bucket = s.buckets[0]
        const effectiveWater = bucket ? bucket.capacity * (1 - t.leakageRate / 100) : 0
        const efficiency = t.timeCost > 0 ? effectiveWater / t.timeCost : 0
        const compVals = Object.values(t.componentWear)
        const avgCompWear = compVals.length > 0
          ? compVals.reduce((a, b) => a + b, 0) / compVals.length
          : 0

        const rope = s.ropes.find(r => r.id === t.ropeId)
        const bkt = s.buckets.find(b => b.id === t.bucketId)

        const row = [
          s.name,
          templateName,
          t.roundNo,
          t.timeCost,
          t.leakageRate,
          effectiveWater.toFixed(2),
          efficiency.toFixed(3),
          rope?.ropeNo || '-',
          bkt?.bucketNo || '-',
          t.ropeWear,
          t.bucketWear,
          avgCompWear.toFixed(2),
          ABNORMAL_TYPE_LABELS[t.abnormalType],
          t.abnormalReason || '-',
          REVIEW_STATUS_LABELS[t.reviewStatus],
          t.reviewer || '-',
          t.reviewComment || '-',
          new Date(t.createdAt).toLocaleString('zh-CN'),
          t.reviewedAt ? new Date(t.reviewedAt).toLocaleString('zh-CN') : '-'
        ]
        rows.push(row.map(v => `"${v}"`).join(','))
      })
    })

    return '\uFEFF' + rows.join('\n')
  }

  function getTemplateComparisonDetail(templateIds: string[]) {
    return templateIds.map(tid => {
      const template = templates.value.find(t => t.id === tid)
      if (!template) return null

      const relatedSchemes = schemes.value.filter(s => s.templateId === tid)
      let totalTrials = 0
      let approvedTrials = 0
      let abnormalTrials = 0
      let totalTimeCost = 0
      let totalLeakageRate = 0
      let totalRopeWear = 0
      let totalBucketWear = 0
      let totalEfficiency = 0
      let validEfficiencyCount = 0

      relatedSchemes.forEach(s => {
        s.trials.forEach(t => {
          totalTrials++
          if (t.reviewStatus === 'approved' && !t.hidden) {
            approvedTrials++
            totalTimeCost += t.timeCost
            totalLeakageRate += t.leakageRate
            totalRopeWear += t.ropeWear
            totalBucketWear += t.bucketWear
            if (t.abnormalType !== 'none') abnormalTrials++
            const bucket = s.buckets[0]
            if (bucket && t.timeCost > 0) {
              totalEfficiency += (bucket.capacity * (1 - t.leakageRate / 100)) / t.timeCost
              validEfficiencyCount++
            }
          }
        })
      })

      return {
        templateId: tid,
        templateName: template.name,
        wellType: template.wellConfig?.type || '-',
        tag: template.tag || '-',
        schemeCount: relatedSchemes.length,
        totalTrials,
        approvedTrials,
        abnormalTrials,
        abnormalRate: approvedTrials > 0 ? (abnormalTrials / approvedTrials) * 100 : 0,
        avgTimeCost: approvedTrials > 0 ? totalTimeCost / approvedTrials : 0,
        avgLeakageRate: approvedTrials > 0 ? totalLeakageRate / approvedTrials : 0,
        avgRopeWear: approvedTrials > 0 ? totalRopeWear / approvedTrials : 0,
        avgBucketWear: approvedTrials > 0 ? totalBucketWear / approvedTrials : 0,
        avgEfficiency: validEfficiencyCount > 0 ? totalEfficiency / validEfficiencyCount : 0
      }
    }).filter(Boolean)
  }

  function getAllEnvHumanTrials(): Array<{ scheme: RecoveryScheme; trial: TrialRound }> {
    const result: Array<{ scheme: RecoveryScheme; trial: TrialRound }> = []
    schemes.value.forEach(s => {
      s.trials.forEach(t => {
        if (!t.hidden) {
          result.push({ scheme: s, trial: t })
        }
      })
    })
    result.sort((a, b) => b.trial.createdAt - a.trial.createdAt)
    return result
  }

  function filterEnvHumanTrials(criteria: EnvHumanFilterCriteria): Array<{ scheme: RecoveryScheme; trial: TrialRound }> {
    let result = getAllEnvHumanTrials()

    if (criteria.schemeIds && criteria.schemeIds.length > 0) {
      result = result.filter(r => criteria.schemeIds!.includes(r.scheme.id))
    }
    if (criteria.roundNos && criteria.roundNos.length > 0) {
      result = result.filter(r => criteria.roundNos!.includes(r.trial.roundNo))
    }
    if (criteria.weather && criteria.weather.length > 0) {
      result = result.filter(r => r.trial.environmentConditions && criteria.weather!.includes(r.trial.environmentConditions.weather))
    }
    if (criteria.temperatureRange) {
      const [min, max] = criteria.temperatureRange
      result = result.filter(r => {
        const t = r.trial.environmentConditions?.temperature
        return t !== undefined && t >= min && t <= max
      })
    }
    if (criteria.humidityRange) {
      const [min, max] = criteria.humidityRange
      result = result.filter(r => {
        const h = r.trial.environmentConditions?.humidity
        return h !== undefined && h >= min && h <= max
      })
    }
    if (criteria.windLevel && criteria.windLevel.length > 0) {
      result = result.filter(r => r.trial.environmentConditions && criteria.windLevel!.includes(r.trial.environmentConditions.windLevel))
    }
    if (criteria.waterLevelFluctuationRange) {
      const [min, max] = criteria.waterLevelFluctuationRange
      result = result.filter(r => {
        const w = r.trial.environmentConditions?.waterLevelFluctuation
        return w !== undefined && w >= min && w <= max
      })
    }
    if (criteria.operatorRoles && criteria.operatorRoles.length > 0) {
      result = result.filter(r => {
        const ops = r.trial.humanOperation?.operators || []
        return ops.some(op => criteria.operatorRoles!.includes(op.role))
      })
    }
    if (criteria.operatorCountRange) {
      const [min, max] = criteria.operatorCountRange
      result = result.filter(r => {
        const c = r.trial.humanOperation?.operatorCount
        return c !== undefined && c >= min && c <= max
      })
    }
    if (criteria.liftingPostures && criteria.liftingPostures.length > 0) {
      result = result.filter(r => r.trial.humanOperation && criteria.liftingPostures!.includes(r.trial.humanOperation.liftingPosture))
    }
    if (criteria.hasMaintenance !== undefined) {
      result = result.filter(r => {
        const m = r.trial.humanOperation?.maintenanceInterventions?.length || 0
        return criteria.hasMaintenance ? m > 0 : m === 0
      })
    }
    if (criteria.abnormalTypes && criteria.abnormalTypes.length > 0) {
      result = result.filter(r => criteria.abnormalTypes!.includes(r.trial.abnormalType))
    }

    return result
  }

  function getEnvHumanStats(criteria: EnvHumanFilterCriteria) {
    const filtered = filterEnvHumanTrials(criteria)
    const approved = filtered.filter(r => r.trial.reviewStatus === 'approved')

    let totalTimeCost = 0
    let totalLeakageRate = 0
    let totalRopeWear = 0
    let totalBucketWear = 0
    let totalEfficiency = 0
    let abnormalCount = 0
    let totalCompWear = 0
    let compWearCount = 0

    approved.forEach(({ scheme, trial }) => {
      totalTimeCost += trial.timeCost
      totalLeakageRate += trial.leakageRate
      totalRopeWear += trial.ropeWear
      totalBucketWear += trial.bucketWear
      if (trial.abnormalType !== 'none') abnormalCount++
      const vals = Object.values(trial.componentWear)
      if (vals.length > 0) {
        totalCompWear += vals.reduce((a, b) => a + b, 0) / vals.length
        compWearCount++
      }
      const bucket = scheme.buckets[0]
      if (bucket && trial.timeCost > 0) {
        totalEfficiency += (bucket.capacity * (1 - trial.leakageRate / 100)) / trial.timeCost
      }
    })

    const count = approved.length
    return {
      totalTrials: filtered.length,
      approvedTrials: count,
      abnormalTrials: abnormalCount,
      abnormalRate: count > 0 ? (abnormalCount / count) * 100 : 0,
      avgTimeCost: count > 0 ? totalTimeCost / count : 0,
      avgLeakageRate: count > 0 ? totalLeakageRate / count : 0,
      avgRopeWear: count > 0 ? totalRopeWear / count : 0,
      avgBucketWear: count > 0 ? totalBucketWear / count : 0,
      avgComponentWear: compWearCount > 0 ? totalCompWear / compWearCount : 0,
      avgEfficiency: count > 0 ? totalEfficiency / count : 0
    }
  }

  function getEnvHumanCrossStats(criteria: EnvHumanFilterCriteria, dimension: 'weather' | 'windLevel' | 'liftingPosture' | 'operatorRole' | 'operatorCount') {
    const filtered = filterEnvHumanTrials(criteria)
    const approved = filtered.filter(r => r.trial.reviewStatus === 'approved')

    const groups: Record<string, Array<{ scheme: RecoveryScheme; trial: TrialRound }>> = {}

    approved.forEach(item => {
      let key = ''
      switch (dimension) {
        case 'weather':
          key = item.trial.environmentConditions?.weather || 'unknown'
          break
        case 'windLevel':
          key = item.trial.environmentConditions?.windLevel || 'unknown'
          break
        case 'liftingPosture':
          key = item.trial.humanOperation?.liftingPosture || 'unknown'
          break
        case 'operatorRole': {
          const roles = item.trial.humanOperation?.operators?.map(o => o.role) || []
          key = roles.length > 0 ? roles.join(',') : 'unknown'
          break
        }
        case 'operatorCount':
          key = String(item.trial.humanOperation?.operatorCount || 0)
          break
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    const result: Array<{
      key: string
      label: string
      count: number
      avgTimeCost: number
      avgLeakageRate: number
      avgEfficiency: number
      avgRopeWear: number
      avgBucketWear: number
      abnormalRate: number
    }> = []

    Object.entries(groups).forEach(([key, items]) => {
      let totalTime = 0, totalLeak = 0, totalEff = 0, totalRope = 0, totalBucket = 0, abnormal = 0
      items.forEach(({ scheme, trial }) => {
        totalTime += trial.timeCost
        totalLeak += trial.leakageRate
        totalRope += trial.ropeWear
        totalBucket += trial.bucketWear
        if (trial.abnormalType !== 'none') abnormal++
        const bucket = scheme.buckets[0]
        if (bucket && trial.timeCost > 0) {
          totalEff += (bucket.capacity * (1 - trial.leakageRate / 100)) / trial.timeCost
        }
      })
      const c = items.length
      let label = key
      if (dimension === 'weather') {
        label = WEATHER_OPTIONS.find(o => o.value === key)?.label || key
      } else if (dimension === 'windLevel') {
        label = WIND_LEVEL_OPTIONS.find(o => o.value === key)?.label || key
      } else if (dimension === 'liftingPosture') {
        label = LIFTING_POSTURE_OPTIONS.find(o => o.value === key)?.label || key
      } else if (dimension === 'operatorRole') {
        label = key.split(',').map(r => OPERATOR_ROLE_OPTIONS.find(o => o.value === r)?.label || r).join('、')
      }
      result.push({
        key,
        label,
        count: c,
        avgTimeCost: c > 0 ? totalTime / c : 0,
        avgLeakageRate: c > 0 ? totalLeak / c : 0,
        avgEfficiency: c > 0 ? totalEff / c : 0,
        avgRopeWear: c > 0 ? totalRope / c : 0,
        avgBucketWear: c > 0 ? totalBucket / c : 0,
        abnormalRate: c > 0 ? (abnormal / c) * 100 : 0
      })
    })

    return result.sort((a, b) => b.count - a.count)
  }

  function getEnvHumanTrendData(criteria: EnvHumanFilterCriteria) {
    const filtered = filterEnvHumanTrials(criteria)
    const approved = filtered.filter(r => r.trial.reviewStatus === 'approved')
    approved.sort((a, b) => a.trial.createdAt - b.trial.createdAt)

    const labels: string[] = []
    const efficiency: number[] = []
    const timeCost: number[] = []
    const leakageRate: number[] = []
    const ropeWear: number[] = []
    const bucketWear: number[] = []
    const temperature: number[] = []
    const humidity: number[] = []

    approved.forEach(({ scheme, trial }) => {
      labels.push(`${scheme.name} 第${trial.roundNo}轮`)
      timeCost.push(Number(trial.timeCost.toFixed(2)))
      leakageRate.push(Number(trial.leakageRate.toFixed(2)))
      ropeWear.push(Number(trial.ropeWear.toFixed(2)))
      bucketWear.push(Number(trial.bucketWear.toFixed(2)))
      const bucket = scheme.buckets[0]
      const eff = bucket && trial.timeCost > 0
        ? (bucket.capacity * (1 - trial.leakageRate / 100)) / trial.timeCost
        : 0
      efficiency.push(Number(eff.toFixed(3)))
      temperature.push(trial.environmentConditions?.temperature ?? 0)
      humidity.push(trial.environmentConditions?.humidity ?? 0)
    })

    return { labels, efficiency, timeCost, leakageRate, ropeWear, bucketWear, temperature, humidity }
  }

  function exportEnvHumanDetails(criteria?: EnvHumanFilterCriteria): string {
    const data = criteria ? filterEnvHumanTrials(criteria) : getAllEnvHumanTrials()
    const rows: string[] = []
    const headers = [
      '方案名称', '轮次', '记录时间',
      '天气', '气温(℃)', '湿度(%)', '风力等级', '井水位波动(cm)',
      '操作人数', '操作者姓名', '操作者身份',
      '提水姿态', '中途停顿次数', '累计停顿时长(秒)',
      '是否有维护干预', '维护次数', '操作备注',
      '提水耗时(秒)', '漏水率(%)', '效率(L/s)',
      '井绳磨损', '汲桶磨损', '平均构件磨损',
      '异常类型', '异常原因', '审查状态'
    ]
    rows.push(headers.join(','))

    data.forEach(({ scheme, trial }) => {
      const bucket = scheme.buckets[0]
      const effectiveWater = bucket ? bucket.capacity * (1 - trial.leakageRate / 100) : 0
      const efficiency = trial.timeCost > 0 ? effectiveWater / trial.timeCost : 0
      const compVals = Object.values(trial.componentWear)
      const avgCompWear = compVals.length > 0
        ? compVals.reduce((a, b) => a + b, 0) / compVals.length
        : 0

      const env = trial.environmentConditions
      const human = trial.humanOperation

      const weatherLabel = env ? (WEATHER_OPTIONS.find(o => o.value === env.weather)?.label || '-') : '-'
      const windLabel = env ? (WIND_LEVEL_OPTIONS.find(o => o.value === env.windLevel)?.label || '-') : '-'
      const postureLabel = human ? (LIFTING_POSTURE_OPTIONS.find(o => o.value === human.liftingPosture)?.label || '-') : '-'
      const opNames = human?.operators?.map(o => o.name).join('、') || '-'
      const opRoles = human?.operators?.map(o => OPERATOR_ROLE_OPTIONS.find(r => r.value === o.role)?.label || o.role).join('、') || '-'
      const maintenanceCount = human?.maintenanceInterventions?.length || 0
      const hasMaintenance = maintenanceCount > 0 ? '是' : '否'

      const row = [
        scheme.name,
        trial.roundNo,
        new Date(trial.createdAt).toLocaleString('zh-CN'),
        weatherLabel,
        env?.temperature ?? '-',
        env?.humidity ?? '-',
        windLabel,
        env?.waterLevelFluctuation ?? '-',
        human?.operatorCount ?? '-',
        opNames,
        opRoles,
        postureLabel,
        human?.midPauseCount ?? '-',
        human?.totalPauseDuration ?? '-',
        hasMaintenance,
        maintenanceCount,
        human?.operationNotes || '-',
        trial.timeCost,
        trial.leakageRate,
        efficiency.toFixed(3),
        trial.ropeWear,
        trial.bucketWear,
        avgCompWear.toFixed(2),
        ABNORMAL_TYPE_LABELS[trial.abnormalType],
        trial.abnormalReason || '-',
        REVIEW_STATUS_LABELS[trial.reviewStatus]
      ]
      rows.push(row.map(v => `"${v}"`).join(','))
    })

    return '\uFEFF' + rows.join('\n')
  }

  function getDistinctOperators(): Array<{ id: string; name: string; role: OperatorRole }> {
    const map = new Map<string, { id: string; name: string; role: OperatorRole }>()
    schemes.value.forEach(s => {
      s.trials.forEach(t => {
        t.humanOperation?.operators?.forEach(op => {
          const key = `${op.name}_${op.role}`
          if (!map.has(key)) {
            map.set(key, { id: op.id, name: op.name, role: op.role })
          }
        })
      })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  return {
    schemes,
    templates,
    currentSchemeId,
    currentScheme,
    schemeList,
    templateList,
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
    getApprovedTrials,
    getPendingReviewTrials,
    getAllPendingReviews,
    reviewTrial,
    getRopeById,
    getBucketById,
    updateAbnormalRules,
    exportSchemes,
    importSchemes,
    validateSchemeData,
    createTemplate,
    saveSchemeAsTemplate,
    createSchemeFromTemplate,
    updateTemplateMeta,
    deleteTemplate,
    getTemplate,
    updateTemplateWellConfig,
    addTemplateComponent,
    updateTemplateComponent,
    removeTemplateComponent,
    addTemplateRope,
    updateTemplateRope,
    removeTemplateRope,
    addTemplateBucket,
    updateTemplateBucket,
    removeTemplateBucket,
    updateTemplateAbnormalRules,
    exportTemplates,
    importTemplates,
    getSchemeStats,
    getCumulativeWear,
    getTemplateComparisonStats,
    exportTrialDetails,
    generateStandardRounds,
    filterTemplates,
    getTemplateTags,
    getGlobalAbnormalStats,
    getGlobalCumulativeWear,
    exportTraceableDetails,
    getTemplateComparisonDetail,
    getAllEnvHumanTrials,
    filterEnvHumanTrials,
    getEnvHumanStats,
    getEnvHumanCrossStats,
    getEnvHumanTrendData,
    exportEnvHumanDetails,
    getDistinctOperators
  }
})
