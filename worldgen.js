// ─── worldgen.js ──────────────────────────────────────────────────────────────
// Génération procédurale de monde (terrain heightmap + Perlin FBM + décor)
// Utilise THREE.js uniquement — pas de dépendances externes.

import * as THREE from 'three';

// ── Noise déterministe (value noise + smoothstep + FBM) ──────────────────────

function _hash(x, z, seed) {
  // Hachage pseudo-aléatoire reproductible
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.9) * 43758.5453123;
  return n - Math.floor(n); // [0, 1)
}

function _smoothstep(t) { return t * t * (3 - 2 * t); }
function _lerp(a, b, t)  { return a + t * (b - a); }

function _valueNoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const ux = _smoothstep(xf), uz = _smoothstep(zf);
  return _lerp(
    _lerp(_hash(xi,   zi,   seed), _hash(xi + 1, zi,   seed), ux),
    _lerp(_hash(xi,   zi + 1, seed), _hash(xi + 1, zi + 1, seed), ux),
    uz
  );
}

/** Fractional Brownian Motion — hauteur finale [0, 1] */
function _fbm(x, z, octaves, seed) {
  let v = 0, amp = 1, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    v   += _valueNoise(x * freq, z * freq, seed + i * 137) * amp;
    sum += amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return v / sum;
}

// ── WorldGenerator ───────────────────────────────────────────────────────────

export class WorldGenerator {
  constructor(engine) {
    this._engine = engine;
    this._generated = []; // Three.js objects added (for clearGenerated)
  }

  /**
   * Génère un monde procédural et l'ajoute directement à la scène Three.js.
   *
   * @param {object} params
   * @param {number}  params.width      Largeur du terrain (unités)
   * @param {number}  params.depth      Profondeur du terrain
   * @param {number}  params.height     Amplitude de hauteur max
   * @param {number}  params.scale      Fréquence de base du bruit (petit = plus doux)
   * @param {number}  params.octaves    Couches de bruit (détail)
   * @param {number}  params.seed       Graine (0 = aléatoire)
   * @param {string}  params.theme      'post-apo' | 'plains' | 'dungeon'
   * @param {number}  params.treeCount  Nombre d'arbres / piliers
   * @param {number}  params.ruinCount  Nombre de groupes de ruines (post-apo)
   * @returns {{ seed: number }}
   */
  generate(params = {}) {
    const {
      width     = 80,
      depth     = 80,
      height    = 14,
      scale     = 0.07,
      octaves   = 5,
      seed      = Math.floor(Math.random() * 99999),
      theme     = 'post-apo',
      treeCount = 40,
      ruinCount = 10,
    } = params;

    this.clearGenerated();

    // ── Terrain heightmap ────────────────────────────────────────────────────
    const segs = Math.min(width, 128); // segments géométrie
    const geo  = new THREE.PlaneGeometry(width, depth, segs - 1, segs - 1);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      // Bords plats → fondu vers 0 pour éviter les falaises aux lisières
      const edgeFade = this._edgeFade(wx, wz, width * 0.5, depth * 0.5);
      const h = _fbm(wx * scale, wz * scale, octaves, seed) * height * edgeFade;
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    // Couleur selon thème
    const terrainColor = {
      'post-apo': 0x4a5240,
      'plains':   0x4a7c35,
      'dungeon':  0x2a2535,
    }[theme] ?? 0x4a5240;

    const mat     = new THREE.MeshLambertMaterial({ color: terrainColor });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.name = '__terrain';
    this._add(terrain);

    // Fonction utilitaire : hauteur en (wx, wz)
    const getH = (wx, wz) => {
      const ef = this._edgeFade(wx, wz, width * 0.5, depth * 0.5);
      return _fbm(wx * scale, wz * scale, octaves, seed) * height * ef;
    };

    // ── Décor selon thème ────────────────────────────────────────────────────
    if (theme === 'post-apo') {
      this._deadTrees(treeCount, width, depth, getH, seed);
      this._ruins(ruinCount, width, depth, getH, seed + 5000);
      this._rocks(20, width, depth, getH, seed + 9999);
    } else if (theme === 'plains') {
      this._trees(treeCount, width, depth, getH, seed);
      this._rocks(10, width, depth, getH, seed + 9999);
    } else if (theme === 'dungeon') {
      this._pillars(treeCount, width, depth, getH, seed);
      this._ruins(ruinCount, width, depth, getH, seed + 5000);
    }

    return { seed };
  }

