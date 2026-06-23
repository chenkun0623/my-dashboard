import { createRouter, createWebHistory } from 'vue-router'
import Wealth from '../pages/wealth/Wealth.vue'

const routes = [
  { path: '/', redirect: '/wealth' },
  {
    path: '/wealth',
    name: 'wealth',
    component: Wealth,
    meta: { requiresAuth: true }
  },
  {
    path: '/security/setup',
    name: 'security-setup',
    component: () => import('../pages/security/SetupCode.vue'),
    meta: { public: true }
  },
  {
    path: '/security/verify',
    name: 'security-verify',
    component: () => import('../pages/security/VerifyCode.vue'),
    meta: { public: true }
  },
  {
    path: '/security/risk',
    name: 'security-risk',
    component: () => import('../pages/security/SecurityRisk.vue'),
    meta: { public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
