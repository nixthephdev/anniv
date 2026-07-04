import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CONFIG } from './config.js'

/**
 * BoyfriendNPC — he waits at the final 💖 memory spot.
 * Hidden until all regular memories are collected ('memories:complete'),
 * then appears beside the final beacon, always turning to face her.
 */
export class BoyfriendNPC {
  constructor(scene, terrain) {
    this._scene   = scene
    this._terrain = terrain
    this._group   = null
    this._visible = false
    this._baseY   = 0
    this._time    = 0

    this._load()
    document.addEventListener('memories:complete', () => {
      if (this._group) this._group.visible = true
      this._visible = true
    })
  }

  async _load() {
    const base = import.meta.env.BASE_URL
    let gltf
    try {
      gltf = await new GLTFLoader().loadAsync(`${base}character/me.glb`)
    } catch {
      console.warn('[BoyfriendNPC] me.glb not found — skipping')
      return
    }

    const model = gltf.scene

    // Scale so model stands ~1.65 m tall
    const meshBox = new THREE.Box3()
    model.traverse(c => { if (c.isMesh) meshBox.expandByObject(c) })
    if (!meshBox.isEmpty()) {
      const h = meshBox.max.y - meshBox.min.y
      if (h > 2.2 || h < 1.0) model.scale.setScalar(1.65 / h)
      model.updateMatrixWorld(true)
      const floorBox = new THREE.Box3()
      model.traverse(c => { if (c.isMesh) floorBox.expandByObject(c) })
      if (floorBox.min.y !== 0) model.position.y -= floorBox.min.y
    }
    model.traverse(c => { if (c.isMesh) c.castShadow = true })

    // Stand beside the final memory spot
    const spot = CONFIG.memorySpots.find(s => s.isFinal)
    if (!spot) return

    const gz = spot.position.z
    const groundY = (gz <= -48 && gz >= -115)
      ? 0
      : this._terrain.getHeightAt(spot.position.x, spot.position.z)

    this._group = new THREE.Group()
    this._group.position.set(spot.position.x + 1.8, groundY, spot.position.z)
    this._baseY = groundY
    this._group.rotation.y = Math.PI   // VRoid faces -Z; start facing the world
    this._group.visible = this._visible
    this._group.add(model)
    this._scene.add(this._group)

    console.info('[BoyfriendNPC] Waiting at the final memory spot')
  }

  update(delta, playerPos) {
    if (!this._group || !this._group.visible) return
    this._time += delta

    // Gentle idle bob
    this._group.position.y = this._baseY + Math.sin(this._time * 2.2) * 0.03

    // Turn smoothly to face her (VRoid model faces -Z, so add PI)
    const dx = playerPos.x - this._group.position.x
    const dz = playerPos.z - this._group.position.z
    if (dx * dx + dz * dz > 0.5) {
      const target = Math.atan2(dx, dz) + Math.PI
      const diff = ((target - this._group.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      this._group.rotation.y += diff * Math.min(1, delta * 4)
    }
  }
}
