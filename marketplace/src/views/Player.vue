<template>
  <div class="fixed inset-0 bg-black flex flex-col">
    <!-- Minimal top bar -->
    <div class="flex items-center justify-between px-4 py-2 bg-surface-container/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
      <RouterLink :to="`/game/${slug}`" class="flex items-center space-x-2 text-[10px] text-on-surface-variant hover:text-on-surface transition-colors">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        <span>Back</span>
      </RouterLink>
      <span class="text-[10px] font-bold text-on-surface uppercase tracking-widest">{{ slug }}</span>
      <button @click="toggleFullscreen" class="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors">
        <span class="material-symbols-outlined text-sm">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
      </button>
    </div>
    <!-- Game iframe -->
    <iframe
      v-if="gameUrl"
      :src="gameUrl"
      class="flex-1 w-full border-none mt-10"
      allow="fullscreen"
      title="Game Player"
    />
    <div v-else class="flex-1 flex items-center justify-center text-slate-500 text-sm mt-10">
      Loading game...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGamesStore } from '../stores/gamesStore'

const route = useRoute()
const slug = route.params.slug as string
const isFullscreen = ref(false)
const gameUrl = ref('')
const gamesStore = useGamesStore()

onMounted(async () => {
  // Increment play count
  fetch(`http://localhost:3004/api/games/${slug}/play`, { method: 'POST' }).catch(() => {})

  // Determine the iframe URL:
  // 1. If game has a project_path that is a URL (starts with /static or http), use it directly
  // 2. Otherwise fall back to the static file convention
  const game = await gamesStore.fetchGame(slug)
  if (game?.project_path && (game.project_path.startsWith('/static') || game.project_path.startsWith('http'))) {
    const base = game.project_path.startsWith('http') ? '' : 'http://localhost:3004'
    gameUrl.value = `${base}${game.project_path}`
  } else {
    gameUrl.value = `http://localhost:3004/static/${slug}/index.html`
  }
})

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
