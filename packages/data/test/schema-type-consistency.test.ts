import { describe, expect, it } from "vitest"
import type {
  BossAdjustEntry,
  BossData,
  BossDetailsModesVariant,
  BossMode,
  BossZoneBuff,
  BossZoneEncounter,
  BossZoneRoom,
  BossZoneStage,
} from "../src/integration/boss-types.ts"
import {
  bossAdjustMembers,
  bossBuffMembers,
  bossEncounterMembers,
  bossLocalizedDetailFields,
  bossModeMembers,
  bossRoomMembers,
  bossSharedBlockFields,
  bossSharedDetailFields,
  bossZoneMembers,
} from "../src/integration/boss-schema.ts"
import type {
  ShiyuData,
  ShiyuDetails,
  ShiyuZoneBuff,
  ShiyuZoneEncounter,
  ShiyuZoneEncounterData,
  ShiyuZoneRoom,
  ShiyuZoneRoomData,
  ShiyuZoneStage,
  ShiyuZoneStageData,
} from "../src/integration/shiyu-types.ts"
import {
  shiyuBuffMembers,
  shiyuConditionalSharedDetailFields,
  shiyuEncounterMembers,
  shiyuLocalizedDetailFields,
  shiyuRoomMembers,
  shiyuSharedDetailFields,
  shiyuZoneEncounterSkeletonOutputs,
  shiyuZoneMembers,
  shiyuZoneRoomSkeletonOutputs,
  shiyuZoneStageSkeletonOutputs,
} from "../src/integration/shiyu-schema.ts"
import type { AgentData, AgentDetails } from "../src/integration/agent-types.ts"
import type {
  SimulAdjustEntry,
  SimulBattle,
  SimulBuff,
  SimulData,
  SimulDetails,
  SimulEncounter,
  SimulLayer,
  SimulNode,
  SimulRecordEntry,
  SimulRoom,
  SimulStoryChoice,
  SimulStoryPage,
} from "../src/integration/simul-types.ts"
import {
  simulAdjustMembers,
  simulBattleMembers,
  simulBuffMembers,
  simulChoiceMembers,
  simulEncounterMembers,
  simulLayerMembers,
  simulLocalizedDetailFields,
  simulNodeMembers,
  simulRecordMembers,
  simulRoomMembers,
  simulSharedBlockFields,
  simulSharedDetailFields,
  simulStoryPageMembers,
} from "../src/integration/simul-schema.ts"
import type {
  DriveDiscData,
  DriveDiscDetails,
} from "../src/integration/drive-disc-types.ts"
import { driveDiscDetailFields } from "../src/integration/drive-disc-schema.ts"
import type {
  BangbooData,
  BangbooDetails,
  BangbooLevelExtraLocalization,
  BangbooLevelStage,
  BangbooLevelStageLocalization,
  BangbooSkillLevelEntry,
  BangbooSkillPropParameter,
  BangbooStats,
} from "../src/integration/bangboo-types.ts"
import {
  bangbooLevelExtraMembers,
  bangbooLevelExtraSharedMembers,
  bangbooLevelStageMembers,
  bangbooLocalizedDetailFields,
  bangbooSharedBlockFields,
  bangbooSharedDetailFields,
  bangbooSkillLevelMembers,
  bangbooSkillPropParameterMembers,
  bangbooStatsMembers,
} from "../src/integration/bangboo-schema.ts"
import type {
  WEngineData,
  WEngineDetails,
  WEngineLevelStage,
  WEngineStarsStage,
  WEngineTalent,
} from "../src/integration/w-engine-types.ts"
import {
  wEngineLevelMembers,
  wEngineLocalizedDetailFields,
  wEngineSharedDetailFields,
  wEngineStarsMembers,
  wEngineTalentMembers,
} from "../src/integration/w-engine-schema.ts"
import type {
  MonsterData,
  MonsterDetails,
  MonsterGrowthCurve,
  MonsterInfoUnit,
} from "../src/integration/monster-types.ts"
import {
  monsterCurveMembers,
  monsterLocalizedDetailFields,
  monsterSharedBlockFields,
  monsterSharedDetailFields,
  monsterUnitMembers,
} from "../src/integration/monster-schema.ts"
import { agentSchema, registeredName } from "../src/integration/agent-schema.ts"
import type { Schema } from "../src/integration/agent-schema.ts"

/**
 * 登记表 ↔ 封闭类型一致性测试（PR-C 以测试替代声明式 schema 生成器的方案）。
 *
 * 每个结构用一份期望 key 列表同时约束两侧：
 * - 编译期：`satisfies readonly TypeKey[]` 保证列表 ⊆ 类型成员；
 *   `Equal<keyof Type, 列表[number]>` 保证类型成员 ⊆ 列表（双向封闭，不靠运行时）。
 * - 运行期：登记表的输出名集合与同一列表做集合相等，登记与类型不得单侧漂移。
 */

/** 编译期断言辅助：两个类型完全相等才通过。 */
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? 1
    : 2
type Expect<T extends 1> = T

function outputSet(
  members: Readonly<Record<string, { output: string }>>,
): Set<string> {
  return new Set(Object.values(members).map((member) => member.output))
}

