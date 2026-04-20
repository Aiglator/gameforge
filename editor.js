// ─── editor.js ────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Engine }    from './engine.js';
import { Entity, ScriptComponent, MeshComponent, PhysicsComponent, AnimatorComponent, LightComponent, SpriteComponent, CameraComponent, AnimationLibraryComponent, BehaviorComponent, TriggerComponent } from './entity.js';

class Editor {
  constructor() {
    this.engine = new Engine(document.getElementById('viewport-container'));
    this.selectedId = null;
    this.isPlaying = false;

    // CodeMirror
    this.cm = CodeMirror(document.getElementById('cm-container'), {
      mode: 'javascript', theme: 'dracula', lineNumbers: true,
      matchBrackets: true, autoCloseBrackets: true,
      indentUnit: 2, tabSize: 2, lineWrapping: false,
      extraKeys: { Tab: cm => cm.execCommand('insertSoftTab') },
    });
    this.cm.setSize('100%', '100%');

    this._bindUI();
    this._bindEngineEvents();
    // ─── CONTEXT MENU via contextmenu event ──────────────────────────────────
    const canvas = this.engine.renderer.webgl.domElement;
    // Priorité haute (capture) pour devancer extensions (ex: Pelagus wallet)
    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (this.isPlaying) return;
      this._showContextMenu(e.clientX, e.clientY, this._getSpawnPosition(e));
    }, true);
    // Fallback mouseup pour les cas où contextmenu est intercepté
    canvas.addEventListener('mouseup', e => {
      if (e.button !== 2) return;
      if (this.isPlaying) return;
      // Ne pas doubler si le menu est déjà ouvert
      if (document.getElementById('ctx-menu')) return;
      this._showContextMenu(e.clientX, e.clientY, this._getSpawnPosition(e));
    });

    // ─── TransformControls : sync gizmo → entité ──────────────────────────────
    const tc = this.engine.renderer.transformControls;
    tc.addEventListener('objectChange', () => {
      const entity = this.engine.getEntity(this.selectedId);
      if (!entity?.object3D) return;
      const o = entity.object3D;
      entity.position.x = o.position.x; entity.position.y = o.position.y; entity.position.z = o.position.z;
      entity.rotation.x = o.rotation.x; entity.rotation.y = o.rotation.y; entity.rotation.z = o.rotation.z;
      entity.scale.x    = o.scale.x;    entity.scale.y    = o.scale.y;    entity.scale.z    = o.scale.z;
      // Sync corps physique
      const body = this.engine.physics._bodies.get(this.selectedId);
      if (body) body.position.set(entity.position.x, entity.position.y, entity.position.z);
    });
    // Rafraîchir l'inspecteur quand le drag se termine
    tc.addEventListener('dragging-changed', e => {
      if (!e.value && this.selectedId) {
        const entity = this.engine.getEntity(this.selectedId);
        if (entity) this._renderInspector(entity);
      }
    });

    // ─── Click dans le viewport → sélectionner un objet ──────────────────────
    this._raycaster = new THREE.Raycaster();
    canvas.addEventListener('click', e => {
      if (this.isPlaying) return;
      // Ignorer si on vient de dragger le gizmo
      if (tc.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.engine.renderer.camera);

      const meshes = [];
      for (const ent of this.engine.getAllEntities()) {
        if (ent.object3D) ent.object3D.traverse(obj => { if (obj.isMesh || obj.isSprite) meshes.push(obj); });
      }
      const hits = this._raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const entity = this._findEntityByObject3D(hits[0].object);
        if (entity) this._select(entity.id);
      }
    });

    // Global lights state
    this._globalLights = {
      ambientColor: '#ffffff', ambientIntensity: 0.4,
      sunColor: '#ffffff', sunIntensity: 1.2,
      sunAzimuth: 45, sunElevation: 60,
    };

    this._refreshTree();
    this._updateStatus();
    this.engine.startEditorLoop();

    // Bind left panel buttons
    this._bindLeftPanel();

    // MCP WebSocket bridge (optionnel — se connecte si mcp/server.js tourne)
    this._connectMCP();

    this.engine.on('fps', fps => {
      document.getElementById('fps-counter').textContent = fps + ' FPS';
      document.getElementById('fps-display').textContent = fps + ' FPS';
    });
    this.engine.on('levelLoaded', () => { this._refreshLevelsPanel(); this._refreshTree(); this._updateStatus(); });
    setInterval(() => this._updateStatus(), 800);
  }

  _updateStatus() {
    const n = this.engine.getAllEntities().length;
    document.getElementById('entity-count').textContent = n + ' entit' + (n > 1 ? 'és' : 'é');
    const bar = document.getElementById('entity-count-bar');
    if (bar) bar.textContent = n + ' entit' + (n > 1 ? 'és' : 'é');
  }

  // ─── UI bindings ─────────────────────────────────────────────────────────────

  _bindUI() {
    document.getElementById('btn-add-cube').addEventListener('click',   () => this._addPrimitive('cube'));
    document.getElementById('btn-add-sphere').addEventListener('click', () => this._addPrimitive('sphere'));
    document.getElementById('btn-add-plane').addEventListener('click',  () => this._addPrimitive('plane'));
    document.getElementById('btn-add-light').addEventListener('click',  () => this._addPrimitive('light'));
    document.getElementById('btn-add-camera')?.addEventListener('click', () => this._addPrimitive('camera'));
    document.getElementById('btn-global-lights')?.addEventListener('click', (e) => this._showGlobalLightsPanel(e));

    // WorldGen panel generate button
    document.getElementById('btn-worldgen-generate')?.addEventListener('click', () => {
      const theme  = document.getElementById('wg-theme')?.value   || 'post-apo';
      const seed   = parseInt(document.getElementById('wg-seed')?.value)  || 0;
      const width  = parseInt(document.getElementById('wg-width')?.value) || 80;
      const depth  = parseInt(document.getElementById('wg-depth')?.value) || 80;
      const trees  = parseInt(document.getElementById('wg-trees')?.value) || 40;
      const ruins  = parseInt(document.getElementById('wg-ruins')?.value) || 10;
      const result = this.engine.worldgen.generate({ theme, seed: seed || undefined, width, depth, treeCount: trees, ruinCount: ruins });
      const seedOut = document.getElementById('wg-seed');
      if (seedOut) seedOut.value = result.seed;
    });

    document.getElementById('btn-worldgen-clear')?.addEventListener('click', () => {
      this.engine.worldgen.clearGenerated();
    });

    // Level management buttons
    document.getElementById('btn-level-add')?.addEventListener('click', () => {
      const name = prompt('Nom du niveau :') || 'Nouveau niveau';
      this.engine.levels.createLevel(name);
      this._refreshLevelsPanel();
    });

    document.getElementById('btn-level-save')?.addEventListener('click', () => {
      this.engine.levels.saveCurrentLevel();
    });

    // Sprite 2D toolbar button
    document.getElementById('btn-import-sprite')?.addEventListener('click', () => {
      this._pendingSpawnPos = null;
      document.getElementById('sprite-input').click();
    });

    // "Add" button ouvre le menu contextuel centré sur le viewport
    document.getElementById('btn-add-object')?.addEventListener('click', () => {
      const vp = document.getElementById('viewport-container').getBoundingClientRect();
      this._showContextMenu(
        vp.left + vp.width / 2,
        vp.top  + vp.height / 2,
        { x: 0, y: 1, z: 0 }
      );
    });

    document.getElementById('btn-play').addEventListener('click', () => this._play());
    document.getElementById('btn-stop').addEventListener('click', () => this._stop());

    // Save
    document.getElementById('btn-save').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(this.engine.saveScene(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scene.json'; a.click();
    });

    // Load
    document.getElementById('btn-load').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        await this.engine.loadScene(JSON.parse(await file.text()));
        this._refreshTree();
        document.getElementById('status-scene').textContent = 'Scene: ' + file.name;
      } catch (err) { alert('Erreur: ' + err.message); }
      e.target.value = '';
    });

    // Script
    document.getElementById('btn-compile').addEventListener('click', () => {
      this._saveCurrentScript();
      const entity = this.engine.getEntity(this.selectedId); if (!entity) return;
      const r = this.engine.scripting.compile(entity);
      const el = document.getElementById('script-errors');
      if (r.success) { el.classList.add('hidden'); el.textContent = ''; }
      else { el.classList.remove('hidden'); el.textContent = '⚠ ' + r.error; }
    });
    document.getElementById('btn-save-script').addEventListener('click', () => this._saveCurrentScript());

    // Mode 2D / 3D / 2D+3D
    const modeMap = { 'btn-mode-2d': '2d', 'btn-mode-3d': '3d', 'btn-mode-2d3d': '2d3d' };
    const modeLabels = { '2d': 'Ortho 2D', '3d': 'Perspective 3D', '2d3d': '2D + 3D' };
    Object.entries(modeMap).forEach(([btnId, mode]) => {
      document.getElementById(btnId)?.addEventListener('click', () => {
        const prevMode = this.engine.mode;
        this.engine.setMode(mode);
        Object.keys(modeMap).forEach(id => {
          const b = document.getElementById(id);
          if (!b) return;
          b.classList.toggle('bg-blue-600', id === btnId);
          b.classList.toggle('text-white',  id === btnId);
          b.classList.toggle('text-gray-400', id !== btnId);
        });
        const lbl = document.getElementById('viewport-mode-label');
        if (lbl) lbl.textContent = modeLabels[mode];
        if (prevMode !== mode) {
          for (const id of [...this.engine._entities.keys()]) this.engine.removeEntity(id);
          this._refreshTree(); this._updateStatus();
        }
      });
    });

    // Gizmo buttons — changent le mode du TransformControls
    const gizmoModes = { 'gizmo-translate': 'translate', 'gizmo-rotate': 'rotate', 'gizmo-scale': 'scale' };
    Object.entries(gizmoModes).forEach(([id, mode]) => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.engine.renderer.setGizmoMode(mode);
        Object.keys(gizmoModes).forEach(bid => {
          const b = document.getElementById(bid);
          if (!b) return;
          b.classList.toggle('bg-blue-600/30', bid === id);
          b.classList.toggle('text-blue-400',  bid === id);
          b.classList.toggle('text-gray-400',  bid !== id);
        });
      });
    });

    // Drag & drop GLTF/GLB onto viewport
    const vp = document.getElementById('viewport-container');
    const dz = document.getElementById('drop-zone');
    if (vp && dz) {
      vp.addEventListener('dragover', e => { e.preventDefault(); dz.classList.remove('hidden'); });
      vp.addEventListener('dragleave', e => { if (!vp.contains(e.relatedTarget)) dz.classList.add('hidden'); });
      vp.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.add('hidden');
        const file = [...(e.dataTransfer.files || [])].find(f => /\.(glb|gltf)$/i.test(f.name));
        if (file) this._importGLTF(file, this._pendingSpawnPos);
      });
    }

    // Hidden inputs pour import assets
    this._setupAssetInputs();
  }

  _setupAssetInputs() {
    // GLTF/GLB
    const gltfInput = document.createElement('input');
    gltfInput.type = 'file'; gltfInput.accept = '.glb,.gltf'; gltfInput.style.display = 'none';
    gltfInput.id = 'gltf-input';
    gltfInput.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      this._importGLTF(file, this._pendingSpawnPos);
      e.target.value = ''; this._pendingSpawnPos = null;
    });
    document.body.appendChild(gltfInput);

    // Sprite 2D — réutilise l'input déjà présent dans le HTML (évite double id)
    const spriteInput = document.getElementById('sprite-input');
    if (spriteInput) {
      spriteInput.accept = 'image/*,.svg';
      spriteInput.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        this._importSprite(file, this._pendingSpawnPos);
        e.target.value = ''; this._pendingSpawnPos = null;
      });
    }

    // Image/texture
    const texInput = document.createElement('input');
    texInput.type = 'file'; texInput.accept = 'image/*'; texInput.style.display = 'none';
    texInput.id = 'texture-input';
    texInput.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      this._importTexture(file);
      e.target.value = '';
    });
    document.body.appendChild(texInput);
  }

  // ─── Asset import ─────────────────────────────────────────────────────────────

  async _importGLTF(file, spawnPos) {
    const objectUrl = URL.createObjectURL(file);
    const entityName = file.name.replace(/\.(glb|gltf)$/i, '');

    // Créer l'entité de base
    const e = new Entity(entityName);
    const mc = new MeshComponent();
    mc.assetUrl = objectUrl;
    mc.color = '#ccaa88';
    e.addComponent(mc);
    const pc = new PhysicsComponent();
    pc.halfExtents = { x: 0.5, y: 1, z: 0.5 };
    e.addComponent(pc);
    e.addComponent(new AnimatorComponent());

    if (spawnPos) { e.position.x = spawnPos.x; e.position.y = spawnPos.y; e.position.z = spawnPos.z; }
    else { e.position.y = 1; }

    this.engine.addEntity(e);

    // Charger le GLTF (avec skeleton auto)
    await this.engine.attachGLTF(e, objectUrl);

    this._refreshTree();
    this._select(e.id);
    this._updateStatus();

    // Notifier
    this._toast(`Asset "${entityName}" importé !`);
  }

  async _importTexture(file) {
    const objectUrl = URL.createObjectURL(file);
    const entity = this.engine.getEntity(this.selectedId);
    if (!entity) { this._toast('Sélectionne une entité d\'abord !', 'warn'); return; }

    // Appliquer la texture à l'objet 3D sélectionné
    const mesh = entity.object3D;
    if (!mesh) { this._toast('Entité sans mesh 3D', 'warn'); return; }

    try {
      const tex = await this.engine.assets.loadTexture(objectUrl);
      // Appliquer sur tous les meshes de l'objet
      mesh.traverse(obj => {
        if (obj.isMesh) {
          obj.material = obj.material.clone();
          obj.material.map = tex;
          obj.material.needsUpdate = true;
        }
      });
      this._toast(`Texture "${file.name}" appliquée !`);
    } catch(err) {
      this._toast('Erreur texture: ' + err.message, 'error');
    }
  }

  _importSprite(file, spawnPos) {
    const objectUrl = URL.createObjectURL(file);
    const entityName = file.name.replace(/\.[^.]+$/, '');

    const e = new Entity(entityName);
    const sc = new SpriteComponent();
    sc.imageUrl = objectUrl;
    sc.width  = 2;
    sc.height = 2;
    e.addComponent(sc);

    if (spawnPos) { e.position.x = spawnPos.x; e.position.y = spawnPos.y; e.position.z = spawnPos.z; }
    else { e.position.y = 1; }

    this.engine.addEntity(e);
    this._refreshTree();
    this._select(e.id);
    this._updateStatus();
    this._toast(`Sprite "${entityName}" importé !`);
  }

  _toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = 'fixed bottom-10 right-4 z-50 px-4 py-2 rounded text-xs font-medium shadow-lg '
      + (type === 'success' ? 'bg-green-700 text-white' : type === 'warn' ? 'bg-yellow-700 text-white' : 'bg-red-700 text-white');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ─── Context menu ─────────────────────────────────────────────────────────────

  _getSpawnPosition(mouseEvent) {
    const rect = document.getElementById('viewport-container').getBoundingClientRect();
    const ndcX = ((mouseEvent.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((mouseEvent.clientY - rect.top)  / rect.height) * 2 + 1;
    const camera = this.engine.renderer.camera;
    const dir = this._unprojectRay(ndcX, ndcY, camera);
    if (!dir || Math.abs(dir.y) < 0.0001) return { x: 0, y: 1, z: 0 };
    const t = (1 - camera.position.y) / dir.y;
    if (t < 0) return { x: 0, y: 1, z: 0 };
    return {
      x: parseFloat((camera.position.x + dir.x * t).toFixed(2)),
      y: 1,
      z: parseFloat((camera.position.z + dir.z * t).toFixed(2)),
    };
  }

  _unprojectRay(ndcX, ndcY, camera) {
    const pi = camera.projectionMatrixInverse.elements;
    const mw = camera.matrixWorld.elements;
    const vx = ndcX * pi[0] + pi[12];
    const vy = ndcY * pi[5] + pi[13];
    const vz = -1;
    const wx = mw[0]*vx + mw[4]*vy + mw[8]*vz;
    const wy = mw[1]*vx + mw[5]*vy + mw[9]*vz;
    const wz = mw[2]*vx + mw[6]*vy + mw[10]*vz;
    const len = Math.sqrt(wx*wx + wy*wy + wz*wz);
    return len < 0.0001 ? null : { x: wx/len, y: wy/len, z: wz/len };
  }

  _showContextMenu(clientX, clientY, spawnPos) {
    document.getElementById('ctx-menu')?.remove();

    const menu = document.createElement('div');
    menu.id = 'ctx-menu';
    menu.style.cssText = `position:fixed;left:${clientX}px;top:${clientY}px;z-index:9999;
      background:#1f2937;border:1px solid #374151;border-radius:8px;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);padding:4px 0;min-width:200px;font-size:12px;`;

    const section = (title) => {
      const d = document.createElement('div');
      d.style.cssText = 'padding:4px 12px 2px;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;';
      d.textContent = title;
      menu.appendChild(d);
    };
    const sep = () => {
      const d = document.createElement('div');
      d.style.cssText = 'border-top:1px solid #374151;margin:4px 0;';
      menu.appendChild(d);
    };
    const item = (emoji, label, onClick, colorClass = '#e5e7eb') => {
      const btn = document.createElement('button');
      btn.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;padding:6px 12px;
        background:transparent;border:none;color:${colorClass};cursor:pointer;text-align:left;`;
      btn.innerHTML = `<span style="width:18px;text-align:center">${emoji}</span><span>${label}</span>`;
      btn.addEventListener('mouseover', () => btn.style.background = '#2563eb');
      btn.addEventListener('mouseout',  () => btn.style.background = 'transparent');
      btn.addEventListener('click', () => { onClick(); menu.remove(); });
      menu.appendChild(btn);
    };

    // ── Créer ──
    section('Créer un objet');
    item('🧍', 'Player', () => this._createFromContextMenu('player', spawnPos));
    item('🟦', 'Cube',   () => this._addPrimitive('cube',   spawnPos));
    item('🔵', 'Sphere', () => this._addPrimitive('sphere', spawnPos));
    item('⬜', 'Terrain (Plane)', () => this._addPrimitive('plane', spawnPos));
    item('🧊', 'Cylinder', () => this._addPrimitive('cylinder', spawnPos));
    item('💡', 'Lumière', () => this._addPrimitive('light', spawnPos));
    item('🏔️', 'Sol + Plateformes', () => this._createFromContextMenu('level', spawnPos));

    sep();

    // ── Importer ──
    section('Importer un asset');
    item('📦', 'Modèle 3D (GLTF / GLB)', () => {
      this._pendingSpawnPos = spawnPos;
      document.getElementById('gltf-input').click();
    });
    item('🎨', 'Sprite 2D (image)', () => {
      this._pendingSpawnPos = spawnPos;
      document.getElementById('sprite-input').click();
    });
    item('🖼️', 'Texture sur sélection', () => {
      document.getElementById('texture-input').click();
    });

    // ── Si squelette disponible ──
    const selEntity = this.engine.getEntity(this.selectedId);
    const hasAnim = selEntity && this.engine.anim.getClipNames(this.selectedId).length > 0;
    if (selEntity || hasAnim) {
      sep();
      section('Entité sélectionnée');
      if (hasAnim) {
        const ac = selEntity.getComponent('animator');
        const skeletonOn = ac?.showSkeleton;
        item('🦴', skeletonOn ? 'Masquer le squelette' : 'Afficher le squelette', () => {
          const newVal = !skeletonOn;
          if (ac) ac.showSkeleton = newVal;
          this.engine.anim.showSkeleton(this.selectedId, newVal);
          this._renderInspector(selEntity);
        });
        // Lister les animations
        for (const clip of this.engine.anim.getClipNames(this.selectedId)) {
          item('▶', 'Jouer : ' + clip, () => this.engine.anim.play(this.selectedId, clip));
        }
      }
      if (selEntity) {
        item('🗑', 'Supprimer', () => this.engine.removeEntity(this.selectedId), '#f87171');
      }
    }

    document.body.appendChild(menu);

    // Ajuster si hors écran
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  menu.style.left = (clientX - r.width)  + 'px';
      if (r.bottom > window.innerHeight) menu.style.top  = (clientY - r.height) + 'px';
    });

    // Fermer au clic extérieur
    setTimeout(() => {
      const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
      document.addEventListener('mousedown', close);
    }, 0);
  }

  _createFromContextMenu(type, spawnPos) {
    if (type === 'player') {
      const e = this.engine.createPrimitive('cylinder', 'Player');
      const mc = e.getComponent('mesh');
      if (mc) { mc.size = [0.4, 1.6, 0.4]; mc.color = '#4a90e2'; }
      e.addComponent(new ScriptComponent());
      e.addComponent(new AnimatorComponent());
      if (spawnPos) { e.position.x = spawnPos.x; e.position.y = spawnPos.y + 0.5; e.position.z = spawnPos.z; }
      this.engine._syncTransform(e);
      this._rebuildMeshById(e.id);
      this._refreshTree(); this._select(e.id); this._updateStatus();
    } else if (type === 'level') {
      const ground = this.engine.createPrimitive('plane', 'Sol');
      if (spawnPos) { ground.position.x = spawnPos.x; ground.position.z = spawnPos.z; this.engine._syncTransform(ground); }

      const p1 = this.engine.createPrimitive('cube', 'Plateforme_1');
      const p1mc = p1.getComponent('mesh'); if (p1mc) { p1mc.size = [4,0.4,2]; p1mc.color = '#5a7a9a'; }
      const p1pc = p1.getComponent('physics'); if (p1pc) { p1pc.isStatic = true; p1pc.halfExtents = {x:2,y:0.2,z:1}; }
      p1.position = { x:(spawnPos?.x||0)-3, y:2.2, z:spawnPos?.z||0 };
      this.engine._syncTransform(p1); this._rebuildMeshById(p1.id);

      const p2 = this.engine.createPrimitive('cube', 'Plateforme_2');
      const p2mc = p2.getComponent('mesh'); if (p2mc) { p2mc.size = [3,0.4,2]; p2mc.color = '#9a7a5a'; }
      const p2pc = p2.getComponent('physics'); if (p2pc) { p2pc.isStatic = true; p2pc.halfExtents = {x:1.5,y:0.2,z:1}; }
      p2.position = { x:(spawnPos?.x||0)+3, y:4, z:spawnPos?.z||0 };
      this.engine._syncTransform(p2); this._rebuildMeshById(p2.id);

      this._refreshTree(); this._updateStatus();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _addPrimitive(type, spawnPos) {
    const e = this.engine.createPrimitive(type);
    if (spawnPos) {
      e.position.x = spawnPos.x; e.position.y = spawnPos.y; e.position.z = spawnPos.z;
      this.engine._syncTransform(e);
      const body = this.engine.physics._bodies.get(e.id);
      if (body) body.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    }
    this._refreshTree(); this._select(e.id); this._updateStatus();
  }

  _rebuildMeshById(id) { this._rebuildById(id); }

  _rebuildById(id) {
    const entity = this.engine.getEntity(id); if (!entity) return;
    if (entity.object3D) this.engine.renderer.removeFromScene(entity.object3D);
    entity.object3D = this.engine.renderer.buildObject3D(entity, this.engine.assets);
    this.engine._syncTransform(entity);
    this.engine.renderer.addToScene(entity.object3D);
  }

  // ─── Engine events ───────────────────────────────────────────────────────────

  _bindEngineEvents() {
    this.engine.on('entityAdded',   () => { this._refreshTree(); this._updateStatus(); });
    this.engine.on('entityRemoved', () => {
      this._refreshTree(); this._updateStatus();
      if (this.selectedId && !this.engine.getEntity(this.selectedId)) {
        this.selectedId = null;
        this.engine.renderer.detachGizmo();
        document.getElementById('inspector-content').innerHTML =
          '<p class="text-gray-500 italic text-center mt-4">Sélectionnez une entité</p>';
      }
    });
    this.engine.on('entityChanged', () => {
      if (this.selectedId) this._renderInspector(this.engine.getEntity(this.selectedId));
    });
    this.engine.on('sceneLoaded', () => {
      this._refreshTree(); this.selectedId = null;
      this.engine.renderer.detachGizmo();
      this._updateStatus();
    });
  }

  // ─── Scene tree ──────────────────────────────────────────────────────────────

  _refreshTree() {
    const tree = document.getElementById('scene-tree');
    tree.innerHTML = '';
    for (const e of this.engine.getAllEntities()) {
      if (e.parent) continue;
      tree.appendChild(this._makeTreeNode(e, 0));
    }
  }

  _makeTreeNode(entity, depth) {
    const isSelected = entity.id === this.selectedId;
    const wrap = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 p-1 rounded cursor-pointer ' +
      (isSelected ? 'active-row' : 'hover:bg-gray-700');
    row.style.paddingLeft = (4 + depth * 12) + 'px';

    const iconSvg = entity.hasComponent('behavior')
      ? `<svg class="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>`
      : entity.hasComponent('trigger')
      ? `<svg class="w-3 h-3 text-teal-400" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" fill-rule="evenodd"/></svg>`
      : entity.hasComponent('animlib')
      ? `<svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-8v2h1V5h-1zM5 5v2H4V5h1zm0 8v2H4v-2h1zm13-8v2h-1V5h1zm0 8v2h-1v-2h1zM7 13h6v2H7v-2z" clip-rule="evenodd"/></svg>`
      : entity.hasComponent('camera')
      ? `<svg class="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>`
      : entity.hasComponent('light')
      ? `<svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd"/></svg>`
      : entity.hasComponent('animator')
      ? `<svg class="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path clip-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" fill-rule="evenodd"/></svg>`
      : entity.hasComponent('sprite')
      ? `<svg class="w-3 h-3 text-pink-400" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" fill-rule="evenodd"/></svg>`
      : entity.hasComponent('script')
      ? `<svg class="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fill-rule="evenodd"/></svg>`
      : `<svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" fill-rule="evenodd"/></svg>`;

    const icon = document.createElement('span');
    icon.innerHTML = iconSvg;

    const name = document.createElement('span');
    name.className = 'flex-1 truncate text-xs';
    name.textContent = entity.name;

    // Badges
    if (entity.hasComponent('animator') && this.engine.anim.getClipNames(entity.id).length > 0) {
      const badge = document.createElement('span');
      badge.className = 'text-[9px] bg-purple-900/60 text-purple-300 px-1 rounded';
      badge.textContent = '🦴 ' + this.engine.anim.getClipNames(entity.id).length;
      name.after(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.style.cssText = 'opacity:0;background:transparent;border:none;color:#6b7280;padding:0 4px;cursor:pointer;font-size:13px;';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', ev => { ev.stopPropagation(); this.engine.removeEntity(entity.id); });
    row.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
    row.addEventListener('mouseleave', () => delBtn.style.opacity = '0');
    row.addEventListener('click', () => this._select(entity.id));

    row.appendChild(icon); row.appendChild(name); row.appendChild(delBtn);
    wrap.appendChild(row);
    for (const child of entity.children) wrap.appendChild(this._makeTreeNode(child, depth + 1));
    return wrap;
  }

  _select(id) {
    this.selectedId = id;
    this._refreshTree();
    const entity = this.engine.getEntity(id);
    if (!entity) { this.engine.renderer.detachGizmo(); return; }
    this._renderInspector(entity);
    // Attacher le gizmo à cet objet
    if (entity.object3D && !this.isPlaying) {
      this.engine.renderer.attachGizmo(entity.object3D);
    }
    const sc = entity.getComponent('script');
    if (sc) {
      this.cm.setValue(sc.source);
      document.getElementById('script-entity-name').textContent = entity.name + '.js';
      document.getElementById('script-errors').classList.add('hidden');
      setTimeout(() => this.cm.refresh(), 10);
    }
  }

  _findEntityByObject3D(obj) {
    for (const entity of this.engine.getAllEntities()) {
      if (!entity.object3D) continue;
      let o = obj;
      while (o) { if (o === entity.object3D) return entity; o = o.parent; }
    }
    return null;
  }

  // ─── Inspector ───────────────────────────────────────────────────────────────

  _renderInspector(entity) {
    const el = document.getElementById('inspector-content');
    el.innerHTML = '';

    el.appendChild(this._section('Entité', [
      this._row('Nom', 'text', entity.name, v => { entity.name = v; if (entity.object3D) entity.object3D.name = v; this._refreshTree(); })
    ]));
    el.appendChild(this._section('Transform', [
      this._xyzRow('Pos', entity.position, () => this.engine._syncTransform(entity)),
      this._xyzRow('Rot', entity.rotation, () => this.engine._syncTransform(entity)),
      this._xyzRow('Scl', entity.scale,    () => this.engine._syncTransform(entity)),
    ]));

    for (const [, comp] of entity.components) el.appendChild(this._renderComponent(entity, comp));

    const addBtn = document.createElement('button');
    addBtn.className = 'w-full mt-2 py-1 border border-dashed border-gray-600 text-gray-500 hover:text-blue-400 hover:border-blue-500 rounded text-xs transition-colors';
    addBtn.textContent = '+ Ajouter un composant';
    addBtn.addEventListener('click', () => this._showAddComponentMenu(entity, addBtn));
    el.appendChild(addBtn);
  }

  _renderComponent(entity, comp) {
    const typeLabels = { mesh: 'Mesh', physics: 'Physics', script: 'Script', animator: 'Animator', light: 'Light', sprite: 'Sprite', camera: 'Camera', animlib: 'Anim Library', behavior: 'Behavior AI', trigger: 'Trigger Zone' };
    const typeName = typeLabels[comp.type] || (comp.type.charAt(0).toUpperCase() + comp.type.slice(1));
    const rows = [];
    const remBtn = document.createElement('button');
    remBtn.className = 'text-[9px] text-gray-500 hover:text-red-400 ml-auto';
    remBtn.textContent = '✕';
    remBtn.addEventListener('click', () => { entity.removeComponent(comp.type); this._renderInspector(entity); });

    if (comp.type === 'mesh') {
      rows.push(this._row('Type', 'select', comp.primitiveType, v => { comp.primitiveType = v; this._rebuildMeshById(entity.id); }, ['box','sphere','cylinder','plane']));
      rows.push(this._row('Color', 'color', comp.color, v => {
        comp.color = v;
        if (entity.object3D?.material) entity.object3D.material.color.set(v);
        else this._rebuildMeshById(entity.id);
      }));
      // Import texture button
      const texBtn = document.createElement('button');
      texBtn.className = 'w-full py-1 bg-gray-900/50 text-gray-400 hover:text-blue-400 rounded text-xs border border-gray-700 mt-1';
      texBtn.textContent = '🖼️ Appliquer une texture...';
      texBtn.addEventListener('click', () => {
        this.selectedId = entity.id;
        document.getElementById('texture-input').click();
      });
      rows.push(texBtn);
    }

    if (comp.type === 'physics') {
      rows.push(this._row('Mass', 'number', comp.mass, v => comp.mass = parseFloat(v)||1));
      rows.push(this._row('Gravity', 'checkbox', comp.useGravity, v => comp.useGravity = v));
      rows.push(this._row('Static', 'checkbox', comp.isStatic, v => comp.isStatic = v));
    }

    if (comp.type === 'script') {
      const editBtn = document.createElement('button');
      editBtn.className = 'w-full py-1 bg-blue-900/30 text-blue-400 hover:bg-blue-900/60 rounded text-xs border border-blue-800 mt-1';
      editBtn.textContent = '✏ Éditer le script';
      editBtn.addEventListener('click', () => {
        this.cm.setValue(comp.source);
        document.getElementById('script-entity-name').textContent = entity.name + '.js';
        document.getElementById('script-errors').classList.add('hidden');
        setTimeout(() => this.cm.refresh(), 10);
      });
      rows.push(editBtn);
    }

    if (comp.type === 'animator') {
      const clips = this.engine.anim.getClipNames(entity.id);
      if (clips.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-gray-500 italic text-[10px] mt-1';
        p.textContent = 'Aucune animation — importe un GLTF avec animations';
        rows.push(p);
        // Bouton import GLTF directement depuis l'inspecteur
        const impBtn = document.createElement('button');
        impBtn.className = 'w-full py-1 bg-purple-900/30 text-purple-400 hover:bg-purple-900/60 rounded text-xs border border-purple-800 mt-1';
        impBtn.textContent = '📦 Attacher un modèle GLTF...';
        impBtn.addEventListener('click', () => {
          this._pendingAttachEntityId = entity.id;
          const inp = document.createElement('input');
          inp.type = 'file'; inp.accept = '.glb,.gltf'; inp.style.display = 'none';
          inp.addEventListener('change', async ev => {
            const file = ev.target.files[0]; if (!file) return;
            const url = URL.createObjectURL(file);
            await this.engine.attachGLTF(entity, url);
            this._refreshTree();
            this._renderInspector(entity);
            this._toast('GLTF attaché à ' + entity.name);
          });
          document.body.appendChild(inp); inp.click(); inp.remove();
        });
        rows.push(impBtn);
      } else {
        // Squelette toggle
        rows.push(this._row('🦴 Squelette', 'checkbox', comp.showSkeleton, v => {
          comp.showSkeleton = v;
          this.engine.anim.showSkeleton(entity.id, v);
        }));
        rows.push(this._row('Speed', 'number', comp.speed, v => comp.speed = parseFloat(v)||1));
        // Animations
        const clipTitle = document.createElement('p');
        clipTitle.className = 'text-[10px] text-gray-400 mt-2 mb-1 font-semibold';
        clipTitle.textContent = 'Animations (' + clips.length + ')';
        rows.push(clipTitle);
        for (const clip of clips) {
          const row = document.createElement('div');
          row.className = 'flex items-center gap-2';
          const lbl = document.createElement('span');
          lbl.className = 'flex-1 truncate text-[10px] text-gray-300';
          lbl.textContent = clip;
          const pb = document.createElement('button');
          pb.className = 'text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-green-600 rounded';
          pb.textContent = '▶';
          pb.addEventListener('click', () => this.engine.anim.play(entity.id, clip));
          const sb = document.createElement('button');
          sb.className = 'text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-red-700 rounded';
          sb.textContent = '■';
          sb.addEventListener('click', () => this.engine.anim.stop(entity.id, clip));
          row.appendChild(lbl); row.appendChild(pb); row.appendChild(sb);
          rows.push(row);
        }
      }
    }

    if (comp.type === 'sprite') {
      rows.push(this._row('Larg.', 'number', comp.width,  v => { comp.width  = parseFloat(v)||1; this._rebuildById(entity.id); }));
      rows.push(this._row('Haut.', 'number', comp.height, v => { comp.height = parseFloat(v)||1; this._rebuildById(entity.id); }));
      rows.push(this._row('Teinte', 'color', comp.color,  v => {
        comp.color = v;
        const obj = entity.object3D;
        if (obj?.isSprite) obj.material.color.set(v);
        else if (obj?.isMesh) obj.material.color.set(v);
      }));
      if (comp.imageUrl) {
        const preview = document.createElement('img');
        preview.src = comp.imageUrl;
        preview.style.cssText = 'width:60px;height:60px;object-fit:contain;background:#111;border-radius:4px;border:1px solid #374151;margin-top:2px;';
        rows.push(preview);
      }
      const reimpBtn = document.createElement('button');
      reimpBtn.className = 'w-full py-1 bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 rounded text-xs border border-pink-900 mt-1';
      reimpBtn.textContent = '🎨 Changer l\'image...';
      reimpBtn.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*,.svg'; inp.style.display = 'none';
        inp.addEventListener('change', ev => {
          const file = ev.target.files[0]; if (!file) return;
          comp.imageUrl = URL.createObjectURL(file);
          this._rebuildById(entity.id);
          this._renderInspector(entity);
        });
        document.body.appendChild(inp); inp.click(); inp.remove();
      });
      rows.push(reimpBtn);
    }

    if (comp.type === 'light') {
      rows.push(this._row('Type', 'select', comp.lightType, v => { comp.lightType = v; this._rebuildMeshById(entity.id); this._renderInspector(entity); }, ['point','directional','spot','hemisphere']));
      rows.push(this._row('Color', 'color', comp.color, v => { comp.color = v; this._rebuildMeshById(entity.id); }));
      rows.push(this._row('Intensity', 'number', comp.intensity, v => {
        comp.intensity = parseFloat(v) || 1;
        entity.object3D?.traverse(o => { if (o.isLight) o.intensity = comp.intensity; });
      }));
      rows.push(this._row('Shadow', 'checkbox', comp.castShadow, v => { comp.castShadow = v; this._rebuildMeshById(entity.id); }));
      rows.push(this._row('Shadow Map', 'select', String(comp.shadowMapSize), v => { comp.shadowMapSize = parseInt(v); this._rebuildMeshById(entity.id); }, ['512','1024','2048','4096']));
      if (comp.lightType === 'point' || comp.lightType === 'spot') {
        rows.push(this._row('Distance', 'number', comp.distance, v => { comp.distance = parseFloat(v)||0; this._rebuildMeshById(entity.id); }));
      }
      if (comp.lightType === 'spot') {
        rows.push(this._row('Angle°', 'number', parseFloat((comp.angle * 180 / Math.PI).toFixed(1)), v => { comp.angle = (parseFloat(v)||45) * Math.PI / 180; this._rebuildMeshById(entity.id); }));
        rows.push(this._row('Penumbra', 'number', comp.penumbra, v => { comp.penumbra = parseFloat(v)||0; this._rebuildMeshById(entity.id); }));
      }
      if (comp.lightType === 'hemisphere') {
        rows.push(this._row('Sky Color',    'color', comp.skyColor,    v => { comp.skyColor    = v; this._rebuildMeshById(entity.id); }));
        rows.push(this._row('Ground Color', 'color', comp.groundColor, v => { comp.groundColor = v; this._rebuildMeshById(entity.id); }));
      }
    }

    if (comp.type === 'animlib') {
      this._renderAnimLibPanel(comp, entity, rows);
    }

    if (comp.type === 'camera') {
      rows.push(this._row('Mode', 'select', comp.mode, v => { comp.mode = v; this._renderInspector(entity); }, ['follow','firstPerson','fixed','orbit']));

      // FOV slider
      const fovRow = document.createElement('div');
      fovRow.className = 'flex items-center gap-2';
      const fovLbl = document.createElement('span');
      fovLbl.className = 'text-[10px] text-gray-400 w-16 shrink-0'; fovLbl.textContent = 'FOV';
      const fovSlider = document.createElement('input');
      fovSlider.type = 'range'; fovSlider.min = 10; fovSlider.max = 120; fovSlider.value = comp.fov;
      fovSlider.className = 'flex-1 accent-blue-500';
      const fovVal = document.createElement('span');
      fovVal.className = 'text-[10px] text-gray-300 w-6 text-right'; fovVal.textContent = comp.fov;
      fovSlider.addEventListener('input', () => {
        comp.fov = parseInt(fovSlider.value); fovVal.textContent = comp.fov;
        this.engine.renderer.cameraPerspective.fov = comp.fov;
        this.engine.renderer.cameraPerspective.updateProjectionMatrix();
      });
      fovRow.appendChild(fovLbl); fovRow.appendChild(fovSlider); fovRow.appendChild(fovVal);
      rows.push(fovRow);

      // Active toggle (radio: only one active at a time)
      rows.push(this._row('Active', 'checkbox', comp.active, v => {
        if (v) {
          for (const e of this.engine.getAllEntities()) {
            const cc = e.getComponent('camera');
            if (cc && cc !== comp) cc.active = false;
          }
        }
        comp.active = v;
        this._renderInspector(entity);
      }));

      rows.push(this._row('LookAt', 'checkbox', comp.lookAtEntity, v => comp.lookAtEntity = v));

      if (comp.mode === 'follow' || comp.mode === 'firstPerson') {
        const offLbl = document.createElement('p');
        offLbl.className = 'text-[10px] text-gray-500 mt-1'; offLbl.textContent = 'Offset';
        rows.push(offLbl);
        rows.push(this._row('Off X', 'number', comp.offset.x, v => comp.offset.x = parseFloat(v)||0));
        rows.push(this._row('Off Y', 'number', comp.offset.y, v => comp.offset.y = parseFloat(v)||0));
        rows.push(this._row('Off Z', 'number', comp.offset.z, v => comp.offset.z = parseFloat(v)||0));
      }
    }

    // ── BehaviorComponent ────────────────────────────────────────────────────
    if (comp.type === 'behavior') {
      const typeSelect = document.createElement('select');
      typeSelect.className = 'w-full bg-surf-highest text-on-surf text-xs rounded px-2 py-1 mt-1';
      ['patrol','chase','guardian','echo','idle'].forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        if (comp.behaviorType === t) o.selected = true;
        typeSelect.appendChild(o);
      });
      typeSelect.addEventListener('change', () => { comp.behaviorType = typeSelect.value; });
      rows.push(this._labelRow('Type', typeSelect));

      rows.push(this._row('Speed',      'number', comp.speed,           v => comp.speed           = parseFloat(v)||3));
      rows.push(this._row('Detect (m)', 'number', comp.detectionRadius, v => comp.detectionRadius = parseFloat(v)||10));
      rows.push(this._row('Attack (m)', 'number', comp.attackRadius,    v => comp.attackRadius    = parseFloat(v)||2));
      rows.push(this._row('Target tag', 'text',   comp.targetTag,       v => comp.targetTag       = v));

      // Patrol points list
      const ptHeader = document.createElement('p');
      ptHeader.className = 'text-[10px] font-bold uppercase tracking-[.08rem] text-muted mt-2 mb-1';
      ptHeader.textContent = 'Patrol Points';
      rows.push(ptHeader);

      const refresh = () => {
        const container = document.getElementById('patrol-pts-' + entity.id);
        if (!container) return;
        container.innerHTML = '';
        comp.patrolPoints.forEach((pt, i) => {
          const row = document.createElement('div');
          row.className = 'flex items-center gap-1 text-[10px] mb-0.5';
          ['x','y','z'].forEach(ax => {
            const inp = document.createElement('input');
            inp.type = 'number'; inp.step = '0.1';
            inp.value = pt[ax]; inp.className = 'w-12 bg-surf-highest text-on-surf px-1 py-0.5 rounded text-[10px]';
            inp.addEventListener('change', () => { pt[ax] = parseFloat(inp.value)||0; });
            row.appendChild(inp);
          });
          const del = document.createElement('button');
          del.textContent = '✕'; del.className = 'text-danger ml-1';
          del.addEventListener('click', () => { comp.patrolPoints.splice(i, 1); refresh(); });
          row.appendChild(del);
          container.appendChild(row);
        });
      };

      const ptContainer = document.createElement('div'); ptContainer.id = 'patrol-pts-' + entity.id; rows.push(ptContainer);
      refresh();

      const addPt = document.createElement('button');
      addPt.className = 'w-full text-[10px] bg-accent/20 text-accent rounded py-0.5 mt-1 hover:bg-accent/30';
      addPt.textContent = '+ Point de patrouille';
      addPt.addEventListener('click', () => {
        const p = { ...entity.position };
        comp.patrolPoints.push({ x: p.x + comp.patrolPoints.length, y: p.y, z: p.z });
        refresh();
      });
      rows.push(addPt);

      // Tag on entity
      rows.push(this._row('Entity tag', 'text', entity.tag, v => entity.tag = v));
    }

    // ── TriggerComponent ─────────────────────────────────────────────────────
    if (comp.type === 'trigger') {
      rows.push(this._row('Size X', 'number', comp.size.x, v => comp.size.x = parseFloat(v)||2));
      rows.push(this._row('Size Y', 'number', comp.size.y, v => comp.size.y = parseFloat(v)||2));
      rows.push(this._row('Size Z', 'number', comp.size.z, v => comp.size.z = parseFloat(v)||2));
      rows.push(this._row('Tag filter', 'text', comp.tag,  v => comp.tag   = v));
      rows.push(this._row('One-shot', 'checkbox', comp.oneShot, v => comp.oneShot = v));

      const mkTA = (label, val, setter) => {
        const wrap = document.createElement('div');
        const lbl = document.createElement('p'); lbl.className = 'text-[10px] text-muted mb-0.5'; lbl.textContent = label;
        const ta = document.createElement('textarea');
        ta.className = 'w-full bg-surf-highest text-on-surf text-[10px] font-mono p-1.5 rounded resize-none leading-snug'; ta.rows = 3;
        ta.value = val;
        ta.addEventListener('change', () => setter(ta.value));
        wrap.appendChild(lbl); wrap.appendChild(ta); return wrap;
      };
      rows.push(mkTA('onEnter', comp.onEnter, v => comp.onEnter = v));
      rows.push(mkTA('onExit',  comp.onExit,  v => comp.onExit  = v));
    }

    return this._section(typeName, rows, remBtn);
  }

  _showAddComponentMenu(entity, btn) {
    const existing = [...entity.components.keys()];
    const available = ['mesh','physics','script','animator','light','sprite','camera','animlib','behavior','trigger'].filter(t => !existing.includes(t));
    if (!available.length) return;
    const menu = document.createElement('div');
    menu.style.cssText = `position:fixed;background:#1f2937;border:1px solid #374151;border-radius:6px;z-index:9999;padding:4px 0;min-width:120px;`;
    for (const type of available) {
      const btn2 = document.createElement('button');
      btn2.style.cssText = 'display:block;width:100%;text-align:left;padding:6px 14px;background:transparent;border:none;color:#d1d5db;font-size:12px;cursor:pointer;';
      btn2.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      btn2.addEventListener('mouseover', () => btn2.style.background = '#2563eb');
      btn2.addEventListener('mouseout',  () => btn2.style.background = 'transparent');
      btn2.addEventListener('click', () => {
        const comp = { mesh: MeshComponent, physics: PhysicsComponent, script: ScriptComponent, animator: AnimatorComponent, light: LightComponent, sprite: SpriteComponent, camera: CameraComponent, animlib: AnimationLibraryComponent, behavior: BehaviorComponent, trigger: TriggerComponent }[type];
        entity.addComponent(new comp());
        document.body.removeChild(menu);
        this._renderInspector(entity);
      });
      menu.appendChild(btn2);
    }
    const rect = btn.getBoundingClientRect();
    menu.style.left = rect.left + 'px'; menu.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', function h(e) {
      if (!menu.contains(e.target)) { document.body.removeChild(menu); document.removeEventListener('click', h); }
    }), 0);
  }

  // ─── Play / Stop ─────────────────────────────────────────────────────────────

  _play() {
    if (this.isPlaying) return;
    this._saveCurrentScript();
    const errors = this.engine.play();
    if (errors.length) {
      const el = document.getElementById('script-errors');
      el.classList.remove('hidden');
      el.textContent = errors.map(e => `${e.entity}: ${e.error}`).join('\n');
    }
    this.isPlaying = true;
    document.getElementById('play-badge').classList.remove('hidden');
    document.getElementById('viewport-container')?.classList.add('playing-border');
    const pb = document.getElementById('btn-play'), sb = document.getElementById('btn-stop');
    pb.disabled = true; pb.classList.add('opacity-50','cursor-not-allowed');
    sb.disabled = false; sb.classList.remove('opacity-50','cursor-not-allowed');
  }

  _stop() {
    if (!this.isPlaying) return;
    this.engine.stop(); this.isPlaying = false;
    document.getElementById('play-badge').classList.add('hidden');
    document.getElementById('viewport-container')?.classList.remove('playing-border');
    const pb = document.getElementById('btn-play'), sb = document.getElementById('btn-stop');
    pb.disabled = false; pb.classList.remove('opacity-50','cursor-not-allowed');
    sb.disabled = true;  sb.classList.add('opacity-50','cursor-not-allowed');
    this._refreshTree(); this._updateStatus(); this.engine.startEditorLoop();
  }

  _saveCurrentScript() {
    const entity = this.engine.getEntity(this.selectedId); if (!entity) return;
    const sc = entity.getComponent('script'); if (sc) sc.source = this.cm.getValue();
  }

  // ─── Animation Library Inspector ─────────────────────────────────────────────
  _renderAnimLibPanel(comp, entity, rows) {
    // ── "Add Category" button ─────────────────────────────────────────────────
    const addCatBtn = document.createElement('button');
    addCatBtn.className = 'w-full py-1 bg-blue-900/40 text-blue-400 hover:bg-blue-800/60 rounded text-[10px] border border-blue-800 flex items-center justify-center gap-1';
    addCatBtn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Nouvelle catégorie`;
    addCatBtn.addEventListener('click', () => {
      const name = prompt('Nom de la catégorie (ex: courir, sauter, idle) :');
      if (!name?.trim()) return;
      const n = name.trim().toLowerCase().replace(/\s+/g, '_');
      if (comp.categories[n]) { this._toast(`"${n}" existe déjà`); return; }
      comp.addCategory(n);
      this._renderInspector(entity);
    });
    rows.push(addCatBtn);

    // ── One block per category ────────────────────────────────────────────────
    for (const [catName, cat] of Object.entries(comp.categories)) {
      const block = document.createElement('div');
      block.className = 'border border-gray-700 rounded mt-2 overflow-hidden';

      // Category header
      const hdr = document.createElement('div');
      hdr.className = 'flex items-center justify-between px-2 py-1 bg-gray-700/60';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'text-[10px] font-bold text-cyan-400 font-mono';
      nameSpan.textContent = catName + ` (${cat.frames.length} frames)`;

      // Preview play button (editor preview, not game play)
      const previewBtn = document.createElement('button');
      previewBtn.className = 'text-[9px] px-1.5 py-0.5 bg-gray-600 hover:bg-green-700 rounded text-gray-300';
      previewBtn.title = 'Prévisualiser';
      previewBtn.textContent = '▶';
      previewBtn.addEventListener('click', () => {
        this.engine.animLib.play(entity.id, catName, entity);
      });

      // Delete category
      const delCatBtn = document.createElement('button');
      delCatBtn.className = 'text-[9px] px-1.5 py-0.5 bg-gray-600 hover:bg-red-700 rounded text-gray-300 ml-1';
      delCatBtn.title = 'Supprimer la catégorie';
      delCatBtn.textContent = '✕';
      delCatBtn.addEventListener('click', () => {
        if (!confirm(`Supprimer "${catName}" ?`)) return;
        comp.removeCategory(catName);
        this._renderInspector(entity);
      });

      hdr.appendChild(nameSpan);
      const btnGroup = document.createElement('div'); btnGroup.className = 'flex gap-1';
      btnGroup.appendChild(previewBtn); btnGroup.appendChild(delCatBtn);
      hdr.appendChild(btnGroup);
      block.appendChild(hdr);

      // Settings row: FPS + Loop
      const settings = document.createElement('div');
      settings.className = 'flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 border-b border-gray-700';

      const fpsLbl = document.createElement('span'); fpsLbl.className = 'text-[9px] text-gray-500'; fpsLbl.textContent = 'FPS';
      const fpsInp = document.createElement('input');
      fpsInp.type = 'number'; fpsInp.min = 1; fpsInp.max = 60; fpsInp.step = 1; fpsInp.value = cat.fps;
      fpsInp.className = 'w-12 bg-gray-900 border border-gray-600 rounded text-[10px] text-gray-200 px-1 py-0.5';
      fpsInp.addEventListener('change', () => { cat.fps = Math.max(1, parseInt(fpsInp.value) || 12); });

      const loopLbl = document.createElement('span'); loopLbl.className = 'text-[9px] text-gray-500 ml-2'; loopLbl.textContent = 'Loop';
      const loopChk = document.createElement('input'); loopChk.type = 'checkbox'; loopChk.checked = cat.loop;
      loopChk.className = 'accent-blue-500';
      loopChk.addEventListener('change', () => { cat.loop = loopChk.checked; });

      settings.appendChild(fpsLbl); settings.appendChild(fpsInp);
      settings.appendChild(loopLbl); settings.appendChild(loopChk);
      block.appendChild(settings);

      // Frame thumbnails strip
      if (cat.frames.length > 0) {
        const strip = document.createElement('div');
        strip.className = 'flex flex-wrap gap-1 p-2 bg-gray-900/60';
        cat.frames.forEach((url, idx) => {
          const wrap = document.createElement('div');
          wrap.className = 'relative group';
          const img = document.createElement('img');
          img.src = url;
          img.className = 'w-10 h-10 object-contain bg-gray-800 rounded border border-gray-700';
          img.title = `Frame ${idx + 1}`;
          const num = document.createElement('span');
          num.className = 'absolute bottom-0 left-0 text-[8px] bg-black/60 text-gray-300 px-0.5 rounded-br';
          num.textContent = idx + 1;
          const delFrame = document.createElement('button');
          delFrame.className = 'absolute top-0 right-0 hidden group-hover:flex w-4 h-4 bg-red-700 rounded-full text-[8px] text-white items-center justify-center';
          delFrame.textContent = '×';
          delFrame.addEventListener('click', () => {
            comp.removeFrame(catName, idx);
            this._renderInspector(entity);
          });
          wrap.appendChild(img); wrap.appendChild(num); wrap.appendChild(delFrame);
          strip.appendChild(wrap);
        });
        block.appendChild(strip);
      }

      // "Add Frames" button (multi-file)
      const addFramesBtn = document.createElement('button');
      addFramesBtn.className = 'w-full py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] border-t border-gray-700 flex items-center justify-center gap-1';
      addFramesBtn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> Ajouter des frames...`;
      addFramesBtn.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
        inp.addEventListener('change', () => {
          // Sort files by name for correct frame order (1.png, 2.png, ...)
          const files = [...inp.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
          for (const file of files) {
            comp.addFrame(catName, URL.createObjectURL(file));
          }
          this.engine.animLib.preload(comp);
          this._renderInspector(entity);
          this._toast(`${files.length} frame(s) ajoutée(s) à "${catName}"`);
        });
        document.body.appendChild(inp); inp.click(); inp.remove();
      });
      block.appendChild(addFramesBtn);
      rows.push(block);
    }

    // Script usage hint
    if (Object.keys(comp.categories).length > 0) {
      const hint = document.createElement('div');
      hint.className = 'mt-2 p-2 bg-gray-900/60 rounded border border-gray-700/50 text-[9px] text-gray-500 font-mono';
      const first = Object.keys(comp.categories)[0];
      hint.innerHTML = `// Dans un script :<br>api.anim.play('<span class="text-cyan-400">${first}</span>')<br>api.anim.stop()<br>api.anim.isPlaying('<span class="text-cyan-400">${first}</span>')`;
      rows.push(hint);
    }
  }

  // ─── Left Panel (Levels + WorldGen) ─────────────────────────────────────────

  _bindLeftPanel() {
    const panel  = document.getElementById('left-panel');
    const btnMap = {
      'lp-btn-levels':   'left-panel-levels',
      'lp-btn-worldgen': 'left-panel-worldgen',
    };

    Object.entries(btnMap).forEach(([btnId, contentId]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const isOpen = !panel.classList.contains('w-0');
        const showing = document.querySelector('.lp-content:not(.hidden)')?.id === contentId;
        // Toggle
        if (isOpen && showing) {
          panel.classList.add('w-0'); panel.classList.remove('w-64');
        } else {
          panel.classList.remove('w-0'); panel.classList.add('w-64');
          document.querySelectorAll('.lp-content').forEach(el => el.classList.add('hidden'));
          document.getElementById(contentId)?.classList.remove('hidden');
        }
      });
    });

    this._refreshLevelsPanel();
  }

  _refreshLevelsPanel() {
    const container = document.getElementById('levels-list');
    if (!container) return;
    container.innerHTML = '';
    const levels = this.engine.levels.getAllLevels();
    const current = this.engine.levels.getCurrentLevel();

    if (levels.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-[10px] text-muted text-center py-4 opacity-40';
      empty.textContent = 'Aucun niveau — cliquez +';
      container.appendChild(empty);
      return;
    }

    for (const lv of levels) {
      const row = document.createElement('div');
      row.className = `flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${lv.id === current?.id ? 'bg-accent/20 text-accent' : 'text-on-surf hover:bg-surf-highest'}`;

      const nameEl = document.createElement('span');
      nameEl.className = 'flex-1 truncate font-mono text-[11px]'; nameEl.textContent = lv.name;

      const load = document.createElement('button');
      load.className = 'text-[9px] text-muted hover:text-accent px-1'; load.title = 'Charger';
      load.innerHTML = '<span class="material-symbols-outlined" style="font-size:13px">play_circle</span>';
      load.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.engine.levels.loadLevel(lv.id);
      });

      const rename = document.createElement('button');
      rename.className = 'text-[9px] text-muted hover:text-on-surf px-1'; rename.title = 'Renommer';
      rename.innerHTML = '<span class="material-symbols-outlined" style="font-size:13px">edit</span>';
      rename.addEventListener('click', e => {
        e.stopPropagation();
        const n = prompt('Nouveau nom :', lv.name);
        if (n?.trim()) { this.engine.levels.renameLevel(lv.id, n.trim()); this._refreshLevelsPanel(); }
      });

      const del = document.createElement('button');
      del.className = 'text-[9px] text-danger hover:text-red-400 px-1'; del.title = 'Supprimer';
      del.innerHTML = '<span class="material-symbols-outlined" style="font-size:13px">delete</span>';
      del.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`Supprimer "${lv.name}" ?`)) return;
        this.engine.levels.deleteLevel(lv.id); this._refreshLevelsPanel();
      });

      row.appendChild(nameEl); row.appendChild(load); row.appendChild(rename); row.appendChild(del);
      container.appendChild(row);
    }
  }

  // ─── MCP WebSocket bridge ────────────────────────────────────────────────────

  _connectMCP() {
    try {
      const ws = new WebSocket('ws://localhost:3001');
      ws.onopen  = () => {
        this._mcpSocket = ws; console.info('[MCP] Connecté');
        const d = document.getElementById('mcp-dot');
        if (d) { d.className = 'w-2 h-2 rounded-full bg-success animate-pulse'; d.title = 'MCP connecté'; }
      };
      ws.onclose = () => {
        this._mcpSocket = null;
        const d = document.getElementById('mcp-dot');
        if (d) { d.className = 'w-2 h-2 rounded-full bg-ghost'; d.title = 'MCP déconnecté'; }
        setTimeout(() => this._connectMCP(), 4000);
      };
      ws.onerror = () => {};
      ws.onmessage = e => { try { this._handleMCPMessage(JSON.parse(e.data)); } catch(_) {} };
    } catch (_) {}
  }

  _handleMCPMessage(msg) {
    const { id, cmd } = msg;
    let result = null, error = null;
    try {
      switch (cmd) {
        case 'create_entity': {
          const e = this.engine.createPrimitive(msg.type || 'cube', msg.name);
          e.position.x = msg.x ?? 0; e.position.y = msg.y ?? 1; e.position.z = msg.z ?? 0;
          if (msg.tag) e.tag = msg.tag;
          this.engine._syncTransform(e); this._refreshTree(); this._updateStatus();
          result = { id: e.id, name: e.name };
          break;
        }
        case 'set_script': {
          const e = this.engine.getEntity(msg.entityId);
          if (!e) throw new Error('Entity not found: ' + msg.entityId);
          let sc = e.getComponent('script');
          if (!sc) { sc = new ScriptComponent(); e.addComponent(sc); }
          sc.source = msg.code; result = { ok: true };
          break;
        }
        case 'list_entities': {
          result = this.engine.getAllEntities().map(e => ({
            id: e.id, name: e.name, tag: e.tag,
            position: e.position, components: [...e.components.keys()],
          }));
          break;
        }
        case 'generate_world': {
          result = this.engine.worldgen.generate(msg.params || {});
          break;
        }
        case 'create_level': {
          const lv = this.engine.levels.createLevel(msg.name);
          this._refreshLevelsPanel(); result = { id: lv.id, name: lv.name };
          break;
        }
        case 'load_level': {
          this.engine.levels.loadLevel(msg.id); result = { ok: true };
          break;
        }
        case 'set_entity_color': {
          const e = this.engine.getEntity(msg.entityId);
          if (!e) throw new Error('Entity not found');
          const mc = e.getComponent('mesh');
          if (mc) { mc.color = msg.color; this._rebuildMeshById(e.id); }
          result = { ok: true };
          break;
        }
        case 'add_behavior': {
          const e = this.engine.getEntity(msg.entityId);
          if (!e) throw new Error('Entity not found');
          const bc = new BehaviorComponent();
          bc.behaviorType    = msg.behaviorType    || 'patrol';
          bc.speed           = msg.speed           ?? 3;
          bc.detectionRadius = msg.detectionRadius ?? 10;
          if (msg.targetTag) bc.targetTag = msg.targetTag;
          e.addComponent(bc); this._refreshTree(); result = { ok: true };
          break;
        }
        case 'add_trigger': {
          const e = this.engine.getEntity(msg.entityId);
          if (!e) throw new Error('Entity not found');
          const tc = new TriggerComponent();
          if (msg.size)    Object.assign(tc.size, msg.size);
          if (msg.onEnter) tc.onEnter = msg.onEnter;
          if (msg.onExit)  tc.onExit  = msg.onExit;
          if (msg.tag)     tc.tag     = msg.tag;
          e.addComponent(tc); this._refreshTree(); result = { ok: true };
          break;
        }
        case 'clear_world': { this.engine.worldgen.clearGenerated(); result = { ok: true }; break; }
        case 'play':  { if (!this.isPlaying) this._play();  result = { ok: true }; break; }
        case 'stop':  { if (this.isPlaying)  this._stop();  result = { ok: true }; break; }
        case 'save':  { this._save(); result = { ok: true }; break; }
        default: throw new Error('Unknown command: ' + cmd);
      }
    } catch (err) { error = err.message; }

    if (this._mcpSocket) {
      this._mcpSocket.send(JSON.stringify({ id, result, error }));
    }
  }

  _showGlobalLightsPanel(triggerEvent) {
    const existing = document.getElementById('global-lights-panel');
    if (existing) { existing.remove(); return; }

    const gl = this._globalLights;
    const panel = document.createElement('div');
    panel.id = 'global-lights-panel';
    panel.style.cssText = 'position:fixed;background:#1f2937;border:1px solid #374151;border-radius:8px;z-index:9999;padding:12px;width:280px;';
    // Position near button
    const rect = triggerEvent.target.getBoundingClientRect();
    panel.style.top  = (rect.bottom + 4) + 'px';
    panel.style.left = Math.max(4, rect.left - 200) + 'px';

    const title = document.createElement('div');
    title.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
    const t = document.createElement('span');
    t.style.cssText = 'font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase;';
    t.textContent = 'Lumières Globales';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×'; closeBtn.style.cssText = 'background:none;border:none;color:#9ca3af;font-size:16px;cursor:pointer;line-height:1;';
    closeBtn.onclick = () => panel.remove();
    title.appendChild(t); title.appendChild(closeBtn);
    panel.appendChild(title);

    const mkSection = (label) => {
      const s = document.createElement('p');
      s.style.cssText = 'font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:8px 0 4px;';
      s.textContent = label; panel.appendChild(s);
    };
    const mkRow = (label, type, val, onChange) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:10px;color:#9ca3af;width:64px;flex-shrink:0;'; lbl.textContent = label;
      const inp = document.createElement('input');
      inp.type = type; inp.value = val;
      inp.style.cssText = type === 'color'
        ? 'width:32px;height:22px;padding:0;border:none;background:none;cursor:pointer;'
        : 'flex:1;background:#111827;border:1px solid #374151;border-radius:4px;color:#f9fafb;font-size:11px;padding:2px 6px;';
      if (type === 'range') { inp.min = inp.dataset.min || 0; inp.max = inp.dataset.max || 1; inp.step = '0.01'; }
      inp.addEventListener('input', () => onChange(inp.value));
      row.appendChild(lbl); row.appendChild(inp);
      if (type === 'range') {
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:10px;color:#9ca3af;width:28px;text-align:right;'; badge.textContent = parseFloat(val).toFixed(1);
        inp.addEventListener('input', () => badge.textContent = parseFloat(inp.value).toFixed(1));
        row.appendChild(badge);
      }
      panel.appendChild(row);
    };

    mkSection('Ambient');
    mkRow('Color', 'color', gl.ambientColor, v => { gl.ambientColor = v; this.engine.renderer.setAmbientLight(gl.ambientColor, gl.ambientIntensity); });
    const ambIntRow = document.createElement('div');
    ambIntRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    const ambLbl = document.createElement('span'); ambLbl.style.cssText = 'font-size:10px;color:#9ca3af;width:64px;flex-shrink:0;'; ambLbl.textContent = 'Intensity';
    const ambSlider = document.createElement('input'); ambSlider.type = 'range'; ambSlider.min = 0; ambSlider.max = 3; ambSlider.step = 0.05; ambSlider.value = gl.ambientIntensity;
    ambSlider.style.cssText = 'flex:1;accent-color:#3b82f6;';
    const ambBadge = document.createElement('span'); ambBadge.style.cssText = 'font-size:10px;color:#9ca3af;width:28px;text-align:right;'; ambBadge.textContent = gl.ambientIntensity.toFixed(1);
    ambSlider.addEventListener('input', () => { gl.ambientIntensity = parseFloat(ambSlider.value); ambBadge.textContent = gl.ambientIntensity.toFixed(1); this.engine.renderer.setAmbientLight(gl.ambientColor, gl.ambientIntensity); });
    ambIntRow.appendChild(ambLbl); ambIntRow.appendChild(ambSlider); ambIntRow.appendChild(ambBadge);
    panel.appendChild(ambIntRow);

    mkSection('Soleil');
    mkRow('Color', 'color', gl.sunColor, v => { gl.sunColor = v; this.engine.renderer.setSunLight(gl.sunColor, gl.sunIntensity, gl.sunAzimuth, gl.sunElevation); });

    const mkSunSlider = (label, key, min, max, suffix) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
      const lbl = document.createElement('span'); lbl.style.cssText = 'font-size:10px;color:#9ca3af;width:64px;flex-shrink:0;'; lbl.textContent = label;
      const sl = document.createElement('input'); sl.type = 'range'; sl.min = min; sl.max = max; sl.step = 1; sl.value = gl[key];
      sl.style.cssText = 'flex:1;accent-color:#3b82f6;';
      const badge = document.createElement('span'); badge.style.cssText = 'font-size:10px;color:#9ca3af;width:32px;text-align:right;'; badge.textContent = gl[key] + suffix;
      sl.addEventListener('input', () => { gl[key] = parseInt(sl.value); badge.textContent = gl[key] + suffix; this.engine.renderer.setSunLight(gl.sunColor, gl.sunIntensity, gl.sunAzimuth, gl.sunElevation); });
      row.appendChild(lbl); row.appendChild(sl); row.appendChild(badge);
      panel.appendChild(row);
    };

    const sunIntRow = document.createElement('div');
    sunIntRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    const sunLbl = document.createElement('span'); sunLbl.style.cssText = 'font-size:10px;color:#9ca3af;width:64px;flex-shrink:0;'; sunLbl.textContent = 'Intensity';
    const sunSlider = document.createElement('input'); sunSlider.type = 'range'; sunSlider.min = 0; sunSlider.max = 5; sunSlider.step = 0.1; sunSlider.value = gl.sunIntensity;
    sunSlider.style.cssText = 'flex:1;accent-color:#3b82f6;';
    const sunBadge = document.createElement('span'); sunBadge.style.cssText = 'font-size:10px;color:#9ca3af;width:28px;text-align:right;'; sunBadge.textContent = gl.sunIntensity.toFixed(1);
    sunSlider.addEventListener('input', () => { gl.sunIntensity = parseFloat(sunSlider.value); sunBadge.textContent = gl.sunIntensity.toFixed(1); this.engine.renderer.setSunLight(gl.sunColor, gl.sunIntensity, gl.sunAzimuth, gl.sunElevation); });
    sunIntRow.appendChild(sunLbl); sunIntRow.appendChild(sunSlider); sunIntRow.appendChild(sunBadge);
    panel.appendChild(sunIntRow);

    mkSunSlider('Azimuth', 'sunAzimuth', 0, 360, '°');
    mkSunSlider('Elevation', 'sunElevation', 0, 90, '°');

    document.body.appendChild(panel);
    // Close on outside click
    const outsideClick = (ev) => { if (!panel.contains(ev.target)) { panel.remove(); document.removeEventListener('mousedown', outsideClick); } };
    setTimeout(() => document.addEventListener('mousedown', outsideClick), 0);
  }

  // ─── Inspector helpers ───────────────────────────────────────────────────────

  _section(title, rows = [], extraHeader = null) {
    const sec = document.createElement('div'); sec.className = 'space-y-1';
    const h = document.createElement('div'); h.className = 'flex items-center';
    const t = document.createElement('span');
    t.className = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest';
    t.textContent = title; h.appendChild(t);
    if (extraHeader) h.appendChild(extraHeader);
    sec.appendChild(h);
    for (const r of rows) if (r) sec.appendChild(r);
    return sec;
  }

  _row(label, inputType, value, onChange, options = null) {
    const row = document.createElement('div'); row.className = 'flex items-center gap-2';
    const lbl = document.createElement('span');
    lbl.className = 'text-[10px] text-gray-400 w-16 shrink-0'; lbl.textContent = label;
    row.appendChild(lbl);
    let input;
    if (inputType === 'select') {
      input = document.createElement('select');
      input.className = 'flex-1 bg-gray-900 border border-gray-700 text-gray-200 rounded text-[10px] px-1 py-0.5';
      for (const opt of options) { const o = document.createElement('option'); o.value = o.textContent = opt; if (opt === value) o.selected = true; input.appendChild(o); }
      input.addEventListener('change', () => onChange(input.value));
    } else if (inputType === 'checkbox') {
      const wrap = document.createElement('div'); wrap.className = 'flex-1';
      input = document.createElement('input'); input.type = 'checkbox'; input.checked = value;
      input.className = 'rounded border-gray-600';
      input.addEventListener('change', () => onChange(input.checked));
      wrap.appendChild(input); row.appendChild(wrap); return row;
    } else if (inputType === 'color') {
      input = document.createElement('input'); input.type = 'color'; input.value = value;
      input.className = 'w-8 h-6 rounded border border-gray-700 bg-gray-900 cursor-pointer';
      input.addEventListener('input', () => onChange(input.value));
    } else {
      input = document.createElement('input'); input.type = inputType; input.value = value;
      input.className = 'flex-1 bg-gray-900 border border-gray-700 text-gray-200 rounded text-[10px] px-1 py-0.5';
      if (inputType === 'number') input.step = '0.1';
      input.addEventListener('input', () => onChange(input.value));
    }
    row.appendChild(input); return row;
  }

  _labelRow(label, control) {
    const row = document.createElement('div'); row.className = 'flex items-center gap-2';
    const lbl = document.createElement('span');
    lbl.className = 'text-[10px] text-gray-400 w-16 shrink-0'; lbl.textContent = label;
    row.appendChild(lbl); row.appendChild(control); return row;
  }

  _xyzRow(label, vec, onChange) {
    const row = document.createElement('div'); row.className = 'flex items-center gap-1';
    const lbl = document.createElement('span');
    lbl.className = 'text-[10px] text-gray-400 w-16 shrink-0'; lbl.textContent = label;
    row.appendChild(lbl);
    const colors = { x:'bg-red-900/40', y:'bg-green-900/40', z:'bg-blue-900/40' };
    for (const axis of ['x','y','z']) {
      const wrap = document.createElement('div');
      wrap.className = 'bg-gray-900 flex rounded overflow-hidden border border-gray-700 flex-1';
      const al = document.createElement('span');
      al.className = `${colors[axis]} text-[9px] w-4 flex items-center justify-center border-r border-gray-700 uppercase text-gray-300`;
      al.textContent = axis;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.step = '0.1'; inp.value = parseFloat(vec[axis]).toFixed(2);
      inp.className = 'w-full bg-transparent text-[10px] px-1 py-0.5 focus:outline-none text-gray-200';
      inp.addEventListener('input', () => { vec[axis] = parseFloat(inp.value)||0; onChange(); });
      wrap.appendChild(al); wrap.appendChild(inp); row.appendChild(wrap);
    }
    return row;
  }
}

new Editor();
