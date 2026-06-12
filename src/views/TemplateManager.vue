<template>
  <div>
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">试验模板管理</span>
          <n-space>
            <n-button @click="handleImportClick">
              导入模板
            </n-button>
            <n-button
              type="info"
              :disabled="selectedIds.length === 0"
              @click="handleExportSelected"
            >
              导出选中 ({{ selectedIds.length }})
            </n-button>
            <n-button type="primary" @click="showCreateModal = true">
              + 新建模板
            </n-button>
          </n-space>
        </div>
      </template>

      <n-alert v-if="templateList.length === 0" type="info" :show-icon="true" style="margin-bottom: 16px">
        暂无试验模板，您可以新建模板，或从现有方案保存为模板。
      </n-alert>

      <n-data-table
        v-else
        :columns="columns"
        :data="templateList"
        :row-key="(row: any) => row.id"
        :pagination="{ pageSize: 10 }"
        :checked-row-keys="selectedIds"
        @update:checked-row-keys="onCheckedRows"
      />
    </n-card>

    <n-modal v-model:show="showCreateModal" preset="card" title="新建试验模板" style="width: 520px">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="left" label-width="100px">
        <n-form-item label="模板名称" path="name">
          <n-input v-model:value="createForm.name" placeholder="请输入模板名称" />
        </n-form-item>
        <n-form-item label="模板描述" path="description">
          <n-input v-model:value="createForm.description" type="textarea" placeholder="可选：简述模板特点或适用场景" :rows="3" />
        </n-form-item>
        <n-form-item label="标签" path="tag">
          <n-input v-model:value="createForm.tag" placeholder="可选：如 标准试验、快速测试 等" />
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

    <n-modal
      v-model:show="showUseModal"
      preset="card"
      title="使用模板创建方案"
      style="width: 520px"
    >
      <n-form ref="useFormRef" :model="useForm" :rules="useRules" label-placement="left" label-width="100px">
        <n-form-item label="方案名称" path="name">
          <n-input v-model:value="useForm.name" placeholder="请输入新方案名称" />
        </n-form-item>
        <n-alert type="info" :show-icon="true">
          将基于模板「{{ selectedTemplate?.name }}」一键生成标准试验方案，包含井型、构件、井绳、汲桶配置及异常规则。
        </n-alert>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showUseModal = false">取消</n-button>
          <n-button type="primary" @click="handleUseTemplate">创建方案</n-button>
        </n-space>
      </template>
    </n-modal>

    <input ref="importInputRef" type="file" accept=".json" style="display: none" @change="handleImportFile" />
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import type { TrialTemplate } from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const templateList = computed(() => schemeStore.templateList)

const showCreateModal = ref(false)
const showUseModal = ref(false)
const createFormRef = ref()
const useFormRef = ref()
const importInputRef = ref<HTMLInputElement | null>(null)
const selectedIds = ref<(string | number)[]>([])
const selectedTemplate = ref<TrialTemplate | null>(null)

const createForm = ref({
  name: '',
  description: '',
  tag: '',
  totalRounds: 10
})

const useForm = ref({
  name: ''
})

const createRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
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

const useRules = {
  name: [
    { required: true, message: '请输入方案名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度应为 2-50 字符', trigger: 'blur' }
  ]
}

function onCheckedRows(keys: (string | number)[]) {
  selectedIds.value = keys
}

function handleCreate() {
  createFormRef.value?.validate((errors: any) => {
    if (!errors) {
      const id = schemeStore.createTemplate(createForm.value.name)
      schemeStore.updateTemplateMeta(
        id,
        createForm.value.name,
        createForm.value.description,
        createForm.value.tag,
        createForm.value.totalRounds
      )
      message.success('模板创建成功')
      showCreateModal.value = false
      createForm.value = { name: '', description: '', tag: '', totalRounds: 10 }
      router.push(`/template/${id}/config`)
    }
  })
}

function handleConfigClick(id: string) {
  router.push(`/template/${id}/config`)
}

function handleUseClick(row: any) {
  if (!row.hasWellConfig || row.componentCount === 0 || row.ropeCount === 0 || row.bucketCount === 0) {
    message.warning('该模板配置不完整，无法用于创建方案。请先完善模板配置。')
    return
  }
  const tpl = schemeStore.getTemplate(row.id)
  if (tpl) {
    selectedTemplate.value = tpl
    useForm.value.name = tpl.name + ' - 试验方案'
    showUseModal.value = true
  }
}

function handleUseTemplate() {
  useFormRef.value?.validate((errors: any) => {
    if (!errors && selectedTemplate.value) {
      const schemeId = schemeStore.createSchemeFromTemplate(selectedTemplate.value.id, useForm.value.name)
      if (schemeId) {
        schemeStore.setCurrentScheme(schemeId)
        message.success('方案创建成功')
        showUseModal.value = false
        router.push(`/scheme/${schemeId}/config`)
      } else {
        message.error('创建失败')
      }
    }
  })
}

function handleDeleteClick(id: string, name: string) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除模板「${name}」吗？删除后无法恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      if (schemeStore.deleteTemplate(id)) {
        message.success('模板已删除')
      }
    }
  })
}

function handleExportSelected() {
  const ids = selectedIds.value.map(String)
  const data = schemeStore.exportTemplates(ids)
  if (data.length === 0) {
    message.warning('请先选择要导出的模板')
    return
  }
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `templates_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success(`已导出 ${data.length} 个模板`)
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
      title: '导入模板',
      content: '是否覆盖当前同名模板？选择"否"将以新模板导入（不覆盖现有数据）。',
      positiveText: '覆盖导入',
      negativeText: '不覆盖（新建）',
      onPositiveClick: () => {
        const result = schemeStore.importTemplates(content, true)
        if (result.success) {
          message.success(`成功导入 ${result.templates.length} 个模板`)
        } else {
          message.error(result.error || '导入失败')
        }
      },
      onNegativeClick: () => {
        const result = schemeStore.importTemplates(content, false)
        if (result.success) {
          message.success(`成功导入 ${result.templates.length} 个模板`)
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
    title: '模板名称',
    key: 'name',
    width: 180
  },
  {
    title: '标签',
    key: 'tag',
    width: 100,
    render: (row) => row.tag ? h('n-tag', { type: 'info', size: 'small' }, () => row.tag) : '-'
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: { tooltip: true }
  },
  {
    title: '井型配置',
    key: 'hasWellConfig',
    width: 100,
    render: (row) => row.hasWellConfig ? '✅ 已配置' : '❌ 未配置'
  },
  {
    title: '构件数',
    key: 'componentCount',
    width: 80
  },
  {
    title: '井绳数',
    key: 'ropeCount',
    width: 80
  },
  {
    title: '汲桶数',
    key: 'bucketCount',
    width: 80
  },
  {
    title: '试验轮次',
    key: 'totalRounds',
    width: 100
  },
  {
    title: '使用次数',
    key: 'usageCount',
    width: 100
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
    width: 260,
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
          '编辑配置'
        ),
        h(
          'button',
          {
            className: 'n-button n-button--primary-type n-button--small',
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #18a058', background: '#18a058', color: '#fff', cursor: 'pointer' },
            onClick: () => handleUseClick(row)
          },
          '使用模板'
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
