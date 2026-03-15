import type { AgentAttributeLabel, AnomalyType } from "zzz-data"
import type {
  BuildToolScopeLabel,
  BuildToolUnsupportedAnomalyTypeResponse,
  BuildToolUnsupportedDamageTypeResponse,
} from "./resolve-build-contracts"
import type {
  BuildToolScenarioInput,
  BuildToolSkillMatrixContextInput,
} from "./resolve-build-schemas"
import { normalizeCatalogValue } from "./resolve-build-catalog"
import {
  buildUnsupportedAnomalyTypeResponse,
  buildUnsupportedDamageTypeResponse,
} from "./resolve-build-responses"

export type BuildToolResolvedScenario =
  | (Omit<
      Exclude<BuildToolScenarioInput, { damageType: "disorder" }>,
      "attribute"
    > & {
      attribute?: AgentAttributeLabel
    })
  | (Omit<
      Extract<BuildToolScenarioInput, { damageType: "disorder" }>,
      "anomalyType" | "attribute"
    > & {
      anomalyType: AnomalyType
      attribute?: AgentAttributeLabel
    })

export type BuildToolResolvedSkillMatrixContext = Omit<
  BuildToolSkillMatrixContextInput,
  "attribute"
> & {
  attribute?: AgentAttributeLabel
}

export function normalizeBuildToolAttribute(
  value: string | undefined,
): AgentAttributeLabel | undefined {
  return value as AgentAttributeLabel | undefined
}

export function resolveBuildToolScenario<T extends { attribute?: string }>(
  scenario: T,
): Omit<T, "attribute"> & { attribute?: AgentAttributeLabel } {
  return {
    ...scenario,
    attribute: normalizeBuildToolAttribute(scenario.attribute),
  }
}

export function resolveBuildToolDisorderScenario<
  T extends {
    anomalyType: string
    attribute?: string
  },
>(
  scenario: T,
):
  | {
      ok: true
      scenario: Omit<T, "anomalyType" | "attribute"> & {
        anomalyType: AnomalyType
        attribute?: AgentAttributeLabel
      }
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  const anomalyType = normalizeAnomalyType(scenario.anomalyType)
  if (!anomalyType) {
    return {
      ok: false,
      response: buildUnsupportedAnomalyTypeResponse(scenario.anomalyType),
    }
  }

  return {
    ok: true,
    scenario: {
      ...scenario,
      anomalyType,
      attribute: normalizeBuildToolAttribute(scenario.attribute),
    },
  }
}

export function resolveBuildToolResolvedScenario(
  scenario: BuildToolScenarioInput,
):
  | {
      ok: true
      scenario: BuildToolResolvedScenario
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  if (scenario.damageType === "disorder") {
    return resolveBuildToolDisorderScenario(scenario)
  }

  return {
    ok: true,
    scenario: resolveBuildToolScenario(scenario),
  }
}

export function resolveBuildToolResolvedSkillMatrixContext(
  context: BuildToolSkillMatrixContextInput,
): BuildToolResolvedSkillMatrixContext {
  return resolveBuildToolScenario(context)
}

export function resolveBuildToolOptionalScenario(
  scenario: BuildToolScenarioInput | undefined,
):
  | {
      ok: true
      scenario: BuildToolResolvedScenario | undefined
    }
  | {
      ok: false
      response: BuildToolUnsupportedAnomalyTypeResponse
    } {
  if (!scenario) {
    return {
      ok: true,
      scenario: undefined,
    }
  }

  return resolveBuildToolResolvedScenario(scenario)
}

export function resolveBuildToolDamageType<TDamageType extends string>(
  scopeLabel: BuildToolScopeLabel,
  damageType: string,
  supportedDamageTypes: readonly TDamageType[],
):
  | {
      ok: true
      damageType: TDamageType
    }
  | {
      ok: false
      response: BuildToolUnsupportedDamageTypeResponse
    } {
  if (!supportedDamageTypes.includes(damageType as TDamageType)) {
    return {
      ok: false,
      response: buildUnsupportedDamageTypeResponse(
        scopeLabel,
        supportedDamageTypes,
      ),
    }
  }

  return {
    ok: true,
    damageType: damageType as TDamageType,
  }
}

export function normalizeAnomalyType(value: string): AnomalyType | undefined {
  const normalized = normalizeCatalogValue(value)
  switch (normalized) {
    case "fire":
    case "火":
    case "火属性":
    case "burn":
    case "灼烧":
      return "fire"
    case "electric":
    case "电":
    case "电属性":
    case "shock":
    case "感电":
      return "electric"
    case "ether":
    case "以太":
    case "以太属性":
    case "corruption":
    case "侵蚀":
      return "ether"
    case "ice":
    case "冰":
    case "冰属性":
    case "freeze":
    case "冻结":
      return "ice"
    case "physical":
    case "物理":
    case "物理属性":
    case "assault":
    case "强击":
      return "physical"
    case "auricink":
    case "auric":
    case "玄墨":
      return "auricInk"
    case "frost":
    case "烈霜":
      return "frost"
    default:
      return undefined
  }
}
