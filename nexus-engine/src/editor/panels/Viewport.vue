<template>
  <section
    class="flex-1 bg-[#070e1d] relative overflow-hidden flex flex-col min-w-0"
    :class="{ 'outline outline-2 outline-secondary': store.isPlaying }"
  >
    <!-- Viewport labels top-left -->
    <div class="absolute top-3 left-3 flex space-x-2 z-10 pointer-events-none">
      <div class="bg-black/50 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">
        Perspective
      </div>
      <div class="bg-black/50 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">
        Lit
      </div>
      <div v-if="store.isPlaying" class="bg-secondary/20 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-secondary uppercase tracking-widest animate-pulse">
        ▶ PLAYING
      </div>
    </div>

    <!-- Gizmo mode buttons top-right -->
    <div class="absolute top-3 right-3 flex space-x-1 z-10">
      <button
        v-for="g in gizmoButtons"
        :key="g.mode"
        @click="store.setGizmoMode(g.mode)"
        :title="`${g.mode} (${g.key})`"
        class="p-1.5 transition-all"
        :class="store.gizmoMode === g.mode
          ? 'bg-accent text-white'
          : 'bg-surface-highest/80 text-slate-400 hover:bg-accent hover:text-white'"
      >
        <span class="material-symbols-outlined text-sm">{{ g.icon }}</span>
      </button>

      <!-- Spawn primitive shortcut -->
      <div class="relative" ref="spawnRef">
        <button
          @click="showSpawnMenu = !showSpawnMenu"
          class="p-1.5 bg-surface-highest/80 text-slate-400 hover:bg-surface-bright transition-all"
          title="Add primitive"
        >
          <span class="material-symbols-outlined text-sm">add_box</span>
        </button>
        <div
          v-if="showSpawnMenu"
          class="absolute right-0 top-full mt-1 bg-surface-high shadow-2xl min-w-[160px] py-1 z-20"
        >
          <button
            v-for="prim in PRIMITIVES"
            :key="prim.type"
            @click="spawnPrimitive(prim.type)"
            class="w-full px-3 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest flex items-center space-x-2"
          >
            <span class="material-symbols-outlined text-sm text-primary">{{ prim.icon }}</span>
            <span>{{ prim.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Three.js canvas -->
    <div
      ref="viewportRef"
      class="flex-1 w-full h-full"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
    />

    <!-- Stats overlay bottom-left -->
    <div class="absolute bottom-3 left-3 text-[10px] font-mono space-y-0.5 pointer-events-none">
      <p :class="fpsColor">FPS: {{ store.fps || '--' }} {{ store.fps ? `(${(1000/store.fps).toFixed(1)}ms)` : '' }}</p>
      <p class="text-slate-600">Entities: {{ store.entityCount }}</p>
      <p class="text-slate-600">Draw Calls: {{ store.drawCalls }}</p>
      <p class="text-slate-600">Triangles: {{ (store.triangles/1000).toFixed(1) }}K</p>
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      class="fixed bg-surface-high shadow-2xl py-1 z-50 min-w-[180px]"
    >
      <div class="px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Spawn Actor</div>
      <button
        v-for="prim in PRIMITIVES"
        :key="prim.type"
        @click="spawnAt(prim.type)"
        class="w-full px-4 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest flex items-center space-x-2"
      >
        <span class="material-symbols-outlined text-sm text-primary">{{ prim.icon }}</span>
        <span>{{ prim.label }}</span>
      </button>
      <div class="border-t border-surface-highest my-1" />
      <button
        v-if="store.selectedEntityId"
        @click="focusSelected"
        class="w-full px-4 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest"
      >Focus Selected</button>
      <button
        v-if="store.selectedEntityId"
        @click="deleteSelected"
        class="w-full px-4 py-1.5 text-left text-[11px] text-error hover:bg-surface-highest"
      >Delete Entity</button>
    </div>
    <div v-if="contextMenu.visible" class="fixed inset-0 z-40" @click="contextMenu.visible = false" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { Engine } from '../../engine/Engine'
import type { GizmoMode } from '../../engine/types'

const store = useEditorStore()
const viewportRef = ref<HTMLDivElement | null>(null)
const spawnRef = ref<HTMLDivElement | null>(null)
const showSpawnMenu = ref(false)

const contextMenu = ref({ visible: false, x: 0, y: 0 })
const spawnPos = { x: 0, y: 2, z: 0 }

const PRIMITIVES = [
  { type: 'cube',     label: 'Cube',            icon: 'deployed_code' },
  { type: 'sphere',   label: 'Sphere',          icon: 'radio_button_unchecked' },
  { type: 'cylinder', label: 'Cylinder',        icon: 'cylinder' },
  { type: 'plane',    label: 'Ground Plane',    icon: 'table_rows' },
  { type: 'light',    label: 'Point Light',     icon: 'lightbulb' },
  { type: 'camera',   label: 'Camera',          icon: 'videocam' },
] as const

const gizmoButtons: Array<{ mode: GizmoMode; icon: string; key: string }> = [
  { mode: 'translate', icon: 'open_with',              key: 'W' },
  { mode: 'rotate',    icon: 'sync_alt',               key: 'E' },
  { mode: 'scale',     icon: 'photo_size_select_small', key: 'R' },
]

const fpsColor = computed(() => {
  const f = store.fps
  if (!f) return 'text-slate-600'
  if (f >= 55) return 'text-secondary'
  if (f >= 30) return 'text-yellow-400'
  return 'text-error'
})

// ── Engine init ──────────────────────────────────────────────
onMounted(() => {
  if (!viewportRef.value) return

  // Always dispose any stale engine (e.g. after HMR hot-reload)
  if (store.engine) {
    store.engine.dispose()
    store.clearEngine()
  }

  const eng = new Engine(viewportRef.value)
  store.setEngine(eng)

  // Wire events
  eng.on('statsUpdated', (s) => store.updateStats(s as { fps: number; frameTime: number; drawCalls: number; triangles: number; entities: number }))
  eng.on('entityChanged', () => store.bumpEntityVersion())
  eng.on('entityAdded',   () => store.bumpEntityVersion())
  eng.on('entityRemoved', () => store.bumpEntityVersion())
  eng.on('sceneLoaded',   () => { store.bumpEntityVersion(); store.selectEntity(null) })

  // Intercept console → pipe into Console panel
  const origLog   = console.log
  const origWarn  = console.warn
  const origError = console.error
  console.log   = (...a) => { origLog(...a);   store.addConsoleMessage('log',   a.map(String).join(' ')) }
  console.info  = (...a) => { origLog(...a);   store.addConsoleMessage('info',  a.map(String).join(' ')) }
  console.warn  = (...a) => { origWarn(...a);  store.addConsoleMessage('warn',  a.map(String).join(' ')) }
  console.error = (...a) => { origError(...a); store.addConsoleMessage('error', a.map(String).join(' ')) }

  // Seed default scene on fresh start
  const saved = localStorage.getItem('nexus-scene')
  if (saved) {
    try {
      eng.loadScene(JSON.parse(saved))
      store.bumpEntityVersion()
    } catch {
      seedDefaultScene(eng)
    }
  } else {
    seedDefaultScene(eng)
  }
})

function seedDefaultScene(eng: Engine) {
  eng.createPrimitive('plane', 'Ground')
  eng.createPrimitive('light', 'SunLight')
  store.bumpEntityVersion()
}

onUnmounted(() => {
  store.engine?.dispose()
  store.clearEngine()
})

// ── Click to select ─────────────────────────────────────────
function handleClick(e: MouseEvent) {
  const eng = store.engine
  if (!eng || eng.isPlaying()) return
  if (eng.transformControls.dragging) return

  showSpawnMenu.value = false
  const rect = viewportRef.value!.getBoundingClientRect()
  const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1
  const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1

  const hit = eng.raycastFromMouse(ndcX, ndcY)
  store.selectEntity(hit?.id ?? null)
}

// ── Context menu ─────────────────────────────────────────────
function handleContextMenu(e: MouseEvent) {
  const eng = store.engine
  if (!eng || eng.isPlaying()) return
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY }
}

function spawnAt(type: string) {
  contextMenu.value.visible = false
  const eng = store.engine
  if (!eng) return
  const entity = eng.createPrimitive(type as 'cube', `${type}_${Date.now()}`)
  store.selectEntity(entity.id)
  store.bumpEntityVersion()
}

function spawnPrimitive(type: string) {
  showSpawnMenu.value = false
  spawnAt(type)
}

function focusSelected() {
  contextMenu.value.visible = false
  const eng = store.engine
  if (!eng || !store.selectedEntityId) return
  const entity = eng.getEntity(store.selectedEntityId)
  if (!entity?.object3D) return
  eng.orbitControls.target.copy(entity.object3D.position)
  eng.orbitControls.update()
}

function deleteSelected() {
  contextMenu.value.visible = false
  const eng = store.engine
  if (!eng || !store.selectedEntityId) return
  eng.removeEntity(store.selectedEntityId)
  store.selectEntity(null)
  store.bumpEntityVersion()
}
</script>
