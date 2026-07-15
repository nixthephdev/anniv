// Registry of paved (flattened, non-terrain) rectangular zones — roads,
// plazas, building grounds. Terrain (decoration placement), Player (ground
// height), and Physics (heightfield) all read this one list instead of each
// hardcoding their own copy of the same flattening rule.

const BLEND = 4 // units over which terrain height blends into pavement at a zone edge

export const PAVED_ZONES = [
  // Existing road corridor + SM City Legazpi grounds
  { x1: -Infinity, x2: Infinity, z1: -115, z2: -48 },
]

export function addPavedZone(zone) {
  PAVED_ZONES.push(zone)
}

// 0 = full terrain height, 1 = fully flattened/paved. Blends linearly over
// BLEND units outside a zone's rectangle so terrain eases into pavement.
export function getPavementBlend(x, z) {
  let blend = 0
  for (const zone of PAVED_ZONES) {
    const dx = Math.max(zone.x1 - x, 0, x - zone.x2)
    const dz = Math.max(zone.z1 - z, 0, z - zone.z2)
    const dist = Math.max(dx, dz)
    const b = dist <= 0 ? 1 : Math.max(0, 1 - dist / BLEND)
    if (b > blend) blend = b
  }
  return blend
}

export function isPaved(x, z) {
  return getPavementBlend(x, z) > 0
}
