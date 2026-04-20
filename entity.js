// ─── entity.js ────────────────────────────────────────────────────────────────
// ECS-lite: Entity + Component base classes

let _nextId = 1;
function uid() { return 'e' + (_nextId++); }

export class Component {
  constructor(type) {
    this.type = type;
    this.entity = null; // set by Entity.addComponent
  }
  onAttach() {}
  onDetach() {}
  serialize() { return { type: this.type }; }
  deserialize(data) { return this; }
}

export class Entity {
  constructor(name = 'Entity', id = uid()) {
    this.id = id;
    this.name = name;
    this.tag  = '';           // e.g. 'player', 'enemy', 'collectible'
    this.parent = null;
    this.children = [];
    this.components = new Map();
    // Transform
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale    = { x: 1, y: 1, z: 1 };
    // Three.js mirror (set by Renderer)
    this.object3D = null;
  }

  addComponent(comp) {
    comp.entity = this;
    this.components.set(comp.type, comp);
    comp.onAttach();
    return this;
  }

  removeComponent(type) {
    const c = this.components.get(type);
    if (c) { c.onDetach(); this.components.delete(type); }
    return this;
  }

  getComponent(type) { return this.components.get(type) || null; }
  hasComponent(type) { return this.components.has(type); }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child) {
    this.children = this.children.filter(c => c !== child);
    if (child.parent === this) child.parent = null;
  }

  serialize() {
    const comps = {};
    for (const [t, c] of this.components) comps[t] = c.serialize();
    return {
      id: this.id, name: this.name, tag: this.tag,
      position: { ...this.position },
      rotation: { ...this.rotation },
      scale:    { ...this.scale },
      components: comps,
      children: this.children.map(c => c.serialize()),
    };
  }

  static deserialize(data) {
    const e = new Entity(data.name, data.id);
    e.tag      = data.tag  || '';
    e.position = { ...data.position };
    e.rotation = { ...data.rotation };
    e.scale    = { ...data.scale };
    for (const cd of (data.children || [])) {
      e.addChild(Entity.deserialize(cd));
    }
    return e;
  }
}

// ─── Built-in Components ───────────────────────────────────────────────────────

export class MeshComponent extends Component {
  constructor() {
    super('mesh');
    this.primitiveType = 'box'; // 'box'|'sphere'|'cylinder'|'plane'
    this.size = [1, 1, 1];
    this.color = '#4a9eff';
    this.assetUrl = null; // GLTF url
    this.castShadow = true;
    this.receiveShadow = true;
  }
  serialize() {
    return { type: this.type, primitiveType: this.primitiveType, size: [...this.size], color: this.color, assetUrl: this.assetUrl };
  }
  deserialize(data) {
    this.primitiveType = data.primitiveType || 'box';
    this.size = data.size || [1,1,1];
    this.color = data.color || '#4a9eff';
    this.assetUrl = data.assetUrl || null;
    return this;
  }
}

export class PhysicsComponent extends Component {
  constructor() {
    super('physics');
    this.mass = 1.0;
    this.useGravity = true;
    this.isStatic = false;
    this.halfExtents = { x: 0.5, y: 0.5, z: 0.5 };
  }
  serialize() {
    return { type: this.type, mass: this.mass, useGravity: this.useGravity, isStatic: this.isStatic, halfExtents: { ...this.halfExtents } };
  }
  deserialize(data) {
    this.mass = data.mass ?? 1.0;
    this.useGravity = data.useGravity ?? true;
    this.isStatic = data.isStatic ?? false;
    this.halfExtents = data.halfExtents ? { ...data.halfExtents } : { x:0.5, y:0.5, z:0.5 };
    return this;
  }
}

