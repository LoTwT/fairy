import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { serializeJson } from "../src/integration/serialize-json.ts"
import {
  integratedSnapshotFormat,
  publishedIntegratedSnapshotFormat,
} from "../src/integration/snapshot-types.ts"
import {
  derivePublishedIndex,
  derivePublishedIndexBytes,
} from "../scripts/nanoka-integration/published-index.ts"
import {
  archivedDigestOf,
  minifyJsonBytes,
  publicationManifestFormat,
  verifyMinifiedPublication,
  writeMinifiedPublication,
} from "../scripts/publication-minify.ts"
import { sha256 } from "../scripts/nanoka-integration/files.ts"
import { publicationFixture } from "./fixtures/publication.ts"

const temporaryDirectories: string[] = []
afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0))
    await rm(directory, { force: true, recursive: true })
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "fairy-publication-minify-"))
  temporaryDirectories.push(root)
  const { artifactDirectory, index } = await publicationFixture(root)
  return { root, artifactDirectory, index }
}

/** 最小归档索引：键顺序与成员字段按生产 v3 契约排列。 */
function syntheticArchive() {
  return {
    format: integratedSnapshotFormat,
    source: {
      id: "nanoka-zzz",
      version: "synthetic",
      inputs: [{ resource: "manifest.json", sha256: "0".repeat(64) }],
    },
    entities: {
      agents: {
        rulesVersion: "synthetic-rules/1",
        detailLocales: ["zh", "en"],
        complete: true,
        memberIds: ["2"],
        inputs: [],
        members: {
          "2": {
            files: {
              data: { path: "agents/2/data.json", sha256: "1".repeat(64) },
              details: {
                zh: {
                  path: "agents/2/details.zh.json",
                  sha256: "2".repeat(64),
                },
                en: {
                  path: "agents/2/details.en.json",
                  sha256: "3".repeat(64),
                },
              },
            },
            sourceRecord: {
              id: 2,
              code: "synthetic",
              future: { nested: true },
            },
          },
        },
      },
    },
  }
}

/** 递归收集 sourceRecord 键的位置；只按 JSON 成员扫描，不做文本子串匹配。 */
function sourceRecordPointers(value: unknown, path = ""): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      sourceRecordPointers(item, `${path}/${index}`),
    )
  if (typeof value !== "object" || value === null) return []
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "sourceRecord"
      ? [`${path}/${key}`]
      : sourceRecordPointers(nested, `${path}/${key}`),
  )
}

describe("published index derivation", () => {
  it("replaces the format and removes only sourceRecord while preserving key order", () => {
    const archive = syntheticArchive()
    const published = derivePublishedIndex(archive)
    expect(Object.keys(published)).toEqual(Object.keys(archive))
    expect(Object.keys(published.entities.agents!)).toEqual(
      Object.keys(archive.entities.agents),
    )
    expect(published.format).toBe(publishedIntegratedSnapshotFormat)
    expect(published.entities.agents!.members["2"]).toEqual({
      files: archive.entities.agents.members["2"].files,
    })
    expect(sourceRecordPointers(published)).toEqual([])
    // 输入对象及其 sourceRecord 不被修改。
    expect(archive.format).toBe(integratedSnapshotFormat)
    expect(archive.entities.agents.members["2"].sourceRecord).toEqual({
      id: 2,
      code: "synthetic",
      future: { nested: true },
    })
  })

  it("derives exact compact bytes from valid archive bytes", () => {
    const archive = syntheticArchive()
    const bytes = Buffer.from(serializeJson(archive))
    const publishedBytes = derivePublishedIndexBytes(bytes)
    expect(publishedBytes).toEqual(
      Buffer.from(
        JSON.stringify(
          derivePublishedIndex(JSON.parse(bytes.toString("utf8"))),
        ),
      ),
    )
    const published = JSON.parse(Buffer.from(publishedBytes).toString("utf8"))
    expect(published.format).toBe(publishedIntegratedSnapshotFormat)
    expect(sourceRecordPointers(published)).toEqual([])
  })

  it("rejects BOM, invalid UTF-8 and non-v3 input", () => {
    expect(() =>
      derivePublishedIndexBytes(Buffer.from("\uFEFF{}", "utf8")),
    ).toThrow(/BOM/u)
    expect(() =>
      derivePublishedIndexBytes(Buffer.from([0x7b, 0xff, 0x7d])),
    ).toThrow(/UTF-8/u)
    const v4 = {
      ...syntheticArchive(),
      format: publishedIntegratedSnapshotFormat,
    }
    expect(() => derivePublishedIndex(v4)).toThrow(/v4/u)
    expect(() =>
      derivePublishedIndex({ ...syntheticArchive(), format: "unknown" }),
    ).toThrow(/格式/u)
  })

  it("rejects members missing sourceRecord or carrying extra keys", () => {
    const missing = syntheticArchive()
    delete (missing.entities.agents.members["2"] as Record<string, unknown>)
      .sourceRecord
    expect(() => derivePublishedIndex(missing)).toThrow(/sourceRecord/u)

    const extra = syntheticArchive()
    ;(
      extra.entities.agents.members["2"] as Record<string, unknown>
    ).publishedOnly = true
    expect(() => derivePublishedIndex(extra)).toThrow(/sourceRecord/u)

    const noFiles = syntheticArchive()
    delete (noFiles.entities.agents.members["2"] as Record<string, unknown>)
      .files
    expect(() => derivePublishedIndex(noFiles)).toThrow(/files/u)
  })
})

