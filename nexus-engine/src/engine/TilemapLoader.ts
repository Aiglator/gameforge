import * as THREE from 'three'

export interface TiledMap {
  width: number
  height: number
  tilewidth: number
  tileheight: number
  layers: Array<{
    name: string
    data: number[]
    width: number
    height: number
  }>
  tilesets: Array<{
    firstgid: number
    tilecount: number
    columns: number
    imagewidth: number
    imageheight: number
  }>
}

// Cache shared textures by URL to avoid redundant GPU uploads
const _textureCache = new Map<string, THREE.Texture>()

function _loadTexture(url: string): THREE.Texture {
  if (_textureCache.has(url)) return _textureCache.get(url)!
  const tex = new THREE.TextureLoader().load(url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  _textureCache.set(url, tex)
  return tex
}

export class TilemapLoader {
  /**
   * Calculate texture offset + repeat for a tile index inside a spritesheet.
   * UV origin is bottom-left in THREE.js, so rows are flipped.
   */
  static tileUV(
    index: number,
    sheetCols: number,
    sheetRows: number
  ): { offsetX: number; offsetY: number; repeatX: number; repeatY: number } {
    const repeatX = 1 / sheetCols
    const repeatY = 1 / sheetRows
    const col = index % sheetCols
    // Flip row: tile 0 is top-left in PNG, but UV row 0 is bottom-left
    const row = sheetRows - 1 - Math.floor(index / sheetCols)
    return {
      offsetX: col * repeatX,
      offsetY: row * repeatY,
      repeatX,
      repeatY,
    }
  }

  /**
   * Build a THREE.Group from a 2D array of tile indices.
   * Index 0 = empty (skipped). Indices start at 1.
   */
  static fromArray(
    mapData: number[][],
    textureUrl: string,
    opts: {
      tileWidth: number
      tileHeight: number
      sheetCols: number
      sheetRows: number
    }
  ): THREE.Group {
    const group = new THREE.Group()
    const { tileWidth, tileHeight, sheetCols, sheetRows } = opts
    const hasTexture = textureUrl.length > 0
    const baseTex = hasTexture ? _loadTexture(textureUrl) : null

    for (let row = 0; row < mapData.length; row++) {
      const rowArr = mapData[row]
      for (let col = 0; col < rowArr.length; col++) {
        const tileIndex = rowArr[col]
        if (tileIndex === 0) continue // skip empty tiles

        const geo = new THREE.PlaneGeometry(tileWidth, tileHeight)

        let mat: THREE.MeshBasicMaterial
        if (baseTex) {
          // Clone texture so each tile can have independent offset/repeat
          const tileTex = baseTex.clone()
          tileTex.needsUpdate = true
          // tile indices are 1-based, convert to 0-based for UV calc
          const { offsetX, offsetY, repeatX, repeatY } = TilemapLoader.tileUV(
            tileIndex - 1,
            sheetCols,
            sheetRows
          )
          tileTex.repeat.set(repeatX, repeatY)
          tileTex.offset.set(offsetX, offsetY)
          mat = new THREE.MeshBasicMaterial({
            map: tileTex,
            side: THREE.DoubleSide,
            transparent: true,
          })
        } else {
          // No texture: color-code by index for debugging
          const hue = ((tileIndex * 37) % 360) / 360
          mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(hue, 0.6, 0.4),
            side: THREE.DoubleSide,
          })
        }

        const mesh = new THREE.Mesh(geo, mat)
        // Place tiles flat on XY plane; X grows right, Y grows down
        mesh.position.set(col * tileWidth, -row * tileHeight, 0)
        group.add(mesh)
      }
    }

    return group
  }

  /**
   * Parse the first tile layer of a Tiled JSON export and build a THREE.Group.
   * Only supports orthogonal maps with a single tileset.
   */
  static fromTiled(tiledJson: TiledMap, textureUrl: string): THREE.Group {
    const layer = tiledJson.layers.find(l => Array.isArray(l.data))
    if (!layer) return new THREE.Group()

    const tileset = tiledJson.tilesets[0]
    const sheetCols = tileset?.columns ?? 1
    // Derive sheetRows from tilecount and columns
    const tilecount = tileset?.tilecount ?? sheetCols
    const sheetRows = Math.ceil(tilecount / sheetCols)

    const mapWidth = layer.width
    // Convert flat data array to 2D grid
    const mapData: number[][] = []
    for (let row = 0; row < tiledJson.height; row++) {
      mapData.push(layer.data.slice(row * mapWidth, (row + 1) * mapWidth))
    }

    // Use Tiled tile pixel size converted to world units (1 tile = tilewidth / tilewidth = 1 unit)
    const tileWidth = 1
    const tileHeight = 1

    return TilemapLoader.fromArray(mapData, textureUrl, {
      tileWidth,
      tileHeight,
      sheetCols,
      sheetRows,
    })
  }
}
