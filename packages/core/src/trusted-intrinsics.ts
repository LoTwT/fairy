const REFLECT_APPLY = Reflect.apply
const ARRAY_IS_ARRAY = Array.isArray
const NUMBER_IS_FINITE = Number.isFinite
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger
const OBJECT_DEFINE_PROPERTY = Object.defineProperty
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf
const OBJECT_KEYS = Object.keys
const OBJECT_PROTOTYPE_HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty

export function trustedHasOwn(object: object, key: PropertyKey): boolean {
  return REFLECT_APPLY(OBJECT_PROTOTYPE_HAS_OWN_PROPERTY, object, [key])
}

export function trustedGetOwnPropertyDescriptor(
  object: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [
    object,
    key,
  ])
}

export function trustedSetArrayItem<T>(
  array: T[],
  index: number,
  value: T,
): void {
  // Own data properties bypass inherited numeric setters on polluted arrays.
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [
    array,
    index,
    {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    },
  ])
}

export function trustedGetPrototypeOf(object: object): object | null {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [object])
}

export function trustedObjectKeys(object: object): string[] {
  return REFLECT_APPLY(OBJECT_KEYS, Object, [object])
}

export function trustedReadDescriptor(
  descriptor: PropertyDescriptor,
  receiver: object,
): unknown {
  if (trustedHasOwn(descriptor, "value")) {
    return descriptor.value
  }

  return descriptor.get === undefined
    ? undefined
    : REFLECT_APPLY(descriptor.get, receiver, [])
}

export function trustedIsArray(value: unknown): value is unknown[] {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])
}

export function trustedIsFiniteNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
  )
}

export function trustedIsSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [value])
  )
}
