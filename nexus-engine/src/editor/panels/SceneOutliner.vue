<template>
  <section class="flex-none bg-surface-container-low flex flex-col overflow-hidden" :style="{ width: store.leftPanelWidth + 'px' }">
    <!-- Header -->
    <div class="px-3 py-2 flex justify-between items-center bg-surface-container flex-none relative">
      <h2 class="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase">Scene Outliner</h2>
      <div class="flex items-center space-x-1">
        <!-- Add entity with full dropdown -->
        <div class="relative" ref="addMenuRef">
          <button @click="showAddMenu = !showAddMenu"
            class="text-slate-500 hover:text-secondary transition-colors flex items-center space-x-0.5"
            title="Ajouter une entité">
            <span class="material-symbols-outlined text-sm">add</span>
            <span class="text-[8px] text-slate-600">▾</span>
          </button>
          <!-- Dropdown -->
          <div v-if="showAddMenu"
            class="absolute right-0 top-full mt-1 bg-surface-high shadow-2xl py-1 z-[200] min-w-[180px] max-h-[80vh] overflow-y-auto custom-scrollbar border border-surface-highest">
            <div class="px-3 py-1 text-[8px] font-bold text-slate-600 uppercase tracking-widest">Primitives 3D</div>
            <button v-for="item in ADD_ITEMS_3D" :key="item.type" @click="spawnType(item.type, item.label)"
              class="w-full px-3 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest flex items-center space-x-2">
              <span class="material-symbols-outlined text-sm" :class="item.color">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
            <div class="border-t border-surface-highest my-1" />
            <div class="px-3 py-1 text-[8px] font-bold text-slate-600 uppercase tracking-widest">2D / Sprites</div>
            <button v-for="item in ADD_ITEMS_2D" :key="item.type" @click="spawnType(item.type, item.label)"
              class="w-full px-3 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest flex items-center space-x-2">
              <span class="material-symbols-outlined text-sm" :class="item.color">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
            <div class="border-t border-surface-highest my-1" />
            <div class="px-3 py-1 text-[8px] font-bold text-slate-600 uppercase tracking-widest">Lumières & Caméras</div>
            <button v-for="item in ADD_ITEMS_LIGHT" :key="item.type" @click="spawnType(item.type, item.label)"
              class="w-full px-3 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest flex items-center space-x-2">
              <span class="material-symbols-outlined text-sm" :class="item.color">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
        <button class="text-slate-500 hover:text-white transition-colors">
          <span class="material-symbols-outlined text-sm">filter_list</span>
        </button>
      </div>
    </div>
    <!-- Click outside to close add menu -->
    <div v-if="showAddMenu" class="fixed inset-0 z-[190]" @click="showAddMenu = false" />

    <!-- Search -->
    <div class="px-2 py-1 flex-none">
      <div class="bg-surface-highest flex items-center px-2 py-1 space-x-1">
        <span class="material-symbols-outlined text-slate-500 text-sm">search</span>
        <input
          v-model="filter"
          class="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] w-full placeholder:text-slate-600"
          placeholder="Filter entities..."
        />
      </div>
    </div>

    <!-- Entity tree -->
    <div class="flex-1 overflow-y-auto py-1 custom-scrollbar">
      <div v-if="filtered.length === 0" class="text-[10px] text-slate-600 text-center py-6">
        {{ filter ? 'No match' : 'Empty scene — right-click the viewport to add actors' }}
      </div>

      <template v-else>
        <div v-for="(group, cat) in groupedEntities" :key="cat">
          <!-- Category Header -->
          <div 
            v-if="group.length > 0"
            @click="toggleCategory(cat)"
            class="px-2 py-1 flex items-center space-x-1 cursor-pointer hover:bg-surface-highest/20 group/cat"
          >
            <span class="material-symbols-outlined text-[12px] text-slate-600 transition-transform" :class="{ '-rotate-90': collapsed[cat] }">expand_more</span>
            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex-1">{{ cat }}</span>
            <span class="text-[8px] text-slate-600 mr-1 group-hover/cat:text-slate-400">{{ group.length }}</span>
          </div>

          <!-- Group Entities -->
          <Transition name="fold">
            <div v-if="!collapsed[cat]" class="overflow-hidden">
              <div
                v-for="entity in group"
                :key="entity.id + store.entityVersion"
                @click="store.selectEntity(entity.id)"
                @dblclick="startRename(entity.id, entity.name)"
                @contextmenu.prevent="openCtx($event, entity.id)"
                class="flex items-center py-1.5 px-2 pl-4 cursor-pointer transition-colors group"
                :class="entity.id === store.selectedEntityId
                  ? 'bg-surface-highest text-primary'
                  : 'text-slate-300 hover:bg-surface-high'"
              >
                <!-- Visibility toggle -->
                <span
                  class="material-symbols-outlined text-sm mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  :style="entity.visible ? '' : 'font-variation-settings:\'FILL\' 1'"
                  :class="entity.visible ? 'text-slate-500' : 'text-slate-700'"
                  @click.stop="toggleVisibility(entity.id)"
                >{{ entity.visible ? 'visibility' : 'visibility_off' }}</span>

                <!-- Type icon -->
                <span
                  class="material-symbols-outlined text-sm mr-2 flex-none"
                  :class="entityIcon(entity).color"
                >{{ entityIcon(entity).icon }}</span>

                <!-- Name or inline rename input -->
                <template v-if="renaming.id === entity.id">
                  <input
                    ref="renameInput"
                    v-model="renaming.name"
                    @blur="commitRename"
                    @keyup.enter="commitRename"
                    @keyup.escape="renaming.id = null"
                    @click.stop
                    class="bg-surface-container border border-accent/50 px-1 text-[11px] w-full focus:ring-0 focus:outline-none"
                  />
                </template>
                <template v-else>
                  <span class="text-[11px] font-medium tracking-tight truncate flex-1">{{ entity.name }}</span>
                </template>

                <!-- Script indicator -->
                <span
                  v-if="entity.hasComponent('script')"
                  class="material-symbols-outlined text-secondary text-sm ml-1 flex-none"
                  title="Has script"
                >code</span>
              </div>
            </div>
          </Transition>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="px-3 py-1.5 bg-surface-container flex-none text-[9px] text-slate-600 flex justify-between">
      <span>{{ allEntities.length }} entities</span>
      <span>{{ allEntities.filter(e => e.hasComponent('mesh')).length }} meshes · {{ allEntities.filter(e => e.hasComponent('light')).length }} lights</span>
    </div>

    <!-- Context menu -->
    <div
      v-if="ctx.visible"
      :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }"
      class="fixed bg-surface-high shadow-2xl py-1 z-50 min-w-[160px]"
    >
      <button @click="ctxAction('rename')"    class="ctx-item">Rename</button>
      <button @click="ctxAction('duplicate')" class="ctx-item">Duplicate</button>
      <button @click="ctxAction('focus')"     class="ctx-item">Focus in Viewport</button>
      <div class="border-t border-surface-highest my-1" />
      <button @click="ctxAction('delete')"    class="ctx-item text-error">Delete</button>
    </div>
    <div v-if="ctx.visible" class="fixed inset-0 z-40" @click="ctx.visible = false" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import type { Entity } from '../../engine/Entity'

