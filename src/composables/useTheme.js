/**
 * 主题模式管理
 * - 三态：'light' | 'dark' | 'system'（默认跟随系统）
 * - 状态存 localStorage
 * - 通过给 <html> 加/去 .dark 类切换
 */
import { ref, watch, onMounted } from 'vue'

const STORAGE_KEY = 'my-dashboard:theme'
const theme = ref('system')   // 单例：整个 app 共享
const isDark = ref(false)

function loadTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

function applyTheme(mode) {
  const root = document.documentElement
  let dark
  if (mode === 'system') {
    dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  } else {
    dark = mode === 'dark'
  }
  root.classList.toggle('dark', dark)
  isDark.value = dark
}

let inited = false
export function useTheme() {
  if (!inited) {
    inited = true
    theme.value = loadTheme()
    applyTheme(theme.value)

    // 监听系统主题变化（仅 system 模式下生效）
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      if (theme.value === 'system') applyTheme('system')
    })

    watch(theme, (v) => {
      localStorage.setItem(STORAGE_KEY, v)
      applyTheme(v)
    })
  }

  /** 三态循环切换：light → dark → system → light */
  function toggle() {
    const order = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme.value) + 1) % 3]
    theme.value = next
  }

  return { theme, isDark, toggle }
}