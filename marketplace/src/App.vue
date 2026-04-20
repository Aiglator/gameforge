<template>
  <div class="min-h-screen bg-surface text-on-surface font-mono">
    <NavBar v-if="!$route.meta.fullscreen" />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import NavBar from './components/NavBar.vue'
</script>
