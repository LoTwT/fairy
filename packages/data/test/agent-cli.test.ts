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

const packageDirectory = fileURLToPath(new URL("../", import.meta.url))
const repositoryDirectory = resolve(packageDirectory, "../..")
const integrateCommand = "integrate:nanoka:agents"
const verifyCommand = "verify:nanoka:agents"
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
    /(?:build|verify|current)-nanoka-agents[.]ts$/.test(process.argv[1] ?? "")) {
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
  return { root, rawRoot, temporaryParent, version, versionRoot, preload }
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
    runCommand(input, integrateCommand, [
      input.rawRoot,
      input.version,
      input.temporaryParent,
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
  it.each([integrateCommand, verifyCommand])(
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

  it.each([integrateCommand, verifyCommand])(
    "%s reports a closed stdout pipe after producing a JSON receipt",
    async (command) => {
      const input = await fixture()
      const receipt = build(input)
      const rawBytes = await directoryBytes(input.rawRoot)
      const previousBuild = await directoryBytes(receipt.buildDirectory)
      const directories = await readdir(input.temporaryParent)
      const commandArguments =
        command === integrateCommand
          ? [input.rawRoot, input.version, input.temporaryParent]
          : [receipt.artifactDirectory]
      failure(
        await runCommandWithClosedStdout(input, command, commandArguments),
        "失败：write EPIPE",
      )
      expect(await directoryBytes(input.rawRoot)).toEqual(rawBytes)
      expect(await directoryBytes(receipt.buildDirectory)).toEqual(
        previousBuild,
      )
      expect(
        success(runCommand(input, verifyCommand, [receipt.artifactDirectory]))
          .verified,
      ).toBe(true)
      const after = await readdir(input.temporaryParent)
      if (command === integrateCommand) {
        const completedBuilds = after.filter(
          (name) => !directories.includes(name),
        )
        expect(completedBuilds).toHaveLength(1)
        const artifactDirectory = join(
          input.temporaryParent,
          completedBuilds[0],
          "integrated/nanoka",
        )
        expect(
          success(runCommand(input, verifyCommand, [artifactDirectory]))
            .verified,
        ).toBe(true)
      } else {
        expect(after).toEqual(directories)
      }
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
          integrateCommand,
          [
            argument(input.rawRoot),
            input.version,
            argument(input.temporaryParent),
          ],
          fromRoot,
        ),
      )
      expect(dirname(receipt.buildDirectory)).toBe(input.temporaryParent)
      expect(receipt.artifactDirectory).toBe(
        join(receipt.buildDirectory, "integrated/nanoka"),
      )
      expect(receipt.maintenanceReportPath).toBe(
        join(receipt.buildDirectory, "maintenance.json"),
      )
      const index = JSON.parse(
        await readFile(join(receipt.artifactDirectory, "index.json"), "utf8"),
      )
      expect(index.scope.agentIds).toEqual(ids)
      expect(receipt.agentCount).toBe(ids.length)
      expect(receipt.detailLocales).toEqual(index.source.detailLocales)
      expect(receipt.detailLocales).toEqual(agentInput().detailLocales)
      expect(receipt.inputFileCount).toBe(
        2 + ids.length * receipt.detailLocales.length,
      )
      expect(receipt.outputFileCount).toBe(
        Object.keys(await directoryBytes(receipt.artifactDirectory)).length,
      )
      const maintenance = JSON.parse(
        await readFile(receipt.maintenanceReportPath, "utf8"),
      )
      expect(receipt.unknownFieldCount).toBe(maintenance.diagnostics.length)
      expect(receipt.codeNameDifferenceCount).toBe(
        maintenance.codeNameDifferences.length,
      )
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
        agentCount: receipt.agentCount,
        detailLocales: receipt.detailLocales,
        verified: true,
      })
    },
    30_000,
  )

  it(
    "uses a fresh system temporary directory when the parent is omitted",
    { timeout: 30_000 },
    async () => {
      const input = await fixture()
      const first = success(
        runCommand(input, integrateCommand, [input.rawRoot, input.version]),
      )
      temporaryDirectories.push(first.buildDirectory)
      const second = success(
        runCommand(input, integrateCommand, [input.rawRoot, input.version]),
      )
      temporaryDirectories.push(second.buildDirectory)
      expect(dirname(first.buildDirectory)).toBe(await realpath(tmpdir()))
      expect(second.buildDirectory).not.toBe(first.buildDirectory)
      expect(await directoryBytes(first.buildDirectory)).toEqual(
        await directoryBytes(second.buildDirectory),
      )
    },
  )

  for (const command of [integrateCommand, verifyCommand]) {
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
          command === integrateCommand ? ["raw", "v", "parent"] : ["artifact"]
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
      ...(command === integrateCommand
        ? [
            ["missing"],
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
    "rejects missing input, version and output parent without creating them",
    { timeout: 30_000 },
    async () => {
      const input = await fixture()
      const missing = join(input.root, "does not exist")
      for (const commandArguments of [
        [missing, input.version, input.temporaryParent],
        [input.rawRoot, "missing-version", input.temporaryParent],
        [input.rawRoot, input.version, missing],
      ])
        failure(runCommand(input, integrateCommand, commandArguments), "ENOENT")
      failure(runCommand(input, verifyCommand, [missing]), "ENOENT")
      expect(await readdir(input.temporaryParent)).toEqual([])
      expect(await readdir(input.root)).not.toContain("does not exist")
    },
  )

  it(
    "cleans only the failed build and preserves successful artifacts and existing directories",
    { timeout: 30_000 },
    async () => {
      const input = await fixture()
      await writeJson(
        join(input.temporaryParent, "integrated/nanoka/keep.json"),
        { existing: true },
      )
      const receipt = build(input)
      const before = await directoryBytes(input.temporaryParent)
      const directories = await readdir(input.temporaryParent)
      await rm(join(input.versionRoot, "en/character/10.json"))
      failure(
        runCommand(input, integrateCommand, [
          input.rawRoot,
          input.version,
          input.temporaryParent,
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
      failure(runCommand(input, verifyCommand, [invalid]), "字段集合不一致")
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
      const failedBuild = runCommand(input, integrateCommand, [
        input.rawRoot,
        input.version,
        input.temporaryParent,
      ])
      failure(failedBuild, "zzz/synthetic-1/zh/character/2.json")
      expect(failedBuild.stderr).toContain('"2" [zh]')
      expect(await readFile(detailPath)).toEqual(rawBytes)
      expect(await directoryBytes(input.temporaryParent)).toEqual(before)

      const indexPath = join(receipt.artifactDirectory, "index.json")
      const index = JSON.parse(await readFile(indexPath, "utf8"))
      index.agents["2"].sourceRecord[field] = Number.MAX_SAFE_INTEGER + 1
      await writeJson(indexPath, index)
      const invalidBytes = await readFile(indexPath)
      const failedVerify = runCommand(input, verifyCommand, [
        receipt.artifactDirectory,
      ])
      failure(failedVerify, "index.json")
      expect(failedVerify.stderr).toContain("/agents/2/sourceRecord/")
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
    "Git ignores actual build directories at any depth but keeps adjacent source and documentation",
    { timeout: 30_000 },
    async () => {
      const input = await fixture(packageDirectory)
      const receipt = build(input)
      const rootBuild = await mkdtemp(
        join(repositoryDirectory, "fairy-nanoka-agents-"),
      )
      temporaryDirectories.push(rootBuild)
      await writeJson(join(rootBuild, "maintenance.json"), {})
      for (const path of [
        receipt.artifactDirectory,
        receipt.maintenanceReportPath,
        join(rootBuild, "maintenance.json"),
      ]) {
        const result = spawnSync(
          "git",
          ["check-ignore", "--no-index", "-v", path],
          { cwd: repositoryDirectory, encoding: "utf8" },
        )
        expect(result.status).toBe(0)
        expect(result.stdout).toContain("fairy-nanoka-agents-*/")
      }
      for (const name of [
        "source.ts",
        "README.md",
        "dataset.json",
        "fairy-nanoka-agents-not-a-directory.ts",
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
  const target = join(input.root, "integrated", "nanoka")
  const args = [input.rawRoot, input.version, target]
  for (const command of [
    "update:nanoka:agents",
    "recover:nanoka:agents",
    "verify:nanoka:current",
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
      command === "update:nanoka:agents" ? args : [target],
    )
    failure(completed, "write EPIPE")
    expect(
      success(runCommand(input, "verify:nanoka:current", [target])).verified,
    ).toBe(true)
  }
}, 30_000)
