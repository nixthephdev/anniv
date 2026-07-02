import * as THREE from 'three'
import { toon } from './toon.js'

// Balls and crates scattered in the park — player can kick them around
const BALLS = [
  { x:  6,   y: 1, z:  3,  r: 0.40, color: 0xff6b6b },
  { x: -9,   y: 1, z:  5,  r: 0.35, color: 0x4fc3f7 },
  { x: 14,   y: 1, z: -6,  r: 0.42, color: 0xffd93d },
  { x: -18,  y: 1, z: -10, r: 0.38, color: 0xce93d8 },
  { x:  22,  y: 1, z:  10, r: 0.36, color: 0x81c784 },
]
const CRATES = [
  { x: -12, y: 0.45, z:  8,  hw: 0.45, hh: 0.45, hd: 0.45, color: 0xd4a574 },
  { x:  18, y: 0.45, z: -14, hw: 0.50, hh: 0.45, hd: 0.50, color: 0xbf8e68 },
  { x:  -5, y: 0.45, z: -30, hw: 0.40, hh: 0.40, hd: 0.40, color: 0xa07850 },
]

export class PhysicsObjects {
  constructor(scene, physics) {
    this._pairs = []
    this._build(scene, physics)
  }

  _build(scene, physics) {
    for (const d of BALLS) {
      const body = physics.addBall(d.x, d.y, d.z, d.r)
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(d.r, 14, 10),
        toon(d.color)
      )
      mesh.castShadow = true
      scene.add(mesh)
      this._pairs.push({ body, mesh })
    }

    for (const d of CRATES) {
      const body = physics.addCrate(d.x, d.y, d.z, d.hw, d.hh, d.hd)
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(d.hw * 2, d.hh * 2, d.hd * 2),
        toon(d.color)
      )
      mesh.castShadow = true
      scene.add(mesh)
      this._pairs.push({ body, mesh })
    }
  }

  update() {
    for (const { body, mesh } of this._pairs) {
      const p = body.translation()
      const r = body.rotation()
      mesh.position.set(p.x, p.y, p.z)
      mesh.quaternion.set(r.x, r.y, r.z, r.w)
    }
  }
}
