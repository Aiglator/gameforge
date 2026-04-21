<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Developer Dashboard</h1>
      <!-- Open Engine CTA -->
      <RouterLink to="/engine"
        class="flex items-center space-x-2 bg-secondary/10 border border-secondary/30 text-secondary text-[9px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-secondary/20 transition-colors">
        <span>⚡</span>
        <span>Ouvrir Nexus Engine</span>
      </RouterLink>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-4 gap-3 mb-8">
      <div v-for="stat in STATS" :key="stat.label" class="bg-surface-container border border-surface-highest p-4">
        <div class="text-[9px] text-slate-600 uppercase tracking-widest mb-1">{{ stat.label }}</div>
        <div class="text-xl font-black text-on-surface">{{ stat.value }}</div>
      </div>
    </div>

    <!-- My Games table -->
    <div class="bg-surface-container border border-surface-highest mb-8">
      <div class="px-4 py-3 border-b border-surface-highest flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">My Games</span>
        <button @click="showUpload = !showUpload"
          class="bg-secondary text-surface text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-secondary/80 transition-colors">
          + New Game
        </button>
      </div>
      <!-- Upload form -->
      <div v-if="showUpload" class="px-4 py-4 border-b border-surface-highest bg-surface space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <input v-model="newGame.name" placeholder="Game name" class="field" />
          <input v-model="newGame.slug" placeholder="URL slug (e.g. my-game)" class="field" />
        </div>
        <textarea v-model="newGame.description" placeholder="Description" rows="2" class="field w-full" />
        <div class="grid grid-cols-2 gap-3">
          <select v-model="newGame.category" class="field">
            <option value="">Select category…</option>
            <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
          </select>
          <input v-model.number="newGame.price" type="number" min="0" step="0.01" placeholder="Price (0 = free)" class="field" />
        </div>
        <button @click="createGame" class="bg-accent text-surface text-[10px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-accent/80 transition-colors">
          Create Game
        </button>
      </div>
      <!-- Games list -->
      <div v-if="myGames.length === 0" class="px-4 py-8 text-center text-[10px] text-slate-600">
        No games yet. Create your first game above.
      </div>
      <table v-else class="w-full">
        <thead><tr class="border-b border-surface-highest">
          <th v-for="h in ['Name','Category','Price','Players','Status']" :key="h"
            class="px-4 py-2 text-left text-[9px] text-slate-600 uppercase tracking-widest font-normal">{{ h }}</th>
        </tr></thead>
        <tbody>
          <tr v-for="g in myGames" :key="g.id" class="border-b border-surface-highest/50 hover:bg-surface-highest/20">
            <td class="px-4 py-3 text-[10px] text-on-surface font-bold">{{ g.name }}</td>
            <td class="px-4 py-3 text-[10px] text-on-surface-variant">{{ g.category }}</td>
            <td class="px-4 py-3 text-[10px] text-on-surface-variant">{{ g.price === 0 ? 'Free' : `$${g.price}` }}</td>
            <td class="px-4 py-3 text-[10px] text-on-surface-variant">{{ g.player_count }}</td>
            <td class="px-4 py-3">
              <span class="text-[9px] uppercase tracking-widest px-2 py-0.5"
                :class="g.status === 'published' ? 'bg-secondary/20 text-secondary' : 'bg-surface-highest text-slate-500'">
                {{ g.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- API Keys -->
    <div class="bg-surface-container border border-surface-highest">
      <div class="px-4 py-3 border-b border-surface-highest">
        <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">API Keys</span>
      </div>
      <div class="px-4 py-4 space-y-2">
        <div v-if="apiKey" class="flex items-center space-x-3">
          <code class="text-[10px] font-mono text-secondary bg-surface px-3 py-2 flex-1 overflow-x-auto">{{ apiKey }}</code>
          <button @click="copyKey" class="text-[9px] text-on-surface-variant hover:text-on-surface transition-colors">Copy</button>
        </div>
        <div v-else class="text-[10px] text-slate-600">No API key yet.</div>
        <button @click="loadKeys" class="text-[9px] text-accent hover:text-accent/70 transition-colors">
          {{ apiKey ? 'Regenerate Key' : 'Generate Key' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { api } from '../lib/api'
import { useGamesStore, type Game } from '../stores/gamesStore'

const store = useGamesStore()
const myGames = ref<Game[]>([])
const apiKey = ref('')
const showUpload = ref(false)

const CATEGORIES = ['Action', 'Puzzle', 'Adventure', 'Strategy', 'RPG', 'Platformer', 'Sandbox']

const STATS = reactive([
  { label: 'Total Games', value: '0' },
  { label: 'Total Players', value: '0' },
  { label: 'Revenue', value: '$0' },
  { label: 'API Calls', value: '0' },
])

const newGame = reactive({ name: '', slug: '', description: '', category: '', price: 0 })

async function loadGames() {
  try {
    const res = await api.get<{ games: Game[] }>('/games')
    myGames.value = res.games
    STATS[0].value = String(res.games.length)
    STATS[1].value = String(res.games.reduce((s, g) => s + g.player_count, 0))
  } catch { /* not yet authenticated or no games */ }
}

async function loadKeys() {
  try {
    const res = await api.post<{ api_key: string }>('/developer/keys/regenerate', {})
    apiKey.value = res.api_key
  } catch {
    try {
      const res = await api.get<{ api_key: string }>('/developer/keys')
      apiKey.value = res.api_key
    } catch { /* not a developer yet */ }
  }
}

async function createGame() {
  try {
    await api.post('/games', newGame)
    showUpload.value = false
    Object.assign(newGame, { name: '', slug: '', description: '', category: '', price: 0 })
    await loadGames()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Failed to create game')
  }
}

function copyKey() {
  navigator.clipboard.writeText(apiKey.value)
}

onMounted(loadGames)
</script>

<style scoped>
.field { @apply bg-surface-highest text-[10px] text-on-surface px-3 py-2 border-none focus:ring-0 focus:outline-none placeholder-slate-600; }
</style>
