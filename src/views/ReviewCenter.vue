<template>
  <div>
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">试验模板与异常轮次审查中心</span>
          <n-space>
            <n-tag v-if="globalStats.pendingReviews > 0" type="warning" size="large">
              待审查：{{ globalStats.pendingReviews }} 条
            </n-tag>
            <n-tag v-else type="success" size="large">
              ✅ 暂无待审查
            </n-tag>
            <n-button type="default" @click="handleExportTraceable">
              📤 导出可追溯明细
            </n-button>
          </n-space>
        </div>
      </template>

      <n-space :size="24" style="flex-wrap: wrap">
        <n-statistic label="总试验轮次" :value="globalStats.totalTrials" />
        <n-statistic label="异常轮次" :value="globalStats.abnormalTrials" value-style="color: #d03050" />
        <n-statistic
          label="异常占比"
          :value="Number(globalStats.abnormalRate.toFixed(1))"
          suffix="%"
          value-style="color: #f0a020"
        />
        <n-statistic label="待审查" :value="globalStats.pendingReviews" value-style="color: #f0a020" />
        <n-statistic label="已通过" :value="globalStats.approvedReviews" value-style="color: #18a058" />
        <n-statistic label="已驳回" :value="globalStats.rejectedReviews" value-style="color: #d03050" />
      </n-space>
    </n-card>

    <n-tabs type="line" animated v-model:value="activeTab">
      <n-tab-pane name="templates" tab="📑 模板管理">
        <n-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>试验模板列表</span>
              <n-space>
                <n-button size="small" @click="showFilterModal = true">
                  🔍 筛选模板
                </n-button>
                <n-button
                  v-if="filterCriteria.wellType || filterCriteria.componentType || filterCriteria.ropeMaterial || filterCriteria.bucketMaterial || filterCriteria.tag"
                  size="small"
                  type="warning"
                  @click="clearFilter"
                >
                  清除筛选
                </n-button>
              </n-space>
            </div>
          </template>

          <n-space
            v-if="filterCriteria.wellType || filterCriteria.componentType || filterCriteria.ropeMaterial || filterCriteria.bucketMaterial || filterCriteria.tag"
            style="margin-bottom: 12px"
          >
            <n-tag v-if="filterCriteria.wellType" closable @close="filterCriteria.wellType = undefined" type="info" size="small">
              井型: {{ WELL_TYPE_OPTIONS.find(o => o.value === filterCriteria.wellType)?.label }}
            </n-tag>
            <n-tag v-if="filterCriteria.componentType" closable @close="filterCriteria.componentType = undefined" type="info" size="small">
              构件: {{ COMPONENT_TYPE_OPTIONS.find(o => o.value === filterCriteria.componentType)?.label }}
            </n-tag>
            <n-tag v-if="filterCriteria.ropeMaterial" closable @close="filterCriteria.ropeMaterial = undefined" type="info" size="small">
              井绳: {{ ROPE_MATERIAL_OPTIONS.find(o => o.value === filterCriteria.ropeMaterial)?.label }}
            </n-tag>
            <n-tag v-if="filterCriteria.bucketMaterial" closable @close="filterCriteria.bucketMaterial = undefined" type="info" size="small">
              汲桶: {{ BUCKET_MATERIAL_OPTIONS.find(o => o.value === filterCriteria.bucketMaterial)?.label }}
            </n-tag>
            <n-tag v-if="filterCriteria.tag" closable @close="filterCriteria.tag = undefined" type="info" size="small">
              标签: {{ filterCriteria.tag }}
            </n-tag>
          </n-space>

          <n-alert v-if="filteredTemplates.length === 0" type="info" :show-icon="true">
            暂无匹配模板，请调整筛选条件或新建模板。
          </n-alert>

          <n-data-table
            v-else
            :columns="templateColumns"
            :data="filteredTemplates"
            :row-key="(row: any) => row.id"
            :pagination="{ pageSize: 10 }"
            size="small"
          />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="generate" tab="⚡ 一键生成">
        <n-card>
          <template #header>
            <span>基于模板一键生成标准轮次</span>
          </template>

          <n-alert type="info" :show-icon="true" style="margin-bottom: 16px">
            选择模板和方案后，一键为方案生成标准轮次记录。生成后可进入试验记录页逐轮填写实际数据。
          </n-alert>

          <n-form ref="generateFormRef" :model="generateForm" :rules="generateRules" label-placement="left" label-width="120px" style="max-width: 640px">
            <n-form-item label="选择模板" path="templateId">
              <n-select
                v-model:value="generateForm.templateId"
                :options="availableTemplatesForGenerate"
                placeholder="请选择试验模板"
                @update:value="onGenerateTemplateChange"
              />
            </n-form-item>
            <n-form-item label="新方案名称" path="schemeName">
              <n-input v-model:value="generateForm.schemeName" placeholder="新方案的名称" />
            </n-form-item>
            <n-form-item label="生成轮次数" path="roundCount">
              <n-input-number v-model:value="generateForm.roundCount" :min="1" :max="1000" style="width: 100%" />
            </n-form-item>
            <n-form-item label="默认井绳" path="defaultRopeId">
              <n-select
                v-model:value="generateForm.defaultRopeId"
                :options="generateRopeOptions"
                placeholder="自动选择第一条井绳"
                clearable
              />
            </n-form-item>
            <n-form-item label="默认汲桶" path="defaultBucketId">
              <n-select
                v-model:value="generateForm.defaultBucketId"
                :options="generateBucketOptions"
                placeholder="自动选择第一个汲桶"
                clearable
              />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="handleGenerate" :disabled="!generateForm.templateId">
                生成方案与标准轮次
              </n-button>
            </n-form-item>
          </n-form>

          <n-divider />

          <div style="font-weight: 600; margin-bottom: 12px">已有方案批量生成</div>
          <n-alert type="warning" :show-icon="true" style="margin-bottom: 12px">
            为已有方案批量补充标准轮次（需已完成构件装配且未达到总轮次上限）。
          </n-alert>
          <n-form ref="batchFormRef" :model="batchForm" :rules="batchRules" label-placement="left" label-width="120px" style="max-width: 640px">
            <n-form-item label="选择方案" path="schemeId">
              <n-select
                v-model:value="batchForm.schemeId"
                :options="availableSchemesForBatch"
                placeholder="请选择已有方案"
                @update:value="onBatchSchemeChange"
              />
            </n-form-item>
            <n-form-item label="补充轮次" path="roundCount">
              <n-input-number v-model:value="batchForm.roundCount" :min="1" :max="100" style="width: 100%" />
            </n-form-item>
            <n-form-item label="默认井绳" path="defaultRopeId">
              <n-select
                v-model:value="batchForm.defaultRopeId"
                :options="batchRopeOptions"
                placeholder="自动选择第一条井绳"
                clearable
              />
            </n-form-item>
            <n-form-item label="默认汲桶" path="defaultBucketId">
              <n-select
                v-model:value="batchForm.defaultBucketId"
                :options="batchBucketOptions"
                placeholder="自动选择第一个汲桶"
                clearable
              />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="handleBatchGenerate" :disabled="!batchForm.schemeId">
                批量生成轮次
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="pending" tab="⏳ 待审查">
        <n-alert v-if="pendingReviews.length === 0" type="success" :show-icon="true">
          太棒了！所有异常轮次均已处理完毕。
        </n-alert>

        <n-data-table
          v-else
          :columns="pendingColumns"
          :data="pendingReviews"
          :row-key="(row: any) => `${row.schemeId}-${row.trial.roundNo}`"
          :pagination="{ pageSize: 10 }"
          size="small"
        />
      </n-tab-pane>

      <n-tab-pane name="history" tab="📜 审查历史">
        <n-alert v-if="historyReviews.length === 0" type="info" :show-icon="true">
          暂无审查历史记录。
        </n-alert>

        <n-data-table
          v-else
          :columns="historyColumns"
          :data="historyReviews"
          :row-key="(row: any) => `${row.schemeId}-${row.trial.roundNo}`"
          :pagination="{ pageSize: 10 }"
          size="small"
        />
      </n-tab-pane>

      <n-tab-pane name="rules" tab="⚠️ 异常规则">
        <n-card title="异常判定规则说明">
          <n-alert type="info" :show-icon="true" style="margin-bottom: 16px">
            异常判定规则按方案级别配置，可在各方案的构件配置页面修改。以下为默认阈值说明。
          </n-alert>

          <n-descriptions :column="1" bordered label-placement="left" style="max-width: 600px">
            <n-descriptions-item label="超时异常">
              提水耗时超过阈值时判定，默认 120 秒
            </n-descriptions-item>
            <n-descriptions-item label="漏水过高">
              漏水率超过阈值时判定，默认 30%
            </n-descriptions-item>
            <n-descriptions-item label="磨损突增">
              单轮磨损较历史均值增长超过阈值时判定，默认 3 级
            </n-descriptions-item>
          </n-descriptions>

          <n-divider />

          <div style="font-weight: 600; margin-bottom: 12px">审查流程说明</div>
          <n-timeline>
            <n-timeline-item type="info" title="1. 自动检测">
              每轮试验记录保存时，系统自动依据方案级异常规则检测是否异常
            </n-timeline-item>
            <n-timeline-item type="warning" title="2. 标记待审查">
              检测到异常的轮次自动标记为「待审查」，暂不计入统计
            </n-timeline-item>
            <n-timeline-item type="success" title="3. 人工审查">
              审查人可选择「通过」或「驳回」；通过后计入统计，驳回后不计入
            </n-timeline-item>
            <n-timeline-item type="default" title="4. 统计排除">
              审查通过前的异常轮次不会出现在数据分析、效率计算等统计中
            </n-timeline-item>
          </n-timeline>
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <n-modal
      v-model:show="showFilterModal"
      preset="card"
      title="按井型/构件组合筛选模板"
      style="width: 560px"
    >
      <n-form :model="filterCriteria" label-placement="left" label-width="120px">
        <n-form-item label="井型">
          <n-select v-model:value="filterCriteria.wellType" :options="WELL_TYPE_OPTIONS" clearable placeholder="不限" />
        </n-form-item>
        <n-form-item label="构件类型">
          <n-select v-model:value="filterCriteria.componentType" :options="COMPONENT_TYPE_OPTIONS" clearable placeholder="不限" />
        </n-form-item>
        <n-form-item label="井绳材质">
          <n-select v-model:value="filterCriteria.ropeMaterial" :options="ROPE_MATERIAL_OPTIONS" clearable placeholder="不限" />
        </n-form-item>
        <n-form-item label="汲桶材质">
          <n-select v-model:value="filterCriteria.bucketMaterial" :options="BUCKET_MATERIAL_OPTIONS" clearable placeholder="不限" />
        </n-form-item>
        <n-form-item label="标签">
          <n-select v-model:value="filterCriteria.tag" :options="tagOptions" clearable placeholder="不限" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="clearFilter">清除全部</n-button>
          <n-button type="primary" @click="showFilterModal = false">确认筛选</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showReviewModal"
      preset="card"
      title="审查异常轮次"
      style="width: 680px"
    >
      <div v-if="currentReview">
        <n-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
          <n-descriptions-item label="方案名称">
            {{ currentReview.schemeName }}
          </n-descriptions-item>
          <n-descriptions-item label="轮次">
            第 {{ currentReview.trial.roundNo }} 轮
          </n-descriptions-item>
          <n-descriptions-item label="异常类型">
            <n-tag :type="getAbnormalTagType(currentReview.trial.abnormalType)">
              {{ ABNORMAL_TYPE_LABELS[currentReview.trial.abnormalType] }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="记录时间">
            {{ new Date(currentReview.trial.createdAt).toLocaleString('zh-CN') }}
          </n-descriptions-item>
        </n-descriptions>

        <n-card size="small" style="margin-bottom: 16px" title="异常原因">
          <n-alert type="warning" :show-icon="true">
            {{ currentReview.trial.abnormalReason || '未填写异常原因' }}
          </n-alert>
        </n-card>

        <n-card size="small" style="margin-bottom: 16px" title="试验数据">
          <n-descriptions :column="3" bordered size="small">
            <n-descriptions-item label="提水耗时">
              {{ currentReview.trial.timeCost }} 秒
            </n-descriptions-item>
            <n-descriptions-item label="漏水率">
              {{ currentReview.trial.leakageRate }} %
            </n-descriptions-item>
            <n-descriptions-item label="井绳磨损">
              {{ currentReview.trial.ropeWear }}
            </n-descriptions-item>
            <n-descriptions-item label="汲桶磨损">
              {{ currentReview.trial.bucketWear }}
            </n-descriptions-item>
            <n-descriptions-item label="使用井绳">
              {{ getRopeNo(currentReview.schemeId, currentReview.trial.ropeId) }}
            </n-descriptions-item>
            <n-descriptions-item label="使用汲桶">
              {{ getBucketNo(currentReview.schemeId, currentReview.trial.bucketId) }}
            </n-descriptions-item>
          </n-descriptions>
        </n-card>

        <n-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-placement="left" label-width="100px">
          <n-form-item label="审查结果" path="status">
            <n-radio-group v-model:value="reviewForm.status">
              <n-radio value="approved">✅ 通过（计入统计）</n-radio>
              <n-radio value="rejected">❌ 驳回（不计入统计）</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="审查人" path="reviewer">
            <n-input v-model:value="reviewForm.reviewer" placeholder="请输入审查人姓名" />
          </n-form-item>
          <n-form-item label="审查意见" path="comment">
            <n-input
              v-model:value="reviewForm.comment"
              type="textarea"
              placeholder="请填写审查意见（驳回时必填）"
              :rows="3"
            />
          </n-form-item>
        </n-form>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showReviewModal = false">取消</n-button>
          <n-button type="primary" @click="submitReview">提交审查</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog, type DataTableColumns, type SelectOption } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import {
  ABNORMAL_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  WELL_TYPE_OPTIONS,
  COMPONENT_TYPE_OPTIONS,
  ROPE_MATERIAL_OPTIONS,
  BUCKET_MATERIAL_OPTIONS,
  type TrialRound,
  type ReviewStatus,
  type AbnormalType,
  type TemplateFilterCriteria
} from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const activeTab = ref('templates')
const showReviewModal = ref(false)
const showFilterModal = ref(false)
const reviewFormRef = ref()
const generateFormRef = ref()
const batchFormRef = ref()
const currentReview = ref<{ schemeId: string; schemeName: string; trial: TrialRound } | null>(null)

