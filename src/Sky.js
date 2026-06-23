import * as THREE from 'three'

export class Sky {
  constructor(scene) {
    this.scene = scene
    this._buildSkyDome()
    this._buildStars()
    this._buildMoon()
    this._buildClouds()
  }

  _buildSkyDome() {
    // Gradient sky via vertex colors on a large sphere
    const geo = new THREE.SphereGeometry(250, 32, 16)
    const pos = geo.attributes.position
    const colors = []
    const top = new THREE.Color(0x0d0020)
    const mid = new THREE.Color(0x3d0055)
    const bot = new THREE.Color(0x6d1060)

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = (y / 250 + 1) / 2   // 0 = bottom, 1 = top
      const c = new THREE.Color()
      if (t > 0.5) c.lerpColors(mid, top, (t - 0.5) * 2)
      else c.lerpColors(bot, mid, t * 2)
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
    this.dome = new THREE.Mesh(geo, mat)
    this.scene.add(this.dome)
  }

  _buildStars() {
    const count = 1800
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const rng = mulberry32(99)

    for (let i = 0; i < count; i++) {
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(2 * rng() - 1) * 0.45 // upper hemisphere
      const r = 200 + rng() * 30
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      sizes[i] = 0.5 + rng() * 2.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
      color: 0xffe0f0,
      size: 0.6,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    })

    this.stars = new THREE.Points(geo, mat)
    this.scene.add(this.stars)
  }

  _buildMoon() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff0f8 })
    const moon = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), mat)
    moon.position.set(60, 120, -150)
    this.scene.add(moon)

    // Glow halo
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff8ec0, transparent: true, opacity: 0.12, side: THREE.BackSide
    })
    const halo = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 12), haloMat)
    halo.position.copy(moon.position)
    this.scene.add(halo)

    // Moon point light
    const light = new THREE.PointLight(0xffd6e8, 1.5, 300)
    light.position.copy(moon.position)
    this.scene.add(light)
  }

  _buildClouds() {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6a0080, transparent: true, opacity: 0.18
    })
    const rng = mulberry32(55)

    for (let c = 0; c < 18; c++) {
      const group = new THREE.Group()
      const blobCount = 3 + Math.floor(rng() * 4)
      for (let b = 0; b < blobCount; b++) {
        const r = 4 + rng() * 6
        const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), mat)
        blob.position.set((rng() - 0.5) * 12, (rng() - 0.5) * 3, (rng() - 0.5) * 8)
        group.add(blob)
      }
      const angle = rng() * Math.PI * 2
      const dist = 40 + rng() * 100
      group.position.set(
        Math.cos(angle) * dist,
        30 + rng() * 40,
        Math.sin(angle) * dist
      )
      this.scene.add(group)
      // Store for slow drift
      group.userData.driftSpeed = (rng() - 0.5) * 0.003
      group.userData.initAngle = angle
      group.userData.dist = dist
      this._clouds = this._clouds || []
      this._clouds.push(group)
    }
  }

  update(elapsed) {
    // Twinkle stars
    if (this.stars) {
      this.stars.material.opacity = 0.7 + Math.sin(elapsed * 0.5) * 0.15
    }
    // Drift clouds
    if (this._clouds) {
      this._clouds.forEach(cloud => {
        const a = cloud.userData.initAngle + elapsed * cloud.userData.driftSpeed
        cloud.position.x = Math.cos(a) * cloud.userData.dist
        cloud.position.z = Math.sin(a) * cloud.userData.dist
      })
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
