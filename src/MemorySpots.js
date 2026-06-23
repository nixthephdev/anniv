import * as THREE from 'three'
import { CONFIG } from './config.js'

const TRIGGER_DIST = 5
const POPUP_HOLD_MS = 6000

export class MemorySpots {
  constructor(scene) {
    this.scene = scene
    this.orbs = []
    this.activeOrb = null
    this.popupTimeout = null
    this._build()
  }

  _build() {
    CONFIG.memorySpots.forEach(spot => {
      const group = new THREE.Group()
      group.position.set(spot.position.x, 0.5, spot.position.z)

      // Outer glow ring
      const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: spot.isFinal ? 0xff0055 : 0xff69b4,
        transparent: true, opacity: 0.7,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      group.add(ring)

      // Inner orb
      const orbGeo = new THREE.SphereGeometry(0.45, 16, 12)
      const orbMat = new THREE.MeshBasicMaterial({
        color: spot.isFinal ? 0xff1a6e : 0xffb3d9,
        transparent: true, opacity: 0.9,
      })
      const orb = new THREE.Mesh(orbGeo, orbMat)
      group.add(orb)

      // Point light at spot
      const light = new THREE.PointLight(
        spot.isFinal ? 0xff0055 : 0xff69b4,
        1.2, 12
      )
      group.add(light)

      // Floating label (billboard text via sprite)
      const sprite = this._makeLabel(spot.icon + ' ' + spot.title)
      sprite.position.set(0, 2.2, 0)
      group.add(sprite)

      group.userData = { ...spot, orb, ring, ringMat, orbMat, light, visited: false }
      this.orbs.push(group)
      this.scene.add(group)
    })
  }

  _makeLabel(text) {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = 'rgba(20,0,35,0.7)'
    ctx.roundRect(4, 4, 248, 56, 12)
    ctx.fill()
    ctx.fillStyle = '#ffb3cc'
    ctx.font = 'bold 18px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(3.5, 0.875, 1)
    return sprite
  }

  update(elapsed, _playerPos) {
    this.orbs.forEach(group => {
      // Pulse ring
      const pulse = 0.85 + Math.sin(elapsed * 2.5 + group.userData.id.length) * 0.15
      group.userData.ring.scale.set(pulse, pulse, pulse)
      // Hover orb
      group.userData.orb.position.y = Math.sin(elapsed * 1.8 + group.userData.id.length * 0.5) * 0.3
      // Rotate ring slowly
      group.userData.ring.rotation.z += 0.005
    })
  }

  checkProximity(playerPos) {
    this.orbs.forEach(group => {
      if (group.userData.visited) return
      const dx = group.position.x - playerPos.x
      const dz = group.position.z - playerPos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < TRIGGER_DIST) {
        group.userData.visited = true
        this._showPopup(group.userData)

        // Burst effect — expand ring then fade
        const ringMat = group.userData.ringMat
        const t = { v: 1 }
        const start = performance.now()
        const burst = () => {
          const p = (performance.now() - start) / 1000
          if (p < 1) {
            group.userData.ring.scale.setScalar(1 + p * 2)
            ringMat.opacity = 0.7 * (1 - p)
            requestAnimationFrame(burst)
          }
        }
        burst()
      }
    })
  }

  _showPopup(spot) {
    const popup = document.getElementById('memory-popup')
    document.getElementById('memory-icon').textContent = spot.icon
    document.getElementById('memory-title').textContent = spot.title
    document.getElementById('memory-text').textContent = spot.message
    popup.classList.add('visible')

    if (this.popupTimeout) clearTimeout(this.popupTimeout)
    this.popupTimeout = setTimeout(() => {
      popup.classList.remove('visible')
      if (spot.isFinal) {
        setTimeout(() => {
          document.getElementById('final-screen').classList.add('visible')
          document.getElementById('hud').classList.remove('visible')
          document.getElementById('crosshair').classList.remove('visible')
          document.exitPointerLock()
        }, 800)
      }
    }, POPUP_HOLD_MS)
  }
}
