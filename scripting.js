// ─── scripting.js ─────────────────────────────────────────────────────────────
// Sandbox de scripting : new Function() + API gelée

import * as THREE from 'three';

export class Scripting {
  constructor() {
    this._hooks = new Map();     // entityId -> { onStart, onUpdate, onCollision }
    this._keysDown = new Set();
    this._keysPressed = new Set();
    this._physics = null;        // set by Engine
    this._animLib = null;        // set by Engine

    // Bind keyboard listeners
    window.addEventListener('keydown', e => {
      if (!this._keysDown.has(e.code)) this._keysPressed.add(e.code);
      this._keysDown.add(e.code);
      // Prevent arrow keys from scrolling page
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this._keysDown.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this._keysDown.clear();
      this._keysPressed.clear();
    });
  }

  setPhysics(physics)   { this._physics  = physics;  }
  setAnimLib(animLib)   { this._animLib  = animLib;  }

  // Compile and store script hooks for an entity
  // Returns { success: true } or { success: false, error: string }
  compile(entity) {
    const sc = entity.getComponent('script');
    if (!sc) return { success: false, error: 'Pas de ScriptComponent' };
    try {
      // Pas de "use strict" ni de let pré-déclarés : les function declarations
      // de l'utilisateur (function onStart, onUpdate, onCollision) sont hoistées
      // normalement dans la portée de la Function.
      const fn = new Function('THREE', `
        ${sc.source}
        return {
          onStart:    typeof onStart    === 'function' ? onStart    : null,
          onUpdate:   typeof onUpdate   === 'function' ? onUpdate   : null,
          onCollision:typeof onCollision=== 'function' ? onCollision: null,
        };
      `);
      const hooks = fn(THREE);
      this._hooks.set(entity.id, hooks);
      return { success: true };
    } catch (err) {
      this._hooks.delete(entity.id);
      return { success: false, error: err.message };
    }
  }

  // Compile all entities that have a ScriptComponent
  compileAll(entities) {
    const errors = [];
    for (const e of entities) {
      if (e.hasComponent('script')) {
        const r = this.compile(e);
        if (!r.success) errors.push({ entity: e.name, error: r.error });
      }
    }
    return errors;
  }

  // Call onStart for all entities
  startAll(entities) {
    for (const entity of entities) {
      const hooks = this._hooks.get(entity.id);
      if (!hooks?.onStart) continue;
      try {
        hooks.onStart(this._makeAPI(entity), entity);
      } catch (err) {
        console.warn(`[Script:${entity.name}] onStart erreur:`, err);
      }
    }
  }

  // Update loop
  update(dt, entities) {
    for (const entity of entities) {
      const hooks = this._hooks.get(entity.id);
      if (!hooks?.onUpdate) continue;
      try {
        hooks.onUpdate(this._makeAPI(entity), entity, dt);
      } catch (err) {
        console.warn(`[Script:${entity.name}] onUpdate erreur:`, err);
      }
    }
    // Clear "pressed this frame" keys
    this._keysPressed.clear();
  }

  fireCollision(entityA, entityB) {
    const hooks = this._hooks.get(entityA.id);
    if (!hooks?.onCollision) return;
    try {
      hooks.onCollision(this._makeAPI(entityA), entityA, entityB);
    } catch (err) {
      console.warn(`[Script:${entityA.name}] onCollision erreur:`, err);
    }
  }

  reset() {
    this._hooks.clear();
    this._keysDown.clear();
    this._keysPressed.clear();
  }

  // ─── Private: build API object per entity ───────────────────────────────────
  _makeAPI(entity) {
    const physics = this._physics;
    const animLib = this._animLib;
    const keysDown = this._keysDown;
    const keysPressed = this._keysPressed;

    return Object.freeze({
      input: Object.freeze({
        isKeyDown:    (code) => keysDown.has(code),
        isKeyPressed: (code) => keysPressed.has(code),
      }),
      physics: Object.freeze({
        applyImpulse: (force) => physics?.applyImpulse(entity.id, force),
        setVelocity:  (vel)   => physics?.setVelocity(entity.id, vel),
        getVelocity:  ()      => physics?.getVelocity(entity.id) ?? { x:0, y:0, z:0 },
        isGrounded:   ()      => physics?.isGrounded(entity.id) ?? false,
      }),
      // ── Bibliothèque d'animations par frames ──────────────────────────────
      anim: Object.freeze({
        // Jouer une catégorie par son nom (ex: api.anim.play('courir'))
        play:       (name, onEnd) => animLib?.play(entity.id, name, entity, onEnd),
        // Arrêter l'animation en cours
        stop:       ()            => animLib?.stop(entity.id),
        // Mettre en pause / reprendre
        pause:      ()            => animLib?.pause(entity.id),
        resume:     ()            => animLib?.resume(entity.id),
        // Vérifier si une anim est active
        isPlaying:  (name)        => animLib?.isPlaying(entity.id, name) ?? false,
        // Nom de l'animation courante
        current:    ()            => animLib?.getCurrentAnim(entity.id) ?? null,
      }),
      math: Object.freeze({
        lerp:      (a, b, t)  => a + (b - a) * t,
        clamp:     (v, mn, mx) => Math.min(mx, Math.max(mn, v)),
        degToRad:  (d)        => d * Math.PI / 180,
        radToDeg:  (r)        => r * 180 / Math.PI,
        random:    (mn = 0, mx = 1) => mn + Math.random() * (mx - mn),
        sin: Math.sin, cos: Math.cos, abs: Math.abs, floor: Math.floor, round: Math.round,
      }),
      log: (...args) => console.log(`[Script:${entity.name}]`, ...args),
    });
  }
}