describe("Boss 登记表与封闭类型一致", () => {
  const bossDataKeys = [
    "id",
    "priority",
    "zoneType",
    "beginTime",
    "endTime",
    "bossAdjust",
  ] as const satisfies readonly (keyof BossData)[]
  type _BossDataComplete = Expect<
    Equal<keyof BossData, (typeof bossDataKeys)[number]>
  >

  const bossModeKeys = [
    "id",
    "zoneType",
    "zone",
  ] as const satisfies readonly (keyof BossMode)[]
  type _BossModeComplete = Expect<
    Equal<keyof BossMode, (typeof bossModeKeys)[number]>
  >

  const bossZoneStageKeys = [
    "name",
    "stageNum",
    "monsterLevel",
    "layerBuff",
    "layerRoom",
    "goalType",
    "sRankGoal",
    "aRankGoal",
    "bRankGoal",
    "selectableBuff",
  ] as const satisfies readonly (keyof BossZoneStage)[]
  type _BossZoneStageComplete = Expect<
    Equal<keyof BossZoneStage, (typeof bossZoneStageKeys)[number]>
  >

  const bossZoneBuffKeys = [
    "title",
    "desc",
  ] as const satisfies readonly (keyof BossZoneBuff)[]
  type _BossZoneBuffComplete = Expect<
    Equal<keyof BossZoneBuff, (typeof bossZoneBuffKeys)[number]>
  >

  const bossZoneRoomKeys = [
    "monsterIcon",
    "monsterList",
    "monsterWeakness",
    "monsterResistance",
    "wavesNum",
  ] as const satisfies readonly (keyof BossZoneRoom)[]
  type _BossZoneRoomComplete = Expect<
    Equal<keyof BossZoneRoom, (typeof bossZoneRoomKeys)[number]>
  >

  const bossZoneEncounterKeys = [
    "id",
    "name",
    "image",
    "element",
    "stats",
  ] as const satisfies readonly (keyof BossZoneEncounter)[]
  type _BossZoneEncounterComplete = Expect<
    Equal<keyof BossZoneEncounter, (typeof bossZoneEncounterKeys)[number]>
  >

  const bossAdjustEntryKeys = [
    "hp",
    "atk",
    "points",
  ] as const satisfies readonly (keyof BossAdjustEntry)[]
  type _BossAdjustEntryComplete = Expect<
    Equal<keyof BossAdjustEntry, (typeof bossAdjustEntryKeys)[number]>
  >

  const bossDetailsModesKeys = [
    "id",
    "locale",
    "name",
    "modes",
  ] as const satisfies readonly (keyof BossDetailsModesVariant)[]
  type _BossDetailsModesComplete = Expect<
    Equal<keyof BossDetailsModesVariant, (typeof bossDetailsModesKeys)[number]>
  >

  it("各登记表输出名与类型成员集合相等", () => {
    expect(outputSet(bossZoneMembers)).toEqual(new Set(bossZoneStageKeys))
    expect(outputSet(bossBuffMembers)).toEqual(new Set(bossZoneBuffKeys))
    expect(outputSet(bossRoomMembers)).toEqual(new Set(bossZoneRoomKeys))
    expect(outputSet(bossEncounterMembers)).toEqual(
      new Set(bossZoneEncounterKeys),
    )
    expect(outputSet(bossAdjustMembers)).toEqual(new Set(bossAdjustEntryKeys))
    expect(outputSet(bossModeMembers)).toEqual(new Set(bossModeKeys))
    expect(new Set(Object.values(bossSharedBlockFields))).toEqual(
      new Set(["bossAdjust"]),
    )
    expect(outputSet(bossSharedDetailFields)).toEqual(
      new Set(
        bossDataKeys.filter((key) => key !== "id" && key !== "bossAdjust"),
      ),
    )
    expect(outputSet(bossLocalizedDetailFields)).toEqual(
      new Set(
        bossDetailsModesKeys.filter(
          (key) => key !== "locale" && key !== "modes",
        ),
      ),
    )
  })
})

