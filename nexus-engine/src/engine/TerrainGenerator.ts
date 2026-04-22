/**
 * TerrainGenerator.ts
 * Procedural terrain via FBM value-noise heightmap — TypeScript port of worldgen.js
 * Works directly with a THREE.Scene (no legacy renderer dependency).
 */

import * as THREE from 'three'
import type { TerrainTheme } from './types'

export interface TerrainParams {
  width?: number
  depth?: number
  height?: number
  scale?: number
  octaves?: number
  seed?: number
  theme?: TerrainTheme
  treeCount?: number
  ruinCount?: number
  decorSprites?: string[]
  decorCount?: number
}

export interface TerrainResult {
  seed: number
  mesh: THREE.Mesh
  decorations: THREE.Object3D[]
  heightData: Float32Array   // row-major, segments×segments, for Cannon-es Heightfield
  segments: number
  getHeightAt: (wx: number, wz: number) => number
}

// ── Theme color map ──────────────────────────────────────────────────────────
const THEME_COLOR: Record<TerrainTheme, number> = {
  plains:   0x4a7c35,
  desert:   0xc2954a,
  snow:     0xd0dce8,
  volcanic: 0x3a1a0a,
  dungeon:  0x2a2535,
}

// ── Pure noise helpers (static, deterministic) ───────────────────────────────

function _hash(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.9) * 43758.5453123
  return n - Math.floor(n)
}

function _smoothstep(t: number): number { return t * t * (3 - 2 * t) }
function _lerp(a: number, b: number, t: number): number { return a + t * (b - a) }

function _valueNoise(x: number, z: number, seed: number): number {
  const xi = Math.floor(x), zi = Math.floor(z)
  const xf = x - xi,        zf = z - zi
  const ux = _smoothstep(xf), uz = _smoothstep(zf)
  return _lerp(
    _lerp(_hash(xi,     zi,     seed), _hash(xi + 1, zi,     seed), ux),
    _lerp(_hash(xi,     zi + 1, seed), _hash(xi + 1, zi + 1, seed), ux),
    uz,
  )
}

/** Fractional Brownian Motion — returns [0, 1] */
function _fbm(x: number, z: number, octaves: number, seed: number): number {
  let v = 0, amp = 1, freq = 1, sum = 0
  for (let i = 0; i < octaves; i++) {
    v   += _valueNoise(x * freq, z * freq, seed + i * 137) * amp
    sum += amp
    amp  *= 0.5
    freq *= 2.1
  }
  return v / sum
}

// ── TerrainGenerator ─────────────────────────────────────────────────────────

export class TerrainGenerator {
  private _scene: THREE.Scene
  private _lastMesh: THREE.Mesh | null = null
  private _lastDecorations: THREE.Object3D[] = []

  constructor(scene: THREE.Scene) {
    this._scene = scene
  }

  /** Remove previously generated terrain + decorations from the scene */
  clearLast(): void {
    if (this._lastMesh) {
      this._scene.remove(this._lastMesh)
      this._lastMesh.geometry.dispose()
      ;(this._lastMesh.material as THREE.Material).dispose()
      this._lastMesh = null
    }
    for (const obj of this._lastDecorations) this._scene.remove(obj)
    this._lastDecorations = []
  }

