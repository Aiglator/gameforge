<template>
  <nav class="bg-surface-container border-b border-surface-highest px-6 py-3 flex items-center justify-between sticky top-0 z-50">
    <!-- Logo -->
    <RouterLink to="/" class="flex items-center space-x-2">
      <span class="text-[13px] font-black text-on-surface tracking-[0.2em] uppercase">GameForge</span>
      <span class="text-[9px] text-secondary font-bold uppercase tracking-widest border border-secondary px-1">Marketplace</span>
    </RouterLink>

    <!-- Nav links -->
    <div class="flex items-center space-x-6">
      <RouterLink to="/" class="nav-link">Home</RouterLink>
      <RouterLink to="/catalog" class="nav-link">Catalog</RouterLink>
      <RouterLink v-if="auth.isLoggedIn" to="/dashboard" class="nav-link">Dashboard</RouterLink>
    </div>

    <!-- Auth section -->
    <div class="flex items-center space-x-3">
      <template v-if="auth.isLoggedIn">
        <RouterLink to="/profile" class="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors">
          {{ auth.user?.prenom }} {{ auth.user?.nom }}
        </RouterLink>
        <button @click="auth.logout()" class="text-[10px] text-slate-600 hover:text-on-surface transition-colors">
          Sign out
        </button>
      </template>
      <template v-else>
        <RouterLink to="/auth" class="btn-primary">Sign In</RouterLink>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
const auth = useAuthStore()
</script>

<style scoped>
.nav-link {
  @apply text-[10px] text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest;
}
.btn-primary {
  @apply bg-accent text-surface text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 hover:bg-accent/80 transition-colors;
}
</style>
