<script setup>
/**
 * App 外壳 — 顶栏 + 主题切换 + 当前页内容槽位
 *
 * 现在只渲染财富页（Wealth）。后续加新页面有两种走法：
 *   1) 简单：在这里加个 ref('wealth') 切 + 顶栏切换按钮，import 多个 page 组件
 *   2) 正经：等页面 ≥3 个、需要 URL 直达时再上 vue-router
 * 一个页面的时候不用提前折腾，留好 pages/ 目录就够了。
 */
import ThemeToggle from './components/ThemeToggle.vue'
import Wealth from './pages/Wealth.vue'
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
        <Wealth />
      </div>
    </main>
  </div>
</template>
