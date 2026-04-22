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
      ref="engineFrame"
      :src="engineSrc"
      class="flex-1 w-full border-none mt-10"
      allow="fullscreen; clipboard-read; clipboard-write"
      title="Nexus Engine IDE"
      @load="startAuthHandshake"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const route = useRoute()
const isFullscreen = ref(false)
const engineFrame = ref<HTMLIFrameElement | null>(null)
const engineSrc = computed(() => (import.meta.env.VITE_NEXUS_ENGINE_URL as string | undefined) || 'http://localhost:3000')
const engineOrigin = computed(() => new URL(engineSrc.value).origin)
const gameId = computed(() => route.query.gameId ? Number(route.query.gameId) : null)
let authTimer: number | undefined

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

function sendAuthToEngine() {
  if (!auth.token || !engineFrame.value?.contentWindow) return
  engineFrame.value.contentWindow.postMessage(
    { type: 'GAMEFORGE_AUTH', token: auth.token },
    engineOrigin.value,
  )
}

function startAuthHandshake() {
  window.clearInterval(authTimer)
  let attempts = 0
  sendAuthToEngine()
  authTimer = window.setInterval(() => {
    attempts += 1
    sendAuthToEngine()
    if (attempts >= 12) window.clearInterval(authTimer)
  }, 500)
}

function sendProjectToEngine() {
  if (!gameId.value || !engineFrame.value?.contentWindow) return
  engineFrame.value.contentWindow.postMessage(
    { type: 'LOAD_PROJECT', gameId: gameId.value, token: auth.token },
    engineOrigin.value,
  )
}

function handleEngineMessage(event: MessageEvent) {
  if (event.origin !== engineOrigin.value) return
  if (event.data?.type === 'NEXUS_AUTH_OK') {
    window.clearInterval(authTimer)
    if (gameId.value) sendProjectToEngine()
  }
}

onMounted(() => {
  window.addEventListener('message', handleEngineMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleEngineMessage)
  window.clearInterval(authTimer)
})
</script>
