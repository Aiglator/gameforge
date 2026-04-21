import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import * as CANNON from 'cannon-es'
import { Entity, Component } from './Entity'
import type { Vec3, GizmoMode, ViewportMode, EngineStats, ComponentType } from './types'
import { TerrainGenerator, type TerrainResult, type TerrainParams } from './TerrainGenerator'
import { Skybox, type SkySettings } from './Skybox'
import { PostProcessing, type PostProcessingOptions } from './PostProcessing'
import { TilemapLoader } from './TilemapLoader'
import type { SpriteComponentData, TilemapComponentData } from './types'

type EngineEvent =
  | 'entityAdded'
  | 'entityRemoved'
  | 'entityChanged'
  | 'entitySelected'
  | 'sceneLoaded'
  | 'fps'
  | 'modeChanged'
  | 'playStateChanged'
  | 'statsUpdated'

export class Engine {
  // Three.js
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  orthoCamera: THREE.OrthographicCamera
  renderer: THREE.WebGLRenderer
  orbitControls: OrbitControls
  transformControls: TransformControls

  // Physics
  physicsWorld: CANNON.World
  private _physicsBodies: Map<string, CANNON.Body> = new Map()

  // Entities
  private _entities: Map<string, Entity> = new Map()
  private _selectedId: string | null = null

  // Game loop
  private _running = false
  private _frameId: number | null = null
  private _lastTime = 0
  private _frameCount = 0
  private _fpsTime = performance.now()

  // Events
  private _listeners: Record<string, Array<(data: unknown) => void>> = {}

  // State
  mode: ViewportMode = '3d'
  gizmoMode: GizmoMode = 'translate'
  stats: EngineStats = { fps: 0, frameTime: 0, drawCalls: 0, triangles: 0, entities: 0 }

  // Scripting
  private _compiledScripts: Map<string, { onStart?: () => void, onUpdate?: (dt: number) => void, onCollision?: (other: Entity) => void }> = new Map()

  // Animation state
  private _animState = new Map<string, {
    clipName: string
    frameIdx: number
    frameElapsed: number  // secondes écoulées dans la frame courante
    direction: 1 | -1    // pour pingPong
  }>()
  private _keyDown: Set<string> = new Set()
  private _keyPressed: Set<string> = new Set()

  // Saved state for play/stop restore
  private _savedScene: string | null = null

  // Engine v2 — terrain / sky / post-processing
  private _terrainGenerator: TerrainGenerator | null = null
  private _lastTerrainResult: TerrainResult | null = null
  skybox: Skybox | null = null
  postProcessing: PostProcessing | null = null

