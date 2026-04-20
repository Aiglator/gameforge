// ─── engine.js ────────────────────────────────────────────────────────────────
import { Entity, MeshComponent, PhysicsComponent, ScriptComponent, AnimatorComponent, LightComponent, SpriteComponent, CameraComponent, AnimationLibraryComponent, BehaviorComponent, TriggerComponent } from './entity.js';
import { Renderer }       from './renderer.js';
import { Physics }        from './physics.js';
import { Scripting }      from './scripting.js';
import { AssetLoader }    from './assets.js';
import { AnimationSystem } from './animation.js';
import { SpriteAnimationSystem } from './animlib.js';
import { AISystem }       from './ai.js';
import { TriggerSystem }  from './trigger.js';
import { LevelManager }   from './level.js';
import { WorldGenerator } from './worldgen.js';

export class Engine {
  constructor(viewportEl) {
    this.renderer  = new Renderer(viewportEl);
    this.physics   = new Physics();
    this.scripting = new Scripting();
    this.assets    = new AssetLoader();
    this.anim      = new AnimationSystem(this.renderer.threeScene);
    this.animLib   = new SpriteAnimationSystem();
    this.ai        = new AISystem();
    this.triggers  = new TriggerSystem();
    this.levels    = new LevelManager(this);
    this.worldgen  = new WorldGenerator(this);

    this.scripting.setPhysics(this.physics);
    this.scripting.setAnimLib(this.animLib);
    this.mode = '3d';

    this._entities = new Map();   // id -> Entity
    this._running  = false;
    this._frameId  = null;
    this._lastTime = 0;
    this._frameCount = 0;
    this._fpsTime  = 0;
    this._fps      = 0;

    // Events
    this._listeners = {};
  }

  // ─── Entity management ───────────────────────────────────────────────────────

  addEntity(entity) {
    this._entities.set(entity.id, entity);
    // Build Three.js object if not already set
    if (!entity.object3D) {
      entity.object3D = this.renderer.buildObject3D(entity, this.assets);
    }
    entity.object3D.name = entity.name;
    this._syncTransform(entity);
    this.renderer.addToScene(entity.object3D);
    // Create Cannon-es body if entity has PhysicsComponent
    if (entity.hasComponent('physics')) {
      this.physics.addBody(entity);
    }
    this._emit('entityAdded', entity);
    return entity;
  }

  removeEntity(id) {
    const entity = this._entities.get(id);
    if (!entity) return;
    if (entity.object3D) this.renderer.removeFromScene(entity.object3D);
    this.physics.removeBody(id);
    this.anim.detach(id);
    this.animLib.detach(id);
    this._entities.delete(id);
    this._emit('entityRemoved', id);
  }

  getEntity(id)   { return this._entities.get(id) || null; }
  getAllEntities() { return [...this._entities.values()]; }

  createPrimitive(type, name) {
    const e = new Entity(name || type);
    if (type === 'cube' || type === 'sphere' || type === 'cylinder') {
      const mc = new MeshComponent();
      mc.primitiveType = type === 'cube' ? 'box' : type;
      e.addComponent(mc);
      const pc = new PhysicsComponent();
      pc.halfExtents = { x: 0.5, y: 0.5, z: 0.5 };
      e.addComponent(pc);
      e.position.y = 1;
    } else if (type === 'plane') {
      const mc = new MeshComponent();
      mc.primitiveType = 'box';
      mc.size = [20, 0.4, 4];
      mc.color = '#557755';
      e.addComponent(mc);
      const pc = new PhysicsComponent();
      pc.isStatic = true;
      pc.halfExtents = { x: 10, y: 0.2, z: 2 };
      e.position.y = -0.2;
      e.addComponent(pc);
    } else if (type === 'light') {
      e.addComponent(new LightComponent());
      e.position.set ? e.position.set(3,5,3) : Object.assign(e.position, { x:3, y:5, z:3 });
    } else if (type === 'camera') {
      const cc = new CameraComponent();
      cc.active = true;
      e.addComponent(cc);
      e.position.y = 3;
    }
    this.addEntity(e);
    return e;
  }

  // Attach a GLTF to an entity (async)
  async attachGLTF(entity, url) {
    try {
      const gltf = await this.assets.loadGLTF(url);
      // Remove old object3D
      if (entity.object3D) this.renderer.removeFromScene(entity.object3D);
      entity.object3D = gltf.scene.clone();
      entity.object3D.traverse(obj => {
        if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
      });
      this._syncTransform(entity);
      this.renderer.addToScene(entity.object3D);
      // Animation
      if (entity.hasComponent('animator') && gltf.animations?.length) {
        this.anim.attach(entity, entity.object3D, gltf.animations);
      }
      this._emit('entityChanged', entity);
    } catch (err) {
      console.warn('[Engine] GLTF load failed, using fallback capsule:', err.message);
      // Fallback: capsule from cylinder + sphere
      const mc = entity.getComponent('mesh') || new MeshComponent();
      mc.primitiveType = 'cylinder';
      mc.size = [0.4, 1.6, 0.4];
      mc.color = '#c8a060';
      entity.addComponent(mc);
      if (!entity.object3D) {
        entity.object3D = this.renderer.buildObject3D(entity, this.assets);
        this.renderer.addToScene(entity.object3D);
      }
      this._syncTransform(entity);
    }
  }

