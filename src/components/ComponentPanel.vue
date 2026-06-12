<template>
  <n-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>辘轳构件列表 (编号不能重复)</span>
        <n-button type="primary" size="small" @click="openAddModal">+ 添加构件</n-button>
      </div>
    </template>

    <n-alert v-if="!scheme || scheme.components.length === 0" type="warning" :show-icon="true" style="margin-bottom: 16px">
      尚未添加构件，请至少添加 1 个构件（轮盘、轴、支架或曲柄）
    </n-alert>

    <n-data-table
      v-else
      :columns="columns"
      :data="scheme?.components || []"
      :row-key="(row: any) => row.id"
      :pagination="false"
      size="small"
    />

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? '编辑构件' : '添加构件'"
      style="width: 560px"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-placement="left"
        label-width="120px"
      >
        <n-form-item label="构件编号" path="componentNo">
          <n-input v-model:value="form.componentNo" placeholder="如 WHL-001" />
          <span style="color: #999; font-size: 12px">同一方案内不能重复</span>
        </n-form-item>
        <n-form-item label="构件类型" path="type">
          <n-select v-model:value="form.type" :options="COMPONENT_TYPE_OPTIONS" />
        </n-form-item>
        <n-form-item label="材质" path="material">
          <n-select
            v-model:value="form.material"
            :options="[
              { label: '硬木（枣木/榆木）', value: 'hardwood' },
              { label: '软木（松木/杨木）', value: 'softwood' },
              { label: '青铜', value: 'bronze' },
              { label: '熟铁', value: 'iron' },
              { label: '石材', value: 'stone' },
              { label: '竹', value: 'bamboo' }
            ]"
            filterable
          />
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="直径 (cm)" path="diameter" :show-label="true">
            <n-input-number v-model:value="form.diameter" :min="0" :max="500" style="width: 100%" />
          </n-form-item>
          <n-form-item label="长度 (cm)" path="length" :show-label="true">
            <n-input-number v-model:value="form.length" :min="0" :max="1000" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="重量 (kg)" path="weight" :show-label="true">
            <n-input-number v-model:value="form.weight" :min="0" :max="500" :step="0.1" style="width: 100%" />
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
import { COMPONENT_TYPE_OPTIONS, type ComponentConfig } from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()

const scheme = computed(() => schemeStore.currentScheme)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref()

const defaultForm = (): Omit<ComponentConfig, 'id'> => ({
  componentNo: '',
  type: 'wheel',
  material: 'hardwood',
  diameter: undefined,
  length: undefined,
  weight: undefined,
  wearResistance: 5,
  notes: ''
})

const form = ref<Omit<ComponentConfig, 'id'>>(defaultForm())

const formRules = {
  componentNo: [
    { required: true, message: '请输入构件编号', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (!scheme.value) return true
        if (!value) return false
        const dup = schemeStore.isComponentNoDuplicate(scheme.value.id, value, editingId.value || undefined)
        return !dup
      },
      message: '该编号已存在，同一方案内构件编号不能重复',
      trigger: 'blur'
    }
  ],
  type: [{ required: true, message: '请选择构件类型', trigger: 'change' }],
  material: [{ required: true, message: '请选择材质', trigger: 'change' }],
  wearResistance: [{ required: true, type: 'number', message: '请输入耐磨性', trigger: 'blur' }]
}

const typeLabelMap: Record<string, string> = {}
COMPONENT_TYPE_OPTIONS.forEach(o => { typeLabelMap[o.value] = o.label })

function openAddModal() {
  editingId.value = null
  form.value = defaultForm()
  showModal.value = true
}

function handleEdit(row: ComponentConfig) {
  editingId.value = row.id
  form.value = {
    componentNo: row.componentNo,
    type: row.type,
    material: row.material,
    diameter: row.diameter,
    length: row.length,
    weight: row.weight,
    wearResistance: row.wearResistance,
    notes: row.notes
  }
  showModal.value = true
}

function handleSubmit() {
  formRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      if (editingId.value) {
        schemeStore.updateComponent(scheme.value.id, editingId.value, form.value)
        message.success('构件已更新')
      } else {
        schemeStore.addComponent(scheme.value.id, form.value)
        message.success('构件已添加')
      }
      showModal.value = false
    }
  })
}

function handleDelete(row: ComponentConfig) {
  if (scheme.value) {
    schemeStore.removeComponent(scheme.value.id, row.id)
    message.success('构件已删除')
  }
}

const columns: DataTableColumns<ComponentConfig> = [
  { title: '编号', key: 'componentNo', width: 120 },
  {
    title: '类型',
    key: 'type',
    width: 140,
    render: (row) => typeLabelMap[row.type] || row.type
  },
  { title: '材质', key: 'material', width: 140 },
  {
    title: '尺寸',
    key: 'size',
    width: 160,
    render: (row) => {
      const parts = []
      if (row.diameter) parts.push(`Φ${row.diameter}cm`)
      if (row.length) parts.push(`长${row.length}cm`)
      return parts.length > 0 ? parts.join(' × ') : '-'
    }
  },
  { title: '重量', key: 'weight', width: 100, render: (row) => row.weight ? `${row.weight} kg` : '-' },
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
