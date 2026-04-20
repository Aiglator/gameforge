import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

export interface Game {
  id: number
  name: string
  slug: string
  description: string
  category: string
  price: number
  player_count: number
  status: string
  thumbnail: string | null
  developer_id: number
  created_at: string
}

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([])
  const loading = ref(false)
  const search = ref('')
  const category = ref('')

  const filtered = computed(() => {
    let list = games.value
    if (category.value) list = list.filter(g => g.category === category.value)
    if (search.value) {
      const q = search.value.toLowerCase()
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q))
    }
    return list
  })

  async function fetchGames(params: { category?: string; q?: string; limit?: number } = {}) {
    loading.value = true
    try {
      const qs = new URLSearchParams()
      if (params.category) qs.set('category', params.category)
      if (params.q) qs.set('q', params.q)
      if (params.limit) qs.set('limit', String(params.limit))
      const res = await api.get<{ games: Game[] }>(`/games?${qs}`)
      games.value = res.games
    } finally {
      loading.value = false
    }
  }

  async function fetchGame(slug: string): Promise<Game | null> {
    try {
      const res = await api.get<{ game: Game }>(`/games/${slug}`)
      return res.game
    } catch {
      return null
    }
  }

  return { games, loading, search, category, filtered, fetchGames, fetchGame }
})
