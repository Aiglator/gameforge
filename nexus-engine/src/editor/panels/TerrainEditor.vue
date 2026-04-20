<template>
  <section class="flex flex-col bg-surface-container-low overflow-hidden h-full">
    <!-- Header -->
    <div class="px-3 py-2 bg-surface-container flex-none flex items-center justify-between">
      <h2 class="text-[10px] font-black tracking-[0.2em] text-green-400 uppercase">World Builder</h2>
      <span class="material-symbols-outlined text-slate-500 text-sm">terrain</span>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar pb-4 space-y-0">

      <!-- Noise Section -->
      <div class="border-b border-surface-highest">
        <div class="px-3 py-2 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">Noise</div>
        <div class="px-3 pb-3 space-y-3">
          <SliderRow label="Height" :min="1" :max="40" :step="0.5" v-model="params.height" />
          <SliderRow label="Scale" :min="0.01" :max="0.5" :step="0.005" v-model="params.scale" />
          <SliderRow label="Octaves" :min="1" :max="8" :step="1" v-model="params.octaves" />
          <!-- Seed row -->
          <div class="flex items-center justify-between">
            <span class="text-[9px] text-slate-500 uppercase">Seed</span>
            <div class="flex items-center space-x-1">
              <div class="bg-surface-highest px-2 py-1 w-20">
                <input type="number" v-model.number="params.seed"
                  class="bg-transparent border-none p-0 text-[10px] font-mono w-full focus:ring-0 focus:outline-none text-on-surface" />
              </div>
              <button @click="randomSeed"
                class="bg-surface-highest hover:bg-surface-high text-[9px] text-slate-400 px-2 py-1 uppercase tracking-widest transition-colors">
                Rnd
              </button>
            </div>
          </div>
          <!-- Size -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="text-[9px] text-slate-500 uppercase mb-1">Width</div>
              <div class="bg-surface-highest px-2 py-1">
                <input type="number" v-model.number="params.width" step="10"
                  class="bg-transparent border-none p-0 text-[10px] font-mono w-full focus:ring-0 focus:outline-none text-on-surface" />
              </div>
            </div>
            <div>
              <div class="text-[9px] text-slate-500 uppercase mb-1">Depth</div>
              <div class="bg-surface-highest px-2 py-1">
                <input type="number" v-model.number="params.depth" step="10"
                  class="bg-transparent border-none p-0 text-[10px] font-mono w-full focus:ring-0 focus:outline-none text-on-surface" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Theme Section -->
      <div class="border-b border-surface-highest">
        <div class="px-3 py-2 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">Theme</div>
        <div class="px-3 pb-3 grid grid-cols-2 gap-1.5">
          <button
            v-for="t in THEMES" :key="t.id"
            @click="params.theme = t.id"
            class="flex items-center space-x-2 px-2 py-2 text-[9px] uppercase tracking-widest transition-all"
            :class="params.theme === t.id
              ? 'bg-surface-highest text-on-surface ring-1 ring-inset ' + t.ring
              : 'bg-surface-container-low text-slate-500 hover:bg-surface-highest'"
          >
            <div class="w-3 h-3 flex-none" :style="{ background: t.color }" />
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Decorations Section -->
      <div class="border-b border-surface-highest">
        <div class="px-3 py-2 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">Decorations</div>
        <div class="px-3 pb-3 space-y-3">
          <SliderRow label="Trees / Rocks" :min="0" :max="150" :step="5" v-model="params.treeCount" />
          <SliderRow label="Ruins / Pillars" :min="0" :max="50" :step="1" v-model="params.ruinCount" />
        </div>
      </div>

      <!-- Physics Section -->
      <div class="border-b border-surface-highest">
        <div class="px-3 py-2 text-[9px] font-bold tracking-[0.15em] text-slate-400 uppercase">Physics</div>
        <div class="px-3 pb-3">
          <div class="flex items-center justify-between">
            <span class="text-[9px] text-slate-500 uppercase">Heightfield Collider</span>
            <button
              @click="heightfieldPhysics = !heightfieldPhysics"
              class="w-8 h-4 flex items-center px-0.5 transition-colors"
              :class="heightfieldPhysics ? 'bg-green-600' : 'bg-surface-highest'"
            >
              <div class="w-3 h-3 bg-white transition-transform" :class="heightfieldPhysics ? 'translate-x-3.5' : ''" />
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-3 pt-3 space-y-2">
        <button
          @click="generate"
          :disabled="generating"
          class="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-[10px] font-bold py-2.5 uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-2"
        >
          <span class="material-symbols-outlined text-sm" :class="generating ? 'animate-spin' : ''">{{ generating ? 'sync' : 'landscape' }}</span>
          <span>{{ generating ? 'Generating…' : 'Generate Terrain' }}</span>
        </button>
        <button
          @click="clearTerrain"
          class="w-full bg-surface-highest hover:bg-surface-high text-slate-400 text-[10px] py-1.5 uppercase tracking-[0.15em] transition-all"
        >
          Clear Terrain
        </button>
      </div>

      <!-- Status -->
      <div v-if="status" class="px-3 pt-2">
        <div class="text-[9px] text-green-400 font-mono">{{ status }}</div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { Entity, Component } from '../../engine/Entity'
