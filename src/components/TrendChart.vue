<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** 数据点：[{ amount: number, date: string }] */
  data: { type: Array, required: true },
  /** 目标线 */
  target: { type: Number, default: 0 },
  /** 货币符号 */
  currency: { type: String, default: '¥' },
  /** 主色（与目标进度匹配） */
  color: { type: String, default: '#6366F1' },
  /** 主色浅色变体（用于渐变） */
  colorLight: { type: String, default: '#818CF8' }
})

// SVG viewBox：固定 600×220 的内部坐标系，外层用 width:100% 自适应缩放
// —— 所以下面坐标全用常量算，不用 ResizeObserver 监听容器尺寸
const W = 600
const H = 220
const PAD = { top: 20, right: 20, bottom: 30, left: 50 }

// 反转一下数据顺序：history 是新的在前，画图要老的在前
const points = computed(() => [...props.data].reverse())

const hasData = computed(() => points.value.length >= 2)

// Y 轴范围：max 取 max(数据最大值, 目标) * 1.1，min 取 0
const yMax = computed(() => {
  if (!points.value.length) return props.target || 100
  const dataMax = Math.max(...points.value.map((p) => p.amount))
  const m = Math.max(dataMax, props.target || 0)
  return m * 1.1 || 100
})

// 坐标转换
function xAt(i) {
  const innerW = W - PAD.left - PAD.right
  const n = points.value.length
  if (n <= 1) return PAD.left + innerW / 2
  return PAD.left + (i * innerW) / (n - 1)
}
function yAt(v) {
  const innerH = H - PAD.top - PAD.bottom
  return PAD.top + innerH * (1 - v / yMax.value)
}

// 折线 path
const linePath = computed(() => {
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(p.amount).toFixed(2)}`)
    .join(' ')
})

// 渐变填充区域 path
const areaPath = computed(() => {
  if (points.value.length < 2) return ''
  const baseY = H - PAD.bottom
  const start = `M ${xAt(0).toFixed(2)} ${baseY}`
  const lines = points.value
    .map((p, i) => `L ${xAt(i).toFixed(2)} ${yAt(p.amount).toFixed(2)}`)
    .join(' ')
  const end = `L ${xAt(points.value.length - 1).toFixed(2)} ${baseY} Z`
  return `${start} ${lines} ${end}`
})

// Y 轴刻度（4 等分）
const yTicks = computed(() => {
  const ticks = []
  for (let i = 0; i <= 4; i++) {
    const v = (yMax.value * i) / 4
    ticks.push({ v, y: yAt(v) })
  }
  return ticks
})

// 目标线 y 坐标
const targetY = computed(() => (props.target > 0 ? yAt(props.target) : null))

// 格式化数字（短：1.2k、3.5w）
function fmtShort(n) {
  if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return n.toFixed(0)
}
function fmt(n) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(n)
}
function fmtDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
}

// 悬浮显示某点的详情
const hoverIdx = ref(-1)

function onMove(e) {
  if (!hasData.value) return
  const svg = e.currentTarget
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const cursor = pt.matrixTransform(svg.getScreenCTM().inverse())
  // 找最近的点
  let minDist = Infinity
  let idx = -1
  points.value.forEach((p, i) => {
    const d = Math.abs(xAt(i) - cursor.x)
    if (d < minDist) {
      minDist = d
      idx = i
    }
  })
  hoverIdx.value = idx
}
function onLeave() {
  hoverIdx.value = -1
}

const tooltipPoint = computed(() => {
  if (hoverIdx.value < 0) return null
  return points.value[hoverIdx.value]
})
</script>

<template>
  <div class="w-full">
    <div v-if="!hasData"
         class="flex items-center justify-center h-[220px] text-sm text-ink-400">
      至少需要 2 条记录才能画出趋势 — 多更新几次余额吧
    </div>

    <div v-else class="relative">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        class="w-full h-auto"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <!-- 渐变定义 -->
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" :stop-color="props.color" />
            <stop offset="100%" :stop-color="props.colorLight" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="props.color" stop-opacity="0.3" />
            <stop offset="100%" :stop-color="props.color" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- 网格 + Y 轴刻度 -->
        <g class="text-ink-300 dark:text-ink-700">
          <line v-for="t in yTicks" :key="'gl' + t.v"
                :x1="PAD.left" :x2="W - PAD.right"
                :y1="t.y" :y2="t.y"
                stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 4" />
        </g>
        <g class="text-ink-400 text-[10px]">
          <text v-for="t in yTicks" :key="'lb' + t.v"
                :x="PAD.left - 6" :y="t.y" fill="currentColor"
                text-anchor="end" dominant-baseline="middle">
            {{ fmtShort(t.v) }}
          </text>
        </g>

        <!-- 目标线 -->
        <g v-if="targetY !== null" class="text-success-500">
          <line :x1="PAD.left" :x2="W - PAD.right"
                :y1="targetY" :y2="targetY"
                stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.7" />
          <text :x="W - PAD.right" :y="targetY - 4" fill="currentColor"
                text-anchor="end" class="text-[10px] font-medium">
            🎯 目标 {{ fmtShort(target) }}
          </text>
        </g>

        <!-- 渐变填充 -->
        <path :d="areaPath" fill="url(#areaGradient)" />

        <!-- 折线 -->
        <path :d="linePath" fill="none" stroke="url(#lineGradient)" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round" />

        <!-- 数据点 -->
        <g>
          <circle v-for="(p, i) in points" :key="'p' + i"
                  :cx="xAt(i)" :cy="yAt(p.amount)"
                  :r="hoverIdx === i ? 5 : 3"
                  :fill="props.color" stroke="white" stroke-width="2"
                  class="transition-all" />
        </g>

        <!-- X 轴日期标签（首尾 + 中间） -->
        <g class="text-ink-400 text-[10px]">
          <text v-for="i in [0, Math.floor((points.length - 1) / 2), points.length - 1]"
                :key="'d' + i"
                :x="xAt(i)" :y="H - 8" fill="currentColor" text-anchor="middle">
            {{ fmtDate(points[i].date) }}
          </text>
        </g>

        <!-- 悬浮竖线 -->
        <line v-if="hoverIdx >= 0"
              :x1="xAt(hoverIdx)" :x2="xAt(hoverIdx)"
              :y1="PAD.top" :y2="H - PAD.bottom"
              class="text-primary-400 dark:text-primary-300"
              stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" />
      </svg>

      <!-- 悬浮提示 -->
      <div v-if="tooltipPoint"
           class="absolute pointer-events-none px-2.5 py-1.5 rounded-md text-xs
                  bg-ink-900 text-white shadow-lg
                  dark:bg-white dark:text-ink-900
                  -translate-x-1/2 -translate-y-full"
           :style="{
             left: ((xAt(hoverIdx) / W) * 100) + '%',
             top: ((yAt(tooltipPoint.amount) / H) * 100) + '%',
             marginTop: '-12px'
           }">
        <div class="font-mono font-semibold">
          {{ currency }}{{ fmt(tooltipPoint.amount) }}
        </div>
        <div class="text-[10px] opacity-70">{{ fmtDate(tooltipPoint.date) }}</div>
      </div>
    </div>
  </div>
</template>