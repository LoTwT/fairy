import type { EntityId, HitContext } from "../types.ts"

export const ROXY_M6_WIND_RESISTANCE_IGNORE =
  "agent:1621:nanoka:m6-wind-resistance-ignore"

/** 仅判定具名 M6 的来源身份；快照读数和其他乘区仍由普通求值处理。 */
export function resolveRoxyM6ProviderApplicability(
  holderId: EntityId,
  hit: HitContext | null,
): "applicable" | "inapplicable" | "mixed" {
  if (hit === null || hit.actorId !== holderId || hit.element !== "wind")
    return "inapplicable"
  switch (hit.damageKind) {
    case "regular":
      break
    case "anomaly":
    case "disorder":
    case "vortex":
    case "anomaly-settlement":
      if (
        (hit.attributeSources?.anomalyProficiency?.entityId ?? hit.actorId) !==
        holderId
      )
        return "inapplicable"
      break
    default:
      return "inapplicable"
  }
  let hasHolderSource = false
  let hasOtherSource = false
  for (const item of hit.damageItems) {
    const providerId =
      (item.statSource ?? hit.attributeSources?.[item.stat])?.entityId ??
      hit.actorId
    if (providerId === holderId) hasHolderSource = true
    else hasOtherSource = true
  }
  if (hasHolderSource && hasOtherSource) return "mixed"
  return hasHolderSource ? "applicable" : "inapplicable"
}
