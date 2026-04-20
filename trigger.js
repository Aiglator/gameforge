// ─── trigger.js ───────────────────────────────────────────────────────────────
// Système de zones de déclenchement (AABB) avec scripts onEnter / onExit

export class TriggerSystem {

  update(entities) {
    for (const trigger of entities) {
      const tc = trigger.getComponent('trigger');
      if (!tc) continue;
      if (tc.oneShot && tc._triggered) continue;

      const { x: tx, y: ty, z: tz } = trigger.position;
      const hw = tc.size.x / 2;
      const hh = tc.size.y / 2;
      const hd = tc.size.z / 2;

      for (const entity of entities) {
        if (entity.id === trigger.id) continue;
        // Filtrage par tag (tag vide = tout le monde)
        if (tc.tag && entity.tag !== tc.tag) continue;

        const { x: ex, y: ey, z: ez } = entity.position;
        const inside = (
          ex >= tx - hw && ex <= tx + hw &&
          ey >= ty - hh && ey <= ty + hh &&
          ez >= tz - hd && ez <= tz + hd
        );

        const was = tc._inside.has(entity.id);

        if (inside && !was) {
          tc._inside.add(entity.id);
          if (tc.onEnter) this._run(tc.onEnter, trigger, entity);
          if (tc.oneShot) { tc._triggered = true; break; }
        } else if (!inside && was) {
          tc._inside.delete(entity.id);
          if (tc.onExit) this._run(tc.onExit, trigger, entity);
        }
      }
    }
  }

  _run(code, trigger, entity) {
    try {
      new Function('trigger', 'entity', code)(trigger, entity);
    } catch (err) {
      console.warn(`[Trigger:${trigger.name}]`, err.message);
    }
  }

  reset() {
    // Les _inside sets et _triggered flags vivent sur les composants,
    // pas besoin de reset global ici (reset automatique au deserialize).
  }
}
