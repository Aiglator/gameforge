<template>
  <section class="flex-none bg-surface-container-low flex flex-col overflow-hidden" :style="{ width: store.rightPanelWidth + 'px' }">
    <!-- Header -->
    <div class="px-3 py-2 flex justify-between items-center bg-surface-container flex-none">
      <h2 class="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase">Inspector</h2>
      <span class="material-symbols-outlined text-slate-500 text-sm">settings</span>
    </div>

    <!-- Empty state -->
    <div v-if="!entity" class="flex-1 flex items-center justify-center text-[11px] text-slate-600 text-center px-4">
      Select an entity in the Scene Outliner to inspect its properties
    </div>

    <!-- Entity properties -->
    <div v-else class="flex-1 overflow-y-auto no-scrollbar">
      <!-- Name -->
      <div class="px-4 pt-3 pb-2">
        <input
          :value="entity.name"
          @change="(e) => rename((e.target as HTMLInputElement).value)"
          class="bg-surface-highest px-2 py-1 text-[12px] font-bold w-full border-none focus:ring-0 focus:outline-none text-on-surface"
        />
        <div class="text-[9px] text-slate-600 mt-1">ID: {{ entity.id.slice(0, 8) }}...</div>
      </div>

      <!-- Transform -->
      <CollapsibleSection title="Transform" color="text-primary">
        <div class="space-y-1.5 px-4 pb-3">
          <Vec3Row label="Position" :value="entity.position" @change="v => updateTransform('position', v)" />
          <Vec3Row label="Rotation" :value="entity.rotation" @change="v => updateTransform('rotation', v)" />
          <Vec3Row label="Scale"    :value="entity.scale"    @change="v => updateTransform('scale', v)" />
        </div>
      </CollapsibleSection>

      <!-- Visibility toggle -->
      <div class="px-4 py-2 flex items-center justify-between border-t border-surface-highest">
        <span class="text-[9px] text-slate-500 uppercase">Visible</span>
        <button
          @click="toggleVisibility"
          class="flex items-center space-x-1 text-[10px]"
          :class="entity.visible ? 'text-secondary' : 'text-slate-600'"
        >
          <span class="material-symbols-outlined text-sm" :style="entity.visible ? 'font-variation-settings:\'FILL\' 1' : ''">
            {{ entity.visible ? 'visibility' : 'visibility_off' }}
          </span>
          <span>{{ entity.visible ? 'Visible' : 'Hidden' }}</span>
        </button>
      </div>

      <!-- Components -->
      <template v-for="compType in componentOrder" :key="compType">
        <CollapsibleSection
          v-if="entity.hasComponent(compType)"
          :title="compType"
          :color="compColors[compType] ?? 'text-slate-300'"
          :removable="true"
          @remove="removeComponent(compType)"
        >
          <!-- Script component special rendering -->
          <div v-if="compType === 'script'" class="px-4 pb-3 space-y-2">
            <button
              @click="openScript"
              class="w-full bg-secondary/10 text-secondary text-[10px] font-bold py-1.5 uppercase tracking-widest hover:bg-secondary/20 transition-all flex items-center justify-center space-x-1"
            >
              <span class="material-symbols-outlined text-sm">code</span>
              <span>Edit Script in Code Panel</span>
            </button>
            <div class="text-[9px] text-slate-500">{{ getComp(compType)?.data?.language ?? 'javascript' }}</div>
          </div>

          <!-- Generic field renderer -->
          <div v-else class="px-4 pb-3 space-y-1.5">
            <template v-for="[key, val] in compFields(compType)" :key="key">
              <!-- Vec3 object -->
              <Vec3Row
                v-if="isVec3(val)"
                :label="key"
                :value="val as any"
                @change="v => updateComp(compType, key, v)"
              />
              <!-- Boolean toggle -->
              <div v-else-if="typeof val === 'boolean'" class="flex items-center justify-between">
                <span class="text-[9px] text-slate-500 uppercase">{{ key }}</span>
                <button
                  @click="updateComp(compType, key, !val)"
                  class="w-8 h-4 flex items-center px-0.5 transition-colors"
                  :class="val ? 'bg-secondary' : 'bg-surface-highest'"
                >
                  <div class="w-3 h-3 bg-white transition-transform" :class="val ? 'translate-x-3.5' : ''" />
                </button>
              </div>
              <!-- Color -->
              <div v-else-if="key === 'color'" class="flex items-center justify-between">
                <span class="text-[9px] text-slate-500 uppercase">{{ key }}</span>
                <div class="flex items-center space-x-2">
                  <div class="w-6 h-4" :style="{ background: String(val) }" />
                  <input type="color" :value="String(val)" @input="(e) => updateComp(compType, key, (e.target as HTMLInputElement).value)"
                    class="w-6 h-4 bg-transparent border-none cursor-pointer p-0" />
                  <span class="text-[9px] text-on-surface-variant font-mono">{{ String(val) }}</span>
                </div>
              </div>
              <!-- Number -->
              <div v-else-if="typeof val === 'number'" class="flex items-center justify-between">
                <span class="text-[9px] text-slate-500 uppercase">{{ key }}</span>
                <div class="bg-surface-highest px-2 py-1 w-2/3">
                  <input type="number" step="0.1" :value="val"
                    @change="(e) => updateComp(compType, key, parseFloat((e.target as HTMLInputElement).value) || 0)"
                    class="bg-transparent border-none p-0 text-[10px] font-mono w-full focus:ring-0 focus:outline-none text-on-surface"
                  />
                </div>
              </div>
              <!-- Select -->
              <div v-else-if="selectFields[key]" class="flex items-center justify-between">
                <span class="text-[9px] text-slate-500 uppercase">{{ key }}</span>
                <select
                  :value="String(val)"
                  @change="(e) => updateComp(compType, key, (e.target as HTMLSelectElement).value)"
                  class="bg-surface-highest text-[10px] text-on-surface px-2 py-1 border-none focus:ring-0 w-2/3"
                >
                  <option v-for="opt in selectFields[key]" :key="opt">{{ opt }}</option>
                </select>
              </div>
              <!-- String fallback -->
              <div v-else class="flex items-center justify-between">
                <span class="text-[9px] text-slate-500 uppercase">{{ key }}</span>
                <div class="bg-surface-highest px-2 py-1 w-2/3">
                  <input type="text" :value="String(val)"
                    @change="(e) => updateComp(compType, key, (e.target as HTMLInputElement).value)"
                    class="bg-transparent border-none p-0 text-[10px] font-mono w-full focus:ring-0 focus:outline-none text-on-surface"
                  />
                </div>
              </div>
            </template>
          </div>
        </CollapsibleSection>
      </template>

      <!-- Add Component -->
      <div class="px-4 py-3">
        <select
          v-model="addCompType"
          @change="addComponent"
          class="w-full bg-surface-high text-[10px] text-slate-400 px-3 py-2 border-none focus:ring-0 uppercase tracking-widest cursor-pointer"
        >
          <option value="">+ Add Component</option>
          <option v-for="t in availableComponents" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { Component } from '../../engine/Entity'
