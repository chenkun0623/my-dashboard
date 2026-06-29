<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { markSessionVerified, normalizeCodeInput, verifySecurityCode } from '../../composables/useSecurityCode'

const route = useRoute()
const router = useRouter()
const code = ref('')
const error = ref('')
const checking = ref(false)

function redirectTarget() {
  return String(route.query.redirect || '/wealth')
}

function onInput(value) {
  code.value = normalizeCodeInput(value)
  error.value = ''
}

async function submit() {
  if (checking.value) return
  checking.value = true
  error.value = ''
  const result = await verifySecurityCode(code.value)
  if (result.ok) {
    markSessionVerified()
    await router.replace(redirectTarget())
    return
  }
  if (result.error === '安全码不一致') {
    await router.replace({ path: '/security/risk', query: { redirect: redirectTarget() } })
    return
  }
  error.value = result.error || '安全码验证失败'
  checking.value = false
}
</script>

<template>
  <div class="card max-w-md mx-auto p-6 sm:p-8 animate-slide-up">
    <div class="text-center mb-6">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500
                  flex items-center justify-center text-white text-xl mx-auto mb-3
                  shadow-lg shadow-primary-500/30">
        🔑
      </div>
      <h2 class="text-xl font-bold">验证安全码</h2>
      <p class="text-sm text-ink-400 mt-2">
        请输入 6 位安全码以访问面板。
      </p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm text-ink-400 mb-1.5">6 位安全码</label>
        <input
          :value="code"
          type="password"
          inputmode="numeric"
          maxlength="6"
          autocomplete="current-password"
          class="input w-full text-center text-2xl tracking-[0.4em] font-mono"
          placeholder="••••••"
          autofocus
          @input="onInput($event.target.value)"
          @keydown.enter="submit"
        />
        <p v-if="error" class="text-sm text-rose-400 mt-2">{{ error }}</p>
      </div>

      <button
        @click="submit"
        class="btn-primary w-full"
        :disabled="checking || code.length !== 6"
        :class="(checking || code.length !== 6) ? 'opacity-60 cursor-not-allowed' : ''"
      >
        {{ checking ? '验证中...' : '进入' }}
      </button>
    </div>
  </div>
</template>
