import { spawn, spawnSync } from "node:child_process"
import { once } from "node:events"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { agentInput } from "./fixtures/agent-source.ts"
import { driveDiscInput } from "./fixtures/drive-disc-source.ts"
import { syntheticDriveDiscIds } from "./fixtures/synthetic-dataset.ts"

const packageDirectory = fileURLToPath(new URL("../", import.meta.url))
const repositoryDirectory = resolve(packageDirectory, "../..")
const generateCommand = "generate:integrated"
const verifyCommand = "verify:nanoka:snapshot"
const temporaryDirectories: string[] = []

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0))
    await rm(directory, { recursive: true, force: true })
})

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value))
}

async function fixture(parent = tmpdir(), ids = ["2", "10"]) {
  const root = await realpath(
    await mkdtemp(join(parent, "fairy-agent-cli-test-")),
  )
  temporaryDirectories.push(root)
  const rawRoot = join(root, "raw input with spaces", "nanoka")
  const temporaryParent = join(root, "output with spaces")
  const version = "synthetic-1"
  const versionRoot = join(rawRoot, version)
  const input = agentInput()
  await mkdir(temporaryParent)
  await writeJson(join(versionRoot, "manifest.json"), {
    zzz: { live: version, latest: version, available: [version] },
  })
  await writeJson(
    join(versionRoot, "character.json"),
    Object.fromEntries(ids.map((id) => [id, input.sourceRecord])),
  )
  for (const id of ids)
    for (const locale of input.detailLocales)
      await writeJson(join(versionRoot, locale, "character", `${id}.json`), {
        ...input.details[locale],
        id: Number(id),
      })
  // 默认登记表包含 drive-discs：equipment 输入使用真实驱动盘结构的合成成员。
  const driveDisc = driveDiscInput()
  await writeJson(
    join(versionRoot, "equipment.json"),
    Object.fromEntries(
      syntheticDriveDiscIds.map((id) => [id, driveDisc.sourceRecord]),
    ),
  )
  for (const id of syntheticDriveDiscIds)
    for (const locale of driveDisc.detailLocales)
      await writeJson(join(versionRoot, locale, "equipment", `${id}.json`), {
        ...driveDisc.details[locale],
        id: Number(id),
      })
  const preload = join(root, "offline guard.mjs")
  await writeFile(
    preload,
    `import fs from "node:fs/promises"
import http from "node:http"
import https from "node:https"
import { syncBuiltinESMExports } from "node:module"
const rejectNetwork = () => { throw new Error("unexpected network") }
globalThis.fetch = rejectNetwork
http.request = http.get = https.request = https.get = rejectNetwork
if (process.env.FAIRY_CLI_TEST_REJECT_IO === "1" &&
    /(?:current-nanoka-dataset|verify-nanoka-snapshot)[.]ts$/.test(process.argv[1] ?? "")) {
  for (const name of ["readFile", "realpath", "mkdtemp"])
    fs[name] = () => { throw new Error("unexpected file access") }
}
syncBuiltinESMExports()
if (process.env.FAIRY_CLI_TEST_WAIT_FOR_STDIN === "1") {
  delete process.env.FAIRY_CLI_TEST_WAIT_FOR_STDIN
  await new Promise((resolve) => process.stdin.once("data", resolve))
  process.stdin.pause()
}
`,
  )
  return {
    root,
    rawRoot,
    temporaryParent,
    targetDirectory: join(temporaryParent, "integrated"),
    version,
    versionRoot,
    preload,
  }
}

type Fixture = Awaited<ReturnType<typeof fixture>>

function commandEnvironment(input: Fixture, rejectIO = false) {
  return {
    ...process.env,
    NO_COLOR: "1",
    FORCE_COLOR: undefined,
    NODE_OPTIONS: `--import=${pathToFileURL(input.preload).href}`,
    FAIRY_CLI_TEST_REJECT_IO: rejectIO ? "1" : "0",
  }
}

function runCommand(
  input: Fixture,
  command: string,
  commandArguments: string[],
  fromRoot = true,
  rejectIO = false,
) {
  const result = spawnSync(
    "pnpm",
    [
      "--silent",
      ...(fromRoot ? ["--filter", "@randomplay/data"] : []),
      command,
      ...commandArguments,
    ],
    {
      cwd: fromRoot ? repositoryDirectory : packageDirectory,
      encoding: "utf8",
      timeout: 15_000,
      env: commandEnvironment(input, rejectIO),
    },
  )
  expect(result.error).toBeUndefined()
  expect(result.signal).toBeNull()
  return result
}

