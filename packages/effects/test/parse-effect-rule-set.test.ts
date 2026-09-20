import { describe, expect, it } from "vitest"
import { parseEffectRuleSet } from "../src/index.ts"
import type { IssueCode } from "../src/index.ts"
import type { LooseRuleSet } from "./fixtures.ts"
import { asLooseRuleSet, astraBindingAt, starterRuleSet } from "./fixtures.ts"

function parseModifiedRuleSet(
  mutate: (ruleSet: LooseRuleSet) => void,
): ReturnType<typeof parseEffectRuleSet> {
  const ruleSet = asLooseRuleSet(starterRuleSet)
  mutate(ruleSet)
  return parseEffectRuleSet(ruleSet)
}

function expectIssue(
  result: ReturnType<typeof parseEffectRuleSet>,
  code: IssueCode,
): void {
  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.issues.some((issue) => issue.code === code)).toBe(true)
  }
}

describe("parseEffectRuleSet accepts the fixture rule set", () => {
  it("parses the starter rule set", () => {
    const result = parseEffectRuleSet(asLooseRuleSet(starterRuleSet))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.effects).toHaveLength(5)
      expect(result.value.states).toHaveLength(1)
    }
  })
})

describe("parseEffectRuleSet rejects invalid definitions", () => {
  it("rejects a non-object input", () => {
    expectIssue(parseEffectRuleSet("not an object"), "INVALID_DEFINITION")
    expectIssue(parseEffectRuleSet(null), "INVALID_DEFINITION")
    expectIssue(parseEffectRuleSet([]), "INVALID_DEFINITION")
  })

  it("rejects unknown fields instead of dropping them", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      ;(ruleSet.effects[0]! as { extraField?: string }).extraField = "x"
    })
    expectIssue(result, "INVALID_DEFINITION")
  })

  it("rejects a wrong schemaVersion", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      ;(ruleSet as { schemaVersion: number }).schemaVersion = 2
    })
    expectIssue(result, "INVALID_DEFINITION")
  })

  it("rejects duplicate effect identities", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      ruleSet.effects.push(ruleSet.effects[0]!)
    })
    expectIssue(result, "DUPLICATE_ID")
  })

  it("rejects a rank table that misses declared tiers", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as {
        parameters: { ratio: { values: Record<string, number> } }
      }
      delete core.parameters.ratio.values["7"]
    })
    expectIssue(result, "INVALID_DEFINITION")
  })

  it("rejects a rank kind the source cannot provide", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as {
        parameters: { ratio: { rank: string } }
      }
      core.parameters.ratio.rank = "refinement"
    })
    expectIssue(result, "INVALID_DEFINITION")
  })

  it("rejects configuration fields the source cannot provide", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as {
        config: { left: { field: string } }
      }
      core.config.left.field = "setPieces"
    })
    expectIssue(result, "INVALID_DEFINITION")
  })

  it("rejects a modification target that does not exist", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const modification = ruleSet.effects[1]! as {
        target: { effectId: string }
      }
      modification.target.effectId = "agent:9999:missing"
    })
    expectIssue(result, "MISSING_REFERENCE")
  })

  it("rejects a modification targeting an instant rule", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const modification = ruleSet.effects[1]! as {
        target: { effectId: string }
      }
      modification.target.effectId = "w-engine:14131:energy-on-entry"
    })
    expectIssue(result, "INVALID_MODIFICATION")
  })

  it("rejects a parameter change whose unit differs from the target", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const modification = ruleSet.effects[1]! as {
        modifications: { name: string; unit: string }[]
      }
      modification.modifications[0]!.unit = "multiplier"
    })
    expectIssue(result, "UNIT_MISMATCH")
  })

  it("rejects a literal with the wrong unit", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as {
        parameters: { cap: { unit: string } }
      }
      core.parameters.cap.unit = "health-points"
    })
    expectIssue(result, "UNIT_MISMATCH")
  })

  it("rejects an empty identity suffix", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as { effectId: string }
      core.effectId = "agent:"
    })
    expectIssue(result, "INVALID_DEFINITION")
  })

  it("rejects a state reference that is not registered", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const modification = ruleSet.effects[3]! as {
        target: { stateId: string }
      }
      modification.target.stateId = "state:unknown"
    })
    expectIssue(result, "MISSING_REFERENCE")
  })

  it("rejects forbidden fields on a contribution rule", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as { phase?: string }
      core.phase = "configuration"
    })
    expectIssue(result, "INVALID_DEFINITION")
  })
})

describe("parseEffectRuleSet rejects context violations", () => {
  it("rejects hit facts in an entity-scope condition", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as { when: object }
      core.when = {
        kind: "one-of",
        fact: "hit.actionId",
        values: ["action:unknown"],
      }
    })
    expectIssue(result, "INVALID_PHASE")
  })

  it("rejects an action-start read in an entity-scope operation", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as {
        operation: { value: { operands: { value: { at: string } }[] } }
      }
      core.operation.value.operands[0]!.value.at = "action-start"
    })
    expectIssue(result, "INVALID_PHASE")
  })

  it("rejects a trigger role in a configuration condition", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const core = ruleSet.effects[0]! as { config: object }
      core.config = {
        kind: "same-team",
        left: { role: "triggerActor" },
        right: { role: "holder" },
      }
    })
    expectIssue(result, "INVALID_PHASE")
  })

  it("rejects an unregistered action reference in an instant rule", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      ruleSet.effects.push({
        kind: "instant",
        effectId: "agent:1311:test:entry-actions",
        source: starterRuleSet.effects[0]!.source,
        config: { kind: "constant", value: true },
        parameters: {},
        beneficiary: { kind: "holder" },
        trigger: {
          eventKinds: ["entry"],
          when: { kind: "constant", value: true },
        },
        operation: {
          kind: "action-request",
          actions: [{ actionId: "action:unregistered", count: 1 }],
        },
      } as never)
    })
    expectIssue(result, "MISSING_REFERENCE")
  })
})

describe("parseEffectRuleSet does not depend on bindings", () => {
  it("reports an invalid definition even when no binding would enable it", () => {
    const result = parseModifiedRuleSet((ruleSet) => {
      const modification = ruleSet.effects[1]! as {
        target: { effectId: string }
      }
      modification.target.effectId = "agent:9999:missing"
    })
    expect(result.ok).toBe(false)
  })

  it("accepts the fixture rule set with no bindings in scope", () => {
    const parse = parseEffectRuleSet(starterRuleSet)
    expect(parse.ok).toBe(true)
    const binding = astraBindingAt(0)
    expect(typeof binding).toBe("object")
  })
})
