<script setup>
import { computed, ref } from 'vue'
import Modal from '../../../components/Modal.vue'
import { fundApi } from '../../../utils/fund-api'

const props = defineProps({ overview: { type: Object, required: true } })
const emit = defineEmits(['changed'])

const plans = ref([])
const error = ref('')
const showCreate = ref(false)
const backfillPlan = ref(null)
const backfillSegments = ref([])

const form = ref({ fundId: '', freq: 'WEEKLY', weekday: 4, monthday: 1, amount: 100, startDate: '' })

const fundOptions = computed(() =>
  (props.overview?.holdings ?? []).map((h) => ({ id: h.fundId, label: `${h.name} ${h.code}` })),
)

async function loadPlans() {
  plans.value = await fundApi.listPlans().catch(() => [])
}
loadPlans()

const WEEKDAY_LABEL = ['', '一', '二', '三', '四', '五', '六', '日']

function planDesc(p) {
  const f = fundOptions.value.find((x) => x.id === p.fundId)
  const when =
    p.freq === 'MONTHLY'
      ? `每月 ${p.monthday} 日`
      : `每${p.freq === 'WEEKLY' ? '周' : '双周'}${WEEKDAY_LABEL[p.weekday]}`
  return `${f?.label ?? p.fundId} · ${when} · ¥${p.amount}`
}

async function create() {
  error.value = ''
  try {
    await fundApi.createPlan({
      ...form.value,
      weekday: form.value.freq === 'MONTHLY' ? undefined : Number(form.value.weekday),
      monthday: form.value.freq === 'MONTHLY' ? Number(form.value.monthday) : undefined,
    })
    showCreate.value = false
    await loadPlans()
    emit('changed')
  } catch (err) {
    error.value = err?.message || '创建失败'
  }
}

async function setStatus(p, status) {
  await fundApi.updatePlan(p.id, { status }).catch((e) => (error.value = e.message))
  await loadPlans()
  emit('changed')
}

async function adjustAmount(p) {
  const v = window.prompt('新的每期金额（将从今天起分段）', String(p.amount))
  if (!v) return
  await fundApi.updatePlan(p.id, { amount: Number(v) }).catch((e) => (error.value = e.message))
  await loadPlans()
  emit('changed')
}

function openBackfill(p) {
  backfillPlan.value = p
  backfillSegments.value = [
    { startDate: p.startDate?.slice?.(0, 10) ?? '', amount: p.amount },
  ]
}

async function runBackfill() {
  error.value = ''
  try {
    const segs = backfillSegments.value
      .filter((s) => s.startDate && s.amount > 0)
      .map((s) => ({ startDate: s.startDate, amount: Number(s.amount) }))
    const r = await fundApi.backfill(backfillPlan.value.id, segs)
    backfillPlan.value = null
    window.alert(`回填完成，生成 ${r.created} 笔申购记录`)
    emit('changed')
  } catch (err) {
    error.value = err?.message || '回填失败'
  }
}
</script>

<template>
  <section class="card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-bold">定投计划</h3>
      <button class="btn-primary text-xs" @click="showCreate = true">新建计划</button>
    </div>
    <p v-if="error" class="text-sm text-rose-400">{{ error }}</p>
    <p v-if="!plans.length" class="text-sm text-ink-400">
      暂无计划。新建后系统会按交易日自动推进并生成申购记录。
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="p in plans"
        :key="p.id"
        class="flex items-center justify-between gap-2 text-sm border-b border-ink-100 dark:border-ink-800 pb-2"
      >
        <span>
          {{ planDesc(p) }}
          <span class="text-xs text-ink-400 ml-2">
            {{ p.status === 'ACTIVE' ? '进行中' : p.status === 'PAUSED' ? '已暂停' : '已终止' }}
          </span>
        </span>
        <span class="flex gap-1 shrink-0">
          <button class="btn-ghost text-xs" @click="openBackfill(p)">回填</button>
          <button v-if="p.status === 'ACTIVE'" class="btn-ghost text-xs" @click="setStatus(p, 'PAUSED')">暂停</button>
          <button v-if="p.status === 'PAUSED'" class="btn-ghost text-xs" @click="setStatus(p, 'ACTIVE')">恢复</button>
          <button class="btn-ghost text-xs" @click="adjustAmount(p)">改金额</button>
          <button v-if="p.status !== 'STOPPED'" class="btn-ghost text-xs" @click="setStatus(p, 'STOPPED')">终止</button>
        </span>
      </li>
    </ul>

    <Modal :open="showCreate" @close="showCreate = false">
      <h4 class="font-bold mb-3">新建定投计划</h4>
      <div class="space-y-3">
        <select v-model="form.fundId" class="input w-full">
          <option value="" disabled>选择基金</option>
          <option v-for="o in fundOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
        </select>
        <select v-model="form.freq" class="input w-full">
          <option value="WEEKLY">每周</option>
          <option value="BIWEEKLY">双周</option>
          <option value="MONTHLY">每月</option>
        </select>
        <select v-if="form.freq !== 'MONTHLY'" v-model="form.weekday" class="input w-full">
          <option v-for="d in 7" :key="d" :value="d">周{{ WEEKDAY_LABEL[d] }}</option>
        </select>
        <input
          v-else v-model.number="form.monthday" type="number" min="1" max="31"
          class="input w-full" placeholder="每月几号"
        />
        <input v-model.number="form.amount" type="number" min="1" class="input w-full" placeholder="每期金额（元）" />
        <input v-model="form.startDate" type="date" class="input w-full" />
        <p class="text-xs text-ink-400">起始日为首期应扣日（遇非交易日自动顺延）。</p>
        <button class="btn-primary w-full" @click="create">创建</button>
      </div>
    </Modal>

    <Modal :open="!!backfillPlan" @close="backfillPlan = null">
      <h4 class="font-bold mb-3">回填历史定投</h4>
      <p class="text-xs text-ink-400 mb-3">按计划规则重放历史净值，生成模拟申购。金额变过就加分段。</p>
      <div class="space-y-2">
        <div v-for="(s, i) in backfillSegments" :key="i" class="flex gap-2">
          <input v-model="s.startDate" type="date" class="input flex-1" />
          <input v-model.number="s.amount" type="number" min="1" class="input w-28" placeholder="金额" />
          <button class="btn-ghost text-xs" @click="backfillSegments.splice(i, 1)">删</button>
        </div>
        <button class="btn-ghost text-xs" @click="backfillSegments.push({ startDate: '', amount: 100 })">
          + 加分段
        </button>
        <button class="btn-primary w-full" @click="runBackfill">开始回填</button>
      </div>
    </Modal>
  </section>
</template>
