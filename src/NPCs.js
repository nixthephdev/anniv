import * as THREE from 'three'
import { toon } from './toon.js'

const OUTFITS = [
  { top: 0xf06292, pants: 0x5c6bc0, hair: 0x1a0a00,  skin: 0xffccaa, bag: 0xa1887f },
  { top: 0x66bb6a, pants: 0x5d4037, hair: 0x4a2c0a,  skin: 0xf0c89a, bag: 0x78909c },
  { top: 0x4fc3f7, pants: 0x37474f, hair: 0x111111,   skin: 0xffccaa, bag: 0x8d6e63 },
  { top: 0xffb74d, pants: 0x263238, hair: 0x3e2723,   skin: 0xe8b89a, bag: 0xbcaaa4 },
  { top: 0xce93d8, pants: 0x455a64, hair: 0x1a0a00,   skin: 0xffccaa, bag: 0xf48fb1 },
  { top: 0xff8a65, pants: 0x4e342e, hair: 0x5d3a1a,   skin: 0xf5c5a3, bag: 0x80cbc4 },
  { top: 0xaed581, pants: 0x37474f, hair: 0x212121,   skin: 0xffccaa, bag: 0xffd54f },
  { top: 0x4db6ac, pants: 0x4a148c, hair: 0x3e2723,   skin: 0xe8b89a, bag: 0xef9a9a },
]

// Spawn positions scattered around the park (z > -42, away from road)
const NPC_DEFS = [
  { x:  18, z:  -8, type: 'walker',  outfit: 0, hasBag: false },
  { x: -24, z: -14, type: 'jogger',  outfit: 1, hasBag: false },
  { x:   6, z: -28, type: 'walker',  outfit: 2, hasBag: true  },
  { x: -38, z:  -6, type: 'walker',  outfit: 3, hasBag: false },
  { x:  32, z: -18, type: 'jogger',  outfit: 4, hasBag: false },
  { x: -12, z: -34, type: 'walker',  outfit: 5, hasBag: true  },
  { x:  48, z: -10, type: 'walker',  outfit: 6, hasBag: true  },
  { x: -52, z: -22, type: 'jogger',  outfit: 7, hasBag: false },
  { x:  22, z: -36, type: 'walker',  outfit: 0, hasBag: true  },
  { x: -16, z:  -4, type: 'walker',  outfit: 2, hasBag: false },
  { x:  60, z: -30, type: 'jogger',  outfit: 3, hasBag: false },
  { x: -62, z:  -8, type: 'walker',  outfit: 5, hasBag: true  },
]

export class NPCs {
  constructor(scene, terrain) {
    this.scene   = scene
    this.terrain = terrain
    this.npcs    = []
    NPC_DEFS.forEach(def => this._addNPC(def))
  }

  _addNPC(def) {
    const outfit = OUTFITS[def.outfit]
    const { group, leftLeg, rightLeg, leftArm, rightArm } = this._buildCharacter(outfit, def.hasBag, def.type)

    const y = this.terrain.getHeightAt(def.x, def.z)
    group.position.set(def.x, y, def.z)

    const initDir = Math.random() * Math.PI * 2
    group.rotation.y = initDir

    this.scene.add(group)
    this.npcs.push({
      group, leftLeg, rightLeg, leftArm, rightArm,
      pos:       new THREE.Vector3(def.x, y, def.z),
      rotY:      initDir,
      targetRotY: initDir,
      type:      def.type,
      walkCycle: Math.random() * Math.PI * 2,
      dirTimer:  1 + Math.random() * 4,
      paused:    false,
      pauseTimer: 0,
    })
  }

  _buildCharacter(outfit, hasBag, type) {
    const g    = new THREE.Group()
    const skin = toon(outfit.skin)
    const top  = toon(outfit.top)
    const bot  = toon(outfit.pants)
    const hair = toon(outfit.hair)
    const shoe = toon(type === 'jogger' ? 0xe53935 : 0x2c2c2c)

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skin)
    head.position.y = 1.42
    head.castShadow = true
    g.add(head)

