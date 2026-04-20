<template>
  <div class="relative h-full w-full overflow-hidden bg-[#060c18] select-none" ref="containerEl">
    <!-- Grid background -->
    <canvas ref="bgCanvas" class="absolute inset-0 pointer-events-none" />

    <!-- Main canvas for wires -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="overflow: visible;">
      <g :transform="`translate(${pan.x},${pan.y}) scale(${zoom})`">
        <path
          v-for="wire in wires"
          :key="wire.id"
          :d="wirePath(wire)"
          fill="none"
          :stroke="wire.color"
          stroke-width="2"
          opacity="0.8"
        />
        <!-- Pending wire while dragging -->
        <path
          v-if="pendingWire"
          :d="pendingWirePath"
          fill="none"
          stroke="#4edea3"
          stroke-width="1.5"
          stroke-dasharray="4,4"
          opacity="0.6"
        />
      </g>
    </svg>

    <!-- Nodes layer -->
    <div
      class="absolute inset-0"
      :style="{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }"
    >
      <div
        v-for="node in nodes"
        :key="node.id"
        class="absolute bg-surface-high border border-surface-highest shadow-2xl"
        :class="selected === node.id ? 'ring-1 ring-secondary' : ''"
        :style="{ left: node.x + 'px', top: node.y + 'px', width: NODE_W + 'px' }"
        @mousedown.self.stop="startDragNode($event, node.id)"
      >
        <!-- Header -->
        <div
          class="px-3 py-1.5 flex items-center space-x-2 cursor-move"
          :style="{ background: node.color + '22', borderBottom: '1px solid ' + node.color + '44' }"
          @mousedown.stop="startDragNode($event, node.id)"
          @click="selected = node.id"
        >
          <span class="material-symbols-outlined text-sm flex-none" :style="{ color: node.color }">{{ node.icon }}</span>
          <span class="text-[10px] font-bold tracking-wide" :style="{ color: node.color }">{{ node.label }}</span>
          <div class="flex-1" />
          <span class="text-[8px] text-slate-600 uppercase">{{ node.category }}</span>
        </div>

        <!-- Ports -->
        <div class="py-1">
          <div
            v-for="port in node.inputs"
            :key="'i-' + port.id"
            class="flex items-center px-2 py-0.5 space-x-2 group hover:bg-surface-highest/30"
          >
            <!-- Input pin -->
            <div
              class="w-3 h-3 border-2 flex-none cursor-crosshair transition-colors group-hover:border-secondary"
              :style="{ borderColor: portColor(port.type), background: pendingWire?.toNode === node.id && pendingWire.toPort === port.id ? portColor(port.type) : 'transparent' }"
              @mouseup="finishWire(node.id, port.id)"
              @mouseenter="hoverPort = { nodeId: node.id, portId: port.id }"
              @mouseleave="hoverPort = null"
            />
            <span class="text-[9px] text-slate-400">{{ port.label }}</span>
            <span class="text-[8px] text-slate-700 ml-auto">{{ port.type }}</span>
          </div>

          <div
            v-for="port in node.outputs"
            :key="'o-' + port.id"
            class="flex items-center px-2 py-0.5 space-x-2 justify-end group hover:bg-surface-highest/30"
          >
            <span class="text-[8px] text-slate-700 mr-auto">{{ port.type }}</span>
            <span class="text-[9px] text-slate-400">{{ port.label }}</span>
            <!-- Output pin -->
            <div
              class="w-3 h-3 border-2 flex-none cursor-crosshair transition-colors group-hover:border-secondary"
              :style="{ borderColor: portColor(port.type), background: portColor(port.type) }"
              @mousedown.stop="startWire($event, node.id, port.id)"
            />
          </div>
        </div>

        <!-- Properties (selected node) -->
        <div v-if="selected === node.id && node.props && node.props.length" class="border-t border-surface-highest px-2 py-1.5 space-y-1">
          <div
            v-for="prop in node.props"
            :key="prop.key"
            class="flex items-center justify-between"
          >
            <span class="text-[9px] text-slate-500 uppercase">{{ prop.key }}</span>
            <input
              v-model="prop.value"
              class="bg-surface-highest text-[9px] text-on-surface px-1 py-0.5 w-2/3 border-none focus:ring-0 focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Pan + zoom backdrop -->
    <div
      class="absolute inset-0"
      style="cursor: grab; z-index: 0;"
      @mousedown="startPan"
      @wheel.prevent="onWheel"
    />

    <!-- Toolbar -->
    <div class="absolute top-2 left-2 flex items-center space-x-1 z-10">
      <button
        v-for="tpl in NODE_TEMPLATES"
        :key="tpl.label"
        @click="spawnNode(tpl)"
        class="bg-surface-high border border-surface-highest px-2 py-1 text-[9px] text-slate-400 hover:text-secondary hover:border-secondary/40 transition-colors flex items-center space-x-1"
      >
        <span class="material-symbols-outlined text-sm" :style="{ color: tpl.color }">{{ tpl.icon }}</span>
        <span>{{ tpl.label }}</span>
      </button>
      <div class="w-px h-4 bg-surface-highest mx-1" />
      <button
        @click="wires = []"
        class="bg-surface-high border border-surface-highest px-2 py-1 text-[9px] text-slate-600 hover:text-error transition-colors"
      >Clear Wires</button>
    </div>

    <!-- Zoom indicator -->
    <div class="absolute bottom-2 right-2 z-10 text-[9px] text-slate-600 font-mono">
      {{ Math.round(zoom * 100) }}% · {{ nodes.length }} nodes
    </div>

    <!-- Hint when empty -->
    <div v-if="nodes.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div class="text-center">
        <span class="material-symbols-outlined text-slate-700 text-5xl">account_tree</span>
        <p class="text-[11px] text-slate-600 mt-2">Visual Scripting — Add nodes from the toolbar above</p>
        <p class="text-[10px] text-slate-700 mt-1">Click output pins to draw connections</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const NODE_W = 200

