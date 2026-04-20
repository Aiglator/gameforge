// ─── ai.js ────────────────────────────────────────────────────────────────────
// Système IA : machine à états pour chaque BehaviorComponent
// Types : 'patrol' | 'chase' | 'guardian' | 'echo' | 'idle'

export class AISystem {

  // ── Update principal ────────────────────────────────────────────────────────
  update(dt, entities) {
    for (const entity of entities) {
      const bc = entity.getComponent('behavior');
      if (!bc) continue;

      // Construire la liste des cibles selon targetTag
      const targets = bc.targetTag
        ? entities.filter(e => e.id !== entity.id && e.tag === bc.targetTag)
        : entities.filter(e => e.id !== entity.id);

      switch (bc.behaviorType) {
        case 'patrol':   this._patrol(dt, entity, bc, targets);   break;
        case 'chase':    this._chase(dt, entity, bc, targets);    break;
        case 'guardian': this._guardian(dt, entity, bc, targets); break;
        case 'echo':     this._echo(dt, entity, bc, targets);     break;
        // 'idle' : ne rien faire
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _dist(a, b) {
    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** Déplace entity vers (tx, tz) à vitesse speed. Retourne true si arrivé. */
  _moveToward(entity, tx, tz, speed, dt) {
    const dx = tx - entity.position.x;
    const dz = tz - entity.position.z;
    const d  = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.15) return true;
    const nx = dx / d, nz = dz / d;
    entity.position.x += nx * speed * dt;
    entity.position.z += nz * speed * dt;
    if (entity.object3D) entity.object3D.rotation.y = Math.atan2(nx, nz);
    return false;
  }

  /** Trouve la cible la plus proche dans targets. */
  _closest(entity, targets) {
    let best = null, bd = Infinity;
    for (const t of targets) {
      const d = this._dist(entity, t);
      if (d < bd) { bd = d; best = t; }
    }
    return { target: best, dist: bd };
  }

  // ── Comportements ───────────────────────────────────────────────────────────

  /**
   * PATROL : suit une liste de points, détecte le joueur à portée
   * et bascule en état 'chase'.
   */
  _patrol(dt, entity, bc, targets) {
    const { target, dist } = this._closest(entity, targets);
    if (target && dist < bc.detectionRadius) {
      bc._state = 'chase';
      this._chase(dt, entity, bc, targets);
      return;
    }
    bc._state = 'patrol';
    if (bc.patrolPoints.length === 0) return;
    const pt = bc.patrolPoints[bc._patrolIdx ?? 0];
    const arrived = this._moveToward(entity, pt.x, pt.z, bc.speed, dt);
    if (arrived) bc._patrolIdx = ((bc._patrolIdx ?? 0) + 1) % bc.patrolPoints.length;
  }

  /**
   * CHASE : poursuit la cible la plus proche.
   * - Trop loin → idle/retour
   * - Dans attackRadius → état 'attack' (no mouvement)
   */
  _chase(dt, entity, bc, targets) {
    const { target, dist } = this._closest(entity, targets);
    if (!target || dist > bc.detectionRadius * 1.5) {
      bc._state = 'idle';
      return;
    }
    if (dist <= bc.attackRadius) {
      bc._state = 'attack';
      // Se tourner vers la cible
      if (entity.object3D) {
        const dx = target.position.x - entity.position.x;
        const dz = target.position.z - entity.position.z;
        entity.object3D.rotation.y = Math.atan2(dx, dz);
      }
    } else {
      bc._state = 'chase';
      this._moveToward(entity, target.position.x, target.position.z, bc.speed, dt);
    }
  }

  /**
   * GUARDIAN : garde sa position d'origine.
   * - Si cible à portée → poursuit
   * - Sinon → retourne à l'origine
   */
  _guardian(dt, entity, bc, targets) {
    if (!bc._origin) bc._origin = { ...entity.position };

    const { target, dist } = this._closest(entity, targets);
    if (target && dist < bc.detectionRadius) {
      if (dist <= bc.attackRadius) {
        bc._state = 'attack';
      } else {
        bc._state = 'chase';
        this._moveToward(entity, target.position.x, target.position.z, bc.speed, dt);
      }
    } else {
      bc._state = 'return';
      this._moveToward(entity, bc._origin.x, bc._origin.z, bc.speed * 0.5, dt);
    }
  }

  /**
   * ECHO : entité spectrale qui flotte et s'approche lentement.
   * - Oscille verticalement
   * - Approche à vitesse réduite
   * - État 'absorb' quand très proche
   */
  _echo(dt, entity, bc, targets) {
    if (!bc._origin) bc._origin = { ...entity.position };
    bc._floatTime = (bc._floatTime ?? 0) + dt;

    // Oscillation verticale
    entity.position.y = bc._origin.y + Math.sin(bc._floatTime * 1.8) * 0.5;

    // Rotation lente sur Y
    if (entity.object3D) entity.object3D.rotation.y += 0.5 * dt;

    const { target, dist } = this._closest(entity, targets);
    if (!target) { bc._state = 'float'; return; }

    if (dist < bc.detectionRadius && dist > bc.attackRadius) {
      bc._state = 'approach';
      this._moveToward(entity, target.position.x, target.position.z, bc.speed * 0.3, dt);
    } else if (dist <= bc.attackRadius) {
      bc._state = 'absorb';
    } else {
      bc._state = 'float';
    }
  }

  reset() {
    // Les états runtime sont sur les composants — ils se réinitialisent
    // automatiquement à chaque play() car compileAll recrée les hooks.
  }
}
