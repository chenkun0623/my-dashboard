<script setup>
import { ref, computed } from 'vue'
import { useBalance } from './composables/useBalance'
import Modal from './components/Modal.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import TrendChart from './components/TrendChart.vue'

const {
  balance,
  history,
  progress,
  remaining,
  reached,
  stage,
  updateCurrent,
  updateTarget,
  deleteHistory
} = useBalance()

// 弹窗状态
const showEditAmount = ref(false)
const showEditTarget = ref(false)
const editAmountValue = ref(0)
const editTargetValue = ref(0)

function openEditAmount() {
  editAmountValue.value = balance.value.current
  showEditAmount.value = true
}

function openEditTarget() {
  editTargetValue.value = balance.value.target
  showEditTarget.value = true
}

function saveAmount() {
  const v = Number(editAmountValue.value)
  if (isNaN(v) || v < 0) return
  updateCurrent(v)
  showEditAmount.value = false
}

function saveTarget() {
  const v = Number(editTargetValue.value)
  if (isNaN(v) || v <= 0) return
  updateTarget(v)
  showEditTarget.value = false
}

// 格式化数字
function fmt(n) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

function fmtDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 鼓励语 — 跟阶段挂钩
const encourage = computed(() => {
  const messages = {
    0: '🌱 起步阶段，每一步都算数',
    1: '🌊 已经上路，稳住节奏',
    2: '💪 已过半程，曙光在前',
    3: '🔥 冲刺阶段，再加把劲',
    4: '🎉 目标达成！可以设个新目标了'
  }
  return messages[stage.value.level]
})
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
            <h1 class="text-lg font-bold">我的面板</h1>
            <p class="text-xs text-ink-400">Personal Dashboard</p>
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
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- 余额卡片 -->
        <div class="card-glow p-6 sm:p-8 animate-slide-up">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm text-ink-400 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-success-500 animate-pulse-slow" />
              我的余额
            </div>
            <button @click="openEditAmount" class="btn-ghost !p-1.5"
                    title="更新当前金额">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl text-ink-400">{{ balance.currency }}</span>
            <span
              class="text-5xl sm:text-6xl font-bold tracking-tight font-mono
                     bg-clip-text text-transparent transition-all duration-500"
              :style="{
                backgroundImage: `linear-gradient(to right, ${stage.gradFrom}, ${stage.gradVia}, ${stage.gradTo})`
              }"
            >
              {{ fmt(balance.current) }}
            </span>
          </div>
          <p v-if="history.length > 0 && history[0].change !== 0"
             class="mt-2 text-sm"
             :class="history[0].change > 0 ? 'text-success-400' : 'text-rose-400'">
            <span v-if="history[0].change > 0">↑</span><span v-else>↓</span>
            {{ balance.currency }}{{ fmt(Math.abs(history[0].change)) }}
            <span class="text-ink-400 ml-1">较上次</span>
          </p>
        </div>

        <!-- 目标进度卡片 -->
        <div class="card p-6 sm:p-8 animate-slide-up" style="animation-delay: 80ms">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="text-sm text-ink-400 mb-1">🎯 目标</div>
              <div class="text-2xl font-bold">
                {{ balance.currency }}{{ fmt(balance.target) }}
              </div>
            </div>
            <button @click="openEditTarget" class="btn-ghost text-xs">
              ⚙️ 设置目标
            </button>
          </div>

          <!-- 进度条 -->
          <div class="mb-3">
            <div class="flex justify-between text-xs mb-2">
              <span class="text-ink-400 flex items-center gap-1.5">
                <span>进度</span>
                <span :class="stage.textCls"
                      class="font-medium px-1.5 py-0.5 rounded transition-colors"
                      :style="{ backgroundColor: stage.hex + '20' }">
                  {{ stage.emoji }} {{ stage.label }}
                </span>
              </span>
              <span class="font-mono font-bold transition-colors"
                    :class="stage.textCls">
                {{ progress.toFixed(1) }}%
              </span>
            </div>
            <div class="h-3 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden relative">
              <div
                class="h-full rounded-full transition-all duration-700 ease-out relative"
                :style="{
                  width: progress + '%',
                  backgroundImage: `linear-gradient(to right, ${stage.gradFrom}, ${stage.gradVia}, ${stage.gradTo})`,
                  boxShadow: `0 0 12px ${stage.hex}66`
                }"
              >
                <!-- 流光效果 -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent
                            animate-pulse-slow" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="text-ink-500 dark:text-ink-400">
              还差
              <span class="text-ink-900 dark:text-ink-50 font-mono font-medium">
                {{ balance.currency }}{{ fmt(remaining) }}
              </span>
            </div>
            <div class="text-right transition-colors" :class="stage.textCls">
              {{ encourage }}
            </div>
          </div>
        </div>

        <!-- 趋势图卡片 -->
        <div class="card p-6 animate-slide-up" style="animation-delay: 120ms">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold flex items-center gap-2">
              📊 余额趋势
            </h2>
            <span class="text-xs text-ink-400">悬浮查看</span>
          </div>
          <TrendChart
            :data="history"
            :target="balance.target"
            :currency="balance.currency"
            :color="stage.hex"
            :color-light="stage.hexLight"
          />
        </div>

        <!-- 历史记录 -->
        <div class="card p-6 animate-slide-up" style="animation-delay: 200ms">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold flex items-center gap-2">
              📈 更新记录
            </h2>
            <span class="text-xs text-ink-400">{{ history.length }} 条</span>
          </div>

          <div v-if="history.length" class="space-y-1 max-h-80 overflow-y-auto">
            <div v-for="(h, idx) in history" :key="idx"
                 class="group flex items-center justify-between px-3 py-2 rounded-lg
                        hover:bg-ink-100 dark:hover:bg-ink-800/50 transition-colors text-sm">
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-xs text-ink-400 font-mono w-20 shrink-0">{{ fmtDate(h.date) }}</span>
                <span class="font-mono">{{ balance.currency }}{{ fmt(h.amount) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="h.change !== 0" class="text-xs font-mono"
                      :class="h.change > 0 ? 'text-success-400' : 'text-rose-400'">
                  {{ h.change > 0 ? '+' : '' }}{{ fmt(h.change) }}
                </span>
                <button @click="deleteHistory(idx)"
                        class="opacity-0 group-hover:opacity-100 transition-opacity
                               text-ink-400 hover:text-rose-400 p-1">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-sm text-ink-400">
            还没有记录 — 点上面 ✏️ 更新一下当前金额开始吧
          </div>
        </div>

        <!-- 提示 -->
        <div class="text-center text-xs text-ink-400 pt-4">
          数据存在你的浏览器本地，不会上传到任何地方
        </div>
      </div>
    </main>

    <!-- 编辑当前金额 -->
    <Modal v-model="showEditAmount" title="更新当前金额">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-ink-400 mb-1.5">当前余额</label>
          <div class="flex items-center gap-2">
            <span class="text-xl text-ink-400">{{ balance.currency }}</span>
            <input
              v-model="editAmountValue"
              type="number"
              step="0.01"
              min="0"
              class="input flex-1 text-lg font-mono"
              placeholder="0.00"
              @keydown.enter="saveAmount"
              autofocus
            />
          </div>
          <p class="text-xs text-ink-400 mt-1.5">
            打开支付宝看一眼，把数字填进来
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="showEditAmount = false" class="btn-ghost">取消</button>
          <button @click="saveAmount" class="btn-primary">保存</button>
        </div>
      </div>
    </Modal>

    <!-- 编辑目标 -->
    <Modal v-model="showEditTarget" title="设置目标">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-ink-400 mb-1.5">目标金额</label>
          <div class="flex items-center gap-2">
            <span class="text-xl text-ink-400">{{ balance.currency }}</span>
            <input
              v-model="editTargetValue"
              type="number"
              step="100"
              min="1"
              class="input flex-1 text-lg font-mono"
              placeholder="100000"
              @keydown.enter="saveTarget"
              autofocus
            />
          </div>
          <p class="text-xs text-ink-400 mt-1.5">
            比如：买电脑 8000、年存 10万、首付 30万 ...
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="showEditTarget = false" class="btn-ghost">取消</button>
          <button @click="saveTarget" class="btn-primary">保存</button>
        </div>
      </div>
    </Modal>
  </div>
</template>