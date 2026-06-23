import * as THREE from 'three'

function smoothNoise(x, z) {
  return Math.sin(x * 0.15 + 1.3) * Math.cos(z * 0.12 - 0.7) * 1.6
       + Math.sin(x * 0.07 - 2.1) * Math.sin(z * 0.09 + 1.1) * 2.2
       + Math.sin(x * 0.03 + z * 0.04) * 1.0
}

export class Terrain {
  constructor(scene) {
    this.scene = scene
    this._buildGround()
    this._buildTrees()
    this._buildFlowers()
    this._buildPath()
    this._buildRocks()
  }

  _buildGround() {
    const size = 200
    const segs = 120
    const geo = new THREE.PlaneGeometry(size, size, segs, segs)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const distCenter = Math.sqrt(x * x + z * z)
      const flat = Math.min(distCenter / 10, 1)
      pos.setY(i, smoothNoise(x, z) * flat)
    }
    geo.computeVertexNormals()

    // Vertex colors: varied greens for a lively field
    const colors = []
    const c1 = new THREE.Color(0x4caf50) // medium green
    const c2 = new THREE.Color(0x66bb6a) // lighter green
    const c3 = new THREE.Color(0x388e3c) // darker green
    const c4 = new THREE.Color(0x8d6e63) // dirt path color

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const n = (Math.sin(x * 0.2) * Math.cos(z * 0.15) + 1) * 0.5
      const col = n > 0.65 ? c2 : n < 0.3 ? c3 : c1
      colors.push(col.r, col.g, col.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    mesh.name = 'terrain'
    this.scene.add(mesh)
    this.mesh = mesh
    this.geo = geo
  }

  _buildTrees() {
    const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x795548 })
    const leaf1Mat  = new THREE.MeshLambertMaterial({ color: 0x2e7d32 })
    const leaf2Mat  = new THREE.MeshLambertMaterial({ color: 0x388e3c })
    const leaf3Mat  = new THREE.MeshLambertMaterial({ color: 0x43a047 })
    const leafMats  = [leaf1Mat, leaf2Mat, leaf3Mat]
    const rng = mulberry32(42)

    for (let i = 0; i < 90; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 14 + rng() * 78
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const y = this.getHeightAt(x, z)
      const h = 3.5 + rng() * 3.5

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 7), trunkMat)
      trunk.position.set(x, y + h / 2, z)
      trunk.castShadow = true
      this.scene.add(trunk)

      // Layered foliage cones / spheres
      const leafMat = leafMats[Math.floor(rng() * 3)]
      const ls = 1.8 + rng() * 1.2

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(ls, 8, 6), leafMat)
      leaf.position.set(x, y + h + ls * 0.5, z)
      leaf.castShadow = true
      this.scene.add(leaf)

      // Second smaller blob on top for rounder look
      const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(ls * 0.65, 7, 5), leafMat)
      leaf2.position.set(x + (rng() - 0.5) * 0.6, y + h + ls * 1.1, z + (rng() - 0.5) * 0.6)
      this.scene.add(leaf2)
    }
  }

  _buildFlowers() {
    const flowerColors = [
      0xff4081, // hot pink
      0xffd600, // yellow
      0xffffff, // white
      0xff6d00, // orange
      0xce93d8, // lavender
      0xf48fb1, // light pink
    ]
    const rng = mulberry32(7)

    for (let i = 0; i < 350; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 6 + rng() * 72
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const y = this.getHeightAt(x, z)

      const color = flowerColors[Math.floor(rng() * flowerColors.length)]
      const petalMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      const stemMat  = new THREE.MeshBasicMaterial({ color: 0x33691e })
      const centerMat = new THREE.MeshBasicMaterial({ color: 0xf9a825 })

      const group = new THREE.Group()

      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 4), stemMat)
      stem.position.y = 0.11
      group.add(stem)

      // Petals
      const petalCount = 5 + Math.floor(rng() * 3)
      for (let p = 0; p < petalCount; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 3), petalMat)
        const pa = (p / petalCount) * Math.PI * 2
        petal.position.set(Math.cos(pa) * 0.16, 0.22, Math.sin(pa) * 0.16)
        petal.scale.y = 0.5
        group.add(petal)
      }

      // Center
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), centerMat)
      center.position.y = 0.22
      group.add(center)

      group.position.set(x, y, z)
      group.rotation.y = rng() * Math.PI * 2
      this.scene.add(group)
    }
  }

  _buildPath() {
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xa1887f })
    const stoneGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.06, 6)
    const rng = mulberry32(13)

    const waypoints = [
      { x: 0, z: 0 }, { x: 5, z: -8 }, { x: 12, z: -12 },
      { x: 18, z: -14 }, { x: -5, z: -16 }, { x: -15, z: -20 },
      { x: -5, z: -30 }, { x: 0, z: -38 }, { x: 5, z: -50 },
      { x: 0, z: -62 },
    ]

    waypoints.forEach(({ x, z }) => {
      for (let s = 0; s < 4; s++) {
        const ox = (rng() - 0.5) * 1.8, oz = (rng() - 0.5) * 1.8
        const stone = new THREE.Mesh(stoneGeo, pathMat)
        stone.position.set(x + ox, this.getHeightAt(x + ox, z + oz) + 0.04, z + oz)
        stone.rotation.y = rng() * Math.PI
        this.scene.add(stone)
      }
    })
  }

  _buildRocks() {
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e })
    const rng = mulberry32(55)

    for (let i = 0; i < 30; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 20 + rng() * 60
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist
      const y = this.getHeightAt(x, z)
      const s = 0.2 + rng() * 0.5

      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat)
      rock.position.set(x, y + s * 0.4, z)
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
      rock.castShadow = true
      this.scene.add(rock)
    }
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
