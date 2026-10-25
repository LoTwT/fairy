import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4h 一次性转录：revision 52 中洛克茜初始能量自动回复转化。
 * 该选项的一个变体由攻击力与冲击力两条规则共同表达。
 */
export const P2_4H_NANOKA_AGENTS_1621_INITIAL_ENERGY_REGEN_CONVERSION_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:1621:initial-energy-regen-conversion",
    source:
      "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/0",
    kind: "entity",
    optionId: "nanoka:agents:1621:initial-energy-regen-conversion",
    effectIds: [
      "agent:1621:nanoka:initial-energy-regen-conversion:attack",
      "agent:1621:nanoka:initial-energy-regen-conversion:impact",
    ],
    supportedRanks: "核心 1—7",
    computationTarget: "catalog entity + complete-state option (two rules)",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord
