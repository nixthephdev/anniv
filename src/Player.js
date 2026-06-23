import * as THREE from 'three'

const WALK_SPEED     = 5
const RUN_SPEED      = 9
const CAM_DIST       = 5.5
const CAM_HEIGHT     = 2.8
const MOUSE_SENS     = 0.0022
const TOUCH_CAM_SENS = 0.0042
const JOY_RADIUS     = 52   // px — max joystick knob travel

export const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0

export class Player {
  constructor(camera, scene, terrain, ui, memorySpots) {
    this.camera      = camera
    this.scene       = scene
    this.terrain     = terrain
    this.ui          = ui
    this.memorySpots = memorySpots

    this.pos         = new THREE.Vector3(0, 0, 8)
    this.cameraYaw   = Math.PI
    this.cameraPitch = 0.32
    this.charRotY    = Math.PI
    this.walkCycle   = 0
    this.isMoving    = false
    this.isRunning   = false
    this.locked      = false
    this.keys        = {}

    // Touch state
    this.joystick = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 }
    this.camTouch = { active: false, id: -1, lastX: 0, lastY: 0 }

    this._buildCharacter()
    this._setupStartButton()
    if (isMobile) {
      this._setupTouchControls()
    } else {
      this._setupPointerLock()
      this._setupKeyboard()
    }
    this._updateCamera()
  }

  // ── Start button ───────────────────────────────────────────────────────

  _setupStartButton() {
    document.getElementById('start-btn').addEventListener('click', () => {
      document.getElementById('start-screen').classList.remove('visible')
      document.getElementById('hud').classList.add('visible')
      this.ui.startMusic()
      document.dispatchEvent(new CustomEvent('game:start'))

      if (isMobile) {
        this.locked = true
        document.getElementById('joystick-hint').style.display = 'none'
      } else {
        document.querySelector('canvas').requestPointerLock()
      }
    })
  }

  // ── Desktop: pointer lock + keyboard ──────────────────────────────────

  _setupPointerLock() {
    const canvas = document.querySelector('canvas')
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas
      document.getElementById('hud').classList.toggle('visible', this.locked)
    })
    document.addEventListener('mousemove', e => {
      if (!this.locked) return
      this.cameraYaw   -= e.movementX * MOUSE_SENS
      this.cameraPitch  = Math.max(0.08, Math.min(0.7,
        this.cameraPitch - e.movementY * MOUSE_SENS))
    })
    canvas.addEventListener('click', () => {
      if (!this.locked) canvas.requestPointerLock()
    })
  }

  _setupKeyboard() {
    window.addEventListener('keydown', e => { this.keys[e.code] = true })
    window.addEventListener('keyup',   e => { this.keys[e.code] = false })
  }

  // ── Mobile: virtual joystick + camera drag ────────────────────────────

  _setupTouchControls() {
    const canvas = document.querySelector('canvas')
    const base   = document.getElementById('joystick-base')
    const knob   = document.getElementById('joystick-knob')

    const onStart = e => {
      e.preventDefault()
      Array.from(e.changedTouches).forEach(t => {
        const leftSide = t.clientX < window.innerWidth * 0.52

        if (leftSide && !this.joystick.active) {
          this.joystick = {
            active: true, id: t.identifier,
            startX: t.clientX, startY: t.clientY, dx: 0, dy: 0,
          }
          // Position joystick base at touch point
          base.style.left    = t.clientX + 'px'
          base.style.top     = t.clientY + 'px'
          base.style.display = 'block'
          knob.style.transform = 'translate(-50%,-50%)'
        } else if (!leftSide && !this.camTouch.active) {
          this.camTouch = {
            active: true, id: t.identifier,
            lastX: t.clientX, lastY: t.clientY,
          }
        }
      })
    }

    const onMove = e => {
      e.preventDefault()
      Array.from(e.changedTouches).forEach(t => {
        if (t.identifier === this.joystick.id) {
          const dx  = t.clientX - this.joystick.startX
          const dy  = t.clientY - this.joystick.startY
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const cl  = Math.min(len, JOY_RADIUS)
          this.joystick.dx = (dx / len) * (cl / JOY_RADIUS)
          this.joystick.dy = (dy / len) * (cl / JOY_RADIUS)
          // Animate knob
          knob.style.transform =
            `translate(calc(-50% + ${this.joystick.dx * JOY_RADIUS}px),` +
            ` calc(-50% + ${this.joystick.dy * JOY_RADIUS}px))`

        } else if (t.identifier === this.camTouch.id) {
          const dx = t.clientX - this.camTouch.lastX
          const dy = t.clientY - this.camTouch.lastY
          this.cameraYaw   -= dx * TOUCH_CAM_SENS
          this.cameraPitch  = Math.max(0.08, Math.min(0.7,
            this.cameraPitch - dy * TOUCH_CAM_SENS))
          this.camTouch.lastX = t.clientX
          this.camTouch.lastY = t.clientY
        }
      })
    }

    const onEnd = e => {
      Array.from(e.changedTouches).forEach(t => {
        if (t.identifier === this.joystick.id) {
          this.joystick = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 }
          base.style.display = 'none'
        } else if (t.identifier === this.camTouch.id) {
          this.camTouch = { active: false, id: -1, lastX: 0, lastY: 0 }
        }
      })
    }

    canvas.addEventListener('touchstart',  onStart, { passive: false })
    canvas.addEventListener('touchmove',   onMove,  { passive: false })
    canvas.addEventListener('touchend',    onEnd,   { passive: false })
    canvas.addEventListener('touchcancel', onEnd,   { passive: false })
  }

  // ── Character model ────────────────────────────────────────────────────

  _buildCharacter() {
    this.charGroup = new THREE.Group()

    const skin    = new THREE.MeshLambertMaterial({ color: 0xffccaa })
    const top     = new THREE.MeshLambertMaterial({ color: 0xf06292 })
    const pants   = new THREE.MeshLambertMaterial({ color: 0x42a5f5 })
    const hair    = new THREE.MeshLambertMaterial({ color: 0x1a0a00 })
    const shoe    = new THREE.MeshLambertMaterial({ color: 0xfafafa })
    const shoeSole = new THREE.MeshLambertMaterial({ color: 0xbdbdbd })

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 10), skin)
    head.position.y = 1.48
    this.charGroup.add(head)

    // Hair dome
    const hairDome = new THREE.Mesh(new THREE.SphereGeometry(0.215, 12, 9), hair)
    hairDome.position.set(0, 1.55, -0.015)
    hairDome.scale.set(1, 0.72, 1.05)
    this.charGroup.add(hairDome)

    // Hair fringe
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.175, 8, 6), hair)
    fringe.position.set(0, 1.5, 0.08)
    fringe.scale.set(1.08, 0.45, 0.7)
    this.charGroup.add(fringe)

    // Ponytail
    const pony = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.38, 6), hair)
    pony.position.set(0, 1.27, -0.22)
    pony.rotation.x = 0.45
    this.charGroup.add(pony)

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.2, 0.58, 9), top)
    body.position.y = 0.97
    this.charGroup.add(body)

    // Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 5, 12), skin)
    collar.position.set(0, 1.24, 0)
    collar.rotation.x = Math.PI / 2
    this.charGroup.add(collar)

    // Left arm (pivot at shoulder)
    this.leftArm = new THREE.Group()
    this.leftArm.position.set(-0.225, 1.18, 0)
    const lAM = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.48, 7), skin)
    lAM.position.y = -0.24
    this.leftArm.add(lAM)
    const lH = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 6), skin)
    lH.position.y = -0.5
    this.leftArm.add(lH)
    this.charGroup.add(this.leftArm)

    // Right arm
    this.rightArm = new THREE.Group()
    this.rightArm.position.set(0.225, 1.18, 0)
    const rAM = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.48, 7), skin)
    rAM.position.y = -0.24
    this.rightArm.add(rAM)
    const rH = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 6), skin)
    rH.position.y = -0.5
    this.rightArm.add(rH)
    this.charGroup.add(this.rightArm)

    // Left leg (pivot at hip)
    this.leftLeg = new THREE.Group()
    this.leftLeg.position.set(-0.105, 0.67, 0)
    const lLM = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.078, 0.62, 8), pants)
    lLM.position.y = -0.31
    this.leftLeg.add(lLM)
    const lS = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.24), shoe)
    lS.position.set(0, -0.65, 0.04)
    this.leftLeg.add(lS)
    const lSo = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.04, 0.245), shoeSole)
    lSo.position.set(0, -0.705, 0.04)
    this.leftLeg.add(lSo)
    this.charGroup.add(this.leftLeg)

    // Right leg
    this.rightLeg = new THREE.Group()
    this.rightLeg.position.set(0.105, 0.67, 0)
    const rLM = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.078, 0.62, 8), pants)
    rLM.position.y = -0.31
    this.rightLeg.add(rLM)
    const rS = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.24), shoe)
    rS.position.set(0, -0.65, 0.04)
    this.rightLeg.add(rS)
    const rSo = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.04, 0.245), shoeSole)
    rSo.position.set(0, -0.705, 0.04)
    this.rightLeg.add(rSo)
    this.charGroup.add(this.rightLeg)

    this.charGroup.traverse(c => { if (c.isMesh) c.castShadow = true })
    this.scene.add(this.charGroup)
  }

  // ── Per-frame update ───────────────────────────────────────────────────

  getPosition() { return this.pos }

  update(delta) {
    if (!this.locked) return

    const fwd   = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw))
    const right = new THREE.Vector3( Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw))
    const move  = new THREE.Vector3()

    if (isMobile) {
      // Joystick: dy negative = forward (finger pulls away from start = up the screen = forward)
      if (this.joystick.active) {
        move.addScaledVector(fwd,  -this.joystick.dy)
        move.addScaledVector(right,  this.joystick.dx)
        const intensity = Math.sqrt(this.joystick.dx ** 2 + this.joystick.dy ** 2)
        this.isRunning = intensity > 0.72
      }
    } else {
      if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.addScaledVector(fwd,   1)
      if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.addScaledVector(fwd,  -1)
      if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.addScaledVector(right,-1)
      if (this.keys['KeyD'] || this.keys['ArrowRight']) move.addScaledVector(right, 1)
      this.isRunning = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'])
    }

    this.isMoving = move.lengthSq() > 0.001
    const speed = this.isRunning ? RUN_SPEED : WALK_SPEED

    if (this.isMoving) {
      move.normalize().multiplyScalar(speed)
      this.pos.x += move.x * delta
      this.pos.z += move.z * delta

      const targetRotY = Math.atan2(move.x, move.z)
      const diff = ((targetRotY - this.charRotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      this.charRotY += diff * Math.min(1, delta * 10)
      this.walkCycle += delta * speed * 2.6
    } else {
      this.walkCycle += delta * 1.2
    }

    this.pos.y = this.terrain.getHeightAt(this.pos.x, this.pos.z)
    this.pos.x = Math.max(-93, Math.min(93, this.pos.x))
    this.pos.z = Math.max(-93, Math.min(93, this.pos.z))

    this.charGroup.position.set(this.pos.x, this.pos.y, this.pos.z)
    this.charGroup.rotation.y = this.charRotY

    this._animate()
    this._updateCamera()
    this.memorySpots.checkProximity(this.pos)
  }

  _animate() {
    if (this.isMoving) {
      const swing = Math.sin(this.walkCycle) * (this.isRunning ? 0.85 : 0.65)
      this.leftLeg.rotation.x  =  swing
      this.rightLeg.rotation.x = -swing
      this.leftArm.rotation.x  = -swing * 0.55
      this.rightArm.rotation.x =  swing * 0.55
      this.charGroup.rotation.x = this.isRunning ? -0.12 : 0
      this.charGroup.position.y = this.pos.y + Math.abs(Math.sin(this.walkCycle)) * 0.035
    } else {
      this.charGroup.position.y = this.pos.y + Math.sin(this.walkCycle) * 0.018
      this.charGroup.rotation.x = 0
      this.leftLeg.rotation.x  *= 0.88
      this.rightLeg.rotation.x *= 0.88
      this.leftArm.rotation.x  *= 0.88
      this.rightArm.rotation.x *= 0.88
    }
  }

  _updateCamera() {
    const camX = this.pos.x + Math.sin(this.cameraYaw) * CAM_DIST
    const camZ = this.pos.z + Math.cos(this.cameraYaw) * CAM_DIST
    const camY = this.pos.y + CAM_HEIGHT + Math.sin(this.cameraPitch) * CAM_DIST * 0.55
    this.camera.position.set(camX, camY, camZ)
    this.camera.lookAt(this.pos.x, this.pos.y + 1.1, this.pos.z)
  }
}
