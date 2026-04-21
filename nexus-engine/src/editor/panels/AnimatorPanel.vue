<template>
  <div class="flex flex-col h-full bg-surface-container-low w-[300px] flex-none border-r border-surface-highest overflow-hidden">

    <!-- ═══ HEADER ══════════════════════════════════════════════ -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-surface-highest bg-surface-container flex-none">
      <span class="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Animator 2D</span>
      <div class="flex items-center space-x-1">
        <!-- Mode badge -->
        <span class="text-[7px] uppercase tracking-widest px-1.5 py-0.5 border"
          :class="store.projectMode === '2d' ? 'border-secondary/40 text-secondary' : store.projectMode === '3d' ? 'border-primary/40 text-primary' : 'border-accent/40 text-accent'">
          {{ store.projectMode ?? '2D/3D' }}
        </span>
      </div>
    </div>

    <!-- Pas d'entité sélectionnée -->
    <div v-if="!hasSprite" class="flex-1 flex flex-col items-center justify-center text-center px-6 space-y-3">
      <span class="material-symbols-outlined text-slate-700" style="font-size:40px">animation</span>
      <div class="text-[10px] text-slate-600 leading-relaxed">
        Sélectionne une entité avec un composant <strong class="text-emerald-600">Sprite</strong> et <strong class="text-purple-400">Animator</strong> dans la scène.
      </div>
      <button @click="addAnimatorToSelected"
        v-if="hasEntity && !hasAnimator"
        class="text-[9px] bg-secondary/10 text-secondary border border-secondary/30 px-3 py-1.5 uppercase tracking-widest hover:bg-secondary/20 transition-colors">
        + Ajouter Animator
      </button>
    </div>

    <!-- Panel principal -->
    <template v-else>

      <!-- ═══ ZONE 1 : Clips ══════════════════════════════════ -->
      <div class="flex-none border-b border-surface-highest">
        <div class="flex items-center justify-between px-3 py-1.5">
          <span class="text-[8px] font-bold uppercase tracking-widest text-slate-600">Clips</span>
          <button @click="addClip" class="text-[9px] text-accent hover:text-accent/70 transition-colors">+ Clip</button>
        </div>
        <!-- Clip list (max 4 visibles, scrollable) -->
        <div class="overflow-y-auto" style="max-height: 120px">
          <div v-for="clip in clips" :key="clip.id"
            @click="selectClip(clip.id)"
            class="flex items-center px-3 py-1.5 cursor-pointer transition-colors group"
            :class="selectedClipId === clip.id ? 'bg-surface-highest' : 'hover:bg-surface-container'">
            <!-- Play/stop preview -->
            <button @click.stop="togglePreview(clip.id)"
              class="mr-2 transition-colors"
              :class="previewClipId === clip.id ? 'text-secondary' : 'text-slate-600 hover:text-slate-400'">
              <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">
                {{ previewClipId === clip.id ? 'stop_circle' : 'play_circle' }}
              </span>
            </button>
            <!-- Clip name (editable on double-click) -->
            <input v-if="editingClipId === clip.id"
              :value="clip.name"
              @blur="e => { renameClip(clip.id, (e.target as HTMLInputElement).value); editingClipId = null }"
              @keydown.enter="e => { renameClip(clip.id, (e.target as HTMLInputElement).value); editingClipId = null }"
              class="bg-surface text-[10px] text-on-surface flex-1 border-none focus:outline-none px-1"
              v-focus
            />
            <span v-else @dblclick="editingClipId = clip.id"
              class="text-[10px] flex-1 truncate"
              :class="selectedClipId === clip.id ? 'text-on-surface font-bold' : 'text-on-surface-variant'">
              {{ clip.name }}
            </span>
            <!-- fps badge -->
            <span class="text-[8px] text-slate-600 font-mono mr-2">{{ clip.fps }}fps</span>
            <!-- Frame count -->
            <span class="text-[8px] text-slate-700 font-mono mr-2">{{ clip.frames.length }}f</span>
            <!-- Loop icon -->
            <span class="material-symbols-outlined text-xs" :class="clip.loop ? 'text-accent/60' : 'text-slate-800'">
              {{ clip.loop ? 'repeat' : 'trending_flat' }}
            </span>
            <!-- Delete -->
            <button @click.stop="deleteClip(clip.id)"
              class="ml-1 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
              <span class="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
          <div v-if="clips.length === 0" class="px-3 py-2 text-[9px] text-slate-700 italic">
            Aucun clip. Clique sur + Clip.
          </div>
        </div>
      </div>

      <!-- ═══ ZONE 2 : Propriétés du clip sélectionné + Timeline ══ -->
      <div v-if="selectedClip" class="flex-1 flex flex-col overflow-hidden">

        <!-- Clip settings row -->
        <div class="flex items-center space-x-2 px-3 py-1.5 border-b border-surface-highest flex-none">
          <!-- FPS -->
          <div class="flex items-center space-x-1">
            <span class="text-[8px] text-slate-600 uppercase">FPS</span>
            <input type="number" min="1" max="60" :value="selectedClip.fps"
              @change="e => updateClipProp('fps', parseInt((e.target as HTMLInputElement).value) || 12)"
              class="bg-surface-highest text-[9px] font-mono text-on-surface w-10 text-center border-none focus:outline-none px-1 py-0.5" />
          </div>
          <!-- Loop toggle -->
          <button @click="updateClipProp('loop', !selectedClip.loop)"
            class="flex items-center space-x-0.5 px-1.5 py-0.5 text-[8px] uppercase tracking-widest transition-colors"
            :class="selectedClip.loop ? 'bg-accent/10 text-accent border border-accent/30' : 'text-slate-600 hover:text-slate-400'">
            <span class="material-symbols-outlined text-xs">repeat</span>
            <span>Loop</span>
          </button>
          <!-- PingPong toggle -->
          <button @click="updateClipProp('pingPong', !selectedClip.pingPong)"
            class="flex items-center space-x-0.5 px-1.5 py-0.5 text-[8px] uppercase tracking-widest transition-colors"
            :class="selectedClip.pingPong ? 'bg-secondary/10 text-secondary border border-secondary/30' : 'text-slate-600 hover:text-slate-400'">
            <span class="material-symbols-outlined text-xs">swap_horiz</span>
            <span>Ping</span>
          </button>
          <!-- Clear frames -->
          <button @click="clearFrames" class="ml-auto text-[8px] text-slate-700 hover:text-red-400 transition-colors">
            <span class="material-symbols-outlined text-xs">delete_sweep</span>
          </button>
        </div>

        <!-- Spritesheet picker (grid) + Frame timeline -->
        <div class="flex flex-col flex-1 overflow-hidden">

          <!-- Spritesheet grid -->
          <div class="flex-none border-b border-surface-highest">
            <div class="flex items-center justify-between px-3 py-1">
              <span class="text-[8px] text-slate-600 uppercase tracking-widest">Spritesheet · Clic = ajouter frame</span>
              <span class="text-[8px] font-mono text-slate-700">{{ sheetCols }}×{{ sheetRows }}</span>
            </div>
            <!-- Grid of cells (max height 130px, scrollable) -->
            <div class="overflow-auto px-3 pb-2" style="max-height:130px">
              <div v-if="!spriteTexUrl" class="text-[9px] text-slate-700 italic py-2">
                Configure une texture dans le composant Sprite d'abord.
              </div>
              <div v-else
                :style="{ display: 'grid', gridTemplateColumns: `repeat(${sheetCols}, ${cellSize}px)`, gap: '1px' }">
                <button
                  v-for="i in sheetCols * sheetRows" :key="i-1"
                  @click="addFrame(i-1)"
                  class="relative overflow-hidden border transition-all hover:border-accent"
                  :class="frameExistsInClip(i-1) ? 'border-secondary/60 bg-secondary/5' : 'border-surface-highest'"
                  :style="{ width: cellSize + 'px', height: cellSize + 'px' }"
                  :title="`Frame ${i-1}`"
                >
                  <!-- Sprite cell preview via background-position -->
                  <div class="absolute inset-0" :style="cellBgStyle(i-1)" />
                  <!-- Index label -->
                  <span class="absolute bottom-0 right-0 text-[6px] font-mono bg-black/60 text-white px-0.5 leading-tight">{{ i-1 }}</span>
                  <!-- Checkmark if in clip -->
                  <span v-if="frameExistsInClip(i-1)"
                    class="absolute top-0 left-0 material-symbols-outlined text-secondary bg-black/40 leading-none"
                    style="font-size:9px">check</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Timeline — frames dans l'ordre du clip -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-3 py-1 flex-none">
              <span class="text-[8px] text-slate-600 uppercase tracking-widest">Timeline</span>
              <span class="text-[8px] text-slate-700 font-mono">{{ selectedClip.frames.length }} frames</span>
            </div>
            <div class="flex-1 overflow-x-auto overflow-y-hidden px-3 pb-2">
              <div class="flex space-x-0.5 items-end h-full" style="min-height:44px">
                <!-- Playhead indicator -->
                <div v-if="previewClipId === selectedClipId" class="relative">
                  <div class="absolute top-0 w-px bg-secondary h-full z-10"
                    :style="{ left: (currentPreviewFrame * (cellSize + 1)) + 'px' }" />
                </div>
                <!-- Frame cells in order -->
                <div
                  v-for="(frame, fi) in selectedClip.frames" :key="fi"
                  class="relative group flex-none cursor-pointer border transition-all"
                  :class="[
                    previewClipId === selectedClipId && currentPreviewFrame === fi
                      ? 'border-secondary bg-secondary/10'
                      : 'border-surface-highest hover:border-slate-500'
                  ]"
                  :style="{ width: cellSize + 'px', height: cellSize + 'px' }"
                  @click="removeFrameAt(fi)"
                  :title="`Frame ${frame.frameIndex} (clic = supprimer)`"
                >
                  <!-- Mini sprite preview -->
                  <div class="absolute inset-0" :style="cellBgStyle(frame.frameIndex)" />
                  <!-- Index label -->
                  <span class="absolute bottom-0 left-0 text-[6px] font-mono bg-black/60 text-white px-0.5 leading-tight">{{ frame.frameIndex }}</span>
                  <!-- Frame position -->
                  <span class="absolute top-0 right-0 text-[6px] text-slate-600 px-0.5 leading-tight">{{ fi }}</span>
                  <!-- Delete on hover -->
                  <div class="absolute inset-0 bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="material-symbols-outlined text-red-300" style="font-size:12px">close</span>
                  </div>
                </div>
                <!-- Empty placeholder -->
                <div v-if="selectedClip.frames.length === 0"
                  class="text-[9px] text-slate-700 italic self-center px-2">
                  Clique sur les cellules du spritesheet ci-dessus pour ajouter des frames.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ═══ ZONE 3 : Transitions (machine à états) ══════════ -->
      <div class="flex-none border-t border-surface-highest bg-surface-container">
        <div class="flex items-center justify-between px-3 py-1.5">
          <span class="text-[8px] font-bold uppercase tracking-widest text-slate-600">Transitions</span>
          <button @click="addTransition" class="text-[9px] text-accent hover:text-accent/70">+ Trans</button>
        </div>
        <div class="overflow-y-auto" style="max-height:100px">
          <div v-for="(tr, ti) in transitions" :key="tr.id"
            class="flex items-center px-3 py-1 space-x-1 hover:bg-surface-container group">
            <!-- From -->
            <select :value="tr.from" @change="e => updateTransition(ti, 'from', (e.target as HTMLSelectElement).value)"
              class="bg-surface-highest text-[8px] text-on-surface-variant border-none focus:outline-none px-1 py-0.5 flex-1 min-w-0 truncate">
              <option value="*">* Any</option>
              <option v-for="c in clips" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <span class="material-symbols-outlined text-slate-700 text-xs">arrow_forward</span>
            <!-- To -->
            <select :value="tr.to" @change="e => updateTransition(ti, 'to', (e.target as HTMLSelectElement).value)"
              class="bg-surface-highest text-[8px] text-on-surface-variant border-none focus:outline-none px-1 py-0.5 flex-1 min-w-0 truncate">
              <option v-for="c in clips" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <!-- Condition -->
            <input :value="tr.condition"
              @change="e => updateTransition(ti, 'condition', (e.target as HTMLInputElement).value)"
              placeholder="condition..."
              class="bg-surface text-[8px] text-on-surface-variant border border-surface-highest focus:outline-none px-1 py-0.5 w-20 min-w-0" />
            <!-- Delete -->
            <button @click="deleteTransition(ti)" class="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
              <span class="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
          <div v-if="transitions.length === 0" class="px-3 py-1 text-[9px] text-slate-700 italic">
            Aucune transition.
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { Component } from '../../engine/Entity'
import type { AnimClip, AnimatorComponentData, SpriteComponentData } from '../../engine/types'

