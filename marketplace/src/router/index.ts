import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',          name: 'Home',      component: () => import('../views/Home.vue') },
    { path: '/catalog',   name: 'Catalog',   component: () => import('../views/Catalog.vue') },
    { path: '/game/:slug',name: 'GamePage',  component: () => import('../views/GamePage.vue') },
    { path: '/play/:slug',name: 'Player',    component: () => import('../views/Player.vue'), meta: { fullscreen: true } },
    { path: '/auth',      name: 'Auth',      component: () => import('../views/Auth.vue') },
    { path: '/dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true } },
    { path: '/profile',   name: 'Profile',   component: () => import('../views/Profile.vue'),  meta: { requiresAuth: true } },
    { path: '/admin',     name: 'Admin',     component: () => import('../views/Admin.vue'),    meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/users', name: 'AdminUsers', component: () => import('../views/Admin.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) return { name: 'Auth' }
  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') return { name: 'Home' }
})

export default router
