<template>
  <n-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>井型参数</span>
        <n-button
          v-if="scheme && scheme.wellConfig"
          size="small"
          type="default"
          @click="resetForm"
        >
          重置
        </n-button>
      </div>
    </template>

    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-placement="left"
      label-width="120px"
      style="max-width: 640px"
    >
      <n-form-item label="井型" path="type">
        <n-select v-model:value="form.type" :options="WELL_TYPE_OPTIONS" placeholder="请选择井型" />
      </n-form-item>
      <n-form-item label="井深 (米)" path="depth">
        <n-input-number v-model:value="form.depth" :min="0.1" :max="1000" :step="0.1" style="width: 100%" />
      </n-form-item>
      <n-form-item label="井口直径 (米)" path="diameter">
        <n-input-number v-model:value="form.diameter" :min="0.1" :max="50" :step="0.1" style="width: 100%" />
      </n-form-item>
      <n-form-item label="水位深度 (米)" path="waterLevel">
        <n-input-number v-model:value="form.waterLevel" :min="0" :max="1000" :step="0.1" style="width: 100%" />
        <span style="color: #999; font-size: 12px">地面到水面的距离</span>
      </n-form-item>
      <n-form-item label="井壁材质" path="wallMaterial">
        <n-select
          v-model:value="form.wallMaterial"
          clearable
          :options="[
            { label: '石砌', value: 'stone' },
            { label: '砖砌', value: 'brick' },
            { label: '陶圈', value: 'ceramic' },
            { label: '土井', value: 'earth' },
            { label: '木构', value: 'wood' }
          ]"
          placeholder="可选"
        />
      </n-form-item>
      <n-form-item>
        <n-space>
          <n-button type="primary" @click="handleSave">保存井型配置</n-button>
          <n-button v-if="scheme && scheme.wellConfig" type="default" @click="handleClear">清除配置</n-button>
        </n-space>
      </n-form-item>
    </n-form>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import { WELL_TYPE_OPTIONS, type WellConfig } from '@/types'

const schemeStore = useSchemeStore()
const message = useMessage()

const formRef = ref()

const scheme = computed(() => schemeStore.currentScheme)

const form = ref<WellConfig>({
  type: 'cylindrical',
  depth: 10,
  diameter: 1,
  waterLevel: 8,
  wallMaterial: undefined
})

const rules = {
  type: [{ required: true, message: '请选择井型', trigger: 'change' }],
  depth: [
    { required: true, type: 'number', message: '请输入井深', trigger: 'blur' },
    { type: 'number', min: 0.1, message: '井深应大于 0', trigger: 'blur' }
  ],
  diameter: [
    { required: true, type: 'number', message: '请输入井口直径', trigger: 'blur' },
    { type: 'number', min: 0.1, message: '直径应大于 0', trigger: 'blur' }
  ],
  waterLevel: [
    { required: true, type: 'number', message: '请输入水位深度', trigger: 'blur' },
    { type: 'number', min: 0, message: '水位不能为负', trigger: 'blur' }
  ]
}

onMounted(() => {
  if (scheme.value?.wellConfig) {
    Object.assign(form.value, scheme.value.wellConfig)
  }
})

watch(() => scheme.value?.wellConfig, (cfg) => {
  if (cfg) Object.assign(form.value, cfg)
})

function resetForm() {
  if (scheme.value?.wellConfig) {
    Object.assign(form.value, scheme.value.wellConfig)
    message.info('已还原为已保存的配置')
  }
}

function handleSave() {
  formRef.value?.validate((errors: any) => {
    if (!errors && scheme.value) {
      schemeStore.updateWellConfig(scheme.value.id, { ...form.value })
      message.success('井型配置已保存')
    }
  })
}

function handleClear() {
  if (scheme.value) {
    schemeStore.updateWellConfig(scheme.value.id, null)
    message.info('井型配置已清除')
  }
}
</script>
