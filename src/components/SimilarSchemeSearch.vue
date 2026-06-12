<template>
  <div>
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 16px; font-weight: 600">相似方案检索</span>
          <n-space>
            <n-button
              v-if="currentScheme"
              size="small"
              type="default"
              @click="searchByCurrentScheme"
            >
              🔍 基于当前方案查找
            </n-button>
            <n-button size="small" type="default" @click="resetCriteria">重置</n-button>
          </n-space>
        </div>
      </template>

      <n-form
        :model="criteria"
        label-placement="left"
        label-width="100px"
        style="max-width: 100%"
      >
        <n-grid :cols="3" :x-gap="16" :y-gap="12">
          <n-form-item label="井型">
            <n-select
              v-model:value="criteria.wellType"
              :options="WELL_TYPE_OPTIONS"
              clearable
              placeholder="请选择井型"
            />
          </n-form-item>
          <n-form-item label="井绳材质">
            <n-select
              v-model:value="criteria.ropeMaterial"
              :options="ROPE_MATERIAL_OPTIONS"
              clearable
              placeholder="请选择井绳材质"
            />
          </n-form-item>
          <n-form-item label="汲桶材质">
            <n-select
              v-model:value="criteria.bucketMaterial"
              :options="BUCKET_MATERIAL_OPTIONS"
              clearable
              placeholder="请选择汲桶材质"
            />
          </n-form-item>
          <n-form-item label="构件类型">
            <n-select
              v-model:value="criteria.componentTypes"
              :options="COMPONENT_TYPE_OPTIONS"
              multiple
              clearable
              placeholder="请选择构件类型"
            />
          </n-form-item>
          <n-form-item label="最低效率">
            <n-input-number
              v-model:value="criteria.minEfficiency"
              :min="0"
              :max="10"
              :step="0.001"
              style="width: 100%"
              placeholder="L/s"
            />
          </n-form-item>
          <n-form-item label="最高异常率">
            <n-input-number
              v-model:value="criteria.maxAbnormalRate"
              :min="0"
              :max="100"
              :step="0.1"
              style="width: 100%"
              placeholder="%"
            />
          </n-form-item>
        </n-grid>
        <n-form-item style="margin-bottom: 0">
          <n-space>
            <n-button type="primary" @click="handleSearch">开始检索</n-button>
            <n-button type="default" @click="handleRecommendOptimal">智能推荐最优方案</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>

    <n-card v-if="optimalScheme" style="margin-bottom: 16px" bordered>
      <template #header>
        <div style="display: flex; align-items: center; gap: 8px">
          <span style="font-size: 18px; font-weight: 600; color: #18a058">🏆 最优方案推荐</span>
          <n-tag type="success" size="small">综合评分最高</n-tag>
        </div>
      </template>

      <div style="display: flex; gap: 24px; flex-wrap: wrap">
        <n-statistic
          label="方案名称"
          :value="optimalScheme.schemeName"
          value-style="font-size: 16px; color: #2080f0; cursor: pointer"
          @click="goToTrials(optimalScheme.schemeId)"
        />
        <n-statistic
          label="相似度"
          :value="optimalScheme.similarity"
          suffix="%"
          value-style="color: #18a058"
        />
        <n-statistic
          label="平均效率"
          :value="Number(optimalScheme.avgEfficiency.toFixed(3))"
          suffix="L/s"
          value-style="color: #18a058"
        />
        <n-statistic
          label="异常率"
          :value="Number(optimalScheme.abnormalRate.toFixed(1))"
          suffix="%"
          :value-style="{ color: optimalScheme.abnormalRate > 20 ? '#d03050' : '#f0a020' }"
        />
      </div>

      <n-divider style="margin: 12px 0" />

      <n-space vertical :size="8" style="width: 100%">
        <div>
          <span style="font-weight: 600; margin-right: 8px">关键特征：</span>
          <n-tag
            v-for="(feat, idx) in optimalScheme.keyFeatures"
            :key="idx"
            size="small"
            style="margin-right: 6px"
          >
            {{ feat }}
          </n-tag>
        </div>
        <div>
          <span style="font-weight: 600; margin-right: 8px">推荐理由：</span>
          <span style="color: #666">{{ optimalScheme.reason }}</span>
        </div>
        <div style="margin-top: 8px">
          <n-button type="primary" size="small" @click="goToTrials(optimalScheme.schemeId)">
            查看试验记录 →
          </n-button>
        </div>
      </n-space>
    </n-card>

    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">
            检索结果
            <n-tag v-if="recommendations.length > 0" type="info" style="margin-left: 8px">
              共 {{ recommendations.length }} 条
            </n-tag>
          </span>
          <span v-if="targetSchemeId" style="color: #999; font-size: 13px">
            基于「{{ currentScheme?.name }}」查找相似方案
          </span>
        </div>
      </template>

      <n-alert v-if="recommendations.length === 0 && hasSearched" type="info" :show-icon="true">
        暂无符合条件的方案，请尝试调整筛选条件。
      </n-alert>

      <n-data-table
        v-else
        :columns="columns"
        :data="recommendations"
        :row-key="(row: any) => row.id"
        :pagination="{ pageSize: 10 }"
        size="small"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, type DataTableColumns, type TagProps } from 'naive-ui'
