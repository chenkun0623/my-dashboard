<script setup>
import { computed } from 'vue'

const props = defineProps({ overview: { type: Object, required: true } })

const cards = computed(() => [
  { label: '总资产', value: props.overview.totalMarketValue, money: true },
  { label: '累计投入', value: props.overview.invested, money: true },
  { label: '累计收益', value: props.overview.totalGain, money: true, gain: true },
  { label: '今日收益', value: props.overview.todayGain, money: true, gain: true, sub: props.overview.todayGainDate },
])

function fmt(v) {
  return (v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div v-for="c in cards" :key="c.label" class="card p-4">
      <p class="text-xs text-ink-400">{{ c.label }}</p>
      <p
        class="text-lg font-bold font-mono mt-1"
        :class="c.gain ? (c.value >= 0 ? 'text-primary-500' : 'text-rose-400') : ''"
      >
        {{ c.money ? fmt(c.value) : c.value }}
      </p>
      <p v-if="c.sub" class="text-xs text-ink-400 mt-0.5">{{ c.sub }}</p>
    </div>
  </div>
</template>
