<template>
  <div class="flex h-full bg-surface-lowest">
    <!-- Folder tree sidebar (hidden in sideMode) -->
    <div v-if="!sideMode" class="w-44 flex-none border-r border-surface-highest flex flex-col bg-surface-container-low">
      <div class="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 flex-none">Folders</div>
      <div class="flex-1 overflow-y-auto no-scrollbar">
        <div
          v-for="folder in FOLDERS"
          :key="folder.id"
          @click="store.currentFolder = folder.id"
          class="flex items-center space-x-2 px-3 py-1.5 cursor-pointer transition-colors"
          :class="store.currentFolder === folder.id
            ? 'bg-surface-highest text-secondary'
            : 'text-slate-400 hover:bg-surface-high'"
        >
          <span class="material-symbols-outlined text-sm flex-none" :class="folder.color">{{ folder.icon }}</span>
          <span class="text-[10px] truncate">{{ folder.label }}</span>
          <span class="ml-auto text-[9px] text-slate-600">{{ countIn(folder.id) }}</span>
        </div>
      </div>

      <!-- Import mini button -->
      <div class="px-3 py-2 border-t border-surface-highest flex-none">
        <div class="text-[9px] text-slate-600">{{ store.assets.length }} asset(s)</div>
      </div>
    </div>

    <!-- Asset grid -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="flex items-center px-3 h-8 flex-none border-b border-surface-highest space-x-2">
        <div class="flex-1 bg-surface-highest flex items-center px-2 space-x-1">
          <span class="material-symbols-outlined text-slate-500 text-sm">search</span>
          <input
            v-model="search"
            class="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] w-full placeholder:text-slate-600"
            placeholder="Filter assets..."
          />
        </div>
        <div class="flex items-center space-x-1">
          <button
            v-for="size in [32, 64, 96] as const"
            :key="size"
            @click="thumbSize = size"
            class="text-[9px] px-1 transition-colors"
            :class="thumbSize === size ? 'text-secondary' : 'text-slate-600 hover:text-slate-300'"
          >
            {{ size === 32 ? 'SM' : size === 64 ? 'MD' : 'LG' }}
          </button>
        </div>
      </div>

      <!-- Grid -->
      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <!-- Empty state -->
        <div v-if="visible.length === 0" class="flex flex-col items-center justify-center h-full text-center">
          <span class="material-symbols-outlined text-slate-700 text-4xl">folder_open</span>
          <p class="text-[10px] text-slate-600 mt-2">
            {{ store.assets.length === 0
              ? 'No assets yet — use Import in the toolbar above'
              : 'No assets in this folder' }}
          </p>
        </div>

        <!-- Tiles -->
        <div
          v-else
          class="grid gap-2"
          :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize + 16}px, 1fr))` }"
        >
          <div
            v-for="asset in visible"
            :key="asset.id"
            @click="selected = asset.id"
            @dblclick="useAsset(asset)"
            @contextmenu.prevent="openCtx($event, asset)"
            draggable="true"
            @dragstart="e => onDragStart(e, asset)"
            class="flex flex-col items-center cursor-pointer group"
          >
            <!-- Thumbnail -->
            <div
              class="flex items-center justify-center bg-surface-high transition-colors group-hover:bg-surface-highest"
              :class="selected === asset.id ? 'ring-1 ring-secondary' : ''"
              :style="{ width: thumbSize + 'px', height: thumbSize + 'px' }"
            >
              <!-- Image preview for textures -->
              <img
                v-if="isImage(asset) && asset.url"
                :src="asset.url"
                :style="{ width: thumbSize - 4 + 'px', height: thumbSize - 4 + 'px', objectFit: 'cover' }"
                class="object-cover"
              />
              <!-- Icon fallback -->
              <span v-else class="material-symbols-outlined text-slate-500" :style="{ fontSize: thumbSize * 0.45 + 'px' }">
                {{ assetIcon(asset.type) }}
              </span>
            </div>
            <!-- Name -->
            <span class="text-[8px] text-slate-400 mt-1 text-center truncate w-full px-1" :title="asset.name">
              {{ asset.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Status bar -->
      <div v-if="selected" class="px-3 py-1 border-t border-surface-highest flex items-center space-x-3 flex-none">
        <template v-if="selectedAsset">
          <span class="text-[9px] text-slate-500 uppercase">{{ selectedAsset.type }}</span>
          <span class="text-[9px] text-slate-600">{{ selectedAsset.name }}</span>
          <span v-if="selectedAsset.size" class="text-[9px] text-slate-700">{{ formatSize(selectedAsset.size) }}</span>
        </template>
      </div>
    </div>

    <!-- Context menu -->
    <div
      v-if="ctx.visible"
      :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }"
      class="fixed bg-surface-high shadow-2xl py-1 z-50 min-w-[140px]"
    >
      <button @click="ctxApply"  class="ctx-item">Apply to Selected Entity</button>
      <button @click="ctxRename" class="ctx-item">Rename</button>
      <div class="border-t border-surface-highest my-1" />
      <button @click="ctxDelete" class="ctx-item text-error">Remove</button>
    </div>
    <div v-if="ctx.visible" class="fixed inset-0 z-40" @click="ctx.visible = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import type { AssetEntry } from '../stores/editorStore'

defineProps<{ sideMode?: boolean }>()

const store = useEditorStore()
const search = ref('')
const thumbSize = ref(64)
const selected = ref<string | null>(null)
const ctx = ref({ visible: false, x: 0, y: 0, asset: null as AssetEntry | null })

const FOLDERS = [
  { id: '/',          icon: 'inventory_2', label: 'All Assets',  color: 'text-slate-400' },
  { id: '/meshes',    icon: 'deployed_code',label: 'Meshes',     color: 'text-primary'   },
  { id: '/textures',  icon: 'image',       label: 'Textures',    color: 'text-emerald-400'},
  { id: '/scenes',    icon: 'view_in_ar',  label: 'Scenes',      color: 'text-blue-400'  },
  { id: '/scripts',   icon: 'code',        label: 'Scripts',     color: 'text-secondary' },
  { id: '/materials', icon: 'palette',     label: 'Materials',   color: 'text-yellow-400'},
]

function countIn(folderId: string) {
  if (folderId === '/') return store.assets.length
  return store.assets.filter(a => a.folder === folderId).length
}

const visible = computed(() => {
  let list = store.currentFolder === '/'
    ? store.assets
    : store.assets.filter(a => a.folder === store.currentFolder)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }
  return list
})

const selectedAsset = computed(() => store.assets.find(a => a.id === selected.value) ?? null)

function assetIcon(type: AssetEntry['type']) {
  const map: Record<string, string> = {
    mesh: 'deployed_code', texture: 'image', sprite: 'image',
    scene: 'view_in_ar', script: 'code', material: 'palette',
  }
  return map[type] ?? 'help'
}

function isImage(asset: AssetEntry) {
  return asset.type === 'texture' || asset.type === 'sprite'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function onDragStart(e: DragEvent, asset: AssetEntry) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData('nexus/asset', JSON.stringify(asset))
  e.dataTransfer.dropEffect = 'copy'
}

function useAsset(asset: AssetEntry) {
  const eng = store.engine
  const eid = store.selectedEntityId
  if (!eng || !eid) {
    store.addConsoleMessage('warn', 'Select an entity first to apply an asset')
    return
  }
  if (asset.type === 'texture') {
    eng.updateEntityComponent(eid, 'mesh', { textureUrl: asset.url })
    store.bumpEntityVersion()
    store.addConsoleMessage('info', `Applied texture: ${asset.name}`)
  } else if (asset.type === 'mesh') {
    eng.updateEntityComponent(eid, 'mesh', { modelUrl: asset.url })
    store.bumpEntityVersion()
    store.addConsoleMessage('info', `Applied mesh: ${asset.name}`)
  }
}

function openCtx(e: MouseEvent, asset: AssetEntry) {
  selected.value = asset.id
  ctx.value = { visible: true, x: e.clientX, y: e.clientY, asset }
}

function ctxApply() {
  if (ctx.value.asset) useAsset(ctx.value.asset)
  ctx.value.visible = false
}

function ctxRename() {
  ctx.value.visible = false
  const asset = ctx.value.asset
  if (!asset) return
  const name = prompt('Rename asset:', asset.name)
  if (name && name.trim()) {
    asset.name = name.trim()
  }
}

function ctxDelete() {
  if (ctx.value.asset) {
    store.removeAsset(ctx.value.asset.id)
    if (selected.value === ctx.value.asset.id) selected.value = null
  }
  ctx.value.visible = false
}
</script>

<style scoped>
.ctx-item {
  @apply w-full px-4 py-1.5 text-left text-[11px] text-on-surface hover:bg-surface-highest;
}

.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
</style>
