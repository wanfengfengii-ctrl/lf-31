<template>
  <n-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>井绳列表 (编号不能重复)</span>
        <n-button type="primary" size="small" @click="openAddModal">+ 添加井绳</n-button>
      </div>
    </template>

    <n-alert v-if="!scheme || scheme.ropes.length === 0" type="warning" :show-icon="true" style="margin-bottom: 16px">
      尚未添加井绳，请至少添加 1 条井绳
    </n-alert>

    <n-data-table
      v-else
      :columns="columns"
      :data="scheme?.ropes || []"
      :row-key="(row: any) => row.id"
      :pagination="false"
      size="small"
    />

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? '编辑井绳' : '添加井绳'"
      style="width: 560px"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-placement="left"
        label-width="120px"
      >
        <n-form-item label="井绳编号" path="ropeNo">
          <n-input v-model:value="form.ropeNo" placeholder="如 ROP-001" />
          <span style="color: #999; font-size: 12px">同一方案内不能重复</span>
        </n-form-item>
        <n-form-item label="材质" path="material">
          <n-select v-model:value="form.material" :options="ROPE_MATERIAL_OPTIONS" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="直径 (mm)" path="diameter" :show-label="true">
            <n-input-number v-model:value="form.diameter" :min="0.1" :max="100" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="长度 (米)" path="length" :show-label="true">
            <n-input-number v-model:value="form.length" :min="0.1" :max="500" :step="0.1" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="断裂强度 (kg)" path="breakingStrength" :show-label="true">
            <n-input-number v-model:value="form.breakingStrength" :min="0" :max="10000" style="width: 100%" />
          </n-form-item>
          <n-form-item label="耐磨性 (1-10)" path="wearResistance" :show-label="true">
            <n-input-number v-model:value="form.wearResistance" :min="1" :max="10" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-form-item label="备注" path="notes">
          <n-input v-model:value="form.notes" type="textarea" placeholder="可选" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="handleSubmit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useMessage, type DataTableColumns } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import { ROPE_MATERIAL_OPTIONS, type RopeConfig } from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()

const scheme = computed(() => schemeStore.currentScheme)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref()

const defaultForm = (): Omit<RopeConfig, 'id'> => ({
  ropeNo: '',
  material: 'hemp',
  diameter: 8,
  length: 15,
  breakingStrength: 200,
  wearResistance: 5,
  notes: ''
})

const form = ref<Omit<RopeConfig, 'id'>>(defaultForm())

const formRules = {
  ropeNo: [
    { required: true, message: '请输入井绳编号', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (!scheme.value) return true
        if (!value) return false
        return !schemeStore.isRopeNoDuplicate(scheme.value.id, value, editingId.value || undefined)
      },
      message: '该编号已存在，同一方案内井绳编号不能重复',
      trigger: 'blur'
    }
  ],
  material: [{ required: true, message: '请选择材质', trigger: 'change' }],
  diameter: [{ required: true, type: 'number', min: 0.1, message: '请输入直径(>0)', trigger: 'blur' }],
  length: [{ required: true, type: 'number', min: 0.1, message: '请输入长度(>0)', trigger: 'blur' }],
  breakingStrength: [{ required: true, type: 'number', min: 0, message: '请输入断裂强度', trigger: 'blur' }],
  wearResistance: [{ required: true, type: 'number', message: '请输入耐磨性', trigger: 'blur' }]
}

const matLabelMap: Record<string, string> = {}
ROPE_MATERIAL_OPTIONS.forEach(o => { matLabelMap[o.value] = o.label })

function openAddModal() {
  editingId.value = null
  form.value = defaultForm()
  showModal.value = true
}

function handleEdit(row: RopeConfig) {
  editingId.value = row.id
  form.value = {
    ropeNo: row.ropeNo,
    material: row.material,
    diameter: row.diameter,
    length: row.length,
    breakingStrength: row.breakingStrength,
    wearResistance: row.wearResistance,
    notes: row.notes
  }
  showModal.value = true
}

function handleSubmit() {
  formRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      if (editingId.value) {
        schemeStore.updateRope(scheme.value.id, editingId.value, form.value)
        message.success('井绳已更新')
      } else {
        schemeStore.addRope(scheme.value.id, form.value)
        message.success('井绳已添加')
      }
      showModal.value = false
    }
  })
}

function handleDelete(row: RopeConfig) {
  if (scheme.value) {
    schemeStore.removeRope(scheme.value.id, row.id)
    message.success('井绳已删除')
  }
}

const columns: DataTableColumns<RopeConfig> = [
  { title: '编号', key: 'ropeNo', width: 120 },
  { title: '材质', key: 'material', width: 100, render: (row) => matLabelMap[row.material] || row.material },
  { title: '直径', key: 'diameter', width: 100, render: (row) => `${row.diameter} mm` },
  { title: '长度', key: 'length', width: 100, render: (row) => `${row.length} m` },
  { title: '断裂强度', key: 'breakingStrength', width: 120, render: (row) => `${row.breakingStrength} kg` },
  { title: '耐磨性', key: 'wearResistance', width: 100 },
  {
    title: '操作',
    key: 'actions',
    width: 160,
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
