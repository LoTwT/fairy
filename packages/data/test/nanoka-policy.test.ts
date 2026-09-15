import { describe, expect, it } from "vitest"
import {
  escapeTerminalText,
  formatCommandFailure,
} from "../scripts/terminal.ts"
import {
  formatFetchProgress,
  formatVersionMenu,
  parseArguments,
  parseInteractiveSelection,
} from "../scripts/nanoka-source.ts"
import {
  decodeUtf8Json,
  buildManifestUrl,
  buildEntityIndexUrl,
  buildEntityDetailUrl,
  loadSourcePolicy,
  selectVersion,
  validateAllowedUrl,
  validateManifest,
} from "../scripts/nanoka/policy.ts"

const manifest = validateManifest({
  zzz: {
    live: "3.0",
    latest: "3.1.12+1",
    available: ["3.0", "3.1.12+1"],
  },
})

describe("Nanoka version policy", () => {
  it.each(["username", "password", "port", "search", "hash"] as const)(
    "rejects forbidden URL component %s for manifests and data",
    async (component) => {
      const policy = await loadSourcePolicy()
      for (const kind of ["manifest", "data"] as const) {
        const url =
          kind === "manifest"
            ? buildManifestUrl(policy)
            : buildEntityIndexUrl(policy, "3.0", "character")
        const values = {
          username: "user",
          password: "password",
          port: "444",
          search: "?extra=1",
          hash: "#fragment",
        }
        url[component] = values[component]
        expect(() => validateAllowedUrl(policy, url, kind)).toThrow(
          "不允许的组成部分",
        )
      }
    },
  )

  it("rejects malformed UTF-8 even when replacement would form valid JSON", () => {
    const invalidUtf8 = new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])
    expect(() => decodeUtf8Json(invalidUtf8, "fixture")).toThrow(
      "不是有效 UTF-8",
    )
  })

  it("rejects unknown command arguments", () => {
    expect(() => parseArguments(["fetch", "--unknown"])).toThrow("未知参数")
  })

  it("selects channels and explicit available versions without fallback", () => {
    expect(selectVersion(manifest, { channel: "live" })).toEqual({
      version: "3.0",
      selectedBy: "live",
    })
    expect(selectVersion(manifest, { channel: "latest" }).version).toBe(
      "3.1.12+1",
    )
    expect(selectVersion(manifest, { version: "3.1.12+1" }).selectedBy).toBe(
      "version",
    )
    expect(() => selectVersion(manifest, { version: "4.0" })).toThrow(
      "不在 manifest available",
    )
  })

  it("parses mutually exclusive CLI arguments", () => {
    expect(parseArguments(["fetch", "--channel", "latest"])).toEqual({
      command: "fetch",
      entities: [],
      channel: "latest",
    })
    expect(
      parseArguments([
        "fetch",
        "--entity",
        "equipment",
        "--entity",
        "character",
      ]),
    ).toEqual({
      command: "fetch",
      entities: ["equipment", "character"],
    })
    expect(() =>
      parseArguments(["fetch", "--channel", "live", "--version", "3.0"]),
    ).toThrow("互斥")
    expect(() => parseArguments(["verify", "--version", "3.0"])).toThrow(
      "命令必须是 fetch",
    )
  })

  it("formats and parses interactive selections", () => {
    const menu = formatVersionMenu(manifest)
    expect(menu).toContain("3.0     live（默认）")
    expect(menu).toContain("3.1.12+1     latest")
    expect(parseInteractiveSelection("", manifest)).toBe("3.0")
    expect(parseInteractiveSelection("2", manifest)).toBe("3.1.12+1")
    expect(parseInteractiveSelection("3.1.12+1", manifest)).toBe("3.1.12+1")
    expect(parseInteractiveSelection("9", manifest)).toBeUndefined()

    const sameVersion = validateManifest({
      zzz: { live: "3.0", latest: "3.0", available: ["3.0"] },
    })
    expect(formatVersionMenu(sameVersion).match(/3\.0/g)).toHaveLength(2)
    expect(formatVersionMenu(sameVersion)).toContain("live（默认）、latest")
  })

  it("formats concise fetch progress", () => {
    expect(
      formatFetchProgress({
        stage: "preparing",
        requestedEntities: ["character", "equipment"],
      }),
    ).toContain("抓取")
    expect(
      formatFetchProgress({
        stage: "entity-discovered",
        entity: "character",
        recordCount: 57,
        detailCount: 114,
      }),
    ).toContain("57 条记录")
    expect(
      formatFetchProgress({
        stage: "entity-details",
        entity: "character",
        completed: 9,
        total: 114,
      }),
    ).toBeUndefined()
    expect(
      formatFetchProgress({
        stage: "entity-details",
        entity: "character",
        completed: 10,
        total: 114,
      }),
    ).toBe("character 详情进度：10/114")
  })

  it("escapes terminal controls and bidirectional overrides", () => {
    const escaped = escapeTerminalText(
      "unsafe\u001B]52;c;payload\u0007\n\u202Etext",
    )
    expect(escaped).toBe(
      "unsafe\\u{001b}]52;c;payload\\u{0007}\\u{000a}\\u{202e}text",
    )
    expect(
      formatCommandFailure(
        new Error("Location: \u001B]52;c;payload\u0007\nspoofed"),
      ),
    ).toBe(
      "Nanoka 数据源命令失败：Location: \\u{001b}]52;c;payload\\u{0007}\\u{000a}spoofed\n",
    )
    expect(escapeTerminalText("x".repeat(5000))).toBe(`${"x".repeat(4096)}…`)
    expect(escapeTerminalText("😀".repeat(4097))).toBe(`${"😀".repeat(4096)}…`)
    const cause = new Error("nested cause must stay out of terminal output")
    const error = new Error("resource [zh] /field\r", { cause })
    expect(formatCommandFailure(error, "Nanoka 代理人整合命令")).toBe(
      "Nanoka 代理人整合命令失败：resource [zh] /field\\u{000d}\n",
    )
    expect(error.message).toBe("resource [zh] /field\r")
    expect(error.cause).toBe(cause)
    expect(formatCommandFailure("invalid\ninput")).toBe(
      "Nanoka 数据源命令失败：invalid\\u{000a}input\n",
    )
  })
})

