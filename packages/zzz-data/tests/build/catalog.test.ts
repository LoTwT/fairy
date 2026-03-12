import { describe, expect, it } from "vitest"
import {
  getCompatibleStaticBuildWEngines,
  getStaticBuildAgent,
  getStaticBuildDriveDisc,
  getStaticBuildWEngine,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildWEngines,
} from "../../src/build/index"

describe("static build catalog", () => {
  it("includes non-signature attack and rupture w-engines", () => {
    expect(getStaticBuildWEngine("14001")?.name).toBe("加农转子")
    expect(getStaticBuildWEngine("13106")?.name).toBe("家政员")
    expect(getStaticBuildWEngine("13014")?.name).toBe("电波漫步")
    expect(supportedStaticBuildWEngines.length).toBeGreaterThan(19)
  })

  it("returns specialty-compatible w-engines for each supported agent type", () => {
    const attackAgent = getStaticBuildAgent("1021")
    const ruptureAgent = getStaticBuildAgent("1371")

    expect(attackAgent?.specialty).toBe("Attack")
    expect(ruptureAgent?.specialty).toBe("Rupture")

    const attackWEngines = getCompatibleStaticBuildWEngines("Attack").map(
      (item) => item.name,
    )
    const ruptureWEngines = getCompatibleStaticBuildWEngines("Rupture").map(
      (item) => item.name,
    )

    expect(attackWEngines).toContain("加农转子")
    expect(attackWEngines).not.toContain("青溟笼舍")
    expect(ruptureWEngines).toContain("青溟笼舍")
    expect(ruptureWEngines).not.toContain("加农转子")
  })

  it("includes generic drive-disc batch a coverage in the supported catalog", () => {
    expect(getStaticBuildDriveDisc("32600")?.name).toBe("獠牙重金属")
    expect(getStaticBuildDriveDisc("32700")?.name).toBe("折枝剑歌")
    expect(getStaticBuildDriveDisc("32900")?.name).toBe("如影相随")
    expect(getStaticBuildDriveDisc("33300")?.name).toBe("拂晓生花")
    expect(getStaticBuildDriveDisc("33500")?.name).toBe("沧浪行歌")
    expect(getStaticBuildDriveDisc("33600")?.name).toBe("流光咏叹")
    expect(getStaticBuildDriveDisc("33800")?.name).toBe("囚徒手记")
    expect(supportedStaticBuildDriveDiscs.length).toBeGreaterThan(14)
  })
})
