<template>
  <div v-if="scheme">
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <span style="font-size: 18px; font-weight: 600">汲水试验记录 - {{ scheme.name }}</span>
            <n-tag type="info" style="margin-left: 12px">
              进度：{{ scheme.completedRounds }} / {{ scheme.totalRounds }}
            </n-tag>
          </div>
          <n-space>
            <n-button type="default" @click="goBackToConfig">返回构件配置</n-button>
            <n-button
              type="primary"
              :disabled="!scheme.assemblyComplete || scheme.completedRounds >= scheme.totalRounds"
              @click="openAddModal"
            >
              + 记录新轮次
            </n-button>
          </n-space>
        </div>
      </template>

      <n-space vertical :size="12" style="width: 100%">
        <n-alert v-if="!scheme.assemblyComplete" type="error" :show-icon="true">
          ⛔ 构件装配未完成，不能开始汲水试验！请先完成井型、辘轳构件、井绳、汲桶的配置。
        </n-alert>

        <n-space :size="24" style="flex-wrap: wrap">
          <n-statistic label="已完成轮次" :value="scheme.completedRounds" />
          <n-statistic label="剩余轮次" :value="scheme.totalRounds - scheme.completedRounds" />
          <n-statistic
            v-if="stats"
            label="平均提水耗时 (秒)"
            :value="Number(stats.avgTimeCost.toFixed(2))"
          />
          <n-statistic
            v-if="stats"
            label="平均漏水率 (%)"
            :value="Number(stats.avgLeakage.toFixed(2))"
            value-style="color: #f0a020"
          />
          <n-statistic
            v-if="stats"
            label="有效提水效率 (L/s)"
            :value="Number(stats.avgEfficiency.toFixed(3))"
            value-style="color: #18a058"
          />
          <n-statistic
            label="参与统计的轮次"
            :value="stats ? stats.visibleCount : 0"
            suffix="(已排除隐藏)"
          />
        </n-space>
      </n-space>
    </n-card>

    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>试验轮次明细</span>
          <n-tag>🔒 隐藏轮次不会计入数据分析与图表</n-tag>
        </div>
      </template>

      <n-alert v-if="scheme.trials.length === 0" type="info" :show-icon="true">
        暂无试验记录，请点击「记录新轮次」开始。
      </n-alert>

      <n-data-table
        v-else
        :columns="columns"
        :data="scheme.trials"
        :row-key="(row: any) => row.roundNo"
        :pagination="{ pageSize: 10 }"
        size="small"
      />
    </n-card>

    <n-modal
      v-model:show="showAddModal"
      preset="card"
      title="记录汲水试验轮次"
      style="width: 640px"
    >
      <n-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-placement="left"
        label-width="140px"
      >
        <n-form-item label="轮次编号">
          <n-input :value="`第 ${nextRoundNo} 轮`" disabled />
        </n-form-item>
        <n-form-item label="提水耗时 (秒)" path="timeCost">
          <n-input-number v-model:value="addForm.timeCost" :min="0" :max="3600" :step="0.1" style="width: 100%" />
          <span style="color: #999; font-size: 12px">从井底到地面的完整提水时间，不能小于 0</span>
        </n-form-item>
        <n-form-item label="漏水率 (%)" path="leakageRate">
          <n-input-number v-model:value="addForm.leakageRate" :min="0" :max="100" :step="0.1" style="width: 100%" />
          <span style="color: #999; font-size: 12px">提水过程中漏出水量占比，必须在 0 - 100 之间</span>
        </n-form-item>

        <n-divider style="margin: 8px 0" />
        <div style="font-weight: 600; margin-bottom: 12px; color: #333">构件磨损记录 (1-10 级)</div>
        <n-space vertical :size="8" style="width: 100%">
          <n-form-item
            v-for="comp in scheme.components"
            :key="comp.id"
            :label="`${comp.componentNo} (${comp.type})`"
            :path="`componentWear.${comp.id}`"
          >
            <n-input-number
              v-model:value="addForm.componentWear[comp.id]"
              :min="0"
              :max="10"
              :step="0.1"
              style="width: 100%"
              placeholder="0-10"
            />
          </n-form-item>
        </n-space>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="井绳磨损" path="ropeWear" :show-label="true">
            <n-input-number v-model:value="addForm.ropeWear" :min="0" :max="10" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="汲桶磨损" path="bucketWear" :show-label="true">
            <n-input-number v-model:value="addForm.bucketWear" :min="0" :max="10" :step="0.1" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-divider style="margin: 8px 0" />
        <n-form-item label="隐藏此轮次" path="hidden">
          <n-switch v-model:value="addForm.hidden" round />
          <span style="color: #999; font-size: 12px; margin-left: 8px">
            开启后该轮次不会计入统计图表，用于剔除异常试验
          </span>
        </n-form-item>
        <n-form-item label="备注" path="notes">
          <n-input v-model:value="addForm.notes" type="textarea" placeholder="可选：异常情况或备注说明" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddTrial">保存记录</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑试验记录"
      style="width: 640px"
    >
      <n-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-placement="left"
        label-width="140px"
      >
        <n-form-item label="轮次编号">
          <n-input :value="`第 ${editingRoundNo} 轮`" disabled />
        </n-form-item>
        <n-form-item label="提水耗时 (秒)" path="timeCost">
          <n-input-number v-model:value="editForm.timeCost" :min="0" :max="3600" :step="0.1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="漏水率 (%)" path="leakageRate">
          <n-input-number v-model:value="editForm.leakageRate" :min="0" :max="100" :step="0.1" style="width: 100%" />
        </n-form-item>
        <n-divider style="margin: 8px 0" />
        <div style="font-weight: 600; margin-bottom: 12px; color: #333">构件磨损记录</div>
        <n-space vertical :size="8" style="width: 100%">
          <n-form-item
            v-for="comp in scheme.components"
            :key="comp.id"
            :label="`${comp.componentNo}`"
          >
            <n-input-number
              v-model:value="editForm.componentWear[comp.id]"
              :min="0"
              :max="10"
              :step="0.1"
              style="width: 100%"
            />
          </n-form-item>
        </n-space>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="井绳磨损" :show-label="true">
            <n-input-number v-model:value="editForm.ropeWear" :min="0" :max="10" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="汲桶磨损" :show-label="true">
            <n-input-number v-model:value="editForm.bucketWear" :min="0" :max="10" :step="0.1" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-divider style="margin: 8px 0" />
        <n-form-item label="隐藏此轮次">
          <n-switch v-model:value="editForm.hidden" round />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="editForm.notes" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="handleEditTrial">保存修改</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import { COMPONENT_TYPE_OPTIONS, type TrialRound } from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const router = useRouter()