interface Port { id: string; label: string; type: string }
interface Prop { key: string; value: string }
interface NodeDef {
  id: string; label: string; category: string; icon: string; color: string
  x: number; y: number
  inputs: Port[]; outputs: Port[]
  props?: Prop[]
}
interface Wire {
  id: string; fromNode: string; fromPort: string; toNode: string; toPort: string; color: string
}

const containerEl = ref<HTMLElement | null>(null)
const bgCanvas    = ref<HTMLCanvasElement | null>(null)

const pan  = ref({ x: 80, y: 60 })
const zoom = ref(1)
const selected   = ref<string | null>(null)
const hoverPort  = ref<{ nodeId: string; portId: string } | null>(null)
const wires      = ref<Wire[]>([])
const pendingWire = ref<{ fromNode: string; fromPort: string; toNode?: string; toPort?: string; mx: number; my: number } | null>(null)

let _dragNode: { id: string; startX: number; startY: number; ox: number; oy: number } | null = null
let _panStart: { mx: number; my: number; px: number; py: number } | null = null

// ── Pre-built demo nodes ──────────────────────────────────────────
const nodes = ref<NodeDef[]>([
  {
    id: 'n1', label: 'On Begin Play', category: 'Event', icon: 'play_arrow', color: '#f56565',
    x: 40, y: 60,
    inputs: [],
    outputs: [{ id: 'exec', label: 'Exec', type: 'exec' }],
  },
  {
    id: 'n2', label: 'Print String', category: 'Debug', icon: 'terminal', color: '#4edea3',
    x: 320, y: 60,
    inputs: [
      { id: 'exec', label: 'Exec', type: 'exec' },
      { id: 'str',  label: 'String', type: 'string' },
    ],
    outputs: [{ id: 'exec', label: 'Exec', type: 'exec' }],
    props: [{ key: 'message', value: 'Hello World' }],
  },
  {
    id: 'n3', label: 'Branch', category: 'Flow', icon: 'call_split', color: '#63b3ed',
    x: 320, y: 220,
    inputs: [
      { id: 'exec', label: 'Exec', type: 'exec' },
      { id: 'cond', label: 'Condition', type: 'bool' },
    ],
    outputs: [
      { id: 'true',  label: 'True',  type: 'exec' },
      { id: 'false', label: 'False', type: 'exec' },
    ],
  },
  {
    id: 'n4', label: 'Get Variable', category: 'Variable', icon: 'data_object', color: '#f6ad55',
    x: 40, y: 280,
    inputs: [],
    outputs: [{ id: 'val', label: 'Value', type: 'any' }],
    props: [{ key: 'name', value: 'myVar' }],
  },
])

