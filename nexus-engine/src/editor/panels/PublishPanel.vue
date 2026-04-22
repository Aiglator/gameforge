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
        <input v-model="loginEmail" type="email" placeholder="you@slymfox.com"
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
      <div v-if="hcaptchaSiteKey" ref="hcaptchaEl" class="min-h-[78px] mt-1" />
      <button @click="doLogin" :disabled="loginLoading || (Boolean(hcaptchaSiteKey) && !hcaptchaToken)"
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
          <div>
            <label class="text-[9px] uppercase text-slate-600 tracking-widest">Thumbnail</label>
            <div class="mt-1 flex items-center space-x-3">
              <div class="w-16 h-12 bg-surface-high border border-surface-highest flex items-center justify-center overflow-hidden">
                <img v-if="newGame.thumbnail" :src="`http://localhost:3004/static/${newGame.thumbnail}`" class="w-full h-full object-cover" />
                <span v-else class="material-symbols-outlined text-slate-700 text-sm">image</span>
              </div>
              <button @click="triggerFileUpload" :disabled="uploading"
                class="px-3 py-1 bg-surface-highest text-[9px] uppercase font-bold tracking-widest hover:bg-surface-bright transition-colors"
              >
                {{ uploading ? 'Uploading...' : 'Choose File' }}
              </button>
              <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="handleThumbnailUpload" />
            </div>
          </div>
          <button @click="createGame" :disabled="publishLoading || uploading"
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useEditorStore } from '../stores/editorStore'

const store = useEditorStore()
const API = 'http://localhost:3004/api'

// ── hCaptcha logic ──────────────────────────────────────────
const hcaptchaToken = ref('')
const hcaptchaEl = ref<HTMLDivElement | null>(null)
const hcaptchaSiteKey = (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined) || '10000000-ffff-ffff-ffff-000000000001'
let hcaptchaWidgetId: string | number | null = null
let hcaptchaScriptLoading: Promise<void> | null = null

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string | number
      reset: (widgetId?: string | number) => void
    }
  }
}

function loadHCaptcha() {
  if (!hcaptchaSiteKey) return Promise.resolve()
  if (window.hcaptcha) return Promise.resolve()
  if (hcaptchaScriptLoading) return hcaptchaScriptLoading
  hcaptchaScriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src^="https://js.hcaptcha.com/1/api.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    script.async = true; script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
  return hcaptchaScriptLoading
}

async function renderHCaptcha() {
  if (!hcaptchaSiteKey || !hcaptchaEl.value || hcaptchaWidgetId !== null) return
  try {
    await loadHCaptcha()
    if (!window.hcaptcha || !hcaptchaEl.value) return
    hcaptchaWidgetId = window.hcaptcha.render(hcaptchaEl.value, {
      sitekey: hcaptchaSiteKey,
      callback: (token: string) => { hcaptchaToken.value = token },
      'expired-callback': () => { hcaptchaToken.value = '' },
      'error-callback': () => { hcaptchaToken.value = '' },
    })
  } catch {
    loginError.value = 'Unable to load hCaptcha'
  }
}

function resetHCaptcha() {
  hcaptchaToken.value = ''
  if (window.hcaptcha && hcaptchaWidgetId !== null) window.hcaptcha.reset(hcaptchaWidgetId)
}

// ── Auth state ──────────────────────────────────────────────
const isConnected  = computed(() => !!store.authToken && !!store.authUser)
const authUser     = computed(() => store.authUser)
const authToken    = computed(() => store.authToken)
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
const uploading    = ref(false)
const fileInput    = ref<HTMLInputElement | null>(null)

const newGame = ref({ name: '', slug: '', description: '', category: 'Action', price: 0, thumbnail: '' })

const CATEGORIES = ['Action', 'Adventure', 'Puzzle', 'Strategy', 'RPG', 'Platformer', 'Sandbox', 'Racing', 'Simulation', 'Other']

// Auto-generate slug from name
watch(() => newGame.value.name, (n) => {
  if (autoSlug.value) {
    newGame.value.slug = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleThumbnailUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploading.value = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    // Note: /projects/:gameId/assets but gameId isn't created yet.
    // However, the route doesn't actually use gameId for anything but the URL.
    // We'll use a placeholder 'new' as gameId.
    const res = await mktFetch('/projects/new/assets', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    })
    newGame.value.thumbnail = res.url.replace('/static/', '') // Store relative path
    store.addConsoleMessage('info', `[Marketplace] Thumbnail uploaded: ${res.name}`)
  } catch (err: unknown) {
    publishError.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

async function fetchMe() {
  if (!authToken.value) return
  try {
    const res = await mktFetch('/auth/me')
    store.setAuth(authToken.value, res.user)
    loadLinkedGame()
  } catch {
    store.setAuth(null, null)
  }
}

async function doLogin() {
  if (hcaptchaSiteKey && !hcaptchaToken.value) {
    loginError.value = 'Please complete the hCaptcha'
    return
  }
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await mktFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value,
        hcaptchaToken: hcaptchaToken.value
      }),
    })
    store.setAuth(res.token, res.user)
    loginPassword.value = ''
    store.addConsoleMessage('info', `[Marketplace] Logged in as ${res.user.email}`)
    loadLinkedGame()
  } catch (e: unknown) {
    loginError.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loginLoading.value = false
    resetHCaptcha()
  }
}

watch(isConnected, async (connected) => {
  if (!connected) {
    await nextTick()
    renderHCaptcha()
  }
})

onMounted(() => {
  if (isConnected.value) {
    loadLinkedGame()
  } else {
    fetchMe()
    renderHCaptcha()
  }
})

function disconnect() {
  store.setAuth(null, null)
  linkedGame.value = null
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
  const headers: Record<string, string> = { ...((opts.headers as Record<string, string>) || {}) }
  if (authToken.value) headers['Authorization'] = `Bearer ${authToken.value}`
  
  if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  
  // Use credentials: 'include' to allow sending the nexus_token cookie
  const res = await fetch(`${API}${path}`, { 
    ...opts, 
    headers,
    credentials: 'include' 
  })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}
</script>
