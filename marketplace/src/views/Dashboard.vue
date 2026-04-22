<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Developer Dashboard</h1>
      <RouterLink to="/engine"
        class="flex items-center space-x-2 bg-secondary/10 border border-secondary/30 text-secondary text-[9px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-secondary/20 transition-colors">
        <span>⚡</span>
        <span>Nouveau projet</span>
      </RouterLink>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-4 gap-3 mb-8">
      <div v-for="stat in stats" :key="stat.label" class="bg-surface-container border border-surface-highest p-4">
        <div class="text-[9px] text-slate-600 uppercase tracking-widest mb-1">{{ stat.label }}</div>
        <div class="text-xl font-black text-on-surface">{{ stat.value }}</div>
      </div>
    </div>

    <!-- My Games table -->
    <div class="bg-surface-container border border-surface-highest mb-8">
      <div class="px-4 py-3 border-b border-surface-highest flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Mes Jeux</span>
        <button @click="showUpload = !showUpload"
          class="bg-secondary text-surface text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-secondary/80 transition-colors">
          + Nouveau Jeu
        </button>
      </div>

      <!-- Create form -->
      <div v-if="showUpload" class="px-4 py-4 border-b border-surface-highest bg-surface space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <input v-model="newGame.name" placeholder="Nom du jeu" class="field" />
          <input v-model="newGame.slug" placeholder="Slug URL (ex: mon-jeu)" class="field" />
        </div>
        <textarea v-model="newGame.description" placeholder="Description" rows="2" class="field w-full" />
        <div class="grid grid-cols-2 gap-3">
          <select v-model="newGame.category" class="field">
            <option value="">Catégorie…</option>
            <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
          </select>
          <input v-model.number="newGame.price" type="number" min="0" step="0.01" placeholder="Prix (0 = gratuit)" class="field" />
        </div>
        <div v-if="createError" class="text-[9px] text-red-400 bg-red-400/10 px-3 py-2">{{ createError }}</div>
        <button @click="createGame" class="bg-accent text-surface text-[10px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-accent/80 transition-colors">
          Créer le jeu
        </button>
      </div>

      <!-- Games list -->
      <div v-if="myGames.length === 0 && !loading" class="px-4 py-8 text-center text-[10px] text-slate-600">
        Aucun jeu. Crée ton premier jeu ci-dessus.
      </div>
      <table v-else class="w-full">
        <thead><tr class="border-b border-surface-highest">
          <th v-for="h in ['Nom','Catégorie','Prix','Joueurs','Statut','Actions']" :key="h"
            class="px-4 py-2 text-left text-[9px] text-slate-600 uppercase tracking-widest font-normal">{{ h }}</th>
        </tr></thead>
        <tbody>
          <tr v-for="g in myGames" :key="g.id" class="border-b border-surface-highest/50 hover:bg-surface-highest/20">
            <td class="px-4 py-3 text-[10px] text-on-surface font-bold">{{ g.name }}</td>
            <td class="px-4 py-3 text-[10px] text-on-surface-variant">{{ g.category }}</td>
            <td class="px-4 py-3 text-[10px] text-on-surface-variant">{{ g.price === 0 ? 'Gratuit' : `$${g.price}` }}</td>
            <td class="px-4 py-3 text-[10px] text-on-surface-variant">{{ g.player_count }}</td>
            <td class="px-4 py-3">
              <span class="text-[9px] uppercase tracking-widest px-2 py-0.5"
                :class="g.status === 'published' ? 'bg-secondary/20 text-secondary' : 'bg-surface-highest text-slate-500'">
                {{ g.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <RouterLink :to="`/engine?gameId=${g.id}`"
                  class="text-[8px] px-2 py-1 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors uppercase tracking-widest">
                  Éditer
                </RouterLink>
                <button v-if="g.status !== 'published'" @click="publishGame(g)"
                  class="text-[8px] px-2 py-1 bg-accent/10 text-accent hover:bg-accent/20 transition-colors uppercase tracking-widest">
                  Publier
                </button>
                <button @click="deleteGame(g)"
                  class="text-[8px] px-2 py-1 bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors uppercase tracking-widest">
                  Suppr.
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- API Keys -->
    <div class="bg-surface-container border border-surface-highest">
      <div class="px-4 py-3 border-b border-surface-highest">
        <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Clé API</span>
      </div>
      <div class="px-4 py-4 space-y-3">
        <div v-if="apiKey" class="flex items-center space-x-3">
          <code class="text-[10px] font-mono text-secondary bg-surface px-3 py-2 flex-1 overflow-x-auto">{{ showKey ? apiKey : '•'.repeat(48) }}</code>
          <button @click="showKey = !showKey" class="text-[9px] text-on-surface-variant hover:text-on-surface transition-colors">
            {{ showKey ? 'Masquer' : 'Afficher' }}
          </button>
          <button @click="copyKey" class="text-[9px] text-on-surface-variant hover:text-on-surface transition-colors">Copier</button>
        </div>
        <div v-else-if="!apiKeyLoading" class="text-[10px] text-slate-600">Aucune clé API.</div>
        <div class="flex items-center gap-3">
          <button v-if="!apiKey" @click="generateKey"
            class="text-[9px] text-accent hover:text-accent/70 transition-colors uppercase tracking-widest">
            Générer une clé
          </button>
          <button v-else @click="confirmRegenerate"
            class="text-[9px] text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest">
            Régénérer (invalide l'ancienne)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../lib/api'

interface Game {
  id: number
  name: string
  slug: string
  description: string
  category: string
  price: number
  player_count: number
  status: string
}

const myGames = ref<Game[]>([])
const apiKey = ref('')
const showKey = ref(false)
const apiKeyLoading = ref(true)
const showUpload = ref(false)
const loading = ref(false)
const createError = ref('')

const CATEGORIES = ['Action', 'Puzzle', 'Adventure', 'Strategy', 'RPG', 'Platformer', 'Sandbox']
const newGame = ref({ name: '', slug: '', description: '', category: '', price: 0 })

const stats = computed(() => [
  { label: 'Total Jeux', value: String(myGames.value.length) },
  { label: 'Joueurs', value: String(myGames.value.reduce((s, g) => s + g.player_count, 0)) },
  { label: 'Publiés', value: String(myGames.value.filter(g => g.status === 'published').length) },
  { label: 'Brouillons', value: String(myGames.value.filter(g => g.status !== 'published').length) },
])

async function loadGames() {
  loading.value = true
  try {
    const res = await api.get<{ games: Game[] }>('/games/mine')
    myGames.value = res.games
  } catch { /* not authenticated */ }
  finally { loading.value = false }
}

async function loadKey() {
  apiKeyLoading.value = true
  try {
    const res = await api.get<{ api_key: string }>('/developer/keys')
    apiKey.value = res.api_key
  } catch { /* not a developer yet */ }
  finally { apiKeyLoading.value = false }
}

async function generateKey() {
  try {
    const res = await api.post<{ api_key: string }>('/developer/become', {})
    apiKey.value = (res as any).api_key
  } catch {}
}

async function confirmRegenerate() {
  if (!confirm('Régénérer la clé API ? L\'ancienne clé sera immédiatement invalidée.')) return
  try {
    const res = await api.post<{ api_key: string }>('/developer/keys/regenerate', {})
    apiKey.value = res.api_key
    showKey.value = true
  } catch {}
}

function copyKey() {
  navigator.clipboard.writeText(apiKey.value)
}

async function createGame() {
  createError.value = ''
  try {
    await api.post('/games', newGame.value)
    showUpload.value = false
    newGame.value = { name: '', slug: '', description: '', category: '', price: 0 }
    await loadGames()
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Erreur lors de la création'
  }
}

async function publishGame(game: Game) {
  try {
    await api.put(`/games/${game.id}/publish`, {})
    await loadGames()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Erreur')
  }
}

async function deleteGame(game: Game) {
  if (!confirm(`Supprimer "${game.name}" ? Cette action est irréversible.`)) return
  try {
    await api.delete(`/games/${game.id}`)
    await loadGames()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'Erreur')
  }
}

onMounted(async () => {
  await Promise.all([loadGames(), loadKey()])
})
</script>

<style scoped>
.field { @apply bg-surface-highest text-[10px] text-on-surface px-3 py-2 border-none focus:ring-0 focus:outline-none placeholder-slate-600 w-full; }
</style>
