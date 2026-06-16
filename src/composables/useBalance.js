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

const DEFAULT_BALANCE = { current: 0, target: 100000, currency: '¥' }

function loadBalance() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    // 用 spread 兜底缺失字段：将来给 balance 加新字段时，老用户也能平滑升级
    if (text) return { ...DEFAULT_BALANCE, ...JSON.parse(text) }
  } catch {} // localStorage 损坏 / SSR 等情况：用默认值兜底，不打扰用户
  return { ...DEFAULT_BALANCE }
}

function loadHistory() {
  try {
    const text = localStorage.getItem(HISTORY_KEY)
    if (text) return JSON.parse(text)
  } catch {} // 同上
  return []
}

// 模块级单例：balance / history 在所有 useBalance() 调用间共享，
// 多个组件读到的是同一份响应式状态（刻意不放在工厂函数里 new）
const balance = ref(loadBalance())
const history = ref(loadHistory())

// 持久化 — 写入也兜底（隐私模式 / 配额满会抛 QuotaExceededError）
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {} // 静默失败：内存里数据还在，下一次写成功会自动恢复
}
watch(balance, (v) => safeSet(STORAGE_KEY, v), { deep: true })
watch(history, (v) => safeSet(HISTORY_KEY, v), { deep: true })

export function useBalance() {
  // 进度百分比
  const progress = computed(() => {
    if (!balance.value.target || balance.value.target <= 0) return 0
    return Math.min(100, (balance.value.current / balance.value.target) * 100)
  })

  // 还差多少
  const remaining = computed(() => Math.max(0, balance.value.target - balance.value.current))

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

  /**
   * 更新当前金额，自动追加历史记录
   *
   * 历史只能批量清空（clearHistory），不能逐条删除——
   * 这样保留了"对照价值"，又给"重新开始"留了一条出路。
   * 单条退场的唯一路径仍是"超过 50 条 → 自动丢掉最早的一条"。
   */
  function updateCurrent(newAmount) {
    const change = newAmount - balance.value.current
    balance.value.current = newAmount
    history.value.unshift({
      amount: newAmount,
      change,
      date: new Date().toISOString()
    })
    // 50 条上限：unshift 之后从尾部（最早的那条）截掉
    if (history.value.length > 50) history.value = history.value.slice(0, 50)
  }

  /** 设置目标 */
  function updateTarget(newTarget) {
    balance.value.target = newTarget
  }

  /**
   * 清空更新记录（不动当前余额 / 目标 / 货币）
   * localStorage 由 watch 自动同步：history 变成 [] → 写回去
   */
  function clearHistory() {
    history.value = []
  }

  /** 清空所有数据（设置里用） */
  function reset() {
    balance.value = { ...DEFAULT_BALANCE }
    history.value = []
  }

  return {
    balance,
    history,
    progress,
    remaining,
    stage,
    updateCurrent,
    updateTarget,
    clearHistory,
    reset
  }
}