import { useKnowledgeGraphStore } from '@/stores/knowledgeGraph'
import { useSchemeStore } from '@/stores/scheme'
import {
  WELL_TYPE_OPTIONS,
  ROPE_MATERIAL_OPTIONS,
  BUCKET_MATERIAL_OPTIONS,
  COMPONENT_TYPE_OPTIONS,
  type SimilarSchemeSearchCriteria,
  type SchemeRecommendation,
  type WellType,
  type RopeMaterial,
  type BucketMaterial,
  type ComponentType
} from '@/types'

const knowledgeGraphStore = useKnowledgeGraphStore()
const schemeStore = useSchemeStore()
const router = useRouter()
const message = useMessage()

const currentScheme = computed(() => schemeStore.currentScheme)

const criteria = ref<SimilarSchemeSearchCriteria>({
  wellType: undefined as WellType | undefined,
  ropeMaterial: undefined as RopeMaterial | undefined,
  bucketMaterial: undefined as BucketMaterial | undefined,
  componentTypes: [] as ComponentType[],
  minEfficiency: undefined,
  maxAbnormalRate: undefined
})

const recommendations = ref<SchemeRecommendation[]>([])
const optimalScheme = ref<SchemeRecommendation | null>(null)
const targetSchemeId = ref<string | null>(null)
const hasSearched = ref(false)