wires.value = [
  { id: 'w1', fromNode: 'n1', fromPort: 'exec', toNode: 'n2', toPort: 'exec', color: '#f56565' },
]

// ── Node templates for toolbar ────────────────────────────────────
const NODE_TEMPLATES: Omit<NodeDef, 'id' | 'x' | 'y'>[] = [
  {
    label: 'Event', category: 'Event', icon: 'bolt', color: '#f56565',
    inputs: [], outputs: [{ id: 'exec', label: 'Exec', type: 'exec' }],
  },
  {
    label: 'Function', category: 'Logic', icon: 'functions', color: '#63b3ed',
    inputs: [{ id: 'exec', label: 'Exec', type: 'exec' }],
    outputs: [{ id: 'exec', label: 'Exec', type: 'exec' }, { id: 'ret', label: 'Return', type: 'any' }],
    props: [{ key: 'name', value: 'MyFunc' }],
  },
  {
    label: 'Variable', category: 'Variable', icon: 'data_object', color: '#f6ad55',
    inputs: [], outputs: [{ id: 'val', label: 'Value', type: 'any' }],
    props: [{ key: 'name', value: 'myVar' }],
  },
  {
    label: 'Math', category: 'Math', icon: 'calculate', color: '#b794f4',
    inputs: [{ id: 'a', label: 'A', type: 'float' }, { id: 'b', label: 'B', type: 'float' }],
    outputs: [{ id: 'result', label: 'Result', type: 'float' }],
    props: [{ key: 'op', value: '+' }],
  },
  {
    label: 'Print', category: 'Debug', icon: 'terminal', color: '#4edea3',
    inputs: [{ id: 'exec', label: 'Exec', type: 'exec' }, { id: 'str', label: 'String', type: 'string' }],
    outputs: [{ id: 'exec', label: 'Exec', type: 'exec' }],
    props: [{ key: 'message', value: 'Hello' }],
  },
]

let _nodeIdCtr = 100
function spawnNode(tpl: Omit<NodeDef, 'id' | 'x' | 'y'>) {
  const id = 'n' + (++_nodeIdCtr)
  // Place in visible center
  const cx = (containerEl.value?.clientWidth ?? 400) / 2
  const cy = (containerEl.value?.clientHeight ?? 300) / 2
  nodes.value.push({
    ...tpl,
    id,
    x: (cx - pan.value.x) / zoom.value - NODE_W / 2,
    y: (cy - pan.value.y) / zoom.value - 60,
    // Deep-clone ports and props
    inputs:  tpl.inputs.map(p => ({ ...p })),
    outputs: tpl.outputs.map(p => ({ ...p })),
    props:   tpl.props?.map(p => ({ ...p })),
  })
}

// ── Port color by type ────────────────────────────────────────────
function portColor(type: string) {
  const map: Record<string, string> = {
    exec: '#f56565', float: '#b794f4', string: '#68d391', bool: '#63b3ed', any: '#a0aec0', int: '#f6ad55',
  }
  return map[type] ?? '#718096'
}

// ── Wire path (cubic bezier) ──────────────────────────────────────
function getPortPos(nodeId: string, portId: string, isOutput: boolean): { x: number; y: number } {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  const HEADER_H = 34
  const PORT_H   = 24
  const PROP_H   = 28

  let idx: number
  if (isOutput) {
    idx = node.outputs.findIndex(p => p.id === portId)
    const row = node.inputs.length + idx
    return { x: node.x + NODE_W, y: node.y + HEADER_H + row * PORT_H + PORT_H / 2 }
  } else {
    idx = node.inputs.findIndex(p => p.id === portId)
    return { x: node.x, y: node.y + HEADER_H + idx * PORT_H + PORT_H / 2 }
  }
}

function wirePath(wire: Wire) {
  const from = getPortPos(wire.fromNode, wire.fromPort, true)
  const to   = getPortPos(wire.toNode,  wire.toPort,   false)
  const dx   = Math.abs(to.x - from.x) * 0.5 + 40
  return `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`
}