const store = useEditorStore()
const filter = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
const renaming = ref<{ id: string | null; name: string }>({ id: null, name: '' })
const ctx = ref({ visible: false, x: 0, y: 0, id: '' })
const showAddMenu = ref(false)
const addMenuRef = ref<HTMLDivElement | null>(null)

const collapsed = ref<Record<string, boolean>>({
  'Cameras': false,
  'Lights': false,
  '2D / Sprites': false,
  '3D / Meshes': false,
  'Other': false
})

const groupedEntities = computed(() => {
  const list = filtered.value
  const groups: Record<string, Entity[]> = {
    'Cameras': [],
    'Lights': [],
    '2D / Sprites': [],
    '3D / Meshes': [],
    'Other': []
  }

  for (const e of list) {
    if (e.hasComponent('camera')) groups['Cameras'].push(e)
    else if (e.hasComponent('light')) groups['Lights'].push(e)
    else if (e.hasComponent('sprite') || e.hasComponent('tilemap')) groups['2D / Sprites'].push(e)
    else if (e.hasComponent('mesh') || e.hasComponent('terrain')) groups['3D / Meshes'].push(e)
    else groups['Other'].push(e)
  }
  return groups
})

function toggleCategory(cat: string) {
  collapsed.value[cat] = !collapsed.value[cat]
}

