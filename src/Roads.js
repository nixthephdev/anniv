import * as THREE from 'three'
import { toon } from './toon.js'
import { addPavedZone } from './PavedZones.js'

// Main east-west road between the park and SM
// z = -54 to z = -70 (16 units wide)

export class Roads {
  constructor(scene) {
    this.scene = scene
    this._build()
    this._buildDistrictRoads()
  }

  _build() {
    this._addAsphalt()
    this._addSidewalks()
    this._addMarkings()
    this._addLamps()
    this._addCurbs()
  }

  // ── Naga City district connector roads ──────────────────────────────────
  // North-south Avenue (doubles as the boulevard) linking the existing
  // corridor to a new east-west Downtown Loop the city zones sit along.
  _buildDistrictRoads() {
    this.addSegment({ x1: 0, z1: -70, x2: 0,    z2: 150 })   // Avenue
    this.addSegment({ x1: -170, z1: 150, x2: 170, z2: 150 }) // Downtown Loop
    this._buildBoulevardDressing()
  }

  // Palm trees + benches along the Avenue's new stretch (north of the
  // original park content) — this is what makes it read as "the boulevard".
  _buildBoulevardDressing() {
    const trunkMat = toon(0x8d6e63)
    const frondMat = toon(0x43a047)
    const benchMat = toon(0x8d5a34)
    const Z1 = 20, Z2 = 140

    for (let z = Z1; z <= Z2; z += 18) {
      for (const side of [1, -1]) {
        const x = side * 13   // just past the sidewalk, on the grass

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 4.2, 7), trunkMat)
        trunk.position.set(x, 2.1, z)
        trunk.rotation.z = side * 0.06
        trunk.castShadow = true
        this.scene.add(trunk)

        for (let f = 0; f < 6; f++) {
          const a = (f / 6) * Math.PI * 2
          const frond = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 4), frondMat)
          frond.position.set(x + Math.cos(a) * 0.5, 4.3, z + Math.sin(a) * 0.5)
          frond.rotation.set(Math.PI / 2.3, 0, a)
          this.scene.add(frond)
        }
      }
    }

    for (let z = Z1 + 9; z <= Z2; z += 36) {
      for (const side of [1, -1]) {
        const group = new THREE.Group()
        group.position.set(side * 10, 0, z)
        group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2

        const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.55), benchMat)
        seat.position.y = 0.48
        group.add(seat)
        const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.55, 0.1), benchMat)
        back.position.set(0, 0.75, -0.25)
        group.add(back)
        this.scene.add(group)
      }
    }
  }

  // Generic axis-aligned road segment: asphalt + sidewalks + curbs + dashed
  // centerline + lamp posts, mirroring the hand-placed corridor above.
  // Registers its own footprint as a paved zone so terrain/physics flatten
  // correctly underneath it.
  addSegment({ x1, z1, x2, z2, width = 16, sidewalk = 4, lampSpacing = 32, dashSpacing = 8 }) {
    const horizontal = z1 === z2
    const length = horizontal ? Math.abs(x2 - x1) : Math.abs(z2 - z1)
    const cx = (x1 + x2) / 2
    const cz = (z1 + z2) / 2
    const half = length / 2

    const asphaltMat  = toon(0x1c1c1c)
    const sidewalkMat = toon(0x9e9e8e)
    const curbMat     = toon(0xbdbdad)

    // Asphalt
    const roadGeo = horizontal
      ? new THREE.PlaneGeometry(length, width)
      : new THREE.PlaneGeometry(width, length)
    const road = new THREE.Mesh(roadGeo, asphaltMat)
    road.rotation.x = -Math.PI / 2
    road.position.set(cx, 0.08, cz)
    road.receiveShadow = true
    this.scene.add(road)

    // Sidewalks + curbs on both sides
    for (const side of [1, -1]) {
      const sOff = side * (width / 2 + sidewalk / 2)
      const swGeo = horizontal
        ? new THREE.PlaneGeometry(length, sidewalk)
        : new THREE.PlaneGeometry(sidewalk, length)
      const sw = new THREE.Mesh(swGeo, sidewalkMat)
      sw.rotation.x = -Math.PI / 2
      sw.position.set(horizontal ? cx : cx + sOff, 0.04, horizontal ? cz + sOff : cz)
      sw.receiveShadow = true
      this.scene.add(sw)

      const cOff = side * (width / 2)
      const curbGeo = horizontal
        ? new THREE.BoxGeometry(length, 0.22, 0.55)
        : new THREE.BoxGeometry(0.55, 0.22, length)
      const curb = new THREE.Mesh(curbGeo, curbMat)
      curb.position.set(horizontal ? cx : cx + cOff, 0.11, horizontal ? cz + cOff : cz)
      this.scene.add(curb)
    }

    // Dashed centerline
    const dashMat = toon(0xeeeecc, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    for (let d = -half; d < half; d += dashSpacing) {
      const dashGeo = horizontal
        ? new THREE.PlaneGeometry(4.5, 0.28)
        : new THREE.PlaneGeometry(0.28, 4.5)
      const dash = new THREE.Mesh(dashGeo, dashMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(horizontal ? cx + d : cx, 0.09, horizontal ? cz : cz + d)
      this.scene.add(dash)
    }

    // Lamp posts along both sides
    const poleMat = toon(0x555555)
    const headMat = toon(0xfff8cc, { emissive: new THREE.Color(0xffeeaa), emissiveIntensity: 1.0 })
    for (let d = -half + lampSpacing / 2; d < half; d += lampSpacing) {
      for (const side of [1, -1]) {
        const off = side * (width / 2 + 0.5)
        const px = horizontal ? cx + d : cx + off
        const pz = horizontal ? cz + off : cz + d
        this._addLampAt(px, pz, poleMat, headMat)
      }
    }

    addPavedZone({
      x1: horizontal ? Math.min(x1, x2) - 2 : cx - width / 2 - sidewalk,
      x2: horizontal ? Math.max(x1, x2) + 2 : cx + width / 2 + sidewalk,
      z1: horizontal ? cz - width / 2 - sidewalk : Math.min(z1, z2) - 2,
      z2: horizontal ? cz + width / 2 + sidewalk : Math.max(z1, z2) + 2,
    })
  }

  _addLampAt(x, z, poleMat, headMat) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8, 7), poleMat)
    pole.position.set(x, 4, z)
    pole.castShadow = true
    this.scene.add(pole)

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.7), headMat)
    head.position.set(x, 8.15, z)
    this.scene.add(head)

    const light = new THREE.PointLight(0xfff8cc, 0.9, 22)
    light.position.set(x, 7.8, z)
    this.scene.add(light)
  }

  _addAsphalt() {
    const mat = toon(0x1c1c1c)

    // Main east-west road
    const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 16), mat)
    road.rotation.x = -Math.PI / 2
    road.position.set(0, 0.08, -62)
    road.receiveShadow = true
    this.scene.add(road)
  }

  _addSidewalks() {
    const mat = toon(0x9e9e8e)

    // South sidewalk — south edge at z=-49, north edge at z=-54 (road south edge)
    const sw1 = new THREE.Mesh(new THREE.PlaneGeometry(240, 5), mat)
    sw1.rotation.x = -Math.PI / 2
    sw1.position.set(0, 0.04, -51.5)
    sw1.receiveShadow = true
    this.scene.add(sw1)

    // North sidewalk — south edge at z=-70 (road north edge), north edge at z=-74
    const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(240, 4), mat)
    sw2.rotation.x = -Math.PI / 2
    sw2.position.set(0, 0.04, -72)
    sw2.receiveShadow = true
    this.scene.add(sw2)
  }

  _addCurbs() {
    const mat = toon(0xbdbdad)

    const geo = new THREE.BoxGeometry(240, 0.22, 0.55)
    const south = new THREE.Mesh(geo, mat)
    south.position.set(0, 0.11, -54)
    this.scene.add(south)

    const north = new THREE.Mesh(geo, mat)
    north.position.set(0, 0.11, -70)
    this.scene.add(north)
  }

  _addMarkings() {
    // polygonOffset pushes markings in front of the road surface in the depth
    // buffer without physically lifting them — no shadow artifacts, no z-fight
    const markingOpts = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }

    // White center dashes (run E-W along the road)
    const dashMat = toon(0xeeeecc, markingOpts)
    for (let x = -115; x < 115; x += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.28), dashMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(x, 0.09, -62)
      this.scene.add(dash)
    }

    // Crosswalk — horizontal E-W stripes centered on the road (z=-54 to z=-70)
    // near the SM entrance end, centered at z=-64
    const crossMat = toon(0xe8e8e8, markingOpts)
    for (let i = -3; i <= 3; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.0), crossMat)
      stripe.rotation.x = -Math.PI / 2
      stripe.position.set(0, 0.09, -64 + i * 1.8)
      this.scene.add(stripe)
    }

    // Stop line at the south approach to the crosswalk
    const stopMat = toon(0xffffff, markingOpts)
    const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.5), stopMat)
    stopLine.rotation.x = -Math.PI / 2
    stopLine.position.set(0, 0.09, -57.5)
    this.scene.add(stopLine)
  }

  _addLamps() {
    const poleMat = toon(0x555555)
    const headMat = toon(0xfff8cc, { emissive: new THREE.Color(0xffeeaa), emissiveIntensity: 1.0 })

    const xPositions = [-90, -55, -20, 15, 50, 85]

    for (const x of xPositions) {
      // South side lamp
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8, 7), poleMat)
      pole.position.set(x, 4, -52.5)
      pole.castShadow = true
      this.scene.add(pole)

      // Arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 5), poleMat)
      arm.rotation.z = Math.PI / 2
      arm.position.set(x + 1.2, 8.1, -52.5)
      this.scene.add(arm)

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.7), headMat)
      head.position.set(x + 2.4, 8.15, -52.5)
      this.scene.add(head)

      const light = new THREE.PointLight(0xfff8cc, 0.9, 22)
      light.position.set(x + 2.4, 7.8, -52.5)
      this.scene.add(light)

      // North side lamp (facing SM)
      const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8, 7), poleMat)
      pole2.position.set(x, 4, -72.5)
      pole2.castShadow = true
      this.scene.add(pole2)

      const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 5), poleMat)
      arm2.rotation.z = Math.PI / 2
      arm2.position.set(x + 1.2, 8.1, -72.5)
      this.scene.add(arm2)

      const head2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.7), headMat)
      head2.position.set(x + 2.4, 8.15, -72.5)
      this.scene.add(head2)

      const light2 = new THREE.PointLight(0xfff8cc, 0.9, 22)
      light2.position.set(x + 2.4, 7.8, -72.5)
      this.scene.add(light2)
    }
  }
}
