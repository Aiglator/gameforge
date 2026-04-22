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

    <!-- Nexus Engine Banner -->
    <section class="px-8 py-5 border-b border-surface-highest bg-surface-container/40">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-8 h-8 bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary text-sm">⚡</div>
          <div>
            <div class="text-[10px] font-bold text-on-surface uppercase tracking-widest">Nexus Engine IDE</div>
            <div class="text-[9px] text-on-surface-variant mt-0.5">Crée tes propres jeux 2D/3D directement dans le navigateur et publie-les sur GameForge</div>
          </div>
        </div>
        <RouterLink v-if="auth.isLoggedIn" to="/engine"
          class="bg-secondary text-surface text-[9px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-secondary/80 transition-colors flex items-center space-x-2 whitespace-nowrap">
          <span>Ouvrir l'Engine</span>
          <span style="font-size:12px">→</span>
        </RouterLink>
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
import { useAuthStore } from '../stores/authStore'
import GameGrid from '../components/GameGrid.vue'

const store = useGamesStore()
const auth = useAuthStore()
const activeCategory = ref('')

const CATEGORIES = ['Action', 'Puzzle', 'Adventure', 'Strategy', 'RPG', 'Platformer', 'Sandbox']

watch(activeCategory, (cat) => {
  store.category = cat
  store.fetchGames({ category: cat || undefined })
})

onMounted(() => store.fetchGames())
</script>
