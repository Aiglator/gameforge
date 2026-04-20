<template>
  <div class="flex flex-col h-full bg-surface-lowest font-mono">
    <!-- Messages -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto no-scrollbar px-2 py-1 space-y-0.5">
      <div v-if="store.consoleMessages.length === 0" class="text-[10px] text-slate-600 py-4 text-center">
        No console output
      </div>

      <div
        v-for="msg in store.consoleMessages"
        :key="msg.id"
        class="flex items-start space-x-2 py-0.5 px-1 hover:bg-surface-highest/30 group"
        :class="rowBg[msg.type]"
      >
        <!-- Icon -->
        <span class="material-symbols-outlined text-[13px] flex-none mt-0.5" :class="typeColor[msg.type]">
          {{ typeIcon[msg.type] }}
        </span>

        <!-- Time -->
        <span class="text-[9px] text-slate-600 flex-none pt-[1px]">{{ formatTime(msg.timestamp) }}</span>

        <!-- Text -->
        <pre class="text-[10px] whitespace-pre-wrap break-all flex-1 leading-relaxed" :class="typeColor[msg.type]">{{ msg.text }}</pre>
      </div>
    </div>

    <!-- Input bar -->
    <div class="flex items-center border-t border-surface-highest px-2 h-8 flex-none">
      <span class="text-secondary text-[11px] mr-2 flex-none">❯</span>
      <input
        v-model="inputVal"
        @keydown.enter="execInput"
        placeholder="Evaluate JavaScript..."
        class="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] text-on-surface w-full placeholder:text-slate-700"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import type { ConsoleMessage } from '../stores/editorStore'

const store = useEditorStore()
const scrollEl = ref<HTMLElement | null>(null)
const inputVal = ref('')

const typeIcon: Record<ConsoleMessage['type'], string> = {
  log:   'chevron_right',
  info:  'info',
  warn:  'warning',
  error: 'error',
}
const typeColor: Record<ConsoleMessage['type'], string> = {
  log:   'text-slate-300',
  info:  'text-blue-400',
  warn:  'text-yellow-400',
  error: 'text-red-400',
}
const rowBg: Record<ConsoleMessage['type'], string> = {
  log:   '',
  info:  '',
  warn:  'bg-yellow-900/10',
  error: 'bg-red-900/15',
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`
}

function execInput() {
  const code = inputVal.value.trim()
  if (!code) return
  store.addConsoleMessage('log', `❯ ${code}`)
  inputVal.value = ''
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function('engine', 'store', `return (${code})`)(store.engine, store)
    store.addConsoleMessage('info', String(result ?? 'undefined'))
  } catch (err: unknown) {
    store.addConsoleMessage('error', String(err))
  }
}

// Auto-scroll to bottom on new messages
watch(() => store.consoleMessages.length, () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
})
</script>