describe("Shiyu 登记表与封闭类型一致", () => {
  const shiyuDataKeys = [
    "id",
    "priority",
    "beginTime",
    "endTime",
    "zone",
  ] as const satisfies readonly (keyof ShiyuData)[]
  type _ShiyuDataComplete = Expect<
    Equal<keyof ShiyuData, (typeof shiyuDataKeys)[number]>
  >

  const shiyuDetailsKeys = [
    "id",
    "locale",
    "name",
    "zone",
  ] as const satisfies readonly (keyof ShiyuDetails)[]
  type _ShiyuDetailsComplete = Expect<
    Equal<keyof ShiyuDetails, (typeof shiyuDetailsKeys)[number]>
  >

  const shiyuZoneStageDataKeys = [
    "stageNum",
    "monsterLevel",
    "child",
    "goalType",
    "ssRankGoal",
    "sRankGoal",
    "aRankGoal",
    "bRankGoal",
    "layerRoom",
  ] as const satisfies readonly (keyof ShiyuZoneStageData)[]
  type _ShiyuZoneStageDataComplete = Expect<
    Equal<keyof ShiyuZoneStageData, (typeof shiyuZoneStageDataKeys)[number]>
  >

  const shiyuZoneRoomDataKeys = [
    "wavesNum",
    "monsterList",
  ] as const satisfies readonly (keyof ShiyuZoneRoomData)[]
  type _ShiyuZoneRoomDataComplete = Expect<
    Equal<keyof ShiyuZoneRoomData, (typeof shiyuZoneRoomDataKeys)[number]>
  >

  const shiyuZoneEncounterDataKeys = [
    "id",
    "element",
    "stats",
  ] as const satisfies readonly (keyof ShiyuZoneEncounterData)[]
  type _ShiyuZoneEncounterDataComplete = Expect<
    Equal<
      keyof ShiyuZoneEncounterData,
      (typeof shiyuZoneEncounterDataKeys)[number]
    >
  >

  const shiyuZoneStageKeys = [
    "name",
    "layerBuff",
    "layerRoom",
  ] as const satisfies readonly (keyof ShiyuZoneStage)[]
  type _ShiyuZoneStageComplete = Expect<
    Equal<keyof ShiyuZoneStage, (typeof shiyuZoneStageKeys)[number]>
  >

  const shiyuZoneRoomKeys = [
    "monsterIcon",
    "monsterList",
    "monsterWeakness",
    "monsterResistance",
  ] as const satisfies readonly (keyof ShiyuZoneRoom)[]
  type _ShiyuZoneRoomComplete = Expect<
    Equal<keyof ShiyuZoneRoom, (typeof shiyuZoneRoomKeys)[number]>
  >

  const shiyuZoneEncounterKeys = [
    "name",
    "image",
  ] as const satisfies readonly (keyof ShiyuZoneEncounter)[]
  type _ShiyuZoneEncounterComplete = Expect<
    Equal<keyof ShiyuZoneEncounter, (typeof shiyuZoneEncounterKeys)[number]>
  >

  const shiyuZoneBuffKeys = [
    "title",
    "desc",
  ] as const satisfies readonly (keyof ShiyuZoneBuff)[]
  type _ShiyuZoneBuffComplete = Expect<
    Equal<keyof ShiyuZoneBuff, (typeof shiyuZoneBuffKeys)[number]>
  >

  it("各登记表输出名与类型成员集合相等；骨架与文本划分覆盖全部登记成员", () => {
    expect(outputSet(shiyuZoneMembers)).toEqual(
      new Set([...shiyuZoneStageDataKeys, ...shiyuZoneStageKeys]),
    )
    expect(outputSet(shiyuRoomMembers)).toEqual(
      new Set([...shiyuZoneRoomDataKeys, ...shiyuZoneRoomKeys]),
    )
    expect(outputSet(shiyuEncounterMembers)).toEqual(
      new Set([...shiyuZoneEncounterDataKeys, ...shiyuZoneEncounterKeys]),
    )
    expect(new Set(shiyuZoneStageSkeletonOutputs)).toEqual(
      new Set(shiyuZoneStageDataKeys.filter((key) => key !== "layerRoom")),
    )
    expect(new Set(shiyuZoneRoomSkeletonOutputs)).toEqual(
      new Set(shiyuZoneRoomDataKeys.filter((key) => key !== "monsterList")),
    )
    expect(new Set(shiyuZoneEncounterSkeletonOutputs)).toEqual(
      new Set(shiyuZoneEncounterDataKeys),
    )
    expect(outputSet(shiyuBuffMembers)).toEqual(new Set(shiyuZoneBuffKeys))
    expect(outputSet(shiyuSharedDetailFields)).toEqual(new Set(["priority"]))
    expect(outputSet(shiyuConditionalSharedDetailFields)).toEqual(
      new Set(["beginTime", "endTime"]),
    )
    expect(outputSet(shiyuLocalizedDetailFields)).toEqual(
      new Set(
        shiyuDetailsKeys.filter((key) => key !== "locale" && key !== "zone"),
      ),
    )
  })
})

describe("Agent 声明式登记表与封闭类型一致", () => {
  const agentDataKeys = [
    "id",
    "icon",
    "live2D",
    "codeName",
    "rarity",
    "gender",
    "stats",
    "level",
    "levelExp",
    "skillPriority",
    "potential",
    "classificationIds",
    "partnerInfo",
    "skin",
    "extraLevel",
    "skill",
    "skillList",
    "passive",
    "talent",
    "fairyRecommend",
  ] as const satisfies readonly (keyof AgentData)[]
  type _AgentDataComplete = Expect<
    Equal<keyof AgentData, (typeof agentDataKeys)[number]>
  >

  const agentDetailsKeys = [
    "id",
    "locale",
    "name",
    "weaponType",
    "elementType",
    "specialElementType",
    "hitType",
    "camp",
    "partnerInfo",
    "skin",
    "extraLevel",
    "skill",
    "skillList",
    "passive",
    "talent",
    "fairyRecommend",
    "strategy",
    "potentialDetail",
    "navigation",
  ] as const satisfies readonly (keyof AgentDetails)[]
  type _AgentDetailsComplete = Expect<
    Equal<keyof AgentDetails, (typeof agentDetailsKeys)[number]>
  >

  /**
   * 走 agentSchema 收集顶层登记输出名，按共享形态分三组：
   * 整块共享字段只进 data；嵌套共享容器在 data（共享载荷）与 details（文本视图）两侧同名；
   * 纯语言字段只进 details。
   */
  function topLevelOutputs(): {
    wholeShared: Set<string>
    nestedShared: Set<string>
    local: Set<string>
  } {
    const wholeShared = new Set<string>()
    const nestedShared = new Set<string>()
    const local = new Set<string>()
    for (const [sourceKey, field] of Object.entries(
      (agentSchema as Extract<Schema, { kind: "object" }>).fields,
    )) {
      const output = registeredName(sourceKey)
      if (field.shared) wholeShared.add(output)
      else if (hasNestedShared(field)) nestedShared.add(output)
      else local.add(output)
    }
    return { wholeShared, nestedShared, local }
  }

  function hasNestedShared(schema: Schema): boolean {
    if (schema.shared) return true
    if (schema.kind === "object")
      return Object.values(schema.fields).some(hasNestedShared)
    if (schema.kind === "dictionary") return hasNestedShared(schema.item)
    return false
  }

  it("顶层登记输出全部落在封闭类型上：整块共享进 data，嵌套共享两侧同名，语言字段进 details", () => {
    const { wholeShared, nestedShared, local } = topLevelOutputs()
    // data 视图 = 整块共享 + 嵌套共享容器 + 特例派生（身份副本 id、codeName
    // 首语言取值、classificationIds 派生导航）。
    expect(new Set([...wholeShared, ...nestedShared])).toEqual(
      new Set(
        agentDataKeys.filter(
          (key) =>
            key !== "id" && key !== "codeName" && key !== "classificationIds",
        ),
      ),
    )
    // details 视图 = 嵌套共享容器（文本视图）+ 纯语言字段 + 派生辅助
    // （locale、navigation）；code_name 按首语言取值进 data，不留在 details。
    expect(new Set([...nestedShared, ...local])).toEqual(
      new Set([
        ...agentDetailsKeys.filter(
          (key) => key !== "locale" && key !== "navigation",
        ),
        "codeName",
      ]),
    )
  })
})

