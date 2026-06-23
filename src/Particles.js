import * as THREE from 'three'

const mobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0
const HEART_COUNT = mobile ? 50  : 120
const PETAL_COUNT = mobile ? 70  : 180

export class Particles {
  constructor(scene) {
    this.scene = scene
    this._buildHearts()
    this._buildPetals()
    this._buildGlitter()
  }

  _buildHearts() {
    // Hearts as small bright point clusters
    const positions = new Float32Array(HEART_COUNT * 3)
    const velocities = []
    const rng = mulberry32(11)

    for (let i = 0; i < HEART_COUNT; i++) {
      const x = (rng() - 0.5) * 160
      const y = rng() * 40
      const z = (rng() - 0.5) * 160
      positions[i * 3]     = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      velocities.push({ x, z, speed: 0.5 + rng() * 1.5, wave: rng() * Math.PI * 2 })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0xff69b4, size: 0.35, transparent: true, opacity: 0.8, sizeAttenuation: true
    })

    this.hearts = new THREE.Points(geo, mat)
    this.heartVel = velocities
    this.heartPos = positions
    this.scene.add(this.hearts)
  }

  _buildPetals() {
    // Falling petals as tiny planes
    const positions = new Float32Array(PETAL_COUNT * 3)
    const rng = mulberry32(22)

    for (let i = 0; i < PETAL_COUNT; i++) {
      positions[i * 3]     = (rng() - 0.5) * 140
      positions[i * 3 + 1] = rng() * 50 + 5
      positions[i * 3 + 2] = (rng() - 0.5) * 140
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffb3cc, size: 0.22, transparent: true, opacity: 0.6, sizeAttenuation: true
    })

    this.petals = new THREE.Points(geo, mat)
    this.petalPos = positions
    this.scene.add(this.petals)
  }

  _buildGlitter() {
    const count = mobile ? 80 : 300
    const positions = new Float32Array(count * 3)
    const rng = mulberry32(33)

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (rng() - 0.5) * 160
      positions[i * 3 + 1] = rng() * 30 + 1
      positions[i * 3 + 2] = (rng() - 0.5) * 160
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.12, transparent: true, opacity: 0.5, sizeAttenuation: true
    })

    this.glitter = new THREE.Points(geo, mat)
    this.glitterPos = positions
    this.scene.add(this.glitter)
  }

  update(elapsed) {
    // Float hearts up and sway
    for (let i = 0; i < HEART_COUNT; i++) {
      const v = this.heartVel[i]
      this.heartPos[i * 3 + 1] += v.speed * 0.012
      this.heartPos[i * 3]     = v.x + Math.sin(elapsed * 0.6 + v.wave) * 1.5
      if (this.heartPos[i * 3 + 1] > 45) this.heartPos[i * 3 + 1] = 0
    }
    this.hearts.geometry.attributes.position.needsUpdate = true
    this.hearts.material.opacity = 0.6 + Math.sin(elapsed * 0.8) * 0.2

    // Fall petals
    for (let i = 0; i < PETAL_COUNT; i++) {
      this.petalPos[i * 3 + 1] -= 0.018
      this.petalPos[i * 3]     += Math.sin(elapsed + i) * 0.008
      if (this.petalPos[i * 3 + 1] < 0) this.petalPos[i * 3 + 1] = 55
    }
    this.petals.geometry.attributes.position.needsUpdate = true

    // Glitter twinkle
    this.glitter.material.opacity = 0.3 + Math.sin(elapsed * 3.5) * 0.2
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
