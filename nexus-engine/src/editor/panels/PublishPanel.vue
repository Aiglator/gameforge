<template>
  <div class="flex flex-col h-full bg-surface-container-low overflow-y-auto no-scrollbar">

    <!-- Header -->
    <div class="px-3 pt-3 pb-2 border-b border-surface-highest">
      <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">GameForge Marketplace</div>
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-secondary' : 'bg-slate-700'" />
        <span class="text-[10px]" :class="isConnected ? 'text-secondary' : 'text-slate-500'">
          {{ isConnected ? `${authUser?.prenom} ${authUser?.nom}` : 'Not connected' }}
        </span>
      </div>
    </div>

    <!-- Login form (when not connected) -->
    <div v-if="!isConnected" class="px-3 pt-3 space-y-2">
      <div class="text-[9px] text-slate-500 mb-3">Log in to publish your game to the marketplace.</div>
      <div>
        <label class="text-[9px] uppercase text-slate-600 tracking-widest">Email</label>
        <input v-model="loginEmail" type="email" placeholder="you@gameforge.dev"
          class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent"
          @keydown.enter="doLogin"
        />
      </div>
      <div>
        <label class="text-[9px] uppercase text-slate-600 tracking-widest">Password</label>
        <input v-model="loginPassword" type="password" placeholder="••••••••"
          class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent"
          @keydown.enter="doLogin"
        />
      </div>
      <button @click="doLogin" :disabled="loginLoading"
        class="w-full py-2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors disabled:opacity-50 mt-1"
      >
        {{ loginLoading ? 'Connecting...' : 'Connect to Marketplace' }}
      </button>
      <p v-if="loginError" class="text-[10px] text-error mt-1">{{ loginError }}</p>
      <div class="text-[9px] text-slate-700 text-center mt-2">
        No account? Visit
        <a href="http://localhost:3002" target="_blank" class="text-accent hover:underline">localhost:3002</a>
      </div>
    </div>

    <!-- Connected state -->
    <template v-else>
      <div class="mx-3 border-t border-surface-highest my-2" />

      <!-- Game info -->
      <div class="px-3 pb-1">
        <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Game</div>

        <!-- Linked game -->
        <div v-if="linkedGame" class="bg-surface-high p-2 mb-2 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-on-surface font-bold">{{ linkedGame.name }}</span>
            <span class="text-[9px] px-1.5 py-0.5" :class="linkedGame.status === 'published' ? 'bg-secondary/20 text-secondary' : 'bg-surface-highest text-slate-500'">
              {{ linkedGame.status }}
            </span>
          </div>
          <div class="text-[9px] text-slate-500">{{ linkedGame.slug }}</div>
        </div>

        <!-- Create new game form -->
        <div v-if="!linkedGame" class="space-y-2">
          <div>
            <label class="text-[9px] uppercase text-slate-600 tracking-widest">Game Name</label>
            <input v-model="newGame.name" placeholder="My Awesome Game"
              class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="text-[9px] uppercase text-slate-600 tracking-widest">Slug</label>
            <input v-model="newGame.slug" placeholder="my-awesome-game"
              class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent"
              @input="autoSlug = false"
            />
          </div>
          <div>
            <label class="text-[9px] uppercase text-slate-600 tracking-widest">Description</label>
            <textarea v-model="newGame.description" rows="2" placeholder="Short game description..."
              class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent resize-none"
            />
          </div>
          <div>
            <label class="text-[9px] uppercase text-slate-600 tracking-widest">Category</label>
            <select v-model="newGame.category"
              class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent"
            >
              <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
            </select>
          </div>
          <div>
            <label class="text-[9px] uppercase text-slate-600 tracking-widest">Price ($)</label>
            <input v-model.number="newGame.price" type="number" min="0" step="0.99" placeholder="0"
              class="w-full mt-1 bg-surface-high border border-surface-highest text-[11px] text-on-surface px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>
          <button @click="createGame" :disabled="publishLoading"
            class="w-full py-2 bg-surface-highest text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-surface-bright transition-colors disabled:opacity-50"
          >
            {{ publishLoading ? 'Creating...' : 'Create Game Entry' }}
          </button>
          <p v-if="publishError" class="text-[10px] text-error">{{ publishError }}</p>
        </div>
      </div>

      <div v-if="linkedGame" class="mx-3 border-t border-surface-highest my-2" />

      <!-- Save scene -->
      <div v-if="linkedGame" class="px-3 pb-1">
        <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Scene</div>
        <div class="text-[9px] text-slate-500 mb-2">
          Save the current 3D scene to the game's cloud project. Overwrites previous save.
        </div>
        <button @click="saveScene" :disabled="saveLoading"
          class="w-full py-2 bg-surface-high text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-surface-highest transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <span class="material-symbols-outlined text-sm">cloud_upload</span>
          <span>{{ saveLoading ? 'Saving...' : 'Save Scene to Cloud' }}</span>
        </button>
        <div v-if="lastSaved" class="text-[9px] text-secondary mt-1 text-center">
          Saved {{ lastSaved }}
        </div>
      </div>

      <div v-if="linkedGame" class="mx-3 border-t border-surface-highest my-2" />

      <!-- Publish -->
      <div v-if="linkedGame" class="px-3 pb-3">
        <div class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Publish</div>
        <button @click="publishGame" :disabled="publishLoading || linkedGame.status === 'published'"
          class="w-full py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center space-x-2 disabled:opacity-40"
          :class="linkedGame.status === 'published'
            ? 'bg-secondary/10 text-secondary cursor-default'
            : 'bg-secondary text-surface hover:bg-secondary/80'"
        >
          <span class="material-symbols-outlined text-sm">rocket_launch</span>
          <span>{{ linkedGame.status === 'published' ? 'Live on Marketplace' : 'Publish to Marketplace' }}</span>
        </button>
        <div class="mt-2 text-center">
          <a :href="`http://localhost:3002/game/${linkedGame.slug}`" target="_blank"
             class="text-[9px] text-accent hover:underline">
            View on marketplace →
          </a>
        </div>
      </div>

      <div class="mx-3 border-t border-surface-highest my-2" />

      <!-- Disconnect -->
      <div class="px-3 pb-3">
        <button @click="disconnect"
          class="w-full py-1.5 text-[9px] text-slate-600 hover:text-error text-center transition-colors"
        >
          Disconnect account
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEditorStore } from '../stores/editorStore'