  // ─── Game loop ───────────────────────────────────────────────────────────────

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._frameId = requestAnimationFrame(t => this._loop(t));
    this.renderer.setEditorMode(false);
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._frameId) cancelAnimationFrame(this._frameId);
    this.renderer.setEditorMode(true);
    this.physics.reset();
    this.scripting.reset();
    this.animLib.reset();
    this.ai.reset();
    this.triggers.reset();
  }

  // Editor render (single frame, no physics/scripting)
  renderOnce() {
    this._syncAllTransforms();
    this.renderer.render();
  }

  startEditorLoop() {
    const loop = () => {
      if (this._running) return; // don't double-loop
      this.renderOnce();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _loop(time) {
    if (!this._running) return;
    const dt = Math.min((time - this._lastTime) / 1000, 0.1);
    this._lastTime = time;

    // FPS counter
    this._frameCount++;
    this._fpsTime += dt;
    if (this._fpsTime >= 0.5) {
      this._fps = Math.round(this._frameCount / this._fpsTime);
      this._frameCount = 0; this._fpsTime = 0;
      this._emit('fps', this._fps);
    }

    const entities = this.getAllEntities();
    this.scripting.update(dt, entities);
    this.ai.update(dt, entities);
    this.triggers.update(entities);
    this.physics.update(dt, entities);
    this.anim.update(dt);
    this.animLib.update(dt, entities);
    // Mode 2D : verrouiller l'axe Z à 0
    if (this.mode === '2d') {
      for (const e of entities) {
        e.position.z = 0;
        const body = this.physics._bodies.get(e.id);
        if (body) { body.position.z = 0; body.velocity.z = 0; }
      }
    }
    this._syncAllTransforms();
    this.renderer.render();

    this._frameId = requestAnimationFrame(t => this._loop(t));
  }

  _syncTransform(entity) {
    if (!entity.object3D) return;
    const { position: p, rotation: r, scale: s } = entity;
    entity.object3D.position.set(p.x, p.y, p.z);
    entity.object3D.rotation.set(r.x, r.y, r.z);
    entity.object3D.scale.set(s.x, s.y, s.z);
  }

  _syncAllTransforms() {
    for (const e of this._entities.values()) this._syncTransform(e);
  }

  // ─── Mode 2D / 3D / 2D+3D ───────────────────────────────────────────────────

  setMode(mode) {
    this.mode = mode;
    this.renderer.setMode(mode);
    // En mode 2D, reconstruire les sprites pour utiliser PlaneGeometry
    // En mode 3D/2D+3D, reconstruire pour utiliser Sprite billboard
    for (const e of this._entities.values()) {
      if (e.hasComponent('sprite')) {
        if (e.object3D) this.renderer.removeFromScene(e.object3D);
        e.object3D = this.renderer.buildObject3D(e, this.assets);
        this._syncTransform(e);
        this.renderer.addToScene(e.object3D);
      }
    }
    this._emit('modeChanged', mode);
  }

  // ─── Play / Stop (compile scripts first) ────────────────────────────────────

  play() {
    const entities = this.getAllEntities();
    // Ensure all physics bodies are registered (may have been added post-load)
    for (const e of entities) {
      if (e.hasComponent('physics') && !this.physics._bodies.has(e.id)) {
        this.physics.addBody(e);
      }
    }
    const errors = this.scripting.compileAll(entities);
    this.scripting.startAll(entities);
    this.start();
    // Activate first entity with an active CameraComponent
    for (const e of entities) {
      const cc = e.getComponent('camera');
      if (cc?.active) { this.renderer.activateCameraEntity(e, cc); break; }
    }
    return errors;
  }

  // ─── Projet complet (tous niveaux) ───────────────────────────────────────────

  saveProject() {
    return { levels: this.levels.serialize() };
  }

  async loadProject(data) {
    await this.levels.deserialize(data.levels || { levels: [], current: null });
    this._emit('projectLoaded', null);
  }

  // ─── Serialisation (scène courante) ──────────────────────────────────────────

  saveScene() {
    const data = { entities: [] };
    for (const e of this._entities.values()) {
      data.entities.push(e.serialize());
    }
    return data;
  }

  async loadScene(data) {
    // Remove all current entities
    for (const id of [...this._entities.keys()]) this.removeEntity(id);

    for (const ed of (data.entities || [])) {
      const e = Entity.deserialize(ed);
      // Re-attach components from serialized data
      for (const [type, cdata] of Object.entries(ed.components || {})) {
        let comp;
        if (type === 'mesh')          { comp = new MeshComponent(); }
        else if (type === 'physics')  { comp = new PhysicsComponent(); }
        else if (type === 'script')   { comp = new ScriptComponent(); }
        else if (type === 'animator') { comp = new AnimatorComponent(); }
        else if (type === 'light')    { comp = new LightComponent(); }
        else if (type === 'sprite')   { comp = new SpriteComponent(); }
        else if (type === 'camera')   { comp = new CameraComponent(); }
        else if (type === 'animlib')   { comp = new AnimationLibraryComponent(); }
        else if (type === 'behavior')  { comp = new BehaviorComponent(); }
        else if (type === 'trigger')   { comp = new TriggerComponent(); }
        if (comp) { comp.deserialize(cdata); e.addComponent(comp); }
      }
      this.addEntity(e);

      const mc = e.getComponent('mesh');
      if (mc?.assetUrl) await this.attachGLTF(e, mc.assetUrl);
      const alc = e.getComponent('animlib');
      if (alc) this.animLib.preload(alc);
    }
    this._emit('sceneLoaded', null);
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  _emit(event, data) {
    for (const fn of (this._listeners[event] || [])) {
      try { fn(data); } catch(e) { console.error(e); }
    }
  }
}
