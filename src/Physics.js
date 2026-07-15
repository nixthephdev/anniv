import RAPIER from '@dimforge/rapier3d-compat'
import { getPavementBlend } from './PavedZones.js'

// Half-dimensions for the player capsule
export const PHYS_HALF_H = 0.5   // half-height of cylinder segment
export const PHYS_RADIUS = 0.35  // hemisphere radius
// Feet offset: capsule centre = feet + PHYS_HALF_H + PHYS_RADIUS

export class Physics {
  constructor() {
    this.RAPIER = null
    this.world  = null
    this._dynamicPairs = []   // { body, mesh } — updated each frame by World
  }

  async init(terrain) {
    await RAPIER.init()
    this.RAPIER = RAPIER

    // Same gravity constant as the original velY -= 22 system
    this.world = new RAPIER.World({ x: 0, y: -22, z: 0 })

    this._buildTerrain(terrain)
    this._buildBuildingColliders()
  }

  // ── Terrain heightfield ─────────────────────────────────────────────────

  _buildTerrain(terrain) {
    const N  = 143         // grid vertices per side (142 cells) — keeps ~4.4 unit
                            // cells despite the larger span, same resolution as before
    const WS = 620         // world span (±310) — matches Terrain's ground extension
    const heights = new Float32Array(N * N)

    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const x = (col / (N - 1) - 0.5) * WS
        const z = (row / (N - 1) - 0.5) * WS
        // Mirror the paved-zone blending used in Player._getGroundHeight()
        const raw   = terrain.getHeightAt(x, z)
        const blend = getPavementBlend(x, z)
        heights[row * N + col] = blend >= 1 ? 0 : raw * (1 - blend)
      }
    }

    const desc = RAPIER.ColliderDesc
      .heightfield(N - 1, N - 1, heights, { x: WS, y: 1, z: WS })
    this.world.createCollider(desc)   // static — no rigid body
  }

  // ── Static building colliders ────────────────────────────────────────────

  _buildBuildingColliders() {
    // SM City Legazpi: main body (60×14×22 centred at 0,7,-92)
    this._addStaticBox(0, 7, -92, 30, 14, 11)
    // Upper section
    this._addStaticBox(0, 17, -92, 28, 6, 10)
    // Side wings
    this._addStaticBox(-37, 4.5, -92, 7, 9, 10)
    this._addStaticBox( 37, 4.5, -92, 7, 9, 10)

    // Houses (8×4×7 body, matches Houses.js) along the residential street
    for (const x of [-160, -146, -132, -118, -104, -90, -76, -62]) {
      this._addStaticBox(x, 2, 188, 4, 4, 3.5)
    }

    // City Kit Commercial buildings (CityBuildings.js) — approximate AABBs
    // from each model's known footprint × its placement scale
    this._addStaticBox(120, 20.32, 110, 8, 20.32, 8)   // BPO tower
    this._addStaticBox(88,  9.81,  150, 6, 9.81,  6)   // Mall building-l
    this._addStaticBox(104, 12.45, 150, 6, 12.45, 6)   // Mall building-m
    this._addStaticBox(40,  8.04,  180, 6, 8.04,  6)   // Museum
  }

  _addStaticBox(x, y, z, hw, hh, hd) {
    const desc = this.RAPIER.ColliderDesc.cuboid(hw, hh, hd).setTranslation(x, y, z)
    this.world.createCollider(desc)   // static — no rigid body
  }

  // ── Character capsule + controller ─────────────────────────────────────

  createCharacterController(startX, startY, startZ) {
    const R = this.RAPIER
    const controller = this.world.createCharacterController(0.01)
    controller.setApplyImpulsesToDynamicBodies(true)
    controller.setCharacterMass(3)

    // Capsule collider (standalone — no rigid body, matches Three.js example)
    const cy = startY + PHYS_HALF_H + PHYS_RADIUS
    const desc = R.ColliderDesc
      .capsule(PHYS_HALF_H, PHYS_RADIUS)
      .setTranslation(startX, cy, startZ)
    const collider = this.world.createCollider(desc)

    return { controller, collider }
  }

  // ── Dynamic physics objects (balls + crates the player can push) ────────

  addBall(x, y, z, radius = 0.4) {
    const body = this.world.createRigidBody(
      this.RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z)
    )
    this.world.createCollider(
      this.RAPIER.ColliderDesc.ball(radius)
        .setRestitution(0.55)
        .setFriction(0.4),
      body
    )
    return body
  }

  addCrate(x, y, z, hw, hh, hd) {
    const body = this.world.createRigidBody(
      this.RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(0.5)
    )
    this.world.createCollider(
      this.RAPIER.ColliderDesc.cuboid(hw, hh, hd)
        .setRestitution(0.1)
        .setFriction(0.9),
      body
    )
    return body
  }

  step() {
    this.world.step()
  }
}
