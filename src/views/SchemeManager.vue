<template>
  <div>
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">复原方案管理</span>
          <n-space>
            <n-button type="primary" @click="showCreateModal = true">
              新建方案
            </n-button>
            <n-button @click="handleImportClick">
              导入方案
            </n-button>
            <n-button
              type="info"
              :disabled="selectedIds.length === 0"
              @click="handleExportSelected"
            >
              导出选中 ({{ selectedIds.length }})
            </n-button>
          </n-space>
        </div>
      </template>

      <n-data-table
        :columns="columns"
        :data="schemeStore.schemeList"
        :row-key="(row: any) => row.id"
        :pagination="{ pageSize: 10 }"
        :checked-row-keys="selectedIds"
        @update:checked-row-keys="onCheckedRows"
      >
      </n-data-table>
    </n-card>

    <n-modal v-model:show="showCreateModal" preset="card" title="新建复原方案" style="width: 520px">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="left" label-width="100px">
        <n-form-item label="方案名称" path="name">
          <n-input v-model:value="createForm.name" placeholder="请输入方案名称" />
        </n-form-item>
        <n-form-item label="方案描述" path="description">
          <n-input v-model:value="createForm.description" type="textarea" placeholder="可选：简述研究目的或方案特点" :rows="3" />
        </n-form-item>
        <n-form-item label="试验轮次" path="totalRounds">
          <n-input-number v-model:value="createForm.totalRounds" :min="1" :max="1000" style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <input ref="importInputRef" type="file" accept=".json" style="display: none" @change="handleImportFile" />

    <n-modal
      v-model:show="showSaveTemplateModal"
      preset="card"
      title="保存方案为试验模板"
      style="width: 520px"
    >
      <n-form ref="saveTemplateFormRef" :model="saveTemplateForm" :rules="saveTemplateRules" label-placement="left" label-width="100px">
        <n-form-item label="模板名称" path="name">
          <n-input v-model:value="saveTemplateForm.name" placeholder="请输入模板名称" />
        </n-form-item>
        <n-form-item label="模板描述" path="description">
          <n-input v-model:value="saveTemplateForm.description" type="textarea" placeholder="可选：简述模板特点或适用场景" :rows="3" />
        </n-form-item>
        <n-form-item label="标签" path="tag">
          <n-input v-model:value="saveTemplateForm.tag" placeholder="可选：如 标准试验、快速测试 等" />
        </n-form-item>
        <n-alert type="info" :show-icon="true">
          将基于当前方案的井型配置、辘轳构件、井绳、汲桶及异常规则创建为可复用模板。
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveTemplateModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveAsTemplate">保存为模板</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'

const schemeStore = useSchemeStore()
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const showCreateModal = ref(false)
const createFormRef = ref()
const importInputRef = ref<HTMLInputElement | null>(null)
const selectedIds = ref<(string | number)[]>([])

const createForm = ref({
  name: '',
  description: '',
  totalRounds: 10
})

const createRules = {
  name: [
    { required: true, message: '请输入方案名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度应为 2-50 字符', trigger: 'blur' }
  ],
  totalRounds: [
    {
      validator: (_rule: any, value: any) => {
        return typeof value === 'number' && !isNaN(value) && value >= 1
      },
      message: '试验轮次至少为 1',
      trigger: ['blur', 'change']
    }
  ]
}

function onCheckedRows(keys: (string | number)[]) {
  selectedIds.value = keys
}

function handleCreate() {
  createFormRef.value?.validate((errors: any) => {
    if (!errors) {
      const id = schemeStore.createScheme(createForm.value.name)
      schemeStore.updateSchemeMeta(id, createForm.value.name, createForm.value.description, createForm.value.totalRounds)
      message.success('方案创建成功')
      showCreateModal.value = false
      createForm.value = { name: '', description: '', totalRounds: 10 }
      router.push(`/scheme/${id}/config`)
    }
  })
}

function handleConfigClick(id: string) {
  schemeStore.setCurrentScheme(id)
  router.push(`/scheme/${id}/config`)
}

