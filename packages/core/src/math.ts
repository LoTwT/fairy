import type { ClampRange } from './types.js'

export function clamp(value: number, range?: ClampRange): number {
  if (!range)
    return value

  return Math.min(range.max, Math.max(range.min, value))
}

export function ceilDisplay(value: number): number {
  return Math.ceil(value)
}

export function floorInt(value: number): number {
  return Math.floor(value)
}

export function trunc(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.trunc(value * factor) / factor
}

export function trunc4(value: number): number {
  return trunc(value, 4)
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
