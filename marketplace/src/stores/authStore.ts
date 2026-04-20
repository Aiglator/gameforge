import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

interface User {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isDeveloper = computed(() => user.value?.role === 'developer' || user.value?.role === 'admin')

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
  }

  async function register(data: { nom: string; prenom: string; email: string; password: string; birthday: string }) {
    const res = await api.post<{ token: string; user: User }>('/auth/register', data)
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, isLoggedIn, isDeveloper, login, register, logout }
})
