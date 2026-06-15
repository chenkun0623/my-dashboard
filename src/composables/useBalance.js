/**
 * 余额数据管理 — 用 localStorage 存
 *
 * 数据格式：
 *   balance: { current: number, target: number, currency: '¥' }
 *   history: Array<{ amount: number, date: string, change: number }>
 */
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'my-dashboard:balance'
const HISTORY_KEY = 'my-dashboard:history'

function loadBalance() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text) return JSON.parse(text)
  } catch {}
  return { current: 0, target: 100000, currency: '¥' }
}

function loadHistory() {
  try {
    const text = localStorage.getItem(HISTORY_KEY)
    if (text) return JSON.parse(text)
  } catch {}
  return []
}

const balance = ref(loadBalance())
const history = ref(loadHistory())

// 持久化
watch(balance, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })
watch(history, (v) => localStorage.setItem(HISTORY_KEY, JSON.stringify(v)), { deep: true })

export function useBalance() {
  // 进度百分比
  const progress = computed(() => {
    if (!balance.value.target || balance.value.target <= 0) return 0
    return Math.min(100, (balance.value.current / balance.value.target) * 100)
  })

  // 还差多少
  const remaining = computed(() => Math.max(0, balance.value.target - balance.value.current))

  // 是否达成
  const reached = computed(() => balance.value.current >= balance.value.target)

  /**
   * 进度阶段 — 5 档：
   *   0  起步 (0-20%)    蓝灰
   *   1  起航 (20-40%)   青
   *   2  过半 (40-60%)   紫
   *   3  冲刺 (60-80%)   橙
   *   4  达成 (80%+)    绿
   *
   * 同时返回主色 hex（图表里用）和 Tailwind 类名前缀（页面里用）
   */
  const stage = computed(() => {
    const p = progress.value
    if (p >= 80) {
      return {
        level: 4,
        label: '达成',
        emoji: '🎉',
        // 主色（图表用）
        hex: '#22C55E',
        hexLight: '#4ADE80',
        // 文字色 / 进度条 Tailwind 类
        textCls: 'text-success-500 dark:text-success-400',
        // 渐变（进度条用）
        gradFrom: '#22C55E',
        gradVia: '#4ADE80',
        gradTo: '#86EFAC'
      }
    }
    if (p >= 60) {
      return {
        level: 3,
        label: '冲刺',
        emoji: '🔥',
        hex: '#F97316',
        hexLight: '#FB923C',
        textCls: 'text-warm-500 dark:text-warm-400',
        gradFrom: '#F97316',
        gradVia: '#FB923C',
        gradTo: '#FCD34D'
      }
    }
    if (p >= 40) {
      return {
        level: 2,
        label: '过半',
        emoji: '💪',
        hex: '#6366F1',
        hexLight: '#818CF8',
        textCls: 'text-primary-500 dark:text-primary-400',
        gradFrom: '#6366F1',
        gradVia: '#818CF8',
        gradTo: '#A5B4FC'
      }
    }
    if (p >= 20) {
      return {
        level: 1,
        label: '起航',
        emoji: '🌊',
        hex: '#06B6D4',
        hexLight: '#22D3EE',
        textCls: 'text-accent-500 dark:text-accent-400',
        gradFrom: '#06B6D4',
        gradVia: '#22D3EE',
        gradTo: '#67E8F9'
      }
    }
    return {
      level: 0,
      label: '起步',
      emoji: '🌱',
      hex: '#64748B',
      hexLight: '#94A3B8',
      textCls: 'text-ink-500 dark:text-ink-400',
      gradFrom: '#64748B',
      gradVia: '#94A3B8',
      gradTo: '#CBD5E1'
    }
  })

  /** 更新当前金额，自动追加历史记录 */
  function updateCurrent(newAmount) {
    const change = newAmount - balance.value.current
    balance.value.current = newAmount
    history.value.unshift({
      amount: newAmount,
      change,
      date: new Date().toISOString()
    })
    // 只保留最近 50 条
    if (history.value.length > 50) history.value = history.value.slice(0, 50)
  }

  /** 设置目标 */
  function updateTarget(newTarget) {
    balance.value.target = newTarget
  }

  /** 删除一条历史 */
  function deleteHistory(index) {
    history.value.splice(index, 1)
  }

  /** 清空所有数据（设置里用） */
  function reset() {
    balance.value = { current: 0, target: 100000, currency: '¥' }
    history.value = []
  }

  return {
    balance,
    history,
    progress,
    remaining,
    reached,
    stage,
    updateCurrent,
    updateTarget,
    deleteHistory,
    reset
  }
}