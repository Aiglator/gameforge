<template>
  <section class="flex-none bg-surface-container-low flex flex-col overflow-hidden" :style="{ width: store.rightPanelWidth + 'px' }">
    <div class="px-3 py-2 flex justify-between items-center bg-surface-container flex-none">
      <h2 class="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase">Inspector</h2>
      <span class="material-symbols-outlined text-slate-500 text-sm">settings</span>
    </div>

    <div v-if="!entity" class="flex-1 flex items-center justify-center text-[11px] text-slate-600 text-center px-4">
      Select an entity in the Scene Outliner to inspect its properties
    </div>

    <div v-else class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="px-4 pt-3 pb-2">
        <input
          :value="entity.name"
          @change="(e) => rename((e.target as HTMLInputElement).value)"
          class="bg-surface-highest px-2 py-1 text-[12px] font-bold w-full border-none focus:ring-0 focus:outline-none text-on-surface"
        />
        <div class="text-[9px] text-slate-600 mt-1">ID: {{ entity.id.slice(0, 8) }}...</div>
      </div>

      <CollapsibleSection title="Transform" color="text-primary">
        <div class="space-y-1.5 px-4 pb-3">
          <Vec3Row label="Position" :value="entity.position" @change="v => updateTransform('position', v)" />
          <Vec3Row label="Rotation" :value="entity.rotation" @change="v => updateTransform('rotation', v)" />
          <Vec3Row label="Scale"    :value="entity.scale"    @change="v => updateTransform('scale', v)" />
        </div>
      </CollapsibleSection>

      <div class="px-4 py-2 flex items-center justify-between border-t border-surface-highest">
        <span class="text-[9px] text-slate-500 uppercase">Visible</span>
        <button @click="toggleVisibility" class="flex items-center space-x-1 text-[10px]" :class="entity.visible ? 'text-secondary' : 'text-slate-600'">
          <span class="material-symbols-outlined text-sm" :style="entity.visible ? 'font-variation-settings:\'FILL\' 1' : ''">
            {{ entity.visible ? 'visibility' : 'visibility_off' }}
          </span>
          <span>{{ entity.visible ? 'Visible' : 'Hidden' }}</span>
        </button>
      </div>

      <template v-for="compType in componentOrder" :key="compType">
        <CollapsibleSection
          v-if="entity.hasComponent(compType)"
          :title="compType"
          :color="compColors[compType] ?? 'text-slate-300'"
          :removable="true"
          @remove="removeComponent(compType)"
        >
          <div v-if="compType === 'script'" class="px-4 pb-3 space-y-2">
            <button @click="openScript" class="w-full bg-secondary/10 text-secondary text-[10px] font-bold py-1.5 uppercase tracking-widest hover:bg-secondary/20 transition-all flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">code</span>
              <span>Edit Script</span>
            </button>
          </div>

          <div v-else-if="compType === 'sprite'" class="px-4 pb-3 space-y-2">
            <div>
              <div class="text-[9px] text-slate-500 uppercase mb-1">Texture URL</div>
              <div class="flex space-x-1">
                <div class="bg-surface-highest px-2 py-1 flex-1" @drop="e => onDropAsset(e, 'sprite', 'textureUrl')" @dragover.prevent>
                  <input type="text" :value="String(getComp('sprite')?.data?.textureUrl ?? '')" @change="(e) => updateComp('sprite', 'textureUrl', (e.target as HTMLInputElement).value)" class="bg-transparent border-none p-0 text-[10px] font-mono w-full text-on-surface" />
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="compType === 'tilemap'" class="px-4 pb-3 space-y-2">
            <button @click="reloadTilemap" class="w-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold py-1.5 uppercase hover:bg-cyan-500/20 flex items-center justify-center space-x-1">
              <span class="material-symbols-outlined text-sm">refresh</span><span>Reload Map</span>
            </button>
          </div>

          <div v-else class="px-4 pb-3 space-y-1.5">
            <template v-for="[key, val] in compFields(compType)" :key="key">
              <Vec3Row v-if="isVec3(val)" :label="key" :value="val as any" @change="v => updateComp(compType, key, v)" />
              <div v-else class="flex items-center justify-between">
                <span class="text-[9px] text-slate-500 uppercase">{{ key }}</span>
                <div class="bg-surface-highest px-2 py-1 w-2/3">
                  <input :type="typeof val === 'number' ? 'number' : 'text'" :value="val" @change="(e) => updateComp(compType, key, (e.target as HTMLInputElement).value)" class="bg-transparent border-none p-0 text-[10px] font-mono w-full text-on-surface" />
                </div>
              </div>
            </template>
          </div>
        </CollapsibleSection>
      </template>

      <div class="px-4 py-4 border-t border-surface-highest">
        <div class="relative">
          <button @click="showAddCompMenu = !showAddCompMenu" class="w-full bg-secondary/10 text-secondary text-[10px] font-bold py-2.5 uppercase tracking-widest hover:bg-secondary/20 transition-all border border-secondary/20">
            + Add Component
          </button>
          <div v-if="showAddCompMenu" class="absolute bottom-full left-0 w-full mb-1 bg-surface-high shadow-2xl py-1 z-50 border border-surface-highest max-h-[200px] overflow-y-auto custom-scrollbar">
            <button v-for="t in availableComponents" :key="t" @click="addComponent(t)" class="w-full px-4 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest">
              {{ t }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="showAddCompMenu" class="fixed inset-0 z-[40]" @click="showAddCompMenu = false" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, toRaw } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { Component } from '../../engine/Entity'
