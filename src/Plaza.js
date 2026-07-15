import * as THREE from 'three'
import { toon } from './toon.js'

// Naga City's plaza/park — south of the Downtown Loop, west of the Avenue
export const PLAZA_POSITION = new THREE.Vector3(-90, 0, 110)

export class Plaza {
  constructor(scene) {
    this.scene = scene
    this._build()
  }

  _build() {
    this._buildGround()
    this._buildFountain()
    this._buildBenches()
    this._buildTrees()
    this._buildGazebo()
    this._buildLamps()
  }

  _buildGround() {
    const { x, z } = PLAZA_POSITION
    const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 40), toon(0xd7ccc8))
    ground.rotation.x = -Math.PI / 2
    ground.position.set(x, 0.03, z)
    ground.receiveShadow = true
    this.scene.add(ground)

    // Concentric stone ring pattern
    const ringMat = toon(0xbcaaa4, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    for (const r of [12, 20]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.3, r, 48), ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(x, 0.04, z)
      this.scene.add(ring)
    }
  }

  _buildFountain() {
    const { x, z } = PLAZA_POSITION
    const stoneMat = toon(0xb0a89e)
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.75, roughness: 0.15 })

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.4, 0.9, 24), stoneMat)
    basin.position.set(x, 0.45, z)
    basin.castShadow = basin.receiveShadow = true
    this.scene.add(basin)

    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.15, 24), waterMat)
    water.position.set(x, 0.85, z)
    this.scene.add(water)

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 1.6, 12), stoneMat)
    pedestal.position.set(x, 1.7, z)
    this.scene.add(pedestal)

    const tier = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 20), stoneMat)
    tier.position.set(x, 2.6, z)
    this.scene.add(tier)

    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1, 8), stoneMat)
    spout.position.set(x, 3.2, z)
    this.scene.add(spout)
  }

  _buildBenches() {
    const { x, z } = PLAZA_POSITION
    const woodMat  = toon(0x8d5a34)
    const metalMat = toon(0x555555)
    const positions = [
      { bx: 0, bz: -14, ry: 0 },
      { bx: 0, bz: 14, ry: Math.PI },
      { bx: -14, bz: 0, ry: Math.PI / 2 },
      { bx: 14, bz: 0, ry: -Math.PI / 2 },
    ]
    positions.forEach(({ bx, bz, ry }) => {
      const group = new THREE.Group()
      group.position.set(x + bx, 0, z + bz)
      group.rotation.y = ry

      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.6), woodMat)
      seat.position.y = 0.5
      group.add(seat)
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1), woodMat)
      back.position.set(0, 0.8, -0.28)
      group.add(back)
      for (const lx of [-0.9, 0.9]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.55), metalMat)
        leg.position.set(lx, 0.25, 0)
        group.add(leg)
      }
      this.scene.add(group)
    })
  }

  _buildTrees() {
    const { x, z } = PLAZA_POSITION
    const rng = mulberry32(19)
    const foliage = [0x2e7d32, 0x33691e, 0x388e3c]
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = 23 + (rng() - 0.5) * 2
      const tx = x + Math.cos(a) * r
      const tz = z + Math.sin(a) * r
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 3.4, 7), toon(0x6d4c41))
      trunk.position.set(tx, 1.7, tz)
      trunk.castShadow = true
      this.scene.add(trunk)
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 7), toon(foliage[i % foliage.length]))
      leaves.position.set(tx, 4, tz)
      leaves.castShadow = true
      this.scene.add(leaves)
    }
  }

  _buildGazebo() {
    const { x, z } = PLAZA_POSITION
    const gx = x, gz = z - 20   // toward the plaza's south entrance
    const woodMat = toon(0xf5f0e6)
    const roofMat = toon(0xe57373)

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), woodMat)
      col.position.set(gx + Math.cos(a) * 2.6, 1.5, gz + Math.sin(a) * 2.6)
      col.castShadow = true
      this.scene.add(col)
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 6), roofMat)
    roof.position.set(gx, 3.8, gz)
    roof.castShadow = true
    this.scene.add(roof)
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.15, 6), woodMat)
    floor.position.set(gx, 0.08, gz)
    this.scene.add(floor)
  }

  _buildLamps() {
    const { x, z } = PLAZA_POSITION
    const poleMat = toon(0x444444)
    const headMat = toon(0xfff8cc, { emissive: new THREE.Color(0xffeeaa), emissiveIntensity: 1 })
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3
      const lx = x + Math.cos(a) * 18
      const lz = z + Math.sin(a) * 18
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.2, 7), poleMat)
      pole.position.set(lx, 2.1, lz)
      pole.castShadow = true
      this.scene.add(pole)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), headMat)
      head.position.set(lx, 4.3, lz)
      this.scene.add(head)
      const light = new THREE.PointLight(0xfff8cc, 0.8, 18)
      light.position.set(lx, 4.1, lz)
      this.scene.add(light)
    }
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
