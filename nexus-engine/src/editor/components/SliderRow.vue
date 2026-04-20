<template>
  <div class="space-y-0.5">
    <div class="flex items-center justify-between">
      <span class="text-[9px] text-slate-500 uppercase">{{ label }}</span>
      <span class="text-[9px] font-mono text-on-surface-variant">{{ displayValue }}</span>
    </div>
    <input
      type="range"
      :min="min" :max="max" :step="step"
      :value="modelValue"
      @input="(e) => emit('update:modelValue', parseFloat((e.target as HTMLInputElement).value))"
      class="w-full h-1 appearance-none bg-surface-highest cursor-pointer accent-secondary"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  min: number
  max: number
  step: number
  modelValue: number
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

const displayValue = computed(() => {
  const v = props.modelValue
  return props.step < 0.01 ? v.toFixed(3) : props.step < 1 ? v.toFixed(2) : Math.round(v)
})
</script>
