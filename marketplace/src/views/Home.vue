<template>
  <div>
    <!-- Hero Banner -->
    <section class="relative h-80 overflow-hidden bg-surface-container">
      <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent z-10" />
      <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10" />
      <!-- Hero BG pattern -->
      <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 20% 50%, #58a6ff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3fb950 0%, transparent 40%)" />
      <div class="relative z-20 h-full flex flex-col justify-center px-12 max-w-4xl">
        <div class="text-[9px] text-secondary uppercase tracking-[0.3em] font-bold mb-2">New Release</div>
        <h1 class="text-3xl font-black text-on-surface leading-tight">Build & Play<br/>Community Games</h1>
        <p class="text-[11px] text-on-surface-variant mt-3 max-w-md leading-relaxed">
          Discover games built with Nexus Engine. Play in your browser, no download required.
        </p>
        <div class="flex items-center space-x-3 mt-5">
          <RouterLink to="/catalog" class="bg-secondary text-surface text-[10px] font-bold uppercase tracking-widest px-5 py-2 hover:bg-secondary/80 transition-colors">
            Browse Games
          </RouterLink>
          <RouterLink to="/auth" class="border border-surface-highest text-[10px] text-on-surface-variant uppercase tracking-widest px-5 py-2 hover:bg-surface-container transition-colors">
            Become a Dev
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="px-8 py-6 border-b border-surface-highest">
      <div class="flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <button
          v-for="cat in CATEGORIES" :key="cat"
          @click="activeCategory = activeCategory === cat ? '' : cat"
          class="flex-none text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors"
          :class="activeCategory === cat
            ? 'bg-accent text-surface'
            : 'bg-surface-container text-on-surface-variant hover:bg-surface-highest'"
        >
          {{ cat }}
        </button>
      </div>
    </section>

    <!-- Game Grid -->
    <section class="px-8 py-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          {{ activeCategory || 'All Games' }}
          <span class="text-slate-600 ml-2">({{ store.filtered.length }})</span>
        </h2>
        <RouterLink to="/catalog" class="text-[9px] text-accent hover:text-accent/70 transition-colors">View All →</RouterLink>
      </div>
      <GameGrid :games="store.filtered" :loading="store.loading" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useGamesStore } from '../stores/gamesStore'
import GameGrid from '../components/GameGrid.vue'

const store = useGamesStore()
const activeCategory = ref('')

const CATEGORIES = ['Action', 'Puzzle', 'Adventure', 'Strategy', 'RPG', 'Platformer', 'Sandbox']

watch(activeCategory, (cat) => {
  store.category = cat
  store.fetchGames({ category: cat || undefined })
})

onMounted(() => store.fetchGames())
</script>
