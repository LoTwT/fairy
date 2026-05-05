import type {
  BucketContributor,
  MultiplierBucket,
  TypedModifier,
} from "../schema"
import { makeContributor } from "./buckets"

export interface HandlerDiagnostic {
  warningKey: string
  diagnosticRef: string
}

export interface HandlerInput {
  modifier: TypedModifier
  sourceDiagnostic?: HandlerDiagnostic
}

export interface HandlerOutput {
  bucket: MultiplierBucket
  contributors: BucketContributor[]
}

export interface ModifierHandler {
  id: string
  bucket: MultiplierBucket
  apply(input: HandlerInput): HandlerOutput
}

const handlerBuckets: Record<string, MultiplierBucket> = {
  "damage-bonus": "damageBonusZone",
  "defense-reduction": "defenseZone",
  "defense-ignore": "defenseZone",
  "resistance-reduction": "resistanceZone",
  "vulnerability-bonus": "vulnerabilityZone",
  "daze-vulnerability-bonus": "dazeVulnerabilityZone",
  "sheer-damage-bonus": "sheerDamageBonusZone",
  "daze-inflict-bonus": "dazeInflictZone",
  "daze-receive-bonus": "dazeReceiveZone",
  "anomaly-proficiency-bonus": "anomalyProficiencyZone",
  "anomaly-damage-bonus": "anomalyDamageBonusZone",
  "anomaly-crit-bonus": "anomalyCritZone",
  "damage-level-bonus": "damageLevelZone",
  "special-multiplier": "specialZone",
}

export const defaultHandlerRegistry: ReadonlyMap<string, ModifierHandler> = new Map(
  Object.entries(handlerBuckets).map(([id, bucket]) => [
    id,
    {
      id,
      bucket,
      apply: ({ modifier, sourceDiagnostic }) => {
        const value = readNumericParam(modifier)
        const contributorId = `${modifier.id}:contribution`
        return {
          bucket,
          contributors: [
            makeContributor({
              id: contributorId,
              value,
              operation: "add",
              modifierId: modifier.id,
              ...sourceFields(modifier, sourceDiagnostic),
            }),
          ],
        }
      },
    },
  ]),
)

export function resolveHandler(handlerId: string): ModifierHandler | undefined {
  return defaultHandlerRegistry.get(handlerId)
}

export function getHandlerBucket(modifier: TypedModifier): MultiplierBucket | undefined {
  return modifier.bucket ?? defaultHandlerRegistry.get(modifier.handlerId)?.bucket
}

function readNumericParam(modifier: TypedModifier): number {
  const paramValue = modifier.params.value ?? modifier.params.multiplier ?? modifier.params.amount
  return typeof paramValue === "number" ? paramValue : 0
}

function sourceFields(modifier: TypedModifier, diagnostic?: HandlerDiagnostic) {
  if (modifier.source !== undefined)
    return { source: modifier.source }

  return {
    sourceMissing: true,
    diagnosticRefs: [diagnostic?.diagnosticRef ?? diagnostic?.warningKey ?? "ERR-SRC-001"],
  }
}
