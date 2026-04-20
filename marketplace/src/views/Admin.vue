<template>
  <div class="min-h-screen bg-bg flex flex-col">

    <!-- Top bar -->
    <nav class="bg-sc border-b border-sh h-[52px] flex items-center px-8 gap-8 shrink-0">
      <router-link to="/" class="font-black text-[15px] tracking-widest">
        <span class="text-secondary">Game</span><span class="text-primary">Forge</span>
      </router-link>
      <span class="text-[10px] tracking-widest uppercase text-err border border-err/40 px-2 py-1">🛡 Administration</span>
      <div class="flex-1" />
      <span class="text-[11px] text-onv">{{ authStore.user?.prenom }} {{ authStore.user?.nom }}</span>
      <router-link to="/dashboard" class="text-[10px] uppercase tracking-widest text-muted hover:text-on">← Retour</router-link>
    </nav>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidenav -->
      <aside class="w-[220px] bg-sc border-r border-sh flex flex-col shrink-0">
        <div class="px-3 py-3 text-[8px] font-bold tracking-[3px] text-muted uppercase">Administration</div>
        <nav class="flex-1">
          <button
            v-for="item in navItems" :key="item.id"
            @click="activeSection = item.id"
            class="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] transition-all relative"
            :class="activeSection === item.id
              ? 'text-err bg-err/8 font-bold border-l-2 border-err'
              : 'text-onv hover:text-on hover:bg-sh'"
          >
            <span class="text-base leading-none">{{ item.icon }}</span>
            {{ item.label }}
            <span v-if="item.badge" class="ml-auto text-[8px] bg-err/20 text-err px-1.5 py-0.5 rounded-none">{{ item.badge }}</span>
          </button>
        </nav>
        <div class="p-3 border-t border-sh">
          <router-link to="/" class="block text-[10px] text-muted hover:text-on text-center py-2">← Retour au site</router-link>
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-auto p-8">

        <!-- USERS SECTION -->
        <div v-if="activeSection === 'users'">
          <div class="flex items-end justify-between mb-6">
            <div>
              <h1 class="text-xl font-black text-on">Gestion des Utilisateurs</h1>
              <p class="text-[10px] text-muted mt-1">Administration · Tous les comptes inscrits sur GameForge</p>
            </div>
            <button @click="exportCSV" class="text-[9px] uppercase tracking-widest bg-secondary text-bg px-4 py-2 font-bold hover:opacity-90 transition-opacity">
              Exporter CSV
            </button>
          </div>

          <!-- Stat mini-cards -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div v-for="stat in userStats" :key="stat.label" class="bg-sc border border-sh p-4">
              <div class="text-[8px] font-bold tracking-[2px] uppercase mb-2" :class="stat.color">{{ stat.label }}</div>
              <div class="text-2xl font-black" :class="stat.color">{{ stat.value }}</div>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="bg-sc border border-sh flex items-center gap-3 px-4 h-12 mb-1">
            <input
              v-model="search"
              placeholder="🔍  Rechercher par nom, email, rôle..."
              class="bg-sh border-none outline-none text-[10px] text-on placeholder-muted px-3 py-1.5 w-[380px]"
              @input="fetchUsers"
            />
            <div class="flex gap-1 ml-4">
              <button
                v-for="f in filters" :key="f.value"
                @click="activeFilter = f.value; fetchUsers()"
                class="text-[9px] uppercase tracking-wider px-3 py-1 transition-all"
                :class="activeFilter === f.value ? 'bg-err/10 text-err font-bold border border-err/40' : 'bg-sh text-onv hover:text-on'"
              >{{ f.label }}</button>
            </div>
          </div>

          <!-- Table -->
          <div class="bg-sc border border-sh overflow-hidden">
            <div class="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_auto] bg-sh text-[8px] font-bold tracking-[2px] uppercase text-onv px-4 py-2 gap-4">
              <span>Utilisateur</span><span>Email</span><span>Rôle</span><span>Plan</span>
              <span>Inscrit</span><span>Jeux</span><span>Statut</span><span>Actions</span>
            </div>

            <div v-if="loading" class="py-12 text-center text-[10px] text-muted">Chargement...</div>
            <div v-else-if="users.length === 0" class="py-12 text-center text-[10px] text-muted">Aucun utilisateur trouvé</div>

            <div
              v-for="(user, i) in users" :key="user.id"
              class="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center px-4 py-2.5 gap-4 border-t border-sh text-[10px] transition-colors hover:bg-sh/50"
              :class="i % 2 === 0 ? '' : 'bg-bg/40'"
            >
              <!-- Avatar + Name -->
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  :style="{ background: getAvatarColor(user) + '33', border: '1px solid ' + getAvatarColor(user) }">
                  {{ (user.prenom?.[0] || '') + (user.nom?.[0] || '') }}
                </div>
                <div>
                  <div class="font-bold text-on">{{ user.prenom }} {{ user.nom }}</div>
                  <div class="text-[8px] text-muted">#{{ user.id }}</div>
                </div>
              </div>

              <!-- Email -->
              <span class="text-muted truncate text-[9px]">{{ user.email }}</span>

              <!-- Role -->
              <span class="text-[8px] font-bold px-2 py-0.5 inline-block"
                :class="user.role === 'admin' ? 'bg-err/10 text-err' : user.role === 'developer' ? 'bg-accent/10 text-accent' : 'bg-sh text-onv'">
                {{ user.role }}
              </span>

              <!-- Plan -->
              <span class="text-[8px] font-bold px-2 py-0.5 inline-block"
                :class="user.Developer?.plan === 'pro' ? 'bg-secondary/10 text-secondary' : 'bg-sh text-muted'">
                {{ user.Developer?.plan || 'user' }}
              </span>

              <!-- Date -->
              <span class="text-[9px] text-muted">{{ formatDate(user.created_at) }}</span>

              <!-- Games -->
              <span class="text-on font-bold">{{ user.game_count ?? '—' }}</span>

              <!-- Status -->
              <span class="text-[8px] font-bold px-2 py-0.5 inline-block"
                :class="user.is_banned ? 'bg-err/10 text-err' : 'bg-secondary/10 text-secondary'">
                {{ user.is_banned ? 'banni' : 'actif' }}
              </span>

              <!-- Actions -->
              <div class="flex gap-1.5">
                <button @click="openUserDetail(user)" class="text-[8px] px-2 py-1 bg-accent/10 text-accent hover:bg-accent/20 transition-colors">Voir</button>
                <button
                  v-if="!user.is_banned"
                  @click="banUser(user)"
                  class="text-[8px] px-2 py-1 bg-err/10 text-err hover:bg-err/20 transition-colors"
                >Bannir</button>
                <button
                  v-else
                  @click="unbanUser(user)"
                  class="text-[8px] px-2 py-1 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                >Réactiver</button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between mt-4 text-[9px] text-muted">
            <span>Affichage {{ offset + 1 }}–{{ Math.min(offset + users.length, total) }} de {{ total }} utilisateurs</span>
            <div class="flex gap-1">
              <button @click="prevPage" :disabled="offset === 0" class="px-3 py-1.5 bg-sh text-onv disabled:opacity-30 hover:text-on transition-colors">← Préc</button>
              <button @click="nextPage" :disabled="offset + limit >= total" class="px-3 py-1.5 bg-sh text-onv disabled:opacity-30 hover:text-on transition-colors">Suiv →</button>
            </div>
          </div>
        </div>

        <!-- STATS SECTION -->
        <div v-if="activeSection === 'stats'">
          <h1 class="text-xl font-black text-on mb-6">Vue d'ensemble</h1>
          <div class="grid grid-cols-4 gap-4 mb-8">
            <div class="bg-sc border border-sh p-5" v-for="s in globalStats" :key="s.label">
              <div class="text-[8px] font-bold tracking-[2px] uppercase text-muted mb-2">{{ s.label }}</div>
              <div class="text-3xl font-black" :class="s.color">{{ s.value }}</div>
              <div class="text-[9px] text-muted mt-1">{{ s.sub }}</div>
            </div>
          </div>
          <div class="bg-sc border border-sh p-6">
            <div class="text-[9px] font-bold tracking-[2px] uppercase text-onv mb-4">Comptes admin</div>
            <div class="text-[11px] text-onv">admin@gameforge.dev &nbsp;·&nbsp; <span class="text-secondary">Mot de passe : admin123456</span></div>
            <div class="text-[9px] text-muted mt-2">⚠️ Changer le mot de passe en production</div>
          </div>
        </div>

        <!-- GAMES SECTION -->
        <div v-if="activeSection === 'games'">
          <h1 class="text-xl font-black text-on mb-6">Modération des Jeux</h1>
          <div class="bg-sc border border-sh p-6 text-[11px] text-onv">
            Affiche tous les jeux publiés · Possibilité de retirer un jeu de la marketplace.
          </div>
        </div>

      </main>
    </div>

    <!-- User Detail Modal -->
    <div v-if="selectedUser" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-sc border border-sh w-[520px] max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between p-5 border-b border-sh">
          <h2 class="text-[13px] font-black text-on">{{ selectedUser.prenom }} {{ selectedUser.nom }}</h2>
          <button @click="selectedUser = null" class="text-muted hover:text-on text-xl leading-none">×</button>
        </div>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-3 text-[10px]">
            <div v-for="[k,v] in userDetailRows" :key="k" class="bg-sh p-3 border border-sh">
              <div class="text-[8px] font-bold tracking-widest uppercase text-muted mb-1">{{ k }}</div>
              <div class="text-on font-mono">{{ v }}</div>
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button
              v-if="!selectedUser.is_banned"
              @click="banUser(selectedUser); selectedUser = null"
              class="flex-1 bg-err/10 border border-err/30 text-err text-[9px] uppercase tracking-widest py-2 hover:bg-err/20 transition-colors font-bold"
            >Bannir l'utilisateur</button>
            <button
              v-else
              @click="unbanUser(selectedUser); selectedUser = null"
              class="flex-1 bg-secondary/10 border border-secondary/30 text-secondary text-[9px] uppercase tracking-widest py-2 hover:bg-secondary/20 transition-colors font-bold"
            >Réactiver</button>
            <button @click="selectedUser = null" class="flex-1 bg-sh text-onv text-[9px] uppercase tracking-widest py-2 hover:text-on transition-colors">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const API = 'http://localhost:3004/api'

