<script setup>
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

const { theme, toggle } = useTheme()

// 显示哪个图标 + 标题
const display = computed(() => {
  if (theme.value === 'light') return { icon: '☀️', title: '浅色模式（点击切到深色）' }
  if (theme.value === 'dark') return { icon: '🌙', title: '深色模式（点击切到跟随系统）' }
  return { icon: '🖥️', title: '跟随系统（点击切到浅色）' }
})
</script>

<template>
  <button
    @click="toggle"
    :title="display.title"
    class="btn-ghost !p-2 !w-9 !h-9 text-base"
  >
    <span class="transition-transform duration-300" :key="theme">{{ display.icon }}</span>
  </button>
</template>