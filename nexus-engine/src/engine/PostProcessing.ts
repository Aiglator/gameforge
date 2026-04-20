/**
 * PostProcessing.ts
 * Three.js EffectComposer pipeline: Bloom + FXAA (+ optional SSAO).
 */

import * as THREE from 'three'
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader }      from 'three/addons/shaders/FXAAShader.js'

export interface PostProcessingOptions {
  bloom: boolean
  bloomStrength: number    // 0–3,   default 0.4
  bloomRadius: number      // 0–1,   default 0.5
  bloomThreshold: number   // 0–1,   default 0.85
  fxaa: boolean
}

const DEFAULTS: PostProcessingOptions = {
  bloom: true,
  bloomStrength: 0.4,
  bloomRadius: 0.5,
  bloomThreshold: 0.85,
  fxaa: true,
}

export class PostProcessing {
  composer: EffectComposer

  private _renderer: THREE.WebGLRenderer
  private _scene:    THREE.Scene
  private _camera:   THREE.PerspectiveCamera
  private _bloomPass: UnrealBloomPass | null = null
  private _fxaaPass:  ShaderPass | null = null
  private _options:   PostProcessingOptions = { ...DEFAULTS }

  constructor(
    renderer: THREE.WebGLRenderer,
    scene:    THREE.Scene,
    camera:   THREE.PerspectiveCamera,
  ) {
    this._renderer = renderer
    this._scene    = scene
    this._camera   = camera
    this.composer  = new EffectComposer(renderer)
    this.apply(DEFAULTS)
  }

  apply(options: Partial<PostProcessingOptions> = {}): void {
    this._options = { ...DEFAULTS, ...options }
    this._rebuild()
  }

  /** Update bloom strength only (cheap, no full rebuild) */
  setBloomStrength(v: number): void {
    this._options.bloomStrength = v
    if (this._bloomPass) this._bloomPass.strength = v
  }

  render(): void {
    this.composer.render()
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h)
    if (this._fxaaPass) {
      const uniforms = this._fxaaPass.material.uniforms as Record<string, THREE.IUniform>
      uniforms['resolution'].value.set(
        1 / (w * this._renderer.getPixelRatio()),
        1 / (h * this._renderer.getPixelRatio()),
      )
    }
  }

  dispose(): void {
    this.composer.dispose()
  }

  private _rebuild(): void {
    this.composer.passes = []
    this._bloomPass = null
    this._fxaaPass  = null

    // 1. Base render
    this.composer.addPass(new RenderPass(this._scene, this._camera))

    // 2. Bloom
    if (this._options.bloom) {
      const size = new THREE.Vector2(
        this._renderer.domElement.clientWidth,
        this._renderer.domElement.clientHeight,
      )
      const bloom = new UnrealBloomPass(
        size,
        this._options.bloomStrength,
        this._options.bloomRadius,
        this._options.bloomThreshold,
      )
      this.composer.addPass(bloom)
      this._bloomPass = bloom
    }

    // 3. FXAA anti-aliasing
    if (this._options.fxaa) {
      const fxaa = new ShaderPass(FXAAShader)
      const w = this._renderer.domElement.clientWidth  * this._renderer.getPixelRatio()
      const h = this._renderer.domElement.clientHeight * this._renderer.getPixelRatio()
      ;(fxaa.material.uniforms as Record<string, THREE.IUniform>)['resolution'].value.set(1 / w, 1 / h)
      this.composer.addPass(fxaa)
      this._fxaaPass = fxaa
    }

    // 4. Output (tone mapping + color space)
    this.composer.addPass(new OutputPass())
  }
}