const store = useEditorStore()

// ── Focus directive ───────────────────────────────────────────────
const vFocus = { mounted: (el: HTMLElement) => el.focus() }

// ── Entity helpers ────────────────────────────────────────────────
const entity = computed(() => {
  void store.entityVersion
  return store.selectedEntityId ? store.engine?.getEntity(store.selectedEntityId) ?? null : null
})
const hasEntity  = computed(() => entity.value !== null)
const hasSprite  = computed(() => entity.value?.hasComponent('sprite') && entity.value?.hasComponent('animator'))
const hasAnimator= computed(() => entity.value?.hasComponent('animator'))

// ── Animator data ────────────────────────────────────────────────
const animData = computed<AnimatorComponentData | null>(() => {
  const comp = entity.value?.getComponent('animator')
  if (!comp) return null
  // Ensure arrays exist
  if (!Array.isArray(comp.data.clips)) comp.data.clips = []
  if (!Array.isArray(comp.data.transitions)) comp.data.transitions = []
  if (typeof comp.data.parameters !== 'object') comp.data.parameters = {}
  return comp.data as AnimatorComponentData
})

const clips = computed(() => animData.value?.clips ?? [])
const transitions = computed(() => animData.value?.transitions ?? [])

// ── Sprite data ──────────────────────────────────────────────────
const spriteData = computed<SpriteComponentData | null>(() => {
  const comp = entity.value?.getComponent('sprite')
  return comp ? (comp.data as SpriteComponentData) : null
})
const spriteTexUrl = computed(() => spriteData.value?.textureUrl ?? '')
const sheetCols = computed(() => spriteData.value?.sheetCols || 4)
const sheetRows = computed(() => spriteData.value?.sheetRows || 4)

