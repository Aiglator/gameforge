<template>
  <div class="flex flex-col h-full bg-surface-container-low overflow-y-auto no-scrollbar">
    <!-- Section: Primitives -->
    <div class="px-3 pt-3 pb-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Primitives</div>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="prim in PRIMITIVES"
          :key="prim.id"
          @click="spawn(prim.id)"
          class="flex flex-col items-center justify-center py-3 bg-surface-high hover:bg-surface-highest transition-colors group"
          :title="prim.label"
        >
          <span class="material-symbols-outlined group-hover:text-secondary transition-colors" :class="prim.color" style="font-size:22px">
            {{ prim.icon }}
          </span>
          <span class="text-[9px] text-slate-500 mt-1 group-hover:text-slate-300 transition-colors">{{ prim.label }}</span>
        </button>
      </div>
    </div>

    <div class="mx-3 border-t border-surface-highest my-2" />

    <!-- Section: Lights -->
    <div class="px-3 pb-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Lights</div>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="light in LIGHTS"
          :key="light.id"
          @click="spawnLight(light.id)"
          class="flex flex-col items-center justify-center py-3 bg-surface-high hover:bg-surface-highest transition-colors group"
          :title="light.label"
        >
          <span class="material-symbols-outlined text-yellow-400 group-hover:text-yellow-300 transition-colors" style="font-size:22px">
            {{ light.icon }}
          </span>
          <span class="text-[9px] text-slate-500 mt-1 group-hover:text-slate-300 transition-colors">{{ light.label }}</span>
        </button>
      </div>
    </div>

    <div class="mx-3 border-t border-surface-highest my-2" />

    <!-- Section: Cameras -->
    <div class="px-3 pb-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Cameras</div>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          @click="spawnCamera"
          class="flex flex-col items-center justify-center py-3 bg-surface-high hover:bg-surface-highest transition-colors group"
          title="Perspective Camera"
        >
          <span class="material-symbols-outlined text-blue-400 group-hover:text-blue-300 transition-colors" style="font-size:22px">
            videocam
          </span>
          <span class="text-[9px] text-slate-500 mt-1 group-hover:text-slate-300 transition-colors">Camera</span>
        </button>
      </div>
    </div>

    <div class="mx-3 border-t border-surface-highest my-2" />

    <!-- Section: Gizmo mode -->
    <div class="px-3 pb-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Transform Tool</div>
      <div class="space-y-1">
        <button
          v-for="g in GIZMOS"
          :key="g.mode"
          @click="store.setGizmoMode(g.mode)"
          class="w-full flex items-center space-x-2 px-2 py-1.5 transition-colors"
          :class="store.gizmoMode === g.mode
            ? 'bg-secondary/10 text-secondary'
            : 'text-slate-500 hover:bg-surface-highest hover:text-slate-300'"
        >
          <span class="material-symbols-outlined text-sm">{{ g.icon }}</span>
          <span class="text-[10px]">{{ g.label }}</span>
          <span class="ml-auto text-[9px] text-slate-700">{{ g.key }}</span>
        </button>
      </div>
    </div>

    <div class="mx-3 border-t border-surface-highest my-2" />

    <!-- Section: World gen -->
    <div class="px-3 pb-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">World</div>
      <button
        @click="addGround"
        class="w-full flex items-center space-x-2 px-2 py-1.5 text-slate-500 hover:bg-surface-highest hover:text-slate-300 transition-colors"
      >
        <span class="material-symbols-outlined text-sm">terrain</span>
        <span class="text-[10px]">Add Ground Plane</span>
      </button>
      <button
        @click="addSunLight"
        class="w-full flex items-center space-x-2 px-2 py-1.5 text-slate-500 hover:bg-surface-highest hover:text-slate-300 transition-colors mt-1"
      >
        <span class="material-symbols-outlined text-sm text-yellow-500">wb_sunny</span>
        <span class="text-[10px]">Add Sun Light</span>
      </button>
    </div>

    <div class="mx-3 border-t border-surface-highest my-2" />

    <!-- Section: Skybox -->
    <div class="px-3 pb-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Sky</div>
      <div class="grid grid-cols-2 gap-1">
        <button
          v-for="sky in SKY_PRESETS" :key="sky.id"
          @click="setSky(sky.id)"
          class="flex items-center space-x-1.5 px-2 py-1.5 text-[9px] uppercase tracking-widest transition-all"
          :class="store.skyboxEnabled && store.skyboxPreset === sky.id
            ? 'bg-surface-highest text-on-surface ring-1 ring-inset ring-blue-600'
            : 'text-slate-500 hover:bg-surface-highest hover:text-slate-300'"
        >
          <span class="material-symbols-outlined text-sm" :class="sky.color">{{ sky.icon }}</span>
          <span>{{ sky.label }}</span>
        </button>
      </div>
      <button
        v-if="store.skyboxEnabled"
        @click="store.toggleSkybox()"
        class="w-full mt-1 text-[9px] text-slate-600 hover:text-red-400 text-left px-2 py-1"
      >
        ✕ Remove Sky
      </button>
    </div>

    <div class="mx-3 border-t border-surface-highest my-2" />

    <!-- Section: Post FX -->
    <div class="px-3 pb-3">
      <div class="flex items-center justify-between mb-2">
        <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Post FX</div>
        <button
          @click="store.togglePostFX()"
          class="w-8 h-4 flex items-center px-0.5 transition-colors"
          :class="store.postFXEnabled ? 'bg-secondary' : 'bg-surface-highest'"
        >
          <div class="w-3 h-3 bg-white transition-transform" :class="store.postFXEnabled ? 'translate-x-3.5' : ''" />
        </button>
      </div>
      <div v-if="store.postFXEnabled" class="space-y-2">
        <div class="space-y-0.5">
          <div class="flex justify-between">
            <span class="text-[9px] text-slate-500 uppercase">Bloom</span>
            <span class="text-[9px] font-mono text-slate-400">{{ store.bloomStrength.toFixed(2) }}</span>
          </div>
          <input
            type="range" min="0" max="3" step="0.05"
            :value="store.bloomStrength"
            @input="(e) => store.setBloomStrength(parseFloat((e.target as HTMLInputElement).value))"
            class="w-full h-1 appearance-none bg-surface-highest cursor-pointer accent-secondary"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/editorStore'
