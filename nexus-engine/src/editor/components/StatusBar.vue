<template>
  <div class="h-6 bg-[#070e1d] flex items-center justify-between px-4 flex-none text-[9px] font-mono">
    <!-- Left -->
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-1.5">
        <div class="w-2 h-2 rounded-full" :class="store.isPlaying ? 'bg-secondary animate-pulse' : 'bg-surface-bright'" />
        <span class="text-slate-400 uppercase font-bold">{{ store.isPlaying ? 'Playing' : 'Editor Ready' }}</span>
      </div>
      <span class="text-slate-600 uppercase">
        {{ store.entityCount }} entities
      </span>
      <span class="text-slate-600">|</span>
      <span class="text-slate-600 uppercase">Branch: main</span>
    </div>

    <!-- Right -->
    <div class="flex items-center space-x-4 text-slate-500">
      <span :class="fpsColor">FPS: {{ store.fps || '--' }}</span>
      <span>Draw: {{ store.drawCalls }}</span>
      <span>Tris: {{ (store.triangles / 1000).toFixed(1) }}K</span>
      <span>UTF-8</span>
      <span class="uppercase">TypeScript</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'

const store = useEditorStore()
const fpsColor = computed(() => {
  if (!store.fps) return 'text-slate-500'
  if (store.fps >= 55) return 'text-secondary'
  if (store.fps >= 30) return 'text-yellow-400'
  return 'text-error'
})
</script>