    // Hair
    const hairDome = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 8), hair)
    hairDome.position.set(0, 1.50, -0.01)
    hairDome.scale.set(1, 0.72, 1.05)
    g.add(hairDome)

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.54, 8), top)
    body.position.y = 0.93
    body.castShadow = true
    g.add(body)

    // Left arm
    const leftArm = new THREE.Group()
    leftArm.position.set(-0.21, 1.12, 0)
    const lAM = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.44, 6), skin)
    lAM.position.y = -0.22
    leftArm.add(lAM)
    // Hand
    const lH = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), skin)
    lH.position.y = -0.46
    leftArm.add(lH)
    g.add(leftArm)

    // Right arm
    const rightArm = new THREE.Group()
    rightArm.position.set(0.21, 1.12, 0)
    const rAM = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.44, 6), skin)
    rAM.position.y = -0.22
    rightArm.add(rAM)
    const rH = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), skin)
    rH.position.y = -0.46
    rightArm.add(rH)
    g.add(rightArm)

    // Bag on left arm for shoppers
    if (hasBag) {
      const bagMat = toon(outfit.bag)
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.28, 0.12), bagMat)
      bag.position.set(-0.11, -0.30, 0.07)
      leftArm.add(bag)
      // Strap loop
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.025), bagMat)
      strap.position.set(-0.04, -0.16, 0.01)
      leftArm.add(strap)
    }

    // Left leg
    const leftLeg = new THREE.Group()
    leftLeg.position.set(-0.1, 0.64, 0)
    const lLM = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.07, 0.58, 7), bot)
    lLM.position.y = -0.29
    leftLeg.add(lLM)
    const lS = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoe)
    lS.position.set(0, -0.62, 0.03)
    leftLeg.add(lS)
    g.add(leftLeg)

    // Right leg
    const rightLeg = new THREE.Group()
    rightLeg.position.set(0.1, 0.64, 0)
    const rLM = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.07, 0.58, 7), bot)
    rLM.position.y = -0.29
    rightLeg.add(rLM)
    const rS = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoe)
    rS.position.set(0, -0.62, 0.03)
    rightLeg.add(rS)
    g.add(rightLeg)

    g.traverse(c => { if (c.isMesh) c.castShadow = true })
    return { group: g, leftLeg, rightLeg, leftArm, rightArm }
  }

  update(delta) {
    this.npcs.forEach(npc => {
      // Direction change timer
      npc.dirTimer -= delta
      if (npc.dirTimer <= 0) {
        if (!npc.paused && Math.random() < 0.25) {
          // Pause briefly
          npc.paused     = true
          npc.pauseTimer = 1.2 + Math.random() * 2.0
          npc.dirTimer   = npc.pauseTimer + 0.1
        } else {
          npc.paused      = false
          npc.targetRotY  = npc.rotY + (Math.random() - 0.5) * Math.PI * 1.4
          npc.dirTimer    = 3 + Math.random() * 5
        }
      }

      // Boundary — turn back toward centre if straying too far or near road
      const { x, z } = npc.pos
      if (z < -40 || z > 22 || x > 78 || x < -78) {
        npc.targetRotY = Math.atan2(-x * 0.5, -z * 0.5)
        npc.dirTimer   = 1.5
        npc.paused     = false
      }

      // Smooth rotation toward target
      const diff = ((npc.targetRotY - npc.rotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      npc.rotY += diff * Math.min(1, delta * 3.5)

      if (npc.paused) {
        // Idle head-bob only, dampen limbs
        npc.leftLeg.rotation.x  *= 0.85
        npc.rightLeg.rotation.x *= 0.85
        npc.leftArm.rotation.x  *= 0.85
        npc.rightArm.rotation.x *= 0.85
        npc.group.rotation.y = npc.rotY
        return
      }

      // Move
      const speed = npc.type === 'jogger' ? 4.2 : 2.0
      npc.pos.x += Math.sin(npc.rotY) * speed * delta
      npc.pos.z += Math.cos(npc.rotY) * speed * delta
      npc.pos.y  = this.terrain.getHeightAt(npc.pos.x, npc.pos.z)

      npc.group.position.copy(npc.pos)
      npc.group.rotation.y = npc.rotY

      // Walk / jog animation
      const swing = npc.type === 'jogger' ? 0.9 : 0.65
      npc.walkCycle += delta * speed * 2.6
      const s = Math.sin(npc.walkCycle)
      npc.leftLeg.rotation.x  =  s * swing
      npc.rightLeg.rotation.x = -s * swing
      npc.leftArm.rotation.x  = -s * (npc.type === 'jogger' ? 0.7 : 0.45)
      npc.rightArm.rotation.x =  s * (npc.type === 'jogger' ? 0.7 : 0.45)

      // Jog bounce
      if (npc.type === 'jogger') {
        npc.group.position.y = npc.pos.y + Math.abs(Math.sin(npc.walkCycle * 2)) * 0.04
      }
    })
  }
}
