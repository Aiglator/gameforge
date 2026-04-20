<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <span class="material-symbols-outlined animate-spin text-accent" style="font-size:32px">sync</span>
    </div>
    <div v-else-if="!game" class="text-center py-20 text-on-surface-variant">Game not found.</div>
    <div v-else class="flex gap-8">
      <!-- Left: screenshots + description -->
      <div class="flex-1 min-w-0">
        <!-- Main image -->
        <div class="aspect-video bg-surface-highest mb-4 overflow-hidden">
          <img v-if="game.thumbnail" :src="`http://localhost:3004/static/${game.thumbnail}`"
            :alt="game.name" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <span class="material-symbols-outlined text-slate-700" style="font-size:64px">sports_esports</span>
          </div>
        </div>
        <!-- Description -->
        <div>
          <h1 class="text-xl font-black text-on-surface mb-2">{{ game.name }}</h1>
          <div class="flex items-center space-x-3 mb-4">
            <span class="text-[9px] bg-surface-highest px-2 py-0.5 text-on-surface-variant uppercase tracking-widest">{{ game.category }}</span>
            <span class="text-[9px] text-slate-600 flex items-center space-x-1">
              <span class="material-symbols-outlined text-xs">person</span>
              <span>{{ game.player_count }} players</span>
            </span>
          </div>
          <p class="text-[11px] text-on-surface-variant leading-relaxed">{{ game.description || 'No description provided.' }}</p>
        </div>
      </div>

      <!-- Right: sidebar -->
      <div class="w-60 flex-none">
        <div class="bg-surface-container border border-surface-highest p-4 sticky top-20">
          <!-- Price -->
          <div class="text-2xl font-black text-on-surface mb-4">
            {{ game.price === 0 ? 'Free' : `$${game.price.toFixed(2)}` }}
          </div>
          <!-- Play button -->
          <RouterLink
            :to="`/play/${game.slug}`"
            class="w-full block bg-secondary text-surface text-[11px] font-bold uppercase tracking-widest py-3 text-center hover:bg-secondary/80 transition-colors mb-2"
          >
            <span class="flex items-center justify-center space-x-2">
              <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">play_circle</span>
              <span>Play Now</span>
            </span>
          </RouterLink>
          <!-- Meta -->
          <div class="mt-4 space-y-2 border-t border-surface-highest pt-4">
            <div class="flex justify-between text-[9px]">
              <span class="text-slate-600 uppercase">Released</span>
              <span class="text-on-surface-variant">{{ formatDate(game.created_at) }}</span>
            </div>
            <div class="flex justify-between text-[9px]">
              <span class="text-slate-600 uppercase">Engine</span>
              <span class="text-on-surface-variant">Nexus v2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGamesStore, type Game } from '../stores/gamesStore'

const route = useRoute()
const store = useGamesStore()
const game = ref<Game | null>(null)
const loading = ref(true)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(async () => {
  game.value = await store.fetchGame(route.params.slug as string)
  loading.value = false
})
</script>