const filterCriteria = ref<TemplateFilterCriteria>({})

const reviewForm = ref({
  status: 'approved' as ReviewStatus,
  reviewer: '',
  comment: ''
})

const generateForm = ref({
  templateId: '' as string,
  schemeName: '',
  roundCount: 10,
  defaultRopeId: null as string | null,
  defaultBucketId: null as string | null
})

const batchForm = ref({
  schemeId: '' as string,
  roundCount: 5,
  defaultRopeId: null as string | null,
  defaultBucketId: null as string | null
})

const generateRules = {
  templateId: [{ required: true, message: '请选择模板', trigger: 'change' }],
  schemeName: [
    { required: true, message: '请输入方案名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度应为 2-50 字符', trigger: 'blur' }
  ],
  roundCount: [
    {
      validator: (_r: any, v: any) => typeof v === 'number' && !isNaN(v) && v >= 1,
      message: '轮次至少为 1',
      trigger: ['blur', 'change']
    }
  ]
}

const batchRules = {
  schemeId: [{ required: true, message: '请选择方案', trigger: 'change' }],
  roundCount: [
    {
      validator: (_r: any, v: any) => typeof v === 'number' && !isNaN(v) && v >= 1,
      message: '轮次至少为 1',
      trigger: ['blur', 'change']
    }
  ]
}