describe("Simul 登记表与封闭类型一致", () => {
  const simulDataKeys = [
    "id",
    "endTime",
    "bossAdjust",
  ] as const satisfies readonly (keyof SimulData)[]
  type _SimulDataComplete = Expect<
    Equal<keyof SimulData, (typeof simulDataKeys)[number]>
  >

  const simulDetailsKeys = [
    "id",
    "locale",
    "record",
    "node",
  ] as const satisfies readonly (keyof SimulDetails)[]
  type _SimulDetailsComplete = Expect<
    Equal<keyof SimulDetails, (typeof simulDetailsKeys)[number]>
  >

  const simulAdjustEntryKeys = [
    "hp",
    "atk",
    "points",
  ] as const satisfies readonly (keyof SimulAdjustEntry)[]
  type _SimulAdjustEntryComplete = Expect<
    Equal<keyof SimulAdjustEntry, (typeof simulAdjustEntryKeys)[number]>
  >

  const simulRecordEntryKeys = [
    "id",
    "name",
    "desc",
    "text",
    "icon",
  ] as const satisfies readonly (keyof SimulRecordEntry)[]
  type _SimulRecordEntryComplete = Expect<
    Equal<keyof SimulRecordEntry, (typeof simulRecordEntryKeys)[number]>
  >

  const simulNodeKeys = [
    "id",
    "name",
    "icon",
    "type",
    "prevNode",
    "storyEvent",
    "battle",
  ] as const satisfies readonly (keyof SimulNode)[]
  type _SimulNodeComplete = Expect<
    Equal<keyof SimulNode, (typeof simulNodeKeys)[number]>
  >

  const simulStoryPageKeys = [
    "id",
    "name",
    "desc",
    "icon",
    "choice",
    "nextPage",
    "nextNodeUnlock",
    "nextRecordUnlock",
  ] as const satisfies readonly (keyof SimulStoryPage)[]
  type _SimulStoryPageComplete = Expect<
    Equal<keyof SimulStoryPage, (typeof simulStoryPageKeys)[number]>
  >

  const simulStoryChoiceKeys = [
    "id",
    "name",
    "desc",
  ] as const satisfies readonly (keyof SimulStoryChoice)[]
  type _SimulStoryChoiceComplete = Expect<
    Equal<keyof SimulStoryChoice, (typeof simulStoryChoiceKeys)[number]>
  >

  const simulBattleKeys = [
    "id",
    "name",
    "tag",
    "tagType",
    "aRankScoreLayerBuff",
    "bRankScoreLayerBuff",
    "sRankScoreLayerBuff",
    "layer",
    "selectableBuff",
    "layerRoom",
  ] as const satisfies readonly (keyof SimulBattle)[]
  type _SimulBattleComplete = Expect<
    Equal<keyof SimulBattle, (typeof simulBattleKeys)[number]>
  >

  const simulLayerKeys = [
    "id",
    "monsterLevel",
    "goalType",
    "sRankGoal",
    "aRankGoal",
    "bRankGoal",
    "layerBuff",
    "layerRoom",
  ] as const satisfies readonly (keyof SimulLayer)[]
  type _SimulLayerComplete = Expect<
    Equal<keyof SimulLayer, (typeof simulLayerKeys)[number]>
  >

  const simulBuffKeys = [
    "title",
    "desc",
  ] as const satisfies readonly (keyof SimulBuff)[]
  type _SimulBuffComplete = Expect<
    Equal<keyof SimulBuff, (typeof simulBuffKeys)[number]>
  >

  const simulRoomKeys = [
    "monsterIcon",
    "monsterList",
    "monsterWeakness",
    "monsterResistance",
    "wavesNum",
  ] as const satisfies readonly (keyof SimulRoom)[]
  type _SimulRoomComplete = Expect<
    Equal<keyof SimulRoom, (typeof simulRoomKeys)[number]>
  >

  const simulEncounterKeys = [
    "id",
    "name",
    "image",
    "element",
    "stats",
  ] as const satisfies readonly (keyof SimulEncounter)[]
  type _SimulEncounterComplete = Expect<
    Equal<keyof SimulEncounter, (typeof simulEncounterKeys)[number]>
  >

  it("各登记表输出名与类型成员集合相等", () => {
    expect(outputSet(simulAdjustMembers)).toEqual(new Set(simulAdjustEntryKeys))
    expect(outputSet(simulRecordMembers)).toEqual(new Set(simulRecordEntryKeys))
    expect(outputSet(simulNodeMembers)).toEqual(new Set(simulNodeKeys))
    expect(outputSet(simulStoryPageMembers)).toEqual(
      new Set(simulStoryPageKeys),
    )
    expect(outputSet(simulChoiceMembers)).toEqual(new Set(simulStoryChoiceKeys))
    expect(outputSet(simulBattleMembers)).toEqual(new Set(simulBattleKeys))
    expect(outputSet(simulLayerMembers)).toEqual(new Set(simulLayerKeys))
    expect(outputSet(simulBuffMembers)).toEqual(new Set(simulBuffKeys))
    expect(outputSet(simulRoomMembers)).toEqual(new Set(simulRoomKeys))
    expect(outputSet(simulEncounterMembers)).toEqual(
      new Set(simulEncounterKeys),
    )
    expect(outputSet(simulSharedDetailFields)).toEqual(
      new Set(
        simulDataKeys.filter((key) => key !== "id" && key !== "bossAdjust"),
      ),
    )
    expect(new Set(Object.values(simulSharedBlockFields))).toEqual(
      new Set(["bossAdjust"]),
    )
    // record/node 是结构字典（分别由 recordMembers/nodeMembers 登记条目结构），
    // 不在顶层语言字段表内；顶层语言字段只有 id。
    expect(outputSet(simulLocalizedDetailFields)).toEqual(new Set(["id"]))
  })
})

describe("DriveDisc 登记表与封闭类型一致", () => {
  const driveDiscDataKeys = [
    "id",
    "icon",
    "icon2",
  ] as const satisfies readonly (keyof DriveDiscData)[]
  type _DriveDiscDataComplete = Expect<
    Equal<keyof DriveDiscData, (typeof driveDiscDataKeys)[number]>
  >

  const driveDiscDetailsKeys = [
    "id",
    "locale",
    "name",
    "desc2",
    "desc4",
    "story",
  ] as const satisfies readonly (keyof DriveDiscDetails)[]
  type _DriveDiscDetailsComplete = Expect<
    Equal<keyof DriveDiscDetails, (typeof driveDiscDetailsKeys)[number]>
  >

  it("登记表按 shared 划分恰好覆盖 data 与 details 成员", () => {
    const shared = new Set(
      Object.entries(driveDiscDetailFields)
        .filter(([, field]) => field.shared)
        .map(([key]) => key),
    )
    const local = new Set(
      Object.entries(driveDiscDetailFields)
        .filter(([, field]) => !field.shared)
        .map(([key]) => key),
    )
    expect(shared).toEqual(
      new Set(driveDiscDataKeys.filter((key) => key !== "id")),
    )
    expect(local).toEqual(
      new Set(driveDiscDetailsKeys.filter((key) => key !== "locale")),
    )
  })
})

