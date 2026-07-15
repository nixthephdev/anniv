import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { toon, toonGradMap } from './toon.js'
import { PHYS_HALF_H, PHYS_RADIUS } from './Physics.js'
import { getPavementBlend } from './PavedZones.js'

// Scratch objects — allocated once, reused every frame to avoid GC pressure
const _tmpQ = new THREE.Quaternion()
const _tmpE = new THREE.Euler()

const WALK_SPEED     = 5
const RUN_SPEED      = 9
const CAM_DIST       = 3.2
const CAM_HEIGHT     = 1.8
const MOUSE_SENS     = 0.0022
const TOUCH_CAM_SENS = 0.0042
const JOY_RADIUS     = 52   // px — max joystick knob travel
const WORLD_BOUND     = 300  // keep player inside the physics heightfield span (±310)

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

    // Jump physics
    this.velY       = 0
    this.isGrounded = true

    // Mobile button state
    this.runPressed  = false

    // Touch state
    this.joystick = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 }
    this.camTouch = { active: false, id: -1, lastX: 0, lastY: 0 }

    this._fbxLoaded      = false
    this._mixer          = null
    this._actions        = {}
    this._currentAction  = 'idle'
    this._vrmBones       = null
    this._modelFlipped   = false

    // Physics (set later via initPhysics() once Rapier is ready)
    this._physicsReady   = false
    this._physController = null
    this._physCollider   = null
    this._jumpCooldown   = 0

    this._buildCharacter()
    this._loadCharacter()   // async — swaps in when model.glb is present
    this._setupStartButton()
    if (isMobile) {
      this._setupTouchControls()
    } else {
      this._setupPointerLock()
      this._setupKeyboard()
    }
    this._updateCamera()
  }

  // ── GLTF character loader (hot-swaps the procedural mesh when ready) ─────

  async _loadCharacter() {
    const base = import.meta.env.BASE_URL
    let gltf
    try {
      gltf = await new GLTFLoader().loadAsync(`${base}character/her.glb`)
    } catch {
      return   // no file present — procedural character keeps running fine
    }

    const model = gltf.scene

    // Trust the GLB's own materials — VRoid/Blender export preserves outfit colors.
    model.traverse(child => {
      if (!child.isMesh) return
      child.castShadow = true
    })

    // Auto-scale using mesh-only bounding box (skeleton bones inflate the default box)
    const meshBox = new THREE.Box3()
    model.traverse(c => { if (c.isMesh) meshBox.expandByObject(c) })
    if (!meshBox.isEmpty()) {
      const height = meshBox.max.y - meshBox.min.y
      if (height > 2.2 || height < 1.0) model.scale.setScalar(1.65 / height)
      // Shift so mesh floor lands at y=0 (charGroup is placed at feet position)
      model.updateMatrixWorld(true)
      const floorBox = new THREE.Box3()
      model.traverse(c => { if (c.isMesh) floorBox.expandByObject(c) })
      if (floorBox.min.y !== 0) model.position.y -= floorBox.min.y
    }

    // Wire up animations if the GLB ships named clips (Soldier-style).
    // VRoid exports typically have no walk/run clips.
    // Mixamo retargeted clips have bone axis mismatches with VRM skeleton —
    // skip clip-based animation and drive bones procedurally via _animateVRMBones().
    const clips = gltf.animations
    console.info('[Player] GLB has', clips.length, 'clips — using procedural VRM animation')

    // Find VRM humanoid bones for procedural walk animation
    // VRoid Studio names: J_Bip_C_Hips, J_Bip_L_UpperLeg, J_Bip_R_UpperArm, etc.
    // Use exact J_Bip_* names — VRoid's J_Sec_* are spring/clothing bones, not skeleton
    // Log ALL bones so we know the exact names in her.glb
    const allBones = []
    model.traverse(obj => { if (obj.isBone || obj.type === 'Bone') allBones.push(obj.name) })
    console.info('[VRM] all bones in her.glb:', allBones)

    const vb = {}
    model.traverse(obj => {
      const n = obj.name
      // Use endsWith so armature-prefixed names like "Armature_J_Bip_C_Hips" also match
      if (n.endsWith('J_Bip_C_Hips'))     vb.hips      = obj
      if (n.endsWith('J_Bip_C_Spine'))    vb.spine     = obj
      if (n.endsWith('J_Bip_L_UpperLeg')) vb.leftThigh  = obj
      if (n.endsWith('J_Bip_R_UpperLeg')) vb.rightThigh = obj
      if (n.endsWith('J_Bip_L_LowerLeg')) vb.leftShin   = obj
      if (n.endsWith('J_Bip_R_LowerLeg')) vb.rightShin  = obj
      if (n.endsWith('J_Bip_L_UpperArm')) vb.leftArm      = obj
      if (n.endsWith('J_Bip_R_UpperArm')) vb.rightArm     = obj
      if (n.endsWith('J_Bip_L_LowerArm')) vb.leftForearm  = obj
      if (n.endsWith('J_Bip_R_LowerArm')) vb.rightForearm = obj
    })
    this._vrmBones = Object.keys(vb).length >= 2 ? vb : null
    console.info('[VRM] matched bones:', Object.keys(vb))

    // Save rest quaternions so animation can be applied as OFFSET from rest,
    // not as absolute replacement (absolute replacement was causing T-pose lock).
    this._vrmRestQ = {}
    for (const [key, bone] of Object.entries(vb)) {
      this._vrmRestQ[key] = bone.quaternion.clone()
    }

    // Always mark loaded so procedural limb-swing stops running on cleared objects
    this._fbxLoaded = true

    // Swap procedural mesh out; charGroup retains its world position/rotation
    this.charGroup.clear()
    this.charGroup.add(model)
    console.info('[Player] GLTF character loaded ✓', clips.length, 'clips')
  }

  // Smooth crossfade between named animation clips
  _setAction(name) {
    if (this._currentAction === name) return
    const from = this._actions[this._currentAction]
    const to   = this._actions[name] ?? this._actions.idle
    if (!to) return
    if (from && from !== to) from.fadeOut(0.22)
    to.reset().fadeIn(0.22).play()
    this._currentAction = name
  }

  // Called every frame when GLTF character is active
  _updateFBXAnim() {
    if (this._mixer) {
      // Clip-based animation (Soldier.glb / any GLB with Idle+Walk+Run)
      if (!this.isGrounded) { this._setAction('idle'); return }
      if (!this.isMoving)   { this._setAction('idle'); return }
      if (this.isRunning && this._actions.run) { this._setAction('run');  return }
      if (this._actions.walk)                  { this._setAction('walk'); return }
      this._setAction('idle')
    } else {
      // VRoid / no-clip model — drive bones procedurally
      this._animateVRMBones()
    }
  }

  // Apply an euler offset (x,y,z) on top of the bone's saved rest quaternion.
  // Using offset-from-rest guarantees visible movement regardless of what rotation
  // the GLTF file baked into the bone's initial quaternion.
  _off(key, x, y, z) {
    const b = this._vrmBones, r = this._vrmRestQ
    if (!b?.[key] || !r?.[key]) return
    _tmpE.set(x, y, z)
    b[key].quaternion.copy(r[key]).multiply(_tmpQ.setFromEuler(_tmpE))
  }

  _animateVRMBones() {
    const b = this._vrmBones, r = this._vrmRestQ
    if (!b || !r) return

    // Jump pose
    if (!this.isGrounded) {
      this._off('leftThigh',  -0.4, 0, 0); this._off('rightThigh', -0.4, 0, 0)
      this._off('leftShin',    0.5, 0, 0); this._off('rightShin',   0.5, 0, 0)
      this._off('leftArm',  -0.4, 0, -0.8); this._off('rightArm', -0.4, 0, 0.8)
      this._off('leftForearm', 0.35, 0, 0); this._off('rightForearm', 0.35, 0, 0)
      return
    }

    if (this.isMoving) {
      const mag   = this.isRunning ? 0.75 : 0.55
      const swing = Math.sin(this.walkCycle) * mag

      // Legs: X-axis swing forward/back
      this._off('leftThigh',   swing, 0, 0)
      this._off('rightThigh', -swing, 0, 0)
      // Knee bend: trail leg curls
      this._off('leftShin',  Math.max(0, -swing) * 0.65, 0, 0)
      this._off('rightShin', Math.max(0,  swing) * 0.65, 0, 0)
      // Arms: hang at sides (Z offset from T-pose) + counter-swing (X offset)
      this._off('leftArm',  -swing * 0.45, 0, -1.15)
      this._off('rightArm',  swing * 0.45, 0,  1.15)
      // Elbow bend — a constant relaxed bend plus extra on the backswing,
      // same "trailing limb curls" idea as the knees. Without this the arms
      // swing as rigid straight rods, which reads as stiff/robotic.
      this._off('leftForearm',  0.3 + Math.max(0,  swing) * 0.5, 0, 0)
      this._off('rightForearm', 0.3 + Math.max(0, -swing) * 0.5, 0, 0)

      if (b.hips && r.hips) {
        b.hips.quaternion.copy(r.hips).multiply(
          _tmpQ.setFromEuler(_tmpE.set(0, Math.sin(this.walkCycle) * 0.08, Math.sin(this.walkCycle * 2) * 0.06))
        )
      }
      if (b.spine && r.spine) {
        b.spine.quaternion.copy(r.spine).multiply(
          _tmpQ.setFromEuler(_tmpE.set(this.isRunning ? -0.14 : -0.05, 0, 0))
        )
      }
    } else {
      // Idle: arms hang at sides with a gentle breathing sway, elbows kept
      // slightly bent rather than snapping back to the dead-straight rest pose
      const breathe = Math.sin(this.walkCycle * 0.6) * 0.04
      this._off('leftArm',  0, 0, -1.15 + breathe)
      this._off('rightArm', 0, 0,  1.15 - breathe)
      this._off('leftForearm',  0.28, 0, 0)
      this._off('rightForearm', 0.28, 0, 0)

      const slerp = key => { if (b[key] && r[key]) b[key].quaternion.slerp(r[key], 0.12) }
      slerp('leftThigh'); slerp('rightThigh')
      slerp('leftShin');  slerp('rightShin')
      slerp('hips');      slerp('spine')
    }
  }

  // ── Rapier physics character controller ───────────────────────────────

  initPhysics(physics) {
    const { controller, collider } = physics.createCharacterController(
      this.pos.x, this.pos.y, this.pos.z
    )
    this._physController = controller
    this._physCollider   = collider
    this._physicsReady   = true
    console.info('[Player] Physics character controller active ✓')
  }

  _updateWithPhysics(delta, moveDir, speed) {
    const vx = this.isMoving ? moveDir.x * speed * delta : 0
    const vz = this.isMoving ? moveDir.z * speed * delta : 0

    // Vertical: small constant push keeps character pressed to ground;
    // when jumping or in air, gravity accumulates in velY
    if (this.isGrounded && this._jumpCooldown <= 0) {
      this.velY = -2   // ground-press — prevents floating on slopes
    } else {
      this.velY -= 22 * delta
      if (this._jumpCooldown > 0) this._jumpCooldown -= delta
    }

    this._physController.computeColliderMovement(
      this._physCollider, { x: vx, y: this.velY * delta, z: vz }
    )
    const mv = this._physController.computedMovement()

    // Only trust Rapier's "grounded" flag outside the jump window
    if (this._jumpCooldown <= 0) {
      this.isGrounded = this._physController.computedGrounded()
    }

    // Move standalone collider
    const p = this._physCollider.translation()
    this._physCollider.setTranslation({
      x: p.x + mv.x,
      y: p.y + mv.y,
      z: p.z + mv.z,
    })

    // Feet position = capsule centre − (halfH + radius)
    const np = this._physCollider.translation()
    this.pos.set(
      Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, np.x)),
      np.y - (PHYS_HALF_H + PHYS_RADIUS),
      Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, np.z))
    )
  }

  // ── Start button ───────────────────────────────────────────────────────

  _setupStartButton() {
    // Listen on game:start so main.js controls the flow (opening scene plays first)
    document.addEventListener('game:start', () => {
      document.getElementById('hud').classList.add('visible')
      this.ui.startMusic()

      if (isMobile) {
        this.locked = true
        document.getElementById('joystick-hint').style.display = 'none'
      } else {
        document.getElementById('game-canvas').requestPointerLock()
      }
    })
  }

  // ── Desktop: pointer lock + keyboard ──────────────────────────────────

  _setupPointerLock() {
    const canvas = document.getElementById('game-canvas')
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
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true
      if (e.code === 'Space' && this.isGrounded && this.locked) {
        this.isGrounded  = false
        this.velY        = 8
        this._jumpCooldown = 0.25
        e.preventDefault()
      }
    })
    window.addEventListener('keyup', e => { this.keys[e.code] = false })
  }

  // ── Mobile: virtual joystick + camera drag ────────────────────────────

  _setupTouchControls() {
    const canvas = document.getElementById('game-canvas')
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

    // ── Run / Jump buttons ────────────────────────────────────────────────
    const runBtn  = document.getElementById('run-btn')
    const jumpBtn = document.getElementById('jump-btn')
    runBtn.style.display  = 'flex'
    jumpBtn.style.display = 'flex'

    runBtn.addEventListener('touchstart', e => {
      e.preventDefault()
      this.runPressed = true
      runBtn.classList.add('held')
    }, { passive: false })
    runBtn.addEventListener('touchend', e => {
      e.preventDefault()
      this.runPressed = false
      runBtn.classList.remove('held')
    }, { passive: false })
    runBtn.addEventListener('touchcancel', () => {
      this.runPressed = false
      runBtn.classList.remove('held')
    })

    jumpBtn.addEventListener('touchstart', e => {
      e.preventDefault()
      if (this.isGrounded) {
        this.isGrounded    = false
        this.velY          = 8
        this._jumpCooldown = 0.25
      }
      jumpBtn.classList.add('held')
    }, { passive: false })
    jumpBtn.addEventListener('touchend', e => {
      e.preventDefault()
      jumpBtn.classList.remove('held')
    }, { passive: false })
    jumpBtn.addEventListener('touchcancel', () => {
      jumpBtn.classList.remove('held')
    })
  }

  // ── Character model ────────────────────────────────────────────────────

  _buildCharacter() {
    this.charGroup = new THREE.Group()

    const skin     = toon(0xffccaa)
    const top      = toon(0xf06292)
    const pants    = toon(0x42a5f5)
    const hair     = toon(0x1a0a00)
    const shoe     = toon(0xfafafa)
    const shoeSole = toon(0xbdbdbd)

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
      }
      this.isRunning = this.runPressed
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
      move.normalize()
      const targetRotY = Math.atan2(move.x, move.z)
      const diff = ((targetRotY - this.charRotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      this.charRotY += diff * Math.min(1, delta * 10)
      this.walkCycle += delta * speed * 2.6
    } else {
      this.walkCycle += delta * 1.2
    }

    if (this._physicsReady) {
      // ── Physics path: Rapier handles all collision + gravity ──────────────
      this._updateWithPhysics(delta, move, speed)
    } else {
      // ── Fallback: original terrain-height movement ────────────────────────
      if (this.isMoving) {
        this.pos.x += move.x * speed * delta
        this.pos.z += move.z * speed * delta
      }
      const groundY = this._getGroundHeight(this.pos.x, this.pos.z)
      if (this.isGrounded) {
        this.pos.y = groundY
      } else {
        this.velY  -= 22 * delta
        this.pos.y += this.velY * delta
        if (this.pos.y <= groundY) {
          this.pos.y  = groundY
          this.velY   = 0
          this.isGrounded = true
        }
      }
      this.pos.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, this.pos.x))
      this.pos.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, this.pos.z))
    }

    this.charGroup.position.set(this.pos.x, this.pos.y, this.pos.z)
    this.charGroup.rotation.y = this.charRotY

    if (this._mixer) this._mixer.update(delta)

    if (this._fbxLoaded) {
      this._updateFBXAnim()
    } else {
      this._animate()   // procedural fallback while (or if) FBX isn't loaded
    }

    this._updateCamera()
    this.memorySpots.checkProximity(this.pos)
  }

  _animate() {
    if (!this.isGrounded) {
      // Jump / fall pose: tuck legs up, raise arms
      const tuck = this.velY > 0 ? 0.7 : 0.45
      this.leftLeg.rotation.x  = -0.55 * tuck
      this.rightLeg.rotation.x = -0.55 * tuck
      this.leftArm.rotation.x  = -0.4
      this.rightArm.rotation.x = -0.4
      this.charGroup.rotation.x = this.velY > 0 ? -0.1 : 0.06
      this.charGroup.position.y = this.pos.y
      return
    }

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

  // Returns flat y=0 inside paved zones (roads, plazas, building grounds)
  // so the player walks on the pavement surface instead of the terrain mesh,
  // blending smoothly into raw terrain height outside them.
  _getGroundHeight(x, z) {
    const raw   = this.terrain.getHeightAt(x, z)
    const blend = getPavementBlend(x, z)
    return blend >= 1 ? 0 : raw * (1 - blend)
  }

  _updateCamera() {
    const camX = this.pos.x + Math.sin(this.cameraYaw) * CAM_DIST
    const camZ = this.pos.z + Math.cos(this.cameraYaw) * CAM_DIST
    const camY = this.pos.y + CAM_HEIGHT + Math.sin(this.cameraPitch) * CAM_DIST * 0.55
    this.camera.position.set(camX, camY, camZ)
    this.camera.lookAt(this.pos.x, this.pos.y + 1.1, this.pos.z)
  }
}
