<template>
  <div class="bg-surface text-on-surface h-screen overflow-hidden flex flex-col select-none dark">

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
import { onMounted, onUnmounted } from 'vue'
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
import BottomPanel from './editor/panels/BottomPanel.vue'
import StatusBar from './editor/components/StatusBar.vue'

const store = useEditorStore()

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
      if (e.shiftKey) { eng.stop(); store.setPlaying(false); store.bumpEntityVersion() }
      else if (!store.isPlaying) { eng.play(); store.setPlaying(true) }
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

onMounted(() => {
  window.addEventListener('keydown', handleKeyboard)
  store.connectWS()
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<style>
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.15s ease;
}
.slide-left-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-left-leave-to  { transform: translateX(-100%); opacity: 0; }
</style>
