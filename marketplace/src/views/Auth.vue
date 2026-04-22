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
      <div v-if="error" class="mb-4 text-[10px] text-red-400 bg-red-400/10 px-3 py-2">
        {{ error }}
        <button v-if="showResend" @click="doResend" class="ml-2 underline font-bold hover:text-red-300">
          Resend email?
        </button>
      </div>
      <div v-if="info" class="mb-4 text-[10px] text-secondary bg-secondary/10 px-3 py-2">{{ info }}</div>

      <!-- Login form -->
      <form v-if="activeTab === 'login'" @submit.prevent="doLogin" class="space-y-3">
        <input v-model="loginData.email" type="email" placeholder="Email"
          class="field" required />
        <input v-model="loginData.password" type="password" placeholder="Password"
          class="field" required />
        <!-- hCaptcha container (shared ref, only one rendered at a time) -->
        <div v-show="hcaptchaSiteKey" ref="hcaptchaEl" class="min-h-[78px] mb-3" />
        <button type="submit" :disabled="loading || (Boolean(hcaptchaSiteKey) && !hcaptchaToken)" class="btn-submit">
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
        <!-- hCaptcha container (shared ref, only one rendered at a time) -->
        <div v-show="hcaptchaSiteKey" ref="hcaptchaEl" class="min-h-[78px] mb-3" />
        <button type="submit" :disabled="loading || (Boolean(hcaptchaSiteKey) && !hcaptchaToken)" class="btn-submit">
          {{ loading ? 'Creating account…' : 'Create Account' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)
const error = ref('')
const info = ref('')
const showResend = ref(false)
const hcaptchaToken = ref('')
const hcaptchaEl = ref<HTMLDivElement | null>(null)
// Force test key if .env is missing it, to verify rendering
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

const loginData = reactive({ email: '', password: '' })
const regData = reactive({ nom: '', prenom: '', email: '', password: '', birthday: '' })

async function doLogin() {
  if (hcaptchaSiteKey && !hcaptchaToken.value) {
    error.value = 'Please complete the hCaptcha'
    return
  }
  loading.value = true; error.value = ''; info.value = ''; showResend.value = false
  try {
    await auth.login(loginData.email, loginData.password, hcaptchaToken.value)
    const redirect = typeof router.currentRoute.value.query.redirect === 'string'
      ? router.currentRoute.value.query.redirect
      : '/'
    router.push(redirect)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Login failed'
    error.value = msg
    if (msg.toLowerCase().includes('confirm your email')) showResend.value = true
  } finally {
    loading.value = false
    resetHCaptcha()
  }
}

async function doResend() {
  if (!loginData.email) {
    error.value = 'Please enter your email address first'
    return
  }
  loading.value = true; error.value = ''; info.value = ''
  try {
    await auth.resendConfirmation(loginData.email, hcaptchaToken.value)
    info.value = 'A new confirmation email has been sent if the account exists.'
    showResend.value = false
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to resend confirmation'
  } finally {
    loading.value = false
    resetHCaptcha()
  }
}

async function doRegister() {
  if (hcaptchaSiteKey && !hcaptchaToken.value) {
    error.value = 'Please complete the hCaptcha'
    return
  }
  loading.value = true; error.value = ''; info.value = ''
  try {
    const res = await auth.register({ ...regData, hcaptchaToken: hcaptchaToken.value })
    info.value = res.message || 'Account created. Check your email to confirm registration.'
    activeTab.value = 'login'
    Object.assign(regData, { nom: '', prenom: '', email: '', password: '', birthday: '' })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Registration failed'
  } finally {
    loading.value = false
    resetHCaptcha()
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
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
  return hcaptchaScriptLoading
}

async function renderHCaptcha() {
  console.log('[hCaptcha] Attempting to render. SiteKey:', hcaptchaSiteKey)
  if (!hcaptchaSiteKey) {
    console.warn('[hCaptcha] No site key found. Check your .env file and restart Vite.')
    return
  }
  if (!hcaptchaEl.value) {
    console.warn('[hCaptcha] hcaptchaEl is not yet ready in the DOM.')
    return
  }
  if (hcaptchaWidgetId !== null) return

  try {
    await loadHCaptcha()
    if (!window.hcaptcha) {
      console.error('[hCaptcha] hcaptcha script loaded but window.hcaptcha is missing.')
      return
    }
    if (!hcaptchaEl.value) return

    console.log('[hCaptcha] Rendering widget...')
    hcaptchaWidgetId = window.hcaptcha.render(hcaptchaEl.value, {
      sitekey: hcaptchaSiteKey,
      callback: (token: string) => { hcaptchaToken.value = token },
      'expired-callback': () => { hcaptchaToken.value = '' },
      'error-callback': () => { hcaptchaToken.value = '' },
    })
    console.log('[hCaptcha] Widget rendered with ID:', hcaptchaWidgetId)
  } catch (err) {
    console.error('[hCaptcha] Load/Render error:', err)
    error.value = 'Unable to load hCaptcha'
  }
}

function resetHCaptcha() {
  hcaptchaToken.value = ''
  if (window.hcaptcha && hcaptchaWidgetId !== null) window.hcaptcha.reset(hcaptchaWidgetId)
}

watch(activeTab, async () => {
  error.value = ''
  hcaptchaToken.value = ''
  hcaptchaWidgetId = null
  await nextTick()
  renderHCaptcha()
})

onMounted(() => {
  renderHCaptcha()
})
</script>

<style scoped>
.field { @apply w-full bg-surface-highest text-[10px] text-on-surface px-3 py-2 border-none focus:ring-0 focus:outline-none placeholder-slate-600; }
.btn-submit { @apply w-full bg-accent text-surface text-[10px] font-bold uppercase tracking-widest py-2.5 hover:bg-accent/80 transition-colors disabled:opacity-50; }
</style>
