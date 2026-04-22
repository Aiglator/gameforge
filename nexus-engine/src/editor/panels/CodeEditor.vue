<template>
  <div class="flex flex-col h-full bg-surface-lowest relative">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 h-9 flex-none border-b border-surface-highest bg-[#0d1117]">
      <div class="flex items-center space-x-3">
        <span class="material-symbols-outlined text-secondary text-sm">code</span>
        <span class="text-[10px] font-mono" :class="scriptEntity ? 'text-slate-400' : 'text-slate-600'">
          {{ scriptEntity ? scriptEntity.name + '.js' : (selectedEntity ? selectedEntity.name + ' — no script' : 'No entity selected') }}
        </span>
        <span v-if="dirty && scriptEntity" class="w-1.5 h-1.5 rounded-full bg-secondary flex-none" title="Unsaved changes" />
      </div>
      <div class="flex items-center space-x-2">
        <span v-if="scriptEntity" class="text-[9px] text-slate-600">Ctrl+S to save</span>
        <button
          v-if="scriptEntity"
          @click="saveScript"
          :disabled="!dirty"
          class="text-[9px] font-bold uppercase px-2 py-1 transition-colors"
          :class="dirty ? 'text-secondary hover:bg-secondary/10' : 'text-slate-700 cursor-default'"
        >Save</button>
        <button
          v-if="scriptEntity"
          @click="runScript"
          class="text-[9px] font-bold text-primary uppercase px-2 py-1 hover:bg-primary/10 transition-colors"
        >Run</button>
      </div>
    </div>

    <!-- Monaco mount point (always mounted so it's ready) -->
    <div ref="editorEl" class="flex-1 overflow-hidden" />

    <!-- Overlay: entity selected but no script component -->
    <div
      v-if="selectedEntity && !scriptEntity"
      class="absolute inset-0 top-9 flex flex-col items-center justify-center bg-[#070e1d]/95 z-10"
    >
      <span class="material-symbols-outlined text-slate-600 text-4xl mb-3">code_off</span>
      <p class="text-[12px] font-bold text-on-surface mb-1">{{ selectedEntity.name }}</p>
      <p class="text-[11px] text-slate-500 mb-5">Cette entité n'a pas de composant Script</p>
      <button
        @click="addScriptComponent"
        class="bg-secondary text-surface text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 hover:bg-secondary/80 transition-colors flex items-center space-x-2"
      >
        <span class="material-symbols-outlined text-sm">add</span>
        <span>Ajouter un Script</span>
      </button>
      <p class="text-[9px] text-slate-600 mt-4">ou ajoute "script" via l'Inspector</p>
    </div>

    <!-- Overlay: no entity selected -->
    <div
      v-else-if="!selectedEntity"
      class="absolute inset-0 top-9 flex flex-col items-center justify-center pointer-events-none"
    >
      <span class="material-symbols-outlined text-slate-700 text-4xl">code_off</span>
      <p class="text-[11px] text-slate-600 mt-2 text-center">
        Sélectionne une entité dans la Scene<br/>puis ajoute un composant Script
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { Component } from '../../engine/Entity'

const store = useEditorStore()
const editorEl = ref<HTMLElement | null>(null)
let monaco: typeof import('monaco-editor') | null = null
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null
const dirty = ref(false)
let _previewTimeout: number | undefined

const selectedEntity = computed(() => {
  void store.entityVersion
  const eid = store.selectedEntityId
  if (!eid) return null
  return store.engine?.getEntity(eid) ?? null
})

const scriptEntity = computed(() => {
  const e = selectedEntity.value
  return e?.hasComponent('script') ? e : null
})

function currentSource(): string {
  return (scriptEntity.value?.getComponent('script')?.data?.source as string) ?? ''
}

const DEFAULT_SCRIPT = `// Script attaché à this.entity
// Disponible : this.entity, entity, scene, THREE, keyDown, keyPressed

this.onStart(() => {
  // appelé une fois au démarrage
})

this.onUpdate((dt) => {
  // appelé chaque frame (dt = delta time en secondes)
})
`

function addScriptComponent() {
  const e = selectedEntity.value
  if (!e || !store.engine) return
  e.addComponent(new Component('script', {
    source: DEFAULT_SCRIPT,
    language: 'javascript',
  }))
  store.engine.updateEntityComponent(e.id, 'script', { source: DEFAULT_SCRIPT, language: 'javascript' })
  store.bumpEntityVersion()
  // scriptEntity watcher will load the source into Monaco
}

async function initMonaco() {
  if (!editorEl.value) return
  monaco = await import('monaco-editor')

  monaco.editor.defineTheme('nexus-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
      { token: 'keyword', foreground: '63b3ed' },
      { token: 'string', foreground: '68d391' },
      { token: 'number', foreground: 'f6ad55' },
    ],
    colors: {
      'editor.background': '#070e1d',
      'editor.foreground': '#e2e8f0',
      'editor.lineHighlightBackground': '#0d1a2d',
      'editor.selectionBackground': '#1a3a5c',
      'editorLineNumber.foreground': '#2d3748',
      'editorLineNumber.activeForeground': '#4edea3',
      'editor.findMatchBackground': '#1a3a5c',
      'editorCursor.foreground': '#4edea3',
      'editorGutter.background': '#070e1d',
    },
  })

  editor = monaco.editor.create(editorEl.value, {
    value: currentSource(),
    language: 'javascript',
    theme: 'nexus-dark',
    fontSize: 12,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    lineHeight: 20,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 12 },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderLineHighlight: 'gutter',
    formatOnPaste: true,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    folding: true,
    glyphMargin: false,
  })

  editor.onDidChangeModelContent(() => {
    if (!scriptEntity.value) return
    dirty.value = true
    if (!store.isPlaying) {
      clearTimeout(_previewTimeout)
      const eid = scriptEntity.value.id
      const src = editor!.getValue()
      _previewTimeout = window.setTimeout(() => {
        if (!store.isPlaying && store.engine && scriptEntity.value?.id === eid) {
          store.engine.previewScript(eid, src)
          store.bumpEntityVersion()
        }
      }, 600)
    }
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveScript)
}

function saveScript() {
  if (!scriptEntity.value || !editor) return
  const src = editor.getValue()
  store.engine?.updateEntityComponent(scriptEntity.value.id, 'script', { source: src })
  dirty.value = false
  store.addConsoleMessage('info', `Script saved: ${scriptEntity.value.name}`)
  if (!store.isPlaying) {
    store.engine?.previewScript(scriptEntity.value.id)
    store.bumpEntityVersion()
  }
}

function runScript() {
  if (!scriptEntity.value) return
  saveScript()
  store.addConsoleMessage('log', `Running script: ${scriptEntity.value.name}`)
}

watch(scriptEntity, (entity) => {
  if (!editor || !monaco) return
  const src = entity ? currentSource() : ''
  if (editor.getValue() !== src) {
    editor.setValue(src)
    dirty.value = false
  }
})

watch(scriptEntity, (entity) => {
  if (!editor || !monaco) return
  const lang = (entity?.getComponent('script')?.data?.language as string) ?? 'javascript'
  const model = editor.getModel()
  if (model) monaco!.editor.setModelLanguage(model, lang === 'typescript' ? 'typescript' : 'javascript')
})

onMounted(initMonaco)

onBeforeUnmount(() => {
  clearTimeout(_previewTimeout)
  editor?.dispose()
})
</script>
