import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

interface User {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  is_verified: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isDeveloper = computed(() => user.value?.role === 'developer' || user.value?.role === 'admin')

  async function login(email: string, password: string, hcaptchaToken?: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password, hcaptchaToken })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
  }

  async function register(data: { nom: string; prenom: string; email: string; password: string; birthday: string; hcaptchaToken?: string }) {
    return api.post<{ message: string; user: User; devConfirmationToken?: string }>('/auth/register', data)
  }

  async function confirmEmail(tokenValue: string) {
    return api.post<{ message: string }>('/auth/confirm-email', { token: tokenValue })
  }

  async function resendConfirmation(email: string, hcaptchaToken?: string) {
    return api.post<{ message: string }>('/auth/resend-confirmation', { email, hcaptchaToken })
  }

  async function loadCurrentUser() {
    try {
      const res = await api.get<{ user: User; token?: string }>('/auth/me')
      user.value = res.user
      if (res.token) {
        token.value = res.token
        localStorage.setItem('token', res.token)
      }
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    isLoggedIn,
    isDeveloper,
    login,
    register,
    confirmEmail,
    resendConfirmation,
    loadCurrentUser,
    logout,
  }
})