const ADD_ITEMS_3D = [
  { type: 'cube',     label: 'Cube',       icon: 'deployed_code',        color: 'text-primary' },
  { type: 'sphere',   label: 'Sphere',     icon: 'radio_button_unchecked',color: 'text-blue-400' },
  { type: 'cylinder', label: 'Cylinder',   icon: 'cylinder',             color: 'text-purple-400' },
  { type: 'plane',    label: 'Plane',      icon: 'crop_square',          color: 'text-slate-400' },
  { type: 'terrain',  label: 'Terrain',    icon: 'terrain',              color: 'text-green-400' },
] as const

const ADD_ITEMS_2D = [
  { type: 'sprite',       label: 'Sprite Billboard', icon: 'smart_display',  color: 'text-emerald-400' },
  { type: 'sprite-fixed', label: 'Flat Sprite',      icon: 'crop_portrait',  color: 'text-emerald-600' },
  { type: 'tilemap',      label: 'Tilemap',          icon: 'grid_on',        color: 'text-cyan-400' },
] as const

const ADD_ITEMS_LIGHT = [
  { type: 'light',  label: 'Point Light',       icon: 'lightbulb',   color: 'text-yellow-400' },
  { type: 'camera', label: 'Camera Entity',     icon: 'videocam',    color: 'text-blue-400' },
] as const

const allEntities = computed(() => {
  void store.entityVersion // reactivity
  return store.engine?.getAllEntities() ?? []
})

const filtered = computed(() =>
  filter.value
    ? allEntities.value.filter(e => e.name.toLowerCase().includes(filter.value.toLowerCase()))
    : allEntities.value
)

function entityIcon(e: Entity): { icon: string; color: string } {
  if (e.hasComponent('light'))   return { icon: 'lightbulb',     color: 'text-yellow-400' }
  if (e.hasComponent('camera'))  return { icon: 'videocam',      color: 'text-blue-400'   }
  if (e.hasComponent('sprite'))  return { icon: 'image',         color: 'text-emerald-400'}
  if (e.hasComponent('trigger')) return { icon: 'sensors',       color: 'text-orange-400' }
  if (e.hasComponent('mesh'))    return { icon: 'deployed_code', color: 'text-primary'    }
  return { icon: 'token', color: 'text-slate-500' }
}

function spawnType(type: string, label: string) {
  const eng = store.engine
  if (!eng) return
  showAddMenu.value = false
  const e = eng.createPrimitive(type as Parameters<typeof eng.createPrimitive>[0], `${label}_${Date.now()}`)
  store.selectEntity(e.id)
  store.bumpEntityVersion()
  store.addConsoleMessage('info', `Spawned ${label}`)

  // For sprites: open a file picker immediately so the user can choose a texture
  if (type === 'sprite' || type === 'sprite-fixed') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      eng.updateEntityComponent(e.id, 'sprite', { textureUrl: url })
      store.bumpEntityVersion()
      store.addConsoleMessage('info', `Sprite texture: ${file.name}`)
    }
    input.click()
  }
}

function toggleVisibility(id: string) {
  const eng = store.engine
  if (!eng) return
  const e = eng.getEntity(id)
  if (!e) return
  e.visible = !e.visible
  if (e.object3D) e.object3D.visible = e.visible
  store.bumpEntityVersion()
}

function startRename(id: string, name: string) {
  renaming.value = { id, name }
  nextTick(() => renameInput.value?.select())
}

function commitRename() {
  if (!renaming.value.id) return
  store.engine?.renameEntity(renaming.value.id, renaming.value.name || 'Entity')
  store.bumpEntityVersion()
  renaming.value.id = null
}

function openCtx(e: MouseEvent, id: string) {
  ctx.value = { visible: true, x: e.clientX, y: e.clientY, id }
}

function ctxAction(action: string) {
  const id = ctx.value.id
  ctx.value.visible = false
  const eng = store.engine
  if (!eng) return

  if (action === 'delete') { eng.removeEntity(id); store.selectEntity(null); store.bumpEntityVersion() }
  else if (action === 'duplicate') { const c = eng.duplicateEntity(id); if (c) { store.selectEntity(c.id); store.bumpEntityVersion() } }
  else if (action === 'rename') { const e = eng.getEntity(id); if (e) startRename(id, e.name) }
  else if (action === 'focus') {
    const e = eng.getEntity(id)
    if (e?.object3D) { eng.orbitControls.target.copy(e.object3D.position); eng.orbitControls.update() }
  }
}
</script>

<style scoped>
.ctx-item {
  @apply w-full px-4 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.1);
}

.fold-enter-active, .fold-leave-active {
  transition: all 0.2s ease;
  max-height: 500px;
}
.fold-enter-from, .fold-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
