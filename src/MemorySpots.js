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
      group.userData = { ...spot, visited: false }
      this.orbs.push(group)
      this.scene.add(group)
    })
  }

  update(_elapsed, _playerPos) {}

  checkProximity(playerPos) {
    this.orbs.forEach(group => {
      if (group.userData.visited) return
      const dx = group.position.x - playerPos.x
      const dz = group.position.z - playerPos.z
      if (Math.sqrt(dx * dx + dz * dz) < TRIGGER_DIST) {
        group.userData.visited = true
        this._showPopup(group.userData)
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
