import * as THREE from 'three'

// Jeepney / bus terminal — south side of the main road, east of center
// This is where she was standing when they first met in person
export const TERMINAL_POS = new THREE.Vector3(48, 0, -58)

export class Terminal {
  constructor(scene) {
    this.scene = scene
    this._build()
  }

  _build() {
    const x = TERMINAL_POS.x
    const z = TERMINAL_POS.z

    this._addGround(x, z)
    this._addCanopy(x, z)
    this._addBollards(x, z)
    this._addPlanters(x, z)
    this._addJeepneys(x, z)
    this._addSignage(x, z)
  }

  // ── Ground ──────────────────────────────────────────────────────────────

  _addGround(x, z) {
    const concMat = new THREE.MeshStandardMaterial({ color: 0x888878, roughness: 0.95, metalness: 0.0 })
    const ground  = new THREE.Mesh(new THREE.PlaneGeometry(36, 24), concMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.set(x, 0.06, z)
    ground.receiveShadow = true
    this.scene.add(ground)

    // Some stained/wet patches for realism
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x666658, roughness: 0.98 })
    for (const [px, pz] of [[-4, 2], [6, -4], [-8, -2]]) {
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(3 + Math.random() * 2, 2 + Math.random()), patchMat)
      patch.rotation.x = -Math.PI / 2
      patch.position.set(x + px, 0.065, z + pz)
      this.scene.add(patch)
    }
  }

  // ── Metal canopy roof ────────────────────────────────────────────────────

  _addCanopy(x, z) {
    const postMat  = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.55, metalness: 0.6 })
    const roofMat  = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.72, metalness: 0.45 })
    const beamMat  = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.6, metalness: 0.55 })

    // Support columns
    const postGeo = new THREE.CylinderGeometry(0.14, 0.17, 4.8, 7)
    const cols = [
      [-14, -9], [-7, -9], [0, -9], [7, -9], [14, -9],
      [-14,  9], [-7,  9], [0,  9], [7,  9], [14,  9],
    ]
    for (const [px, pz] of cols) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(x + px, 2.4, z + pz)
      post.castShadow = true
      this.scene.add(post)
    }

    // Main roof slab
    const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 0.35, 20), roofMat)
    roof.position.set(x, 4.95, z)
    roof.castShadow = true
    roof.receiveShadow = true
    this.scene.add(roof)

    // Cross-beams under roof for that industrial canopy look
    for (let i = -3; i <= 3; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 20), beamMat)
      beam.position.set(x + i * 4.5, 4.74, z)
      this.scene.add(beam)
    }

    // Front fascia / valance
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(30, 0.9, 0.2), beamMat)
    fascia.position.set(x, 4.65, z - 10.1)
    this.scene.add(fascia)
  }

  // ── Bollards ─────────────────────────────────────────────────────────────

  _addBollards(x, z) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.3 })
    const geo = new THREE.CylinderGeometry(0.2, 0.24, 0.92, 9)

    for (let i = -5; i <= 5; i++) {
      const b = new THREE.Mesh(geo, mat)
      b.position.set(x + i * 3.5, 0.46, z - 11)
      b.castShadow = true
      this.scene.add(b)

      // Yellow top cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.1, 9), new THREE.MeshStandardMaterial({ color: 0xddcc00, roughness: 0.6 }))
      cap.position.set(x + i * 3.5, 0.97, z - 11)
      this.scene.add(cap)
    }
  }

  // ── Planters ─────────────────────────────────────────────────────────────

  _addPlanters(x, z) {
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 })
    const soilMat    = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.98 })
    const plantMat   = new THREE.MeshStandardMaterial({ color: 0x2d7a1f, roughness: 0.85, metalness: 0.0 })

    const planterPositions = [[-5, -8], [5, -8], [-10, -5], [10, -5]]

    for (const [px, pz] of planterPositions) {
      // Box planter
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.65, 1.4), planterMat)
      box.position.set(x + px, 0.32, z + pz)
      box.castShadow = true
      this.scene.add(box)

      const soil = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.2), soilMat)
      soil.position.set(x + px, 0.67, z + pz)
      this.scene.add(soil)

      // Grass/plant tufts
      for (let pi = 0; pi < 3; pi++) {
        const tuft = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.55, 5),
          plantMat,
        )
        tuft.position.set(x + px + (pi - 1) * 0.7, 0.94, z + pz)
        this.scene.add(tuft)
      }
    }
  }

  // ── Parked jeepneys / vans ────────────────────────────────────────────────

  _addJeepneys(x, z) {
    const colors = [0xddaa22, 0xcc3333, 0x2255bb, 0x228833]
    const roofMat   = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.55, metalness: 0.35 })
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 })
    const wheelMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    const wheelGeo  = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 9)

    const spots = [
      { px: -10, pz: 4, ry: 0 },
      { px:  -5, pz: 4, ry: 0 },
      { px:   0, pz: 4, ry: 0 },
      { px:   8, pz: 4, ry: 0 },
      { px: -10, pz: -4, ry: Math.PI },
    ]

    spots.forEach(({ px, pz, ry }, idx) => {
      const color = colors[idx % colors.length]
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.12 })

      const g = new THREE.Group()

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.4, 5), bodyMat)
      body.position.y = 0.75
      g.add(body)

      // Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 4.2), roofMat)
      roof.position.y = 1.52
      g.add(roof)

      // Front windscreen
      const wind = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), glassMat)
      wind.position.set(0, 1.05, -2.51)
      g.add(wind)

      // Side windows
      for (const side of [-1.06, 1.06]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), glassMat)
        win.rotation.y = Math.PI / 2 * (side < 0 ? -1 : 1)
        win.position.set(side, 1.05, -0.5)
        g.add(win)
      }

      // Wheels
      for (const [wx, wz] of [[-1.05, -1.6], [1.05, -1.6], [-1.05, 1.6], [1.05, 1.6]]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat)
        w.rotation.z = Math.PI / 2
        w.position.set(wx, 0.28, wz)
        g.add(w)
      }

      g.position.set(x + px, 0, z + pz)
      g.rotation.y = ry
      g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      this.scene.add(g)
    })
  }

  // ── Signage ───────────────────────────────────────────────────────────────

  _addSignage(x, z) {
    const tex = this._makeSignTex()
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.1 })
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), mat)
    sign.position.set(x, 5.6, z - 10.2)
    this.scene.add(sign)
  }

  _makeSignTex() {
    const W = 512, H = 88
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')

    ctx.fillStyle = '#003366'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${H * 0.55}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('LEGAZPI GRAND TERMINAL', W / 2, H / 2)

    return new THREE.CanvasTexture(cv)
  }
}
