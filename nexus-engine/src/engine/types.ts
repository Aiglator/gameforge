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
  | 'tilemap'

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
  textureUrl?: string      // URL de la texture (blob: ou http:)
  color: string            // couleur teinte (#ffffff par défaut)
  width: number            // largeur world units (default 1)
  height: number           // hauteur world units (default 1)
  billboard: boolean       // true = always face camera (THREE.Sprite), false = plane fixe
  // Spritesheet UV
  sheetCols?: number       // nb colonnes dans le spritesheet
  sheetRows?: number       // nb lignes
  frameIndex?: number      // index de frame (0-based)
  opacity?: number         // 0-1
}

export interface TilemapComponentData extends ComponentData {
  type: 'tilemap'
  textureUrl?: string      // URL du tileset PNG
  mapData?: number[][]     // grille 2D d'indices de tuiles (0 = vide)
  tileWidth: number        // largeur d'une tuile en world units
  tileHeight: number       // hauteur d'une tuile en world units
  sheetCols: number        // nb colonnes du tileset
  sheetRows: number        // nb lignes du tileset
  tiledJson?: string       // JSON string d'un export Tiled (optionnel)
}

export interface SpriteFrame {
  frameIndex: number  // index absolu dans le spritesheet (0-based, row-major)
  duration?: number   // durée ms override (null = utilise fps du clip)
}

export interface AnimClip {
  id: string          // uuid
  name: string        // 'idle' | 'run' | 'jump' | etc.
  frames: SpriteFrame[]
  fps: number         // images/sec (défaut 12)
  loop: boolean
  pingPong: boolean   // aller-retour à la fin avant de boucler
}

export interface AnimTransition {
  id: string
  from: string        // nom du clip source, ou '*' = n'importe lequel
  to: string          // nom du clip cible
  condition: string   // expression textuelle: "speed > 0", "grounded", "!jumping"
  hasExitTime: boolean
  exitTime: number    // 0-1, position normalisée dans le clip avant de transiter
}

export interface AnimatorComponentData extends ComponentData {
  type: 'animator'
  clips: AnimClip[]
  currentClip: string         // nom du clip actif
  transitions: AnimTransition[]
  parameters: Record<string, number | boolean>  // variables d'animation
  speed: number               // multiplicateur global
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
