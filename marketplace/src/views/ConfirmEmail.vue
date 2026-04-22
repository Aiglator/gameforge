<template>
  <div class="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
    <div class="w-full max-w-sm bg-surface-container border border-surface-highest p-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">
        Email confirmation
      </div>
      <div v-if="loading" class="text-[10px] text-slate-500">Verification in progress...</div>
      <div v-else-if="error" class="text-[10px] text-red-400 bg-red-400/10 px-3 py-2">{{ error }}</div>
      <div v-else class="space-y-4">
        <div class="text-[10px] text-secondary bg-secondary/10 px-3 py-2">{{ message }}</div>
        <RouterLink to="/auth" class="btn-submit block text-center">Sign In</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const route = useRoute()
const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const message = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    error.value = 'Missing confirmation token'
    loading.value = false
    return
  }
  try {
    const res = await auth.confirmEmail(token)
    message.value = res.message || 'Email confirmed. You can sign in now.'
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Email confirmation failed'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.btn-submit { @apply w-full bg-accent text-surface text-[10px] font-bold uppercase tracking-widest py-2.5 hover:bg-accent/80 transition-colors; }
</style>
