import type {
  AuthoringSupplementalRecord,
  EffectAuthoringRecord,
  EffectAuthoringRuleRecord,
} from "../scripts/static-effects/authoring/types.ts"
import { PILOT_AUTHORING_RECORDS } from "../scripts/static-effects/authoring/pilot-records.ts"

const base = PILOT_AUTHORING_RECORDS[0] as EffectAuthoringRuleRecord
const nekomata = PILOT_AUTHORING_RECORDS.find(
  (record) => record.key === "nekomata-claw-mark",
) as EffectAuthoringRuleRecord

// @ts-expect-error entity scope cannot use hit-adjustment
export const badScope: EffectAuthoringRecord = { ...nekomata, scope: "entity" }

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

const supplemental: AuthoringSupplementalRecord = {
  supplementId: "authoring:supplement",
  source: "authoring source",
  kind: "option",
  optionId: base.ids.optionId,
  effectIds: [base.ids.effectId],
  supportedRanks: "核心 1—7",
  computationTarget: "authoring target",
  status: "integrated",
}

export const badSupplementalKind: EffectAuthoringRecord = {
  ...base,
  supplementalRecords: [
    {
      ...supplemental,
      // @ts-expect-error supplemental kind is a closed union
      kind: "boundary",
    },
  ],
}

export const badSupplementalStatus: EffectAuthoringRecord = {
  ...base,
  supplementalRecords: [
    {
      ...supplemental,
      // @ts-expect-error supplemental status uses the formal closed union
      status: "converted",
    },
  ],
}

// @ts-expect-error computationTarget is required
const incompleteSupplemental: AuthoringSupplementalRecord = {
  supplementId: "authoring:incomplete",
  source: "authoring source",
  kind: "option",
  supportedRanks: "核心 1—7",
  status: "integrated",
}
void incompleteSupplemental

export const missingKey: EffectAuthoringRecord = {
  ...base,
  // @ts-expect-error key is required
  key: undefined,
}
