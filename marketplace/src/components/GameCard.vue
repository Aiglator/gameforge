<template>
  <RouterLink :to="`/game/${game.slug}`" class="block group">
    <div class="bg-surface-container border border-surface-highest transition-transform duration-200 group-hover:-translate-y-1 overflow-hidden">
      <!-- Thumbnail -->
      <div class="aspect-video bg-surface-highest relative overflow-hidden">
        <img
          v-if="game.thumbnail"
          :src="thumbnailUrl"
          :alt="game.name"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <span class="material-symbols-outlined text-slate-700" style="font-size:48px">sports_esports</span>
        </div>
        <!-- Play overlay -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="bg-secondary text-surface text-[11px] font-bold uppercase tracking-widest px-4 py-2 flex items-center space-x-2">
            <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">play_circle</span>
            <span>Play Now</span>
          </div>
        </div>
        <!-- Price badge -->
        <div class="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5"
          :class="game.price === 0 ? 'bg-secondary text-surface' : 'bg-accent text-surface'">
          {{ game.price === 0 ? 'Free' : `$${game.price.toFixed(2)}` }}
        </div>
      </div>
      <!-- Info -->
      <div class="p-3">
        <div class="text-[11px] font-bold text-on-surface truncate">{{ game.name }}</div>
        <div class="text-[9px] text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed">{{ game.description }}</div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-[9px] text-slate-600 uppercase tracking-widest">{{ game.category }}</span>
          <span class="text-[9px] text-slate-600 flex items-center space-x-0.5">
            <span class="material-symbols-outlined text-xs">person</span>
            <span>{{ game.player_count }}</span>
          </span>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Game } from '../stores/gamesStore'

const props = defineProps<{ game: Game }>()

const thumbnailUrl = computed(() =>
  props.game.thumbnail?.startsWith('http')
    ? props.game.thumbnail
    : `http://localhost:3003/static/${props.game.thumbnail}`
)
</script>
