<script setup>
/**
 * App 外壳 — 顶栏 + 主题切换 + 当前路由内容槽位
 *
 * 页面内容由 vue-router 渲染。需要安全保护的页面在 router 里配置
 * meta.requiresAuth，统一走安全码门禁。
 */
import { RouterView } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 顶栏 -->
    <header class="px-4 py-4 sm:px-8 sm:py-6">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500
                      flex items-center justify-center text-white text-lg shadow-lg shadow-primary-500/30">
            💰
          </div>
          <div>
            <h1 class="text-lg font-bold">我的财富</h1>
            <p class="text-xs text-ink-400">My Wealth</p>
          </div>
        </div>
        <div class="text-xs text-ink-400 text-right flex items-center gap-3">
          <div class="hidden sm:block">
            <div>{{ new Date().toLocaleDateString('zh-CN', { weekday: 'long' }) }}</div>
            <div>{{ new Date().toLocaleDateString('zh-CN') }}</div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="flex-1 px-4 sm:px-8 pb-12">
      <div class="max-w-4xl mx-auto">
        <RouterView />
      </div>
    </main>
  </div>
</template>
