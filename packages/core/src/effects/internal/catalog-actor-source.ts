import { rejectUnknownFields } from "./checks.ts"
import type { IssueCollector } from "./issues.ts"

/** 普通与具名目录入口共用角色事实形状；返回实际校验过的等级。 */
export function validateCatalogActorSourceFields(
  source: Record<string, unknown>,
  pointer: string,
  collector: IssueCollector,
): number | undefined {
  rejectUnknownFields(
    source,
    ["entityId", "agentEntityId", "level"],
    { pointer, collector, structureCode: "INVALID_INPUT" },
    "actor source",
  )
  const level = source["level"]
  if (level === undefined) return undefined
  if (
    typeof level !== "number" ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > 60
  ) {
    collector.report(
      "INVALID_INPUT",
      `${pointer}/level`,
      "Actor character level must be a finite integer within 1–60",
    )
    return undefined
  }
  return level
}
