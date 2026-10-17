import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { writeFileAtomically } from "../scripts/atomic-write.ts"

vi.mock(import("node:fs/promises"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    writeFile: vi.fn(actual.writeFile),
    rename: vi.fn(actual.rename),
  }
})

const actualFs =
  await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises")
const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.mocked(writeFile).mockReset().mockImplementation(actualFs.writeFile)
  vi.mocked(rename).mockReset().mockImplementation(actualFs.rename)
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "fairy-atomic-write-"))
  temporaryDirectories.push(root)
  return root
}

describe("atomic file writes", () => {
  it("publishes complete content without temporary residue", async () => {
    const root = await temporaryRoot()
    const target = join(root, "nested", "artifact.json")
    await writeFileAtomically(target, '{"complete":true}')
    expect(await readFile(target, "utf8")).toBe('{"complete":true}')
    expect(await readdir(join(root, "nested"))).toEqual(["artifact.json"])
  })

  it("keeps the previous file and removes the partial temporary file when writing fails", async () => {
    const root = await temporaryRoot()
    const target = join(root, "artifact.json")
    await actualFs.writeFile(target, "previous")
    const diskError = Object.assign(new Error("disk full"), { code: "ENOSPC" })
    vi.mocked(writeFile).mockImplementationOnce(
      async (file, _data, options) => {
        await actualFs.writeFile(file, "{", options)
        throw diskError
      },
    )
    await expect(writeFileAtomically(target, "next")).rejects.toBe(diskError)
    expect(await readFile(target, "utf8")).toBe("previous")
    expect(await readdir(root)).toEqual(["artifact.json"])
  })

  it("keeps the previous file and removes the temporary file when renaming fails", async () => {
    const root = await temporaryRoot()
    const target = join(root, "artifact.json")
    await actualFs.writeFile(target, "previous")
    const moveError = new Error("rename failed")
    vi.mocked(rename).mockImplementationOnce(async () => {
      throw moveError
    })
    await expect(writeFileAtomically(target, "next")).rejects.toBe(moveError)
    expect(await readFile(target, "utf8")).toBe("previous")
    expect(await readdir(root)).toEqual(["artifact.json"])
  })

  it("refuses to replace an existing target in exclusive mode", async () => {
    const root = await temporaryRoot()
    const target = join(root, "artifact.json")
    await actualFs.writeFile(target, "previous")
    await expect(
      writeFileAtomically(target, "next", { exclusive: true }),
    ).rejects.toMatchObject({ code: "EEXIST" })
    expect(await readFile(target, "utf8")).toBe("previous")
    expect(await readdir(root)).toEqual(["artifact.json"])
  })
})