async function runCommandWithClosedStdout(
  input: Fixture,
  command: string,
  commandArguments: string[],
  rejectIO = false,
) {
  const child = spawn(
    "pnpm",
    ["--silent", "--filter", "@randomplay/data", command, ...commandArguments],
    {
      cwd: repositoryDirectory,
      timeout: 15_000,
      env: {
        ...commandEnvironment(input, rejectIO),
        FAIRY_CLI_TEST_WAIT_FOR_STDIN: "1",
      },
    },
  )
  const completed = once(child, "close")
  let stderr = ""
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk
  })
  // 先关闭真实管道的接收端，再放行 preload；不依赖调度速度或模拟 write。
  const stdoutClosed = once(child.stdout, "close")
  child.stdout.destroy()
  await stdoutClosed
  child.stdin.end("start\n")
  const [status, signal] = await completed
  expect(signal).toBeNull()
  return { status, stdout: "", stderr }
}

function success(result: ReturnType<typeof runCommand>) {
  expect(result.status).toBe(0)
  expect(result.stderr).toBe("")
  const receipt = JSON.parse(result.stdout)
  expect(receipt).toBeTypeOf("object")
  expect(Array.isArray(receipt)).toBe(false)
  return receipt
}

function failure(
  result: Pick<ReturnType<typeof runCommand>, "status" | "stdout" | "stderr">,
  message: string,
) {
  expect(result.status).toBe(1)
  expect(result.stdout).toBe("")
  expect(result.stderr).toContain(message)
  expect(result.stderr).not.toMatch(
    /\n\s+at |\[cause\]|unexpected (file access|network)/u,
  )
  expect(result.stderr.split("\n")).toHaveLength(2)
}

function build(input: Fixture) {
  return success(
    runCommand(input, generateCommand, [
      input.rawRoot,
      input.version,
      input.targetDirectory,
    ]),
  )
}

async function directoryBytes(root: string): Promise<Record<string, Buffer>> {
  const bytes: Record<string, Buffer> = {}
  for (const name of await readdir(root, {
    recursive: true,
    withFileTypes: true,
  }))
    if (name.isFile()) {
      const path = join(name.parentPath, name.name)
      bytes[relative(root, path)] = await readFile(path)
    }
  return bytes
}

