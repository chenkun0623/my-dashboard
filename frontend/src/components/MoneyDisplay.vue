<script setup>
/**
 * 金额可视化 — 按整数位数选一种整体颜色
 *
 * 阶梯（按整数部分位数 d，含千分位逗号无关）：
 *   d ≤ 2   ink     默认（个 / 十）
 *   d = 3   sky     浅蓝（百）
 *   d = 4   primary 蓝紫（千）
 *   d = 5   teal    青（万）
 *   d = 6   warm    橙（十万）
 *   d = 7   orange  深橙（百万）
 *   d = 8   rose    红（千万）
 *   d ≥ 9  fuchsia 紫红（亿+）
 *
 * 同一个数字整体一种颜色，不再分段。逗号、货币符号、小数都用同色但稍弱。
 */
import { computed } from 'vue'
import { fmt2, fmtInt } from '../utils/money'

const props = defineProps({
  value: { type: Number, required: true },
  /** 货币符号，置空则不渲染 */
  currency: { type: String, default: '¥' },
  /** 主体字号，套用 Tailwind text-* 类 */
  size: { type: String, default: 'text-2xl' },
  /** 货币符号 / 小数字号（更小） */
  unitSize: { type: String, default: 'text-[0.6em]' },
  /** 是否显示小数位 */
  showDecimals: { type: Boolean, default: false }
})

// 整数部分位数（负数也按绝对值算）
const digits = computed(() => {
  const n = Math.floor(Math.abs(Number(props.value) || 0))
  return n === 0 ? 1 : n.toString().length
})

const formatted = computed(() =>
  props.showDecimals ? fmt2(props.value) : fmtInt(props.value)
)

// 主色（数字本体）— dark 模式统一用色板的 400 级（项目 primary/accent/warm 只有 400/500 两阶）
const colorClass = computed(() => {
  const d = digits.value
  if (d <= 2) return ''                                           // 默认 ink
  if (d === 3) return 'text-sky-500 dark:text-sky-400'            // 百
  if (d === 4) return 'text-primary-500 dark:text-primary-400'    // 千
  if (d === 5) return 'text-accent-500 dark:text-accent-400'      // 万
  if (d === 6) return 'text-warm-500 dark:text-warm-400'          // 十万
  if (d === 7) return 'text-orange-500 dark:text-orange-400'      // 百万
  if (d === 8) return 'text-rose-500 dark:text-rose-400'          // 千万
  return 'text-fuchsia-500 dark:text-fuchsia-400'                 // 亿+
})
</script>

<template>
  <span class="font-mono inline-flex items-baseline" :class="[size, colorClass]">
    <span v-if="currency" class="opacity-60" :class="unitSize">{{ currency }}</span>
    <span>{{ formatted }}</span>
  </span>
</template>