import { TerrainGenerator } from '../../engine/TerrainGenerator'
import type { TerrainTheme } from '../../engine/types'
import SliderRow from '../components/SliderRow.vue'

const store = useEditorStore()

const THEMES: { id: TerrainTheme; label: string; color: string; ring: string }[] = [
  { id: 'plains',   label: 'Plains',   color: '#4a7c35', ring: 'ring-green-700' },
  { id: 'desert',   label: 'Desert',   color: '#c2954a', ring: 'ring-yellow-700' },
  { id: 'snow',     label: 'Snow',     color: '#d0dce8', ring: 'ring-blue-300' },
  { id: 'volcanic', label: 'Volcanic', color: '#3a1a0a', ring: 'ring-red-900' },
  { id: 'dungeon',  label: 'Dungeon',  color: '#2a2535', ring: 'ring-purple-900' },
]

const params = reactive({
  width: 80, depth: 80, height: 14,
  scale: 0.07, octaves: 5, seed: 0,
  theme: 'plains' as TerrainTheme,
  treeCount: 40, ruinCount: 10,
})

const heightfieldPhysics = ref(false)
const generating = ref(false)
const status = ref('')

let _terrainEntityId: string | null = null

function randomSeed() {
  params.seed = Math.floor(Math.random() * 99999)
}

async function generate() {
  const eng = store.engine
  if (!eng) { status.value = 'Engine not ready'; return }

  generating.value = true
  status.value = ''

  // Small delay so UI updates
  await new Promise(r => setTimeout(r, 16))

  try {
    // Remove old terrain entity if exists
    if (_terrainEntityId) {
      eng.removeEntity(_terrainEntityId)
      _terrainEntityId = null
    }

    // Create terrain entity
    const entity = new Entity('Terrain')
    entity.addComponent(new Component('terrain', { ...params }))

    if (heightfieldPhysics.value) {
      entity.addComponent(new Component('physics', {
        isStatic: true, mass: 0,
        shape: 'heightfield',
        halfExtents: { x: params.width / 2, y: params.height / 2, z: params.depth / 2 },
        useGravity: false,
      }))
    }

    eng.addEntity(entity)
    _terrainEntityId = entity.id
    store.bumpEntityVersion()

    status.value = `Terrain generated (seed: ${params.seed})`
  } catch (err) {
    status.value = `Error: ${err instanceof Error ? err.message : String(err)}`
    console.error('[TerrainEditor]', err)
  } finally {
    generating.value = false
  }
}

function clearTerrain() {
  const eng = store.engine
  if (!eng) return
  if (_terrainEntityId) {
    eng.removeEntity(_terrainEntityId)
    _terrainEntityId = null
  }
  // Also clear via TerrainGenerator if available
  const tg = (eng as any)._terrainGenerator as TerrainGenerator | null
  tg?.clearLast()
  store.bumpEntityVersion()
  status.value = ''
}
</script>