const pendingWirePath = computed(() => {
  if (!pendingWire.value) return ''
  const pw = pendingWire.value
  const from = getPortPos(pw.fromNode, pw.fromPort, true)
  const mx = (pw.mx - pan.value.x) / zoom.value
  const my = (pw.my - pan.value.y) / zoom.value
  const dx = Math.abs(mx - from.x) * 0.5 + 40
  return `M${from.x},${from.y} C${from.x + dx},${from.y} ${mx - dx},${my} ${mx},${my}`
})

// ── Dragging nodes ────────────────────────────────────────────────
function startDragNode(e: MouseEvent, id: string) {
  selected.value = id
  const node = nodes.value.find(n => n.id === id)
  if (!node) return
  _dragNode = { id, startX: e.clientX, startY: e.clientY, ox: node.x, oy: node.y }
}

// ── Pan ───────────────────────────────────────────────────────────
function startPan(e: MouseEvent) {
  _panStart = { mx: e.clientX, my: e.clientY, px: pan.value.x, py: pan.value.y }
}

// ── Wire dragging ─────────────────────────────────────────────────
function startWire(e: MouseEvent, nodeId: string, portId: string) {
  e.stopPropagation()
  pendingWire.value = { fromNode: nodeId, fromPort: portId, mx: e.clientX, my: e.clientY }
}

function finishWire(nodeId: string, portId: string) {
  if (!pendingWire.value || pendingWire.value.fromNode === nodeId) {
    pendingWire.value = null
    return
  }
  const from = pendingWire.value
  const fromPort = nodes.value.find(n => n.id === from.fromNode)?.outputs.find(p => p.id === from.fromPort)
  wires.value.push({
    id: 'w' + Date.now(),
    fromNode: from.fromNode, fromPort: from.fromPort,
    toNode:   nodeId,        toPort:   portId,
    color: portColor(fromPort?.type ?? 'any'),
  })
  pendingWire.value = null
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoom.value = Math.min(2, Math.max(0.2, zoom.value * delta))
}

// ── Global mouse move / up ────────────────────────────────────────
function onMouseMove(e: MouseEvent) {
  if (_dragNode) {
    const dx = (e.clientX - _dragNode.startX) / zoom.value
    const dy = (e.clientY - _dragNode.startY) / zoom.value
    const node = nodes.value.find(n => n.id === _dragNode!.id)
    if (node) { node.x = _dragNode.ox + dx; node.y = _dragNode.oy + dy }
  }
  if (_panStart) {
    pan.value.x = _panStart.px + (e.clientX - _panStart.mx)
    pan.value.y = _panStart.py + (e.clientY - _panStart.my)
  }
  if (pendingWire.value) {
    pendingWire.value.mx = e.clientX
    pendingWire.value.my = e.clientY
  }
}

function onMouseUp() {
  _dragNode = null
  _panStart = null
  if (pendingWire.value) pendingWire.value = null
}

// ── Grid canvas ───────────────────────────────────────────────────
function drawGrid() {
  const canvas = bgCanvas.value
  if (!canvas || !containerEl.value) return
  canvas.width  = containerEl.value.clientWidth
  canvas.height = containerEl.value.clientHeight
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const step = 24 * zoom.value
  const ox = pan.value.x % step
  const oy = pan.value.y % step

  ctx.strokeStyle = '#0d1a2d'
  ctx.lineWidth = 1

  for (let x = ox; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
  }
  for (let y = oy; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
  }

  // Major grid every 6 cells
  const major = step * 6
  const mox = pan.value.x % major
  const moy = pan.value.y % major
  ctx.strokeStyle = '#131e32'
  ctx.lineWidth = 1.5
  for (let x = mox; x < canvas.width; x += major) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
  }
  for (let y = moy; y < canvas.height; y += major) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
  }
}

let _gridRaf = 0
function scheduleGrid() {
  cancelAnimationFrame(_gridRaf)
  _gridRaf = requestAnimationFrame(() => { drawGrid(); scheduleGrid() })
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',   onMouseUp)
  scheduleGrid()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
  cancelAnimationFrame(_gridRaf)
})
</script>
