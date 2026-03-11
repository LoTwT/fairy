import { describe, expect, it } from "vitest"
import {
  getCompatibleStaticBuildWEngines,
  getStaticBuildAgent,
  getStaticBuildWEngine,
  supportedStaticBuildWEngines,
} from "../../src/build/index"

describe("static build catalog", () => {
  it("includes non-signature attack and rupture w-engines", () => {
    expect(getStaticBuildWEngine("14001")?.name).toBe("加农转子")
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
})