describe("Bangboo 登记表与封闭类型一致", () => {
  const bangbooDataKeys = [
    "id",
    "rarity",
    "icon",
    "stats",
    "skillProp",
    "level",
  ] as const satisfies readonly (keyof BangbooData)[]
  type _BangbooDataComplete = Expect<
    Equal<keyof BangbooData, (typeof bangbooDataKeys)[number]>
  >

  const bangbooDetailsKeys = [
    "id",
    "locale",
    "codeName",
    "name",
    "desc",
    "skill",
    "level",
  ] as const satisfies readonly (keyof BangbooDetails)[]
  type _BangbooDetailsComplete = Expect<
    Equal<keyof BangbooDetails, (typeof bangbooDetailsKeys)[number]>
  >

  const bangbooStatsKeys = [
    "endurance",
    "hpMax",
    "hpupgrade",
    "attack",
    "attackUpgrade",
    "breakStun",
    "elementAbnormalPower",
    "defence",
    "defUpgrade",
    "crit",
    "penRatio",
    "critDmg",
  ] as const satisfies readonly (keyof BangbooStats)[]
  type _BangbooStatsComplete = Expect<
    Equal<keyof BangbooStats, (typeof bangbooStatsKeys)[number]>
  >

  const bangbooSkillPropParameterKeys = [
    "main",
    "growth",
    "format",
  ] as const satisfies readonly (keyof BangbooSkillPropParameter)[]
  type _BangbooSkillPropParameterComplete = Expect<
    Equal<
      keyof BangbooSkillPropParameter,
      (typeof bangbooSkillPropParameterKeys)[number]
    >
  >

  const bangbooLevelStageKeys = [
    "hpMax",
    "attack",
    "defence",
    "levelMax",
    "levelMin",
    "materials",
    "extra",
  ] as const satisfies readonly (keyof BangbooLevelStage)[]
  type _BangbooLevelStageComplete = Expect<
    Equal<keyof BangbooLevelStage, (typeof bangbooLevelStageKeys)[number]>
  >

  const bangbooLevelExtraLocalizationKeys = [
    "name",
    "format",
  ] as const satisfies readonly (keyof BangbooLevelExtraLocalization)[]
  type _BangbooLevelExtraLocalizationComplete = Expect<
    Equal<
      keyof BangbooLevelExtraLocalization,
      (typeof bangbooLevelExtraLocalizationKeys)[number]
    >
  >

  const bangbooSkillLevelEntryKeys = [
    "name",
    "desc",
    "property",
    "param",
  ] as const satisfies readonly (keyof BangbooSkillLevelEntry)[]
  type _BangbooSkillLevelEntryComplete = Expect<
    Equal<
      keyof BangbooSkillLevelEntry,
      (typeof bangbooSkillLevelEntryKeys)[number]
    >
  >

  it("各登记表输出名与类型成员集合相等；extra 共享划分覆盖全部登记成员", () => {
    expect(outputSet(bangbooStatsMembers)).toEqual(new Set(bangbooStatsKeys))
    expect(outputSet(bangbooSkillPropParameterMembers)).toEqual(
      new Set(bangbooSkillPropParameterKeys),
    )
    expect(outputSet(bangbooLevelStageMembers)).toEqual(
      new Set(bangbooLevelStageKeys.filter((key) => key !== "extra")),
    )
    expect(outputSet(bangbooLevelExtraMembers)).toEqual(
      new Set([
        ...bangbooLevelExtraLocalizationKeys,
        ...bangbooLevelExtraSharedMembers,
      ]),
    )
    expect(new Set(bangbooLevelExtraSharedMembers)).toEqual(
      new Set(["prop", "value"]),
    )
    expect(outputSet(bangbooSkillLevelMembers)).toEqual(
      new Set(bangbooSkillLevelEntryKeys),
    )
    // level 由专用等级拆分函数处理（阶段成员表已单独核对），不在共享字段表内。
    expect(outputSet(bangbooSharedDetailFields)).toEqual(
      new Set(
        bangbooDataKeys.filter(
          (key) =>
            key !== "id" &&
            key !== "stats" &&
            key !== "skillProp" &&
            key !== "level",
        ),
      ),
    )
    expect(new Set(Object.values(bangbooSharedBlockFields))).toEqual(
      new Set(["stats", "skillProp"]),
    )
    expect(outputSet(bangbooLocalizedDetailFields)).toEqual(
      new Set(
        bangbooDetailsKeys.filter(
          (key) => key !== "locale" && key !== "skill" && key !== "level",
        ),
      ),
    )
  })
})

describe("WEngine 登记表与封闭类型一致", () => {
  const wEngineDataKeys = [
    "id",
    "codeName",
    "rarity",
    "icon",
    "level",
    "stars",
    "materials",
    "baseProperty",
    "randProperty",
    "classificationIds",
  ] as const satisfies readonly (keyof WEngineData)[]
  type _WEngineDataComplete = Expect<
    Equal<keyof WEngineData, (typeof wEngineDataKeys)[number]>
  >

  const wEngineDetailsKeys = [
    "id",
    "locale",
    "name",
    "desc",
    "desc2",
    "desc3",
    "weaponType",
    "baseProperty",
    "randProperty",
    "talents",
  ] as const satisfies readonly (keyof WEngineDetails)[]
  type _WEngineDetailsComplete = Expect<
    Equal<keyof WEngineDetails, (typeof wEngineDetailsKeys)[number]>
  >

  const wEngineLevelStageKeys = [
    "exp",
    "rate",
    "rate2",
  ] as const satisfies readonly (keyof WEngineLevelStage)[]
  type _WEngineLevelStageComplete = Expect<
    Equal<keyof WEngineLevelStage, (typeof wEngineLevelStageKeys)[number]>
  >

  const wEngineStarsStageKeys = [
    "starRate",
    "randRate",
  ] as const satisfies readonly (keyof WEngineStarsStage)[]
  type _WEngineStarsStageComplete = Expect<
    Equal<keyof WEngineStarsStage, (typeof wEngineStarsStageKeys)[number]>
  >

  const wEngineTalentKeys = [
    "name",
    "desc",
  ] as const satisfies readonly (keyof WEngineTalent)[]
  type _WEngineTalentComplete = Expect<
    Equal<keyof WEngineTalent, (typeof wEngineTalentKeys)[number]>
  >

  it("各登记表输出名与类型成员集合相等", () => {
    expect(outputSet(wEngineLevelMembers)).toEqual(
      new Set(wEngineLevelStageKeys),
    )
    expect(outputSet(wEngineStarsMembers)).toEqual(
      new Set(wEngineStarsStageKeys),
    )
    expect(outputSet(wEngineTalentMembers)).toEqual(new Set(wEngineTalentKeys))
    // baseProperty/randProperty 是值-文本双侧结构（属性字段表另行登记），
    // classificationIds 由分类 ID 派生；三者不在顶层共享字段表内。
    expect(outputSet(wEngineSharedDetailFields)).toEqual(
      new Set(
        wEngineDataKeys.filter(
          (key) =>
            key !== "id" &&
            key !== "baseProperty" &&
            key !== "randProperty" &&
            key !== "classificationIds",
        ),
      ),
    )
    expect(outputSet(wEngineLocalizedDetailFields)).toEqual(
      new Set(
        wEngineDetailsKeys.filter(
          (key) =>
            key !== "locale" &&
            key !== "baseProperty" &&
            key !== "randProperty",
        ),
      ),
    )
  })
})

