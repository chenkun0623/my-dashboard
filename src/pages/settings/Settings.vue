<script setup>
import { onMounted, ref } from 'vue'
import {
  API_BASE_URL,
  clearApiToken,
  devWechatLogin,
  getApiToken,
  getCurrentUser,
  healthCheck,
  setApiToken
} from '../../utils/api'

const healthStatus = ref('未检测')
const healthError = ref('')
const loginError = ref('')
const currentUser = ref(null)
const token = ref(getApiToken())

const mockOpenId = ref('dev-openid-chenkun')
const nickname = ref('chenkun')
const avatarUrl = ref('')

async function checkHealth() {
  healthError.value = ''
  healthStatus.value = '检测中...'
  try {
    await healthCheck()
    healthStatus.value = '已连接'
  } catch (err) {
    healthStatus.value = '连接失败'
    healthError.value = err?.message || '后端连接失败'
  }
}

async function loadMe() {
  if (!getApiToken()) {
    currentUser.value = null
    return
  }
  try {
    currentUser.value = await getCurrentUser()
  } catch (err) {
    loginError.value = err?.message || '获取当前用户失败'
    currentUser.value = null
  }
}

async function login() {
  loginError.value = ''
  try {
    const result = await devWechatLogin({
      mockOpenId: mockOpenId.value,
      nickname: nickname.value,
      avatarUrl: avatarUrl.value
    })
    setApiToken(result.accessToken)
    token.value = result.accessToken
    currentUser.value = result.user
  } catch (err) {
    loginError.value = err?.message || '登录失败'
  }
}

function logout() {
  clearApiToken()
  token.value = null
  currentUser.value = null
}

onMounted(() => {
  loadMe()
})
</script>

<template>
  <div class="space-y-6">
    <div class="card p-6 sm:p-8 animate-slide-up">
      <h2 class="text-lg font-bold flex items-center gap-2">⚙️ 后端设置</h2>
      <p class="text-sm text-ink-400 mt-2">
        第一阶段：本地 NestJS API + PostgreSQL + mock 微信登录。
      </p>
    </div>

    <div class="card p-6 animate-slide-up" style="animation-delay: 80ms">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="font-bold">后端连接</h3>
          <p class="text-xs text-ink-400 font-mono mt-1">{{ API_BASE_URL }}</p>
        </div>
        <button class="btn-primary text-xs" @click="checkHealth">检测连接</button>
      </div>
      <p class="text-sm" :class="healthStatus === '已连接' ? 'text-success-400' : healthStatus === '连接失败' ? 'text-rose-400' : 'text-ink-400'">
        状态：{{ healthStatus }}
      </p>
      <p v-if="healthError" class="text-sm text-rose-400 mt-2">{{ healthError }}</p>
    </div>

    <div class="card p-6 animate-slide-up" style="animation-delay: 120ms">
      <h3 class="font-bold mb-4">模拟微信登录</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs text-ink-400 mb-1">mockOpenId</label>
          <input v-model="mockOpenId" class="input w-full font-mono" type="text" />
        </div>
        <div>
          <label class="block text-xs text-ink-400 mb-1">nickname</label>
          <input v-model="nickname" class="input w-full" type="text" />
        </div>
        <div>
          <label class="block text-xs text-ink-400 mb-1">avatarUrl</label>
          <input v-model="avatarUrl" class="input w-full font-mono" type="text" placeholder="可空" />
        </div>
        <p v-if="loginError" class="text-sm text-rose-400">{{ loginError }}</p>
        <div class="flex items-center gap-2">
          <button class="btn-primary" @click="login">登录</button>
          <button v-if="token" class="btn-ghost" @click="logout">退出登录</button>
        </div>
      </div>
    </div>

    <div class="card p-6 animate-slide-up" style="animation-delay: 160ms">
      <h3 class="font-bold mb-4">当前登录状态</h3>
      <div v-if="currentUser" class="space-y-2 text-sm">
        <div><span class="text-ink-400">id：</span><span class="font-mono">{{ currentUser.id }}</span></div>
        <div><span class="text-ink-400">openid：</span><span class="font-mono">{{ currentUser.wechatOpenId }}</span></div>
        <div><span class="text-ink-400">nickname：</span>{{ currentUser.nickname || '-' }}</div>
        <div><span class="text-ink-400">avatarUrl：</span><span class="font-mono break-all">{{ currentUser.avatarUrl || '-' }}</span></div>
      </div>
      <p v-else class="text-sm text-ink-400">尚未登录后端。</p>
    </div>
  </div>
</template>
