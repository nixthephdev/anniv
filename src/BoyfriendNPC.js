import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { CONFIG } from './config.js'

export class BoyfriendNPC {
  constructor(scene, terrain) {
    this._scene   = scene
    this._terrain = terrain
    this._load()
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

    const source = gltf.scene

    // Scale so model stands ~1.65 m tall
    const meshBox = new THREE.Box3()
    source.traverse(c => { if (c.isMesh) meshBox.expandByObject(c) })
    if (!meshBox.isEmpty()) {
      const h = meshBox.max.y - meshBox.min.y
      if (h > 2.2 || h < 1.0) source.scale.setScalar(1.65 / h)
      source.updateMatrixWorld(true)
      const floorBox = new THREE.Box3()
      source.traverse(c => { if (c.isMesh) floorBox.expandByObject(c) })
      if (floorBox.min.y !== 0) source.position.y -= floorBox.min.y
    }
    source.traverse(c => { if (c.isMesh) c.castShadow = true })

    // One clone per memory spot
    for (const spot of CONFIG.memorySpots) {
      const clone = SkeletonUtils.clone(source)

      // Ground height — road zone is flat at y=0
      const gz = spot.position.z
      const groundY = (gz <= -48 && gz >= -115)
        ? 0
        : this._terrain.getHeightAt(spot.position.x, spot.position.z)

      // Stand 1.5 units to the side of the glowing orb
      const group = new THREE.Group()
      group.position.set(spot.position.x + 1.5, groundY, spot.position.z + 1.5)

      // Face toward the player's start (north = +Z); VRoid default faces -Z so rotate 180°
      group.rotation.y = Math.PI

      group.add(clone)
      this._scene.add(group)
    }

    console.info('[BoyfriendNPC] Placed at', CONFIG.memorySpots.length, 'spots')
  }
}
