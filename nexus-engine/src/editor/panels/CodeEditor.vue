<template>
  <div class="flex flex-col h-full bg-surface-lowest">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 h-9 flex-none border-b border-surface-highest bg-[#0d1117]">
      <div class="flex items-center space-x-3">
        <span class="material-symbols-outlined text-secondary text-sm">code</span>
        <span class="text-[10px] font-mono text-slate-400">
          {{ scriptEntity ? scriptEntity.name + '.js' : 'No script selected' }}
        </span>
        <span v-if="dirty" class="w-1.5 h-1.5 rounded-full bg-secondary flex-none" title="Unsaved changes" />
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-[9px] text-slate-600">Ctrl+S to save</span>
        <button
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

    <!-- Monaco mount point -->
    <div ref="editorEl" class="flex-1 overflow-hidden" />

    <!-- No script placeholder -->
    <div v-if="!scriptEntity" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span class="material-symbols-outlined text-slate-700 text-4xl">code_off</span>
      <p class="text-[11px] text-slate-600 mt-2">Select an entity with a Script component<br/>then click "Edit Script in Code Panel"</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '../stores/editorStore'

const store = useEditorStore()
const editorEl = ref<HTMLElement | null>(null)
let monaco: typeof import('monaco-editor') | null = null
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null
const dirty = ref(false)

const scriptEntity = computed(() => {
  void store.entityVersion
  const eid = store.selectedEntityId
  if (!eid) return null
  const e = store.engine?.getEntity(eid)
  return e?.hasComponent('script') ? e : null
})

function currentSource(): string {
  return (scriptEntity.value?.getComponent('script')?.data?.source as string) ?? ''
}

async function initMonaco() {
  if (!editorEl.value) return
  // Dynamic import so Vite/Monaco workers can split correctly
  monaco = await import('monaco-editor')

  // Dark theme matching our design system
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
    dirty.value = true
  })

  // Ctrl+S shortcut inside editor
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveScript)
}

function saveScript() {
  if (!scriptEntity.value || !editor) return
  const src = editor.getValue()
  store.engine?.updateEntityComponent(scriptEntity.value.id, 'script', { source: src })
  dirty.value = false
  store.addConsoleMessage('info', `Script saved: ${scriptEntity.value.name}`)
}

function runScript() {
  if (!scriptEntity.value) return
  saveScript()
  store.addConsoleMessage('log', `Running script: ${scriptEntity.value.name}`)
  // The engine's scripting system will pick it up on next frame
}

// Load script source when selected entity changes
watch(scriptEntity, (entity) => {
  if (!editor || !monaco) return
  const src = entity ? currentSource() : ''
  if (editor.getValue() !== src) {
    editor.setValue(src)
    dirty.value = false
  }
})

// Switch language based on component data
watch(scriptEntity, (entity) => {
  if (!editor || !monaco) return
  const lang = (entity?.getComponent('script')?.data?.language as string) ?? 'javascript'
  const model = editor.getModel()
  if (model) monaco!.editor.setModelLanguage(model, lang === 'typescript' ? 'typescript' : 'javascript')
})

onMounted(initMonaco)

onBeforeUnmount(() => {
  editor?.dispose()
})
</script>
