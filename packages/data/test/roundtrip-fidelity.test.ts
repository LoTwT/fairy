import { describe, expect, it } from "vitest"
import { integrateAgent } from "../src/integration/integrate-agent.ts"
import { integrateBangboo } from "../src/integration/integrate-bangboo.ts"
import { integrateBoss } from "../src/integration/integrate-boss.ts"
import { integrateDriveDisc } from "../src/integration/integrate-drive-disc.ts"
import { integrateMonster } from "../src/integration/integrate-monster.ts"
import { integrateShiyu } from "../src/integration/integrate-shiyu.ts"
import { integrateSimul } from "../src/integration/integrate-simul.ts"
import { integrateWEngine } from "../src/integration/integrate-w-engine.ts"
import { agentInput } from "./fixtures/agent-source.ts"
import { expectRoundtrip } from "./fixtures/agent-roundtrip.ts"
import { bangbooInput } from "./fixtures/bangboo-source.ts"
import { expectBangbooRoundtrip } from "./fixtures/bangboo-roundtrip.ts"
import { bossInput } from "./fixtures/boss-source.ts"
import { expectBossRoundtrip } from "./fixtures/boss-roundtrip.ts"
import { driveDiscInput } from "./fixtures/drive-disc-source.ts"
import { expectDriveDiscRoundtrip } from "./fixtures/drive-disc-roundtrip.ts"
import { monsterInput } from "./fixtures/monster-source.ts"
import { expectMonsterRoundtrip } from "./fixtures/monster-roundtrip.ts"
import { shiyuInput } from "./fixtures/shiyu-source.ts"
import { expectShiyuRoundtrip } from "./fixtures/shiyu-roundtrip.ts"
import { simulInput } from "./fixtures/simul-source.ts"
import { expectSimulRoundtrip } from "./fixtures/simul-roundtrip.ts"
import { wEngineInput } from "./fixtures/w-engine-source.ts"
import { expectWEngineRoundtrip } from "./fixtures/w-engine-roundtrip.ts"

/** 还原器 fixture 的最小公共形态；各实体以自身工厂、整合函数与还原函数实例化。 */
interface RoundtripFixture {
  sourceRecord: unknown
  details: Record<string, unknown>
}