const reviewRules = {
  reviewer: [
    { required: true, message: '请输入审查人姓名', trigger: 'blur' }
  ],
  comment: [
    {
      validator: (_r: any, v: string) => {
        if (reviewForm.value.status === 'rejected' && (!v || v.trim().length === 0)) {
          return false
        }
        return true
      },
      message: '驳回时必须填写审查意见',
      trigger: 'blur'
    }
  ]
}

const globalStats = computed(() => schemeStore.getGlobalAbnormalStats())

const tagOptions = computed(() =>
  schemeStore.getTemplateTags().map(t => ({ label: t, value: t }))
)

const filteredTemplates = computed(() =>
  schemeStore.filterTemplates(filterCriteria.value)
)

const availableTemplatesForGenerate = computed(() =>
  schemeStore.templates
    .filter(t => t.wellConfig && t.components.length > 0 && t.ropes.length > 0 && t.buckets.length > 0)
    .map(t => ({
      label: `${t.name} (${t.ropes.length}绳/${t.buckets.length}桶/${t.totalRounds}轮)`,
      value: t.id
    }))
)

const availableSchemesForBatch = computed(() =>
  schemeStore.schemes
    .filter(s => s.assemblyComplete && s.completedRounds < s.totalRounds)
    .map(s => ({
      label: `${s.name} (${s.completedRounds}/${s.totalRounds}轮)`,
      value: s.id
    }))
)

