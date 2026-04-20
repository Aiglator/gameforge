/**
 * Skybox.ts
 * Procedural sky via Three.js Sky shader + PMREMGenerator for PBR env lighting.
 */

import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'

export type SkyPreset = 'day' | 'sunset' | 'night' | 'overcast'

export interface SkySettings {
  preset: SkyPreset
  sunElevation?: number   // degrees 0–90
  turbidity?: number
  rayleigh?: number
  exposure?: number
}

const PRESET_DEFAULTS: Record<SkyPreset, Required<SkySettings>> = {
  day: {
    preset: 'day',
    sunElevation: 45,
    turbidity: 10,
    rayleigh: 0.5,
    exposure: 0.5,
  },
  sunset: {
    preset: 'sunset',
    sunElevation: 4,
    turbidity: 20,
    rayleigh: 4,
    exposure: 0.35,
  },
  night: {
    preset: 'night',
    sunElevation: -10,
    turbidity: 2,
    rayleigh: 0.1,
    exposure: 0.08,
  },
  overcast: {
    preset: 'overcast',
    sunElevation: 60,
    turbidity: 40,
    rayleigh: 0.2,
    exposure: 0.4,
  },
}

export class Skybox {
  private _renderer: THREE.WebGLRenderer
  private _scene: THREE.Scene
  private _sky: Sky | null = null
  private _pmremGenerator: THREE.PMREMGenerator
  private _currentPreset: SkyPreset | null = null

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this._renderer = renderer
    this._scene    = scene
    this._pmremGenerator = new THREE.PMREMGenerator(renderer)
    this._pmremGenerator.compileEquirectangularShader()
  }

  apply(settings: SkySettings = { preset: 'day' }): void {
    const s = { ...PRESET_DEFAULTS[settings.preset], ...settings }

    if (settings.preset === 'night') {
      this._removeSky()
      this._scene.background = new THREE.Color('#020408')
      this._scene.environment = null
      this._renderer.toneMappingExposure = s.exposure
      this._currentPreset = 'night'
      return
    }

    // Skip rebuild if same preset
    if (this._sky && this._currentPreset === settings.preset) return

    this._removeSky()

    const sky = new Sky()
    sky.scale.setScalar(450000)
    this._scene.add(sky)
    this._sky = sky

    const uniforms = sky.material.uniforms as Record<string, THREE.IUniform>
    uniforms['turbidity'].value  = s.turbidity
    uniforms['rayleigh'].value   = s.rayleigh
    uniforms['mieCoefficient'].value = 0.005
    uniforms['mieDirectionalG'].value = 0.7

    // Sun direction from elevation angle
    const phi   = THREE.MathUtils.degToRad(90 - s.sunElevation)
    const theta = THREE.MathUtils.degToRad(180)
    const sunDir = new THREE.Vector3()
    sunDir.setFromSphericalCoords(1, phi, theta)
    uniforms['sunPosition'].value.copy(sunDir)

    // Generate env map for PBR lighting
    const renderTarget = this._pmremGenerator.fromScene(sky as unknown as THREE.Scene)
    this._scene.environment = renderTarget.texture
    this._scene.background  = renderTarget.texture

    this._renderer.toneMappingExposure = s.exposure
    this._currentPreset = settings.preset
  }

  remove(): void {
    this._removeSky()
    this._scene.background  = new THREE.Color('#070e1d')
    this._scene.environment = null
    this._currentPreset = null
  }

  dispose(): void {
    this._pmremGenerator.dispose()
    this.remove()
  }

  private _removeSky(): void {
    if (this._sky) {
      this._scene.remove(this._sky)
      this._sky.geometry.dispose()
      this._sky.material.dispose()
      this._sky = null
    }
  }
}
