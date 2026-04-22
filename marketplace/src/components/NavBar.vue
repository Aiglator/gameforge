<template>
  <nav class="bg-surface-container border-b border-surface-highest px-6 py-3 flex items-center justify-between sticky top-0 z-50">
    <!-- Logo -->
    <RouterLink to="/" class="flex items-center space-x-2">
      <span class="text-[13px] font-black text-on-surface tracking-[0.2em] uppercase">GameForge</span>
      <span class="text-[9px] text-secondary font-bold uppercase tracking-widest border border-secondary px-1">Marketplace</span>
    </RouterLink>

    <!-- Nav links -->
    <div class="flex items-center space-x-6">
      <RouterLink to="/" class="nav-link">Accueil</RouterLink>
      <RouterLink to="/catalog" class="nav-link">Catalogue</RouterLink>
      <RouterLink v-if="auth.isLoggedIn" to="/dashboard" class="nav-link">Dashboard</RouterLink>
      <RouterLink v-if="auth.isLoggedIn" to="/engine" class="text-[10px] text-secondary border border-secondary/40 px-2 py-0.5 uppercase tracking-widest hover:bg-secondary/10 transition-colors flex items-center space-x-1">
        <span>⚡</span><span>Engine</span>
      </RouterLink>
      <RouterLink v-if="auth.user?.role === 'admin'" to="/admin" class="nav-link text-red-400 border border-red-400/40 px-2 py-0.5">🛡 Admin</RouterLink>
    </div>

    <!-- Auth section -->
    <div class="flex items-center space-x-3">
      <template v-if="auth.isLoggedIn">
        <RouterLink to="/profile" class="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors">
          {{ auth.user?.prenom }} {{ auth.user?.nom }}
        </RouterLink>
        <span v-if="auth.user?.role === 'developer'" class="text-[8px] text-secondary border border-secondary/40 px-1.5 py-0.5 uppercase tracking-wider">Dev</span>
        <button @click="auth.logout()" class="text-[10px] text-slate-600 hover:text-on-surface transition-colors">
          Déconnexion
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