const schemeId = computed(() => route.params.id as string)
const scheme = computed(() => schemeStore.currentScheme)
const stats = computed(() => scheme.value ? schemeStore.getSchemeStats(scheme.value.id) : null)

const showAddModal = ref(false)
const showEditModal = ref(false)
const addFormRef = ref()
const editFormRef = ref()
const editingRoundNo = ref<number>(0)

const typeLabelMap: Record<string, string> = {}
COMPONENT_TYPE_OPTIONS.forEach(o => { typeLabelMap[o.value] = o.label })

const nextRoundNo = computed(() => (scheme.value?.completedRounds || 0) + 1)

const initWearMap = () => {
  const m: Record<string, number> = {}
  scheme.value?.components.forEach(c => { m[c.id] = 0 })
  return m
}

const emptyAddForm = () => ({
  hidden: false,
  timeCost: 0,
  leakageRate: 0,
  componentWear: initWearMap(),
  ropeWear: 0,
  bucketWear: 0,
  notes: ''
})

const addForm = ref(emptyAddForm())

const addRules = {
  timeCost: [
    { required: true, type: 'number', message: '请输入提水耗时', trigger: 'blur' },
    {
      validator: (_r: any, v: number) => schemeStore.isValidTimeCost(v),
      message: '提水耗时不能小于 0',
      trigger: 'blur'
    }
  ],
  leakageRate: [
    { required: true, type: 'number', message: '请输入漏水率', trigger: 'blur' },
    {
      validator: (_r: any, v: number) => schemeStore.isValidLeakageRate(v),
      message: '漏水率必须在 0 - 100 范围内',
      trigger: 'blur'
    }
  ]
}

const editRules = { ...addRules }

const emptyEditForm = (): TrialRound => ({
  roundNo: 0,
  hidden: false,
  timeCost: 0,
  leakageRate: 0,
  componentWear: {},
  ropeWear: 0,
  bucketWear: 0,
  notes: '',
  createdAt: 0
})

const editForm = ref<TrialRound>(emptyEditForm())

onMounted(() => {
  schemeStore.setCurrentScheme(schemeId.value)
})

function goBackToConfig() {
  router.push(`/scheme/${schemeId.value}/config`)
}

function openAddModal() {
  if (!scheme.value?.assemblyComplete) {
    message.error('请先完成构件装配！')
    return
  }
  addForm.value = emptyAddForm()
  showAddModal.value = true
}