function handleTrialClick(id: string) {
  if (!schemeStore.canStartTrials(id)) {
    message.warning('请先完成构件装配：井型、辘轳构件、井绳、汲桶缺一不可')
    return
  }
  schemeStore.setCurrentScheme(id)
  router.push(`/scheme/${id}/trials`)
}

function handleDeleteClick(id: string, name: string) {
  const hasTrials = schemeStore.schemeHasTrials(id)
  if (hasTrials) {
    dialog.warning({
      title: '二次确认删除',
      content: `方案「${name}」中已有试验记录，删除后数据无法恢复。是否确认删除？`,
      positiveText: '确认删除',
      negativeText: '取消',
      onPositiveClick: () => {
        if (schemeStore.deleteScheme(id)) {
          message.success('方案已删除')
        }
      }
    })
  } else {
    dialog.warning({
      title: '确认删除',
      content: `确定删除方案「${name}」吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => {
        if (schemeStore.deleteScheme(id)) {
          message.success('方案已删除')
        }
      }
    })
  }
}

function handleExportSelected() {
  const ids = selectedIds.value.map(String)
  const data = schemeStore.exportSchemes(ids)
  if (data.length === 0) {
    message.warning('请先选择要导出的方案')
    return
  }
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `schemes_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success(`已导出 ${data.length} 个方案`)
}

function handleImportClick() {
  importInputRef.value?.click()
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    dialog.warning({
      title: '导入方案',
      content: '是否覆盖当前同名方案？选择"否"将以新方案导入（不覆盖现有数据）。',
      positiveText: '覆盖导入',
      negativeText: '不覆盖（新建）',
      onPositiveClick: () => {
        const result = schemeStore.importSchemes(content, true)
        if (result.success) {
          message.success(`成功导入 ${result.schemes.length} 个方案`)
        } else {
          message.error(result.error || '导入失败')
        }
      },
      onNegativeClick: () => {
        const result = schemeStore.importSchemes(content, false)
        if (result.success) {
          message.success(`成功导入 ${result.schemes.length} 个方案`)
        } else {
          message.error(result.error || '导入失败')
        }
      }
    })
  }
  reader.readAsText(file)
  input.value = ''
}

const columns: DataTableColumns<any> = [
  { type: 'selection' },
  {
    title: '方案名称',
    key: 'name',
    width: 180
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: { tooltip: true }
  },
  {
    title: '构件数',
    key: 'componentCount',
    width: 80
  },
  {
    title: '装配状态',
    key: 'assemblyComplete',
    width: 100,
    render: (row) => h(
      'span',
      { style: { color: row.assemblyComplete ? '#18a058' : '#f0a020', fontWeight: 500 } },
      row.assemblyComplete ? '✅ 已完成' : '⏳ 未完成'
    )
  },
  {
    title: '试验进度',
    key: 'progress',
    width: 140,
    render: (row) => `${row.completedRounds} / ${row.totalRounds}`
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 170,
    render: (row) => new Date(row.createdAt).toLocaleString('zh-CN')
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    render: (row) => h(
      'div',
      { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
      [
        h(
          'button',
          {
            className: 'n-button n-button--default-type n-button--small',
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #e0e0e6', background: '#fff', cursor: 'pointer' },
            onClick: () => handleConfigClick(row.id)
          },
          '构件配置'
        ),
        h(
          'button',
          {
            className: 'n-button n-button--primary-type n-button--small',
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #18a058', background: row.assemblyComplete ? '#18a058' : '#ccc', color: '#fff', cursor: 'pointer' },
            onClick: () => handleTrialClick(row.id),
            disabled: !row.assemblyComplete
          },
          '汲水试验'
        ),
        h(
          'button',
          {
            className: 'n-button n-button--error-type n-button--small',
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #d03050', background: '#fff', color: '#d03050', cursor: 'pointer' },
            onClick: () => handleDeleteClick(row.id, row.name)
          },
          '删除'
        )
      ]
    )
  }
]
</script>