describe("Monster 登记表与封闭类型一致", () => {
  const monsterDataKeys = [
    "id",
    "monsterId",
    "imagePath",
    "rarity",
    "groupId",
    "monsterInfo",
    "elementAbnormal",
  ] as const satisfies readonly (keyof MonsterData)[]
  type _MonsterDataComplete = Expect<
    Equal<keyof MonsterData, (typeof monsterDataKeys)[number]>
  >

  const monsterDetailsKeys = [
    "id",
    "locale",
    "name",
    "desc",
    "groupDesc",
    "cardObtain",
    "cardQuote",
    "cardSkillDesc",
  ] as const satisfies readonly (keyof MonsterDetails)[]
  type _MonsterDetailsComplete = Expect<
    Equal<keyof MonsterDetails, (typeof monsterDetailsKeys)[number]>
  >

  const monsterInfoUnitKeys = [
    "id",
    "codeName",
    "icon",
    "tag",
    "type",
    "element",
    "stats",
    "curves",
  ] as const satisfies readonly (keyof MonsterInfoUnit)[]
  type _MonsterInfoUnitComplete = Expect<
    Equal<keyof MonsterInfoUnit, (typeof monsterInfoUnitKeys)[number]>
  >

  const monsterGrowthCurveKeys = [
    "curve",
    "ratio",
  ] as const satisfies readonly (keyof MonsterGrowthCurve)[]
  type _MonsterGrowthCurveComplete = Expect<
    Equal<keyof MonsterGrowthCurve, (typeof monsterGrowthCurveKeys)[number]>
  >

  it("各登记表输出名与类型成员集合相等", () => {
    // element/stats/curves 是单位内的字典结构（曲线成员表另行登记）。
    expect(outputSet(monsterUnitMembers)).toEqual(
      new Set(
        monsterInfoUnitKeys.filter(
          (key) => key !== "element" && key !== "stats" && key !== "curves",
        ),
      ),
    )
    expect(outputSet(monsterCurveMembers)).toEqual(
      new Set(monsterGrowthCurveKeys),
    )
    expect(outputSet(monsterSharedDetailFields)).toEqual(
      new Set(
        monsterDataKeys.filter(
          (key) =>
            key !== "id" && key !== "monsterInfo" && key !== "elementAbnormal",
        ),
      ),
    )
    expect(new Set(Object.values(monsterSharedBlockFields))).toEqual(
      new Set(["monsterInfo", "elementAbnormal"]),
    )
    expect(outputSet(monsterLocalizedDetailFields)).toEqual(
      new Set(monsterDetailsKeys.filter((key) => key !== "locale")),
    )
  })
})

/**
 * 可选性封闭：本周期删除残留 optional 后必须全必需的类型，key 集合与必需 key
 * 集合相等——任何人把 optional 加回来都会在此处被编译期拒绝。
 */
type RequiredKeys<T> = keyof {
  [K in keyof T as {} extends Pick<T, K> ? never : K]: 0
}

