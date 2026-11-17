<script setup>
/**
 * 基金页 —— 概览 / 持仓 / 计划 / 流水 四区。
 * 全部数据来自后端 replay 现算；前端无本地持久化。
 */
import { onMounted, ref } from 'vue'
import { fundApi } from '../../utils/fund-api'
import OverviewCards from './components/OverviewCards.vue'
import HoldingCard from './components/HoldingCard.vue'
import GainChart from './components/GainChart.vue'
import PlansSection from './components/PlansSection.vue'
import TradesSection from './components/TradesSection.vue'

const overview = ref(null)
const daily = ref([])
const loading = ref(false)
const error = ref('')
const newCode = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = await fundApi.overview()
    daily.value = await fundApi.daily()
  } catch (err) {
    error.value = err?.message || '加载失败（后端未启动？）'
  } finally {
    loading.value = false
  }
}

async function addFund() {
  if (!/^\d{6}$/.test(newCode.value)) {
    error.value = '基金代码须为 6 位数字'
    return
  }
  error.value = ''
  try {
    await fundApi.createFund(newCode.value)
    newCode.value = ''
    await load()
  } catch (err) {
    error.value = err?.message || '添加失败'
  }
}

async function syncOne(fundId) {
  await fundApi.syncFund(fundId).catch((e) => (error.value = e.message))
  await load()
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <p v-if="overview?.syncAlert" class="card p-3 text-sm text-amber-500">
      ⚠️ 部分基金净值同步异常，收益可能滞后（点持仓卡上的「同步」重试）。
    </p>
    <p v-if="error" class="card p-3 text-sm text-rose-400">{{ error }}</p>
    <p v-if="loading && !overview" class="text-sm text-ink-400">加载中...</p>

    <template v-if="overview">
      <OverviewCards :overview="overview" />

      <div class="card p-5">
        <h3 class="font-bold mb-3">每日收益</h3>
        <GainChart :points="daily.map((p) => ({ date: p.date, dayGain: p.dayGain }))" />
      </div>

      <div class="flex items-center justify-between gap-3">
        <h3 class="font-bold">持仓</h3>
        <div class="flex items-center gap-2">
          <input v-model="newCode" class="input w-32 font-mono" placeholder="6位基金代码" maxlength="6" />
          <button class="btn-primary text-xs" @click="addFund">添加基金</button>
        </div>
      </div>
      <p v-if="!overview.holdings.length" class="text-sm text-ink-400">
        还没有基金。输入代码添加后会自动抓取历史净值。
      </p>
      <div class="grid sm:grid-cols-2 gap-3">
        <HoldingCard v-for="h in overview.holdings" :key="h.fundId" :holding="h" @sync="syncOne" />
      </div>

      <PlansSection :overview="overview" @changed="load" />
      <TradesSection @changed="load" />
    </template>
  </div>
</template>