import type { GizmoMode } from '../../engine/types'

const store = useEditorStore()

const PRIMITIVES = [
  { id: 'cube',     icon: 'deployed_code', label: 'Cube',     color: 'text-primary' },
  { id: 'sphere',   icon: 'circle',        label: 'Sphere',   color: 'text-blue-400' },
  { id: 'cylinder', icon: 'cylinder',      label: 'Cylinder', color: 'text-purple-400' },
  { id: 'plane',    icon: 'crop_square',   label: 'Plane',    color: 'text-slate-400' },
]

const LIGHTS = [
  { id: 'point',       icon: 'light_mode',    label: 'Point'       },
  { id: 'directional', icon: 'wb_sunny',      label: 'Directional' },
  { id: 'spot',        icon: 'highlight',     label: 'Spot'        },
  { id: 'hemisphere',  icon: 'brightness_5',  label: 'Hemisphere'  },
]

const GIZMOS: Array<{ mode: GizmoMode; icon: string; label: string; key: string }> = [
  { mode: 'translate', icon: 'open_with',       label: 'Translate', key: 'W' },
  { mode: 'rotate',    icon: 'rotate_90_degrees_cw', label: 'Rotate',    key: 'E' },
  { mode: 'scale',     icon: 'straighten',      label: 'Scale',     key: 'R' },
]

function spawn(type: string) {
  const eng = store.engine
  if (!eng) return
  const names: Record<string, string> = {
    cube: 'Cube', sphere: 'Sphere', cylinder: 'Cylinder', plane: 'Plane',
  }
  const e = eng.createPrimitive(type as 'cube' | 'sphere' | 'cylinder' | 'plane', names[type])
  store.selectEntity(e.id)
  store.bumpEntityVersion()
  store.addConsoleMessage('info', `Spawned ${names[type]}`)
}

function spawnLight(lightType: string) {
  const eng = store.engine
  if (!eng) return
  const e = eng.createPrimitive('light', `${lightType.charAt(0).toUpperCase() + lightType.slice(1)}Light`)
  // Update light type after creation
  eng.updateEntityComponent(e.id, 'light', { lightType })
  store.selectEntity(e.id)
  store.bumpEntityVersion()
  store.addConsoleMessage('info', `Spawned ${lightType} light`)
}

function spawnCamera() {
  const eng = store.engine
  if (!eng) return
  const e = eng.createPrimitive('camera', 'Camera')
  store.selectEntity(e.id)
  store.bumpEntityVersion()
  store.addConsoleMessage('info', 'Spawned Camera')
}

const SKY_PRESETS = [
  { id: 'day'     as const, label: 'Day',     icon: 'wb_sunny',   color: 'text-yellow-300' },
  { id: 'sunset'  as const, label: 'Sunset',  icon: 'wb_twilight', color: 'text-orange-400' },
  { id: 'night'   as const, label: 'Night',   icon: 'nights_stay', color: 'text-blue-300' },
  { id: 'overcast'as const, label: 'Overcast',icon: 'cloud',       color: 'text-slate-400' },
]

function setSky(preset: 'day' | 'sunset' | 'night' | 'overcast') {
  store.setSkyboxPreset(preset)
  store.addConsoleMessage('info', `Sky preset: ${preset}`)
}

function addGround() {
  const eng = store.engine
  if (!eng) return
  const e = eng.createPrimitive('plane', 'Ground')
  eng.updateEntityTransform(e.id, { x: 0, y: 0, z: 0 }, undefined, { x: 20, y: 1, z: 20 })
  eng.updateEntityComponent(e.id, 'mesh', { color: '#1a2740' })
  store.bumpEntityVersion()
  store.addConsoleMessage('info', 'Added Ground Plane')
}

function addSunLight() {
  const eng = store.engine
  if (!eng) return
  const e = eng.createPrimitive('light', 'SunLight')
  eng.updateEntityComponent(e.id, 'light', { lightType: 'directional', intensity: 1.5 })
  eng.updateEntityTransform(e.id, { x: 5, y: 10, z: 5 })
  store.bumpEntityVersion()
  store.addConsoleMessage('info', 'Added Sun Light')
}
</script>