describe("封闭类型不得重新引入可选成员", () => {
  type _BangbooDataAllRequired = Expect<
    Equal<keyof BangbooData, RequiredKeys<BangbooData>>
  >
  type _BangbooDetailsAllRequired = Expect<
    Equal<keyof BangbooDetails, RequiredKeys<BangbooDetails>>
  >
  type _BangbooStatsAllRequired = Expect<
    Equal<keyof BangbooStats, RequiredKeys<BangbooStats>>
  >
  type _BangbooLevelStageAllRequired = Expect<
    Equal<keyof BangbooLevelStage, RequiredKeys<BangbooLevelStage>>
  >
  type _BangbooLevelStageLocalizationAllRequired = Expect<
    Equal<
      keyof BangbooLevelStageLocalization,
      RequiredKeys<BangbooLevelStageLocalization>
    >
  >
  type _BangbooLevelExtraLocalizationAllRequired = Expect<
    Equal<
      keyof BangbooLevelExtraLocalization,
      RequiredKeys<BangbooLevelExtraLocalization>
    >
  >
  type _BangbooSkillLevelEntryAllRequired = Expect<
    Equal<keyof BangbooSkillLevelEntry, RequiredKeys<BangbooSkillLevelEntry>>
  >
  type _BossDataAllRequired = Expect<
    Equal<keyof BossData, RequiredKeys<BossData>>
  >
  type _BossDetailsModesVariantAllRequired = Expect<
    Equal<keyof BossDetailsModesVariant, RequiredKeys<BossDetailsModesVariant>>
  >
  type _BossAdjustEntryAllRequired = Expect<
    Equal<keyof BossAdjustEntry, RequiredKeys<BossAdjustEntry>>
  >
  type _BossModeAllRequired = Expect<
    Equal<keyof BossMode, RequiredKeys<BossMode>>
  >
  type _BossZoneStageAllRequired = Expect<
    Equal<keyof BossZoneStage, RequiredKeys<BossZoneStage>>
  >
  type _BossZoneBuffAllRequired = Expect<
    Equal<keyof BossZoneBuff, RequiredKeys<BossZoneBuff>>
  >
  type _BossZoneRoomAllRequired = Expect<
    Equal<keyof BossZoneRoom, RequiredKeys<BossZoneRoom>>
  >
  type _BossZoneEncounterAllRequired = Expect<
    Equal<keyof BossZoneEncounter, RequiredKeys<BossZoneEncounter>>
  >
  type _ShiyuDetailsAllRequired = Expect<
    Equal<keyof ShiyuDetails, RequiredKeys<ShiyuDetails>>
  >
  type _ShiyuZoneStageAllRequired = Expect<
    Equal<keyof ShiyuZoneStage, RequiredKeys<ShiyuZoneStage>>
  >
  type _ShiyuZoneStageDataAllRequired = Expect<
    Equal<keyof ShiyuZoneStageData, RequiredKeys<ShiyuZoneStageData>>
  >
  type _ShiyuZoneRoomAllRequired = Expect<
    Equal<keyof ShiyuZoneRoom, RequiredKeys<ShiyuZoneRoom>>
  >
  type _ShiyuZoneRoomDataAllRequired = Expect<
    Equal<keyof ShiyuZoneRoomData, RequiredKeys<ShiyuZoneRoomData>>
  >
  type _ShiyuZoneBuffAllRequired = Expect<
    Equal<keyof ShiyuZoneBuff, RequiredKeys<ShiyuZoneBuff>>
  >
  type _ShiyuZoneEncounterAllRequired = Expect<
    Equal<keyof ShiyuZoneEncounter, RequiredKeys<ShiyuZoneEncounter>>
  >
  type _ShiyuZoneEncounterDataAllRequired = Expect<
    Equal<keyof ShiyuZoneEncounterData, RequiredKeys<ShiyuZoneEncounterData>>
  >
  type _DriveDiscDataAllRequired = Expect<
    Equal<keyof DriveDiscData, RequiredKeys<DriveDiscData>>
  >
  type _DriveDiscDetailsAllRequired = Expect<
    Equal<keyof DriveDiscDetails, RequiredKeys<DriveDiscDetails>>
  >
  type _MonsterDataAllRequired = Expect<
    Equal<keyof MonsterData, RequiredKeys<MonsterData>>
  >
  type _MonsterDetailsAllRequired = Expect<
    Equal<keyof MonsterDetails, RequiredKeys<MonsterDetails>>
  >
  type _MonsterInfoUnitAllRequired = Expect<
    Equal<keyof MonsterInfoUnit, RequiredKeys<MonsterInfoUnit>>
  >
  type _MonsterGrowthCurveAllRequired = Expect<
    Equal<keyof MonsterGrowthCurve, RequiredKeys<MonsterGrowthCurve>>
  >
  type _WEngineDataAllRequired = Expect<
    Equal<keyof WEngineData, RequiredKeys<WEngineData>>
  >
  type _WEngineDetailsAllRequired = Expect<
    Equal<keyof WEngineDetails, RequiredKeys<WEngineDetails>>
  >
  type _WEngineLevelStageAllRequired = Expect<
    Equal<keyof WEngineLevelStage, RequiredKeys<WEngineLevelStage>>
  >
  type _WEngineStarsStageAllRequired = Expect<
    Equal<keyof WEngineStarsStage, RequiredKeys<WEngineStarsStage>>
  >
  type _WEngineTalentAllRequired = Expect<
    Equal<keyof WEngineTalent, RequiredKeys<WEngineTalent>>
  >
  type _SimulDataAllRequired = Expect<
    Equal<keyof SimulData, RequiredKeys<SimulData>>
  >
  type _SimulDetailsAllRequired = Expect<
    Equal<keyof SimulDetails, RequiredKeys<SimulDetails>>
  >
  type _SimulAdjustEntryAllRequired = Expect<
    Equal<keyof SimulAdjustEntry, RequiredKeys<SimulAdjustEntry>>
  >
  type _SimulRecordEntryAllRequired = Expect<
    Equal<keyof SimulRecordEntry, RequiredKeys<SimulRecordEntry>>
  >
  type _SimulNodeAllRequired = Expect<
    Equal<keyof SimulNode, RequiredKeys<SimulNode>>
  >
  type _SimulStoryPageAllRequired = Expect<
    Equal<keyof SimulStoryPage, RequiredKeys<SimulStoryPage>>
  >
  type _SimulStoryChoiceAllRequired = Expect<
    Equal<keyof SimulStoryChoice, RequiredKeys<SimulStoryChoice>>
  >
  type _SimulBattleAllRequired = Expect<
    Equal<keyof SimulBattle, RequiredKeys<SimulBattle>>
  >
  type _SimulLayerAllRequired = Expect<
    Equal<keyof SimulLayer, RequiredKeys<SimulLayer>>
  >
  type _SimulBuffAllRequired = Expect<
    Equal<keyof SimulBuff, RequiredKeys<SimulBuff>>
  >
  type _SimulRoomAllRequired = Expect<
    Equal<keyof SimulRoom, RequiredKeys<SimulRoom>>
  >
  type _SimulEncounterAllRequired = Expect<
    Equal<keyof SimulEncounter, RequiredKeys<SimulEncounter>>
  >
  type _AgentSkillEntryAllRequired = Expect<
    Equal<
      keyof AgentDetails["skill"][string],
      RequiredKeys<AgentDetails["skill"][string]>
    >
  >

  it("编译期断言生效（无运行时内容）", () => {
    expect(true).toBe(true)
  })
})