describe("publication minification", () => {
  it("removes only whitespace outside strings and keeps escaped quotes intact", () => {
    const archive = new TextEncoder().encode(
      '{\n  "a": "keep  spaces \\" and \\\\ here",\n  "b": [1, 2]\n}\n',
    )
    expect(Buffer.from(minifyJsonBytes(archive)).toString("utf8")).toBe(
      '{"a":"keep  spaces \\" and \\\\ here","b":[1,2]}',
    )
    expect(
      JSON.parse(Buffer.from(minifyJsonBytes(archive)).toString("utf8")),
    ).toEqual(JSON.parse(Buffer.from(archive).toString("utf8")))
  })

  it("handles CRLF, unicode separators, escapes, non-BMP text and empty input", () => {
    const cases: [string, string][] = [
      ['{\r\n  "a": 1\r\n}\r\n', '{"a":1}'],
      ['{\n\t"a": "\u2028\u2029"\n}', '{"a":"\u2028\u2029"}'],
      ['{\n  "a": "\\u0041\\u2028"\n}', '{"a":"\\u0041\\u2028"}'],
      ['{\n  "a": "😀𝄞"\n}', '{"a":"😀𝄞"}'],
      [" \n\t\r", ""],
    ]
    for (const [input, expected] of cases)
      expect(
        Buffer.from(minifyJsonBytes(Buffer.from(input, "utf8"))).toString(
          "utf8",
        ),
      ).toBe(expected)
  })

  it("rejects BOM and invalid UTF-8 explicitly", () => {
    expect(() => minifyJsonBytes(Buffer.from("\uFEFF{}", "utf8"))).toThrow(
      /BOM/u,
    )
    expect(() => minifyJsonBytes(Buffer.from([0x7b, 0xff, 0x7d]))).toThrow(
      /UTF-8/u,
    )
  })

  it("publishes a v4 index and a v2 manifest with exact derivation fields", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    const manifest = await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    expect(manifest.format).toBe(publicationManifestFormat)
    expect(Object.keys(manifest).toSorted()).toEqual([
      "archiveIndexSha256",
      "files",
      "format",
      "indexDerivation",
      "source",
    ])
    expect(manifest.indexDerivation).toEqual({
      archiveFormat: integratedSnapshotFormat,
      publicationFormat: publishedIntegratedSnapshotFormat,
    })
    expect("publicationIndexSha256" in manifest).toBe(false)

    let archiveBytes = 0
    let publicationBytes = 0
    for (const [path, entry] of Object.entries(manifest.files)) {
      const archived = await readFile(join(artifactDirectory, path))
      const published = await readFile(join(publication, path))
      expect(sha256(archived), path).toBe(entry.archiveSha256)
      expect(sha256(published), path).toBe(entry.publicationSha256)
      expect(archived.byteLength, path).toBe(entry.archiveBytes)
      expect(published.byteLength, path).toBe(entry.publicationBytes)
      expect(entry.archiveSha256, path).toBe(
        archivedDigestOf(index, path, manifest.archiveIndexSha256),
      )
      expect(entry.publicationBytes).toBeLessThanOrEqual(entry.archiveBytes)
      if (path === "index.json") {
        expect(published).toEqual(
          Buffer.from(JSON.stringify(derivePublishedIndex(index))),
        )
        const publishedIndex = JSON.parse(published.toString("utf8"))
        expect(publishedIndex.format).toBe(publishedIntegratedSnapshotFormat)
        expect(sourceRecordPointers(publishedIndex)).toEqual([])
      } else {
        expect(JSON.parse(published.toString("utf8")), path).toEqual(
          JSON.parse(archived.toString("utf8")),
        )
      }
      archiveBytes += entry.archiveBytes
      publicationBytes += entry.publicationBytes
    }
    // 合成夹具同样包含缩进排版与 sourceRecord，发布后必须更小。
    expect(publicationBytes).toBeLessThan(archiveBytes)
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).resolves.toEqual(manifest)
  })

  it("rejects a v1 manifest and a root-level publicationIndexSha256", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    const v1 = { ...manifest, format: "fairy-publication-manifest/v1" }
    await writeFile(manifestPath, JSON.stringify(v1))
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/发布清单版本错误/u)

    const duplicated = {
      ...manifest,
      publicationIndexSha256: manifest.files["index.json"].publicationSha256,
    }
    await writeFile(manifestPath, JSON.stringify(duplicated))
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/字段集合不一致/u)
  })

  it("rejects a v3 publication index even with a recomputed digest", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    const v3Bytes = Buffer.from(JSON.stringify(index))
    await writeFile(join(publication, "index.json"), v3Bytes)
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    manifest.files["index.json"].publicationSha256 = sha256(v3Bytes)
    manifest.files["index.json"].publicationBytes = v3Bytes.byteLength
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/派生/u)
  })

  it("rejects a self-consistent reinserted sourceRecord with a recomputed digest", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    const tampered = JSON.parse(
      await readFile(join(publication, "index.json"), "utf8"),
    )
    tampered.entities.agents.members["2"].sourceRecord = { injected: true }
    const tamperedBytes = Buffer.from(JSON.stringify(tampered))
    await writeFile(join(publication, "index.json"), tamperedBytes)
    manifest.files["index.json"].publicationSha256 = sha256(tamperedBytes)
    manifest.files["index.json"].publicationBytes = tamperedBytes.byteLength
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/派生|sourceRecord/u)
  })

  it("rejects publication bytes that no longer match the manifest", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    await writeFile(join(publication, "index.json"), "{}")
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/摘要不一致|字节数与清单不一致/)
  })

  it("rejects a manifest whose archive digest no longer matches the index", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    const path = Object.keys(manifest.files).find((entry) =>
      entry.startsWith("agents/"),
    )!
    manifest.files[path].archiveSha256 = "0".repeat(64)
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/归档摘要与索引不一致/)
  })

  it("rejects extra publication files outside the manifest", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    await writeFile(join(publication, "extra.json"), "{}")
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).rejects.toThrow(/未登记的文件或目录/)
  })

  it("anchors the manifest to real archive bytes when the archive is present", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
        archiveDirectory: artifactDirectory,
      }),
    ).resolves.toBeDefined()
    // 归档索引被替换后，清单的 archiveIndexSha256 必须被独立拒绝。
    const archivedIndexPath = join(artifactDirectory, "index.json")
    const archivedIndexText = await readFile(archivedIndexPath, "utf8")
    await writeFile(
      archivedIndexPath,
      archivedIndexText.replace(
        "synthetic-publication",
        "synthetic-publicatoin",
      ),
    )
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
        archiveDirectory: artifactDirectory,
      }),
    ).rejects.toThrow(/归档字节摘要不一致/)
  })

  it("keeps the archive digest of index.json independent from its publication digest", async () => {
    const { root, artifactDirectory, index } = await fixture()
    const publication = join(root, "published")
    const manifestPath = join(root, "publication.json")
    await mkdir(publication)
    const manifest = await writeMinifiedPublication({
      archiveDirectory: artifactDirectory,
      publicationDirectory: publication,
      manifestPath,
      index,
    })
    const archived = await readFile(join(artifactDirectory, "index.json"))
    const published = await readFile(join(publication, "index.json"))
    expect(manifest.files["index.json"]?.archiveSha256).toBe(sha256(archived))
    expect(manifest.archiveIndexSha256).toBe(sha256(archived))
    expect(manifest.files["index.json"]?.publicationSha256).not.toBe(
      sha256(archived),
    )
    // 归档索引先经格式化器排版，因此它的值必须与内存索引一致，但字节不必等于
    // serializeJson 的输出；发布侧字节必须等于派生 v4 的紧凑序列化。
    expect(JSON.parse(archived.toString("utf8"))).toEqual(
      JSON.parse(Buffer.from(serializeJson(index)).toString("utf8")),
    )
    expect(published).toEqual(
      Buffer.from(JSON.stringify(derivePublishedIndex(index))),
    )
    expect(manifest.files["index.json"]?.publicationBytes).toBeLessThan(
      manifest.files["index.json"]!.archiveBytes,
    )
  })
})
