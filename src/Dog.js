import * as THREE from 'three'
import { CONFIG } from './config.js'

const WALK_SPEED = 3.5
const RUN_SPEED  = 6.5
const FOLLOW_MIN = 2.2   // stop when this close
const FOLLOW_MAX = 3.5   // start moving when farther than this

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
    const furColor  = CONFIG.dogColor || 0xc68642   // golden brown default
    const darkFur   = new THREE.Color(furColor).multiplyScalar(0.7)
    const nosColor  = 0x1a1a1a
    const eyeColor  = 0x1a1a1a
    const tongueCol = 0xff6b81

    const fur  = new THREE.MeshLambertMaterial({ color: furColor })
    const dark = new THREE.MeshLambertMaterial({ color: darkFur.getHex() })
    const nose = new THREE.MeshLambertMaterial({ color: nosColor })
    const eye  = new THREE.MeshLambertMaterial({ color: eyeColor })
    const tongue = new THREE.MeshLambertMaterial({ color: tongueCol })
    const white  = new THREE.MeshLambertMaterial({ color: 0xf5f5dc }) // belly

    // === Body ===
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.78), fur)
    body.position.set(0, 0, 0)
    body.castShadow = true
    this.group.add(body)

    // Belly patch (lighter underside)
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.6), white)
    belly.position.set(0, -0.12, 0)
    this.group.add(belly)

    // === Head (front-top of body) ===
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 0.14, 0.44)
    this.group.add(headGroup)

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.32), fur)
    headMesh.castShadow = true
    headGroup.add(headMesh)

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), fur)
    snout.position.set(0, -0.04, 0.22)
    headGroup.add(snout)

    // Nose
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), nose)
    noseMesh.position.set(0, 0.02, 0.33)
    headGroup.add(noseMesh)

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 7, 6)
    const eyeL = new THREE.Mesh(eyeGeo, eye)
    eyeL.position.set(-0.1, 0.08, 0.16)
    headGroup.add(eyeL)
    const eyeR = new THREE.Mesh(eyeGeo, eye)
    eyeR.position.set(0.1, 0.08, 0.16)
    headGroup.add(eyeR)

    // Eye shine
    const shineGeo = new THREE.SphereGeometry(0.018, 5, 4)
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const shineL = new THREE.Mesh(shineGeo, shineMat)
    shineL.position.set(-0.09, 0.1, 0.18)
    headGroup.add(shineL)
    const shineR = new THREE.Mesh(shineGeo, shineMat)
    shineR.position.set(0.11, 0.1, 0.18)
    headGroup.add(shineR)

    // Ears (floppy)
    const earGeo = new THREE.BoxGeometry(0.12, 0.2, 0.06)
    this.leftEar = new THREE.Group()
    this.leftEar.position.set(-0.17, 0.14, 0)
    const leftEarMesh = new THREE.Mesh(earGeo, dark)
    leftEarMesh.position.y = -0.1
    leftEarMesh.rotation.z = 0.25
    this.leftEar.add(leftEarMesh)
    headGroup.add(this.leftEar)

    this.rightEar = new THREE.Group()
    this.rightEar.position.set(0.17, 0.14, 0)
    const rightEarMesh = new THREE.Mesh(earGeo, dark)
    rightEarMesh.position.y = -0.1
    rightEarMesh.rotation.z = -0.25
    this.rightEar.add(rightEarMesh)
    headGroup.add(this.rightEar)

    // Tongue (panting, visible when idle)
    this.tongue = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.1), tongue)
    this.tongue.position.set(0, -0.1, 0.38)
    this.tongue.rotation.x = 0.3
    this.tongue.scale.y = 0
    headGroup.add(this.tongue)

    this.headGroup = headGroup

    // === Tail (pivot at rear top of body) ===
    this.tailGroup = new THREE.Group()
    this.tailGroup.position.set(0, 0.16, -0.38)
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.28, 6), fur)
    tailMesh.position.set(0, 0.14, 0)
    tailMesh.rotation.x = -0.3
    this.tailGroup.add(tailMesh)
    // Tail tip
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 5), white)
    tailTip.position.set(0, 0.3, -0.04)
    this.tailGroup.add(tailTip)
    this.group.add(this.tailGroup)

    // === Legs (4 legs, pivot at body attach point) ===
    const legGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.35, 6)
    const pawGeo = new THREE.BoxGeometry(0.1, 0.06, 0.14)

    const legPositions = [
      { name: 'legFL', x: -0.16, z:  0.26 },  // front left
      { name: 'legFR', x:  0.16, z:  0.26 },  // front right
      { name: 'legBL', x: -0.16, z: -0.26 },  // back left
      { name: 'legBR', x:  0.16, z: -0.26 },  // back right
    ]

    legPositions.forEach(({ name, x, z }) => {
      const legGroup = new THREE.Group()
      legGroup.position.set(x, -0.15, z)

      const legMesh = new THREE.Mesh(legGeo, fur)
      legMesh.position.y = -0.175
      legGroup.add(legMesh)

      const paw = new THREE.Mesh(pawGeo, dark)
      paw.position.set(0, -0.37, 0.02)
      legGroup.add(paw)

      this.group.add(legGroup)
      this[name] = legGroup
    })

    // Name tag floating above
    this._buildNameTag()

    // Raise the whole group so paws are on ground (body center = 0, paws at -0.37-0.15=-0.52)
    // So we offset the group: paws should be at y=0, so body center at +0.52
    this.group.position.y = 0.52
  }

  _buildNameTag() {
    const name = CONFIG.dogName || 'Doggo'
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
    tag.position.set(0, 1.1, 0)   // above the dog
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

      // Face direction of movement
      this.rotY = Math.atan2(dir.x, dir.z)
      this.isMoving = true
      this.walkCycle += delta * speed * 3.5
      this.idleTimer = 0
    } else {
      this.isMoving = false
      this.idleTimer += delta

      // Occasionally look at player
      if (dist > 0.5) {
        const faceDiff = ((Math.atan2(toPlayer.x, toPlayer.z) - this.rotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        this.rotY += faceDiff * delta * 2
      }
    }

    // Terrain snap
    this.pos.y = this.terrain.getHeightAt(this.pos.x, this.pos.z)
    this.group.position.set(this.pos.x, this.pos.y + 0.52, this.pos.z)
    this.group.rotation.y = this.rotY

    this._animate()
  }

  _animate() {
    // Tail wag — always, faster when excited (near player)
    const wagSpeed = this.isMoving ? 12 : 6
    this.tailGroup.rotation.z = Math.sin(Date.now() * 0.001 * wagSpeed) * 0.55

    // Ear flop when moving
    this.leftEar.rotation.z  = this.isMoving ? 0.5 + Math.sin(this.walkCycle) * 0.2 : 0.1
    this.rightEar.rotation.z = this.isMoving ? -0.5 - Math.sin(this.walkCycle) * 0.2 : -0.1

    // Tongue visible when idle (panting)
    this.tongue.scale.y = this.isMoving ? 0 : Math.max(0, Math.sin(this.idleTimer * 1.5) * 1.2)

    if (this.isMoving) {
      // Diagonal leg pairs (natural gait)
      const s = Math.sin(this.walkCycle)
      this.legFL.rotation.x =  s * 0.7
      this.legBR.rotation.x =  s * 0.7
      this.legFR.rotation.x = -s * 0.7
      this.legBL.rotation.x = -s * 0.7

      // Body bob
      this.group.position.y = this.pos.y + 0.52 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.025
    } else {
      // Idle head tilt
      this.headGroup.rotation.z = Math.sin(this.idleTimer * 0.8) * 0.12

      // Settle legs
      this.legFL.rotation.x *= 0.9
      this.legFR.rotation.x *= 0.9
      this.legBL.rotation.x *= 0.9
      this.legBR.rotation.x *= 0.9
    }
  }
}
