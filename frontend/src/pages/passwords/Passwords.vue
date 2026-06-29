<script setup>
/**
 * 密码本页 — 列表 / 搜索 / 筛选 / 排序 / 增删改 / 导入导出。
 *
 * 安全码验证由路由守卫统一负责，这里不再做二次输入。
 * 进入时 unlock：成功 → 渲染；失败 → 直接跳 verify，本页不显示提示界面。
 * 离开时 lock，清掉派生 key。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '../../components/Modal.vue'
import PasswordCard from './PasswordCard.vue'
import PasswordEditModal from './PasswordEditModal.vue'
import ImportExportModal from './ImportExportModal.vue'
import { clearSessionVerified } from '../../composables/useSecurityCode'
import { useVault } from '../../composables/useVault'

const router = useRouter()
const vault = useVault()

// 解锁状态：'loading' = 解锁中，'ok' = 成功（失败时直接跳路由，不会停在这里）
const unlockState = ref('loading')

onMounted(async () => {
  try {
    await vault.unlock()
    unlockState.value = 'ok'
  } catch {
    // 内存里没有原文（刷新后）或解密失败 — 都走守卫重新验证。
    // 清掉会话标记，强制 verify 页弹出。
    clearSessionVerified()
    vault.lock()
    router.replace({ path: '/security/verify', query: { redirect: '/passwords' } })
  }
})

onBeforeUnmount(() => {
  vault.lock()
})

// 搜索 / 筛选 / 排序状态
const searchText = ref('')
const selectedCategories = ref(new Set())
const selectedTags = ref(new Set())
const sortMode = ref('updated') // 'updated' | 'name'

const allCategories = computed(() => {
  const set = new Set()
  for (const e of vault.entries.value) {
    if (e.category) set.add(e.category)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})
const allTags = computed(() => {
  const set = new Set()
  for (const e of vault.entries.value) for (const t of e.tags || []) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b))
})

function toggleSet(set, value) {
  const next = new Set(set.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  set.value = next
}

const filtered = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  const cats = selectedCategories.value
  const tags = selectedTags.value
  return vault.entries.value.filter((e) => {
    if (cats.size && !cats.has(e.category)) return false
    if (tags.size) {
      const entryTagsLower = (e.tags || []).map((t) => t.toLowerCase())
      for (const t of tags) {
        if (!entryTagsLower.includes(t.toLowerCase())) return false
      }
    }
    if (q) {
      const hay = [
        (e.project || '').toLowerCase(),
        (e.category || '').toLowerCase(),
        ...((e.tags || []).map((t) => t.toLowerCase()))
      ]
      if (!hay.some((s) => s.includes(q))) return false
    }
    return true
  })
})

const sorted = computed(() => {
  const list = [...filtered.value]
  if (sortMode.value === 'name') {
    list.sort((a, b) => (a.project || '').localeCompare(b.project || '', undefined, { sensitivity: 'base' }))
  } else {
    list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }
  return list
})

// 增删改弹窗状态
const editModalOpen = ref(false)
const editingEntry = ref(null)
function openAdd() {
  editingEntry.value = null
  editModalOpen.value = true
}
function openEdit(id) {
  editingEntry.value = vault.entries.value.find((e) => e.id === id) || null
  if (editingEntry.value) editModalOpen.value = true
}

const saveError = ref('')
async function onSubmit(payload) {
  saveError.value = ''
  try {
    if (editingEntry.value) {
      await vault.updateEntry(editingEntry.value.id, payload)
    } else {
      await vault.addEntry(payload)
    }
  } catch (err) {
    saveError.value = err?.message || '保存失败'
  }
}

const deleteId = ref(null)
const deleteOpen = ref(false)
function openDelete(id) {
  deleteId.value = id
  deleteOpen.value = true
}
async function confirmDelete() {
  if (!deleteId.value) return
  try {
    await vault.removeEntry(deleteId.value)
  } catch (err) {
    saveError.value = err?.message || '删除失败'
  }
  deleteOpen.value = false
  deleteId.value = null
}

// 导入 / 导出
const ieOpen = ref(false)
const ieMode = ref('import')
function openImport() {
  ieMode.value = 'import'
  ieOpen.value = true
}
function openExport() {
  ieMode.value = 'export'
  ieOpen.value = true
}
async function onImport({ entries, mode }) {
  saveError.value = ''
  try {
    if (mode === 'replace') await vault.replaceAll(entries)
    else await vault.mergeImport(entries)
  } catch (err) {
    saveError.value = err?.message || '导入失败'
  }
}

const exportData = computed(() => vault.exportPlain())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-bold flex items-center gap-2">🔐 密码本</h2>
      <div class="flex items-center gap-2">
        <button
          v-if="unlockState === 'ok'"
          type="button"
          class="btn-ghost text-xs"
          :title="sortMode === 'updated' ? '改为按名称排序' : '改为按更新时间排序'"
          @click="sortMode = sortMode === 'updated' ? 'name' : 'updated'"
        >
          {{ sortMode === 'updated' ? '按更新时间 ▾' : '按名称 ▾' }}
        </button>
        <button
          v-if="unlockState === 'ok'"
          type="button"
          class="btn-primary text-xs"
          @click="openAdd"
        >➕ 新增</button>
      </div>
    </div>

    <!-- 解锁中（失败时已经被 router.replace 跳走，不会停在这） -->
    <div v-if="unlockState === 'loading'" class="card p-6 text-center text-sm text-ink-400">
      正在解锁密码库...
    </div>

    <!-- 正常显示 -->
    <template v-else>
      <input
        v-model="searchText"
        type="text"
        class="input w-full"
        placeholder="🔍 搜索项目名 / 类型 / 标签"
      />

      <div v-if="allCategories.length" class="text-xs flex items-center flex-wrap gap-1.5">
        <span class="text-ink-400">类型:</span>
        <button
          v-for="c in allCategories"
          :key="'c-' + c"
          type="button"
          class="px-2 py-0.5 rounded border transition-colors"
          :class="selectedCategories.has(c)
            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
            : 'border-ink-200 dark:border-ink-800 text-ink-500 hover:border-ink-400'"
          @click="toggleSet(selectedCategories, c)"
        >{{ c }}</button>
      </div>

      <div v-if="allTags.length" class="text-xs flex items-center flex-wrap gap-1.5">
        <span class="text-ink-400">标签:</span>
        <button
          v-for="t in allTags"
          :key="'t-' + t"
          type="button"
          class="px-2 py-0.5 rounded border transition-colors"
          :class="selectedTags.has(t)
            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
            : 'border-ink-200 dark:border-ink-800 text-ink-500 hover:border-ink-400'"
          @click="toggleSet(selectedTags, t)"
        >#{{ t }}</button>
      </div>

      <p v-if="saveError" class="text-sm text-rose-400">{{ saveError }}</p>

      <!-- 空状态 -->
      <div
        v-if="!vault.entries.value.length"
        class="card p-8 text-center space-y-3"
      >
        <p class="text-ink-400 text-sm">还没有账号 — 加一条开始吧</p>
        <div class="flex justify-center gap-2">
          <button type="button" class="btn-primary text-xs" @click="openAdd">➕ 新增第一个账号</button>
          <button type="button" class="btn-ghost text-xs" @click="openImport">📥 从 JSON 导入</button>
        </div>
      </div>

      <!-- 列表 -->
      <div v-else-if="sorted.length" class="space-y-2">
        <PasswordCard
          v-for="e in sorted"
          :key="e.id"
          :entry="e"
          @edit="openEdit"
          @delete="openDelete"
        />
      </div>

      <div v-else class="card p-6 text-center text-sm text-ink-400">
        没有匹配的账号
      </div>

      <div class="flex justify-center gap-2 pt-2">
        <button type="button" class="btn-ghost text-xs" @click="openImport">📥 导入 JSON</button>
        <button type="button" class="btn-ghost text-xs" @click="openExport">📤 导出 JSON</button>
      </div>
    </template>

    <PasswordEditModal
      v-model="editModalOpen"
      :entry="editingEntry"
      @submit="onSubmit"
    />

    <ImportExportModal
      v-model="ieOpen"
      :mode="ieMode"
      :export-data="exportData"
      @import="onImport"
    />

    <Modal v-model="deleteOpen" title="确认删除此账号？此操作不可撤销。">
      <div class="space-y-3 text-sm">
        <p class="text-ink-500 dark:text-ink-400">删除后无法恢复。请确认。</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-ghost" @click="deleteOpen = false">取消</button>
          <button
            type="button"
            class="btn-primary !bg-rose-500 hover:!bg-rose-600"
            @click="confirmDelete"
          >确认删除</button>
        </div>
      </div>
    </Modal>
  </div>
</template>
