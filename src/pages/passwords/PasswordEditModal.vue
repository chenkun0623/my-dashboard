<script setup>
/**
 * 新增 / 编辑账号表单 — 项目名必填，其它都可空；标签按回车或逗号添加。
 */
import { computed, ref, watch } from 'vue'
import Modal from '../../components/Modal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  entry: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'submit'])

const form = ref(blankForm())
const tagInput = ref('')

function blankForm() {
  return {
    project: '',
    category: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    tags: [],
    note: ''
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.entry) {
      form.value = {
        project: props.entry.project ?? '',
        category: props.entry.category ?? '',
        username: props.entry.username ?? '',
        email: props.entry.email ?? '',
        phone: props.entry.phone ?? '',
        password: props.entry.password ?? '',
        tags: Array.isArray(props.entry.tags) ? [...props.entry.tags] : [],
        note: props.entry.note ?? ''
      }
    } else {
      form.value = blankForm()
    }
    tagInput.value = ''
  }
)

const canSave = computed(() => form.value.project.trim().length > 0)

function addTagFromInput() {
  const raw = tagInput.value
  if (!raw) return
  const parts = raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const p of parts) {
    if (!form.value.tags.some((t) => t.toLowerCase() === p.toLowerCase())) {
      form.value.tags.push(p)
    }
  }
  tagInput.value = ''
}

function onTagKeydown(e) {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
    e.preventDefault()
    addTagFromInput()
  } else if (e.key === 'Backspace' && tagInput.value === '' && form.value.tags.length) {
    form.value.tags.pop()
  }
}

function removeTag(idx) {
  form.value.tags.splice(idx, 1)
}

function close() {
  emit('update:modelValue', false)
}

function save() {
  if (!canSave.value) return
  addTagFromInput() // 把输入框里没回车的也吃掉
  emit('submit', {
    project: form.value.project.trim(),
    category: form.value.category.trim(),
    username: form.value.username,
    email: form.value.email,
    phone: form.value.phone,
    password: form.value.password,
    tags: [...form.value.tags],
    note: form.value.note
  })
  close()
}

const title = computed(() => (props.entry ? '编辑账号' : '新增账号'))
</script>

<template>
  <Modal :model-value="modelValue" :title="title" @update:model-value="close">
    <div class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-ink-400 mb-1">项目名称 <span class="text-rose-400">*</span></label>
        <input v-model="form.project" type="text" class="input w-full" placeholder="如：微信、GitHub" />
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">类型</label>
        <input v-model="form.category" type="text" class="input w-full" placeholder="如：社交 / 工作" />
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">账号名</label>
        <input v-model="form.username" type="text" class="input w-full font-mono" autocomplete="off" />
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">邮箱</label>
        <input v-model="form.email" type="text" class="input w-full font-mono" autocomplete="off" />
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">电话</label>
        <input v-model="form.phone" type="text" class="input w-full font-mono" autocomplete="off" />
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">密码</label>
        <input v-model="form.password" type="text" class="input w-full font-mono" autocomplete="off" />
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">标签（回车或逗号添加）</label>
        <div class="input w-full flex flex-wrap gap-1 min-h-[2.5rem] items-center">
          <span
            v-for="(t, idx) in form.tags"
            :key="t + idx"
            class="text-[11px] px-1.5 py-0.5 rounded bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-200 flex items-center gap-1"
          >
            #{{ t }}
            <button type="button" class="text-ink-400 hover:text-rose-400" @click="removeTag(idx)">×</button>
          </span>
          <input
            v-model="tagInput"
            type="text"
            class="flex-1 min-w-[80px] bg-transparent outline-none text-sm"
            placeholder="如：常用"
            @keydown="onTagKeydown"
            @blur="addTagFromInput"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs text-ink-400 mb-1">备注</label>
        <textarea v-model="form.note" rows="3" class="input w-full" />
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="btn-ghost" @click="close">取消</button>
        <button
          type="button"
          class="btn-primary"
          :disabled="!canSave"
          :class="canSave ? '' : 'opacity-60 cursor-not-allowed'"
          @click="save"
        >保存</button>
      </div>
    </div>
  </Modal>
</template>