// ── UI state ─────────────────────────────────────────────────────
const selectedClipId = ref<string | null>(null)
const editingClipId = ref<string | null>(null)
const cellSize = 32

const selectedClip = computed(() =>
  clips.value.find(c => c.id === selectedClipId.value) ?? null
)

// ── Preview ───────────────────────────────────────────────────────
const previewClipId = ref<string | null>(null)
const currentPreviewFrame = ref(0)
let previewTimer: ReturnType<typeof setInterval> | null = null

function togglePreview(clipId: string) {
  if (previewClipId.value === clipId) {
    stopPreview()
  } else {
    stopPreview()
    previewClipId.value = clipId
    currentPreviewFrame.value = 0
    const clip = clips.value.find(c => c.id === clipId)
    if (!clip || !clip.frames.length) return
    // Forcer le clip dans le composant animator
    applyClip(clip.name)
    // Interval basé sur le FPS du clip
    const ms = 1000 / (clip.fps || 12)
    previewTimer = setInterval(() => {
      if (!clip.frames.length) return
      currentPreviewFrame.value = (currentPreviewFrame.value + 1) % clip.frames.length
    }, ms)
  }
}

function stopPreview() {
  if (previewTimer) { clearInterval(previewTimer); previewTimer = null }
  previewClipId.value = null
  currentPreviewFrame.value = 0
}