const generateRopeOptions = computed<SelectOption[]>(() => {
  if (!generateForm.value.templateId) return []
  const tpl = schemeStore.getTemplate(generateForm.value.templateId)
  if (!tpl) return []
  return tpl.ropes.map(r => ({
    label: `${r.ropeNo} - ${r.material} (${r.diameter}mm)`,
    value: `tpl-rope-${r.ropeNo}`
  }))
})

const generateBucketOptions = computed<SelectOption[]>(() => {
  if (!generateForm.value.templateId) return []
  const tpl = schemeStore.getTemplate(generateForm.value.templateId)
  if (!tpl) return []
  return tpl.buckets.map(b => ({
    label: `${b.bucketNo} - ${b.material} (${b.capacity}L)`,
    value: `tpl-bucket-${b.bucketNo}`
  }))
})

const batchRopeOptions = computed<SelectOption[]>(() => {
  if (!batchForm.value.schemeId) return []
  const scheme = schemeStore.schemes.find(s => s.id === batchForm.value.schemeId)
  if (!scheme) return []
  return scheme.ropes.map(r => ({
    label: `${r.ropeNo} - ${r.material} (${r.diameter}mm)`,
    value: r.id
  }))
})

const batchBucketOptions = computed<SelectOption[]>(() => {
  if (!batchForm.value.schemeId) return []
  const scheme = schemeStore.schemes.find(s => s.id === batchForm.value.schemeId)
  if (!scheme) return []
  return scheme.buckets.map(b => ({
    label: `${b.bucketNo} - ${b.material} (${b.capacity}L)`,
    value: b.id
  }))
})

