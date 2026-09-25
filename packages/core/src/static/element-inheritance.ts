import type { DamageElement, StaticPanelRules } from "@randomplay/shared"

/** 仅扩展元素条件；动作身份、伤害种类及独立异常公式保持原值。 */
export function inheritDamageElements<T>(
  value: T,
  relationships: StaticPanelRules["damageElementInheritance"],
): T {
  const expand = (values: readonly DamageElement[]) => [
    ...new Set([
      ...values,
      ...relationships
        .filter((relation) => values.includes(relation.baseElement))
        .map((relation) => relation.element),
    ]),
  ]
  const visit = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(visit)
    if (!entry || typeof entry !== "object") return entry
    const object = entry as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(object).map(([key, child]) => [
        key,
        (key === "values" &&
          object.kind === "one-of" &&
          object.fact === "hit.element") ||
        key === "beneficiaryElements"
          ? expand(child as readonly DamageElement[])
          : visit(child),
      ]),
    )
  }
  return visit(value) as T
}