onUnmounted(stopPreview)

function applyClip(clipName: string) {
  if (!entity.value || !animData.value) return
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { currentClip: clipName })
}

// ── Clip CRUD ─────────────────────────────────────────────────────
function selectClip(id: string) {
  selectedClipId.value = id
}

function addClip() {
  if (!entity.value || !animData.value) return
  const id = crypto.randomUUID()
  const name = `clip_${clips.value.length}`
  const newClip: AnimClip = { id, name, frames: [], fps: 12, loop: true, pingPong: false }
  const newClips = [...clips.value, newClip]
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  store.bumpEntityVersion()
  selectedClipId.value = id
  // Auto-set as current if first clip
  if (newClips.length === 1) applyClip(name)
}

function deleteClip(id: string) {
  if (!entity.value || !animData.value) return
  const newClips = clips.value.filter(c => c.id !== id)
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  if (selectedClipId.value === id) selectedClipId.value = newClips[0]?.id ?? null
  store.bumpEntityVersion()
}

function renameClip(id: string, name: string) {
  if (!entity.value || !name.trim()) return
  const newClips = clips.value.map(c => c.id === id ? { ...c, name: name.trim() } : c)
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  store.bumpEntityVersion()
}

function updateClipProp(key: keyof AnimClip, val: unknown) {
  if (!entity.value || !selectedClip.value) return
  const newClips = clips.value.map(c =>
    c.id === selectedClipId.value ? { ...c, [key]: val } : c
  )
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  store.bumpEntityVersion()
}