  clearGenerated() {
    const scene = this._engine.renderer.threeScene;
    for (const obj of this._generated) scene.remove(obj);
    this._generated = [];
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  _add(obj) {
    this._engine.renderer.threeScene.add(obj);
    this._generated.push(obj);
  }

  /** Fondu vers 0 aux lisières pour éviter les falaises */
  _edgeFade(x, z, hw, hd) {
    const fx = Math.max(0, 1 - (Math.abs(x) / hw) ** 3);
    const fz = Math.max(0, 1 - (Math.abs(z) / hd) ** 3);
    return fx * fz;
  }

  _rng(seed, i) {
    return (_hash(i, i * 7, seed + i * 31));
  }

  // Arbres morts (post-apo)
  _deadTrees(n, W, D, getH, seed) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
    for (let i = 0; i < n; i++) {
      const x = (_hash(i, 0, seed) - 0.5) * (W - 6);
      const z = (_hash(i, 1, seed) - 0.5) * (D - 6);
      const h = getH(x, z);
      const th = 2.5 + _hash(i, 2, seed) * 3;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.14, th, 5, 1),
        trunkMat
      );
      trunk.position.set(x, h + th / 2, z);
      trunk.castShadow = true;
      trunk.name = '__tree_' + i;
      this._add(trunk);
      // 2-3 branches
      const nb = 2 + Math.floor(_hash(i, 3, seed) * 2);
      for (let b = 0; b < nb; b++) {
        const bLen = 0.8 + _hash(i * 10 + b, 0, seed) * 1.2;
        const br = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.06, bLen, 4),
          trunkMat
        );
        br.position.set(
          x + (_hash(i, b + 4, seed) - 0.5) * 0.6,
          h + th * (0.6 + b * 0.12),
          z + (_hash(i, b + 8, seed) - 0.5) * 0.6
        );
        br.rotation.z = (_hash(i, b + 12, seed) - 0.5) * 1.8;
        br.rotation.x = (_hash(i, b + 20, seed) - 0.5) * 0.8;
        br.castShadow = true;
        this._add(br);
      }
    }
  }

  // Arbres vivants (plains)
  _trees(n, W, D, getH, seed) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e });
    const leafMat  = new THREE.MeshLambertMaterial({ color: 0x2d6a2d });
    for (let i = 0; i < n; i++) {
      const x = (_hash(i, 0, seed) - 0.5) * (W - 6);
      const z = (_hash(i, 1, seed) - 0.5) * (D - 6);
      const h = getH(x, z);
      const th = 2.5 + _hash(i, 2, seed) * 2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, th, 6), trunkMat);
      trunk.position.set(x, h + th / 2, z);
      trunk.castShadow = true;
      trunk.name = '__tree_' + i;
      this._add(trunk);
      const cr = 1.2 + _hash(i, 3, seed) * 1.5;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(cr, cr * 2, 6), leafMat);
      crown.position.set(x, h + th + cr, z);
      crown.castShadow = true;
      this._add(crown);
    }
  }

  // Piliers de donjon
  _pillars(n, W, D, getH, seed) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a3040 });
    for (let i = 0; i < n; i++) {
      const x = (_hash(i, 0, seed) - 0.5) * (W - 6);
      const z = (_hash(i, 1, seed) - 0.5) * (D - 6);
      const h = getH(x, z);
      const ph = 4 + _hash(i, 2, seed) * 6;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, ph, 0.8), mat);
      pillar.position.set(x, h + ph / 2, z);
      pillar.castShadow = pillar.receiveShadow = true;
      pillar.name = '__pillar_' + i;
      this._add(pillar);
    }
  }

  // Ruines (murs cassés)
  _ruins(n, W, D, getH, seed) {
    const colors = [0x5a5a5a, 0x4a4040, 0x3a3a3a, 0x504848];
    for (let i = 0; i < n; i++) {
      const bx = (_hash(i, 0, seed) - 0.5) * (W - 10);
      const bz = (_hash(i, 1, seed) - 0.5) * (D - 10);
      const bh = getH(bx, bz);
      const wallCount = 2 + Math.floor(_hash(i, 2, seed) * 3);
      for (let w = 0; w < wallCount; w++) {
        const wh  = 1.5 + _hash(i * 13 + w, 0, seed) * 3;
        const ww  = 2 + _hash(i * 13 + w, 1, seed) * 5;
        const wd  = 0.25 + _hash(i * 13 + w, 2, seed) * 0.25;
        const ang = (w / wallCount) * Math.PI * 2 + _hash(i, w + 10, seed) * 0.4;
        const col = colors[Math.floor(_hash(i, w + 20, seed) * colors.length)];
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(ww, wh, wd),
          new THREE.MeshLambertMaterial({ color: col })
        );
        wall.position.set(
          bx + Math.cos(ang) * (2 + _hash(i, w + 30, seed) * 2),
          bh + wh / 2,
          bz + Math.sin(ang) * (2 + _hash(i, w + 40, seed) * 2)
        );
        wall.rotation.y = ang + (_hash(i, w + 50, seed) - 0.5) * 0.5;
        wall.castShadow = wall.receiveShadow = true;
        wall.name = `__ruin_${i}_${w}`;
        this._add(wall);
      }
    }
  }

  // Rochers
  _rocks(n, W, D, getH, seed) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x505050 });
    for (let i = 0; i < n; i++) {
      const x = (_hash(i, 0, seed + 77) - 0.5) * (W - 4);
      const z = (_hash(i, 1, seed + 77) - 0.5) * (D - 4);
      const h = getH(x, z);
      const s = 0.4 + _hash(i, 2, seed + 77) * 1.2;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(s, 0),
        mat
      );
      rock.position.set(x, h + s * 0.5, z);
      rock.rotation.set(
        _hash(i, 3, seed + 77) * Math.PI,
        _hash(i, 4, seed + 77) * Math.PI,
        _hash(i, 5, seed + 77) * Math.PI
      );
      rock.castShadow = rock.receiveShadow = true;
      rock.name = '__rock_' + i;
      this._add(rock);
    }
  }
}