function handleAddTrial() {
  addFormRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      const res = schemeStore.addTrial(scheme.value.id, {
        roundNo: 0,
        hidden: addForm.value.hidden,
        timeCost: addForm.value.timeCost,
        leakageRate: addForm.value.leakageRate,
        componentWear: { ...addForm.value.componentWear },
        ropeWear: addForm.value.ropeWear,
        bucketWear: addForm.value.bucketWear,
        notes: addForm.value.notes
      })
      if (res.success) {
        message.success('试验记录已保存')
        showAddModal.value = false
      } else {
        message.error(res.error || '保存失败')
      }
    }
  })
}

function handleEdit(row: TrialRound) {
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
    createdAt: row.createdAt
  }
  showEditModal.value = true
}

function handleEditTrial() {
  editFormRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      const res = schemeStore.updateTrial(scheme.value.id, editingRoundNo.value, {
        hidden: editForm.value.hidden,
        timeCost: editForm.value.timeCost,
        leakageRate: editForm.value.leakageRate,
        componentWear: editForm.value.componentWear,
        ropeWear: editForm.value.ropeWear,
        bucketWear: editForm.value.bucketWear,
        notes: editForm.value.notes
      })
      if (res.success) {
        message.success('修改已保存')
        showEditModal.value = false
      } else {
        message.error(res.error || '保存失败')
      }
    }
  })
}

function handleDelete(row: TrialRound) {
  if (!scheme.value) return
  dialog.warning({
    title: '删除试验记录',
    content: `确定删除「第 ${row.roundNo} 轮」的试验记录吗？删除后轮次编号会自动重新排列。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      schemeStore.removeTrial(scheme.value!.id, row.roundNo)
      message.success('记录已删除')
    }
  })
}

function toggleHidden(row: TrialRound) {
  if (!scheme.value) return
  schemeStore.updateTrial(scheme.value.id, row.roundNo, { hidden: !row.hidden })
  message.info(row.hidden ? '已取消隐藏，将计入统计' : '已隐藏，不计入统计')
}

const columns: DataTableColumns<TrialRound> = [
  {
    title: '轮次',
    key: 'roundNo',
    width: 80,
    render: (row) => h(
      'div',
      { style: { fontWeight: 600 } },
      [
        `第 ${row.roundNo} 轮`,
        row.hidden ? h('span', { style: { marginLeft: '6px', color: '#d03050', fontSize: '12px' } }, '🔒已隐藏') : null
      ]
    )
  },
  { title: '耗时 (秒)', key: 'timeCost', width: 100 },
  {
    title: '漏水率',
    key: 'leakageRate',
    width: 110,
    render: (row) => h(
      'span',
      { style: { color: row.leakageRate > 20 ? '#d03050' : '#18a058', fontWeight: 500 } },
      `${row.leakageRate} %`
    )
  },
  {
    title: '有效水量',
    key: 'effectiveWater',
    width: 110,
    render: (row) => {
      const bucket = scheme.value?.buckets[0]
      if (!bucket) return '-'
      const effective = bucket.capacity * (1 - row.leakageRate / 100)
      return `${effective.toFixed(2)} L`
    }
  },
  {
    title: '效率 (L/s)',
    key: 'efficiency',
    width: 110,
    render: (row) => {
      if (row.timeCost <= 0) return '-'
      const bucket = scheme.value?.buckets[0]
      if (!bucket) return '-'
      const eff = (bucket.capacity * (1 - row.leakageRate / 100)) / row.timeCost
      return eff.toFixed(3)
    }
  },
  { title: '井绳磨损', key: 'ropeWear', width: 100 },
  { title: '汲桶磨损', key: 'bucketWear', width: 100 },
  {
    title: '平均构件磨损',
    key: 'avgCompWear',
    width: 130,
    render: (row) => {
      const vals = Object.values(row.componentWear)
      if (vals.length === 0) return '-'
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      return avg.toFixed(2)
    }
  },
  {
    title: '记录时间',
    key: 'createdAt',
    width: 160,
    render: (row) => new Date(row.createdAt).toLocaleString('zh-CN')
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => h(
      'div',
      { style: { display: 'flex', gap: '8px' } },
      [
        h(
          'button',
          {
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #e0e0e6', background: '#fff', cursor: 'pointer' },
            onClick: () => handleEdit(row)
          },
          '编辑'
        ),
        h(
          'button',
          {
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: `1px solid ${row.hidden ? '#18a058' : '#f0a020'}`, background: '#fff', color: row.hidden ? '#18a058' : '#f0a020', cursor: 'pointer' },
            onClick: () => toggleHidden(row)
          },
          row.hidden ? '取消隐藏' : '隐藏'
        ),
        h(
          'button',
          {
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #d03050', background: '#fff', color: '#d03050', cursor: 'pointer' },
            onClick: () => handleDelete(row)
          },
          '删除'
        )
      ]
    )
  }
]
</script>
