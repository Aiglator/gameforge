// ─── animlib.js ────────────────────────────────────────────────────────────────
// Bibliothèque d'animations par frames (sprite sheets) pour personnages 2D/3D.
// Fonctionne en mettant à jour directement material.map sans reconstruire l'objet3D.

import * as THREE from 'three';

export class SpriteAnimationSystem {
  constructor() {
    // entityId -> { anim: string, frame: number, elapsed: number, playing: bool, onEnd: fn|null }
    this._states   = new Map();
    // url -> THREE.Texture (cache partagé)
    this._texCache = new Map();
  }

  // ── Texture cache ────────────────────────────────────────────────────────────
  _getTex(url) {
    if (!this._texCache.has(url)) {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      this._texCache.set(url, t);
    }
    return this._texCache.get(url);
  }

  // Précharger toutes les textures d'un AnimationLibraryComponent
  preload(alc) {
    for (const cat of Object.values(alc.categories)) {
      for (const url of cat.frames) this._getTex(url);
    }
  }

  // ── Contrôle ─────────────────────────────────────────────────────────────────
  play(entityId, animName, entity, onEnd = null) {
    const alc = entity?.getComponent('animlib');
    if (!alc || !alc.categories[animName]) return;
    // Ne rien faire si c'est déjà en cours
    const cur = this._states.get(entityId);
    if (cur?.anim === animName && cur?.playing) return;
    this._states.set(entityId, { anim: animName, frame: 0, elapsed: 0, playing: true, onEnd });
    this._applyFrame(entity, alc.categories[animName].frames[0]);
  }

  stop(entityId) {
    const s = this._states.get(entityId);
    if (s) s.playing = false;
  }

  pause(entityId) {
    const s = this._states.get(entityId);
    if (s) s.playing = false;
  }

  resume(entityId) {
    const s = this._states.get(entityId);
    if (s) s.playing = true;
  }

  isPlaying(entityId, animName) {
    const s = this._states.get(entityId);
    return !!(s?.playing && s.anim === animName);
  }

  getCurrentAnim(entityId) {
    return this._states.get(entityId)?.anim ?? null;
  }

  // ── Update loop ───────────────────────────────────────────────────────────────
  update(dt, entities) {
    for (const entity of entities) {
      const alc = entity.getComponent('animlib');
      if (!alc) continue;
      const state = this._states.get(entity.id);
      if (!state?.playing) continue;

      const cat = alc.categories[state.anim];
      if (!cat || !cat.frames.length) continue;

      state.elapsed += dt;
      const frameDuration = 1 / Math.max(1, cat.fps);

      if (state.elapsed >= frameDuration) {
        state.elapsed -= frameDuration;
        state.frame++;

        if (state.frame >= cat.frames.length) {
          if (cat.loop) {
            state.frame = 0;
          } else {
            state.frame = cat.frames.length - 1;
            state.playing = false;
            if (state.onEnd) try { state.onEnd(); } catch(e) { /* ignore */ }
            continue;
          }
        }
        this._applyFrame(entity, cat.frames[state.frame]);
      }
    }
  }

  // ── Frame application ─────────────────────────────────────────────────────────
  _applyFrame(entity, url) {
    if (!url || !entity.object3D) return;
    const tex = this._getTex(url);
    entity.object3D.traverse(obj => {
      if (obj.material) {
        obj.material.map = tex;
        obj.material.needsUpdate = true;
      }
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  detach(entityId) {
    this._states.delete(entityId);
  }

  reset() {
    this._states.clear();
    // On garde le texCache pour ne pas recharger inutilement
  }

  clearCache() {
    for (const tex of this._texCache.values()) tex.dispose();
    this._texCache.clear();
  }
}