const pendingCount = computed(() => schemeStore.getAllPendingReviews().length)

const pendingReviews = computed(() => schemeStore.getAllPendingReviews())

const historyReviews = computed(() => {
  const result: Array<{ schemeId: string; schemeName: string; trial: TrialRound }> = []
  schemeStore.schemes.forEach(s => {
    s.trials.forEach(t => {
      if (t.reviewStatus === 'approved' || t.reviewStatus === 'rejected') {
        result.push({ schemeId: s.id, schemeName: s.name, trial: t })
      }
    })
  })
  return result.sort((a, b) => (b.trial.reviewedAt || 0) - (a.trial.reviewedAt || 0))
})

function clearFilter() {
  filterCriteria.value = {}
  showFilterModal.value = false
}

function onGenerateTemplateChange() {
  generateForm.value.defaultRopeId = null
  generateForm.value.defaultBucketId = null
  const tpl = schemeStore.getTemplate(generateForm.value.templateId)
  if (tpl) {
    generateForm.value.schemeName = tpl.name + ' - 试验方案'
    generateForm.value.roundCount = tpl.totalRounds
  }
}

function onBatchSchemeChange() {
  batchForm.value.defaultRopeId = null
  batchForm.value.defaultBucketId = null
}

function handleGenerate() {
  generateFormRef.value?.validate((errors: any) => {
    if (errors) return
    const tpl = schemeStore.getTemplate(generateForm.value.templateId)
    if (!tpl) {
      message.error('模板不存在')
      return
    }

    const schemeId = schemeStore.createSchemeFromTemplate(tpl.id, generateForm.value.schemeName)
    if (!schemeId) {
      message.error('创建方案失败')
      return
    }

    const scheme = schemeStore.schemes.find(s => s.id === schemeId)
    if (!scheme) {
      message.error('方案不存在')
      return
    }

    let mappedRopeId: string | null = null
    let mappedBucketId: string | null = null

    if (generateForm.value.defaultRopeId) {
      const tplRopeNo = generateForm.value.defaultRopeId.replace('tpl-rope-', '')
      const found = scheme.ropes.find(r => r.ropeNo === tplRopeNo)
      mappedRopeId = found?.id || scheme.ropes[0]?.id || null
    }
    if (generateForm.value.defaultBucketId) {
      const tplBucketNo = generateForm.value.defaultBucketId.replace('tpl-bucket-', '')
      const found = scheme.buckets.find(b => b.bucketNo === tplBucketNo)
      mappedBucketId = found?.id || scheme.buckets[0]?.id || null
    }

    const res = schemeStore.generateStandardRounds(
      schemeId,
      generateForm.value.roundCount,
      mappedRopeId,
      mappedBucketId
    )
    if (res.success) {
      message.success(`已基于模板创建方案并生成 ${res.generated} 个标准轮次`)
      schemeStore.setCurrentScheme(schemeId)
      router.push(`/scheme/${schemeId}/trials`)
    } else {
      message.error(res.error || '生成轮次失败')
    }
  })
}

