<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
    <h1 class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6">Profile</h1>
    <div class="bg-surface-container border border-surface-highest p-6 mb-6">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 bg-surface-highest flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant">person</span>
        </div>
        <div>
          <div class="text-[13px] font-bold text-on-surface">{{ auth.user?.prenom }} {{ auth.user?.nom }}</div>
          <div class="text-[10px] text-on-surface-variant">{{ auth.user?.email }}</div>
          <div class="text-[9px] text-secondary uppercase tracking-widest mt-0.5">{{ auth.user?.role }}</div>
        </div>
      </div>
    </div>
    <!-- Purchase History -->
    <div class="bg-surface-container border border-surface-highest">
      <div class="px-4 py-3 border-b border-surface-highest">
        <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Purchase History</span>
      </div>
      <div class="px-4 py-6 text-center text-[10px] text-slate-600">No purchases yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
const auth = useAuthStore()
</script>
