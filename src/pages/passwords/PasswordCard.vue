<script setup>
/**
 * 密码卡片 — 折叠默认显示项目+类型+标签；展开看完整明文。
 * 复制按钮兼容旧浏览器（utils/clipboard.js）；密码默认星号。
 */
import { computed, ref, watch } from 'vue'
import { copyText } from '../../utils/clipboard'

const props = defineProps({
  entry: { type: Object, required: true }
})
const emit = defineEmits(['edit', 'delete'])

const expanded = ref(false)
const showPassword = ref(false)

watch(expanded, (v) => {
  if (!v) showPassword.value = false
})

const passwordMask = computed(() => {
  const len = Math.min(12, (props.entry.password || '').length || 6)
  return '•'.repeat(len)
})

const updatedDate = computed(() => {
  const iso = props.entry.updatedAt
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${dd}`
})

// 每个复制按钮独立的 ✓/× 反馈状态
const copyState = ref({}) // { username: 'ok' | 'fail' | undefined, ... }
function flashCopy(field, ok) {
  copyState.value = { ...copyState.value, [field]: ok ? 'ok' : 'fail' }
  setTimeout(() => {
    const next = { ...copyState.value }
    delete next[field]
    copyState.value = next
  }, 1500)
}

async function doCopy(field) {
  const value = props.entry[field]
  if (!value) {
    flashCopy(field, false)
    return
  }
  const ok = await copyText(String(value))
  flashCopy(field, ok)
}

function copyIcon(field) {
  const s = copyState.value[field]
  if (s === 'ok') return '✓'
  if (s === 'fail') return '×'
  return '📋'
}
</script>

<template>
  <div class="card p-4 sm:p-5 animate-slide-up">
    <!-- 折叠头 -->
    <button
      type="button"
      class="w-full text-left flex items-start justify-between gap-3"
      @click="expanded = !expanded"
    >
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-base">{{ entry.project || '未命名' }}</span>
          <span
            v-if="entry.category"
            class="text-xs px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-500 dark:text-primary-300"
          >
            {{ entry.category }}
          </span>
        </div>
        <p v-if="entry.username" class="text-xs text-ink-400 mt-1 font-mono truncate">
          {{ entry.username }}
        </p>
        <div v-if="entry.tags?.length" class="flex flex-wrap gap-1 mt-2">
          <span
            v-for="t in entry.tags"
            :key="t"
            class="text-[11px] px-1.5 py-0.5 rounded bg-ink-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300"
          >
            #{{ t }}
          </span>
        </div>
      </div>
      <span class="text-ink-400 text-xs mt-1">{{ expanded ? '⌃' : '⌄' }}</span>
    </button>

    <!-- 展开详情 -->
    <div v-if="expanded" class="mt-4 space-y-2 text-sm">
      <div v-if="entry.username" class="flex items-center gap-2">
        <span class="text-ink-400 w-12 shrink-0">账号</span>
        <span class="font-mono flex-1 min-w-0 break-all">{{ entry.username }}</span>
        <button
          type="button"
          class="btn-ghost !p-1 text-ink-400 hover:!text-primary-500"
          :title="`复制账号`"
          @click.stop="doCopy('username')"
        >{{ copyIcon('username') }}</button>
      </div>

      <div v-if="entry.email" class="flex items-center gap-2">
        <span class="text-ink-400 w-12 shrink-0">邮箱</span>
        <span class="font-mono flex-1 min-w-0 break-all">{{ entry.email }}</span>
        <button
          type="button"
          class="btn-ghost !p-1 text-ink-400 hover:!text-primary-500"
          :title="`复制邮箱`"
          @click.stop="doCopy('email')"
        >{{ copyIcon('email') }}</button>
      </div>

      <div v-if="entry.phone" class="flex items-center gap-2">
        <span class="text-ink-400 w-12 shrink-0">电话</span>
        <span class="font-mono flex-1 min-w-0 break-all">{{ entry.phone }}</span>
        <button
          type="button"
          class="btn-ghost !p-1 text-ink-400 hover:!text-primary-500"
          :title="`复制电话`"
          @click.stop="doCopy('phone')"
        >{{ copyIcon('phone') }}</button>
      </div>

      <div v-if="entry.password" class="flex items-center gap-2">
        <span class="text-ink-400 w-12 shrink-0">密码</span>
        <span class="font-mono flex-1 min-w-0 break-all">
          {{ showPassword ? entry.password : passwordMask }}
        </span>
        <button
          type="button"
          class="btn-ghost !p-1 text-ink-400 hover:!text-primary-500"
          :title="showPassword ? '隐藏密码' : '查看密码'"
          @click.stop="showPassword = !showPassword"
        >{{ showPassword ? '🙈' : '👁️' }}</button>
        <button
          type="button"
          class="btn-ghost !p-1 text-ink-400 hover:!text-primary-500"
          :title="`复制密码`"
          @click.stop="doCopy('password')"
        >{{ copyIcon('password') }}</button>
      </div>

      <div v-if="entry.note" class="flex items-start gap-2">
        <span class="text-ink-400 w-12 shrink-0">备注</span>
        <span class="flex-1 min-w-0 whitespace-pre-wrap">{{ entry.note }}</span>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-ink-200/60 dark:border-ink-800/60">
        <span class="text-xs text-ink-400">更新于 {{ updatedDate }}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="btn-ghost !p-1 text-ink-400 hover:!text-primary-500"
            title="编辑"
            @click.stop="emit('edit', entry.id)"
          >✏️</button>
          <button
            type="button"
            class="btn-ghost !p-1 text-ink-400 hover:!text-rose-400"
            title="删除"
            @click.stop="emit('delete', entry.id)"
          >🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>