export class ScriptComponent extends Component {
  constructor() {
    super('script');
    this.source = `// Appelé une fois au démarrage
function onStart(api, entity) {
  api.log('Entité prête :', entity.name);
}

// Appelé à chaque frame (dt = delta en secondes)
function onUpdate(api, entity, dt) {
  // Mouvement avec les flèches
  const speed = 5;
  if (api.input.isKeyDown('ArrowLeft'))  api.physics.applyImpulse({ x: -speed * dt, y: 0, z: 0 });
  if (api.input.isKeyDown('ArrowRight')) api.physics.applyImpulse({ x:  speed * dt, y: 0, z: 0 });
  if (api.input.isKeyDown('ArrowUp'))    api.physics.applyImpulse({ x: 0, y: 0, z: -speed * dt });
  if (api.input.isKeyDown('ArrowDown'))  api.physics.applyImpulse({ x: 0, y: 0, z:  speed * dt });
  // Saut
  if (api.input.isKeyPressed('Space') && api.physics.isGrounded()) {
    api.physics.applyImpulse({ x: 0, y: 7, z: 0 });
  }
}

// Appelé lors d'une collision
function onCollision(api, entity, other) {}
`;
  }
  serialize() { return { type: this.type, source: this.source }; }
  deserialize(data) { this.source = data.source || this.source; return this; }
}

export class AnimatorComponent extends Component {
  constructor() {
    super('animator');
    this.currentClip = null;
    this.availableClips = [];
    this.showSkeleton = false;
    this.speed = 1.0;
  }
  serialize() { return { type: this.type, currentClip: this.currentClip, speed: this.speed, showSkeleton: this.showSkeleton }; }
  deserialize(data) {
    this.currentClip = data.currentClip || null;
    this.speed = data.speed ?? 1.0;
    this.showSkeleton = data.showSkeleton ?? false;
    return this;
  }
}

export class LightComponent extends Component {
  constructor() {
    super('light');
    this.lightType    = 'point'; // 'point'|'directional'|'spot'|'hemisphere'
    this.color        = '#ffffff';
    this.intensity    = 1.0;
    this.castShadow   = false;
    this.shadowMapSize = 1024;   // 512|1024|2048|4096
    this.distance     = 0;       // 0 = unlimited (point/spot)
    this.angle        = Math.PI / 4; // spot cone half-angle (radians)
    this.penumbra     = 0.1;     // spot edge softness
    this.skyColor     = '#87ceeb';
    this.groundColor  = '#a0522d';
  }
  serialize() {
    return {
      type: this.type, lightType: this.lightType, color: this.color, intensity: this.intensity,
      castShadow: this.castShadow, shadowMapSize: this.shadowMapSize,
      distance: this.distance, angle: this.angle, penumbra: this.penumbra,
      skyColor: this.skyColor, groundColor: this.groundColor,
    };
  }
  deserialize(data) {
    this.lightType    = data.lightType    || 'point';
    this.color        = data.color        || '#ffffff';
    this.intensity    = data.intensity    ?? 1.0;
    this.castShadow   = data.castShadow   ?? false;
    this.shadowMapSize = data.shadowMapSize ?? 1024;
    this.distance     = data.distance     ?? 0;
    this.angle        = data.angle        ?? Math.PI / 4;
    this.penumbra     = data.penumbra     ?? 0.1;
    this.skyColor     = data.skyColor     || '#87ceeb';
    this.groundColor  = data.groundColor  || '#a0522d';
    return this;
  }
}

export class AnimationLibraryComponent extends Component {
  constructor() {
    super('animlib');
    // { [name]: { frames: string[], fps: number, loop: boolean } }
    this.categories  = {};
    this.currentAnim = null;
  }

  addCategory(name) {
    if (!this.categories[name]) {
      this.categories[name] = { frames: [], fps: 12, loop: true };
    }
    return this.categories[name];
  }

  removeCategory(name) {
    delete this.categories[name];
    if (this.currentAnim === name) this.currentAnim = null;
  }

  addFrame(categoryName, url) {
    const cat = this.categories[categoryName];
    if (cat) cat.frames.push(url);
  }

  removeFrame(categoryName, index) {
    const cat = this.categories[categoryName];
    if (cat) cat.frames.splice(index, 1);
  }

  serialize() {
    return { type: this.type, categories: this.categories, currentAnim: this.currentAnim };
  }

  deserialize(data) {
    this.categories  = data.categories  || {};
    this.currentAnim = data.currentAnim || null;
    return this;
  }
}

