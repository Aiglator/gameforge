<template>
  <div class="flex flex-col h-full bg-surface-container-low overflow-y-auto no-scrollbar w-64 flex-none border-r border-surface-highest">
    <!-- Header -->
    <div class="px-3 pt-3 pb-2 border-b border-surface-highest flex items-center justify-between">
      <span class="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Compositor</span>
      <button
        @click="addLayer"
        class="text-[9px] text-accent hover:text-accent/70 transition-colors"
      >
        + Layer
      </button>
    </div>

    <!-- Layers list -->
    <div class="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
      <div
        v-for="(layer, i) in layers"
        :key="layer.id"
        class="flex items-center space-x-2 px-2 py-2 cursor-pointer transition-colors"
        :class="selectedLayer === i ? 'bg-surface-highest' : 'hover:bg-surface-container'"
        @click="selectedLayer = i"
      >
        <!-- Visibility eye -->
        <button
          @click.stop="layer.visible = !layer.visible"
          class="text-slate-500 hover:text-on-surface transition-colors"
        >
          <span class="material-symbols-outlined text-sm">
            {{ layer.visible ? 'visibility' : 'visibility_off' }}
          </span>
        </button>
        <!-- Layer type icon -->
        <span
          class="material-symbols-outlined text-sm"
          :class="layerColor(layer.type)"
        >
          {{ layerIcon(layer.type) }}
        </span>
        <!-- Name -->
        <span class="text-[10px] text-on-surface flex-1 truncate">{{ layer.name }}</span>
        <!-- Opacity percentage -->
        <span class="text-[9px] font-mono text-slate-600">
          {{ Math.round(layer.opacity * 100) }}%
        </span>
      </div>
    </div>

    <!-- Selected layer properties -->
    <div
      v-if="selectedLayer !== null && layers[selectedLayer]"
      class="border-t border-surface-highest p-3 space-y-3"
    >
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Layer Properties</div>

      <!-- Name -->
      <input
        v-model="layers[selectedLayer].name"
        class="bg-surface-highest text-[10px] text-on-surface px-2 py-1.5 w-full border-none focus:outline-none"
      />

      <!-- Type -->
      <div>
        <div class="text-[9px] text-slate-600 mb-1 uppercase tracking-widest">Type</div>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="t in LAYER_TYPES"
            :key="t.id"
            @click="layers[selectedLayer].type = t.id"
            class="text-[9px] px-2 py-1 uppercase tracking-widest transition-colors"
            :class="layers[selectedLayer].type === t.id
              ? 'bg-accent text-surface'
              : 'bg-surface-highest text-slate-400 hover:text-slate-200'"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- Blend Mode -->
      <div>
        <div class="text-[9px] text-slate-600 mb-1 uppercase tracking-widest">Blend Mode</div>
        <select
          v-model="layers[selectedLayer].blendMode"
          class="bg-surface-highest text-[10px] text-on-surface px-2 py-1.5 w-full border-none focus:outline-none"
        >
          <option value="normal">Normal</option>
          <option value="add">Additive</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
        </select>
      </div>

      <!-- Opacity -->
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-[9px] text-slate-600 uppercase tracking-widest">Opacity</span>
          <span class="text-[9px] font-mono text-slate-400">
            {{ Math.round(layers[selectedLayer].opacity * 100) }}%
          </span>
        </div>
        <input
          type="range" min="0" max="1" step="0.01"
          v-model.number="layers[selectedLayer].opacity"
          class="w-full h-1 appearance-none bg-surface-highest cursor-pointer accent-accent"
        />
      </div>

      <!-- Post FX for this layer -->
      <div>
        <div class="text-[9px] text-slate-600 mb-1 uppercase tracking-widest">Effects</div>
        <div class="space-y-1">
          <label
            v-for="fx in FX_OPTIONS"
            :key="fx.id"
            class="flex items-center space-x-2 cursor-pointer"
          >
            <input
              type="checkbox"
              v-model="layers[selectedLayer].fx[fx.id]"
              class="accent-secondary"
            />
            <span class="text-[9px] text-slate-400">{{ fx.label }}</span>
          </label>
        </div>
      </div>

      <!-- Delete layer -->
      <button
        @click="removeLayer(selectedLayer)"
        class="w-full text-[9px] text-red-500/60 hover:text-red-400 text-left px-1 py-0.5 transition-colors"
      >
        ✕ Delete Layer
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

type LayerType = 'scene' | 'ui' | 'background' | 'fx' | 'debug'
type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay'

interface CompositorLayer {
  id: number
  name: string
  type: LayerType
  visible: boolean
  opacity: number
  blendMode: BlendMode
  fx: Record<string, boolean>
}

let _id = 0

const layers = reactive<CompositorLayer[]>([
  { id: ++_id, name: 'Background', type: 'background', visible: true,  opacity: 1,   blendMode: 'normal', fx: {} },
  { id: ++_id, name: 'Game Scene', type: 'scene',      visible: true,  opacity: 1,   blendMode: 'normal', fx: { bloom: true } },
  { id: ++_id, name: 'Particles',  type: 'fx',         visible: true,  opacity: 0.9, blendMode: 'add',    fx: {} },
  { id: ++_id, name: 'UI Overlay', type: 'ui',         visible: true,  opacity: 1,   blendMode: 'normal', fx: {} },
])

const selectedLayer = ref<number | null>(1)

const LAYER_TYPES: Array<{ id: LayerType; label: string }> = [
  { id: 'scene',      label: 'Scene' },
  { id: 'ui',         label: 'UI' },
  { id: 'background', label: 'BG' },
  { id: 'fx',         label: 'FX' },
]

const FX_OPTIONS = [
  { id: 'bloom',    label: 'Bloom' },
  { id: 'ssao',     label: 'SSAO' },
  { id: 'grain',    label: 'Film Grain' },
  { id: 'vignette', label: 'Vignette' },
  { id: 'blur',     label: 'Motion Blur' },
]

function layerIcon(type: LayerType): string {
  const icons: Record<LayerType, string> = {
    scene:      'deployed_code',
    ui:         'web',
    background: 'image',
    fx:         'auto_awesome',
    debug:      'bug_report',
  }
  return icons[type] ?? 'layers'
}

function layerColor(type: LayerType): string {
  const colors: Record<LayerType, string> = {
    scene:      'text-accent',
    ui:         'text-secondary',
    background: 'text-slate-400',
    fx:         'text-orange-400',
    debug:      'text-red-400',
  }
  return colors[type] ?? 'text-slate-500'
}

function addLayer(): void {
  layers.push({
    id: ++_id,
    name: `Layer ${_id}`,
    type: 'scene',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    fx: {},
  })
  selectedLayer.value = layers.length - 1
}

function removeLayer(i: number): void {
  if (layers.length <= 1) return
  layers.splice(i, 1)
  selectedLayer.value = Math.min(i, layers.length - 1)
}
</script>
