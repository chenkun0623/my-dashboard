<script setup>
import { ref } from 'vue'
import { API_BASE_URL, healthCheck } from '../../utils/api'

const healthStatus = ref('未检测')
const healthError = ref('')

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
</script>

<template>
  <div class="space-y-6">
    <div class="card p-6 sm:p-8 animate-slide-up">
      <h2 class="text-lg font-bold flex items-center gap-2">⚙️ 后端设置</h2>
      <p class="text-sm text-ink-400 mt-2">
        本地 NestJS API + PostgreSQL，登录认证功能暂未接入。
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
  </div>
</template>
