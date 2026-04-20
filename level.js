// ─── level.js ─────────────────────────────────────────────────────────────────
// Gestionnaire de niveaux : création, chargement, sauvegarde, paramètres

import * as THREE from 'three';

let _lid = 1;

export class LevelManager {
  constructor(engine) {
    this._engine  = engine;
    this._levels  = new Map();   // id → LevelData
    this._current = null;        // id du niveau courant
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  createLevel(name) {
    const id = 'lv' + (_lid++);
    const lv = {
      id,
      name:     name || ('Niveau ' + (_lid - 1)),
      scene:    null,
      settings: this._defaultSettings(),
    };
    this._levels.set(id, lv);
    return lv;
  }

  deleteLevel(id) {
    this._levels.delete(id);
    if (this._current === id) this._current = null;
  }

  renameLevel(id, name) {
    const lv = this._levels.get(id);
    if (lv) lv.name = name;
  }

  getCurrentLevel() {
    return this._current ? this._levels.get(this._current) : null;
  }

  getAllLevels() {
    return [...this._levels.values()];
  }

  // ── Save / Load ─────────────────────────────────────────────────────────────

  /** Sauvegarde la scène courante dans le niveau courant. */
  saveCurrentLevel() {
    if (!this._current) return;
    const lv = this._levels.get(this._current);
    if (lv) lv.scene = this._engine.saveScene();
  }

  /** Charge un niveau dans le moteur (sauvegarde d'abord le niveau courant). */
  async loadLevel(id) {
    this.saveCurrentLevel();
    this._current = id;
    const lv = this._levels.get(id);
    if (!lv) return;

    this._applySettings(lv.settings);

    if (lv.scene) {
      await this._engine.loadScene(lv.scene);
    } else {
      // Niveau vide : supprimer toutes les entités
      for (const eid of [...this._engine._entities.keys()]) {
        this._engine.removeEntity(eid);
      }
    }
    this._engine._emit('levelLoaded', lv);
  }

  // ── Paramètres du niveau ────────────────────────────────────────────────────

  updateLevelSettings(id, patch) {
    const lv = this._levels.get(id);
    if (!lv) return;
    Object.assign(lv.settings, patch);
    if (this._current === id) this._applySettings(lv.settings);
  }

  _applySettings(s) {
    const r = this._engine.renderer;
    r.setAmbientLight(s.ambientColor ?? '#ffffff', s.ambientInt ?? 0.4);
    r.setSunLight(s.sunColor ?? '#ffffff', s.sunInt ?? 1.2, s.sunAzimuth ?? 45, s.sunElevation ?? 60);

    const fogHex = parseInt((s.fogColor || '#2a2a2e').replace('#', ''), 16);
    r.threeScene.fog        = new THREE.Fog(fogHex, s.fogNear ?? 30, s.fogFar ?? 80);
    r.threeScene.background = new THREE.Color(fogHex);

    if (this._engine.physics) {
      this._engine.physics.setGravity(s.gravity ?? -9.82);
    }
  }

  _defaultSettings() {
    return {
      gravity:       -9.82,
      ambientColor:  '#ffffff',  ambientInt:   0.4,
      sunColor:      '#ffffff',  sunInt:       1.2,
      sunAzimuth:    45,         sunElevation: 60,
      fogColor:      '#2a2a2e',  fogNear:      30,   fogFar: 80,
    };
  }

  // ── Sérialisation (projet complet) ──────────────────────────────────────────

  serialize() {
    this.saveCurrentLevel();
    return {
      current: this._current,
      levels:  [...this._levels.values()],
    };
  }

  async deserialize(data) {
    this._levels.clear();
    for (const lv of (data.levels || [])) {
      if (!lv.settings) lv.settings = this._defaultSettings();
      this._levels.set(lv.id, lv);
    }
    this._current = null;
    if (data.current && this._levels.has(data.current)) {
      await this.loadLevel(data.current);
    }
  }
}