const columns: DataTableColumns<SchemeRecommendation> = [
  {
    title: '方案名称',
    key: 'schemeName',
    width: 180,
    render: (row) => h(
      'span',
      {
        style: {
          color: '#2080f0',
          cursor: 'pointer',
          fontWeight: 500
        },
        onClick: () => goToTrials(row.schemeId)
      },
      row.schemeName
    )
  },
  {
    title: '相似度',
    key: 'similarity',
    width: 100,
    render: (row) => {
      const color = row.similarity >= 80 ? '#18a058' : row.similarity >= 60 ? '#f0a020' : '#d03050'
      return h(
        'span',
        { style: { color, fontWeight: 600 } },
        `${row.similarity}%`
      )
    }
  },
  {
    title: '平均效率',
    key: 'avgEfficiency',
    width: 110,
    render: (row) => h(
      'span',
      { style: { color: '#18a058', fontWeight: 500 } },
      `${row.avgEfficiency.toFixed(3)} L/s`
    )
  },
  {
    title: '异常率',
    key: 'abnormalRate',
    width: 100,
    render: (row) => {
      const type: TagProps['type'] = row.abnormalRate > 20 ? 'error' : row.abnormalRate > 10 ? 'warning' : 'success'
      return h(
        'n-tag',
        { type, size: 'small' },
        () => `${row.abnormalRate.toFixed(1)}%`
      )
    }
  },
  {
    title: '关键特征',
    key: 'keyFeatures',
    minWidth: 240,
    render: (row) => h(
      'div',
      { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
      row.keyFeatures.slice(0, 3).map((feat, idx) => h(
        'n-tag',
        { key: idx, size: 'small', type: 'info' },
        () => feat
      ))
    )
  },
  {
    title: '推荐理由',
    key: 'reason',
    minWidth: 160,
    ellipsis: { tooltip: true }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(
      'button',
      {
        style: {
          padding: '0 12px',
          height: '28px',
          fontSize: '12px',
          borderRadius: '3px',
          border: '1px solid #2080f0',
          background: '#fff',
          color: '#2080f0',
          cursor: 'pointer'
        },
        onClick: () => goToTrials(row.schemeId)
      },
      '查看详情'
    )
  }
]

function resetCriteria() {
  criteria.value = {
    wellType: undefined,
    ropeMaterial: undefined,
    bucketMaterial: undefined,
    componentTypes: [],
    minEfficiency: undefined,
    maxAbnormalRate: undefined
  }
  targetSchemeId.value = null
  recommendations.value = []
  optimalScheme.value = null
  hasSearched.value = false
}

function handleSearch() {
  hasSearched.value = true
  const searchCriteria: SimilarSchemeSearchCriteria = {
    wellType: criteria.value.wellType,
    ropeMaterial: criteria.value.ropeMaterial,
    bucketMaterial: criteria.value.bucketMaterial,
    componentTypes: criteria.value.componentTypes && criteria.value.componentTypes.length > 0
      ? criteria.value.componentTypes
      : undefined,
    minEfficiency: criteria.value.minEfficiency,
    maxAbnormalRate: criteria.value.maxAbnormalRate
  }
  recommendations.value = knowledgeGraphStore.searchSimilarSchemes(
    searchCriteria,
    targetSchemeId.value || undefined
  )
  if (recommendations.value.length > 0) {
    message.success(`找到 ${recommendations.value.length} 条相似方案`)
  } else {
    message.info('未找到符合条件的方案')
  }
}

function searchByCurrentScheme() {
  if (!currentScheme.value) {
    message.warning('当前没有选中的方案')
    return
  }
  targetSchemeId.value = currentScheme.value.id
  criteria.value = {
    wellType: currentScheme.value.wellConfig?.type,
    ropeMaterial: currentScheme.value.ropes[0]?.material,
    bucketMaterial: currentScheme.value.buckets[0]?.material,
    componentTypes: [...new Set(currentScheme.value.components.map(c => c.type))],
    minEfficiency: undefined,
    maxAbnormalRate: undefined
  }
  handleSearch()
}

function handleRecommendOptimal() {
  hasSearched.value = true
  const searchCriteria: SimilarSchemeSearchCriteria = {
    wellType: criteria.value.wellType,
    ropeMaterial: criteria.value.ropeMaterial,
    bucketMaterial: criteria.value.bucketMaterial,
    componentTypes: criteria.value.componentTypes && criteria.value.componentTypes.length > 0
      ? criteria.value.componentTypes
      : undefined,
    minEfficiency: criteria.value.minEfficiency,
    maxAbnormalRate: criteria.value.maxAbnormalRate
  }
  optimalScheme.value = knowledgeGraphStore.recommendOptimalScheme(searchCriteria)
  recommendations.value = knowledgeGraphStore.searchSimilarSchemes(
    searchCriteria,
    targetSchemeId.value || undefined
  )
  if (optimalScheme.value) {
    message.success('已为您推荐最优方案')
  } else {
    message.info('暂无可推荐的方案')
  }
}

function goToTrials(schemeId: string) {
  schemeStore.setCurrentScheme(schemeId)
  router.push(`/scheme/${schemeId}/trials`)
}
</script>
