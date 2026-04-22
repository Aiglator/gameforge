<template>
  <div v-if="authStatus !== 'authorized'" class="bg-surface text-on-surface h-screen overflow-hidden flex items-center justify-center dark px-6">
    <div class="w-full max-w-sm bg-surface-container border border-surface-highest p-8">
      <div class="text-[10px] font-black tracking-[0.2em] uppercase text-secondary mb-3">Nexus Engine</div>
      <div v-if="authStatus === 'checking'" class="text-[11px] text-on-surface-variant">
        Verification de la session GameForge...
      </div>
      <div v-else class="space-y-4">
        <div class="text-[11px] text-red-400 bg-red-400/10 px-3 py-2">
          {{ authError || 'Connexion GameForge requise.' }}
        </div>
        <a
          :href="marketplaceAuthUrl"
          class="block bg-accent text-surface text-[10px] font-bold uppercase tracking-widest py-2.5 text-center hover:bg-accent/80 transition-colors"
        >
          Se connecter
        </a>
      </div>
    </div>
  </div>

  <div v-else class="bg-surface text-on-surface h-screen overflow-hidden flex flex-col select-none dark">

    <!-- Project Wizard (shown on first launch) -->
    <ProjectWizard v-if="store.showWizard" />

    <!-- Top Bar -->
    <TopBar />

    <!-- Main workspace -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Side Nav Rail -->
      <SideNav />

      <!-- Panels container -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- Upper zone: left panel + viewport + inspector -->
        <div class="flex overflow-hidden" :style="{ height: `calc(100% - ${store.bottomPanelHeight}px - 40px)` }">

          <!-- Left sliding panel -->
          <Transition name="slide-left">
            <SceneOutliner   v-if="store.leftPanel === 'scene'" />
            <ToolsPanel      v-else-if="store.leftPanel === 'tools'" />
            <AnimatorPanel   v-else-if="store.leftPanel === 'animator'" />
            <ContentBrowser  v-else-if="store.leftPanel === 'assets'" key="assets-side" :sideMode="true" />
            <CompositorPanel v-else-if="store.leftPanel === 'compositor'" />
            <TerrainEditor   v-else-if="store.leftPanel === 'terrain'" />
            <PublishPanel    v-else-if="store.leftPanel === 'publish'" />
          </Transition>

          <!-- Viewport (always visible) -->
          <Viewport />

          <!-- Right: Inspector -->
          <Inspector />
        </div>

        <!-- Resize handle -->
        <div
          class="h-1 bg-surface-container cursor-row-resize hover:bg-accent transition-colors flex-none"
          @mousedown="startResizeBottom"
        />

        <!-- Bottom Panel -->
        <div class="flex flex-col flex-none overflow-hidden" :style="{ height: store.bottomPanelHeight + 'px' }">
          <BottomPanel />
        </div>

      </div>
    </div>

    <!-- Status Bar -->
    <StatusBar />

    <!-- Global keyboard shortcuts handler -->
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useEditorStore } from './editor/stores/editorStore'
import ProjectWizard from './editor/components/ProjectWizard.vue'
import TopBar from './editor/components/TopBar.vue'
import SideNav from './editor/components/SideNav.vue'
import Viewport from './editor/panels/Viewport.vue'
import SceneOutliner from './editor/panels/SceneOutliner.vue'
import Inspector from './editor/panels/Inspector.vue'
import ToolsPanel from './editor/panels/ToolsPanel.vue'
import ContentBrowser from './editor/panels/ContentBrowser.vue'
import TerrainEditor from './editor/panels/TerrainEditor.vue'
import PublishPanel from './editor/panels/PublishPanel.vue'
import CompositorPanel from './editor/panels/CompositorPanel.vue'
import AnimatorPanel from './editor/panels/AnimatorPanel.vue'
import BottomPanel from './editor/panels/BottomPanel.vue'
import StatusBar from './editor/components/StatusBar.vue'

const store = useEditorStore()
type AuthStatus = 'checking' | 'authorized' | 'denied'
const authStatus = ref<AuthStatus>('checking')
const authError = ref('')
const marketplaceApiUrl = ((import.meta.env.VITE_MARKETPLACE_API_URL as string | undefined) || 'http://localhost:3004/api').replace(/\/$/, '')
const marketplaceOrigins = ((import.meta.env.VITE_MARKETPLACE_ORIGINS as string | undefined) || 'http://localhost:3002')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const marketplaceUrl = ((import.meta.env.VITE_MARKETPLACE_URL as string | undefined) || marketplaceOrigins[0] || 'http://localhost:3002').replace(/\/$/, '')
const marketplaceAuthUrl = computed(() => `${marketplaceUrl}/auth?redirect=/engine`)
let authTimeout: number | undefined