export class CameraComponent extends Component {
  constructor() {
    super('camera');
    this.mode         = 'follow'; // 'follow'|'firstPerson'|'fixed'|'orbit'
    this.fov          = 60;
    this.offset       = { x: 0, y: 3, z: 8 };
    this.lookAtEntity = true;
    this.active       = false;
  }
  serialize() {
    return {
      type: this.type, mode: this.mode, fov: this.fov,
      offset: { ...this.offset }, lookAtEntity: this.lookAtEntity, active: this.active,
    };
  }
  deserialize(data) {
    this.mode         = data.mode         ?? 'follow';
    this.fov          = data.fov          ?? 60;
    this.offset       = data.offset ? { ...data.offset } : { x: 0, y: 3, z: 8 };
    this.lookAtEntity = data.lookAtEntity ?? true;
    this.active       = data.active       ?? false;
    return this;
  }
}

export class SpriteComponent extends Component {
  constructor() {
    super('sprite');
    this.imageUrl = null;   // object URL (depuis import fichier)
    this.width    = 1;      // unités monde
    this.height   = 1;
    this.color    = '#ffffff'; // teinte
  }
  serialize() {
    return { type: this.type, imageUrl: this.imageUrl, width: this.width, height: this.height, color: this.color };
  }
  deserialize(data) {
    this.imageUrl = data.imageUrl || null;
    this.width    = data.width  ?? 1;
    this.height   = data.height ?? 1;
    this.color    = data.color  || '#ffffff';
    return this;
  }
}

// ─── BehaviorComponent — IA state machine ────────────────────────────────────
export class BehaviorComponent extends Component {
  constructor() {
    super('behavior');
    this.behaviorType    = 'patrol'; // 'patrol'|'chase'|'guardian'|'echo'|'idle'
    this.detectionRadius = 10;
    this.attackRadius    = 2;
    this.speed           = 3;
    this.patrolPoints    = []; // [{ x, y, z }, ...]
    this.targetTag       = 'player';
    // Runtime (not serialized):
    this._state     = 'idle';
    this._patrolIdx = 0;
    this._origin    = null;
    this._floatTime = 0;
  }
  serialize() {
    return {
      type: this.type,
      behaviorType:    this.behaviorType,
      detectionRadius: this.detectionRadius,
      attackRadius:    this.attackRadius,
      speed:           this.speed,
      patrolPoints:    this.patrolPoints.map(p => ({ ...p })),
      targetTag:       this.targetTag,
    };
  }
  deserialize(data) {
    this.behaviorType    = data.behaviorType    ?? 'patrol';
    this.detectionRadius = data.detectionRadius ?? 10;
    this.attackRadius    = data.attackRadius    ?? 2;
    this.speed           = data.speed           ?? 3;
    this.patrolPoints    = (data.patrolPoints   || []).map(p => ({ ...p }));
    this.targetTag       = data.targetTag       || 'player';
    return this;
  }
}

// ─── TriggerComponent — AABB event zone ──────────────────────────────────────
export class TriggerComponent extends Component {
  constructor() {
    super('trigger');
    this.size    = { x: 2, y: 2, z: 2 };
    this.onEnter = '// trigger.name, entity.name available\nconsole.log("Enter", entity.name);';
    this.onExit  = '';
    this.tag     = '';      // filter: only trigger for entities with this tag (empty = all)
    this.oneShot = false;
    // Runtime:
    this._inside    = new Set();
    this._triggered = false;
  }
  serialize() {
    return {
      type:    this.type,
      size:    { ...this.size },
      onEnter: this.onEnter,
      onExit:  this.onExit,
      tag:     this.tag,
      oneShot: this.oneShot,
    };
  }
  deserialize(data) {
    this.size    = data.size ? { ...data.size } : { x: 2, y: 2, z: 2 };
    this.onEnter = data.onEnter ?? '';
    this.onExit  = data.onExit  ?? '';
    this.tag     = data.tag     || '';
    this.oneShot = data.oneShot ?? false;
    return this;
  }
}
