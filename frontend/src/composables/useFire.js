/**
 * FIRE（Financial Independence, Retire Early）配置 — 流派 + 计算
 *
 * 启用后由本模块算出"该存的 FIRE 数"，覆盖 useBalance 里手填的 target；
 * 关闭则不参与，target 仍是用户手动设置的值。配置存独立的 localStorage key，
 * 跟 balance/history 解耦 — 删掉不影响主数据。
 *
 * 流派计算：
 *   - Lean / Fat:  年支出 × 25       （4% 安全提取率，差别只在年支出锚点）
 *   - Barista:     年支出 × 12.5     （半 FIRE，剩余靠兼职覆盖）
 *   - Coast:       Full FIRE 反复利到当前年龄 — 现在存够就能躺到法定退休
 */
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'my-dashboard:fire'

const DEFAULT = {
  enabled: false,
  flavor: 'lean',           // lean | fat | coast | barista
  annualExpense: 100000,    // ¥/年
  currentAge: 30,
  retireAge: 60,
  expectedReturn: 0.07      // 7% 实际回报，FIRE 圈常用的历史均值
}

function load() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text) return { ...DEFAULT, ...JSON.parse(text) }
  } catch {} // 同 useBalance：解析失败用默认值兜底
  return { ...DEFAULT }
}

// 模块级单例：跟 useBalance 一致的模式
const fire = ref(load())
// 写入兜底（隐私模式 / 配额满会抛错）
watch(
  fire,
  (v) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    } catch {}
  },
  { deep: true }
)

/**
 * 流派元数据 — UI 渲染用，集中在这避免和组件耦合
 */
export const FIRE_FLAVORS = [
  {
    key: 'lean',
    label: 'Lean FIRE',
    emoji: '🌿',
    short: '精简退休',
    desc: '压低年支出，目标也跟着压低。公式：年支出 × 25。',
    hint: '建议年支出 ¥60k – ¥120k'
  },
  {
    key: 'fat',
    label: 'Fat FIRE',
    emoji: '🍖',
    short: '舒适退休',
    desc: '不压缩生活质量。公式同样是年支出 × 25，但锚定较高的支出水平。',
    hint: '建议年支出 ¥240k+'
  },
  {
    key: 'coast',
    label: 'Coast FIRE',
    emoji: '🛟',
    short: '躺平复利',
    desc: '现在存够后就停止投入，靠复利涨到法定退休年龄刚好够 Full FIRE。',
    hint: '需要：年支出 + 当前年龄 + 目标退休年龄'
  },
  {
    key: 'barista',
    label: 'Barista FIRE',
    emoji: '☕',
    short: '半退休',
    desc: '本金覆盖一半年支出，剩下靠兼职 / 副业。公式：年支出 × 12.5。',
    hint: '适合不想完全离开职场的人'
  }
]

const fireTarget = computed(() => {
  const ae = Number(fire.value.annualExpense) || 0
  if (ae <= 0) return 0
  switch (fire.value.flavor) {
    case 'lean':
    case 'fat':
      return ae * 25
    case 'barista':
      return ae * 12.5
    case 'coast': {
      const years = Math.max(0, Number(fire.value.retireAge) - Number(fire.value.currentAge))
      const fullFire = ae * 25
      const r = Number(fire.value.expectedReturn) || 0
      // CoastFIRE_now = FullFIRE / (1+r)^years
      return fullFire / Math.pow(1 + r, years)
    }
    default:
      return 0
  }
})

const flavorMeta = computed(() =>
  FIRE_FLAVORS.find((f) => f.key === fire.value.flavor) || FIRE_FLAVORS[0]
)

export function useFire() {
  return { fire, fireTarget, flavorMeta }
}
