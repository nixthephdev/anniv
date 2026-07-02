import RAPIER from '@dimforge/rapier3d-compat'

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
    const N  = 65          // grid vertices per side (64 cells)
    const WS = 280         // world span (±140)
    const heights = new Float32Array(N * N)

    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const x = (col / (N - 1) - 0.5) * WS
        const z = (row / (N - 1) - 0.5) * WS
        // Mirror the blending used in Player._getGroundHeight()
        let h = terrain.getHeightAt(x, z)
        if (z <= -48) h = 0
        else if (z <= -44) h *= 1 - (-z - 44) / 4
        heights[row * N + col] = h
      }
    }

    const desc = RAPIER.ColliderDesc
      .heightfield(N - 1, N - 1, heights, { x: WS, y: 1, z: WS })
    this.world.createCollider(desc)   // static — no rigid body
  }

  // ── Static building colliders (SM City Legazpi) ─────────────────────────

  _buildBuildingColliders() {
    // Main body (60×14×22 centred at 0,7,-92)
    this._addStaticBox(0, 7, -92, 30, 14, 11)
    // Upper section
    this._addStaticBox(0, 17, -92, 28, 6, 10)
    // Side wings
    this._addStaticBox(-37, 4.5, -92, 7, 9, 10)
    this._addStaticBox( 37, 4.5, -92, 7, 9, 10)
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
