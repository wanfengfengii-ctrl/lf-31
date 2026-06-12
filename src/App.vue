<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <n-layout style="min-height: 100vh">
          <n-layout-header style="height: 64px; background: #1e3a5f; display: flex; align-items: center; padding: 0 24px">
            <div style="color: #fff; font-size: 20px; font-weight: 600; flex: 1">
              🏺 古井辘轳汲水复原试验系统
            </div>
            <n-space>
              <n-button v-if="showBackBtn" @click="goBack" quaternary style="color: #fff; border-color: #fff">
                返回
              </n-button>
            </n-space>
          </n-layout-header>
          <n-layout has-sider style="min-height: calc(100vh - 64px)">
            <n-layout-sider
              width="200"
              :collapsed-width="64"
              :collapsed="collapsed"
              show-trigger
              :collapse-mode="'width'"
              bordered
            >
              <n-menu
                :collapsed-width="64"
                :collapsed="collapsed"
                :collapsed-icon-size="22"
                :options="menuOptions"
                :value="activeMenu"
                @update:value="handleMenuClick"
              />
            </n-layout-sider>
            <n-layout-content content-style="padding: 24px">
              <router-view v-slot="{ Component }">
                <component :is="Component" />
              </router-view>
            </n-layout-content>
          </n-layout>
        </n-layout>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { MenuOption } from 'naive-ui'

const collapsed = ref(false)
const router = useRouter()
const route = useRoute()

const activeMenu = ref('schemes')

const menuOptions: MenuOption[] = [
  {
    label: '方案管理',
    key: 'schemes',
    icon: () => '📋'
  },
  {
    label: '试验模板',
    key: 'templates',
    icon: () => '📑'
  },
  {
    label: '审查中心',
    key: 'review',
    icon: () => '🔍'
  },
  {
    label: '分析中心',
    key: 'analysis',
    icon: () => '📊'
  }
]

const showBackBtn = computed(() => {
  return route.name === 'SchemeConfig' || route.name === 'Trials' || route.name === 'TemplateConfig'
})

watch(route, () => {
  if (route.path.startsWith('/scheme/')) {
    activeMenu.value = 'schemes'
  } else if (route.path.startsWith('/template/')) {
    activeMenu.value = 'templates'
  } else if (route.path === '/templates') {
    activeMenu.value = 'templates'
  } else if (route.path === '/review') {
    activeMenu.value = 'review'
  } else if (route.path === '/analysis') {
    activeMenu.value = 'analysis'
  } else {
    activeMenu.value = 'schemes'
  }
}, { immediate: true })

function handleMenuClick(key: string | number) {
  if (key === 'schemes') {
    router.push('/schemes')
  } else if (key === 'templates') {
    router.push('/templates')
  } else if (key === 'review') {
    router.push('/review')
  } else if (key === 'analysis') {
    router.push('/analysis')
  }
}

function goBack() {
  if (route.name === 'TemplateConfig') {
    router.push('/templates')
  } else {
    router.push('/schemes')
  }
}
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
#app {
  min-height: 100vh;
}
</style>