describe("Nanoka URL policy", () => {
  it("accepts only configured manifest, index, and detail URLs", async () => {
    const policy = await loadSourcePolicy()
    expect(buildEntityIndexUrl(policy, "3.0", "character").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/character.json",
    )
    expect(
      buildEntityDetailUrl(policy, "3.0", "zh", "character", "1011").href,
    ).toBe("https://static.nanoka.cc/zzz/3.0/zh/character/1011.json")
    expect(buildEntityIndexUrl(policy, "3.0", "weapon").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/weapon.json",
    )
    expect(
      buildEntityDetailUrl(policy, "3.0", "en", "weapon", "12002").href,
    ).toBe("https://static.nanoka.cc/zzz/3.0/en/weapon/12002.json")
    expect(buildEntityIndexUrl(policy, "3.0", "bangboo").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/bangboo.json",
    )
    expect(
      buildEntityDetailUrl(policy, "3.0", "zh", "bangboo", "13001").href,
    ).toBe("https://static.nanoka.cc/zzz/3.0/zh/bangboo/13001.json")
    expect(buildEntityIndexUrl(policy, "3.0", "monster").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/monster.json",
    )
    expect(
      buildEntityDetailUrl(policy, "3.0", "en", "monster", "1001").href,
    ).toBe("https://static.nanoka.cc/zzz/3.0/en/monster/1001.json")
    expect(buildEntityIndexUrl(policy, "3.0", "shiyu").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/shiyu.json",
    )
    expect(
      buildEntityDetailUrl(policy, "3.0", "en", "shiyu", "620541").href,
    ).toBe("https://static.nanoka.cc/zzz/3.0/en/shiyu/620541.json")
    expect(buildEntityIndexUrl(policy, "3.0", "simul").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/simul.json",
    )
    expect(buildEntityDetailUrl(policy, "3.0", "zh", "simul", "101").href).toBe(
      "https://static.nanoka.cc/zzz/3.0/zh/simul/101.json",
    )
    expect(() =>
      validateAllowedUrl(
        policy,
        new URL("https://example.com/zzz/3.0/character.json"),
        "data",
      ),
    ).toThrow("allowlist")
    expect(() =>
      validateAllowedUrl(
        policy,
        new URL("https://static.nanoka.cc/other.json"),
        "data",
      ),
    ).toThrow("URL 路径")
    expect(() => buildEntityIndexUrl(policy, "../3.0", "character")).toThrow(
      "版本号不安全",
    )
    expect(() =>
      buildEntityDetailUrl(policy, "3.0", "ja" as "zh", "character", "1011"),
    ).toThrow("不支持的语言")
    expect(() =>
      validateAllowedUrl(
        policy,
        new URL("https://static.nanoka.cc/zzz/3.0/Monster.json"),
        "data",
      ),
    ).toThrow("URL 路径")
    expect(() =>
      validateAllowedUrl(
        policy,
        new URL("https://static.nanoka.cc/zzz/3.0/en/Monster/1001.json"),
        "data",
      ),
    ).toThrow("URL 路径")
    expect(() =>
      validateAllowedUrl(
        policy,
        new URL("https://static.nanoka.cc/zzz/3.0/unknown.json"),
        "data",
      ),
    ).toThrow("URL 路径")
  })

  it("rejects malformed manifests", () => {
    expect(() => validateManifest({ zzz: { live: "3.0" } })).toThrow(
      "缺少 live、latest 或 available",
    )
    expect(() =>
      validateManifest({
        zzz: { live: "../3.0", latest: "3.0", available: ["3.0"] },
      }),
    ).toThrow("版本号不安全")
    expect(() =>
      validateManifest({
        zzz: { live: "3.0", latest: "3.0", available: [] },
      }),
    ).toThrow("available 不能为空")
    expect(() =>
      validateManifest({
        zzz: { live: "4.0", latest: "3.0", available: ["3.0"] },
      }),
    ).toThrow("必须包含在 available")
    expect(() =>
      validateManifest({
        zzz: { live: ".3.0", latest: ".3.0", available: [".3.0"] },
      }),
    ).toThrow("版本号不安全")
    expect(() =>
      validateManifest({
        zzz: {
          live: "BuildA",
          latest: "builda",
          available: ["BuildA", "builda"],
        },
      }),
    ).toThrow("大小写冲突")
    expect(
      validateManifest({
        zzz: {
          live: "3.0.staging",
          latest: "3.0.backup",
          available: ["3.0.staging", "3.0.backup", "3.0.lock"],
        },
      }).zzz.available,
    ).toEqual(["3.0.staging", "3.0.backup", "3.0.lock"])
    expect(() =>
      validateManifest({
        zzz: {
          live: "v0",
          latest: "v0",
          available: Array.from({ length: 1001 }, (_, index) => `v${index}`),
        },
      }),
    ).toThrow("available 超过上限")
  })
})