  generate(params: TerrainParams = {}): TerrainResult {
    const {
      width     = 80,
      depth     = 80,
      height    = 14,
      scale     = 0.07,
      octaves   = 5,
      seed      = Math.floor(Math.random() * 99999),
      theme     = 'plains',
      treeCount = 40,
      ruinCount = 10,
      decorSprites = [],
      decorCount = 0,
    } = params

    this.clearLast()

    // ── Heightmap ────────────────────────────────────────────────────────────
    const segments = Math.min(Math.max(Math.floor(width), 32), 128)
    const geo      = new THREE.PlaneGeometry(width, depth, segments - 1, segments - 1)
    geo.rotateX(-Math.PI / 2)

    const edgeFade = (x: number, z: number) => {
      const fx = Math.max(0, 1 - (Math.abs(x) / (width  * 0.5)) ** 3)
      const fz = Math.max(0, 1 - (Math.abs(z) / (depth  * 0.5)) ** 3)
      return fx * fz
    }

    const getHeightAt = (wx: number, wz: number): number =>
      _fbm(wx * scale, wz * scale, octaves, seed) * height * edgeFade(wx, wz)

    // Displace vertices
    const pos = geo.attributes.position as THREE.BufferAttribute
    const heightData = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i)
      const wz = pos.getZ(i)
      const h  = getHeightAt(wx, wz)
      pos.setY(i, h)
      heightData[i] = h
    }
    geo.computeVertexNormals()

    const mat  = new THREE.MeshStandardMaterial({ color: THEME_COLOR[theme], roughness: 0.9, metalness: 0 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    mesh.name = '__terrain'
    this._scene.add(mesh)
    this._lastMesh = mesh

    // ── Decorations ──────────────────────────────────────────────────────────
    let decorations: THREE.Object3D[] = []

    if (theme === 'plains') {
      decorations = [
        ...this._buildTrees(treeCount, width, depth, getHeightAt, seed),
        ...this._buildRocks(10, width, depth, getHeightAt, seed + 9999),
      ]
    } else if (theme === 'desert') {
      decorations = [
        ...this._buildDesertRocks(treeCount, width, depth, getHeightAt, seed),
        ...this._buildRocks(8, width, depth, getHeightAt, seed + 3333),
      ]
    } else if (theme === 'snow') {
      decorations = [
        ...this._buildSnowPines(treeCount, width, depth, getHeightAt, seed),
        ...this._buildRocks(12, width, depth, getHeightAt, seed + 7777),
      ]
    } else if (theme === 'volcanic') {
      decorations = [
        ...this._buildVolcanicSpires(treeCount, width, depth, getHeightAt, seed),
        ...this._buildRocks(20, width, depth, getHeightAt, seed + 1234),
      ]
    } else if (theme === 'dungeon') {
      decorations = [
        ...this._buildPillars(treeCount, width, depth, getHeightAt, seed),
        ...this._buildRuins(ruinCount, width, depth, getHeightAt, seed + 5000),
      ]
    }

    // Add custom decor sprites
    if (decorSprites.length > 0 && decorCount > 0) {
      decorations.push(...this._buildSprites(decorCount, width, depth, getHeightAt, seed + 888, decorSprites))
    }

    for (const d of decorations) this._scene.add(d)
    this._lastDecorations = decorations

    return { seed, mesh, decorations, heightData, segments, getHeightAt }
  }

  // ── Decoration builders ──────────────────────────────────────────────────

  private _buildTrees(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e })
    const leafMat  = new THREE.MeshLambertMaterial({ color: 0x2d6a2d })
    for (let i = 0; i < n; i++) {
      const x  = (_hash(i, 0, seed) - 0.5) * (W - 6)
      const z  = (_hash(i, 1, seed) - 0.5) * (D - 6)
      const h  = getH(x, z)
      const th = 2.5 + _hash(i, 2, seed) * 2
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, th, 6), trunkMat)
      trunk.position.set(x, h + th / 2, z)
      trunk.castShadow = true
      objs.push(trunk)
      const cr    = 1.2 + _hash(i, 3, seed) * 1.5
      const crown = new THREE.Mesh(new THREE.ConeGeometry(cr, cr * 2, 6), leafMat)
      crown.position.set(x, h + th + cr, z)
      crown.castShadow = true
      objs.push(crown)
    }
    return objs
  }

  private _buildDesertRocks(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const mat = new THREE.MeshLambertMaterial({ color: 0xa07040 })
    for (let i = 0; i < n; i++) {
      const x  = (_hash(i, 0, seed) - 0.5) * (W - 6)
      const z  = (_hash(i, 1, seed) - 0.5) * (D - 6)
      const h  = getH(x, z)
      const rx = 0.5 + _hash(i, 2, seed) * 1.5
      const ry = 1.5 + _hash(i, 3, seed) * 3
      const rz = 0.5 + _hash(i, 4, seed) * 1.5
      const rock = new THREE.Mesh(new THREE.BoxGeometry(rx, ry, rz), mat)
      rock.position.set(x, h + ry / 2, z)
      rock.rotation.y = _hash(i, 5, seed) * Math.PI * 2
      rock.castShadow = rock.receiveShadow = true
      objs.push(rock)
    }
    return objs
  }

  private _buildSnowPines(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 })
    const snowMat  = new THREE.MeshLambertMaterial({ color: 0xe8f0f8 })
    const leafMat  = new THREE.MeshLambertMaterial({ color: 0x1a4a1a })
    for (let i = 0; i < n; i++) {
      const x  = (_hash(i, 0, seed) - 0.5) * (W - 6)
      const z  = (_hash(i, 1, seed) - 0.5) * (D - 6)
      const h  = getH(x, z)
      const th = 3 + _hash(i, 2, seed) * 3
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, th, 5), trunkMat)
      trunk.position.set(x, h + th / 2, z)
      trunk.castShadow = true
      objs.push(trunk)
      // Layered cones
      for (let l = 0; l < 3; l++) {
        const ly  = h + th * (0.35 + l * 0.2)
        const cr  = (1.2 - l * 0.3) + _hash(i, l + 3, seed) * 0.4
        const cone = new THREE.Mesh(new THREE.ConeGeometry(cr, cr * 1.8, 6), l === 0 ? leafMat : snowMat)
        cone.position.set(x, ly, z)
        cone.castShadow = true
        objs.push(cone)
      }
    }
    return objs
  }

  private _buildVolcanicSpires(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const mat = new THREE.MeshLambertMaterial({ color: 0x1a0a05 })
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff3300 })
    for (let i = 0; i < n; i++) {
      const x  = (_hash(i, 0, seed) - 0.5) * (W - 6)
      const z  = (_hash(i, 1, seed) - 0.5) * (D - 6)
      const h  = getH(x, z)
      const sh = 3 + _hash(i, 2, seed) * 8
      const sr = 0.2 + _hash(i, 3, seed) * 0.5
      const spire = new THREE.Mesh(new THREE.ConeGeometry(sr, sh, 5), mat)
      spire.position.set(x, h + sh / 2, z)
      spire.castShadow = true
      objs.push(spire)
      // Lava glow at base
      if (_hash(i, 4, seed) > 0.6) {
        const glow = new THREE.Mesh(new THREE.SphereGeometry(sr * 0.8, 6, 6), glowMat)
        glow.position.set(x, h + 0.3, z)
        objs.push(glow)
      }
    }
    return objs
  }

  private _buildPillars(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a3040 })
    for (let i = 0; i < n; i++) {
      const x  = (_hash(i, 0, seed) - 0.5) * (W - 6)
      const z  = (_hash(i, 1, seed) - 0.5) * (D - 6)
      const h  = getH(x, z)
      const ph = 4 + _hash(i, 2, seed) * 6
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, ph, 0.8), mat)
      pillar.position.set(x, h + ph / 2, z)
      pillar.castShadow = pillar.receiveShadow = true
      objs.push(pillar)
    }
    return objs
  }

  private _buildRuins(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const colors = [0x5a5a5a, 0x4a4040, 0x3a3a3a, 0x504848]
    for (let i = 0; i < n; i++) {
      const bx = (_hash(i, 0, seed) - 0.5) * (W - 10)
      const bz = (_hash(i, 1, seed) - 0.5) * (D - 10)
      const bh = getH(bx, bz)
      const wallCount = 2 + Math.floor(_hash(i, 2, seed) * 3)
      for (let w = 0; w < wallCount; w++) {
        const wh  = 1.5 + _hash(i * 13 + w, 0, seed) * 3
        const ww  = 2   + _hash(i * 13 + w, 1, seed) * 5
        const wd  = 0.25 + _hash(i * 13 + w, 2, seed) * 0.25
        const ang = (w / wallCount) * Math.PI * 2 + _hash(i, w + 10, seed) * 0.4
        const col = colors[Math.floor(_hash(i, w + 20, seed) * colors.length)]
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(ww, wh, wd),
          new THREE.MeshLambertMaterial({ color: col }),
        )
        wall.position.set(
          bx + Math.cos(ang) * (2 + _hash(i, w + 30, seed) * 2),
          bh + wh / 2,
          bz + Math.sin(ang) * (2 + _hash(i, w + 40, seed) * 2),
        )
        wall.rotation.y = ang + (_hash(i, w + 50, seed) - 0.5) * 0.5
        wall.castShadow = wall.receiveShadow = true
        objs.push(wall)
      }
    }
    return objs
  }

  private _buildRocks(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number): THREE.Object3D[] {
    const objs: THREE.Object3D[] = []
    const mat = new THREE.MeshLambertMaterial({ color: 0x505050 })
    for (let i = 0; i < n; i++) {
      const x = (_hash(i, 0, seed + 77) - 0.5) * (W - 4)
      const z = (_hash(i, 1, seed + 77) - 0.5) * (D - 4)
      const h = getH(x, z)
      const s = 0.4 + _hash(i, 2, seed + 77) * 1.2
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat)
      rock.position.set(x, h + s * 0.5, z)
      rock.rotation.set(
        _hash(i, 3, seed + 77) * Math.PI,
        _hash(i, 4, seed + 77) * Math.PI,
        _hash(i, 5, seed + 77) * Math.PI,
      )
      rock.castShadow = rock.receiveShadow = true
      objs.push(rock)
    }
    return objs
  }

  private _buildSprites(n: number, W: number, D: number, getH: (x: number, z: number) => number, seed: number, urls: string[]): THREE.Object3D[] {
    const validUrls = urls.filter(u => u && u.trim() !== '')
    if (validUrls.length === 0) return []
    
    const objs: THREE.Object3D[] = []
    const loader = new THREE.TextureLoader()
    const textures = validUrls.map(url => {
      const tex = loader.load(url)
      tex.colorSpace = THREE.SRGBColorSpace
      return tex
    })

    for (let i = 0; i < n; i++) {
      const x = (_hash(i, 0, seed) - 0.5) * (W - 4)
      const z = (_hash(i, 1, seed) - 0.5) * (D - 4)
      const h = getH(x, z)
      
      const texIndex = Math.floor(_hash(i, 2, seed) * textures.length)
      const mat = new THREE.SpriteMaterial({ map: textures[texIndex], transparent: true })
      const sprite = new THREE.Sprite(mat)
      
      const s = 1.5 + _hash(i, 3, seed) * 2
      sprite.scale.set(s, s, 1)
      sprite.position.set(x, h + s * 0.5, z)
      objs.push(sprite)
    }
    return objs
  }
}
