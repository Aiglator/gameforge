<template>
  <section class="flex-none bg-surface-container-low flex flex-col overflow-hidden" :style="{ width: store.leftPanelWidth + 'px' }">
    <!-- Header -->
    <div class="px-3 py-2 flex justify-between items-center bg-surface-container flex-none">
      <h2 class="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase">Scene Outliner</h2>
      <div class="flex items-center space-x-1">
        <button @click="addEntity" class="text-slate-500 hover:text-secondary transition-colors" title="Add entity">
          <span class="material-symbols-outlined text-sm">add</span>
        </button>
        <button class="text-slate-500 hover:text-white transition-colors">
          <span class="material-symbols-outlined text-sm">filter_list</span>
        </button>
      </div>
    </div>

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
    <div class="flex-1 overflow-y-auto py-1 no-scrollbar">
      <div v-if="filtered.length === 0" class="text-[10px] text-slate-600 text-center py-6">
        {{ filter ? 'No match' : 'Empty scene — right-click the viewport to add actors' }}
      </div>

      <div
        v-for="entity in filtered"
        :key="entity.id + store.entityVersion"
        @click="store.selectEntity(entity.id)"
        @dblclick="startRename(entity.id, entity.name)"
        @contextmenu.prevent="openCtx($event, entity.id)"
        class="flex items-center py-1.5 px-2 cursor-pointer transition-colors group"
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

function addEntity() {
  const eng = store.engine
  if (!eng) return
  const e = eng.createPrimitive('cube', `Cube_${Date.now()}`)
  store.selectEntity(e.id)
  store.bumpEntityVersion()
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
</style>