const activeSection = ref('users')
const users = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const search = ref('')
const activeFilter = ref('all')
const offset = ref(0)
const limit = 15
const selectedUser = ref<any>(null)
const statsData = ref<any>(null)

const navItems = [
  { id: 'stats',    icon: '⊞', label: "Vue d'ensemble" },
  { id: 'users',    icon: '👥', label: 'Utilisateurs',  badge: null },
  { id: 'games',    icon: '🎮', label: 'Jeux' },
  { id: 'keys',     icon: '🔑', label: 'Clés API' },
  { id: 'moderate', icon: '⚠️', label: 'Modération' },
]

const filters = [
  { label: 'Tous',          value: 'all' },
  { label: 'Utilisateurs',  value: 'user' },
  { label: 'Développeurs',  value: 'developer' },
  { label: 'Pro',           value: 'pro' },
  { label: 'Bannis',        value: 'banned' },
]

const userStats = computed(() => [
  { label: 'Total', value: total.value, color: 'text-on' },
  { label: 'Développeurs', value: statsData.value?.developers?.total ?? '—', color: 'text-accent' },
  { label: 'Plan Pro', value: statsData.value?.developers?.pro ?? '—', color: 'text-secondary' },
  { label: 'Bannis', value: statsData.value?.users?.banned ?? '—', color: 'text-err' },
])