const store = useEditorStore()
const API = 'http://localhost:3004/api'

// ── Auth state ──────────────────────────────────────────────
const isConnected  = ref(false)
const authUser     = ref<{ id: number; nom: string; prenom: string; email: string; role: string } | null>(null)
const authToken    = ref<string | null>(localStorage.getItem('nexus_mkt_token'))
const loginEmail   = ref('')
const loginPassword = ref('')
const loginLoading = ref(false)
const loginError   = ref('')

// ── Game state ──────────────────────────────────────────────
const linkedGame   = ref<{ id: number; name: string; slug: string; status: string } | null>(null)
const publishLoading = ref(false)
const publishError = ref('')
const saveLoading  = ref(false)
const lastSaved    = ref('')
const autoSlug     = ref(true)

const newGame = ref({ name: '', slug: '', description: '', category: 'Action', price: 0 })

const CATEGORIES = ['Action', 'Adventure', 'Puzzle', 'Strategy', 'RPG', 'Platformer', 'Sandbox', 'Racing', 'Simulation', 'Other']

// Auto-generate slug from name
watch(() => newGame.value.name, (n) => {
  if (autoSlug.value) {
    newGame.value.slug = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

// Restore session on mount
if (authToken.value) {
  fetchMe()
}

async function fetchMe() {
  try {
    const res = await mktFetch('/auth/me')
    authUser.value = res.user
    isConnected.value = true
    loadLinkedGame()
  } catch {
    authToken.value = null
    localStorage.removeItem('nexus_mkt_token')
  }
}

async function doLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await mktFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value }),
    })
    authToken.value = res.token
    authUser.value = res.user
    localStorage.setItem('nexus_mkt_token', res.token)
    isConnected.value = true
    loginPassword.value = ''
    store.addConsoleMessage('info', `[Marketplace] Logged in as ${res.user.email}`)
    loadLinkedGame()
  } catch (e: unknown) {
    loginError.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loginLoading.value = false
  }
}

function disconnect() {
  isConnected.value = false
  authUser.value = null
  authToken.value = null
  linkedGame.value = null
  localStorage.removeItem('nexus_mkt_token')
  store.addConsoleMessage('info', '[Marketplace] Disconnected')
}

// ── Game ────────────────────────────────────────────────────
function loadLinkedGame() {
  const saved = localStorage.getItem('nexus_linked_game')
  if (saved) {
    try { linkedGame.value = JSON.parse(saved) } catch { /* ignore */ }
  }
}

async function createGame() {
  publishError.value = ''
  if (!newGame.value.name || !newGame.value.slug) {
    publishError.value = 'Name and slug are required'
    return
  }
  publishLoading.value = true
  try {
    const res = await mktFetch('/games', {
      method: 'POST',
      body: JSON.stringify(newGame.value),
    })
    linkedGame.value = { id: res.game.id, name: res.game.name, slug: res.game.slug, status: res.game.status }
    localStorage.setItem('nexus_linked_game', JSON.stringify(linkedGame.value))
    store.addConsoleMessage('info', `[Marketplace] Game created: ${res.game.name}`)
  } catch (e: unknown) {
    publishError.value = e instanceof Error ? e.message : 'Could not create game'
  } finally {
    publishLoading.value = false
  }
}

async function saveScene() {
  if (!store.engine || !linkedGame.value) return
  saveLoading.value = true
  try {
    const sceneData = store.engine.saveScene()
    await mktFetch(`/projects/${linkedGame.value.id}/save`, {
      method: 'POST',
      body: JSON.stringify({ scene: sceneData }),
    })
    // Also persist locally
    localStorage.setItem('nexus-scene', JSON.stringify(sceneData))
    const now = new Date()
    lastSaved.value = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    store.addConsoleMessage('info', '[Marketplace] Scene saved to cloud')
  } catch (e: unknown) {
    store.addConsoleMessage('error', `[Marketplace] Save failed: ${e instanceof Error ? e.message : 'unknown error'}`)
  } finally {
    saveLoading.value = false
  }
}

async function publishGame() {
  if (!linkedGame.value) return
  publishLoading.value = true
  try {
    const res = await mktFetch(`/games/${linkedGame.value.id}/publish`, { method: 'PUT' })
    linkedGame.value = { ...linkedGame.value, status: res.game.status }
    localStorage.setItem('nexus_linked_game', JSON.stringify(linkedGame.value))
    store.addConsoleMessage('info', `[Marketplace] Game published! Visit localhost:3002/game/${linkedGame.value.slug}`)
  } catch (e: unknown) {
    store.addConsoleMessage('error', `[Marketplace] Publish failed: ${e instanceof Error ? e.message : 'unknown error'}`)
  } finally {
    publishLoading.value = false
  }
}

// ── HTTP helper ─────────────────────────────────────────────
async function mktFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken.value) headers['Authorization'] = `Bearer ${authToken.value}`
  const res = await fetch(`${API}${path}`, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}
</script>
