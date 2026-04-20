<template>
  <div class="flex flex-col h-full bg-surface-container-low overflow-hidden">
    <!-- Tab bar -->
    <div class="flex items-stretch bg-[#141b2b] h-10 flex-none">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        @click="store.bottomTab = tab.id"
        class="px-4 h-full flex items-center space-x-2 transition-colors font-mono text-[11px] uppercase border-t-2"
        :class="store.bottomTab === tab.id
          ? 'bg-surface-highest text-secondary border-secondary'
          : 'text-slate-500 hover:bg-[#1c2538] border-transparent'"
      >
        <span class="material-symbols-outlined text-sm">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>

      <!-- Spacer + right actions -->
      <div class="flex-1" />
      <div class="flex items-center px-3 space-x-2">
        <button
          v-if="store.bottomTab === 'content'"
          @click="importFile"
          class="text-[9px] font-bold text-slate-400 hover:text-secondary uppercase px-2 py-1 hover:bg-surface-highest transition-colors"
        >Import</button>
        <button
          v-if="store.bottomTab === 'content'"
          class="text-[9px] font-bold text-slate-400 hover:text-white uppercase px-2 py-1 hover:bg-surface-highest transition-colors"
        >Add</button>
        <button
          v-if="store.bottomTab === 'console'"
          @click="store.clearConsole()"
          class="text-[9px] font-bold text-slate-400 hover:text-error uppercase px-2 py-1 transition-colors"
        >Clear</button>
      </div>
    </div>

    <!-- Panel content -->
    <div class="flex-1 overflow-hidden">
      <ContentBrowser v-if="store.bottomTab === 'content'" />
      <ConsolePanel   v-else-if="store.bottomTab === 'console'" />
      <CodeEditor     v-else-if="store.bottomTab === 'code'" />
      <NodeEditor     v-else-if="store.bottomTab === 'nodes'" />
    </div>
  </div>

  <!-- Hidden file input -->
  <input ref="fileInput" type="file" class="hidden" accept=".gltf,.glb,.png,.jpg,.jpeg,.svg,.json" multiple @change="handleFileImport" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore, type BottomTab } from '../stores/editorStore'
import ContentBrowser from './ContentBrowser.vue'
import ConsolePanel   from './ConsolePanel.vue'
import CodeEditor     from './CodeEditor.vue'
import NodeEditor     from './NodeEditor.vue'

const store = useEditorStore()
const fileInput = ref<HTMLInputElement | null>(null)

const TABS: Array<{ id: BottomTab; icon: string; label: string }> = [
  { id: 'content', icon: 'inventory_2', label: 'CONTENT' },
  { id: 'console', icon: 'terminal',    label: 'CONSOLE' },
  { id: 'code',    icon: 'code',        label: 'CODE' },
  { id: 'nodes',   icon: 'account_tree',label: 'NODES' },
]

function importFile() { fileInput.value?.click() }

function handleFileImport(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (const file of files) {
    const url = URL.createObjectURL(file)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const typeMap: Record<string, string> = {
      gltf: 'mesh', glb: 'mesh',
      png: 'texture', jpg: 'texture', jpeg: 'texture', svg: 'texture',
      json: 'scene',
    }
    store.addAsset({
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      type: (typeMap[ext] ?? 'texture') as 'mesh' | 'texture' | 'scene' | 'script' | 'material' | 'sprite',
      url,
      folder: store.currentFolder,
      size: file.size,
    })
    store.addConsoleMessage('info', `Imported: ${file.name}`)
  }
}
</script>
