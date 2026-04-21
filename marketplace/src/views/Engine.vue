<template>
  <div class="fixed inset-0 bg-black flex flex-col">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-2 bg-surface-container/90 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 border-b border-surface-highest">
      <RouterLink to="/" class="flex items-center space-x-2 text-[10px] text-on-surface-variant hover:text-on-surface transition-colors">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        <span>Marketplace</span>
      </RouterLink>
      <div class="flex items-center space-x-2">
        <span class="text-[9px] text-secondary border border-secondary/40 px-2 py-0.5 uppercase tracking-widest font-bold">Nexus Engine</span>
        <span class="text-[9px] text-slate-600 uppercase tracking-widest">v2.0</span>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-[9px] text-slate-600">Crée ton jeu · Publie sur GameForge</span>
        <button @click="toggleFullscreen" class="text-on-surface-variant hover:text-on-surface transition-colors">
          <span class="material-symbols-outlined text-sm">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
        </button>
      </div>
    </div>

    <!-- Engine iframe -->
    <iframe
      src="http://localhost:3000"
      class="flex-1 w-full border-none mt-10"
      allow="fullscreen; clipboard-read; clipboard-write"
      title="Nexus Engine IDE"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}
</script>
