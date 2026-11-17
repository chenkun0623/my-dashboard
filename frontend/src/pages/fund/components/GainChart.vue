<script setup>
/**
 * 每日收益折线图 —— 纯 SVG，无图表库依赖。
 * points: [{ date, dayGain }]，升序。正负分段着色。
 */
import { computed } from 'vue'

const props = defineProps({
  points: { type: Array, required: true },
  height: { type: Number, default: 120 },
})

const W = 640

const model = computed(() => {
  const pts = props.points
  if (!pts.length) return null
  const gains = pts.map((p) => p.dayGain)
  const max = Math.max(...gains, 0)
  const min = Math.min(...gains, 0)
  const span = max - min || 1
  const stepX = pts.length > 1 ? W / (pts.length - 1) : W
  const zeroY = ((max - 0) / span) * props.height
  const xy = pts.map((p, i) => ({
    x: i * stepX,
    y: ((max - p.dayGain) / span) * props.height,
    ...p,
  }))
  const segments = []
  let cur = { sign: null, coords: [] }
  for (const p of xy) {
    const sign = p.dayGain >= 0 ? 1 : -1
    if (cur.sign !== null && sign !== cur.sign) {
      segments.push(cur)
      cur = { sign, coords: [] }
    }
    cur.sign = sign
    cur.coords.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  }
  segments.push(cur)
  return { segments, zeroY, last: xy[xy.length - 1] }
})
</script>

<template>
  <div v-if="model">
    <svg :viewBox="`0 0 ${W} ${height}`" class="w-full" preserveAspectRatio="none">
      <line
        :x1="0" :x2="W" :y1="model.zeroY" :y2="model.zeroY"
        class="stroke-ink-200 dark:stroke-ink-700"
        stroke-width="1" stroke-dasharray="4 4"
      />
      <polyline
        v-for="(s, i) in model.segments"
        :key="i"
        :points="s.coords.join(' ')"
        fill="none"
        :class="s.sign > 0 ? 'stroke-primary-500' : 'stroke-rose-400'"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>
    <div class="flex justify-between text-xs text-ink-400 mt-1">
      <span>{{ points[0]?.date }}</span>
      <span :class="model.last.dayGain >= 0 ? 'text-primary-500' : 'text-rose-400'" class="font-mono">
        最新 {{ model.last.dayGain >= 0 ? '+' : '' }}{{ model.last.dayGain.toFixed(2) }}
      </span>
      <span>{{ points[points.length - 1]?.date }}</span>
    </div>
  </div>
  <p v-else class="text-sm text-ink-400">暂无收益数据（先添加基金并同步净值）。</p>
</template>