import type { ComponentType } from '../../engine/types'
import CollapsibleSection from '../components/CollapsibleSection.vue'
import Vec3Row from '../components/Vec3Row.vue'

const store = useEditorStore()
const showAddCompMenu = ref(false)
const dragOverField = ref<string | null>(null)

const entity = computed(() => {
  void store.entityVersion
  return store.selectedEntityId ? store.engine?.getEntity(store.selectedEntityId) ?? null : null
})

const componentOrder: ComponentType[] = ['mesh','physics','script','light','camera','sprite','tilemap','animator','behavior','trigger','terrain']
const compColors: Partial<Record<ComponentType, string>> = { mesh: 'text-primary', physics: 'text-slate-300', script: 'text-secondary', light: 'text-yellow-400', camera: 'text-blue-400', sprite: 'text-emerald-400' }

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

function rename(name: string) { if (entity.value) { store.engine?.renameEntity(entity.value.id, name || 'Entity'); store.bumpEntityVersion() } }
function toggleVisibility() { if (entity.value) { entity.value.visible = !entity.value.visible; if (entity.value.object3D) entity.value.object3D.visible = entity.value.visible; store.bumpEntityVersion() } }
function updateTransform(prop: any, val: any) { if (entity.value) { store.engine?.updateEntityTransform(entity.value.id, prop === 'position' ? val : undefined, prop === 'rotation' ? val : undefined, prop === 'scale' ? val : undefined); store.bumpEntityVersion() } }
function updateComp(type: ComponentType, key: string, val: unknown) { if (entity.value) { store.engine?.updateEntityComponent(entity.value.id, type, { [key]: val }); store.bumpEntityVersion() } }
function removeComponent(type: ComponentType) { if (entity.value) { entity.value.removeComponent(type); store.bumpEntityVersion() } }

function addComponent(type: ComponentType) {
  if (!entity.value) return
  entity.value.addComponent(new Component(type, {}))
  store.bumpEntityVersion()
  showAddCompMenu.value = false
}
function openScript() { store.bottomTab = 'code' }
function reloadTilemap() { if (entity.value) store.engine?.updateEntityComponent(entity.value.id, 'tilemap', {}) }
function onDropAsset(e: DragEvent, compType: ComponentType, key: string) {
  if (!e.dataTransfer) return
  const data = e.dataTransfer.getData('nexus/asset')
  if (!data) return
  try {
    const asset = JSON.parse(data)
    if (asset.url) updateComp(compType, key, asset.url)
  } catch (err) {}
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>