  constructor(container: HTMLElement) {
    // Three.js setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#070e1d')
    this.scene.fog = new THREE.Fog('#070e1d', 60, 200)

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
    this.camera.position.set(8, 6, 8)
    this.camera.lookAt(0, 0, 0)

    this.orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
    this.orthoCamera.position.set(0, 10, 0)
    this.orthoCamera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    // Controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.08
    this.orbitControls.maxPolarAngle = Math.PI * 0.85

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
    this.transformControls.setSize(0.75)
    this.scene.add(this.transformControls)

    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !(event.value as boolean)
    })

    this.transformControls.addEventListener('objectChange', () => {
      this._syncGizmoToEntity()
    })

    // Lights
    const ambient = new THREE.AmbientLight('#ffffff', 0.4)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight('#ffffff', 1.2)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 100
    sun.shadow.camera.left = -30
    sun.shadow.camera.right = 30
    sun.shadow.camera.top = 30
    sun.shadow.camera.bottom = -30
    this.scene.add(sun)

    // Grid
    const grid = new THREE.GridHelper(100, 100, '#1a2540', '#111a30')
    this.scene.add(grid)

    // Axes
    const axes = new THREE.AxesHelper(5)
    this.scene.add(axes)

    // Physics
    this.physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) })
    this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld)

    // Ground plane for physics
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    })
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.physicsWorld.addBody(groundBody)

    // Resize
    this._handleResize(container)

    // Keyboard input
    window.addEventListener('keydown', (e) => {
      this._keyDown.add(e.code)
      this._keyPressed.add(e.code)
    })
    window.addEventListener('keyup', (e) => {
      this._keyDown.delete(e.code)
    })

    // Start editor loop
    this._editorLoop()
  }

  // ─── Entity Management ──────────────────────────────────────────

  addEntity(entity: Entity): Entity {
    this._entities.set(entity.id, entity)
    if (!entity.object3D) {
      entity.object3D = this._buildObject3D(entity)
    }
    entity.object3D.name = entity.name
    this._syncTransform(entity)
    this.scene.add(entity.object3D)

    if (entity.hasComponent('physics')) {
      this._addPhysicsBody(entity)
    }

    this.stats.entities = this._entities.size
    this._emit('entityAdded', entity)
    return entity
  }

  removeEntity(id: string): void {
    const entity = this._entities.get(id)
    if (!entity) return

    if (entity.object3D) {
      this.transformControls.detach()
      this.scene.remove(entity.object3D)
    }

    const body = this._physicsBodies.get(id)
    if (body) {
      this.physicsWorld.removeBody(body)
      this._physicsBodies.delete(id)
    }

    this._entities.delete(id)
    if (this._selectedId === id) this._selectedId = null
    this.stats.entities = this._entities.size
    this._emit('entityRemoved', id)
  }

  getEntity(id: string): Entity | null {
    return this._entities.get(id) || null
  }

  getAllEntities(): Entity[] {
    return [...this._entities.values()]
  }

  selectEntity(id: string | null): void {
    this._selectedId = id
    if (id) {
      const entity = this._entities.get(id)
      if (entity?.object3D) {
        this.transformControls.attach(entity.object3D)
      }
    } else {
      this.transformControls.detach()
    }
    this._emit('entitySelected', id)
  }

  getSelectedId(): string | null {
    return this._selectedId
  }

  createPrimitive(type: 'cube' | 'sphere' | 'cylinder' | 'plane' | 'light' | 'camera' | 'terrain' | 'sprite' | 'sprite-fixed' | 'tilemap', name?: string): Entity {
    const entity = new Entity(name || type)

    if (type === 'cube' || type === 'sphere' || type === 'cylinder') {
      entity.addComponent(new Component('mesh', {
        primitiveType: type === 'cube' ? 'box' : type,
        size: [1, 1, 1],
        color: '#6b7db3',
      }))
      entity.addComponent(new Component('physics', {
        isStatic: false,
        mass: 1,
        halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
        useGravity: true,
      }))
      entity.position.y = 2
    } else if (type === 'plane') {
      entity.addComponent(new Component('mesh', {
        primitiveType: 'box',
        size: [20, 0.4, 20],
        color: '#557755',
      }))
      entity.addComponent(new Component('physics', {
        isStatic: true,
        mass: 0,
        halfExtents: { x: 10, y: 0.2, z: 10 },
        useGravity: false,
      }))
      entity.position.y = -0.2
    } else if (type === 'light') {
      entity.addComponent(new Component('light', {
        lightType: 'point',
        color: '#ffffff',
        intensity: 1,
        castShadow: true,
      }))
      entity.position.y = 5
    } else if (type === 'camera') {
      entity.addComponent(new Component('camera', {
        mode: 'follow',
        fov: 60,
        active: false,
      }))
      entity.position.y = 3
    } else if (type === 'terrain') {
      entity.addComponent(new Component('terrain', {
        width: 80, depth: 80, height: 14, scale: 0.07,
        octaves: 5, seed: 0, theme: 'plains',
        treeCount: 40, ruinCount: 10,
      }))
    } else if (type === 'sprite') {
      entity.addComponent(new Component('sprite', {
        type: 'sprite', color: '#ffffff', width: 1, height: 1, billboard: true, opacity: 1,
      }))
    } else if (type === 'sprite-fixed') {
      entity.addComponent(new Component('sprite', {
        type: 'sprite', color: '#4edea3', width: 1, height: 1, billboard: false, opacity: 1,
      }))
    } else if (type === 'tilemap') {
      entity.addComponent(new Component('tilemap', {
        type: 'tilemap', tileWidth: 1, tileHeight: 1, sheetCols: 4, sheetRows: 4,
        mapData: [
          [1, 1, 1, 1, 1],
          [1, 0, 0, 0, 1],
          [1, 0, 1, 0, 1],
          [1, 0, 0, 0, 1],
          [1, 1, 1, 1, 1],
        ],
      }))
    }

    this.addEntity(entity)
    return entity
  }

  // ─── Play / Stop ───────────────────────────────────────────────

  play(): string[] {
    if (this._running) return []
    // Save scene state for restoration
    this._savedScene = JSON.stringify(this.saveScene())
    // Compile scripts
    const errors = this._compileScripts()
    this._startScripts()
    this._running = true
    this._lastTime = performance.now()
    this._frameId = requestAnimationFrame((t) => this._gameLoop(t))
    this.orbitControls.enabled = false
    this.transformControls.detach()
    this._emit('playStateChanged', true)
    return errors
  }

  stop(): void {
    if (!this._running) return
    this._running = false
    if (this._frameId) cancelAnimationFrame(this._frameId)
    this._compiledScripts.clear()
    this.orbitControls.enabled = true

    // Restore scene
    if (this._savedScene) {
      const data = JSON.parse(this._savedScene)
      this._loadSceneSync(data)
      this._savedScene = null
    }

    // Reset physics
    for (const body of this._physicsBodies.values()) {
      body.velocity.setZero()
      body.angularVelocity.setZero()
    }

    this._emit('playStateChanged', false)
  }

  isPlaying(): boolean {
    return this._running
  }

  // ─── Scene Save / Load ─────────────────────────────────────────

  saveScene(): { entities: ReturnType<Entity['serialize']>[] } {
    return {
      entities: this.getAllEntities().map((e) => e.serialize()),
    }
  }

  loadScene(data: { entities: ReturnType<Entity['serialize']>[] }): void {
    this._loadSceneSync(data)
    this._emit('sceneLoaded', null)
  }

  private _loadSceneSync(data: { entities: ReturnType<Entity['serialize']>[] }): void {
    // Clear
    for (const id of [...this._entities.keys()]) {
      this.removeEntity(id)
    }
    // Rebuild
    for (const ed of data.entities || []) {
      const entity = Entity.deserialize(ed)
      this.addEntity(entity)
    }
  }

  // ─── Gizmo ─────────────────────────────────────────────────────

  setGizmoMode(mode: GizmoMode): void {
    this.gizmoMode = mode
    this.transformControls.setMode(mode)
  }

  // ─── Mode ──────────────────────────────────────────────────────

  setMode(mode: ViewportMode): void {
    this.mode = mode
    this._emit('modeChanged', mode)
  }

  setCameraMode(mode: 'perspective' | 'orthographic'): void {
    this.mode = mode === 'orthographic' ? '2d' : '3d'
    const cam = mode === 'orthographic' ? this.orthoCamera : this.camera
    this.orbitControls.object = cam
    this.transformControls.camera = cam
    this._emit('modeChanged', { mode })
  }

  // ─── Raycasting ────────────────────────────────────────────────

  raycastFromMouse(ndcX: number, ndcY: number): Entity | null {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera)

    const meshes: THREE.Object3D[] = []
    for (const entity of this._entities.values()) {
      if (entity.object3D) {
        entity.object3D.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh || (obj as THREE.Sprite).isSprite) {
            meshes.push(obj)
          }
        })
      }
    }

    const hits = raycaster.intersectObjects(meshes, false)
    if (hits.length > 0) {
      return this._findEntityByObject3D(hits[0].object)
    }
    return null
  }

  private _findEntityByObject3D(obj: THREE.Object3D): Entity | null {
    for (const entity of this._entities.values()) {
      if (!entity.object3D) continue
      let found = false
      entity.object3D.traverse((child) => {
        if (child === obj) found = true
      })
      if (found) return entity
    }
    return null
  }

  // ─── Update Entity Transform ───────────────────────────────────

  updateEntityTransform(id: string, position?: Vec3, rotation?: Vec3, scale?: Vec3): void {
    const entity = this._entities.get(id)
    if (!entity) return
    if (position) Object.assign(entity.position, position)
    if (rotation) Object.assign(entity.rotation, rotation)
    if (scale) Object.assign(entity.scale, scale)
    this._syncTransform(entity)
    this._emit('entityChanged', entity)
  }

  updateEntityComponent(id: string, componentType: ComponentType, data: Record<string, unknown>): void {
    const entity = this._entities.get(id)
    if (!entity) return
    const comp = entity.getComponent(componentType)
    if (comp) {
      Object.assign(comp.data, data)
    }
    // Rebuild 3D object if visual component changed
    if (['mesh', 'sprite', 'tilemap'].includes(componentType) && entity.object3D) {
      this.scene.remove(entity.object3D)
      entity.object3D = this._buildObject3D(entity)
      this._syncTransform(entity)
      this.scene.add(entity.object3D)
    }
    this._emit('entityChanged', entity)
  }

  renameEntity(id: string, name: string): void {
    const entity = this._entities.get(id)
    if (!entity) return
    entity.name = name
    if (entity.object3D) entity.object3D.name = name
    this._emit('entityChanged', entity)
  }

  duplicateEntity(id: string): Entity | null {
    const entity = this._entities.get(id)
    if (!entity) return null
    const data = entity.serialize()
    data.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    data.name = `${entity.name}_Copy`
    data.position.x += 1.5
    const clone = Entity.deserialize(data)
    this.addEntity(clone)
    return clone
  }

  // ─── Internals ─────────────────────────────────────────────────

  private _buildObject3D(entity: Entity): THREE.Object3D {
    // ── Terrain ────────────────────────────────────────────────────────────
    const terrainComp = entity.getComponent('terrain')
    if (terrainComp) {
      if (!this._terrainGenerator) this._terrainGenerator = new TerrainGenerator(this.scene)
      const result = this._terrainGenerator.generate(terrainComp.data as TerrainParams)
      this._lastTerrainResult = result
      // Decorations are already added to the scene by TerrainGenerator.generate()
      return result.mesh
    }

    const meshComp = entity.getComponent('mesh')
    const lightComp = entity.getComponent('light')
    const spriteComp = entity.getComponent('sprite')

    if (meshComp) {
      const data = meshComp.data
      const type = (data.primitiveType as string) || 'box'
      const size = (data.size as number[]) || [1, 1, 1]
      const color = (data.color as string) || '#6b7db3'

      let geometry: THREE.BufferGeometry
      if (type === 'box') geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
      else if (type === 'sphere') geometry = new THREE.SphereGeometry(size[0] / 2, 32, 32)
      else if (type === 'cylinder') geometry = new THREE.CylinderGeometry(size[0] / 2, size[0] / 2, size[1], 32)
      else geometry = new THREE.BoxGeometry(size[0], size[1], size[2])

      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    if (lightComp) {
      const data = lightComp.data
      const lightType = (data.lightType as string) || 'point'
      const color = (data.color as string) || '#ffffff'
      const intensity = (data.intensity as number) ?? 1

      const group = new THREE.Group()

      if (lightType === 'point') {
        const light = new THREE.PointLight(color, intensity, 50)
        light.castShadow = (data.castShadow as boolean) ?? true
        group.add(light)
      } else if (lightType === 'directional') {
        const light = new THREE.DirectionalLight(color, intensity)
        light.castShadow = true
        group.add(light)
      } else if (lightType === 'spot') {
        const light = new THREE.SpotLight(color, intensity)
        light.castShadow = true
        group.add(light)
      }

      // Visual helper
      const helper = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#ffcc00', wireframe: true })
      )
      group.add(helper)
      return group
    }

    if (spriteComp) {
      const data = spriteComp.data as SpriteComponentData
      const billboard = data.billboard !== false

      if (billboard) {
        // THREE.Sprite — always faces the camera
        const mat = new THREE.SpriteMaterial({
          color: data.color || '#ffffff',
          opacity: data.opacity ?? 1,
          transparent: (data.opacity ?? 1) < 1,
        })
        if (data.textureUrl) {
          const tex = new THREE.TextureLoader().load(data.textureUrl)
          tex.colorSpace = THREE.SRGBColorSpace
          if (data.sheetCols && data.sheetRows) {
            tex.repeat.set(1 / data.sheetCols, 1 / data.sheetRows)
            const col = (data.frameIndex || 0) % data.sheetCols
            const row = Math.floor((data.frameIndex || 0) / data.sheetCols)
            tex.offset.set(col / data.sheetCols, 1 - (row + 1) / data.sheetRows)
          }
          mat.map = tex
        }
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(data.width || 1, data.height || 1, 1)
        return sprite
      } else {
        // Fixed plane — good for 2D top-down or platformer
        const geo = new THREE.PlaneGeometry(data.width || 1, data.height || 1)
        const mat = new THREE.MeshBasicMaterial({
          color: data.color || '#ffffff',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: data.opacity ?? 1,
        })
        if (data.textureUrl) {
          const tex = new THREE.TextureLoader().load(data.textureUrl)
          tex.colorSpace = THREE.SRGBColorSpace
          if (data.sheetCols && data.sheetRows) {
            tex.repeat.set(1 / data.sheetCols, 1 / data.sheetRows)
            const col = (data.frameIndex || 0) % data.sheetCols
            const row = Math.floor((data.frameIndex || 0) / data.sheetCols)
            tex.offset.set(col / data.sheetCols, 1 - (row + 1) / data.sheetRows)
          }
          mat.map = tex
        }
        return new THREE.Mesh(geo, mat)
      }
    }

    // Tilemap entity
    const tilemapComp = entity.getComponent('tilemap')
    if (tilemapComp) {
      const data = tilemapComp.data as TilemapComponentData
      let group: THREE.Group
      if (data.tiledJson) {
        group = TilemapLoader.fromTiled(JSON.parse(data.tiledJson), data.textureUrl || '')
      } else if (data.mapData) {
        group = TilemapLoader.fromArray(data.mapData, data.textureUrl || '', {
          tileWidth: data.tileWidth || 1,
          tileHeight: data.tileHeight || 1,
          sheetCols: data.sheetCols || 1,
          sheetRows: data.sheetRows || 1,
        })
      } else {
        group = new THREE.Group()
      }
      return group
    }

    // Camera entity or empty
    const cameraComp = entity.getComponent('camera')
    if (cameraComp) {
      const helper = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.6, 4),
        new THREE.MeshBasicMaterial({ color: '#3b82f6', wireframe: true })
      )
      helper.rotation.x = Math.PI / 2
      return helper
    }

    // Fallback: small marker
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2),
      new THREE.MeshBasicMaterial({ color: '#ff6600', wireframe: true })
    )
  }

  private _syncTransform(entity: Entity): void {
    if (!entity.object3D) return
    entity.object3D.position.set(entity.position.x, entity.position.y, entity.position.z)
    entity.object3D.rotation.set(entity.rotation.x, entity.rotation.y, entity.rotation.z)
    entity.object3D.scale.set(entity.scale.x, entity.scale.y, entity.scale.z)
  }

  private _syncGizmoToEntity(): void {
    if (!this._selectedId) return
    const entity = this._entities.get(this._selectedId)
    if (!entity?.object3D) return
    const o = entity.object3D
    entity.position.x = o.position.x
    entity.position.y = o.position.y
    entity.position.z = o.position.z
    entity.rotation.x = o.rotation.x
    entity.rotation.y = o.rotation.y
    entity.rotation.z = o.rotation.z
    entity.scale.x = o.scale.x
    entity.scale.y = o.scale.y
    entity.scale.z = o.scale.z

    // Sync physics body
    const body = this._physicsBodies.get(this._selectedId)
    if (body) {
      body.position.set(entity.position.x, entity.position.y, entity.position.z)
    }

    this._emit('entityChanged', entity)
  }

  private _addPhysicsBody(entity: Entity): void {
    const comp = entity.getComponent('physics')
    if (!comp) return
    const data      = comp.data
    const mass      = (data.isStatic as boolean) ? 0 : ((data.mass as number) || 1)
    const shapeType = (data.shape as string) || 'box'

    let shape: CANNON.Shape
    let bodyRotation: CANNON.Quaternion | undefined

    if (shapeType === 'sphere') {
      const r = (data.radius as number) || 0.5
      shape = new CANNON.Sphere(r)
    } else if (shapeType === 'capsule') {
      const r = (data.radius as number) || 0.3
      const h = ((data.halfExtents as Vec3)?.y || 1)
      shape = new CANNON.Cylinder(r, r, h * 2, 8)
    } else if (shapeType === 'heightfield' && this._lastTerrainResult) {
      const res = this._lastTerrainResult
      const s   = res.segments
      const matrix: number[][] = []
      for (let i = 0; i < s; i++) {
        matrix.push(Array.from(res.heightData.slice(i * s, (i + 1) * s)))
      }
      const elSize = (res.mesh.geometry as THREE.BufferGeometry & { parameters: { width: number } }).parameters.width / (s - 1)
      shape = new CANNON.Heightfield(matrix, { elementSize: elSize })
      // Heightfield needs -90° X rotation to align with Three.js plane
      const q = new CANNON.Quaternion()
      q.setFromEuler(-Math.PI / 2, 0, 0)
      bodyRotation = q
    } else {
      // Default: box
      const he = (data.halfExtents as Vec3) || { x: 0.5, y: 0.5, z: 0.5 }
      shape = new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z))
    }

    const body = new CANNON.Body({
      mass,
      shape,
      position: new CANNON.Vec3(entity.position.x, entity.position.y, entity.position.z),
    })
    if (bodyRotation) body.quaternion.copy(bodyRotation)
    this.physicsWorld.addBody(body)
    this._physicsBodies.set(entity.id, body)
  }

  /** Public wrapper so Vue panels can trigger physics body creation */
  addPhysicsToEntity(id: string): void {
    const entity = this._entities.get(id)
    if (entity) this._addPhysicsBody(entity)
  }

  // ─── Skybox API ────────────────────────────────────────────────

  enableSkybox(settings?: SkySettings): void {
    if (!this.skybox) {
      this.skybox = new Skybox(this.renderer, this.scene)
    }
    this.skybox.apply(settings || { preset: 'day' })
  }

  disableSkybox(): void {
    this.skybox?.remove()
    this.skybox?.dispose()
    this.skybox = null
  }

  // ─── Post-Processing API ───────────────────────────────────────

  enablePostProcessing(options?: Partial<PostProcessingOptions>): void {
    if (!this.postProcessing) {
      this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera)
    }
    if (options) this.postProcessing.apply(options)
    // Sync size immediately
    const w = this.renderer.domElement.clientWidth
    const h = this.renderer.domElement.clientHeight
    this.postProcessing.setSize(w, h)
  }

  disablePostProcessing(): void {
    this.postProcessing?.dispose()
    this.postProcessing = null
  }

  private _handleResize(container: HTMLElement): void {
    const obs = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
      this.postProcessing?.setSize(w, h)
    })
    obs.observe(container)
  }

  // ─── Editor Loop (no physics/scripting) ────────────────────────

  private _editorLoop = (): void => {
    if (this._running) return
    this.orbitControls.update()

    // Animator preview in editor mode
    this._updateAnimators(1 / 60)

    if (this.postProcessing) {
      this.postProcessing.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }

    // Update stats
    const info = this.renderer.info
    this.stats.drawCalls = info.render.calls
    this.stats.triangles = info.render.triangles
    this.stats.entities  = this._entities.size

    // FPS tracking in editor mode
    const now = performance.now()
    this._frameCount++
    const elapsed = (now - this._fpsTime) / 1000
    if (elapsed >= 0.5) {
      this.stats.fps       = Math.round(this._frameCount / elapsed)
      this.stats.frameTime = Math.round((elapsed / this._frameCount) * 1000 * 100) / 100
      this._frameCount = 0
      this._fpsTime    = now
      this._emit('statsUpdated', this.stats)
    }

    requestAnimationFrame(this._editorLoop)
  }

  // ─── Game Loop ─────────────────────────────────────────────────

  private _gameLoop(time: number): void {
    if (!this._running) return

    const dt = Math.min((time - this._lastTime) / 1000, 0.1)
    this._lastTime = time

    // FPS
    this._frameCount++
    this._fpsTime += dt
    if (this._fpsTime >= 0.5) {
      this.stats.fps = Math.round(this._frameCount / this._fpsTime)
      this.stats.frameTime = Math.round((this._fpsTime / this._frameCount) * 1000 * 100) / 100
      this._frameCount = 0
      this._fpsTime = 0
      this._emit('fps', this.stats.fps)
    }

    // Scripting
    this._updateScripts(dt)

    // Animations
    this._updateAnimators(dt)

    // Physics
    this.physicsWorld.step(1 / 60, dt, 3)
    for (const [id, body] of this._physicsBodies) {
      const entity = this._entities.get(id)
      if (!entity) continue
      entity.position.x = body.position.x
      entity.position.y = body.position.y
      entity.position.z = body.position.z
      this._syncTransform(entity)
    }

    // Render
    if (this.postProcessing) {
      this.postProcessing.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
    this._keyPressed.clear()

    const info = this.renderer.info
    this.stats.drawCalls = info.render.calls
    this.stats.triangles = info.render.triangles
    this.stats.entities = this._entities.size
    this._emit('statsUpdated', this.stats)

    this._frameId = requestAnimationFrame((t) => this._gameLoop(t))
  }

  // ─── Animator Runtime ──────────────────────────────────────────

  private _updateAnimators(dt: number): void {
    for (const [id, entity] of this._entities) {
      const animComp = entity.getComponent('animator')
      const spriteComp = entity.getComponent('sprite')
      if (!animComp || !spriteComp) continue

      const data = animComp.data as import('./types').AnimatorComponentData
      const clip = data.clips?.find((c: import('./types').AnimClip) => c.name === data.currentClip)
      if (!clip || clip.frames.length === 0) continue

      // Initialiser ou réinitialiser si clip changé
      let state = this._animState.get(id)
      if (!state || state.clipName !== data.currentClip) {
        state = { clipName: data.currentClip, frameIdx: 0, frameElapsed: 0, direction: 1 }
        this._animState.set(id, state)
      }

      const speed = Math.max(0.01, data.speed ?? 1)
      const fps = Math.max(1, clip.fps || 12)
      const currentFrame = clip.frames[state.frameIdx]
      const frameDuration = (currentFrame?.duration != null ? currentFrame.duration / 1000 : 1 / fps) / speed

      state.frameElapsed += dt
      if (state.frameElapsed >= frameDuration) {
        state.frameElapsed -= frameDuration

        // Avancer frame
        state.frameIdx += state.direction
        const len = clip.frames.length

        if (state.frameIdx >= len) {
          if (clip.pingPong) { state.direction = -1; state.frameIdx = Math.max(0, len - 2) }
          else if (clip.loop) { state.frameIdx = 0 }
          else { state.frameIdx = len - 1 }
        } else if (state.frameIdx < 0) {
          if (clip.pingPong) { state.direction = 1; state.frameIdx = Math.min(1, len - 1) }
          else { state.frameIdx = 0 }
        }

        // Appliquer la frame au sprite
        const frame = clip.frames[state.frameIdx]
        if (frame == null) continue

        const sData = spriteComp.data as import('./types').SpriteComponentData
        const cols = sData.sheetCols || 1
        const rows = sData.sheetRows || 1
        const fi = frame.frameIndex
        const col = fi % cols
        const row = Math.floor(fi / cols)
        const ox = col / cols
        const oy = 1 - (row + 1) / rows

        const obj = entity.object3D
        if (!obj) continue

        // THREE.Sprite (billboard)
        const asSprite = obj as THREE.Sprite
        if (asSprite.isSprite && asSprite.material?.map) {
          asSprite.material.map.offset.set(ox, oy)
          asSprite.material.map.needsUpdate = true
        }
        // THREE.Mesh (flat plane)
        const asMesh = obj as THREE.Mesh
        if (asMesh.isMesh) {
          const mat = asMesh.material as THREE.MeshBasicMaterial
          if (mat?.map) {
            mat.map.offset.set(ox, oy)
            mat.map.needsUpdate = true
          }
        }
      }
    }
  }

  // ─── Scripting ─────────────────────────────────────────────────

  private _compileScripts(): string[] {
    const errors: string[] = []
    this._compiledScripts.clear()

    for (const entity of this._entities.values()) {
      const scriptComp = entity.getComponent('script')
      if (!scriptComp) continue
      const source = (scriptComp.data.source as string) || ''
      if (!source.trim()) continue

      try {
        const fn = new Function(
          'entity', 'engine', 'THREE', 'keyDown', 'keyPressed',
          `"use strict";
          const __exports = {};
          ${source}
          return __exports;`
        )
        const exports = fn(entity, this, THREE, this._keyDown, this._keyPressed)
        this._compiledScripts.set(entity.id, exports)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${entity.name}] ${msg}`)
        console.error(`[Script:${entity.name}]`, msg)
      }
    }
    return errors
  }

  private _startScripts(): void {
    for (const [id, script] of this._compiledScripts) {
      try {
        script.onStart?.()
      } catch (err) {
        console.error(`[Script:${this._entities.get(id)?.name}] onStart error:`, err)
      }
    }
  }

  private _updateScripts(dt: number): void {
    for (const [id, script] of this._compiledScripts) {
      try {
        script.onUpdate?.(dt)
      } catch (err) {
        console.error(`[Script:${this._entities.get(id)?.name}] onUpdate error:`, err)
      }
    }
  }

  // ─── Events ────────────────────────────────────────────────────

  on(event: EngineEvent, fn: (data: unknown) => void): void {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }

  off(event: EngineEvent, fn: (data: unknown) => void): void {
    this._listeners[event] = (this._listeners[event] || []).filter((f) => f !== fn)
  }

  private _emit(event: EngineEvent, data: unknown): void {
    for (const fn of this._listeners[event] || []) {
      try { fn(data) } catch (e) { console.error(e) }
    }
  }

  // Cleanup
  dispose(): void {
    this.stop()
    this.skybox?.dispose()
    this.postProcessing?.dispose()
    this.renderer.dispose()
    this.orbitControls.dispose()
    this.transformControls.dispose()
  }
}
