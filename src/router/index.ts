import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/schemes'
  },
  {
    path: '/schemes',
    name: 'Schemes',
    component: () => import('@/views/SchemeManager.vue')
  },
  {
    path: '/scheme/:id/config',
    name: 'SchemeConfig',
    component: () => import('@/views/ComponentConfig.vue')
  },
  {
    path: '/scheme/:id/trials',
    name: 'Trials',
    component: () => import('@/views/TrialRecord.vue')
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('@/views/DataAnalysis.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
