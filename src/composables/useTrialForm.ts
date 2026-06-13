import { ref, computed, type ComputedRef } from 'vue'
import type { RecoveryScheme, TrialRound } from '@/types'

export interface TrialFormData {
  hidden: boolean
  timeCost: number
  leakageRate: number
  componentWear: Record<string, number>
  ropeWear: number
  bucketWear: number
  notes: string
  ropeId?: string | null
  bucketId?: string | null
  abnormalType?: string
  abnormalReason?: string
  reviewStatus?: string
  reviewer?: string
  reviewComment?: string
  environmentConditions?: any
  humanOperation?: any
}

export function useTrialForm(scheme: ComputedRef<RecoveryScheme | null>) {
  const showAddModal = ref(false)
  const showEditModal = ref(false)
  const editingRoundNo = ref<number>(0)

  const initWearMap = (): Record<string, number> => {
    const m: Record<string, number> = {}
    scheme.value?.components.forEach((c: any) => { m[c.id] = 0 })
    return m
  }

  const createEmptyAddForm = (): TrialFormData => ({
    hidden: false,
    timeCost: 0,
    leakageRate: 0,
    componentWear: initWearMap(),
    ropeWear: 0,
    bucketWear: 0,
    notes: '',
    ropeId: scheme.value?.ropes[0]?.id || null,
    bucketId: scheme.value?.buckets[0]?.id || null
  })

  const createEmptyEditForm = (): TrialRound => ({
    roundNo: 0,
    hidden: false,
    timeCost: 0,
    leakageRate: 0,
    componentWear: {},
    ropeWear: 0,
    bucketWear: 0,
    notes: '',
    createdAt: 0,
    ropeId: null,
    bucketId: null,
    abnormalType: 'none',
    abnormalReason: '',
    reviewStatus: 'pending'
  })

  const addForm = ref<TrialFormData>(createEmptyAddForm())
  const editForm = ref<TrialRound>(createEmptyEditForm())

  const nextRoundNo = computed(() => (scheme.value?.completedRounds || 0) + 1)

  const addRules = {
    timeCost: [
      { required: true, type: 'number', message: '请输入提水耗时', trigger: 'blur' },
      {
        validator: (_r: any, v: number) => typeof v === 'number' && v >= 0 && !isNaN(v),
        message: '提水耗时不能小于 0',
        trigger: 'blur'
      }
    ],
    leakageRate: [
      { required: true, type: 'number', message: '请输入漏水率', trigger: 'blur' },
      {
        validator: (_r: any, v: number) => typeof v === 'number' && v >= 0 && v <= 100 && !isNaN(v),
        message: '漏水率必须在 0 - 100 范围内',
        trigger: 'blur'
      }
    ]
  }

  const editRules = { ...addRules }

  function openAddModal() {
    if (!scheme.value?.assemblyComplete) return false
    addForm.value = createEmptyAddForm()
    showAddModal.value = true
    return true
  }

  function openEditModal(row: TrialRound) {
    editingRoundNo.value = row.roundNo
    editForm.value = {
      roundNo: row.roundNo,
      hidden: row.hidden,
      timeCost: row.timeCost,
      leakageRate: row.leakageRate,
      componentWear: { ...row.componentWear },
      ropeWear: row.ropeWear,
      bucketWear: row.bucketWear,
      notes: row.notes,
      createdAt: row.createdAt,
      ropeId: row.ropeId,
      bucketId: row.bucketId,
      abnormalType: row.abnormalType,
      abnormalReason: row.abnormalReason,
      reviewStatus: row.reviewStatus,
      reviewer: row.reviewer,
      reviewComment: row.reviewComment,
      reviewedAt: row.reviewedAt,
      environmentConditions: row.environmentConditions,
      humanOperation: row.humanOperation
    }
    showEditModal.value = true
  }

  function closeAddModal() {
    showAddModal.value = false
  }

  function closeEditModal() {
    showEditModal.value = false
  }

  function resetForms() {
    addForm.value = createEmptyAddForm()
    editForm.value = createEmptyEditForm()
    editingRoundNo.value = 0
    showAddModal.value = false
    showEditModal.value = false
  }

  return {
    showAddModal,
    showEditModal,
    editingRoundNo,
    addForm,
    editForm,
    nextRoundNo,
    addRules,
    editRules,
    openAddModal,
    openEditModal,
    closeAddModal,
    closeEditModal,
    resetForms,
    initWearMap,
    createEmptyAddForm,
    createEmptyEditForm
  }
}
