<template>
  <div class="grid grid-cols-4 gap-1 items-center">
    <span class="text-[9px] text-slate-500 uppercase">{{ label }}</span>
    <div v-for="(axis, i) in axes" :key="axis" class="bg-surface-highest flex items-center px-1 py-1">
      <span class="text-[9px] font-bold mr-1 flex-none" :class="colors[i]">{{ axis }}</span>
      <input
        type="number"
        step="0.1"
        :value="Number(value[axis as keyof typeof value]).toFixed(3)"
        @change="(e) => emitChange(axis, (e.target as HTMLInputElement).value)"
        class="bg-transparent border-none p-0 text-[10px] font-mono w-full focus:ring-0 focus:outline-none text-on-surface min-w-0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  value: { x: number; y: number; z: number }
}>()
const emit = defineEmits<{ change: [v: { x: number; y: number; z: number }] }>()

const axes = ['x', 'y', 'z'] as const
const colors = ['text-rose-400', 'text-emerald-400', 'text-blue-400']

function emitChange(axis: string, raw: string) {
  emit('change', { ...props.value, [axis]: parseFloat(raw) || 0 })
}
</script>
