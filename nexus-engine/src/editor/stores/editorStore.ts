import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Engine } from '../../engine/Engine'
import type { GizmoMode } from '../../engine/types'

export type BottomTab = 'content' | 'console' | 'code' | 'nodes'
export type LeftPanel = 'scene' | 'tools' | 'assets' | 'layers' | 'terrain' | 'publish' | 'compositor' | 'animator'
export type ProjectMode = '2d' | '2d3d' | '3d'

export interface ConsoleMessage {
  id: number
  type: 'log' | 'warn' | 'error' | 'info'
  text: string
  timestamp: number
}

export interface AssetEntry {
  id: string
  name: string
  type: 'mesh' | 'texture' | 'sprite' | 'scene' | 'script' | 'material'
  url: string
  folder: string
  thumbnail?: string
  size?: number
}

let _msgId = 0

export const useEditorStore = defineStore('editor', () => {

  // ── Project Mode (wizard) ────────────────────────────────────
  // null = wizard not yet shown, value persisted in localStorage
  const _storedMode = localStorage.getItem('nexus-project-mode') as ProjectMode | null
  const projectMode = ref<ProjectMode | null>(_storedMode)
  const showWizard = ref<boolean>(_storedMode === null)

  function setProjectMode(mode: ProjectMode) {
    projectMode.value = mode
    showWizard.value = false
    localStorage.setItem('nexus-project-mode', mode)
    // Apply mode effects once engine is ready
    _applyProjectMode(mode)
  }

  function resetProjectMode() {
    projectMode.value = null
    showWizard.value = true
    localStorage.removeItem('nexus-project-mode')
  }

  function _applyProjectMode(mode: ProjectMode) {
    const eng = engine.value
    if (!eng) return
    if (mode === '2d') {
      // Orthographic camera, disable terrain & 3D-only tools
      eng.setCameraMode?.('orthographic')
    } else if (mode === '3d') {
      eng.setCameraMode?.('perspective')
      // Pre-enable skybox for full 3D experience
    } else {
      // 2D/3D: perspective camera, default settings
      eng.setCameraMode?.('perspective')
    }
  }

  // ── Engine ──────────────────────────────────────────────────
  const engine = ref<Engine | null>(null)
  function setEngine(eng: Engine) {
    engine.value = eng
    // Apply stored mode when engine mounts
    if (projectMode.value) _applyProjectMode(projectMode.value)
  }

  // ── Selection ────────────────────────────────────────────────
  const selectedEntityId = ref<string | null>(null)
  function selectEntity(id: string | null) {
    selectedEntityId.value = id
    engine.value?.selectEntity(id)
  }

  // ── Play state ───────────────────────────────────────────────
  const isPlaying = ref(false)
  function setPlaying(v: boolean) { isPlaying.value = v }

  /** Reset engine ref + related state — called on unmount to survive HMR */
  function clearEngine() {
    engine.value = null
    selectedEntityId.value = null
    isPlaying.value = false
  }

  // ── UI panels ────────────────────────────────────────────────
  const bottomTab = ref<BottomTab>('content')
  const leftPanel = ref<LeftPanel>('scene')
  const bottomPanelHeight = ref(260)
  const leftPanelWidth = ref(260)
  const rightPanelWidth = ref(300)

  // ── Gizmo ────────────────────────────────────────────────────
  const gizmoMode = ref<GizmoMode>('translate')
  function setGizmoMode(mode: GizmoMode) {
    gizmoMode.value = mode
    engine.value?.setGizmoMode(mode)
  }

  // ── Stats ────────────────────────────────────────────────────
  const fps = ref(0)
  const frameTime = ref(0)
  const drawCalls = ref(0)
  const triangles = ref(0)
  const entityCount = ref(0)

  function updateStats(s: { fps: number; frameTime: number; drawCalls: number; triangles: number; entities: number }) {
    fps.value = s.fps
    frameTime.value = s.frameTime
    drawCalls.value = s.drawCalls
    triangles.value = s.triangles
    entityCount.value = s.entities
  }

  // ── Entity version (force re-render) ─────────────────────────
  const entityVersion = ref(0)
  function bumpEntityVersion() { entityVersion.value++ }

  // ── Console ──────────────────────────────────────────────────
  const consoleMessages = ref<ConsoleMessage[]>([])
  function addConsoleMessage(type: ConsoleMessage['type'], text: string) {
    consoleMessages.value.push({ id: ++_msgId, type, text, timestamp: Date.now() })
    if (consoleMessages.value.length > 500) consoleMessages.value.shift()
  }
  function clearConsole() { consoleMessages.value = [] }

  // ── Content Browser ──────────────────────────────────────────
  const assets = ref<AssetEntry[]>([])
  const currentFolder = ref('/')
  function addAsset(asset: AssetEntry) { assets.value.push(asset) }
  function removeAsset(id: string) { assets.value = assets.value.filter(a => a.id !== id) }
  const assetsInFolder = computed(() =>
    assets.value.filter(a => a.folder === currentFolder.value)
  )

  // ── Skybox / Post-FX ─────────────────────────────────────────
  const skyboxEnabled = ref(false)
  const skyboxPreset = ref<'day' | 'sunset' | 'night' | 'overcast'>('day')
  const postFXEnabled = ref(false)
  const bloomStrength = ref(0.4)

  function toggleSkybox(preset?: 'day' | 'sunset' | 'night' | 'overcast') {
    const eng = engine.value
    if (!eng) return
    if (preset) skyboxPreset.value = preset
    if (!skyboxEnabled.value) {
      eng.enableSkybox({ preset: skyboxPreset.value })
      skyboxEnabled.value = true
    } else {
      eng.disableSkybox()
      skyboxEnabled.value = false
    }
  }

  function setSkyboxPreset(preset: 'day' | 'sunset' | 'night' | 'overcast') {
    const eng = engine.value
    if (!eng) return
    skyboxPreset.value = preset
    skyboxEnabled.value = true
    eng.enableSkybox({ preset })
  }

  function togglePostFX() {
    const eng = engine.value
    if (!eng) return
    if (!postFXEnabled.value) {
      eng.enablePostProcessing({ bloomStrength: bloomStrength.value })
      postFXEnabled.value = true
    } else {
      eng.disablePostProcessing()
      postFXEnabled.value = false
    }
  }

  function setBloomStrength(v: number) {
    bloomStrength.value = v
    engine.value?.postProcessing?.setBloomStrength(v)
  }

  // ── Menu ─────────────────────────────────────────────────────
  const activeMenu = ref<string | null>(null)
  function setActiveMenu(m: string | null) { activeMenu.value = m }

  // ── WebSocket (MCP bridge) ───────────────────────────────────
  const wsConnected = ref(false)
  let ws: WebSocket | null = null

  function connectWS() {
    try {
      ws = new WebSocket('ws://localhost:3001/ws')
      ws.onopen = () => { wsConnected.value = true; addConsoleMessage('info', '[WS] Connected to backend') }
      ws.onclose = () => { wsConnected.value = false; addConsoleMessage('warn', '[WS] Disconnected') }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          handleWSMessage(msg)
        } catch { /* ignore */ }
      }
    } catch { /* ignore if backend not running */ }
  }

  function handleWSMessage(msg: { type: string; payload: unknown }) {
    const eng = engine.value
    if (!eng) return
    switch (msg.type) {
      case 'create_entity': {
        const p = msg.payload as { type: string; name?: string }
        eng.createPrimitive(p.type as 'cube' | 'sphere' | 'cylinder' | 'plane' | 'light' | 'camera' | 'terrain', p.name)
        bumpEntityVersion()
        break
      }
      case 'play': eng.play(); setPlaying(true); break
      case 'stop': eng.stop(); setPlaying(false); bumpEntityVersion(); break
      case 'skybox': {
        const p = msg.payload as { preset: 'day' | 'sunset' | 'night' | 'overcast' }
        setSkyboxPreset(p.preset)
        break
      }
      case 'postfx': {
        const p = msg.payload as { enabled: boolean }
        if (p.enabled !== postFXEnabled.value) togglePostFX()
        break
      }
      default:
        addConsoleMessage('log', `[WS] ${msg.type}: ${JSON.stringify(msg.payload)}`)
    }
  }

  return {
    // project mode
    projectMode, showWizard, setProjectMode, resetProjectMode,
    // engine
    engine, setEngine, clearEngine,
    // selection
    selectedEntityId, selectEntity,
    // play
    isPlaying, setPlaying,
    // ui
    bottomTab, leftPanel, bottomPanelHeight, leftPanelWidth, rightPanelWidth,
    // gizmo
    gizmoMode, setGizmoMode,
    // stats
    fps, frameTime, drawCalls, triangles, entityCount, updateStats,
    // version
    entityVersion, bumpEntityVersion,
    // console
    consoleMessages, addConsoleMessage, clearConsole,
    // assets
    assets, currentFolder, addAsset, removeAsset, assetsInFolder,
    // skybox / post-fx
    skyboxEnabled, skyboxPreset, postFXEnabled, bloomStrength,
    toggleSkybox, setSkyboxPreset, togglePostFX, setBloomStrength,
    // menu
    activeMenu, setActiveMenu,
    // ws
    wsConnected, connectWS,
  }
})
