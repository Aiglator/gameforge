<template>
  <aside class="bg-[#141b2b] flex flex-col items-center py-4 space-y-2 w-16 flex-none">
    <!-- Logo -->
    <div class="mb-4 text-center">
      <div class="text-base font-black text-white">N</div>
      <div class="text-[7px] text-slate-500 font-bold uppercase tracking-widest">v1.0</div>
    </div>

    <!-- Nav items -->
    <div class="flex flex-col space-y-1 w-full">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="store.leftPanel = item.id"
        class="py-3 flex flex-col items-center group transition-all border-l-2"
        :class="store.leftPanel === item.id
          ? 'bg-surface-highest text-accent border-accent'
          : 'text-slate-500 hover:bg-[#1c2538] hover:text-slate-300 border-transparent'"
        :title="item.label"
      >
        <span class="material-symbols-outlined" :style="store.leftPanel === item.id ? 'font-variation-settings:\'FILL\' 1' : ''">
          {{ item.icon }}
        </span>
        <span class="text-[9px] font-semibold tracking-wider mt-1">{{ item.label }}</span>
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Publish (pinned bottom) -->
    <button
      @click="store.leftPanel = 'publish'"
      class="py-3 flex flex-col items-center group transition-all border-l-2 w-full"
      :class="store.leftPanel === 'publish'
        ? 'bg-surface-highest text-secondary border-secondary'
        : 'text-slate-500 hover:bg-[#1c2538] hover:text-secondary border-transparent'"
      title="Publish to Marketplace"
    >
      <span class="material-symbols-outlined" :style="store.leftPanel === 'publish' ? 'font-variation-settings:\'FILL\' 1' : ''">
        rocket_launch
      </span>
      <span class="text-[9px] font-semibold tracking-wider mt-1">PUBLISH</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { useEditorStore, type LeftPanel } from '../stores/editorStore'

const store = useEditorStore()

const navItems: Array<{ id: LeftPanel; icon: string; label: string }> = [
  { id: 'scene',   icon: 'account_tree', label: 'SCENE' },
  { id: 'tools',   icon: 'tune',         label: 'TOOLS' },
  { id: 'assets',  icon: 'folder_open',  label: 'ASSETS' },
  { id: 'layers',  icon: 'layers',       label: 'LAYERS' },
  { id: 'terrain', icon: 'terrain',      label: 'WORLD' },
]
</script>
