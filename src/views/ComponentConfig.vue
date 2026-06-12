<template>
  <div v-if="scheme">
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <span style="font-size: 18px; font-weight: 600">构件配置 - {{ scheme.name }}</span>
            <n-tag
              :type="scheme.assemblyComplete ? 'success' : 'warning'"
              style="margin-left: 12px"
              size="large"
            >
              {{ scheme.assemblyComplete ? '✅ 装配完成' : '⏳ 装配未完成' }}
            </n-tag>
          </div>
          <n-space>
            <n-button type="default" @click="showMetaModal = true">方案设置</n-button>
            <n-button
              type="primary"
              :disabled="!scheme.assemblyComplete"
              @click="goToTrials"
            >
              进入汲水试验
            </n-button>
          </n-space>
        </div>
      </template>

      <n-space vertical :size="16" style="width: 100%">
        <n-alert type="info" :show-icon="true">
          装配完成条件：<b>井型配置</b> + <b>至少1个辘轳构件</b> + <b>至少1条井绳</b> + <b>至少1个汲桶</b>
        </n-alert>

        <n-space :size="16" align="start" style="flex-wrap: wrap; width: 100%">
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ scheme.wellConfig ? '✅' : '❌' }} 井型
            </n-tag>
            <div v-if="scheme.wellConfig" style="margin-top: 8px; font-size: 13px; color: #666">
              {{ wellTypeLabel }} · 深度{{ scheme.wellConfig.depth }}m · 直径{{ scheme.wellConfig.diameter }}m
            </div>
          </div>
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ scheme.components.length > 0 ? '✅' : '❌' }} 辘轳构件 ({{ scheme.components.length }})
            </n-tag>
          </div>
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ scheme.ropes.length > 0 ? '✅' : '❌' }} 井绳 ({{ scheme.ropes.length }})
            </n-tag>
          </div>
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ scheme.buckets.length > 0 ? '✅' : '❌' }} 汲桶 ({{ scheme.buckets.length }})
            </n-tag>
          </div>
        </n-space>
      </n-space>
    </n-card>

    <n-tabs type="line" animated>
      <n-tab-pane name="well" tab="🏗️ 井型配置">
        <WellConfigPanel />
      </n-tab-pane>
      <n-tab-pane name="components" tab="⚙️ 辘轳构件">
        <ComponentPanel />
      </n-tab-pane>
      <n-tab-pane name="ropes" tab="🪢 井绳配置">
        <RopePanel />
      </n-tab-pane>
      <n-tab-pane name="buckets" tab="🪣 汲桶配置">
        <BucketPanel />
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="showMetaModal" preset="card" title="方案设置" style="width: 520px">
      <n-form ref="metaFormRef" :model="metaForm" :rules="metaRules" label-placement="left" label-width="100px">
        <n-form-item label="方案名称" path="name">
          <n-input v-model:value="metaForm.name" />
        </n-form-item>
        <n-form-item label="方案描述" path="description">
          <n-input v-model:value="metaForm.description" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="总轮次" path="totalRounds">
          <n-input-number
            v-model:value="metaForm.totalRounds"
            :min="scheme.completedRounds || 1"
            :max="1000"
            style="width: 100%"
          />
          <span style="color: #999; font-size: 12px">已完成 {{ scheme.completedRounds }} 轮，不能低于已完成轮次</span>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showMetaModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveMeta">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import { WELL_TYPE_OPTIONS } from '@/types'
import WellConfigPanel from '@/components/WellConfigPanel.vue'
import ComponentPanel from '@/components/ComponentPanel.vue'
import RopePanel from '@/components/RopePanel.vue'
import BucketPanel from '@/components/BucketPanel.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const schemeStore = useSchemeStore()

const showMetaModal = ref(false)
const metaFormRef = ref()

const metaForm = ref({
  name: '',
  description: '',
  totalRounds: 10
})

const metaRules = {
  name: [
    { required: true, message: '请输入方案名称', trigger: 'blur' }
  ],
  totalRounds: [
    { required: true, type: 'number', min: 1, message: '至少1轮', trigger: 'change' }
  ]
}

const scheme = computed(() => schemeStore.currentScheme)
const schemeId = computed(() => route.params.id as string)

const wellTypeLabel = computed(() => {
  if (!scheme.value?.wellConfig) return ''
  const opt = WELL_TYPE_OPTIONS.find(o => o.value === scheme.value!.wellConfig!.type)
  return opt?.label || ''
})

onMounted(() => {
  schemeStore.setCurrentScheme(schemeId.value)
  if (scheme.value) {
    metaForm.value.name = scheme.value.name
    metaForm.value.description = scheme.value.description || ''
    metaForm.value.totalRounds = scheme.value.totalRounds
  }
})

watch(() => route.params.id, (id) => {
  schemeStore.setCurrentScheme(id as string)
})

function goToTrials() {
  if (!scheme.value) return
  if (!scheme.value.assemblyComplete) {
    message.warning('请先完成所有构件装配')
    return
  }
  router.push(`/scheme/${scheme.value.id}/trials`)
}

function handleSaveMeta() {
  metaFormRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      schemeStore.updateSchemeMeta(
        scheme.value.id,
        metaForm.value.name,
        metaForm.value.description,
        metaForm.value.totalRounds
      )
      message.success('保存成功')
      showMetaModal.value = false
    }
  })
}
</script>