describe("offline agent package commands", () => {
  it.each([generateCommand, verifyCommand])(
    "%s reports a closed stdout pipe while printing help",
    async (command) => {
      const input = await fixture()
      const result = await runCommandWithClosedStdout(
        input,
        command,
        ["--help"],
        true,
      )
      failure(result, "失败：write EPIPE")
      expect(await readdir(input.temporaryParent)).toEqual([])
    },
    30_000,
  )

  it.each([generateCommand, verifyCommand])(
    "%s reports a closed stdout pipe after producing a JSON receipt",
    async (command) => {
      const input = await fixture()
      const receipt = build(input)
      const rawBytes = await directoryBytes(input.rawRoot)
      const previousBuild = await directoryBytes(receipt.artifactDirectory)
      const directories = await readdir(input.temporaryParent)
      const commandArguments =
        command === generateCommand
          ? [input.rawRoot, input.version, input.targetDirectory]
          : [receipt.artifactDirectory]
      failure(
        await runCommandWithClosedStdout(input, command, commandArguments),
        "失败：write EPIPE",
      )
      expect(await directoryBytes(input.rawRoot)).toEqual(rawBytes)
      expect(await directoryBytes(receipt.artifactDirectory)).toEqual(
        previousBuild,
      )
      expect(
        success(runCommand(input, verifyCommand, [receipt.artifactDirectory]))
          .verified,
      ).toBe(true)
      const after = await readdir(input.temporaryParent)
      expect(after).toEqual(directories)
    },
    30_000,
  )

  it.each([
    { fromRoot: true, relativePaths: true, ids: ["2", "10"] },
    { fromRoot: false, relativePaths: false, ids: ["900001"] },
  ])(
    "builds and verifies through pnpm: $fromRoot / relative=$relativePaths",
    async ({ fromRoot, relativePaths, ids }) => {
      const input = await fixture(tmpdir(), ids)
      const argument = (path: string) =>
        relativePaths ? relative(packageDirectory, path) : path
      const receipt = success(
        runCommand(
          input,
          generateCommand,
          [
            argument(input.rawRoot),
            input.version,
            argument(input.targetDirectory),
          ],
          fromRoot,
        ),
      )
      expect(receipt.artifactDirectory).toBe(input.targetDirectory)
      expect(receipt.outcome).toBe("committed")
      expect(receipt.maintenanceReportPath).toBe(
        join(input.temporaryParent, ".integrated.fairy-state/maintenance.json"),
      )
      const index = JSON.parse(
        await readFile(join(receipt.artifactDirectory, "index.json"), "utf8"),
      )
      const driveDiscIds = syntheticDriveDiscIds
      expect(index.format).toBe("fairy-nanoka-integrated/v3")
      expect(index.entities.agents.memberIds).toEqual(ids)
      expect(index.entities["drive-discs"].memberIds).toEqual(driveDiscIds)
      expect(receipt.memberCounts).toEqual({
        "agents": ids.length,
        "drive-discs": driveDiscIds.length,
      })
      expect(receipt.format).toBe("fairy-nanoka-integrated/v3")
      // 回执给出可机器解析的按类别摘要与完整报告位置；详细差异只在制品外报告里。
      expect(receipt).toMatchObject({
        reportVersion: "fairy-nanoka-update-report/1",
        firstGeneration: true,
        result: "changed",
        sourceVersion: { before: null, after: input.version, changed: false },
        sourceChanged: false,
        rulesChanged: false,
        reviewRequired: false,
        categories: {
          "agents": {
            checked: true,
            presence: "added",
            result: "changed",
            members: { before: 0, after: ids.length, added: ids.length },
            files: { after: ids.length * 3, added: ids.length * 3 },
            sourceRecordsChanged: 0,
            rulesVersionChanged: false,
            reviewRequired: false,
          },
          "drive-discs": {
            checked: true,
            presence: "added",
            result: "changed",
            members: {
              before: 0,
              after: driveDiscIds.length,
              added: driveDiscIds.length,
            },
            files: {
              after: driveDiscIds.length * 3,
              added: driveDiscIds.length * 3,
            },
            sourceRecordsChanged: 0,
            rulesVersionChanged: false,
            reviewRequired: false,
          },
        },
      })
      expect(index.entities.agents.detailLocales).toEqual(
        agentInput().detailLocales,
      )
      expect(index.entities["drive-discs"].detailLocales).toEqual(
        agentInput().detailLocales,
      )
      expect(receipt.inputFileCount).toBe(
        // manifest、两类索引与全部成员详情；跨类别累计。
        3 + ids.length * 2 + driveDiscIds.length * 2,
      )
      expect(receipt.outputFileCount).toBe(
        Object.keys(await directoryBytes(receipt.artifactDirectory)).length,
      )
      const maintenance = JSON.parse(
        await readFile(receipt.maintenanceReportPath, "utf8"),
      )
      expect(Object.keys(maintenance.categories)).toEqual([
        "agents",
        "drive-discs",
      ])
      expect(
        maintenance.categories.agents.map(
          (entry: { memberId: string }) => entry.memberId,
        ),
      ).toEqual(ids)
      for (const entry of maintenance.categories.agents) {
        expect(entry.maintenance.diagnostics).toEqual([])
        expect(entry.maintenance.codeNameDifferences).toEqual([])
      }
      expect(
        maintenance.categories["drive-discs"].map(
          (entry: { memberId: string }) => entry.memberId,
        ),
      ).toEqual(driveDiscIds)
      for (const entry of maintenance.categories["drive-discs"]) {
        expect(entry.maintenance.diagnostics).toEqual([])
      }
      const verified = success(
        runCommand(
          input,
          verifyCommand,
          [argument(receipt.artifactDirectory)],
          fromRoot,
        ),
      )
      expect(verified).toEqual({
        artifactDirectory: receipt.artifactDirectory,
        format: receipt.format,
        categories: {
          "agents": {
            memberCount: receipt.memberCounts.agents,
            detailLocales: agentInput().detailLocales,
          },
          "drive-discs": {
            memberCount: receipt.memberCounts["drive-discs"],
            detailLocales: agentInput().detailLocales,
          },
        },
        verified: true,
      })
    },
    30_000,
  )

  it("repeats generation at the explicit target", async () => {
    const input = await fixture()
    const first = build(input)
    const before = await directoryBytes(first.artifactDirectory)
    const second = build(input)
    expect(second.outcome).toBe("unchanged")
    expect(second.artifactDirectory).toBe(first.artifactDirectory)
    expect(await directoryBytes(second.artifactDirectory)).toEqual(before)
  })

  for (const command of [generateCommand, verifyCommand]) {
    it.each(["--help", "-h"])(
      `${command} %s succeeds without file access`,
      async (help) => {
        const input = await fixture()
        const result = runCommand(input, command, [help], true, true)
        expect(result.status).toBe(0)
        expect(result.stderr).toBe("")
        expect(result.stdout).toContain(`用法：${command}`)
        expect(await readdir(input.temporaryParent)).toEqual([])
      },
    )

    it.each(["--help", "-h"])(
      `${command} rejects combined help %s before file access`,
      async (help) => {
        const input = await fixture()
        const positionalArguments =
          command === generateCommand ? ["raw", "v", "parent"] : ["artifact"]
        for (const commandArguments of [
          [help, "extra"],
          [...positionalArguments, help],
          [help, help],
        ]) {
          const result = runCommand(
            input,
            command,
            commandArguments,
            true,
            true,
          )
          failure(result, "--help/-h 只能单独使用")
          expect(result.stderr).toContain(`用法：${command}`)
          expect(result.stderr).not.toContain("未知选项")
        }
        failure(
          runCommand(input, command, [help, "--unknown"], true, true),
          "未知选项：--unknown",
        )
        expect(await readdir(input.temporaryParent)).toEqual([])
      },
      30_000,
    )

    it.each([
      [],
      [""],
      ["--unknown"],
      ["-x"],
      ...(command === generateCommand
        ? [
            ["missing"],
            ["raw", "v"],
            ["raw", "v", "parent", "extra"],
            ["raw", "--unknown"],
            ["raw", "v", "--unknown"],
            ["raw", "v", ""],
          ]
        : [
            ["artifact", "extra"],
            ["artifact", "--unknown"],
          ]),
    ])(
      `${command} rejects invalid arguments %j before file access`,
      async (...commandArguments) => {
        const input = await fixture()
        const result = runCommand(input, command, commandArguments, true, true)
        failure(
          result,
          commandArguments.some((argument) => argument.startsWith("-"))
            ? "未知选项："
            : "需要 ",
        )
        expect(result.stderr).toContain(`用法：${command}`)
        expect(await readdir(input.temporaryParent)).toEqual([])
      },
    )
  }

  it(
    "rejects missing input and version without creating the target",
    { timeout: 30_000 },
    async () => {
      const input = await fixture()
      const missing = join(input.root, "does not exist")
      for (const commandArguments of [
        [missing, input.version, input.targetDirectory],
        [input.rawRoot, "missing-version", input.targetDirectory],
      ])
        failure(runCommand(input, generateCommand, commandArguments), "ENOENT")
      failure(runCommand(input, verifyCommand, [missing]), "ENOENT")
      await expect(readdir(input.targetDirectory)).rejects.toMatchObject({
        code: "ENOENT",
      })
      expect(await readdir(input.temporaryParent)).toEqual([
        ".integrated.fairy-state",
      ])
      expect(await readdir(input.root)).not.toContain("does not exist")
    },
  )

  it(
    "cleans only the failed build and preserves successful artifacts and existing directories",
    { timeout: 30_000 },
    async () => {
      const input = await fixture()
      await writeJson(join(input.temporaryParent, "adjacent/keep.json"), {
        existing: true,
      })
      const receipt = build(input)
      const before = await directoryBytes(input.temporaryParent)
      const directories = await readdir(input.temporaryParent)
      await rm(join(input.versionRoot, "en/character/10.json"))
      failure(
        runCommand(input, generateCommand, [
          input.rawRoot,
          input.version,
          input.targetDirectory,
        ]),
        "zzz/synthetic-1/en/character/10.json",
      )
      expect(await readdir(input.temporaryParent)).toEqual(directories)
      expect(await directoryBytes(input.temporaryParent)).toEqual(before)
      expect(
        success(runCommand(input, verifyCommand, [receipt.artifactDirectory]))
          .verified,
      ).toBe(true)

      const invalid = join(input.root, "invalid artifact")
      await mkdir(invalid)
      failure(runCommand(input, verifyCommand, [invalid]), "index.json")
      await writeJson(join(invalid, "index.json"), {})
      failure(runCommand(input, verifyCommand, [invalid]), "格式版本错误")
      await writeFile(
        join(receipt.artifactDirectory, "agents/2/data.json"),
        "tampered",
      )
      const damaged = await directoryBytes(input.temporaryParent)
      failure(
        runCommand(input, verifyCommand, [receipt.artifactDirectory]),
        "agents/2/data.json: 摘要不一致",
      )
      expect(await directoryBytes(input.temporaryParent)).toEqual(damaged)
    },
  )

  it.each([
    {
      field: "unsafe\u001b\r\n\u202e\u2066",
      escaped: "unsafe\\u{001b}\\u{000d}\\u{000a}\\u{202e}\\u{2066}",
    },
    { field: `long-${"\u001b".repeat(5000)}`, escaped: "long-\\u{001b}" },
  ])(
    "escapes and bounds source pointers: $escaped",
    async ({ field, escaped }) => {
      const input = await fixture()
      const receipt = build(input)
      const before = await directoryBytes(input.temporaryParent)
      const detailPath = join(input.versionRoot, "zh/character/2.json")
      const detail = JSON.parse(await readFile(detailPath, "utf8"))
      detail[field] = Number.MAX_SAFE_INTEGER + 1
      await writeJson(detailPath, detail)
      const rawBytes = await readFile(detailPath)
      const failedBuild = runCommand(input, generateCommand, [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      failure(failedBuild, "zzz/synthetic-1/zh/character/2.json")
      expect(failedBuild.stderr).toContain('"2" [zh]')
      expect(await readFile(detailPath)).toEqual(rawBytes)
      expect(await directoryBytes(input.temporaryParent)).toEqual(before)

      const indexPath = join(receipt.artifactDirectory, "index.json")
      const index = JSON.parse(await readFile(indexPath, "utf8"))
      index.entities.agents.members["2"].sourceRecord[field] =
        Number.MAX_SAFE_INTEGER + 1
      await writeJson(indexPath, index)
      const invalidBytes = await readFile(indexPath)
      const failedVerify = runCommand(input, verifyCommand, [
        receipt.artifactDirectory,
      ])
      failure(failedVerify, "index.json")
      expect(failedVerify.stderr).toContain(
        "/entities/agents/members/2/sourceRecord/",
      )
      expect(await readFile(indexPath)).toEqual(invalidBytes)
      for (const result of [failedBuild, failedVerify]) {
        expect(result.stderr).toContain(escaped)
        expect(result.stderr.slice(0, -1)).not.toMatch(
          // oxlint-disable-next-line no-control-regex -- 回归检查要求拒绝终端原始控制字符。
          /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/u,
        )
        expect(result.stderr.length).toBeLessThan(4096 * 8 + 100)
        if (field.length > 4096) expect(result.stderr).toContain("…")
      }
    },
    30_000,
  )

  it(
    "Git ignores control and temporary build directories but keeps artifacts and adjacent files",
    { timeout: 30_000 },
    async () => {
      const input = await fixture(packageDirectory)
      const receipt = build(input)
      const rootBuild = await mkdtemp(
        join(repositoryDirectory, "fairy-integrated-snapshot-"),
      )
      temporaryDirectories.push(rootBuild)
      await writeJson(join(rootBuild, "maintenance.json"), {})
      for (const path of [
        receipt.maintenanceReportPath,
        join(rootBuild, "maintenance.json"),
      ]) {
        const result = spawnSync(
          "git",
          ["check-ignore", "--no-index", "-v", path],
          { cwd: repositoryDirectory, encoding: "utf8" },
        )
        expect(result.status).toBe(0)
        expect(result.stdout).toContain(
          path === receipt.maintenanceReportPath
            ? ".*.fairy-state/"
            : "fairy-integrated-snapshot-*/",
        )
      }
      const artifactIgnored = spawnSync(
        "git",
        [
          "check-ignore",
          "--no-index",
          join(receipt.artifactDirectory, "index.json"),
        ],
        {
          cwd: repositoryDirectory,
          encoding: "utf8",
        },
      )
      expect(artifactIgnored.status).toBe(1)
      for (const name of [
        "source.ts",
        "README.md",
        "dataset.json",
        "fairy-integrated-snapshot-not-a-directory.ts",
      ]) {
        const path = join(input.temporaryParent, name)
        await writeFile(path, "normal maintained file")
        const result = spawnSync("git", ["check-ignore", "--no-index", path], {
          cwd: repositoryDirectory,
          encoding: "utf8",
        })
        expect(result.status).toBe(1)
        expect(result.stdout).toBe("")
        expect(result.stderr).toBe("")
      }
    },
  )
})

it("current commands keep committed data when actual stdout pipes close", async () => {
  const input = await fixture()
  const target = join(input.root, "integrated")
  const args = [input.rawRoot, input.version, target]
  for (const command of [
    generateCommand,
    "recover:nanoka:current",
    "verify:nanoka:current",
    "migrate:nanoka:current",
  ]) {
    const help = await runCommandWithClosedStdout(
      input,
      command,
      ["--help"],
      true,
    )
    failure(help, "write EPIPE")
    const completed = await runCommandWithClosedStdout(
      input,
      command,
      command === generateCommand ? args : [target],
    )
    failure(completed, "write EPIPE")
    expect(
      success(runCommand(input, "verify:nanoka:current", [target])).verified,
    ).toBe(true)
  }
}, 30_000)
