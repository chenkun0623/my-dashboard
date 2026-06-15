<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm
               flex items-center justify-center p-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 scale-95"
          appear
        >
          <div
            class="card w-full max-w-md p-6 animate-slide-up"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">{{ title }}</h3>
              <button @click="close" class="btn-ghost !p-1.5">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>