function handleBatchGenerate() {
  batchFormRef.value?.validate((errors: any) => {
    if (errors) return
    const res = schemeStore.generateStandardRounds(
      batchForm.value.schemeId,
      batchForm.value.roundCount,
      batchForm.value.defaultRopeId,
      batchForm.value.defaultBucketId
    )
    if (res.success) {
      message.success(`已批量生成 ${res.generated} 个标准轮次`)
      schemeStore.setCurrentScheme(batchForm.value.schemeId)
      router.push(`/scheme/${batchForm.value.schemeId}/trials`)
    } else {
      message.error(res.error || '批量生成失败')
    }
  })
}

function getAbnormalTagType(type: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (type) {
    case 'timeout': return 'warning'
    case 'highLeakage': return 'error'
    case 'wearSpike': return 'info'
    default: return 'success'
  }
}

function getReviewTagType(status: ReviewStatus): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'pending': return 'warning'
    case 'approved': return 'success'
    case 'rejected': return 'error'
    default: return 'default'
  }
}

function getRopeNo(schemeId: string, ropeId: string | null): string {
  if (!ropeId) return '-'
  const rope = schemeStore.getRopeById(schemeId, ropeId)
  return rope?.ropeNo || '-'
}

function getBucketNo(schemeId: string, bucketId: string | null): string {
  if (!bucketId) return '-'
  const bucket = schemeStore.getBucketById(schemeId, bucketId)
  return bucket?.bucketNo || '-'
}

function handleReview(row: any) {
  currentReview.value = row
  reviewForm.value = {
    status: 'approved',
    reviewer: '',
    comment: ''
  }
  showReviewModal.value = true
}

function submitReview() {
  reviewFormRef.value?.validate((errors: any) => {
    if (!errors && currentReview.value) {
      const success = schemeStore.reviewTrial(
        currentReview.value.schemeId,
        currentReview.value.trial.roundNo,
        reviewForm.value.status,
        reviewForm.value.reviewer,
        reviewForm.value.comment
      )
      if (success) {
        message.success(reviewForm.value.status === 'approved' ? '已通过审查' : '已驳回')
        showReviewModal.value = false
      } else {
        message.error('审查失败')
      }
    }
  })
}

