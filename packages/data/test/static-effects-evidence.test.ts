import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  verifyCompleteStateOptionEvidence,
  verifyStaticEffectsEvidence,
} from "../scripts/generate-static-effects.ts"
import { preparePublication } from "../scripts/prepare-publication.ts"
import { COMPLETE_STATE_OPTIONS } from "../scripts/static-effects/semantics.ts"

const integratedDirectory = fileURLToPath(
  new URL("../integrated", import.meta.url),
)
const registration = COMPLETE_STATE_OPTIONS.find(
  (entry) =>
    entry.optionId ===
    "agents:remiel:mindscape:1:phase-transition-flow:other-character-anomaly-damage",
)!
const label = `complete-state-option:${registration.optionId}`

/**
 * 完整状态选项登记（修订 14 的蕾米埃尔影画 1）必须走生成路径的同一证据入口：
 * 摘要、Pointer 与登记标识都要真正被核对，登记陈旧或写错不能被忽略。
 * 断言只读取 preparePublication 稳定下来的已验证副本，不在未持锁时读取
 * 受管理目录，也不受维护窗口内 rename/内容变化影响。
 */
describe("static effects evidence path", () => {
  let verifiedPublication: string
  let temporaryDirectory: string

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "fairy-static-evidence-"))
    verifiedPublication = temporaryDirectory
    await preparePublication(
      integratedDirectory,
      join(temporaryDirectory, "verified"),
    )
  })

  afterAll(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  it("verifies the registered complete state option evidence through the generator entry", async () => {
    const verified = await verifyStaticEffectsEvidence(verifiedPublication)
    expect(verified).toContain(label)
  })

  it("rejects a stale digest or a missing pointer for the complete state option", async () => {
    // 有效登记（默认即生产登记）通过；变更后的登记副本只改一处，用于
    // 单独核对摘要与 Pointer 的拒绝行为。
    await expect(
      verifyCompleteStateOptionEvidence(verifiedPublication),
    ).resolves.toContain(label)
    await expect(
      verifyCompleteStateOptionEvidence(verifiedPublication, [
        {
          ...registration,
          evidence: [{ ...registration.evidence[0]!, sha256: "0".repeat(64) }],
        },
      ]),
    ).rejects.toThrow(new RegExp(`Evidence file changed: ${label}`))
    await expect(
      verifyCompleteStateOptionEvidence(verifiedPublication, [
        {
          ...registration,
          evidence: [
            { ...registration.evidence[0]!, pointer: "/talent/1/missing" },
          ],
        },
      ]),
    ).rejects.toThrow(new RegExp(`Evidence pointer missing: ${label}`))
  })
})
