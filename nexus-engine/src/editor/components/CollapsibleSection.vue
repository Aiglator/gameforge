<template>
  <div class="border-t border-surface-highest">
    <div
      class="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-surface-high transition-colors"
      @click="open = !open"
    >
      <span class="text-[10px] font-bold uppercase tracking-widest" :class="color">{{ title }}</span>
      <div class="flex items-center space-x-1">
        <button
          v-if="removable"
          @click.stop="$emit('remove')"
          class="text-slate-600 hover:text-error transition-colors"
          title="Remove component"
        >
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
        <span class="material-symbols-outlined text-slate-500 text-sm transition-transform duration-150" :style="open ? '' : 'transform:rotate(-90deg)'">
          expand_more
        </span>
      </div>
    </div>
    <div v-show="open">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ title: string; color?: string; removable?: boolean }>()
defineEmits<{ remove: [] }>()
const open = ref(true)
</script>
