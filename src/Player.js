import * as THREE from 'three'

const SPEED = 7
const SPRINT = 13
const MOUSE_SENS = 0.002
const GRAVITY = -18
const JUMP_VEL = 6

export class Player {
  constructor(camera, scene, terrain, ui, memorySpots) {
    this.camera = camera
    this.scene = scene
    this.terrain = terrain
    this.ui = ui
    this.memorySpots = memorySpots

    this.vel = new THREE.Vector3()
    this.pos = new THREE.Vector3(0, 2, 8)
    this.yaw = 0     // left/right
    this.pitch = 0   // up/down (clamped)
    this.onGround = false
    this.locked = false
    this.keys = {}

    this._buildBody()
    this._setupPointerLock()
    this._setupKeyboard()
    this.camera.position.copy(this.pos)
  }

  _buildBody() {
    // Invisible collision capsule marker (visual body not shown in first-person)
    this.body = new THREE.Object3D()
    this.scene.add(this.body)
  }

  _setupPointerLock() {
    const canvas = document.querySelector('canvas')
    document.getElementById('start-btn').addEventListener('click', () => {
      document.getElementById('start-screen').classList.remove('visible')
      document.getElementById('hud').classList.add('visible')
      document.getElementById('crosshair').classList.add('visible')
      canvas.requestPointerLock()
      this.ui.startMusic()
      // Trigger world loop via event
      document.dispatchEvent(new CustomEvent('game:start'))
    })

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas
      if (!this.locked) {
        document.getElementById('hud').classList.remove('visible')
        document.getElementById('crosshair').classList.remove('visible')
      }
    })

    document.addEventListener('mousemove', e => {
      if (!this.locked) return
      this.yaw -= e.movementX * MOUSE_SENS
      this.pitch -= e.movementY * MOUSE_SENS
      this.pitch = Math.max(-0.4, Math.min(0.55, this.pitch))  // look limit
    })

    canvas.addEventListener('click', () => {
      if (!this.locked) canvas.requestPointerLock()
    })
  }

  _setupKeyboard() {
    window.addEventListener('keydown', e => { this.keys[e.code] = true })
    window.addEventListener('keyup', e => { this.keys[e.code] = false })
  }

  getPosition() { return this.pos }

  update(delta) {
    if (!this.locked) return

    // ── Movement direction from keys ──
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right   = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    const move    = new THREE.Vector3()

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.addScaledVector(forward, 1)
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.addScaledVector(forward, -1)
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.addScaledVector(right, -1)
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.addScaledVector(right, 1)

    const speed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? SPRINT : SPEED
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed)

    // ── Gravity ──
    this.vel.y += GRAVITY * delta
    if (this.keys['Space'] && this.onGround) this.vel.y = JUMP_VEL

    // ── Integrate ──
    this.pos.x += (move.x + this.vel.x) * delta
    this.pos.z += (move.z + this.vel.z) * delta
    this.pos.y += this.vel.y * delta

    // ── Terrain collision ──
    const groundY = this.terrain.getHeightAt(this.pos.x, this.pos.z) + 1.7
    if (this.pos.y <= groundY) {
      this.pos.y = groundY
      this.vel.y = 0
      this.onGround = true
    } else {
      this.onGround = false
    }

    // Drag on horizontal vel
    this.vel.x *= 0.85
    this.vel.z *= 0.85

    // World boundary
    const BOUND = 95
    this.pos.x = Math.max(-BOUND, Math.min(BOUND, this.pos.x))
    this.pos.z = Math.max(-BOUND, Math.min(BOUND, this.pos.z))

    // ── Apply to camera ──
    this.camera.position.copy(this.pos)
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch

    this.body.position.copy(this.pos)

    // ── Check memory spots ──
    this.memorySpots.checkProximity(this.pos)
  }
}
