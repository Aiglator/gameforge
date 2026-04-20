// ─── physics.js ───────────────────────────────────────────────────────────────
// Physique réelle via cannon-es (port ES module de Cannon.js)
// https://github.com/pmndrs/cannon-es

import * as CANNON from 'cannon-es';

export class Physics {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -18, 0),
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    // ContactMaterial pour le sol (friction + restitution)
    const groundMaterial  = new CANNON.Material('ground');
    const playerMaterial  = new CANNON.Material('player');
    const contact = new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
      friction: 0.4,
      restitution: 0.1,
    });
    this.world.addContactMaterial(contact);
    this.groundMaterial = groundMaterial;
    this.playerMaterial = playerMaterial;

    this._bodies   = new Map();   // entityId -> CANNON.Body
    this._grounded = new Map();   // entityId -> bool
  }

  // ── Créer ou mettre à jour le body Cannon pour une entité ──────────────────

  addBody(entity) {
    const pc = entity.getComponent('physics');
    if (!pc || this._bodies.has(entity.id)) return;

    const he = pc.halfExtents;
    const shape = new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z));

    const body = new CANNON.Body({
      mass:     pc.isStatic ? 0 : pc.mass,
      type:     pc.isStatic ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC,
      material: pc.isStatic ? this.groundMaterial : this.playerMaterial,
      linearDamping:  0.8,
      angularDamping: 1.0,   // empêche le roulis indésirable
    });

    body.addShape(shape);
    body.position.set(entity.position.x, entity.position.y, entity.position.z);
    body.fixedRotation = true;   // pas de rotation physique (FPS-style)
    body.updateMassProperties();

    this.world.addBody(body);
    this._bodies.set(entity.id, body);
  }

  removeBody(entityId) {
    const body = this._bodies.get(entityId);
    if (body) { this.world.removeBody(body); this._bodies.delete(entityId); }
    this._grounded.delete(entityId);
  }

  // ── API appelée par les scripts ─────────────────────────────────────────────

  applyImpulse(entityId, force) {
    const body = this._bodies.get(entityId);
    if (!body) return;
    body.applyImpulse(new CANNON.Vec3(force.x, force.y, force.z));
  }

  setVelocity(entityId, vel) {
    const body = this._bodies.get(entityId);
    if (!body) return;
    body.velocity.set(vel.x, vel.y, vel.z);
  }

  getVelocity(entityId) {
    const body = this._bodies.get(entityId);
    if (!body) return { x: 0, y: 0, z: 0 };
    return { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z };
  }

  isGrounded(entityId) {
    return this._grounded.get(entityId) ?? false;
  }

  // ── Step + sync ─────────────────────────────────────────────────────────────

  update(dt, entities) {
    // Synchroniser position entité → body Cannon (pour les entités statiques
    // et pour permettre les déplacements forcés depuis l'éditeur)
    for (const entity of entities) {
      const body = this._bodies.get(entity.id);
      if (!body) continue;
      const pc = entity.getComponent('physics');
      if (!pc) continue;
      if (pc.isStatic) {
        // Garder la position statique à jour si modifiée dans l'éditeur
        body.position.set(entity.position.x, entity.position.y, entity.position.z);
        body.velocity.set(0, 0, 0);
      }
    }

    // Step physics world (substeps pour la stabilité)
    this.world.step(1 / 60, dt, 3);

    // Détection grounded + sync body → entité
    for (const entity of entities) {
      const body = this._bodies.get(entity.id);
      if (!body) continue;
      const pc = entity.getComponent('physics');
      if (!pc || pc.isStatic) continue;

      // Copier la position du body vers l'entité
      entity.position.x = body.position.x;
      entity.position.y = body.position.y;
      entity.position.z = body.position.z;

      // Détecter si au sol (vitesse Y quasi nulle + contact)
      const grounded = Math.abs(body.velocity.y) < 0.5 && this._hasFloorContact(body);
      this._grounded.set(entity.id, grounded);
    }
  }

  _hasFloorContact(body) {
    for (const contact of this.world.contacts) {
      if ((contact.bi === body || contact.bj === body)) {
        const normal = contact.ni;
        // Contact avec une normale pointant vers le haut → sol
        if (Math.abs(normal.y) > 0.5) return true;
      }
    }
    return false;
  }

  setGravity(g) {
    this.world.gravity.set(0, g, 0);
  }

  reset() {
    // Vider toutes les bodies
    for (const [id] of this._bodies) this.removeBody(id);
    this._grounded.clear();
  }
}