function handleExportTraceable() {
  const csv = schemeStore.exportTraceableDetails()
  if (!csv || csv.split('\n').length <= 1) {
    message.warning('暂无数据可导出')
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `可追溯试验明细_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

function handleUseTemplate(row: any) {
  const tpl = schemeStore.getTemplate(row.id)
  if (!tpl) return
  if (!tpl.wellConfig || tpl.components.length === 0 || tpl.ropes.length === 0 || tpl.buckets.length === 0) {
    message.warning('该模板配置不完整，无法使用。请先完善模板配置。')
    return
  }
  generateForm.value.templateId = tpl.id
  generateForm.value.schemeName = tpl.name + ' - 试验方案'
  generateForm.value.roundCount = tpl.totalRounds
  activeTab.value = 'generate'
}

function handleDeleteTemplate(id: string, name: string) {
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

const templateColumns: DataTableColumns<any> = [
  {
    title: '模板名称',
    key: 'name',
    width: 160
  },
  {
    title: '标签',
    key: 'tag',
    width: 90,
    render: (row) => row.tag ? h('n-tag', { type: 'info', size: 'small' }, () => row.tag) : '-'
  },
  {
    title: '井型',
    key: 'wellType',
    width: 90,
    render: (row) => {
      const tpl = schemeStore.getTemplate(row.id)
      if (!tpl?.wellConfig) return '❌'
      return WELL_TYPE_OPTIONS.find(o => o.value === tpl.wellConfig!.type)?.label || tpl.wellConfig.type
    }
  },
  {
    title: '构件',
    key: 'componentCount',
    width: 70,
    render: (row) => row.componentCount
  },
  {
    title: '井绳',
    key: 'ropeCount',
    width: 70,
    render: (row) => row.ropeCount
  },
  {
    title: '汲桶',
    key: 'bucketCount',
    width: 70,
    render: (row) => row.bucketCount
  },
  {
    title: '试验轮次',
    key: 'totalRounds',
    width: 90
  },
  {
    title: '使用次数',
    key: 'usageCount',
    width: 90
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => h(
      'div',
      { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
      [
        h(
          'button',
          {
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #18a058', background: '#18a058', color: '#fff', cursor: 'pointer' },
            onClick: () => handleUseTemplate(row)
          },
          '使用模板'
        ),
        h(
          'button',
          {
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #e0e0e6', background: '#fff', cursor: 'pointer' },
            onClick: () => router.push(`/template/${row.id}/config`)
          },
          '编辑'
        ),
        h(
          'button',
          {
            style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #d03050', background: '#fff', color: '#d03050', cursor: 'pointer' },
            onClick: () => handleDeleteTemplate(row.id, row.name)
          },
          '删除'
        )
      ]
    )
  }
]

const pendingColumns: DataTableColumns<any> = [
  {
    title: '方案名称',
    key: 'schemeName',
    width: 180
  },
  {
    title: '轮次',
    key: 'roundNo',
    width: 90,
    render: (row) => `第 ${row.trial.roundNo} 轮`
  },
  {
    title: '异常类型',
    key: 'abnormalType',
    width: 120,
    render: (row) => h(
      'n-tag',
      { type: getAbnormalTagType(row.trial.abnormalType), size: 'small' },
      () => ABNORMAL_TYPE_LABELS[row.trial.abnormalType as AbnormalType]
    )
  },
  {
    title: '异常原因',
    key: 'abnormalReason',
    ellipsis: { tooltip: true },
    render: (row) => row.trial.abnormalReason || '-'
  },
  {
    title: '井绳',
    key: 'ropeNo',
    width: 90,
    render: (row) => getRopeNo(row.schemeId, row.trial.ropeId)
  },
  {
    title: '汲桶',
    key: 'bucketNo',
    width: 90,
    render: (row) => getBucketNo(row.schemeId, row.trial.bucketId)
  },
  {
    title: '耗时',
    key: 'timeCost',
    width: 80,
    render: (row) => `${row.trial.timeCost}s`
  },
  {
    title: '漏水率',
    key: 'leakageRate',
    width: 80,
    render: (row) => `${row.trial.leakageRate}%`
  },
  {
    title: '记录时间',
    key: 'createdAt',
    width: 160,
    render: (row) => new Date(row.trial.createdAt).toLocaleString('zh-CN')
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(
      'button',
      {
        style: { padding: '0 10px', height: '28px', fontSize: '12px', borderRadius: '3px', border: '1px solid #2080f0', background: '#2080f0', color: '#fff', cursor: 'pointer' },
        onClick: () => handleReview(row)
      },
      '审查'
    )
  }
]

const historyColumns: DataTableColumns<any> = [
  {
    title: '方案名称',
    key: 'schemeName',
    width: 180
  },
  {
    title: '轮次',
    key: 'roundNo',
    width: 90,
    render: (row) => `第 ${row.trial.roundNo} 轮`
  },
  {
    title: '异常类型',
    key: 'abnormalType',
    width: 120,
    render: (row) => row.trial.abnormalType === 'none'
      ? h('n-tag', { type: 'success', size: 'small' }, () => '正常')
      : h('n-tag', { type: getAbnormalTagType(row.trial.abnormalType), size: 'small' }, () => ABNORMAL_TYPE_LABELS[row.trial.abnormalType as AbnormalType])
  },
  {
    title: '审查状态',
    key: 'reviewStatus',
    width: 100,
    render: (row) => h(
      'n-tag',
      { type: getReviewTagType(row.trial.reviewStatus), size: 'small' },
      () => REVIEW_STATUS_LABELS[row.trial.reviewStatus as ReviewStatus]
    )
  },
  {
    title: '审查人',
    key: 'reviewer',
    width: 100,
    render: (row) => row.trial.reviewer || '-'
  },
  {
    title: '审查意见',
    key: 'reviewComment',
    ellipsis: { tooltip: true },
    render: (row) => row.trial.reviewComment || '-'
  },
  {
    title: '审查时间',
    key: 'reviewedAt',
    width: 160,
    render: (row) => row.trial.reviewedAt ? new Date(row.trial.reviewedAt).toLocaleString('zh-CN') : '-'
  }
]
</script>
