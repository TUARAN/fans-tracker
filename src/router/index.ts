import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '首页',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/dashboard',
      redirect: '/'
    },
    {
      path: '/plan/:platform/:account',
      name: '平台计划',
      component: () => import('@/views/PlatformPlanView.vue')
    },
    {
      path: '/creation',
      name: '创作与分发',
      component: () => import('@/views/CreationView.vue')
    }
  ],
})

export default router
