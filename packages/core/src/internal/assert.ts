export function assertArray(
  value: unknown,
  name: string,
): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`)
  }
}

export function assertNonArrayObject(
  value: unknown,
  name: string,
): asserts value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a non-array object`)
  }
}

export function assertFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  if (typeof value !== "number") {
    throw new TypeError(`${name} must be a number`)
  }

  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

export function assertNonNegativeFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  assertFiniteNumber(value, name)

  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`)
  }
}

export function assertFiniteResult(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}
