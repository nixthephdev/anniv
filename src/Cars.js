import * as THREE from 'three'
import { toon } from './toon.js'

const ROAD_Z   = -62
const COLORS   = [0xe53935, 0x1e88e5, 0xfdd835, 0xf5f5f5, 0x43a047, 0xff6d00, 0x7b1fa2, 0x00838f]

export class Cars {
  constructor(scene) {
    this.scene = scene
    this.cars  = []
    this._build()
  }

  _build() {
    // eastbound — south lane (positive X direction)
    for (let i = 0; i < 4; i++) {
      this._addCar(-120 + i * 68, ROAD_Z + 3.5, 1, COLORS[i])
    }
    // westbound — north lane (negative X direction)
    for (let i = 0; i < 4; i++) {
      this._addCar(110 - i * 68, ROAD_Z - 3.5, -1, COLORS[i + 4])
    }
  }

  _addCar(x, z, dir, color) {
    const g   = new THREE.Group()
    const mat = toon(color)

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 1.6), mat)
    body.position.y = 0.5
    body.castShadow = true
    g.add(body)

    // Cabin (slightly offset toward back)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 1.5), mat)
    cabin.position.set(-0.12, 1.04, 0)
    cabin.castShadow = true
    g.add(cabin)

    // Windshields
    const glassMat = toon(0x5b8fc9, { transparent: true, opacity: 0.6 })
    const fglass = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 1.38), glassMat)
    fglass.position.set(0.78, 1.01, 0)
    g.add(fglass)
    const rglass = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 1.38), glassMat)
    rglass.position.set(-1.0, 1.01, 0)
    g.add(rglass)

    // Wheels + rims
    const wMat = toon(0x1c1c1c)
    const rMat = toon(0xbdbdbd)
    ;[[1.1, -0.65], [1.1, 0.65], [-1.1, -0.65], [-1.1, 0.65]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10), wMat)
      w.rotation.z = Math.PI / 2
      w.position.set(wx, 0.32, wz)
      g.add(w)
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.25, 8), rMat)
      r.rotation.z = Math.PI / 2
      r.position.set(wx, 0.32, wz)
      g.add(r)
    })

    // Headlights (front = +X) and taillights (rear = -X)
    const hMat = new THREE.MeshBasicMaterial({ color: 0xffffcc })
    const tMat = new THREE.MeshBasicMaterial({ color: 0xff1100 })
    ;[-0.44, 0.44].forEach(lz => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.22), hMat)
      h.position.set(1.63, 0.5, lz)
      g.add(h)
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.22), tMat)
      t.position.set(-1.63, 0.5, lz)
      g.add(t)
    })

    g.position.set(x, 0.08, z)
    if (dir < 0) g.rotation.y = Math.PI

    this.scene.add(g)
    this.cars.push({ g, dir, speed: 9 + Math.random() * 7 })
  }

  update(delta) {
    this.cars.forEach(c => {
      c.g.position.x += c.dir * c.speed * delta
      if (c.dir > 0 && c.g.position.x >  140) c.g.position.x = -140
      if (c.dir < 0 && c.g.position.x < -140) c.g.position.x =  140
    })
  }
}
