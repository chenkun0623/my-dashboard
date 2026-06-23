<script setup>
/**
 * 财富页 — 余额追踪 + 目标进度 + 更新记录
 *
 * 数据全在 useBalance() 里，模块级单例，所以本组件可以多处实例化，
 * 不会丢同步。布局上只负责"max-w-4xl 容器内"的内容，外层壳由 App.vue 提供。
 *
 * 目标金额有两种来源：
 *   - 关闭 FIRE：用户手填，存在 balance.target
 *   - 开启 FIRE：根据流派 + 年支出 + 年龄算出 fireTarget，watch 同步写回 balance.target
 *     这样下游 progress / stage / 趋势图目标线全套逻辑都不用变
 */
import { ref, computed, watch } from 'vue'
import { useBalance } from '../../composables/useBalance'
import { useFire, FIRE_FLAVORS } from '../../composables/useFire'
import { fmt2 } from '../../utils/money'
import Modal from '../../components/Modal.vue'
import MoneyDisplay from '../../components/MoneyDisplay.vue'

const {
  balance,
  history,
  progress,
  remaining,
  stage,
  updateCurrent,
  updateTarget,
  clearHistory
} = useBalance()

const { fire, fireTarget, flavorMeta } = useFire()

// FIRE 模式开启后：把算出来的目标同步进 balance.target
// 用 immediate 是为了刷新页面后开关仍 = true 时立即生效
watch(
  [() => fire.value.enabled, fireTarget],
  ([enabled, target]) => {
    if (enabled && target > 0) updateTarget(Math.round(target * 100) / 100)
  },
  { immediate: true }
)

// 弹窗状态
const showEditAmount = ref(false)
const showEditTarget = ref(false)   // 普通目标编辑（FIRE 关闭时用）
const showFireConfig = ref(false)   // FIRE 流派配置（FIRE 开启时用）
const showClearHistory = ref(false) // 清空更新记录确认
const editAmountValue = ref(0)
const editTargetValue = ref(0)

// FIRE 帮助文案的内联展开
const showFireHelp = ref(false)

function openEditAmount() {
  editAmountValue.value = balance.value.current
  showEditAmount.value = true
}

function openEditTarget() {
  editTargetValue.value = balance.value.target
  showEditTarget.value = true
}

function normalizeMoneyInput(value) {
  const raw = String(value).trim()
  if (raw === '') return ''
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [intPart, ...decimalParts] = cleaned.split('.')
  if (!decimalParts.length) return intPart
  return `${intPart}.${decimalParts.join('').slice(0, 2)}`
}

function saveAmount() {
  // 显式拒绝空串：Number('') === 0 会把"清空再保存"误判为"把余额清零"
  const raw = String(editAmountValue.value).trim()
  if (raw === '') return
  const v = Number(raw)
  if (isNaN(v) || v < 0) return
  // 保存层面再兜底一次：复制粘贴 / 浏览器兼容问题也只能落到两位小数
  updateCurrent(Math.round(v * 100) / 100)
  showEditAmount.value = false
}

function saveTarget() {
  const raw = String(editTargetValue.value).trim()
  if (raw === '') return
  const v = Number(raw)
  if (isNaN(v) || v <= 0) return
  updateTarget(Math.round(v * 100) / 100)
  showEditTarget.value = false
}

function confirmClearHistory() {
  clearHistory()
  showClearHistory.value = false
}

