import type * as THREE from 'three'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export type ComponentType =
  | 'mesh'
  | 'physics'
  | 'script'
  | 'animator'
  | 'light'
  | 'sprite'
  | 'camera'
  | 'animlib'
  | 'behavior'
  | 'trigger'
  | 'terrain'

export interface ComponentData {
  type: ComponentType
  [key: string]: unknown
}

export interface MeshComponentData extends ComponentData {
  type: 'mesh'
  primitiveType: 'box' | 'sphere' | 'cylinder' | 'plane'
  size: [number, number, number]
  color: string
  assetUrl?: string
}

export type PhysicsShape = 'box' | 'sphere' | 'capsule' | 'heightfield'

export interface PhysicsComponentData extends ComponentData {
  type: 'physics'
  isStatic: boolean
  mass: number
  halfExtents: Vec3
  useGravity: boolean
  shape?: PhysicsShape
  radius?: number
}

export type TerrainTheme = 'plains' | 'desert' | 'snow' | 'volcanic' | 'dungeon'

export interface TerrainComponentData extends ComponentData {
  type: 'terrain'
  width: number
  depth: number
  height: number
  scale: number
  octaves: number
  seed: number
  theme: TerrainTheme
  treeCount: number
  ruinCount: number
}

export interface ScriptComponentData extends ComponentData {
  type: 'script'
  source: string
  language: 'javascript' | 'typescript'
}

export interface LightComponentData extends ComponentData {
  type: 'light'
  lightType: 'point' | 'directional' | 'spot' | 'hemisphere' | 'rect'
  color: string
  intensity: number
  castShadow: boolean
}

export interface CameraComponentData extends ComponentData {
  type: 'camera'
  mode: 'follow' | 'firstPerson' | 'fixed' | 'orbit'
  fov: number
  active: boolean
}

export interface SpriteComponentData extends ComponentData {
  type: 'sprite'
  textureUrl: string
  width: number
  height: number
}

export interface AnimatorComponentData extends ComponentData {
  type: 'animator'
  clipName: string
  loop: boolean
  speed: number
}

export interface BehaviorComponentData extends ComponentData {
  type: 'behavior'
  behaviorType: 'patrol' | 'chase' | 'guardian' | 'echo' | 'idle'
  speed: number
  range: number
}

export interface TriggerComponentData extends ComponentData {
  type: 'trigger'
  halfExtents: Vec3
  onEnter: string
  onExit: string
}

export interface EntityData {
  id: string
  name: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  components: Record<string, ComponentData>
  children: string[]
  parentId: string | null
  visible: boolean
  locked: boolean
}

export interface SceneData {
  entities: EntityData[]
}

export interface ProjectData {
  name: string
  scenes: Record<string, SceneData>
  currentScene: string
}

export type GizmoMode = 'translate' | 'rotate' | 'scale'
export type ViewportMode = '2d' | '3d' | '2d+3d'
export type ViewportShading = 'lit' | 'unlit' | 'wireframe'

export interface EngineStats {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  entities: number
}
