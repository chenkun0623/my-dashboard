<script setup>
import { computed } from 'vue'

const props = defineProps({ holding: { type: Object, required: true } })
const emit = defineEmits(['sync'])

const h = computed(() => props.holding)
const costBasis = computed(() => h.value.invested - h.value.totalGain)
const gainPct = computed(() =>
  costBasis.value > 0 ? (h.value.totalGain / costBasis.value) * 100 : 0,
)
function fmt(v, d = 2) {
  return (v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
}
</script>

<template>
  <div class="card p-5">
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="font-bold truncate">{{ h.name }} <span class="text-xs text-ink-400 font-mono">{{ h.code }}</span></p>
        <p class="text-xs text-ink-400 mt-0.5">
          份额 {{ fmt(h.shares) }} · 成本 {{ fmt(h.costPerShare, 4) }}
          <span v-if="h.status === 'DORMANT'" class="text-amber-500">（休眠）</span>
        </p>
      </div>
      <button class="btn-ghost text-xs shrink-0" @click="emit('sync', h.fundId)">同步</button>
    </div>
    <div class="grid grid-cols-3 gap-2 mt-3 text-center">
      <div>
        <p class="text-xs text-ink-400">最新净值</p>
        <p class="font-mono text-sm font-bold">{{ h.latestUnit ?? '-' }}</p>
        <p class="text-xs text-ink-400">{{ h.latestDate ?? '' }}</p>
      </div>
      <div>
        <p class="text-xs text-ink-400">持有收益</p>
        <p class="font-mono text-sm font-bold" :class="h.totalGain >= 0 ? 'text-primary-500' : 'text-rose-400'">
          {{ h.totalGain >= 0 ? '+' : '' }}{{ fmt(h.totalGain) }}
        </p>
        <p class="text-xs text-ink-400">{{ gainPct.toFixed(2) }}%</p>
      </div>
      <div>
        <p class="text-xs text-ink-400">今日</p>
        <p class="font-mono text-sm font-bold" :class="h.dayGain >= 0 ? 'text-primary-500' : 'text-rose-400'">
          {{ h.dayGain >= 0 ? '+' : '' }}{{ fmt(h.dayGain) }}
        </p>
        <p class="text-xs text-ink-400">下次扣款 {{ h.nextDebitDate ?? '-' }}</p>
      </div>
    </div>
    <p v-if="h.lastSyncError" class="text-xs text-amber-500 mt-2">同步异常：{{ h.lastSyncError }}</p>
  </div>
</template>
