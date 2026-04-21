<template>
  <!-- Full-screen overlay -->
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">

      <!-- Card -->
      <div class="w-[780px] max-w-[95vw] bg-surface border border-surface-highest" style="box-shadow: 0 0 60px rgba(0,0,0,0.8)">

        <!-- Header -->
        <div class="px-8 pt-8 pb-6 border-b border-surface-highest">
          <div class="flex items-center space-x-3 mb-2">
            <div class="text-[9px] text-secondary uppercase tracking-[0.3em] font-bold">Nexus Engine v2.0</div>
          </div>
          <h1 class="text-xl font-black text-on-surface tracking-tight">Quel type de jeu veux-tu créer ?</h1>
          <p class="text-[10px] text-on-surface-variant mt-1">Choisis un mode pour configurer l'éditeur et les outils disponibles.</p>
        </div>

        <!-- Choices -->
        <div class="grid grid-cols-3 gap-0 divide-x divide-surface-highest">

          <!-- 2D -->
          <button
            @click="select('2d')"
            class="group flex flex-col p-6 text-left transition-all hover:bg-surface-container focus:outline-none"
            :class="hovered === '2d' ? 'bg-surface-container' : ''"
            @mouseenter="hovered = '2d'"
            @mouseleave="hovered = null"
          >
            <!-- Icon / visual -->
            <div class="w-full aspect-video bg-surface-highest mb-4 relative overflow-hidden flex items-center justify-center">
              <!-- 2D grid pattern -->
              <svg width="100%" height="100%" class="absolute inset-0 opacity-20">
                <defs>
                  <pattern id="grid2d" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#3fb950" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid2d)"/>
              </svg>
              <!-- Demo sprites -->
              <div class="relative z-10 flex flex-col items-center space-y-1">
                <div class="flex space-x-2">
                  <div class="w-6 h-6 bg-secondary/80 border border-secondary" />
                  <div class="w-4 h-4 bg-accent/80 border border-accent mt-1" />
                  <div class="w-5 h-5 bg-primary/80 border border-primary" />
                </div>
                <div class="w-24 h-1.5 bg-surface-highest/80 mt-1" />
                <div class="flex space-x-1">
                  <div class="w-3 h-3 bg-secondary/60 border border-secondary/40" />
                  <div class="w-3 h-3 bg-secondary/60 border border-secondary/40" />
                  <div class="w-3 h-3 bg-secondary/60 border border-secondary/40" />
                </div>
              </div>
              <!-- Badge -->
              <div class="absolute top-2 right-2 text-[8px] text-secondary border border-secondary/40 px-1.5 py-0.5 uppercase tracking-widest bg-surface">
                Canvas 2D
              </div>
            </div>

            <div class="flex items-center space-x-2 mb-2">
              <span class="text-secondary text-lg font-black">2D</span>
              <div class="h-px flex-1 bg-surface-highest group-hover:bg-secondary/30 transition-colors" />
            </div>
            <div class="text-[11px] font-bold text-on-surface mb-2">Jeu Plat · Sprites · Physique 2D</div>
            <div class="text-[9px] text-on-surface-variant leading-relaxed mb-4">
              Caméra orthographique, éditeur de sprites, tilemaps, physique planaire.
              Idéal pour platformers, puzzle games, RPG top-down.
            </div>
            <div class="space-y-1 mt-auto">
              <div v-for="f in features2D" :key="f" class="flex items-center space-x-1.5">
                <span class="text-secondary text-[10px]">✓</span>
                <span class="text-[9px] text-on-surface-variant">{{ f }}</span>
              </div>
            </div>

            <!-- Select indicator -->
            <div class="mt-4 pt-3 border-t border-surface-highest group-hover:border-secondary/30 transition-colors">
              <div class="text-[9px] uppercase tracking-widest font-bold text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                <span>Choisir 2D</span>
                <span>→</span>
              </div>
            </div>
          </button>

          <!-- 2D/3D (recommended) -->
          <button
            @click="select('2d3d')"
            class="group flex flex-col p-6 text-left transition-all hover:bg-surface-container focus:outline-none relative"
            :class="hovered === '2d3d' ? 'bg-surface-container' : ''"
            @mouseenter="hovered = '2d3d'"
            @mouseleave="hovered = null"
          >
            <!-- Recommended badge -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px">
              <div class="text-[7px] bg-accent text-surface font-black uppercase tracking-widest px-3 py-0.5">Recommandé</div>
            </div>

            <!-- Icon / visual -->
            <div class="w-full aspect-video bg-surface-highest mb-4 relative overflow-hidden flex items-center justify-center">
              <svg width="100%" height="100%" class="absolute inset-0 opacity-10">
                <defs>
                  <pattern id="grid23d" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#58a6ff" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid23d)"/>
              </svg>
              <!-- Demo mixed scene -->
              <div class="relative z-10 flex items-end justify-center space-x-2 pb-2">
                <!-- 3D box drawn with perspective illusion -->
                <div class="relative w-10 h-10">
                  <div class="absolute inset-0 bg-accent/30 border border-accent/60 transform rotate-[15deg] skew-x-[-10deg]" />
                  <div class="absolute inset-0 bg-accent/50 border border-accent/80" style="transform: translate(3px, -3px)" />
                </div>
                <!-- 2D sprite -->
                <div class="w-6 h-8 bg-secondary/60 border border-secondary/80 mb-1" />
                <!-- ground -->
              </div>
              <div class="absolute bottom-2 left-4 right-4 h-0.5 bg-surface-highest/60" />
              <div class="absolute top-2 right-2 text-[8px] text-accent border border-accent/40 px-1.5 py-0.5 uppercase tracking-widest bg-surface">
                Three.js
              </div>
            </div>

            <div class="flex items-center space-x-2 mb-2">
              <span class="text-accent text-lg font-black">2D</span>
              <span class="text-on-surface-variant text-sm font-bold">/</span>
              <span class="text-accent text-lg font-black">3D</span>
              <div class="h-px flex-1 bg-surface-highest group-hover:bg-accent/30 transition-colors" />
            </div>
            <div class="text-[11px] font-bold text-on-surface mb-2">Hybride · Tous les outils</div>
            <div class="text-[9px] text-on-surface-variant leading-relaxed mb-4">
              Le meilleur des deux mondes. Sprites 2D dans une scène 3D, UI Canvas + Three.js.
              Accès complet à tous les outils de l'engine.
            </div>
            <div class="space-y-1 mt-auto">
              <div v-for="f in features2D3D" :key="f" class="flex items-center space-x-1.5">
                <span class="text-accent text-[10px]">✓</span>
                <span class="text-[9px] text-on-surface-variant">{{ f }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-surface-highest group-hover:border-accent/30 transition-colors">
              <div class="text-[9px] uppercase tracking-widest font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                <span>Choisir Hybride</span>
                <span>→</span>
              </div>
            </div>
          </button>

          <!-- 3D -->
          <button
            @click="select('3d')"
            class="group flex flex-col p-6 text-left transition-all hover:bg-surface-container focus:outline-none"
            :class="hovered === '3d' ? 'bg-surface-container' : ''"
            @mouseenter="hovered = '3d'"
            @mouseleave="hovered = null"
          >
            <!-- Icon / visual -->
            <div class="w-full aspect-video bg-surface-highest mb-4 relative overflow-hidden flex items-center justify-center">
              <!-- 3D perspective grid -->
              <svg width="100%" height="100%" class="absolute inset-0 opacity-20" viewBox="0 0 160 90">
                <!-- Perspective lines -->
                <line x1="80" y1="45" x2="0"   y2="90"  stroke="#a78bfa" stroke-width="0.5"/>
                <line x1="80" y1="45" x2="160" y2="90"  stroke="#a78bfa" stroke-width="0.5"/>
                <line x1="80" y1="45" x2="0"   y2="10"  stroke="#a78bfa" stroke-width="0.3"/>
                <line x1="80" y1="45" x2="160" y2="10"  stroke="#a78bfa" stroke-width="0.3"/>
                <line x1="0"  y1="50" x2="160" y2="50"  stroke="#a78bfa" stroke-width="0.3"/>
                <line x1="0"  y1="70" x2="160" y2="70"  stroke="#a78bfa" stroke-width="0.3"/>
              </svg>
              <!-- 3D cube isometric -->
              <div class="relative z-10">
                <div class="relative w-12 h-12">
                  <div class="absolute inset-0 bg-primary/40 border border-primary/60" style="transform: rotateX(45deg) rotateZ(45deg) scale(0.7)" />
                  <div class="absolute inset-0 bg-primary/60 border border-primary/80" style="transform: translate(4px, -4px) rotateX(30deg) scale(0.7)" />
                  <div class="absolute inset-0 bg-primary/20 border border-primary/40" style="transform: translate(8px, -1px) rotateY(30deg) scale(0.7)" />
                </div>
              </div>
              <div class="absolute top-2 right-2 text-[8px] text-primary border border-primary/40 px-1.5 py-0.5 uppercase tracking-widest bg-surface">
                WebGL
              </div>
            </div>

            <div class="flex items-center space-x-2 mb-2">
              <span class="text-primary text-lg font-black">3D</span>
              <div class="h-px flex-1 bg-surface-highest group-hover:bg-primary/30 transition-colors" />
            </div>
            <div class="text-[11px] font-bold text-on-surface mb-2">Full 3D · Terrain · Physique</div>
            <div class="text-[9px] text-on-surface-variant leading-relaxed mb-4">
              Scènes Three.js complètes, génération de terrain procédurale, physique 3D Cannon-es,
              skybox, post-processing et éclairage PBR.
            </div>
            <div class="space-y-1 mt-auto">
              <div v-for="f in features3D" :key="f" class="flex items-center space-x-1.5">
                <span class="text-primary text-[10px]">✓</span>
                <span class="text-[9px] text-on-surface-variant">{{ f }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-surface-highest group-hover:border-primary/30 transition-colors">
              <div class="text-[9px] uppercase tracking-widest font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                <span>Choisir 3D</span>
                <span>→</span>
              </div>
            </div>
          </button>

        </div>

        <!-- Footer -->
        <div class="px-8 py-4 border-t border-surface-highest flex items-center justify-between">
          <div class="text-[9px] text-slate-600">Tu pourras changer le mode dans les paramètres du projet.</div>
          <div class="flex items-center space-x-2 text-[9px] text-slate-600">
            <span>GameForge</span>
            <span>·</span>
            <span>Nexus Engine</span>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editorStore'

const store = useEditorStore()
const hovered = ref<string | null>(null)

const features2D = [
  'Caméra orthographique',
  'Éditeur de sprites & tilemaps',
  'Physique planaire (Box2D-like)',
  'Animations frame-by-frame',
  'Canvas 2D haute performance',
]

const features2D3D = [
  'Scènes 3D + UI Canvas 2D',
  'Sprites dans l\'espace 3D',
  'Physique 3D (Cannon-es)',
  'Terrain procédural & skybox',
  'Post-processing (Bloom, SSAO)',
]

const features3D = [
  'Three.js r168 + WebGL',
  'Génération de terrain procédurale',
  'Physique Cannon-es (Heightfield)',
  'Skybox & éclairage PBR',
  'Post-processing avancé',
]

function select(mode: '2d' | '2d3d' | '3d') {
  store.setProjectMode(mode)
}
</script>
