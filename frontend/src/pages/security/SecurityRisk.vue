<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function retry() {
  router.replace({
    path: '/security/verify',
    query: { redirect: String(route.query.redirect || '/wealth') }
  })
}
</script>

<template>
  <div class="card max-w-md mx-auto p-6 sm:p-8 animate-slide-up text-center">
    <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500
                flex items-center justify-center text-2xl mx-auto mb-4">
      ⚠️
    </div>
    <h2 class="text-xl font-bold">安全验证失败</h2>
    <p class="text-sm text-ink-500 dark:text-ink-400 mt-3">
      安全码不一致。为保护本地数据，已阻止访问。
    </p>
    <button @click="retry" class="btn-primary mt-6">
      重新输入
    </button>
  </div>
</template>
