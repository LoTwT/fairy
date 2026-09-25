import type {
  BindingId,
  EffectId,
  Issue,
  IssueCode,
  NonEmpty,
} from "../types.ts"

/** 按稳定指针顺序报告问题；同指针保持发现顺序。 */
export class IssueCollector {
  private readonly issues: Issue[] = []

  get isEmpty(): boolean {
    return this.issues.length === 0
  }

  add(issue: Issue): void {
    this.issues.push(issue)
  }

  report(
    code: IssueCode,
    pointer: string,
    message: string,
    identity?: {
      readonly effectId?: EffectId
      readonly bindingId?: BindingId
      readonly dependencyPath?: readonly string[]
    },
  ): void {
    this.add({
      code,
      pointer,
      message,
      ...(identity?.effectId === undefined
        ? {}
        : { effectId: identity.effectId }),
      ...(identity?.bindingId === undefined
        ? {}
        : { bindingId: identity.bindingId }),
      ...(identity?.dependencyPath === undefined
        ? {}
        : { dependencyPath: identity.dependencyPath }),
    })
  }

  /** 合并另一收集器的既有问题，用于跨阶段汇总。 */
  merge(other: readonly Issue[]): void {
    for (const issue of other) {
      this.issues.push(issue)
    }
  }

  toIssues(): NonEmpty<Issue> | null {
    if (this.issues.length === 0) {
      return null
    }
    const sorted = this.issues.toSorted((left, right) =>
      left.pointer < right.pointer ? -1 : left.pointer > right.pointer ? 1 : 0,
    )
    return sorted as unknown as NonEmpty<Issue>
  }
}

export interface Failed {
  readonly ok: false
  readonly issues: NonEmpty<Issue>
}

export function failure(collector: IssueCollector): Failed {
  const issues = collector.toIssues()
  if (issues === null) {
    throw new Error("IssueCollector.toIssues returned null for a failure")
  }
  return { ok: false, issues }
}
