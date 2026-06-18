/**
 * Pure unit conversion utility — no imports, fully testable.
 * All weight conversions go through grams (g) as the base unit.
 * All volume conversions go through millilitres (ml) as the base unit.
 * Cross-dimension conversions (volume ↔ weight) require a density value (g/ml).
 */

/** Conversion factor to grams for each weight unit. */
export const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
}

/** Conversion factor to millilitres for each volume unit. */
export const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  dl: 100,
  L: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  flOz: 29.5735,
  cup: 240,
  pint: 473.176,
  quart: 946.353,
}

/** Units that represent discrete counts with no standard numeric conversion. */
export const COUNT_UNITS = new Set([
  'pcs', 'bunch', 'can', 'bottle', 'bag', 'box', 'pack', 'slice', 'clove', 'head',
])

export type UnitDimension = 'weight' | 'volume' | 'count'

/**
 * Returns the dimension a unit belongs to, or null if the unit is unknown.
 * Unit matching is case-sensitive (use the canonical keys from UNIT_GROUPS).
 */
export function getUnitDimension(unit: string): UnitDimension | null {
  if (unit in WEIGHT_TO_G) return 'weight'
  if (unit in VOLUME_TO_ML) return 'volume'
  if (COUNT_UNITS.has(unit)) return 'count'
  return null
}

/**
 * Converts `amount` from `fromUnit` to `toUnit`.
 *
 * - Same unit → returns amount unchanged.
 * - Same dimension → converts via the base unit (g or ml).
 * - Volume ↔ Weight → requires `density` (g/ml); returns null if missing.
 * - Count ↔ anything → always returns null.
 * - Unknown unit → returns null.
 *
 * @param density - grams per ml, stored on the ingredient for cross-dimension conversions.
 */
export function convertUnit(
  amount: number,
  fromUnit: string,
  toUnit: string,
  density?: number,
): number | null {
  if (fromUnit === toUnit) return amount

  const fromDim = getUnitDimension(fromUnit)
  const toDim = getUnitDimension(toUnit)

  if (!fromDim || !toDim) return null
  if (fromDim === 'count' || toDim === 'count') return null

  // Same dimension: convert via base unit
  if (fromDim === 'weight' && toDim === 'weight') {
    const grams = amount * WEIGHT_TO_G[fromUnit]
    return grams / WEIGHT_TO_G[toUnit]
  }
  if (fromDim === 'volume' && toDim === 'volume') {
    const ml = amount * VOLUME_TO_ML[fromUnit]
    return ml / VOLUME_TO_ML[toUnit]
  }

  // Cross-dimension: volume ↔ weight — requires density
  if (!density || density <= 0) return null

  if (fromDim === 'volume' && toDim === 'weight') {
    const ml = amount * VOLUME_TO_ML[fromUnit]
    const grams = ml * density
    return grams / WEIGHT_TO_G[toUnit]
  }
  if (fromDim === 'weight' && toDim === 'volume') {
    const grams = amount * WEIGHT_TO_G[fromUnit]
    const ml = grams / density
    return ml / VOLUME_TO_ML[toUnit]
  }

  return null
}

/** Rounds a converted value to a sensible number of significant figures. */
export function roundConverted(value: number): number {
  if (value === 0) return 0
  if (value >= 100) return Math.round(value)
  if (value >= 10) return Math.round(value * 10) / 10
  return Math.round(value * 100) / 100
}

/** All known unit keys across all dimensions, for building selectors. */
export const ALL_UNIT_KEYS = [
  ...Object.keys(WEIGHT_TO_G),
  ...Object.keys(VOLUME_TO_ML),
  ...Array.from(COUNT_UNITS),
]