/** 以可枚举数据属性写入特殊自有 key；`__proto__` 等 key 不得触发原型 setter 或改写原型。 */
function defineOwnField(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

/** 来源记录中刻意使用的特殊自有 key；保真比较不得忽略或误判它们。 */
const specialSourceRecordKeys = new Set([
  "constructor",
  "__proto__",
  "toString",
])

/**
 * 来源记录 JSON 保真回归：合法复制（含对象值 `constructor`、自有 `__proto__` 与 `toString`）
 * 必须通过；对象内部值改变与字段丢失等真实篡改必须被拒绝。八类还原器共用同一检查。
 */
function verifySourceRecordJsonFidelity<
  Input extends RoundtripFixture,
  Result extends { sourceRecord: Record<string, unknown> },
>(
  name: string,
  createInput: () => Input,
  integrate: (input: Input) => Result,
  verifyRoundtrip: (result: Result, input: Input) => void,
): void {
  function createIntegratedFixture(): { input: Input; result: Result } {
    const input = createInput()
    defineOwnField(input.sourceRecord as object, "constructor", { valid: 1 })
    defineOwnField(input.sourceRecord as object, "__proto__", {
      nested: [1, { text: "特殊自有 key" }],
    })
    defineOwnField(input.sourceRecord as object, "toString", false)
    return { input, result: integrate(input) }
  }

  it(`${name}：来源记录 JSON 保真比较接受合法复制并拒绝真实篡改`, () => {
    const legal = createIntegratedFixture()
    expect(() => verifyRoundtrip(legal.result, legal.input)).not.toThrow()

    const changedConstructorValue = createIntegratedFixture()
    const changedConstructor = changedConstructorValue.result.sourceRecord[
      "constructor"
    ] as { valid: number }
    changedConstructor.valid = 2
    expect(() =>
      verifyRoundtrip(
        changedConstructorValue.result,
        changedConstructorValue.input,
      ),
    ).toThrow()

    const changedProtoValue = createIntegratedFixture()
    const changedProto = changedProtoValue.result.sourceRecord["__proto__"] as {
      nested: unknown[]
    }
    changedProto.nested = [2]
    expect(() =>
      verifyRoundtrip(changedProtoValue.result, changedProtoValue.input),
    ).toThrow()

    const changedToStringValue = createIntegratedFixture()
    changedToStringValue.result.sourceRecord["toString"] = true
    expect(() =>
      verifyRoundtrip(changedToStringValue.result, changedToStringValue.input),
    ).toThrow()

    const missingField = createIntegratedFixture()
    const plainKey = Object.keys(missingField.result.sourceRecord).find(
      (key) => !specialSourceRecordKeys.has(key),
    )!
    delete missingField.result.sourceRecord[plainKey]
    expect(() =>
      verifyRoundtrip(missingField.result, missingField.input),
    ).toThrow()
  })
}

/**
 * data 与 details 重叠载荷回归：正常输入通过；把 data 已提取字段以同值或冲突值重新写回
 * 对应语言 details 时必须显式拒绝。同值重复同样按字段归属契约判断，不能任选一侧掩盖。
 */
function verifyOverlappingPayloadRejected<
  Input extends RoundtripFixture,
  Result extends { data: unknown; details: unknown },
>(
  name: string,
  createInput: () => Input,
  integrate: (input: Input) => Result,
  verifyRoundtrip: (result: Result, input: Input) => void,
  detailsKey: string,
  dataKey: string,
): void {
  it(`${name}：data 与 details 的重叠载荷按字段归属拒绝（同值与冲突）`, () => {
    const normalInput = createInput()
    expect(() =>
      verifyRoundtrip(integrate(normalInput), normalInput),
    ).not.toThrow()

    const sameValueInput = createInput()
    const sameValueResult = integrate(sameValueInput)
    defineOwnField(
      (sameValueResult.details as Record<string, unknown>)["zh"] as object,
      detailsKey,
      (sameValueResult.data as Record<string, unknown>)[dataKey],
    )
    expect(() => verifyRoundtrip(sameValueResult, sameValueInput)).toThrow(
      /还原载荷重叠/u,
    )

    const conflictingInput = createInput()
    const conflictingResult = integrate(conflictingInput)
    defineOwnField(
      (conflictingResult.details as Record<string, unknown>)["zh"] as object,
      detailsKey,
      "CORRUPT_DUPLICATE",
    )
    expect(() => verifyRoundtrip(conflictingResult, conflictingInput)).toThrow(
      /还原载荷重叠/u,
    )
  })
}

describe("还原器判定回归", () => {
  describe("来源记录 JSON 保真", () => {
    verifySourceRecordJsonFidelity(
      "Agent",
      agentInput,
      integrateAgent,
      expectRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "DriveDisc",
      driveDiscInput,
      integrateDriveDisc,
      expectDriveDiscRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "WEngine",
      wEngineInput,
      integrateWEngine,
      expectWEngineRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "Bangboo",
      bangbooInput,
      integrateBangboo,
      expectBangbooRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "Monster",
      monsterInput,
      integrateMonster,
      expectMonsterRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "Shiyu",
      shiyuInput,
      integrateShiyu,
      expectShiyuRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "Boss",
      bossInput,
      integrateBoss,
      expectBossRoundtrip,
    )
    verifySourceRecordJsonFidelity(
      "Simul",
      simulInput,
      integrateSimul,
      expectSimulRoundtrip,
    )
  })

  describe("data 与 details 重叠载荷", () => {
    verifyOverlappingPayloadRejected(
      "Shiyu priority",
      shiyuInput,
      integrateShiyu,
      expectShiyuRoundtrip,
      "priority",
      "priority",
    )
    verifyOverlappingPayloadRejected(
      "Shiyu 来源拼写 begin_time",
      shiyuInput,
      integrateShiyu,
      expectShiyuRoundtrip,
      "begin_time",
      "beginTime",
    )
    verifyOverlappingPayloadRejected(
      "Boss 来源拼写 begin_time",
      bossInput,
      integrateBoss,
      expectBossRoundtrip,
      "begin_time",
      "beginTime",
    )
    verifyOverlappingPayloadRejected(
      "Simul 来源拼写 end_time",
      simulInput,
      integrateSimul,
      expectSimulRoundtrip,
      "end_time",
      "endTime",
    )
  })
})
