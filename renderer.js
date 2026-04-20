// ─── renderer.js ──────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls }    from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Renderer {
  constructor(container) {
    this.container = container;
    this.mode = '3d'; // '3d' | '2d' | '2d3d'

    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x2a2a2e);
    this.threeScene.fog = new THREE.Fog(0x2a2a2e, 30, 80);

    // WebGL Renderer
    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    // Bloquer le menu natif sur le canvas
    this.webgl.domElement.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
    });

    const { width, height } = container.getBoundingClientRect();
    const aspect = (width || 1) / (height || 1);

    // ── Caméra Perspective (mode 3D) ──────────────────────────────────────────
    this.cameraPerspective = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.cameraPerspective.position.set(0, 8, 14);
    this.cameraPerspective.lookAt(0, 0, 0);

    // ── Caméra Orthographique (mode 2D) ───────────────────────────────────────
    this._orthoHeight = 10; // hauteur en unités monde
    this.cameraOrtho = new THREE.OrthographicCamera(
      -this._orthoHeight * aspect / 2,
       this._orthoHeight * aspect / 2,
       this._orthoHeight / 2,
      -this._orthoHeight / 2,
      0.1, 1000
    );
    this.cameraOrtho.position.set(0, 0, 20);
    this.cameraOrtho.lookAt(0, 0, 0);

    // Caméra active = perspective par défaut
    this.camera = this.cameraPerspective;

    // ── Lumières ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.threeScene.add(ambient);
    this._ambient = ambient;

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(8, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;   sun.shadow.camera.bottom = -20;
    this.threeScene.add(sun);
    this._sun = sun;

    // ── Camera follow state (play mode) ───────────────────────────────────────
    this._followEntity = null;
    this._followComp   = null;
    this._playMode     = false;

    // ── Editor helpers ────────────────────────────────────────────────────────
    this._grid = new THREE.GridHelper(40, 40, 0x444444, 0x333333);
    this.threeScene.add(this._grid);
    this._axes = new THREE.AxesHelper(3);
    this.threeScene.add(this._axes);

    // ── OrbitControls ─────────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.webgl.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1, 0);

    // ── TransformControls (gizmo déplacement/rotation/scale) ─────────────────
    this.transformControls = new TransformControls(this.camera, this.webgl.domElement);
    this.transformControls.setSize(0.8);
    // Désactiver OrbitControls pendant le drag
    this.transformControls.addEventListener('dragging-changed', e => {
      this.controls.enabled = !e.value;
    });
    this.threeScene.add(this.transformControls);

    // ── Resize ────────────────────────────────────────────────────────────────
    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(container);
    this._onResize();
  }

  _onResize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    this.webgl.setSize(width, height);
    const a = width / height;

    // Perspective
    this.cameraPerspective.aspect = a;
    this.cameraPerspective.updateProjectionMatrix();

    // Ortho
    this.cameraOrtho.left   = -this._orthoHeight * a / 2;
    this.cameraOrtho.right  =  this._orthoHeight * a / 2;
    this.cameraOrtho.top    =  this._orthoHeight / 2;
    this.cameraOrtho.bottom = -this._orthoHeight / 2;
    this.cameraOrtho.updateProjectionMatrix();
  }

  render() {
    this._updateCameraFollow();
    if (!this._playMode) this.controls.update();
    this.webgl.render(this.threeScene, this.camera);
  }

  // ── Changement de mode 2D / 3D / 2D+3D ──────────────────────────────────────
  setMode(mode) {
    this.mode = mode;

    if (mode === '2d') {
      this.camera = this.cameraOrtho;
      this.controls.object = this.cameraOrtho;
      this.controls.enableRotate = false;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN,
      };
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      // Grille dans le plan XY pour la 2D
      this._grid.rotation.set(Math.PI / 2, 0, 0);
      this._grid.position.set(0, 0, 0);
      this.threeScene.fog = null;
      this.threeScene.background = new THREE.Color(0x1a1a2e);
    } else {
      this.camera = this.cameraPerspective;
      this.controls.object = this.cameraPerspective;
      this.controls.enableRotate = true;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN,
      };
      this.controls.target.set(0, 1, 0);
      this.controls.update();
      // Grille dans le plan XZ (sol)
      this._grid.rotation.set(0, 0, 0);
      this._grid.position.set(0, 0, 0);
      this.threeScene.fog = new THREE.Fog(0x2a2a2e, 30, 80);
      this.threeScene.background = new THREE.Color(0x2a2a2e);
    }
    // Synchroniser la caméra du gizmo
    this.transformControls.camera = this.camera;
  }

  setEditorMode(enabled) {
    this._grid.visible = enabled;
    this._axes.visible = enabled;
    this.transformControls.visible = enabled;
    this.transformControls.enabled = enabled;
    if (!enabled) this.transformControls.detach();

    this._playMode = !enabled;
    if (enabled) {
      // Restore orbit camera
      this.camera = this.cameraPerspective;
      this.controls.object = this.cameraPerspective;
      this.controls.enabled = true;
      this.transformControls.camera = this.camera;
      this._followEntity = null;
      this._followComp   = null;
    } else {
      this.controls.enabled = false;
    }
  }

  activateCameraEntity(entity, cc) {
    this._followEntity = entity;
    this._followComp   = cc;
    this.controls.enabled = false;
    this.cameraPerspective.fov = cc.fov;
    this.cameraPerspective.updateProjectionMatrix();
    this.camera = this.cameraPerspective;
  }

  _updateCameraFollow() {
    if (!this._playMode || !this._followEntity || !this._followComp) return;
    const e   = this._followEntity;
    const cc  = this._followComp;
    const cam = this.cameraPerspective;
    const ep  = e.position;
    const er  = e.rotation;

    if (cc.mode === 'follow') {
      const yaw = er.y;
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const wx = cosY * cc.offset.x - sinY * cc.offset.z;
      const wz = sinY * cc.offset.x + cosY * cc.offset.z;
      const tx = ep.x + wx, ty = ep.y + cc.offset.y, tz = ep.z + wz;
      const a = 0.1;
      cam.position.x += (tx - cam.position.x) * a;
      cam.position.y += (ty - cam.position.y) * a;
      cam.position.z += (tz - cam.position.z) * a;
      if (cc.lookAtEntity) cam.lookAt(ep.x, ep.y + 1, ep.z);
    } else if (cc.mode === 'firstPerson') {
      cam.position.set(ep.x, ep.y + 0.8, ep.z);
      const dir = new THREE.Vector3(0, 0, -1);
      dir.applyEuler(new THREE.Euler(er.x, er.y, er.z, 'YXZ'));
      cam.lookAt(cam.position.x + dir.x, cam.position.y + dir.y, cam.position.z + dir.z);
    } else if (cc.mode === 'fixed') {
      cam.position.set(ep.x, ep.y, ep.z);
      cam.rotation.set(er.x, er.y, er.z);
    }
    // 'orbit': OrbitControls handles it (controls re-enabled in activateCameraEntity fallback)
  }

  setAmbientLight(color, intensity) {
    this._ambient.color.set(color);
    this._ambient.intensity = intensity;
  }

  setSunLight(color, intensity, azimuthDeg, elevationDeg) {
    this._sun.color.set(color);
    this._sun.intensity = intensity;
    const az = azimuthDeg  * Math.PI / 180;
    const el = elevationDeg * Math.PI / 180;
    const r  = 16;
    this._sun.position.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
  }

  // ── Gizmo helpers ─────────────────────────────────────────────────────────
  attachGizmo(obj3D)      { this.transformControls.attach(obj3D); }
  detachGizmo()           { this.transformControls.detach(); }
  setGizmoMode(mode)      { this.transformControls.setMode(mode); } // 'translate'|'rotate'|'scale'

  // ── Construction d'objets Three.js ───────────────────────────────────────────
  buildObject3D(entity, assetLoader) {
    const sc = entity.getComponent('sprite');
    const mc = entity.getComponent('mesh');
    const lc = entity.getComponent('light');
    if (sc) return this.buildSprite(entity, sc);
    if (mc) return this._buildMesh(entity, mc, assetLoader);
    if (lc) return this._buildLight(lc);
    const obj = new THREE.Object3D();
    obj.name = entity.name;
    return obj;
  }

  buildSprite(entity, sc) {
    if (!sc.imageUrl) {
      // Placeholder coloré (pas encore d'image)
      const geo = new THREE.PlaneGeometry(sc.width, sc.height);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(sc.color), side: THREE.DoubleSide, transparent: true, opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = entity.name;
      return mesh;
    }

    const tex = this._loadTexSync(sc.imageUrl);

    if (this.mode === '2d') {
      // Mode 2D : plane flat dans XY
      const geo = new THREE.PlaneGeometry(sc.width, sc.height);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, side: THREE.DoubleSide,
        color: new THREE.Color(sc.color),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = entity.name;
      return mesh;
    } else {
      // Mode 3D / 2D+3D : Sprite billboard (toujours face caméra)
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, color: new THREE.Color(sc.color),
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(sc.width, sc.height, 1);
      sprite.name = entity.name;
      return sprite;
    }
  }

  _loadTexSync(url) {
    // Retourne immédiatement un Texture (texture vide au début,
    // se remplit automatiquement une fois le GPU upload terminé)
    return new THREE.TextureLoader().load(url);
  }

  _buildMesh(entity, mc) {
    let geo;
    if (mc.primitiveType === 'sphere') {
      geo = new THREE.SphereGeometry(mc.size[0] * 0.5, 16, 16);
    } else if (mc.primitiveType === 'cylinder') {
      geo = new THREE.CylinderGeometry(mc.size[0] * 0.5, mc.size[0] * 0.5, mc.size[1], 12);
    } else if (mc.primitiveType === 'plane') {
      geo = new THREE.PlaneGeometry(mc.size[0], mc.size[2] || mc.size[0]);
      geo.rotateX(-Math.PI / 2);
    } else {
      geo = new THREE.BoxGeometry(...mc.size);
    }
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(mc.color) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mc.castShadow;
    mesh.receiveShadow = mc.receiveShadow;
    mesh.name = entity.name;
    return mesh;
  }

  _buildLight(lc) {
    const color = new THREE.Color(lc.color);
    const group = new THREE.Group();
    let light;

    if (lc.lightType === 'hemisphere') {
      light = new THREE.HemisphereLight(new THREE.Color(lc.skyColor), new THREE.Color(lc.groundColor), lc.intensity);
      group.add(light);
      return group;
    }

    if (lc.lightType === 'directional') {
      light = new THREE.DirectionalLight(color, lc.intensity);
      if (lc.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.set(lc.shadowMapSize, lc.shadowMapSize);
        light.shadow.camera.near = 0.5; light.shadow.camera.far = 100;
        light.shadow.camera.left = -20; light.shadow.camera.right = 20;
        light.shadow.camera.top  =  20; light.shadow.camera.bottom = -20;
      }
      group.add(light);
      group.add(new THREE.DirectionalLightHelper(light, 1));
    } else if (lc.lightType === 'spot') {
      light = new THREE.SpotLight(color, lc.intensity, lc.distance || 0, lc.angle, lc.penumbra);
      if (lc.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.set(lc.shadowMapSize, lc.shadowMapSize);
      }
      group.add(light);
      group.add(new THREE.SpotLightHelper(light));
    } else {
      // point
      light = new THREE.PointLight(color, lc.intensity, lc.distance || 20);
      if (lc.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.set(lc.shadowMapSize, lc.shadowMapSize);
      }
      group.add(light);
      group.add(new THREE.PointLightHelper(light, 0.3));
    }

    return group;
  }

  // Déprojection ortho → world XY (utilisé par l'éditeur en mode 2D)
  unprojectOrtho(ndcX, ndcY) {
    const cam = this.cameraOrtho;
    const vec = new THREE.Vector3(ndcX, ndcY, 0);
    vec.unproject(cam);
    return { x: parseFloat(vec.x.toFixed(2)), y: parseFloat(vec.y.toFixed(2)), z: 0 };
  }

  addToScene(obj3D)    { this.threeScene.add(obj3D); }
  removeFromScene(obj3D) { this.threeScene.remove(obj3D); }
}
