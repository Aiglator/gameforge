<template>
  <div class="flex min-h-screen">
    <!-- Sidebar filters -->
    <aside class="w-60 flex-none bg-surface-container border-r border-surface-highest p-4 space-y-5 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      <div>
        <div class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-2">Search</div>
        <input
          v-model="store.search"
          type="text"
          placeholder="Search games…"
          class="w-full bg-surface-highest text-[10px] text-on-surface px-2 py-1.5 border-none focus:ring-0 focus:outline-none placeholder-slate-600"
        />
      </div>
      <div>
        <div class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-2">Category</div>
        <div class="space-y-1">
          <button
            @click="store.category = ''"
            class="w-full text-left text-[10px] px-2 py-1 transition-colors"
            :class="!store.category ? 'text-accent' : 'text-on-surface-variant hover:text-on-surface'"
          >All</button>
          <button
            v-for="cat in CATEGORIES" :key="cat"
            @click="store.category = cat"
            class="w-full text-left text-[10px] px-2 py-1 transition-colors"
            :class="store.category === cat ? 'text-accent' : 'text-on-surface-variant hover:text-on-surface'"
          >{{ cat }}</button>
        </div>
      </div>
      <div>
        <div class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-2">Price</div>
        <div class="space-y-1">
          <label v-for="p in PRICES" :key="p.id" class="flex items-center space-x-2 cursor-pointer">
            <input type="radio" v-model="priceFilter" :value="p.id" class="accent-accent" />
            <span class="text-[10px] text-on-surface-variant">{{ p.label }}</span>
          </label>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Catalog <span class="text-slate-600 ml-2">({{ displayGames.length }})</span>
        </h1>
        <select v-model="sortBy" class="bg-surface-highest text-[10px] text-on-surface px-2 py-1 border-none focus:ring-0">
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
      <GameGrid :games="displayGames" :loading="store.loading" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGamesStore } from '../stores/gamesStore'
import GameGrid from '../components/GameGrid.vue'

const store = useGamesStore()
const priceFilter = ref('all')
const sortBy = ref('recent')

const CATEGORIES = ['Action', 'Puzzle', 'Adventure', 'Strategy', 'RPG', 'Platformer', 'Sandbox']
const PRICES = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
]

const displayGames = computed(() => {
  let list = [...store.filtered]
  if (priceFilter.value === 'free') list = list.filter(g => g.price === 0)
  if (priceFilter.value === 'paid') list = list.filter(g => g.price > 0)
  if (sortBy.value === 'popular') list.sort((a, b) => b.player_count - a.player_count)
  else if (sortBy.value === 'price_asc') list.sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price_desc') list.sort((a, b) => b.price - a.price)
  return list
})

onMounted(() => store.fetchGames())
</script>