import type { ComponentType } from '../../engine/types'
import CollapsibleSection from '../components/CollapsibleSection.vue'
import Vec3Row from '../components/Vec3Row.vue'

const store = useEditorStore()
const addCompType = ref('')

const entity = computed(() => {
  void store.entityVersion
  return store.selectedEntityId ? store.engine?.getEntity(store.selectedEntityId) ?? null : null
})

const componentOrder: ComponentType[] = ['mesh','physics','script','light','camera','sprite','animator','behavior','trigger','terrain']

const compColors: Partial<Record<ComponentType, string>> = {
  mesh: 'text-primary', physics: 'text-slate-300', script: 'text-secondary',
  light: 'text-yellow-400', camera: 'text-blue-400', sprite: 'text-emerald-400',
  behavior: 'text-orange-400', trigger: 'text-red-400', terrain: 'text-green-400',
}

const selectFields: Record<string, string[]> = {
  primitiveType: ['box','sphere','cylinder'],
  lightType: ['point','directional','spot','hemisphere'],
  mode: ['follow','firstPerson','fixed','orbit'],
  behaviorType: ['idle','patrol','chase','guardian','echo'],
  language: ['javascript','typescript'],
  theme: ['plains','desert','snow','volcanic','dungeon'],
}

function getComp(type: ComponentType) { return entity.value?.getComponent(type) }

function compFields(type: ComponentType) {
  const comp = getComp(type)
  if (!comp) return []
  return Object.entries(comp.data).filter(([k]) => !['type','source'].includes(k))
}

function isVec3(val: unknown): val is { x: number; y: number; z: number } {
  return typeof val === 'object' && val !== null && 'x' in val && 'y' in val && 'z' in val
}

const availableComponents = computed(() => {
  if (!entity.value) return componentOrder
  return componentOrder.filter(t => !entity.value!.hasComponent(t))
})

function rename(name: string) {
  if (!entity.value) return
  store.engine?.renameEntity(entity.value.id, name || 'Entity')
  store.bumpEntityVersion()
}

function toggleVisibility() {
  if (!entity.value) return
  entity.value.visible = !entity.value.visible
  if (entity.value.object3D) entity.value.object3D.visible = entity.value.visible
  store.bumpEntityVersion()
}

function updateTransform(prop: 'position' | 'rotation' | 'scale', val: { x: number; y: number; z: number }) {
  if (!entity.value) return
  store.engine?.updateEntityTransform(
    entity.value.id,
    prop === 'position' ? val : undefined,
    prop === 'rotation' ? val : undefined,
    prop === 'scale'    ? val : undefined,
  )
  store.bumpEntityVersion()
}

function updateComp(type: ComponentType, key: string, val: unknown) {
  if (!entity.value) return
  store.engine?.updateEntityComponent(entity.value.id, type, { [key]: val })
  store.bumpEntityVersion()
}

function removeComponent(type: ComponentType) {
  if (!entity.value) return
  entity.value.removeComponent(type)
  store.bumpEntityVersion()
}

const compDefaults: Partial<Record<ComponentType, Record<string, unknown>>> = {
  mesh:     { primitiveType: 'box', size: [1,1,1], color: '#6b7db3' },
  physics:  { isStatic: false, mass: 1, halfExtents: {x:.5,y:.5,z:.5}, useGravity: true },
  script:   { source: '// Available: entity, engine, THREE\n__exports.onStart = function() {};\n__exports.onUpdate = function(dt) {};', language: 'javascript' },
  light:    { lightType: 'point', color: '#ffffff', intensity: 1, castShadow: true },
  camera:   { mode: 'follow', fov: 60, active: false },
  sprite:   { textureUrl: '', width: 1, height: 1 },
  animator: { clipName: '', loop: true, speed: 1 },
  behavior: { behaviorType: 'idle', speed: 2, range: 10 },
  trigger:  { halfExtents: {x:1,y:1,z:1}, onEnter: '', onExit: '' },
  terrain:  { width: 80, depth: 80, height: 14, scale: 0.07, octaves: 5, seed: 0, theme: 'plains', treeCount: 40, ruinCount: 10 },
}

function addComponent() {
  const type = addCompType.value as ComponentType
  if (!type || !entity.value) return
  entity.value.addComponent(new Component(type, compDefaults[type] ?? {}))
  store.bumpEntityVersion()
  addCompType.value = ''
}

function openScript() {
  store.bottomTab = 'code'
}
</script>
