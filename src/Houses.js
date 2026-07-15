import * as THREE from 'three'
import { toon } from './toon.js'

// Residential street fronting the north side of the Downtown Loop
const HOUSE_COLORS = [
  { wall: 0xffe0b2, roof: 0x8d4a3a, trim: 0xffffff },
  { wall: 0xc8e6c9, roof: 0x5d4037, trim: 0xfff8e1 },
  { wall: 0xbbdefb, roof: 0x6d4c41, trim: 0xffffff },
  { wall: 0xffccbc, roof: 0x4e342e, trim: 0xfff3e0 },
  { wall: 0xd1c4e9, roof: 0x37474f, trim: 0xffffff },
  { wall: 0xfff9c4, roof: 0x795548, trim: 0xffffff },
]
const HOUSE_XS = [-160, -146, -132, -118, -104, -90, -76, -62]
const HOUSE_Z  = 188   // set back from the Loop's sidewalk (~z=162), facing south toward it

export class Houses {
  constructor(scene) {
    this.scene = scene
    this._build()
  }

  _build() {
    HOUSE_XS.forEach((x, i) => {
      this._buildHouse(x, HOUSE_Z, HOUSE_COLORS[i % HOUSE_COLORS.length], i)
    })
  }

  // House faces south (-z local) toward the road it fronts.
  _buildHouse(x, z, palette, seed) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)

    const wallMat  = toon(palette.wall)
    const roofMat  = toon(palette.roof)
    const trimMat  = toon(palette.trim)
    const doorMat  = toon(0x4e342e)
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.15, transparent: true, opacity: 0.55 })

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 7), wallMat)
    body.position.y = 2
    body.castShadow = body.receiveShadow = true
    group.add(body)

    // Hip roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4), roofMat)
    roof.rotation.y = Math.PI / 4
    roof.position.y = 4 + 1.3
    roof.castShadow = true
    group.add(roof)

    // Porch (south-facing)
    const porch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 2), trimMat)
    porch.position.set(0, 0.1, -4.4)
    group.add(porch)
    for (const px of [-1.3, 1.3]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), trimMat)
      col.position.set(px, 1.3, -5.2)
      group.add(col)
    }
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 2.4), roofMat)
    porchRoof.position.set(0, 2.65, -4.4)
    group.add(porchRoof)

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), doorMat)
    door.position.set(0, 1.05, -3.56)
    group.add(door)

    // Windows either side of the door
    for (const wx of [-2.6, 2.6]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.08), glassMat)
      win.position.set(wx, 2.2, -3.56)
      group.add(win)
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.05), trimMat)
      frame.position.set(wx, 2.2, -3.52)
      group.add(frame)
    }

    // Chimney on half the houses, at the back
    if (seed % 2 === 0) {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), toon(0x8d6e63))
      chimney.position.set(-2, 5.3, 1.5)
      chimney.castShadow = true
      group.add(chimney)
    }

    // Front lawn + walkway
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(11, 8), toon(0x66bb6a))
    lawn.rotation.x = -Math.PI / 2
    lawn.position.set(0, 0.02, -6.5)
    lawn.receiveShadow = true
    group.add(lawn)

    const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6), toon(0xbcaaa4))
    path.rotation.x = -Math.PI / 2
    path.position.set(0, 0.03, -7.5)
    group.add(path)

    // Small yard tree
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2.4, 6), toon(0x6d4c41))
    trunk.position.set(4.6, 1.2, -6)
    group.add(trunk)
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), toon(0x388e3c))
    leaves.position.set(4.6, 3, -6)
    leaves.castShadow = true
    group.add(leaves)

    // Picket fence along the front lot line (gap for the walkway)
    const fenceMat = toon(0xffffff)
    for (let fx = -5.5; fx <= 5.5; fx += 1) {
      if (Math.abs(fx) < 0.6) continue
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), fenceMat)
      picket.position.set(fx, 0.3, -10)
      group.add(picket)
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.1, 0.12), fenceMat)
    rail.position.set(0, 0.5, -10)
    group.add(rail)

    this.scene.add(group)
  }
}
