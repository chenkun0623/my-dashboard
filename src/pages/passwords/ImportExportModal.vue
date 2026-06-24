<script setup>
/**
 * 导入 / 导出 JSON — 明文格式，整库一次性。
 *
 * 导入：粘贴 JSON 数组，选 合并 / 替换。
 * 导出：点按钮直接下载 passwords-export-YYYYMMDD.json。
 */
import { computed, ref, watch } from 'vue'
import Modal from '../../components/Modal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'import' }, // 'import' | 'export'
  exportData: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'import'])

const activeTab = ref(props.mode)
const importText = ref('')
const importMode = ref('merge') // 'merge' | 'replace'
const error = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeTab.value = props.mode === 'export' ? 'export' : 'import'
      importText.value = ''
      importMode.value = 'merge'
      error.value = ''
    }
  }
)

function close() {
  emit('update:modelValue', false)
}

function todayStamp() {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${mo}${dd}`
}

function doExport() {
  const blob = new Blob([JSON.stringify(props.exportData, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `passwords-export-${todayStamp()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function doImport() {
  error.value = ''
  let parsed
  try {
    parsed = JSON.parse(importText.value)
  } catch {
    error.value = 'JSON 格式不正确'
    return
  }
  if (!Array.isArray(parsed)) {
    error.value = '应为账号数组'
    return
  }
  emit('import', { entries: parsed, mode: importMode.value })
  close()
}

const exportCount = computed(() => props.exportData.length)
</script>

<template>
  <Modal :model-value="modelValue" title="导入 / 导出" @update:model-value="close">
    <div class="space-y-3 text-sm">
      <div class="flex gap-1 border-b border-ink-200/60 dark:border-ink-800/60">
        <button
          type="button"
          class="px-3 py-1.5 border-b-2"
          :class="activeTab === 'import'
            ? 'text-primary-500 border-primary-500'
            : 'text-ink-400 border-transparent'"
          @click="activeTab = 'import'"
        >导入</button>
        <button
          type="button"
          class="px-3 py-1.5 border-b-2"
          :class="activeTab === 'export'
            ? 'text-primary-500 border-primary-500'
            : 'text-ink-400 border-transparent'"
          @click="activeTab = 'export'"
        >导出</button>
      </div>

      <div v-if="activeTab === 'import'" class="space-y-3">
        <p class="text-xs text-ink-400">
          粘贴账号 JSON 数组。合并模式按 id 去重并保留较新 updatedAt；替换模式整库覆盖。
        </p>
        <textarea
          v-model="importText"
          rows="8"
          class="input w-full font-mono text-xs"
          placeholder='[{"project": "微信", "username": "..."}]'
        />
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 text-xs">
            <input v-model="importMode" type="radio" value="merge" />
            合并
          </label>
          <label class="flex items-center gap-1.5 text-xs">
            <input v-model="importMode" type="radio" value="replace" />
            替换
          </label>
        </div>
        <p v-if="error" class="text-sm text-rose-400">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="doImport">导入</button>
        </div>
      </div>

      <div v-else class="space-y-3">
        <p class="text-xs text-ink-400">
          当前共 {{ exportCount }} 条账号。导出为明文 JSON 文件（passwords-export-YYYYMMDD.json）。
        </p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-ghost" @click="close">关闭</button>
          <button type="button" class="btn-primary" @click="doExport">下载 JSON</button>
        </div>
      </div>
    </div>
  </Modal>
</template>
