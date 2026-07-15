import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { getPavementBlend } from './PavedZones.js'

const WALK_SPEED = 4.2
const RUN_SPEED  = 8.2
const FOLLOW_MIN = 2.0
const FOLLOW_MAX = 3.6

/**
 * BoyfriendNPC — the male character, following her around the open world
 * like a companion. Same follow-at-a-distance pattern as Dog.js: trails
 * behind, catches up when she stops, turns to face her when idle nearby.
 */
export class BoyfriendNPC {
  constructor(scene, terrain) {
    this._scene   = scene
    this._terrain = terrain
    this._group   = null
    this._bones   = {}
    this._rest    = {}
    this._time      = 0
    this._walkCycle = 0
    this._isMoving  = false

    this.pos  = new THREE.Vector3(-2.2, 0, 6.5)   // spawns near her at the start
    this.rotY = Math.PI

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

    this._group = new THREE.Group()
    this._group.position.set(this.pos.x, this.pos.y, this.pos.z)
    this._group.rotation.y = this.rotY
    this._group.add(model)
    this._scene.add(this._group)

    // Find arm/leg bones so he walks instead of T-posing
    model.traverse(obj => {
      const n = obj.name
      if (n.endsWith('J_Bip_L_UpperArm')) this._bones.leftArm      = obj
      if (n.endsWith('J_Bip_R_UpperArm')) this._bones.rightArm     = obj
      if (n.endsWith('J_Bip_L_LowerArm')) this._bones.leftForearm  = obj
      if (n.endsWith('J_Bip_R_LowerArm')) this._bones.rightForearm = obj
      if (n.endsWith('J_Bip_L_UpperLeg')) this._bones.leftThigh    = obj
      if (n.endsWith('J_Bip_R_UpperLeg')) this._bones.rightThigh   = obj
      if (n.endsWith('J_Bip_L_LowerLeg')) this._bones.leftShin     = obj
      if (n.endsWith('J_Bip_R_LowerLeg')) this._bones.rightShin    = obj
    })
    for (const [k, b] of Object.entries(this._bones)) this._rest[k] = b.quaternion.clone()

    console.info('[BoyfriendNPC] Following, bones:', Object.keys(this._bones))
  }

  _pose(key, x, y, z) {
    const b = this._bones[key], r = this._rest[key]
    if (!b || !r) return
    b.quaternion.copy(r).multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))
    )
  }

  _groundY(x, z) {
    const raw   = this._terrain.getHeightAt(x, z)
    const blend = getPavementBlend(x, z)
    return blend >= 1 ? 0 : raw * (1 - blend)
  }

  update(delta, playerPos) {
    if (!this._group) return
    this._time += delta

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.pos)
    toPlayer.y = 0
    const dist = toPlayer.length()

    if (dist > FOLLOW_MAX) {
      const speed = dist > 8 ? RUN_SPEED : WALK_SPEED
      const dir = toPlayer.normalize()
      this.pos.x += dir.x * speed * delta
      this.pos.z += dir.z * speed * delta
      this.rotY = Math.atan2(dir.x, dir.z) + Math.PI   // VRoid faces -Z
      this._isMoving = true
      this._walkCycle += delta * speed * 2.6
    } else {
      this._isMoving = false
      if (dist > FOLLOW_MIN) {
        const target = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI
        const diff = ((target - this.rotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        this.rotY += diff * Math.min(1, delta * 3)
      }
    }

    this.pos.y = this._groundY(this.pos.x, this.pos.z)
    this._group.position.set(
      this.pos.x,
      this.pos.y + Math.sin(this._time * 2.2) * 0.02,
      this.pos.z
    )
    this._group.rotation.y = this.rotY

    this._animate()
  }

  _animate() {
    if (!Object.keys(this._bones).length) return

    if (this._isMoving) {
      const swing = Math.sin(this._walkCycle) * 0.5
      this._pose('leftThigh',   swing, 0, 0)
      this._pose('rightThigh', -swing, 0, 0)
      this._pose('leftShin',  Math.max(0, -swing) * 0.65, 0, 0)
      this._pose('rightShin', Math.max(0,  swing) * 0.65, 0, 0)
      this._pose('leftArm',  -swing * 0.4, 0, -1.15)
      this._pose('rightArm',  swing * 0.4, 0,  1.15)
      // Elbow bend — constant relaxed bend plus extra on the backswing.
      // Without this the arms swing as rigid straight rods from the shoulder.
      this._pose('leftForearm',  0.3 + Math.max(0,  swing) * 0.5, 0, 0)
      this._pose('rightForearm', 0.3 + Math.max(0, -swing) * 0.5, 0, 0)
    } else {
      // Idle: arms hang at sides with a gentle breathing sway, elbows kept
      // slightly bent rather than snapping back to the dead-straight rest pose
      const breathe = Math.sin(this._time * 0.6) * 0.04
      this._pose('leftArm',  0, 0, -1.15 + breathe)
      this._pose('rightArm', 0, 0,  1.15 - breathe)
      this._pose('leftForearm',  0.28, 0, 0)
      this._pose('rightForearm', 0.28, 0, 0)
      const slerp = key => {
        const b = this._bones[key], r = this._rest[key]
        if (b && r) b.quaternion.slerp(r, 0.12)
      }
      slerp('leftThigh'); slerp('rightThigh')
      slerp('leftShin');  slerp('rightShin')
    }
  }
}
