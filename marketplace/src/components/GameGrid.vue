<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-20">
      <span class="material-symbols-outlined animate-spin text-accent" style="font-size:32px">sync</span>
    </div>
    <div v-else-if="games.length === 0" class="py-20 text-center text-on-surface-variant text-[11px]">
      No games found.
    </div>
    <div v-else class="grid gap-4" :style="gridStyle">
      <GameCard v-for="game in games" :key="game.id" :game="game" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Game } from '../stores/gamesStore'
import GameCard from './GameCard.vue'

const props = withDefaults(defineProps<{
  games: Game[]
  loading?: boolean
  columns?: number
}>(), { loading: false, columns: 4 })

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))`,
}))
</script>
