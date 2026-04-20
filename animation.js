// ─── animation.js ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

export class AnimationSystem {
  constructor(scene) {
    this._scene   = scene;       // THREE.Scene
    this._mixers  = new Map();   // entityId -> THREE.AnimationMixer
    this._clips   = new Map();   // entityId -> Map<clipName, AnimationClip>
    this._helpers = new Map();   // entityId -> THREE.SkeletonHelper
  }

  // Called when a GLTF is attached to an entity
  attach(entity, gltfScene, gltfAnimations) {
    const mixer = new THREE.AnimationMixer(gltfScene);
    this._mixers.set(entity.id, mixer);

    const clipMap = new Map();
    for (const clip of (gltfAnimations || [])) {
      clipMap.set(clip.name, clip);
    }
    this._clips.set(entity.id, clipMap);

    // Update animator component with available clip names
    const ac = entity.getComponent('animator');
    if (ac) ac.availableClips = [...clipMap.keys()];

    // SkeletonHelper
    const helper = new THREE.SkeletonHelper(gltfScene);
    helper.visible = ac?.showSkeleton ?? false;
    this._scene.add(helper);
    this._helpers.set(entity.id, helper);

    // Auto-play first clip if any
    if (clipMap.size > 0) {
      const firstName = clipMap.keys().next().value;
      this.play(entity.id, firstName);
    }
  }

  play(entityId, clipName, loop = true) {
    const mixer = this._mixers.get(entityId);
    const clips = this._clips.get(entityId);
    if (!mixer || !clips) return;
    const clip = clips.get(clipName);
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    if (!loop) action.clampWhenFinished = true;
    action.reset().play();
  }

  stop(entityId, clipName) {
    const mixer = this._mixers.get(entityId);
    const clips = this._clips.get(entityId);
    if (!mixer || !clips) return;
    const clip = clips.get(clipName);
    if (clip) mixer.clipAction(clip).stop();
  }

  crossFade(entityId, fromClip, toClip, duration = 0.3) {
    const mixer = this._mixers.get(entityId);
    const clips = this._clips.get(entityId);
    if (!mixer || !clips) return;
    const from = mixer.clipAction(clips.get(fromClip));
    const to   = mixer.clipAction(clips.get(toClip));
    if (!from || !to) return;
    to.reset();
    from.crossFadeTo(to, duration, true);
    to.play();
  }

  showSkeleton(entityId, visible) {
    const h = this._helpers.get(entityId);
    if (h) h.visible = visible;
    const ac = this._findEntityComp(entityId);
    if (ac) ac.showSkeleton = visible;
  }

  getClipNames(entityId) {
    return [...(this._clips.get(entityId)?.keys() || [])];
  }

  update(dt) {
    for (const mixer of this._mixers.values()) {
      mixer.update(dt);
    }
  }

  detach(entityId) {
    const mixer = this._mixers.get(entityId);
    if (mixer) mixer.stopAllAction();
    this._mixers.delete(entityId);
    this._clips.delete(entityId);
    const h = this._helpers.get(entityId);
    if (h) { this._scene.remove(h); this._helpers.delete(entityId); }
  }

  reset() {
    for (const [id] of this._mixers) this.detach(id);
  }

  _findEntityComp(entityId) { return null; } // Overridden by engine if needed
}
