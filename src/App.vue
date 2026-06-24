<script setup>
/**
 * App 外壳 — 顶栏 + 主题切换 + 当前路由内容槽位
 *
 * 受保护页面通过路由元数据 meta.requiresAuth 走安全码门禁，
 * 这里再额外提供「我的财富 / 密码本」两个 tab 在受保护路由间切换。
 *
 * 顶栏左侧的图标 / 标题 / 英文副标题会跟着当前路由变；安全页面用默认外壳。
 */
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'

const route = useRoute()
const showTabs = computed(() => Boolean(route.meta?.requiresAuth))

// 路由名 -> 顶栏品牌
const BRANDS = {
  wealth:    { emoji: '💰', title: '我的财富', subtitle: 'My Wealth' },
  passwords: { emoji: '🔐', title: '密码本',   subtitle: 'My Passwords' }
}
const DEFAULT_BRAND = BRANDS.wealth

const brand = computed(() => BRANDS[route.name] || DEFAULT_BRAND)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 顶栏 -->
    <header class="px-4 py-4 sm:px-8 sm:py-6">
      <div class="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500
                      flex items-center justify-center text-white text-lg shadow-lg shadow-primary-500/30
                      shrink-0">
            {{ brand.emoji }}
          </div>
          <div class="min-w-0">
            <h1 class="text-lg font-bold truncate">{{ brand.title }}</h1>
            <p class="text-xs text-ink-400 hidden sm:block">{{ brand.subtitle }}</p>
          </div>
        </div>

        <nav v-if="showTabs" class="flex items-center gap-1 text-sm">
          <router-link
            to="/wealth"
            class="px-3 py-1.5 border-b-2 transition-colors"
            :class="route.name === 'wealth'
              ? 'text-primary-500 border-primary-500'
              : 'text-ink-400 border-transparent hover:text-ink-600 dark:hover:text-ink-200'"
          >
            我的财富
          </router-link>
          <router-link
            to="/passwords"
            class="px-3 py-1.5 border-b-2 transition-colors"
            :class="route.name === 'passwords'
              ? 'text-primary-500 border-primary-500'
              : 'text-ink-400 border-transparent hover:text-ink-600 dark:hover:text-ink-200'"
          >
            密码本
          </router-link>
        </nav>

        <div class="text-xs text-ink-400 text-right flex items-center gap-3 shrink-0">
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
