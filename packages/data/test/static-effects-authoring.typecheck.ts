import type {
  EffectAuthoringRecord,
  EffectAuthoringRuleRecord,
} from "../scripts/static-effects/authoring/types.ts"
import { PILOT_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/pilot-records.ts"

const base = PILOT_AUTHORING_RECORDS[0] as EffectAuthoringRuleRecord

export const badOperation: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error unknown operation kinds are rejected by the closed union
  operation: { kind: "json-path", path: "$.operation" },
}

export const badCondition: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error unknown condition kinds are rejected by the closed union
  when: { kind: "json-path", path: "$.when" },
}

export const badMechanism: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error unknown mechanism kinds are rejected by the closed union
  mechanism: { kind: "json-path", path: "$.mechanism" },
}

export const badOperationPath: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error arbitrary JSON path fields are not part of the authoring operation
  operation: { ...base.operation, path: "$.operation" },
}

export const badCoverageStatus: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error coverage status is a closed union
  coverage: { ...base.coverage, status: "skipped" },
}

export const missingKey: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error key is required
  key: undefined,
}
