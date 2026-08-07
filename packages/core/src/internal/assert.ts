export function assertArray(
  value: unknown,
  name: string,
): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`)
  }
}

export function assertBoolean(
  value: unknown,
  name: string,
): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean`)
  }
}

export function assertFunction(value: unknown, name: string): void {
  if (typeof value !== "function") {
    throw new TypeError(`${name} must be a function`)
  }
}

export function assertNonEmptyString(
  value: unknown,
  name: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`)
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

export function assertPositiveFiniteNumber(
  value: unknown,
  name: string,
): asserts value is number {
  assertFiniteNumber(value, name)

  if (value <= 0) {
    throw new RangeError(`${name} must be positive`)
  }
}

export function assertFiniteResult(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}
