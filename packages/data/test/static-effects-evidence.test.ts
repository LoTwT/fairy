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

  // 发布副本复制与逐文件验证在 CI runner 上明显慢于本机（约 29 MB）；
  // 集成层默认 hook 超时 10s 不足以覆盖，显式给出有界预算。
  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "fairy-static-evidence-"))
    verifiedPublication = temporaryDirectory
    await preparePublication(
      integratedDirectory,
      join(temporaryDirectory, "verified"),
    )
  }, 120_000)

  afterAll(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  it("verifies the registered complete state option evidence through the generator entry", async () => {
    const verified = await verifyStaticEffectsEvidence(verifiedPublication)
    expect(verified).toContain(label)
    // 批次 06 的六项补充证据（含被动行 rank 与 data.json level 元数据的映射）
    // 也由同一入口逐条核验。
    for (const supplementId of [
      "nanoka:agents:caesar:stance-switch-impact",
      "nanoka:agents:lighter:morale-burst-impact",
      "nanoka:agents:jufufu:tigers-roar-impact",
      "nanoka:agents:dialyn:initial-crit-rate-impact",
      "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
      "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
      // 批次 07：洛克茜初始回能转化（被动行 rank 与 data.json level 元数据
      // 的映射）与绯月银棺三条（五档天赋逐档 Pointer）。
      "nanoka:agents:1621:initial-energy-regen-conversion",
      "nanoka:w-engines:14162:crit-rate",
      "nanoka:w-engines:14162:wind-resistance-ignore",
      "nanoka:w-engines:14162:squad-damage-bonus",
      // 批次 08：伊芙琳/零号·安比/琉音影画 6 独立追击（天赋 Pointer 与
      // 伊芙琳核心被动七行的 rank 映射）。
      "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
      "nanoka:agents:s0anby:m6-electromagnetic-vortex",
      "nanoka:agents:dialyn:m6-aftertone-echo",
      // 批次 09：南宫羽影画 6[颤音：改]两个元素分组完整状态补充（天赋
      // Pointer）；四条普通颤音记录的共存排除证据（/passive、/talent/2 与
      // /talent/6）同样经 semantics 条目由同一入口核验。
      "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
      "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
    ])
      expect(verified).toContain(`supplement:${supplementId}`)
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
