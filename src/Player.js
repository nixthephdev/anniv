import * as THREE from 'three'

const WALK_SPEED   = 5
const RUN_SPEED    = 9
const CAM_DIST     = 5.5
const CAM_HEIGHT   = 2.8
const MOUSE_SENS   = 0.0022

export class Player {
  constructor(camera, scene, terrain, ui, memorySpots) {
    this.camera      = camera
    this.scene       = scene
    this.terrain     = terrain
    this.ui          = ui
    this.memorySpots = memorySpots

    // World-space feet position
    this.pos       = new THREE.Vector3(0, 0, 8)
    // Camera orbit angles
    this.cameraYaw   = Math.PI   // start facing "into" the world
    this.cameraPitch = 0.32
    // Character facing (smoothed)
    this.charRotY  = Math.PI
    // Animation
    this.walkCycle = 0
    this.isMoving  = false
    this.isRunning = false
    this.locked    = false
    this.keys      = {}

    this._buildCharacter()
    this._setupPointerLock()
    this._setupKeyboard()

    // Initial camera placement so it doesn't start at origin
    this._updateCamera()
  }

  // ── Character model ────────────────────────────────────────────────────

  _buildCharacter() {
    this.charGroup = new THREE.Group()

    const skin   = new THREE.MeshLambertMaterial({ color: 0xffccaa })
    const top    = new THREE.MeshLambertMaterial({ color: 0xf06292 }) // pink blouse
    const pants  = new THREE.MeshLambertMaterial({ color: 0x42a5f5 }) // light jeans
    const hair   = new THREE.MeshLambertMaterial({ color: 0x1a0a00 }) // dark brown
    const shoe   = new THREE.MeshLambertMaterial({ color: 0xfafafa }) // white sneakers
    const shoeSole = new THREE.MeshLambertMaterial({ color: 0xbdbdbd })

    // === Head ===
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 10), skin)
    head.position.y = 1.48
    head.castShadow = true
    this.charGroup.add(head)

    // Hair dome (covers top + back)
    const hairDome = new THREE.Mesh(new THREE.SphereGeometry(0.215, 12, 9), hair)
    hairDome.position.set(0, 1.55, -0.015)
    hairDome.scale.set(1, 0.72, 1.05)
    this.charGroup.add(hairDome)

    // Hair side fringe
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.175, 8, 6), hair)
    fringe.position.set(0, 1.5, 0.08)
    fringe.scale.set(1.08, 0.45, 0.7)
    this.charGroup.add(fringe)

    // Ponytail
    const pony = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.38, 6), hair)
    pony.position.set(0, 1.27, -0.22)
    pony.rotation.x = 0.45
    this.charGroup.add(pony)

    // === Body ===
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.2, 0.58, 9), top)
    body.position.y = 0.97
    body.castShadow = true
    this.charGroup.add(body)

    // Collar detail
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 5, 12), skin)
    collar.position.set(0, 1.24, 0)
    collar.rotation.x = Math.PI / 2
    this.charGroup.add(collar)

    // === Arms (pivot at shoulder) ===
    this.leftArm = new THREE.Group()
    this.leftArm.position.set(-0.225, 1.18, 0)
    const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.48, 7), skin)
    lArmMesh.position.y = -0.24
    this.leftArm.add(lArmMesh)
    // Hand
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 6), skin)
    lHand.position.y = -0.5
    this.leftArm.add(lHand)
    this.charGroup.add(this.leftArm)

    this.rightArm = new THREE.Group()
    this.rightArm.position.set(0.225, 1.18, 0)
    const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.48, 7), skin)
    rArmMesh.position.y = -0.24
    this.rightArm.add(rArmMesh)
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 6), skin)
    rHand.position.y = -0.5
    this.rightArm.add(rHand)
    this.charGroup.add(this.rightArm)

    // === Legs (pivot at hip) ===
    this.leftLeg = new THREE.Group()
    this.leftLeg.position.set(-0.105, 0.67, 0)
    const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.078, 0.62, 8), pants)
    lLegMesh.position.y = -0.31
    this.leftLeg.add(lLegMesh)
    // Shoe
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.24), shoe)
    lShoe.position.set(0, -0.65, 0.04)
    this.leftLeg.add(lShoe)
    const lSole = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.04, 0.245), shoeSole)
    lSole.position.set(0, -0.705, 0.04)
    this.leftLeg.add(lSole)
    this.charGroup.add(this.leftLeg)

    this.rightLeg = new THREE.Group()
    this.rightLeg.position.set(0.105, 0.67, 0)
    const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.078, 0.62, 8), pants)
    rLegMesh.position.y = -0.31
    this.rightLeg.add(rLegMesh)
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.24), shoe)
    rShoe.position.set(0, -0.65, 0.04)
    this.rightLeg.add(rShoe)
    const rSole = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.04, 0.245), shoeSole)
    rSole.position.set(0, -0.705, 0.04)
    this.rightLeg.add(rSole)
    this.charGroup.add(this.rightLeg)

    // Shadow caster
    this.charGroup.traverse(c => { if (c.isMesh) c.castShadow = true })

    this.scene.add(this.charGroup)
  }

  // ── Input ──────────────────────────────────────────────────────────────

  _setupPointerLock() {
    const canvas = document.querySelector('canvas')

    document.getElementById('start-btn').addEventListener('click', () => {
      document.getElementById('start-screen').classList.remove('visible')
      document.getElementById('hud').classList.add('visible')
      canvas.requestPointerLock()
      this.ui.startMusic()
      document.dispatchEvent(new CustomEvent('game:start'))
    })

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas
      document.getElementById('hud').classList.toggle('visible', this.locked)
    })

    document.addEventListener('mousemove', e => {
      if (!this.locked) return
      this.cameraYaw   -= e.movementX * MOUSE_SENS
      this.cameraPitch -= e.movementY * MOUSE_SENS
      this.cameraPitch  = Math.max(0.08, Math.min(0.7, this.cameraPitch))
    })

    canvas.addEventListener('click', () => {
      if (!this.locked) canvas.requestPointerLock()
    })
  }

  _setupKeyboard() {
    window.addEventListener('keydown', e => { this.keys[e.code] = true })
    window.addEventListener('keyup',   e => { this.keys[e.code] = false })
  }

  // ── Per-frame update ───────────────────────────────────────────────────

  getPosition() { return this.pos }

  update(delta) {
    if (!this.locked) return

    // Movement direction is camera-relative (projected on XZ)
    const fwd   = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw))
    const right = new THREE.Vector3( Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw))
    const move  = new THREE.Vector3()

    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.addScaledVector(fwd,   1)
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.addScaledVector(fwd,  -1)
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.addScaledVector(right,-1)
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.addScaledVector(right, 1)

    this.isRunning = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'])
    this.isMoving  = move.lengthSq() > 0
    const speed    = this.isRunning ? RUN_SPEED : WALK_SPEED

    if (this.isMoving) {
      move.normalize().multiplyScalar(speed)
      this.pos.x += move.x * delta
      this.pos.z += move.z * delta

      // Smooth character turn toward movement direction
      const targetRotY = Math.atan2(move.x, move.z)
      const diff = ((targetRotY - this.charRotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      this.charRotY += diff * Math.min(1, delta * 10)

      this.walkCycle += delta * speed * 2.6
    } else {
      this.walkCycle += delta * 1.2 // idle breath pace
    }

    // Snap to terrain
    this.pos.y = this.terrain.getHeightAt(this.pos.x, this.pos.z)

    // World boundary
    this.pos.x = Math.max(-93, Math.min(93, this.pos.x))
    this.pos.z = Math.max(-93, Math.min(93, this.pos.z))

    // Apply character model transform
    this.charGroup.position.set(this.pos.x, this.pos.y, this.pos.z)
    this.charGroup.rotation.y = this.charRotY

    this._animate()
    this._updateCamera()
    this.memorySpots.checkProximity(this.pos)
  }

  _animate() {
    if (this.isMoving) {
      const factor = this.isRunning ? 1.3 : 1.0
      const swing  = Math.sin(this.walkCycle) * 0.65 * factor

      this.leftLeg.rotation.x  =  swing
      this.rightLeg.rotation.x = -swing
      this.leftArm.rotation.x  = -swing * 0.55
      this.rightArm.rotation.x =  swing * 0.55

      // Slight forward lean while running
      this.charGroup.rotation.x = this.isRunning ? -0.12 : 0

      // Body bob
      const bob = Math.abs(Math.sin(this.walkCycle)) * 0.035
      this.charGroup.position.y = this.pos.y + bob
    } else {
      // Idle: gentle breathing, return limbs
      const breathe = Math.sin(this.walkCycle) * 0.018
      this.charGroup.position.y = this.pos.y + breathe
      this.charGroup.rotation.x = 0

      this.leftLeg.rotation.x  *= 0.88
      this.rightLeg.rotation.x *= 0.88
      this.leftArm.rotation.x  *= 0.88
      this.rightArm.rotation.x *= 0.88
    }
  }

  _updateCamera() {
    // Spherical orbit: camera stays CAM_DIST behind player, elevated by pitch
    const camX = this.pos.x + Math.sin(this.cameraYaw) * CAM_DIST
    const camZ = this.pos.z + Math.cos(this.cameraYaw) * CAM_DIST
    const camY = this.pos.y + CAM_HEIGHT + Math.sin(this.cameraPitch) * CAM_DIST * 0.55

    this.camera.position.set(camX, camY, camZ)
    // Look at character's chest/head, not feet
    this.camera.lookAt(this.pos.x, this.pos.y + 1.1, this.pos.z)
  }
}
