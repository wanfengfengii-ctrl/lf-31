<template>
  <n-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>汲桶列表 (编号不能重复)</span>
        <n-button type="primary" size="small" @click="openAddModal">+ 添加汲桶</n-button>
      </div>
    </template>

    <n-alert v-if="!scheme || scheme.buckets.length === 0" type="warning" :show-icon="true" style="margin-bottom: 16px">
      尚未添加汲桶，请至少添加 1 个汲桶
    </n-alert>

    <n-data-table
      v-else
      :columns="columns"
      :data="scheme?.buckets || []"
      :row-key="(row: any) => row.id"
      :pagination="false"
      size="small"
    />

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? '编辑汲桶' : '添加汲桶'"
      style="width: 560px"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-placement="left"
        label-width="120px"
      >
        <n-form-item label="汲桶编号" path="bucketNo">
          <n-input v-model:value="form.bucketNo" placeholder="如 BKT-001" />
          <span style="color: #999; font-size: 12px">同一方案内不能重复</span>
        </n-form-item>
        <n-form-item label="材质" path="material">
          <n-select v-model:value="form.material" :options="BUCKET_MATERIAL_OPTIONS" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="容量 (升)" path="capacity" :show-label="true">
            <n-input-number v-model:value="form.capacity" :min="0.1" :max="500" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="自重 (kg)" path="weight" :show-label="true">
            <n-input-number v-model:value="form.weight" :min="0" :max="200" :step="0.1" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="壁厚 (mm)" path="wallThickness" :show-label="true">
            <n-input-number v-model:value="form.wallThickness" :min="0" :max="200" :step="0.1" style="width: 100%" />
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
import { BUCKET_MATERIAL_OPTIONS, type BucketConfig } from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()

const scheme = computed(() => schemeStore.currentScheme)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref()

const defaultForm = (): Omit<BucketConfig, 'id'> => ({
  bucketNo: '',
  material: 'wood',
  capacity: 20,
  weight: 3,
  wallThickness: undefined,
  wearResistance: 5,
  notes: ''
})

const form = ref<Omit<BucketConfig, 'id'>>(defaultForm())

const formRules = {
  bucketNo: [
    { required: true, message: '请输入汲桶编号', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (!scheme.value) return true
        if (!value) return false
        return !schemeStore.isBucketNoDuplicate(scheme.value.id, value, editingId.value || undefined)
      },
      message: '该编号已存在，同一方案内汲桶编号不能重复',
      trigger: 'blur'
    }
  ],
  material: [{ required: true, message: '请选择材质', trigger: 'change' }],
  capacity: [{ required: true, type: 'number', min: 0.1, message: '容量必须大于 0', trigger: 'blur' }],
  weight: [{ required: true, type: 'number', min: 0, message: '自重不能为负', trigger: 'blur' }],
  wearResistance: [{ required: true, type: 'number', message: '请输入耐磨性', trigger: 'blur' }]
}

const matLabelMap: Record<string, string> = {}
BUCKET_MATERIAL_OPTIONS.forEach(o => { matLabelMap[o.value] = o.label })

function openAddModal() {
  editingId.value = null
  form.value = defaultForm()
  showModal.value = true
}

function handleEdit(row: BucketConfig) {
  editingId.value = row.id
  form.value = {
    bucketNo: row.bucketNo,
    material: row.material,
    capacity: row.capacity,
    weight: row.weight,
    wallThickness: row.wallThickness,
    wearResistance: row.wearResistance,
    notes: row.notes
  }
  showModal.value = true
}

function handleSubmit() {
  formRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      if (editingId.value) {
        schemeStore.updateBucket(scheme.value.id, editingId.value, form.value)
        message.success('汲桶已更新')
      } else {
        schemeStore.addBucket(scheme.value.id, form.value)
        message.success('汲桶已添加')
      }
      showModal.value = false
    }
  })
}

function handleDelete(row: BucketConfig) {
  if (scheme.value) {
    schemeStore.removeBucket(scheme.value.id, row.id)
    message.success('汲桶已删除')
  }
}

const columns: DataTableColumns<BucketConfig> = [
  { title: '编号', key: 'bucketNo', width: 120 },
  { title: '材质', key: 'material', width: 100, render: (row) => matLabelMap[row.material] || row.material },
  { title: '容量', key: 'capacity', width: 100, render: (row) => `${row.capacity} L` },
  { title: '自重', key: 'weight', width: 100, render: (row) => `${row.weight} kg` },
  { title: '壁厚', key: 'wallThickness', width: 100, render: (row) => row.wallThickness ? `${row.wallThickness} mm` : '-' },
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
