import type { StaticTargetWindsweptState, EntityId } from "../types.ts"
import { expectObject, rejectUnknownFields } from "./checks.ts"
import type { IssueCollector } from "./issues.ts"
import { DAMAGE_KINDS, isEntityId } from "./vocabulary.ts"
import type { WorldIndex } from "./world.ts"

const contaminationElements = ["physical", "fire", "ice", "electric", "ether"]

/** 只验证当前事实，不从已激活的角色增益、动作分类或队伍颜色推断风化。 */
export function validateTargetWindswept(
  value: unknown,
  targetId: unknown,
  world: WorldIndex,
  collector: IssueCollector,
  pointer = "/targetWindswept",
): StaticTargetWindsweptState | undefined {
  if (value === undefined) return undefined
  const checks = (path: string) => ({
    collector,
    pointer: path,
    structureCode: "INVALID_INPUT" as const,
  })
  const object = expectObject(
    value,
    checks(pointer),
    "current target windswept state",
  )
  if (!object) return undefined
  const active = object.status === "active"
  rejectUnknownFields(
    object,
    [
      "targetId",
      "status",
      ...(active
        ? ["applierActorId", "contaminationElement", "baseCoefficient"]
        : []),
    ],
    checks(pointer),
    "current target windswept state",
  )
  if (!active && object.status !== "absent")
    collector.report(
      object.status === undefined ? "MISSING_FACT" : "INVALID_INPUT",
      `${pointer}/status`,
      "Declare windswept absent or active",
    )
  if (!isEntityId(object.targetId))
    collector.report(
      object.targetId === undefined ? "MISSING_FACT" : "INVALID_INPUT",
      `${pointer}/targetId`,
      "A target identity is required",
    )
  else if (object.targetId !== targetId)
    collector.report(
      "CONTEXT_MISMATCH",
      `${pointer}/targetId`,
      "Windswept must describe this hit's current target",
    )
  const target = world.actors.get(object.targetId as EntityId)
  if (!target)
    collector.report(
      "MISSING_FACT",
      `${pointer}/targetId`,
      "The current target must be an observed actor",
    )
  if (active) {
    if (!isEntityId(object.applierActorId))
      collector.report(
        object.applierActorId === undefined ? "MISSING_FACT" : "INVALID_INPUT",
        `${pointer}/applierActorId`,
        "An explicit windswept applier identity is required",
      )
    else {
      const applier = world.actors.get(object.applierActorId)
      if (!applier)
        collector.report(
          "MISSING_FACT",
          `${pointer}/applierActorId`,
          "The windswept applier must be a currently observed actor",
        )
      else if (target && target.teamId === applier.teamId)
        collector.report(
          "CONTEXT_MISMATCH",
          `${pointer}/applierActorId`,
          "Windswept requires an opposing target",
        )
    }
    if (
      object.contaminationElement !== null &&
      !contaminationElements.includes(object.contaminationElement as string)
    )
      collector.report(
        object.contaminationElement === undefined
          ? "MISSING_FACT"
          : "INVALID_INPUT",
        `${pointer}/contaminationElement`,
        "Declare the current contamination element, or null for known uncontaminated windswept",
      )
    if (object.baseCoefficient === undefined)
      collector.report(
        "MISSING_FACT",
        `${pointer}/baseCoefficient`,
        "Declare the base coefficient excluding this request's increases; there is no default",
      )
    else {
      const coefficient = expectObject(
        object.baseCoefficient,
        checks(`${pointer}/baseCoefficient`),
        "base windswept coefficient",
      )
      if (coefficient) {
        rejectUnknownFields(
          coefficient,
          ["unit", "value"],
          checks(`${pointer}/baseCoefficient`),
          "base windswept coefficient",
        )
        if (coefficient.unit !== "ratio")
          collector.report(
            coefficient.unit === undefined ? "MISSING_FACT" : "UNIT_MISMATCH",
            `${pointer}/baseCoefficient/unit`,
            "Base windswept coefficient requires ratio units",
          )
        if (
          typeof coefficient.value !== "number" ||
          !Number.isFinite(coefficient.value) ||
          coefficient.value < 0
        )
          collector.report(
            coefficient.value === undefined ? "MISSING_FACT" : "INVALID_INPUT",
            `${pointer}/baseCoefficient/value`,
            "Base windswept coefficient must be finite and non-negative",
          )
      }
    }
  }
  return object as unknown as StaticTargetWindsweptState
}

/** 此判断属于每个命中；不得把返回值或 directAttack 继承给新独立子命中。 */
export function validateWindsweptDirectAttack(
  directAttack: unknown,
  damageKind: unknown,
  element: unknown,
  state: StaticTargetWindsweptState | undefined,
  collector: IssueCollector,
  pointer = "/hit/directAttack",
  elementPointer = "/hit/element",
): boolean {
  if (directAttack !== undefined && typeof directAttack !== "boolean")
    collector.report(
      "INVALID_INPUT",
      pointer,
      "Direct attack classification must be a boolean",
    )
  const directFormula =
    damageKind === "regular" ||
    damageKind === "sheer" ||
    damageKind === "sharpen"
  if (
    !directFormula &&
    DAMAGE_KINDS.includes(damageKind as never) &&
    directAttack === true
  )
    collector.report(
      "CONTEXT_MISMATCH",
      pointer,
      "This settlement is not a direct attack",
    )
  if (state?.status !== "active" || !directFormula) return false
  if (directAttack === undefined)
    collector.report(
      "MISSING_FACT",
      pointer,
      "Active windswept requires this hit's own direct attack classification",
    )
  if (directAttack !== true) return false
  if (
    element !== "wind" &&
    !contaminationElements.includes(element as string)
  ) {
    collector.report(
      "INVALID_INPUT",
      elementPointer,
      "Direct windswept settlement currently supports wind and the five ordinary contamination elements; special elements require an independently verified mapping",
    )
    return false
  }
  return element === "wind" || element === state.contaminationElement
}
