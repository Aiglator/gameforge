<template>
  <div class="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
    <div class="w-full max-w-sm bg-surface-container border border-surface-highest p-8">
      <!-- Tabs -->
      <div class="flex border-b border-surface-highest mb-6">
        <button
          v-for="tab in ['login', 'register']" :key="tab"
          @click="activeTab = tab"
          class="flex-1 py-2 text-[10px] uppercase tracking-widest transition-colors"
          :class="activeTab === tab ? 'text-accent border-b border-accent' : 'text-slate-600 hover:text-slate-400'"
        >{{ tab === 'login' ? 'Sign In' : 'Register' }}</button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 text-[10px] text-red-400 bg-red-400/10 px-3 py-2">{{ error }}</div>

      <!-- Login form -->
      <form v-if="activeTab === 'login'" @submit.prevent="doLogin" class="space-y-3">
        <input v-model="loginData.email" type="email" placeholder="Email"
          class="field" required />
        <input v-model="loginData.password" type="password" placeholder="Password"
          class="field" required />
        <button type="submit" :disabled="loading" class="btn-submit">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <!-- Register form -->
      <form v-else @submit.prevent="doRegister" class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <input v-model="regData.prenom" placeholder="First name" class="field" required />
          <input v-model="regData.nom" placeholder="Last name" class="field" required />
        </div>
        <input v-model="regData.email" type="email" placeholder="Email" class="field" required />
        <input v-model="regData.password" type="password" placeholder="Password (8+ chars)" class="field" required minlength="8" />
        <input v-model="regData.birthday" type="date" class="field" required />
        <button type="submit" :disabled="loading" class="btn-submit">
          {{ loading ? 'Creating account…' : 'Create Account' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)
const error = ref('')

const loginData = reactive({ email: '', password: '' })
const regData = reactive({ nom: '', prenom: '', email: '', password: '', birthday: '' })

async function doLogin() {
  loading.value = true; error.value = ''
  try {
    await auth.login(loginData.email, loginData.password)
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally { loading.value = false }
}

async function doRegister() {
  loading.value = true; error.value = ''
  try {
    await auth.register(regData)
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Registration failed'
  } finally { loading.value = false }
}
</script>

<style scoped>
.field { @apply w-full bg-surface-highest text-[10px] text-on-surface px-3 py-2 border-none focus:ring-0 focus:outline-none placeholder-slate-600; }
.btn-submit { @apply w-full bg-accent text-surface text-[10px] font-bold uppercase tracking-widest py-2.5 hover:bg-accent/80 transition-colors disabled:opacity-50; }
</style>
