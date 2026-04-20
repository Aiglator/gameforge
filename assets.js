// ─── assets.js ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    this._cache   = new Map();
    this._gltf    = new GLTFLoader();
    this._texture = new THREE.TextureLoader();
  }

  async loadGLTF(url) {
    if (this._cache.has(url)) return this._cache.get(url);
    return new Promise((resolve, reject) => {
      this._gltf.load(
        url,
        gltf => { this._cache.set(url, gltf); resolve(gltf); },
        undefined,
        err  => reject(err)
      );
    });
  }

  async loadTexture(url) {
    if (this._cache.has(url)) return this._cache.get(url);
    return new Promise((resolve, reject) => {
      this._texture.load(
        url,
        tex => { this._cache.set(url, tex); resolve(tex); },
        undefined,
        err => reject(err)
      );
    });
  }

  getAsset(url) { return this._cache.get(url) || null; }
  clearCache()  { this._cache.clear(); }
}