// ── Resize bottom panel ────────────────────────────────────────
function startResizeBottom(e: MouseEvent) {
  e.preventDefault()
  const startY = e.clientY
  const startH = store.bottomPanelHeight
  const onMove = (e: MouseEvent) => {
    const delta = startY - e.clientY
    store.bottomPanelHeight = Math.max(80, Math.min(600, startH + delta))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Global keyboard shortcuts ──────────────────────────────────
function handleKeyboard(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  const eng = store.engine
  if (!eng) return

  switch (e.code) {
    case 'KeyW': store.setGizmoMode('translate'); break
    case 'KeyE': store.setGizmoMode('rotate'); break
    case 'KeyR': store.setGizmoMode('scale'); break
    case 'Delete':
    case 'Backspace':
      if (store.selectedEntityId) {
        eng.removeEntity(store.selectedEntityId)
        store.selectEntity(null)
        store.bumpEntityVersion()
      }
      break
    case 'F5':
      e.preventDefault()
      if (e.shiftKey) { 
        eng.stop(); 
        store.setPlaying(false); 
        store.bumpEntityVersion() 
      }
      else if (!store.isPlaying) { 
        try {
          const errors = eng.play()
          store.setPlaying(true)
          errors.forEach(e => store.addConsoleMessage('error', e))
        } catch (err) {
          store.addConsoleMessage('error', `Play Mode Crash: ${err}`)
        }
      }
      break
    case 'Escape':
      store.selectEntity(null)
      break
  }

  if (e.ctrlKey) {
    switch (e.key) {
      case 's': e.preventDefault(); saveScene(); break
      case 'z': e.preventDefault(); break
      case 'y': e.preventDefault(); break
      case 'd': e.preventDefault();
        if (store.selectedEntityId) {
          eng.duplicateEntity(store.selectedEntityId)
          store.bumpEntityVersion()
        }
        break
    }
  }
}

function saveScene() {
  const eng = store.engine
  if (!eng) return
  const data = eng.saveScene()
  localStorage.setItem('nexus-scene', JSON.stringify(data))
  store.addConsoleMessage('info', '✓ Scene saved')
}

function isAllowedMarketplaceOrigin(origin: string) {
  return marketplaceOrigins.includes(origin)
}

async function validateMarketplaceToken(token: string, replyOrigin: string) {
  if (!token) {
    authStatus.value = 'denied'
    authError.value = 'Token GameForge manquant.'
    return
  }

  try {
    const response = await fetch(`${marketplaceApiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Session invalide ou expiree.')

    const data = await response.json()
    store.setAuth(token, data.user)
    authStatus.value = 'authorized'
    authError.value = ''
    window.parent?.postMessage({ type: 'NEXUS_AUTH_OK' }, replyOrigin)
  } catch (error) {
    authStatus.value = 'denied'
    authError.value = error instanceof Error ? error.message : 'Session invalide.'
  }
}

async function loadProject(gameId: number, token: string) {
  try {
    const res = await fetch(`${marketplaceApiUrl}/projects/${gameId}/save`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    if (data && store.engine) {
      store.engine.loadScene(data)
      store.setCurrentGameId(gameId)
      store.bumpEntityVersion()
      store.addConsoleMessage('info', `✓ Projet #${gameId} chargé`)
    }
  } catch (e) {
    console.error('[LOAD_PROJECT]', e)
  }
}

function handleAuthMessage(event: MessageEvent) {
  if (!isAllowedMarketplaceOrigin(event.origin)) return

  if (event.data?.type === 'LOAD_PROJECT' && event.data.gameId) {
    loadProject(Number(event.data.gameId), String(event.data.token || store.authToken || ''))
    return
  }

  if (event.data?.type !== 'GAMEFORGE_AUTH') return
  window.clearTimeout(authTimeout)
  validateMarketplaceToken(String(event.data.token || ''), event.origin)
}

onMounted(() => {
  // If we already have a token in the store (localStorage), we can try to validate it
  if (store.authToken) {
    validateMarketplaceToken(store.authToken, '*')
  }

  localStorage.removeItem('token')
  sessionStorage.removeItem('gameforge-engine-token')
  window.addEventListener('message', handleAuthMessage)
  window.addEventListener('keydown', handleKeyboard)
  authTimeout = window.setTimeout(() => {
    if (authStatus.value === 'checking') {
      authStatus.value = 'denied'
      authError.value = 'Ouvre Nexus Engine depuis la marketplace apres connexion.'
    }
  }, 3000)
})
onUnmounted(() => {
  window.removeEventListener('message', handleAuthMessage)
  window.removeEventListener('keydown', handleKeyboard)
  window.clearTimeout(authTimeout)
})

watch(authStatus, (status) => {
  if (status === 'authorized' && store.authToken) {
    store.connectWS(store.authToken)
  }
})
</script>

<style>
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.15s ease;
}
.slide-left-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-left-leave-to  { transform: translateX(-100%); opacity: 0; }
</style>
