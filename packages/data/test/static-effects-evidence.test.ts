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
    for (const identity of [
      "agents/aria/mindscape/0/blk-ms36joa0-0vxxo8/eff-ms36k7q1-vqttu0",
      "agents/aria/mindscape/0/blk-ms36joa0-0vxxo8/eff-ms36muwl-79wv54",
      "agents/aria/mindscape/0/blk-ms36joa0-0vxxo8/eff-ms36oy6h-izqgcq",
      "agents/yanagi/mindscape/2/blk-ms4qhaez-8sfxa3/eff-ms4qhaez-6zbkbm",
      "agents/yanagi/mindscape/2/blk-ms4qhaez-8sfxa3/eff-ms4qkjzo-r424yz",
      "agents/yanagi/mindscape/6/blk-ms4qn0z7-6fc8g6/eff-ms4qob0d-mk1bgo",
    ])
      expect(verified).toContain(`semantics:${identity}`)
    expect(verified).toContain(
      "semantics:w-engines/Blazing_Laurel/refinement/5/blk-legacy/legacy-team-dmgBonus",
    )
    // 批次 14 的两条星见雅元素修正（烈霜结算中英文证据）同样逐条核验。
    expect(verified).toContain(
      "semantics:agents/miyabi/mindscape/0/blk-legacy/legacy-self-dmgBonus",
    )
    expect(verified).toContain(
      "semantics:agents/miyabi/mindscape/0/blk-ms4msho4-fuuot6/eff-ms4mu14z-vj4c3r",
    )
    // 菲欧妮额外能力的 camp 12 成员集合由同一 integrated 索引派生并核验。
    expect(verified).toContain(
      "applicability:pheony-additional-ability:same-faction",
    )
    expect(verified).toContain(
      "semantics:agents/pheony/mindscape/0/blk-mindscapeBuffs-0-1/eff-10",
    )
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
      // 批次 10 的未支持条款覆盖登记（三件驱动盘 /desc4、音擎五档
      // /talents/1—5/desc、代理人影画/技能/核心被动描述），证据同样经生成
      // 入口逐条核对 path/Pointer/摘要。
      "nanoka:drive-discs:31200:four-piece-daze-value",
      "nanoka:drive-discs:31300:four-piece-anomaly-buildup-resistance",
      "nanoka:drive-discs:31500:four-piece-damage-taken-reduction",
      "nanoka:w-engines:12003:ex-energy-recovery",
      "nanoka:w-engines:12012:anomaly-triggered-energy-recovery",
      "nanoka:w-engines:13002:decibel-and-energy-generation",
      "nanoka:w-engines:13011:damage-taken-and-energy-generation-rate",
      "nanoka:w-engines:13016:damage-taken-and-miasma-contamination",
      "nanoka:w-engines:12008:daze-on-main-target",
      "nanoka:w-engines:12007:ex-daze",
      "nanoka:w-engines:14003:charge-consumed-daze",
      "nanoka:w-engines:13006:target-hp-daze",
      "nanoka:w-engines:14114:basic-attack-daze",
      "nanoka:agents:nicole:mindscape-1-anomaly-buildup-and-field-duration",
      "nanoka:agents:qingyi:flash-voltage-daze",
      "nanoka:agents:koleda:enhanced-basic-second-daze",
      "nanoka:agents:lighter:mindscape-4-morale-burst-energy",
      "nanoka:w-engines:14162:daze-value",
      "nanoka:agents:nangongyu:m6-vibrato-daze",
      "nanoka:agents:1621:wind-energy-acquisition",
      // 柚叶额外能力积蓄效率与本影画 1 瞬时能量（七档 /passive/level/…/desc/1
      // 与 /talent/1，逐条经同一入口核对）。
      "nanoka:agents:yuzuha:extra-ability-anomaly-buildup-efficiency",
      "nanoka:agents:yuzuha:mindscape-1-entry-energy",
      // 12014 目录实体声明（五档天赋 Pointer）与前批提供者同条款缺口登记：
      // 13127/14148 五档、莱特/琉音/南宫羽同核心段。
      "nanoka:w-engines:12014:attacker-damage-reduction",
      "nanoka:w-engines:13127:ex-and-assist-anomaly-buildup",
      "nanoka:w-engines:14148:ex-physical-daze-stacks",
      "nanoka:agents:lighter:morale-acquisition",
      "nanoka:agents:lighter:collapse-stun-duration",
      "nanoka:agents:dialyn:positive-reviews-and-complaints",
      "nanoka:agents:dialyn:malicious-complaint-stun-duration",
      "nanoka:agents:nangongyu:core-buildup-and-daze",
      "nanoka:agents:nangongyu:downbeat-acquisition",
      // 批次 12：比格气缸受击附伤与加农转子暴击附伤（五档天赋逐档 Pointer）。
      "nanoka:w-engines:13112:retaliation-defense-damage",
      "nanoka:w-engines:14001:critical-hit-bonus-damage",
      // 批次 13：本影画 2[以守为攻]格挡反击附伤（天赋 Pointer）。
      "nanoka:agents:benbigger:m2-block-counter-defense-damage",
      // 批次 14：星见雅霜灼·破（核心被动七行被动 rank 映射 + 影画 4 天赋）。
      "nanoka:agents:miyabi:frostburn-break-damage",
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
