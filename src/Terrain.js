import * as THREE from 'three'

// Simple noise for terrain bumps (no external dep)
function smoothNoise(x, z) {
  const s = Math.sin(x * 0.15 + 1.3) * Math.cos(z * 0.12 - 0.7) * 1.8
         + Math.sin(x * 0.07 - 2.1) * Math.sin(z * 0.09 + 1.1) * 2.5
         + Math.sin(x * 0.03 + z * 0.04) * 1.2
  return s
}

export class Terrain {
  constructor(scene) {
    this.scene = scene
    this._buildGround()
    this._buildTrees()
    this._buildFlowers()
    this._buildPath()
  }

  _buildGround() {
    const size = 200
    const segs = 120
    const geo = new THREE.PlaneGeometry(size, size, segs, segs)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // Keep a flat zone near spawn for the player start
      const distFromCenter = Math.sqrt(x * x + z * z)
      const flatFactor = Math.min(distFromCenter / 12, 1)
      pos.setY(i, smoothNoise(x, z) * flatFactor)
    }
    geo.computeVertexNormals()

    const mat = new THREE.MeshLambertMaterial({
      color: 0x2d0050,
    })

    // Vertex colors for variety
    const colors = []
    const c1 = new THREE.Color(0x2d0050)
    const c2 = new THREE.Color(0x4a0070)
    const c3 = new THREE.Color(0x1a0035)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const t = (Math.sin(x * 0.1) * Math.cos(z * 0.08) + 1) * 0.5
      const col = t > 0.6 ? c2 : t < 0.3 ? c3 : c1
      colors.push(col.r, col.g, col.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    mat.vertexColors = true

    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    mesh.name = 'terrain'
    this.scene.add(mesh)
    this.mesh = mesh
    this.geo = geo
  }

  _buildTrees() {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3b0060 })
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x6a0080, transparent: true, opacity: 0.9 })
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff69b4, transparent: true, opacity: 0.3 })

    const positions = []
    const rng = mulberry32(42)
    for (let i = 0; i < 80; i++) {
      const angle = rng() * Math.PI * 2
      const dist = 15 + rng() * 75
      positions.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist })
    }

    positions.forEach(({ x, z }) => {
      const y = this.getHeightAt(x, z)
      const h = 3 + Math.random() * 3

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), trunkMat)
      trunk.position.set(x, y + h / 2, z)
      trunk.castShadow = true
      this.scene.add(trunk)

      const leafSize = 1.5 + Math.random()
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(leafSize, 7, 5), leafMat)
      leaf.position.set(x, y + h + leafSize * 0.6, z)
      leaf.castShadow = true
      this.scene.add(leaf)

      // Subtle pink glow orb inside foliage
      const glow = new THREE.Mesh(new THREE.SphereGeometry(leafSize * 0.5, 5, 4), glowMat)
      glow.position.copy(leaf.position)
      this.scene.add(glow)
    })
  }

  _buildFlowers() {
    const petalMat = new THREE.MeshBasicMaterial({ color: 0xff69b4, transparent: true, opacity: 0.85 })
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xffecf0 })
    const rng = mulberry32(7)

    for (let i = 0; i < 200; i++) {
      const angle = rng() * Math.PI * 2
      const dist = 8 + rng() * 70
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const y = this.getHeightAt(x, z)

      const group = new THREE.Group()

      // 5 petals
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 4, 3),
          petalMat
        )
        const pa = (p / 5) * Math.PI * 2
        petal.position.set(Math.cos(pa) * 0.18, 0, Math.sin(pa) * 0.18)
        group.add(petal)
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), centerMat)
      group.add(center)

      group.position.set(x, y + 0.05, z)
      group.rotation.y = rng() * Math.PI * 2
      this.scene.add(group)
    }
  }

  _buildPath() {
    // A winding stone path leading toward memory spots
    const pathMat = new THREE.MeshLambertMaterial({ color: 0x5a0080 })
    const stoneGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.05, 6)

    const waypoints = [
      { x: 0, z: 0 }, { x: 5, z: -8 }, { x: 12, z: -12 },
      { x: 18, z: -14 }, { x: -5, z: -16 }, { x: -15, z: -20 },
      { x: 0, z: -30 }, { x: 8, z: -40 }, { x: 0, z: -55 },
    ]

    waypoints.forEach(({ x, z }) => {
      for (let s = 0; s < 3; s++) {
        const ox = (Math.random() - 0.5) * 1.5
        const oz = (Math.random() - 0.5) * 1.5
        const stone = new THREE.Mesh(stoneGeo, pathMat)
        stone.position.set(x + ox, this.getHeightAt(x + ox, z + oz) + 0.03, z + oz)
        stone.rotation.y = Math.random() * Math.PI
        this.scene.add(stone)
      }
    })
  }

  getHeightAt(x, z) {
    if (!this.geo) return 0
    const pos = this.geo.attributes.position
    let closest = 0, minDist = Infinity
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vz = pos.getZ(i)
      const d = (vx - x) ** 2 + (vz - z) ** 2
      if (d < minDist) { minDist = d; closest = pos.getY(i) }
    }
    return closest
  }
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
