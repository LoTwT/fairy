import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { serializeJson } from "../src/integration/serialize-json.ts"
import {
  archivedDigestOf,
  minifyJsonBytes,
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

  it("preserves every JSON value and key order while shrinking the archive bytes", async () => {
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
    let archiveBytes = 0
    let publicationBytes = 0
    for (const [path, entry] of Object.entries(manifest.files)) {
      const archived = await readFile(join(artifactDirectory, path))
      const published = await readFile(join(publication, path))
      expect(JSON.parse(published.toString("utf8")), path).toEqual(
        JSON.parse(archived.toString("utf8")),
      )
      expect(sha256(archived), path).toBe(entry.archiveSha256)
      expect(sha256(published), path).toBe(entry.publicationSha256)
      expect(archived.byteLength, path).toBe(entry.archiveBytes)
      expect(published.byteLength, path).toBe(entry.publicationBytes)
      expect(entry.archiveSha256, path).toBe(
        archivedDigestOf(index, path, manifest.archiveIndexSha256),
      )
      expect(entry.publicationBytes).toBeLessThanOrEqual(entry.archiveBytes)
      archiveBytes += entry.archiveBytes
      publicationBytes += entry.publicationBytes
    }
    // 合成夹具同样包含缩进排版，压缩后必须更小。
    expect(publicationBytes).toBeLessThan(archiveBytes)
    await expect(
      verifyMinifiedPublication({
        publicationDirectory: publication,
        manifestPath,
        index,
      }),
    ).resolves.toEqual(manifest)
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
    expect(manifest.files["index.json"]?.archiveSha256).toBe(sha256(archived))
    expect(manifest.archiveIndexSha256).toBe(sha256(archived))
    expect(manifest.files["index.json"]?.publicationSha256).not.toBe(
      sha256(archived),
    )
    // 归档索引先经格式化器排版，因此它的值必须与内存索引一致，但字节不必等于
    // serializeJson 的输出；发布侧摘要只描述压缩后的实际字节。
    expect(JSON.parse(archived.toString("utf8"))).toEqual(
      JSON.parse(Buffer.from(serializeJson(index)).toString("utf8")),
    )
    expect(manifest.files["index.json"]?.publicationBytes).toBeLessThan(
      manifest.files["index.json"]!.archiveBytes,
    )
  })
})
