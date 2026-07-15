import * as THREE from 'three'

export class Sky {
  constructor(scene) {
    this.scene = scene
    this._clouds = []
    this._buildSkyDome()
    this._buildSun()
    this._buildClouds()
    this._buildBirds()
  }

  _buildSkyDome() {
    const geo = new THREE.SphereGeometry(250, 32, 16)
    const pos = geo.attributes.position
    const colors = []
    const zenith  = new THREE.Color(0x4fc3f7)  // deep sky blue at top
    const mid     = new THREE.Color(0x81d4fa)  // lighter mid
    const horizon = new THREE.Color(0xffe0b2)  // warm peach horizon

    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) / 250 + 1) / 2
      const c = new THREE.Color()
      if (t > 0.55) c.lerpColors(mid, zenith, (t - 0.55) / 0.45)
      else if (t > 0.3) c.lerpColors(horizon, mid, (t - 0.3) / 0.25)
      else c.copy(horizon)
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
    this.dome = new THREE.Mesh(geo, mat)
    this.scene.add(this.dome)
  }

  _buildSun() {
    // Sun disc + halo + light live at a fixed offset from the camera (like a
    // real distant sun) inside a group we recentre every frame in update() —
    // otherwise it stays pinned near the origin and goes dark/out of range
    // once the player wanders far enough away.
    this._sunOffset = new THREE.Vector3(80, 110, -160)
    this._sunGroup  = new THREE.Group()
    this._sunGroup.position.copy(this._sunOffset)
    this.scene.add(this._sunGroup)

    // Sun disc
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffde7 })
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), sunMat)
    this._sunGroup.add(this.sun)

    // Halo layers
    const haloColors = [0xfff9c4, 0xffecb3, 0xffe082]
    const haloSizes  = [14, 18, 24]
    haloColors.forEach((c, i) => {
      const h = new THREE.Mesh(
        new THREE.SphereGeometry(haloSizes[i], 14, 10),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12 - i * 0.03, side: THREE.BackSide })
      )
      this._sunGroup.add(h)
    })

    // Sun light
    const sunLight = new THREE.PointLight(0xfff8e1, 1.2, 400)
    this._sunGroup.add(sunLight)
  }

  _buildClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })
    const rng = mulberry32(88)

    for (let c = 0; c < 22; c++) {
      const group = new THREE.Group()
      const blobCount = 4 + Math.floor(rng() * 5)
      for (let b = 0; b < blobCount; b++) {
        const rx = 5 + rng() * 7, ry = 3 + rng() * 4, rz = 4 + rng() * 6
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), cloudMat)
        blob.scale.set(rx, ry, rz)
        blob.position.set((rng() - 0.5) * 18, (rng() - 0.5) * 4, (rng() - 0.5) * 12)
        group.add(blob)
      }

      const angle = rng() * Math.PI * 2
      const dist  = 50 + rng() * 120
      group.position.set(Math.cos(angle) * dist, 45 + rng() * 35, Math.sin(angle) * dist)

      this.scene.add(group)
      group.userData.initAngle  = angle
      group.userData.dist       = dist
      group.userData.driftSpeed = (rng() * 0.002 + 0.0005) * (rng() > 0.5 ? 1 : -1)
      this._clouds.push(group)
    }
  }

  _buildBirds() {
    // Distant V-shaped birds as tiny sprites
    this._birdGroups = []
    const rng = mulberry32(44)

    for (let f = 0; f < 6; f++) {
      const group = new THREE.Group()
      const wingMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide })

      for (let b = 0; b < 5; b++) {
        const left  = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), wingMat)
        left.position.set(-0.4 * b - 0.4, Math.sin(b * 0.5) * 0.15, 0)
        left.rotation.z = 0.3
        group.add(left)

        const right = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), wingMat)
        right.position.set(0.4 * b + 0.4, Math.sin(b * 0.5) * 0.15, 0)
        right.rotation.z = -0.3
        group.add(right)
      }

      const angle = rng() * Math.PI * 2
      const dist  = 60 + rng() * 80
      group.position.set(Math.cos(angle) * dist, 35 + rng() * 20, Math.sin(angle) * dist)
      group.userData.angle     = angle
      group.userData.dist      = dist
      group.userData.speed     = 0.008 + rng() * 0.005
      group.userData.flapSpeed = 2 + rng() * 2

      this.scene.add(group)
      this._birdGroups.push(group)
    }
  }

  update(elapsed, cameraPos) {
    // Keep the dome and sun centred on the camera — they're fixed-radius
    // props relative to the viewer, not fixed to world-space origin, so the
    // player can roam the whole map without exiting the sphere (which would
    // clip through the far plane and show a black hole) or losing the sun.
    if (cameraPos) {
      this.dome.position.set(cameraPos.x, 0, cameraPos.z)
      this._sunGroup.position.set(
        cameraPos.x + this._sunOffset.x,
        this._sunOffset.y,
        cameraPos.z + this._sunOffset.z
      )
    }

    // Drift clouds
    this._clouds.forEach(cloud => {
      const a = cloud.userData.initAngle + elapsed * cloud.userData.driftSpeed
      cloud.position.x = Math.cos(a) * cloud.userData.dist
      cloud.position.z = Math.sin(a) * cloud.userData.dist
    })

    // Flap birds + orbit
    this._birdGroups.forEach(group => {
      group.userData.angle += group.userData.speed
      const a = group.userData.angle
      group.position.x = Math.cos(a) * group.userData.dist
      group.position.z = Math.sin(a) * group.userData.dist
      group.rotation.y = -a + Math.PI / 2

      // Wing flap
      group.children.forEach((wing, i) => {
        wing.rotation.z = (i % 2 === 0 ? 1 : -1) *
          (0.3 + Math.sin(elapsed * group.userData.flapSpeed) * 0.25)
      })
    })
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
