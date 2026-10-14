<script setup>
import { ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import { fundApi } from '../../../utils/fund-api'

const emit = defineEmits(['changed'])

const trades = ref([])
const funds = ref([])
const error = ref('')
const modal = ref(null)
const blank = { fundId: '', applyDate: '', amount: 0, shares: 0 }
const form = ref({ ...blank })

const KIND_LABEL = { SUBSCRIBE: '买入', REDEEM: '赎回', DIVIDEND_CASH: '现金分红', DIVIDEND_REINVEST: '红利再投' }
const SOURCE_LABEL = { AUTO: '定投自动', BACKFILL: '回填', MANUAL: '手动' }

async function load() {
  const [t, f] = await Promise.all([fundApi.listTrades(), fundApi.listFunds()])
  trades.value = t
  funds.value = f
}
load()

function openModal(kind) {
  form.value = { ...blank }
  modal.value = { kind }
}

async function submit() {
  error.value = ''
  const body = {
    ...form.value,
    amount: Number(form.value.amount),
    shares: Number(form.value.shares) || undefined,
  }
  try {
    await fundApi.createTrade(body)
    modal.value = null
    await load()
    emit('changed')
  } catch (err) {
    error.value = err?.message || '保存失败'
  }
}

async function editTrade(t) {
  const v = window.prompt('修正份额（留空取消）', String(t.shares))
  if (v === null || v === '') return
  await fundApi.updateTrade(t.id, { shares: Number(v) }).catch((e) => (error.value = e.message))
  await load()
  emit('changed')
}

async function removeTrade(t) {
  if (!window.confirm(`删除这笔${KIND_LABEL[t.kind]}流水？删除后收益将重算。`)) return
  await fundApi.deleteTrade(t.id).catch((e) => (error.value = e.message))
  await load()
  emit('changed')
}

function fundName(id) {
  return funds.value.find((f) => f.id === id)?.code ?? id
}
function fmt(v) {
  return (v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <section class="card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-bold">交易流水</h3>
      <div class="flex gap-1">
        <button class="btn-ghost text-xs" @click="openModal('SUBSCRIBE')">手动买入</button>
        <button class="btn-ghost text-xs" @click="openModal('REDEEM')">赎回</button>
        <button class="btn-ghost text-xs" @click="openModal('DIVIDEND_CASH')">现金分红</button>
        <button class="btn-ghost text-xs" @click="openModal('DIVIDEND_REINVEST')">红利再投</button>
      </div>
    </div>
    <p v-if="error" class="text-sm text-rose-400">{{ error }}</p>
    <p class="text-xs text-ink-400">模拟数据，份额以支付宝实际为准；可逐笔修正。</p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-ink-400 border-b border-ink-100 dark:border-ink-800">
            <th class="py-1 pr-2">日期</th>
            <th class="pr-2">基金</th>
            <th class="pr-2">类型</th>
            <th class="pr-2 text-right">金额</th>
            <th class="pr-2 text-right">份额</th>
            <th class="pr-2">来源</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in trades" :key="t.id" class="border-b border-ink-100 dark:border-ink-800">
            <td class="py-1.5 pr-2 font-mono text-xs">{{ t.applyDate?.slice?.(0, 10) }}</td>
            <td class="pr-2 font-mono text-xs">{{ fundName(t.fundId) }}</td>
            <td class="pr-2">{{ KIND_LABEL[t.kind] ?? t.kind }}</td>
            <td class="pr-2 text-right font-mono">{{ fmt(t.amount) }}</td>
            <td class="pr-2 text-right font-mono" :class="t.shares < 0 ? 'text-rose-400' : ''">
              {{ fmt(t.shares) }}
            </td>
            <td class="pr-2 text-xs text-ink-400">{{ SOURCE_LABEL[t.source] ?? t.source }}</td>
            <td class="text-right whitespace-nowrap">
              <button class="btn-ghost text-xs" @click="editTrade(t)">改</button>
              <button class="btn-ghost text-xs" @click="removeTrade(t)">删</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :open="!!modal" @close="modal = null">
      <h4 class="font-bold mb-3">{{ modal?.kind ? KIND_LABEL[modal.kind] : '' }}</h4>
      <div class="space-y-3">
        <select v-model="form.fundId" class="input w-full">
          <option value="" disabled>选择基金</option>
          <option v-for="f in funds" :key="f.id" :value="f.id">{{ f.name }} {{ f.code }}</option>
        </select>
        <input v-model="form.applyDate" type="date" class="input w-full" />
        <input
          v-if="modal?.kind === 'SUBSCRIBE'"
          v-model.number="form.amount" type="number" min="1" class="input w-full" placeholder="买入金额（元）"
        />
        <input
          v-else-if="modal?.kind === 'REDEEM'"
          v-model.number="form.shares" type="number" min="0.01" step="0.01" class="input w-full" placeholder="赎回份额"
        />
        <input
          v-else v-model.number="form.amount" type="number" min="0.0001" step="0.0001"
          class="input w-full" placeholder="每份派息额（元）"
        />
        <p class="text-xs text-ink-400">日期须为交易日且净值已入库（未入库先点持仓卡「同步」）。</p>
        <button class="btn-primary w-full" @click="submit">保存</button>
      </div>
    </Modal>
  </section>
</template>
