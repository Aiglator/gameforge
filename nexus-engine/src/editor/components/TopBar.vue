<template>
  <header class="bg-[#0c1322] flex justify-between items-center w-full px-4 h-12 flex-none z-50 relative">

    <!-- Left: Logo + Menu -->
    <div class="flex items-center space-x-5">
      <span class="text-xl font-black text-accent tracking-tighter">NEXUS ENGINE</span>

      <nav class="hidden md:flex">
        <div v-for="menu in MENUS" :key="menu" class="relative">
          <button
            @click="toggleMenu(menu)"
            class="px-3 py-1 uppercase tracking-widest text-xs font-bold transition-colors duration-150"
            :class="store.activeMenu === menu
              ? 'text-accent border-b-2 border-accent'
              : 'text-slate-400 hover:text-slate-200'"
          >{{ menu }}</button>

          <!-- Dropdown -->
          <Transition name="fade-down">
            <div
              v-if="store.activeMenu === menu"
              class="absolute top-full left-0 mt-1 bg-surface-high shadow-2xl min-w-[200px] z-[100] py-1"
            >
              <button
                v-for="item in menuItems[menu]"
                :key="item.action"
                @click="handleAction(item.action)"
                class="w-full px-4 py-2 text-left text-[11px] text-on-surface hover:bg-surface-highest flex justify-between items-center"
              >
                <span>{{ item.label }}</span>
                <span v-if="item.shortcut" class="text-muted text-[9px] ml-4">{{ item.shortcut }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </nav>
    </div>

    <!-- Center: Play Controls -->
    <div class="flex items-center bg-surface-high px-3 py-1 space-x-2">
      <button
        @click="handlePlay"
        class="p-1 transition-all active:scale-95"
        :class="store.isPlaying ? 'text-secondary' : 'text-slate-400 hover:text-secondary'"
        title="Play (F5)"
      >
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span>
      </button>
      <button class="p-1 text-slate-400 hover:text-white transition-all active:scale-95" title="Pause">
        <span class="material-symbols-outlined">pause</span>
      </button>
      <button
        @click="handleStop"
        class="p-1 transition-all active:scale-95"
        :class="store.isPlaying ? 'text-error hover:brightness-125' : 'text-slate-500'"
        title="Stop (Shift+F5)"
      >
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">stop</span>
      </button>
    </div>

    <!-- Right: Mode badge + Search + WS -->
    <div class="flex items-center space-x-3">

      <!-- Project mode badge -->
      <button
        v-if="store.projectMode"
        @click="store.resetProjectMode()"
        class="flex items-center space-x-1.5 px-2 py-1 border transition-colors group"
        :class="modeBadgeClass"
        title="Changer de mode de projet"
      >
        <span class="text-[8px] font-black uppercase tracking-widest">{{ modeLabel }}</span>
        <span class="material-symbols-outlined text-[10px] opacity-60 group-hover:opacity-100">swap_horiz</span>
      </button>

      <div class="bg-surface-highest px-3 py-1 flex items-center space-x-2">
        <span class="material-symbols-outlined text-slate-500">search</span>
        <input
          class="bg-transparent border-none focus:ring-0 focus:outline-none text-xs w-36 placeholder:text-slate-600"
          placeholder="Search assets..."
          type="text"
          v-model="searchQuery"
        />
      </div>
      <div class="flex items-center space-x-1">
        <div class="w-2 h-2 rounded-full" :class="store.wsConnected ? 'bg-secondary' : 'bg-slate-600'" />
        <span class="text-[9px] text-slate-500 uppercase">{{ store.wsConnected ? 'Live' : 'Offline' }}</span>
      </div>
    </div>

    <!-- Click-outside overlay -->
    <div v-if="store.activeMenu" class="fixed inset-0 z-[90]" @click="store.setActiveMenu(null)" />
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'

const store = useEditorStore()
const searchQuery = ref('')

const modeLabel = computed(() => {
  switch (store.projectMode) {
    case '2d':   return '2D'
    case '3d':   return '3D'
    case '2d3d': return '2D / 3D'
    default:     return ''
  }
})

const modeBadgeClass = computed(() => {
  switch (store.projectMode) {
    case '2d':   return 'border-secondary/40 text-secondary hover:border-secondary hover:bg-secondary/10'
    case '3d':   return 'border-primary/40 text-primary hover:border-primary hover:bg-primary/10'
    case '2d3d': return 'border-accent/40 text-accent hover:border-accent hover:bg-accent/10'
    default:     return 'border-surface-highest text-slate-500'
  }
})

const MENUS = ['FILE', 'EDIT', 'VIEW', 'GAME', 'BUILD'] as const

const menuItems: Record<string, Array<{ label: string; action: string; shortcut?: string }>> = {
  FILE: [
    { label: 'New Scene',       action: 'new',       shortcut: 'Ctrl+N' },
    { label: 'Save Scene',      action: 'save',      shortcut: 'Ctrl+S' },
    { label: 'Load Scene',      action: 'load',      shortcut: 'Ctrl+O' },
    { label: 'Export JSON',     action: 'export' },
    { label: 'Changer de mode', action: 'changeMode' },
  ],
  EDIT: [
    { label: 'Undo',      action: 'undo', shortcut: 'Ctrl+Z' },
    { label: 'Redo',      action: 'redo', shortcut: 'Ctrl+Y' },
    { label: 'Duplicate', action: 'duplicate', shortcut: 'Ctrl+D' },
    { label: 'Delete',    action: 'delete', shortcut: 'Del' },
  ],
  VIEW: [
    { label: 'Reset Camera',   action: 'resetCamera' },
    { label: 'Toggle Grid',    action: 'toggleGrid' },
    { label: 'Wireframe Mode', action: 'wireframe' },
  ],
  GAME: [
    { label: 'Play',  action: 'play',  shortcut: 'F5' },
    { label: 'Stop',  action: 'stop',  shortcut: 'Shift+F5' },
  ],
  BUILD: [
    { label: 'Export HTML5', action: 'buildHTML5' },
    { label: 'Export JSON',  action: 'export' },
  ],
}

function toggleMenu(menu: string) {
  store.setActiveMenu(store.activeMenu === menu ? null : menu)
}

function handleAction(action: string) {
  store.setActiveMenu(null)
  const eng = store.engine
  switch (action) {
    case 'new':
      eng?.loadScene({ entities: [] })
      store.bumpEntityVersion()
      store.addConsoleMessage('info', 'New scene created')
      break
    case 'save': {
      const data = eng?.saveScene()
      if (data) {
        localStorage.setItem('nexus-scene', JSON.stringify(data))
        store.addConsoleMessage('info', '✓ Scene saved to localStorage')
      }
      break
    }
    case 'load': {
      const json = localStorage.getItem('nexus-scene')
      if (!json) { store.addConsoleMessage('warn', 'No saved scene found'); return }
      try {
        eng?.loadScene(JSON.parse(json))
        store.bumpEntityVersion()
        store.addConsoleMessage('info', '✓ Scene loaded')
      } catch { store.addConsoleMessage('error', 'Failed to load scene') }
      break
    }
    case 'export': {
      const data = eng?.saveScene()
      if (!data) return
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: 'scene.nexus.json' })
      a.click(); URL.revokeObjectURL(url)
      break
    }
    case 'changeMode': store.resetProjectMode(); break
    case 'play': handlePlay(); break
    case 'stop': handleStop(); break
    case 'duplicate':
      if (store.selectedEntityId) {
        eng?.duplicateEntity(store.selectedEntityId)
        store.bumpEntityVersion()
      }
      break
    case 'delete':
      if (store.selectedEntityId) {
        eng?.removeEntity(store.selectedEntityId)
        store.selectEntity(null)
        store.bumpEntityVersion()
      }
      break
    case 'resetCamera':
      eng?.resetCamera()
      break
    case 'toggleGrid':
      // logic for toggleGrid if available in engine
      break
    case 'wireframe':
      // logic for wireframe
      break
  }
}

function handlePlay() {
  const eng = store.engine
  if (!eng || store.isPlaying) return
  try {
    const errors = eng.play()
    store.setPlaying(true)
    errors.forEach(e => store.addConsoleMessage('error', e))
    if (!errors.length) store.addConsoleMessage('info', '▶ Play mode started')
  } catch (err) {
    store.addConsoleMessage('error', `Play Mode Crash: ${err}`)
    console.error(err)
  }
}

function handleStop() {
  const eng = store.engine
  if (!eng) return
  eng.stop()
  store.setPlaying(false)
  store.bumpEntityVersion()
  store.addConsoleMessage('info', '■ Play mode stopped')
}
</script>

<style scoped>
.fade-down-enter-active { transition: all 0.1s ease; }
.fade-down-enter-from   { opacity: 0; transform: translateY(-6px); }
</style>