// ── Frame operations ─────────────────────────────────────────────
function addFrame(frameIndex: number) {
  if (!entity.value || !selectedClip.value) return
  const newClips = clips.value.map(c => {
    if (c.id !== selectedClipId.value) return c
    return { ...c, frames: [...c.frames, { frameIndex }] }
  })
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  store.bumpEntityVersion()
}

function removeFrameAt(fi: number) {
  if (!entity.value || !selectedClip.value) return
  const newClips = clips.value.map(c => {
    if (c.id !== selectedClipId.value) return c
    const frames = [...c.frames]
    frames.splice(fi, 1)
    return { ...c, frames }
  })
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  store.bumpEntityVersion()
}

function clearFrames() {
  if (!entity.value || !selectedClip.value) return
  const newClips = clips.value.map(c =>
    c.id === selectedClipId.value ? { ...c, frames: [] } : c
  )
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { clips: newClips })
  store.bumpEntityVersion()
}

function frameExistsInClip(fi: number) {
  return selectedClip.value?.frames.some(f => f.frameIndex === fi) ?? false
}

// ── Cell background style (sprite preview) ───────────────────────
function cellBgStyle(frameIndex: number): Record<string, string> {
  if (!spriteTexUrl.value) return { background: '#1c2538' }
  const cols = sheetCols.value
  const rows = sheetRows.value
  const col = frameIndex % cols
  const row = Math.floor(frameIndex / cols)
  return {
    backgroundImage: `url(${spriteTexUrl.value})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${(col / (cols - 1 || 1)) * 100}% ${(row / (rows - 1 || 1)) * 100}%`,
    imageRendering: 'pixelated',
  }
}

// ── Transitions CRUD ─────────────────────────────────────────────
function addTransition() {
  if (!entity.value || !animData.value) return
  const clips_ = clips.value
  const newTr = {
    id: crypto.randomUUID(),
    from: clips_[0]?.name ?? '*',
    to: clips_[1]?.name ?? clips_[0]?.name ?? '',
    condition: '',
    hasExitTime: false,
    exitTime: 1,
    duration: 0,
  }
  const newTrans = [...transitions.value, newTr]
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { transitions: newTrans })
  store.bumpEntityVersion()
}

function deleteTransition(i: number) {
  if (!entity.value) return
  const newTrans = transitions.value.filter((_, idx) => idx !== i)
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { transitions: newTrans })
  store.bumpEntityVersion()
}

function updateTransition(i: number, key: string, val: unknown) {
  if (!entity.value) return
  const newTrans = transitions.value.map((t, idx) => idx === i ? { ...t, [key]: val } : t)
  store.engine?.updateEntityComponent(entity.value.id, 'animator', { transitions: newTrans })
  store.bumpEntityVersion()
}

// ── Add Animator component to selected entity ─────────────────────
function addAnimatorToSelected() {
  if (!entity.value) return
  const animatorComp = new Component('animator', {
    type: 'animator',
    clips: [],
    currentClip: '',
    transitions: [],
    parameters: {},
    speed: 1,
  })
  entity.value.addComponent(animatorComp)
  store.bumpEntityVersion()
}
</script>
