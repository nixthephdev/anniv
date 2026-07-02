import * as THREE from 'three'
import { CONFIG } from './config.js'
import { toon } from './toon.js'

const WALK_SPEED = 3.5
const RUN_SPEED  = 6.5
const FOLLOW_MIN = 2.2
const FOLLOW_MAX = 3.5

export class Dog {
  constructor(scene, terrain) {
    this.scene   = scene
    this.terrain = terrain

    this.pos       = new THREE.Vector3(2, 0, 10)
    this.rotY      = 0
    this.walkCycle = 0
    this.isMoving  = false
    this.idleTimer = 0

    this.group = new THREE.Group()
    this._buildModel()
    this.scene.add(this.group)
  }

  // ── Model ──────────────────────────────────────────────────────────────

  _buildModel() {
    // Bubbles: white/cream Shih Tzu with golden-brown patches, green collar
    const mWhite  = toon(0xf5ede0)
    const mBrown  = toon(0xc28840)
    const mDkBrn  = toon(0x8b5a22)
    const mNose   = new THREE.MeshBasicMaterial({ color: 0x111111 })
    const mEye    = new THREE.MeshBasicMaterial({ color: 0x111111 })
    const mTongue = toon(0xff6b81)
    const mCollar = toon(0x1b7c2a)
    const mShine  = new THREE.MeshBasicMaterial({ color: 0xffffff })

    // ── Body (cream white, low and compact) ─────────────────────────────
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.30, 0.72), mWhite)
    body.castShadow = true
    this.group.add(body)

    // Golden-brown saddle patch on back
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.50), mBrown)
    saddle.position.set(0, 0.17, -0.04)
    this.group.add(saddle)

    // Fluffy chest puff
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 7), mWhite)
    chest.position.set(0, 0.01, 0.33)
    chest.scale.set(1.05, 0.85, 0.7)
    chest.castShadow = true
    this.group.add(chest)

    // ── Head (round Shih Tzu sphere) ────────────────────────────────────
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 0.15, 0.42)
    this.group.add(headGroup)

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.215, 13, 11), mWhite)
    headMesh.scale.set(1, 0.96, 0.90)
    headMesh.castShadow = true
    headGroup.add(headMesh)

    // Brown patch: top of head
    const headTop = new THREE.Mesh(new THREE.SphereGeometry(0.185, 10, 8), mBrown)
    headTop.position.set(0, 0.09, -0.04)
    headTop.scale.set(0.95, 0.52, 0.8)
    headGroup.add(headTop)

    // White forehead puff
    const forehead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 7), mWhite)
    forehead.position.set(0, 0.12, 0.1)
    forehead.scale.set(1, 0.65, 0.75)
    headGroup.add(forehead)

    // Snout (flat Shih Tzu face)
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.12), mWhite)
    snout.position.set(0, -0.04, 0.19)
    headGroup.add(snout)

    // Nose (small black button, flattened)
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), mNose)
    noseMesh.position.set(0, 0.0, 0.27)
    noseMesh.scale.set(1.1, 0.7, 0.8)
    headGroup.add(noseMesh)

    // Eyes (round, slightly large — Shih Tzu characteristic)
    const eyeGeo = new THREE.SphereGeometry(0.046, 9, 8)
    const eyeL = new THREE.Mesh(eyeGeo, mEye)
    eyeL.position.set(-0.092, 0.05, 0.165)
    headGroup.add(eyeL)
    const eyeR = new THREE.Mesh(eyeGeo, mEye)
    eyeR.position.set(0.092, 0.05, 0.165)
    headGroup.add(eyeR)

    // Eye shines
    const shineGeo = new THREE.SphereGeometry(0.019, 5, 4)
    const shineL = new THREE.Mesh(shineGeo, mShine)
    shineL.position.set(-0.08, 0.065, 0.185)
    headGroup.add(shineL)
    const shineR = new THREE.Mesh(shineGeo, mShine)
    shineR.position.set(0.104, 0.065, 0.185)
    headGroup.add(shineR)

    // Beard / chin fluff
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.125, 8, 7), mWhite)
    beard.position.set(0, -0.1, 0.16)
    beard.scale.set(1, 0.65, 0.7)
    headGroup.add(beard)

    // Tongue — Bubbles always has it out a bit
    this.tongue = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.09), mTongue)
    this.tongue.position.set(0, -0.125, 0.25)
    this.tongue.rotation.x = 0.22
    this.tongue.scale.y = 0.7   // visible by default (not hidden like a normal dog)
    headGroup.add(this.tongue)

    this.headGroup = headGroup

    // ── Ears (wide floppy, golden brown, drooping down) ──────────────────
    const earGeo = new THREE.BoxGeometry(0.16, 0.28, 0.055)

    this.leftEar = new THREE.Group()
    this.leftEar.position.set(-0.185, 0.1, 0.02)
    const lEarMesh = new THREE.Mesh(earGeo, mBrown)
    lEarMesh.position.y = -0.14
    lEarMesh.rotation.z = 0.16
    this.leftEar.add(lEarMesh)
    const lEarInner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.04), mDkBrn)
    lEarInner.position.set(0.02, -0.13, 0.02)
    lEarInner.rotation.z = 0.16
    this.leftEar.add(lEarInner)
    headGroup.add(this.leftEar)

    this.rightEar = new THREE.Group()
    this.rightEar.position.set(0.185, 0.1, 0.02)
    const rEarMesh = new THREE.Mesh(earGeo, mBrown)
    rEarMesh.position.y = -0.14
    rEarMesh.rotation.z = -0.16
    this.rightEar.add(rEarMesh)
    const rEarInner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.04), mDkBrn)
    rEarInner.position.set(-0.02, -0.13, 0.02)
    rEarInner.rotation.z = -0.16
    this.rightEar.add(rEarInner)
    headGroup.add(this.rightEar)

    // ── Green collar (clearly visible in Bubbles' photo) ─────────────────
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.026, 6, 20),
      mCollar
    )
    collar.rotation.x = Math.PI / 2
    collar.position.set(0, 0.08, 0.36)   // at the throat/neck
    this.group.add(collar)

    // Small collar tag
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.015), mCollar)
    tag.position.set(0, 0.055, 0.495)
    this.group.add(tag)

    // ── Tail (Shih Tzu: curled up over back) ─────────────────────────────
    this.tailGroup = new THREE.Group()
    this.tailGroup.position.set(0, 0.12, -0.36)

    const tail1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.22, 6), mWhite)
    tail1.position.set(0, 0.11, 0)
    tail1.rotation.x = -0.35
    this.tailGroup.add(tail1)

    // Brown tip curling forward/over
    const tail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.18, 6), mBrown)
    tail2.position.set(0, 0.26, 0.07)
    tail2.rotation.x = 0.95
    this.tailGroup.add(tail2)

    // Fluffy tail poof
    const tailPoof = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 7), mWhite)
    tailPoof.position.set(0, 0.34, 0.14)
    this.tailGroup.add(tailPoof)

    this.group.add(this.tailGroup)

    // ── Legs (short, white, Shih Tzu stubby) ────────────────────────────
    const legGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.30, 6)
    const pawGeo = new THREE.BoxGeometry(0.1, 0.055, 0.14)

    const legPositions = [
      { name: 'legFL', x: -0.15, z:  0.23 },
      { name: 'legFR', x:  0.15, z:  0.23 },
      { name: 'legBL', x: -0.15, z: -0.23 },
      { name: 'legBR', x:  0.15, z: -0.23 },
    ]

    legPositions.forEach(({ name, x, z }) => {
      const legGroup = new THREE.Group()
      legGroup.position.set(x, -0.13, z)

      const legMesh = new THREE.Mesh(legGeo, mWhite)
      legMesh.position.y = -0.15
      legGroup.add(legMesh)

      const paw = new THREE.Mesh(pawGeo, mDkBrn)
      paw.position.set(0, -0.32, 0.02)
      legGroup.add(paw)

      this.group.add(legGroup)
      this[name] = legGroup
    })

    // ── Floating name tag ────────────────────────────────────────────────
    this._buildNameTag()

    // Lift group so paws sit on ground
    this.group.position.y = 0.5
  }

  _buildNameTag() {
    const name = CONFIG.dogName || 'Bubbles'
    const canvas = document.createElement('canvas')
    canvas.width = 180; canvas.height = 42
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.roundRect(2, 2, 176, 38, 10)
    ctx.fill()
    ctx.fillStyle = '#5d3a1a'
    ctx.font = 'bold 18px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🐾 ' + name, 90, 21)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const tag = new THREE.Sprite(mat)
    tag.scale.set(1.6, 0.38, 1)
    tag.position.set(0, 1.1, 0)
    this.group.add(tag)
  }

  // ── Per-frame update ───────────────────────────────────────────────────

  update(delta, playerPos) {
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.pos)
    toPlayer.y = 0
    const dist = toPlayer.length()

    if (dist > FOLLOW_MAX) {
      const speed = dist > 7 ? RUN_SPEED : WALK_SPEED
      const dir = toPlayer.normalize()
      this.pos.x += dir.x * speed * delta
      this.pos.z += dir.z * speed * delta
      this.rotY = Math.atan2(dir.x, dir.z)
      this.isMoving = true
      this.walkCycle += delta * speed * 3.5
      this.idleTimer = 0
    } else {
      this.isMoving = false
      this.idleTimer += delta
      if (dist > 0.5) {
        const faceDiff = ((Math.atan2(toPlayer.x, toPlayer.z) - this.rotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        this.rotY += faceDiff * delta * 2
      }
    }

    this.pos.y = this.terrain.getHeightAt(this.pos.x, this.pos.z)
    this.group.position.set(this.pos.x, this.pos.y + 0.5, this.pos.z)
    this.group.rotation.y = this.rotY

    this._animate()
  }

  _animate() {
    // Tail wag — always, faster when excited
    const wagSpeed = this.isMoving ? 12 : 5
    this.tailGroup.rotation.z = Math.sin(Date.now() * 0.001 * wagSpeed) * 0.55

    // Ear flop (ears are naturally droopy, slight extra flop when running)
    this.leftEar.rotation.z  = this.isMoving ? 0.38 + Math.sin(this.walkCycle) * 0.15 : 0.08
    this.rightEar.rotation.z = this.isMoving ? -0.38 - Math.sin(this.walkCycle) * 0.15 : -0.08

    // Tongue — Bubbles always has it out, fully out when panting idle
    this.tongue.scale.y = this.isMoving ? 0.55 : 0.9 + Math.sin(this.idleTimer * 1.4) * 0.1

    if (this.isMoving) {
      const s = Math.sin(this.walkCycle)
      this.legFL.rotation.x =  s * 0.7
      this.legBR.rotation.x =  s * 0.7
      this.legFR.rotation.x = -s * 0.7
      this.legBL.rotation.x = -s * 0.7
      this.group.position.y = this.pos.y + 0.5 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.022
    } else {
      // Idle: cute head tilt
      this.headGroup.rotation.z = Math.sin(this.idleTimer * 0.75) * 0.13
      this.legFL.rotation.x *= 0.9
      this.legFR.rotation.x *= 0.9
      this.legBL.rotation.x *= 0.9
      this.legBR.rotation.x *= 0.9
    }
  }
}