const globalStats = computed(() => [
  { label: 'Utilisateurs', value: statsData.value?.users?.total ?? '—', sub: `${statsData.value?.users?.banned ?? 0} bannis`, color: 'text-on' },
  { label: 'Jeux publiés', value: statsData.value?.games?.published ?? '—', sub: `${statsData.value?.games?.total ?? 0} au total`, color: 'text-secondary' },
  { label: 'Développeurs', value: statsData.value?.developers?.total ?? '—', sub: `${statsData.value?.developers?.pro ?? 0} pro`, color: 'text-accent' },
  { label: 'Revenus', value: statsData.value ? `$${statsData.value.purchases.revenue}` : '—', sub: `${statsData.value?.purchases?.total ?? 0} achats`, color: 'text-warn' },
])

const userDetailRows = computed(() => {
  if (!selectedUser.value) return []
  const u = selectedUser.value
  return [
    ['ID', `#${u.id}`],
    ['Email', u.email],
    ['Rôle', u.role],
    ['Plan', u.Developer?.plan ?? 'user'],
    ['Vérifié', u.is_verified ? '✓ Oui' : '✗ Non'],
    ['Banni', u.is_banned ? '⚠️ Oui' : 'Non'],
    ['Inscrit le', formatDate(u.created_at)],
    ['Jeux publiés', String(u.game_count ?? 0)],
  ]
})

async function fetchUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset.value) })
    if (search.value) params.set('q', search.value)
    if (activeFilter.value !== 'all') {
      if (activeFilter.value === 'banned')    params.set('status', 'banned')
      else if (activeFilter.value === 'pro')  params.set('plan', 'pro')
      else                                    params.set('role', activeFilter.value)
    }
    const res = await fetch(`${API}/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (!res.ok) throw new Error('Unauthorized')
    const data = await res.json()
    users.value = data.users
    total.value = data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    statsData.value = await res.json()
  } catch {}
}

async function banUser(user: any) {
  await fetch(`${API}/admin/users/${user.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_banned: true }),
  })
  await fetchUsers()
}

async function unbanUser(user: any) {
  await fetch(`${API}/admin/users/${user.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_banned: false }),
  })
  await fetchUsers()
}

function openUserDetail(user: any) {
  selectedUser.value = user
}

function prevPage() {
  if (offset.value > 0) { offset.value -= limit; fetchUsers() }
}
function nextPage() {
  if (offset.value + limit < total.value) { offset.value += limit; fetchUsers() }
}

function getAvatarColor(user: any): string {
  const colors = ['#3b82f6','#4edea3','#adc6ff','#f87171','#fbbf24','#a78bfa']
  return colors[user.id % colors.length]
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function exportCSV() {
  const rows = [['ID','Nom','Prénom','Email','Rôle','Plan','Inscrit','Banni']]
  users.value.forEach(u => {
    rows.push([u.id, u.nom, u.prenom, u.email, u.role, u.Developer?.plan ?? 'user', formatDate(u.created_at), u.is_banned ? 'oui' : 'non'])
  })
  const csv = rows.map(r => r.join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'gameforge-users.csv'
  a.click()
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchStats()])
})
</script>
