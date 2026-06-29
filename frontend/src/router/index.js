import { createRouter, createWebHistory } from 'vue-router'
import {
  getActiveSecurityCode,
  hasSecurityCode,
  isSessionVerified
} from '../composables/useSecurityCode'
import Wealth from '../pages/wealth/Wealth.vue'

const DEFAULT_PROTECTED_PATH = '/wealth'

const routes = [
  { path: '/', redirect: DEFAULT_PROTECTED_PATH },
  {
    path: '/wealth',
    name: 'wealth',
    component: Wealth,
    meta: { requiresAuth: true }
  },
  {
    path: '/passwords',
    name: 'passwords',
    component: () => import('../pages/passwords/Passwords.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/settings/Settings.vue'),
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

function redirectQuery(to) {
  return to.fullPath || DEFAULT_PROTECTED_PATH
}

router.beforeEach((to) => {
  const hasCode = hasSecurityCode()
  const verified = isSessionVerified()

  if (to.name === 'security-setup') {
    if (!hasCode) return true
    return verified
      ? { path: DEFAULT_PROTECTED_PATH }
      : { path: '/security/verify', query: { redirect: to.query.redirect || DEFAULT_PROTECTED_PATH } }
  }

  if ((to.name === 'security-verify' || to.name === 'security-risk') && !hasCode) {
    return { path: '/security/setup', query: { redirect: to.query.redirect || DEFAULT_PROTECTED_PATH } }
  }

  if (!to.meta.requiresAuth) return true

  if (!hasCode) {
    return { path: '/security/setup', query: { redirect: redirectQuery(to) } }
  }

  if (!verified) {
    return { path: '/security/verify', query: { redirect: redirectQuery(to) } }
  }

  // 密码本需要安全码原文派生 AES key；原文只活在内存里，刷新页面后内存清空。
  // 这时即使 sessionStorage 标记还在，也得回 verify 拿一次原文。
  if (to.name === 'passwords' && !getActiveSecurityCode()) {
    return { path: '/security/verify', query: { redirect: redirectQuery(to) } }
  }

  return true
})

export default router