function fmtDate(iso) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${dd} ${hh}:${mi}:${ss}`
}

// 鼓励语 — 跟阶段挂钩
const encourage = computed(() => {
  const messages = {
    0: '🌱 起步阶段，每一步都算数',
    1: '🌊 已经上路，稳住节奏',
    2: '💪 已过半程，曙光在前',
    3: '🔥 冲刺阶段，再加把劲',
    4: '🎉 目标达成！可以设个新目标了'
  }
  return messages[stage.value.level]
})

// FIRE 公式说明（动态）
const fireFormulaText = computed(() => {
  const ae = Number(fire.value.annualExpense) || 0
  if (ae <= 0) return ''
  const c = balance.value.currency
  const aeStr = fmt2(ae)
  switch (fire.value.flavor) {
    case 'lean':
    case 'fat':
      return `${c}${aeStr} × 25 = ${c}${fmt2(ae * 25)}`
    case 'barista':
      return `${c}${aeStr} × 12.5 = ${c}${fmt2(ae * 12.5)}`
    case 'coast': {
      const yrs = Math.max(0, Number(fire.value.retireAge) - Number(fire.value.currentAge))
      const r = Number(fire.value.expectedReturn) || 0
      const rPct = (r * 100).toFixed(0)
      return `${c}${aeStr} × 25 ÷ (1+${rPct}%)^${yrs} ≈ ${c}${fmt2(fireTarget.value)}`
    }
    default:
      return ''
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- 余额卡片 -->
    <div class="card-glow p-6 sm:p-8 animate-slide-up">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm text-ink-400 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-success-500 animate-pulse-slow" />
          我的余额
        </div>
        <button @click="openEditAmount" class="btn-ghost !p-1.5"
                title="更新当前金额">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="text-2xl text-ink-400">{{ balance.currency }}</span>
        <span
          class="text-5xl sm:text-6xl font-bold tracking-tight font-mono
                 bg-clip-text text-transparent transition-all duration-500"
          :style="{
            backgroundImage: `linear-gradient(to right, ${stage.gradFrom}, ${stage.gradVia}, ${stage.gradTo})`
          }"
        >
          {{ fmt2(balance.current) }}
        </span>
      </div>
      <p v-if="history.length > 0 && history[0].change !== 0"
         class="mt-2 text-sm flex items-center gap-1"
         :class="history[0].change > 0 ? 'text-success-400' : 'text-rose-400'">
        <span>{{ history[0].change > 0 ? '↑' : '↓' }}</span>
        <MoneyDisplay
          :value="Math.abs(history[0].change)"
          :currency="balance.currency"
          size="text-sm"
          unit-size="text-[0.7em]"
          :show-decimals="true"
        />
        <span class="text-ink-400 ml-1">较上次</span>
      </p>
    </div>

    <!-- 目标进度卡片 -->
    <div class="card p-6 sm:p-8 animate-slide-up" style="animation-delay: 80ms">
      <!-- FIRE 模式开关行 -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b border-ink-200/60 dark:border-ink-800/60">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">🔥 FIRE 模式</span>
          <button
            @click="showFireHelp = !showFireHelp"
            class="w-5 h-5 rounded-full border border-ink-300 dark:border-ink-600
                   text-ink-400 hover:text-ink-700 dark:hover:text-ink-200
                   text-xs flex items-center justify-center transition-colors"
            title="什么是 FIRE？"
          >
            ?
          </button>
        </div>
        <!-- 开关 -->
        <button
          @click="fire.enabled = !fire.enabled"
          class="relative w-11 h-6 rounded-full transition-colors"
          :class="fire.enabled ? 'bg-primary-500' : 'bg-ink-300 dark:bg-ink-700'"
          :title="fire.enabled ? '关闭 FIRE 模式（改回手动设置目标）' : '开启 FIRE 模式（按流派自动算目标）'"
        >
          <span
            class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            :style="{ left: fire.enabled ? '1.375rem' : '0.125rem' }"
          />
        </button>
      </div>

      <!-- FIRE 帮助内联展开 -->
      <div v-if="showFireHelp"
           class="mb-4 p-4 rounded-lg bg-ink-100/60 dark:bg-ink-800/40 text-sm space-y-2">
        <p class="text-ink-700 dark:text-ink-200">
          <strong>FIRE</strong>（Financial Independence, Retire Early）：用储蓄 + 指数化投资的复利，
          把"退休"从模糊人生阶段变成一个<strong>可计算的余额数字</strong>。
        </p>
        <p class="text-ink-500 dark:text-ink-400">
          基于 <strong>4% 安全提取率</strong>（Trinity Study）— 余额达到年支出 × 25
          后，每年取 4%，按历史回测 30 年大概率不破产。
        </p>
        <p class="text-ink-500 dark:text-ink-400">
          开启后，目标金额会按你选的流派自动算出，无需手填。
          关闭后保留最后的目标金额，可继续手动修改。
        </p>
      </div>

      <!-- FIRE 开启：流派选择 + 当前目标显示 -->
      <template v-if="fire.enabled">
        <!-- 流派切片 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <button
            v-for="f in FIRE_FLAVORS"
            :key="f.key"
            @click="fire.flavor = f.key"
            class="px-3 py-2.5 rounded-lg border text-left transition-all"
            :class="fire.flavor === f.key
              ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
              : 'border-ink-200 dark:border-ink-800 hover:border-ink-300 dark:hover:border-ink-700'"
          >
            <div class="text-base">{{ f.emoji }}</div>
            <div class="text-xs font-medium mt-0.5">{{ f.label }}</div>
            <div class="text-[10px] text-ink-400 mt-0.5">{{ f.short }}</div>
          </button>
        </div>

        <!-- 当前流派目标 -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-sm text-ink-400 mb-1 flex items-center gap-2">
              <span>🎯 {{ flavorMeta.label }} 目标</span>
            </div>
            <MoneyDisplay
              :value="fireTarget"
              :currency="balance.currency"
              size="text-2xl"
              unit-size="text-sm"
              class="font-bold"
              :show-decimals="true"
            />
            <div class="text-xs text-ink-400 mt-1 font-mono">{{ fireFormulaText }}</div>
          </div>
          <button @click="showFireConfig = true" class="btn-ghost text-xs">
            ⚙️ FIRE 配置
          </button>
        </div>
      </template>

      <!-- FIRE 关闭：保留原手填目标 UI -->
      <template v-else>
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-sm text-ink-400 mb-1">🎯 目标</div>
            <MoneyDisplay
              :value="balance.target"
              :currency="balance.currency"
              size="text-2xl"
              unit-size="text-sm"
              class="font-bold"
              :show-decimals="true"
            />
          </div>
          <button @click="openEditTarget" class="btn-ghost text-xs">
            ⚙️ 设置目标
          </button>
        </div>
      </template>

      <!-- 进度条（共用） -->
      <div class="mb-3">
        <div class="flex justify-between text-xs mb-2">
          <span class="text-ink-400 flex items-center gap-1.5">
            <span>进度</span>
            <span :class="stage.textCls"
                  class="font-medium px-1.5 py-0.5 rounded transition-colors"
                  :style="{ backgroundColor: stage.hex + '20' }">
              {{ stage.emoji }} {{ stage.label }}
            </span>
          </span>
          <span class="font-mono font-bold transition-colors"
                :class="stage.textCls">
            {{ progress.toFixed(1) }}%
          </span>
        </div>
        <div class="h-3 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden relative">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out relative"
            :style="{
              width: progress + '%',
              backgroundImage: `linear-gradient(to right, ${stage.gradFrom}, ${stage.gradVia}, ${stage.gradTo})`,
              boxShadow: `0 0 12px ${stage.hex}66`
            }"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent
                        animate-pulse-slow" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="text-ink-500 dark:text-ink-400 flex items-center gap-1.5">
          <span>还差</span>
          <MoneyDisplay
            :value="remaining"
            :currency="balance.currency"
            size="text-sm"
            unit-size="text-[0.7em]"
            class="text-ink-900 dark:text-ink-50 font-medium"
            :show-decimals="true"
          />
        </div>
        <div class="text-right transition-colors" :class="stage.textCls">
          {{ encourage }}
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="card p-6 animate-slide-up" style="animation-delay: 200ms">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold flex items-center gap-2">
          📝 更新记录
        </h2>
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-400">{{ history.length }} 条</span>
          <button
            v-if="history.length"
            @click="showClearHistory = true"
            class="btn-ghost !p-1 text-ink-400 hover:!text-rose-400"
            title="清空更新记录"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="history.length" class="space-y-1 max-h-80 overflow-y-auto">
        <div v-for="h in history" :key="h.date"
             class="px-3 py-2.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800/50
                    transition-colors text-sm">
          <div class="flex items-start justify-between gap-3">
            <MoneyDisplay
              :value="h.amount"
              :currency="balance.currency"
              size="text-base sm:text-sm"
              unit-size="text-[0.7em]"
              class="min-w-0"
              :show-decimals="true"
            />
            <span v-if="h.change !== 0" class="text-xs font-mono shrink-0 pt-0.5"
                  :class="h.change > 0 ? 'text-success-400' : 'text-rose-400'">
              {{ h.change > 0 ? '+' : '-' }}{{ fmt2(Math.abs(h.change)) }}
            </span>
          </div>
          <div class="mt-1 text-xs text-ink-400 font-mono">
            {{ fmtDate(h.date) }}
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 text-sm text-ink-400">
        还没有记录 — 点上面 ✏️ 更新一下当前金额开始吧
      </div>
    </div>

    <!-- 提示 -->
    <div class="text-center text-xs text-ink-400 pt-4">
      数据存在你的浏览器本地，不会上传到任何地方
    </div>

    <!-- 编辑当前金额 -->
    <Modal v-model="showEditAmount" title="更新当前金额">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-ink-400 mb-1.5">当前余额</label>
          <div class="flex items-center gap-2">
            <span class="text-xl text-ink-400">{{ balance.currency }}</span>
            <input
              v-model="editAmountValue"
              type="number"
              step="0.01"
              min="0"
              class="input flex-1 text-lg font-mono"
              placeholder="0.00"
              @input="editAmountValue = normalizeMoneyInput($event.target.value)"
              @keydown.enter="saveAmount"
              autofocus
            />
          </div>
          <p class="text-xs text-ink-400 mt-1.5">
            打开支付宝看一眼，把数字填进来
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="showEditAmount = false" class="btn-ghost">取消</button>
          <button @click="saveAmount" class="btn-primary">保存</button>
        </div>
      </div>
    </Modal>

    <!-- 编辑目标（FIRE 关闭时） -->
    <Modal v-model="showEditTarget" title="设置目标">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-ink-400 mb-1.5">目标金额</label>
          <div class="flex items-center gap-2">
            <span class="text-xl text-ink-400">{{ balance.currency }}</span>
            <input
              v-model="editTargetValue"
              type="number"
              step="0.01"
              min="1"
              class="input flex-1 text-lg font-mono"
              placeholder="100000.00"
              @input="editTargetValue = normalizeMoneyInput($event.target.value)"
              @keydown.enter="saveTarget"
              autofocus
            />
          </div>
          <p class="text-xs text-ink-400 mt-1.5">
            比如：买电脑 8000、年存 10万、首付 30万 ...
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="showEditTarget = false" class="btn-ghost">取消</button>
          <button @click="saveTarget" class="btn-primary">保存</button>
        </div>
      </div>
    </Modal>

    <!-- FIRE 配置（FIRE 开启时） -->
    <Modal v-model="showFireConfig" :title="`${flavorMeta.emoji} ${flavorMeta.label} 配置`">
      <div class="space-y-4">
        <p class="text-sm text-ink-500 dark:text-ink-400">{{ flavorMeta.desc }}</p>

        <div>
          <label class="block text-sm text-ink-400 mb-1.5">年支出（{{ balance.currency }}）</label>
          <input
            v-model.number="fire.annualExpense"
            type="number"
            step="0.01"
            min="0"
            class="input w-full font-mono"
            @input="fire.annualExpense = normalizeMoneyInput($event.target.value)"
          />
          <p class="text-xs text-ink-400 mt-1.5">{{ flavorMeta.hint }}</p>
        </div>

        <!-- Coast 专属 -->
        <template v-if="fire.flavor === 'coast'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-ink-400 mb-1.5">当前年龄</label>
              <input
                v-model.number="fire.currentAge"
                type="number" min="18" max="80"
                class="input w-full font-mono"
              />
            </div>
            <div>
              <label class="block text-sm text-ink-400 mb-1.5">退休年龄</label>
              <input
                v-model.number="fire.retireAge"
                type="number" min="30" max="90"
                class="input w-full font-mono"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm text-ink-400 mb-1.5">
              预期年化回报（实际，扣通胀）
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="fire.expectedReturn"
                type="number" step="0.01" min="0" max="0.2"
                class="input flex-1 font-mono"
              />
              <span class="text-sm text-ink-400">
                ≈ {{ (fire.expectedReturn * 100).toFixed(1) }}%
              </span>
            </div>
            <p class="text-xs text-ink-400 mt-1.5">
              FIRE 圈常用 5-7%（标普 500 长期实际回报约 7%）
            </p>
          </div>
        </template>

        <div class="p-3 rounded-lg bg-ink-100 dark:bg-ink-800/60 text-sm">
          <div class="text-ink-400 mb-1">计算结果</div>
          <MoneyDisplay
            :value="fireTarget"
            :currency="balance.currency"
            size="text-lg"
            unit-size="text-xs"
            class="font-bold"
            :show-decimals="true"
          />
          <div class="text-xs text-ink-400 mt-1 font-mono">{{ fireFormulaText }}</div>
        </div>

        <div class="flex justify-end">
          <button @click="showFireConfig = false" class="btn-primary">完成</button>
        </div>
      </div>
    </Modal>

    <!-- 清空更新记录确认 -->
    <Modal v-model="showClearHistory" title="清空更新记录？">
      <div class="space-y-4">
        <div class="text-sm space-y-2">
          <p>将永久删除全部 <strong class="font-mono">{{ history.length }}</strong> 条更新记录，
            <strong class="text-rose-500">此操作不可撤销</strong>。</p>
          <p class="text-ink-500 dark:text-ink-400">
            余额、目标和 FIRE 配置不受影响，只清空记录。
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="showClearHistory = false" class="btn-ghost">取消</button>
          <button @click="confirmClearHistory"
                  class="btn-primary !bg-rose-500 hover:!bg-rose-600">
            确认清空
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
