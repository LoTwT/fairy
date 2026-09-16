import { spawn } from "node:child_process"
import { once } from "node:events"
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { stripVTControlCharacters } from "node:util"
import { afterEach, describe, expect, it } from "vitest"

const testDirectory = dirname(fileURLToPath(import.meta.url))
const packageDirectory = join(testDirectory, "..")
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe("Nanoka CLI", () => {
  it("reports a closed stdout pipe without interrupting cache writes or printing a stack", async () => {
    const result = await runCli(["fetch", "--entity", "character"], {
      closedStdout: true,
    })
    expect(result.code).toBe(1)
    expect(result.stdout).toBe("")
    expect(result.stderr).toBe("Nanoka 数据源命令失败：write EPIPE\n")
    expect(result.requests).toHaveLength(4)
    expect(
      JSON.parse(
        await readFile(
          join(result.directory, "raw/nanoka/3.0/character.json"),
          "utf8",
        ),
      ),
    ).toEqual({ "1": { name: "Fixture" } })
  }, 10_000)

  it("keeps reporting a later fetch failure after the output failure", async () => {
    const result = await runCli(["fetch", "--entity", "character"], {
      closedStdout: true,
      invalidDetail: true,
    })
    expect(result.code).toBe(1)
    // The output failure is reported once and does not consume the fetch failure report.
    const reports = result.stderr.split("\n").filter(Boolean)
    expect(reports).toHaveLength(2)
    expect(reports[0]).toBe("Nanoka 数据源命令失败：write EPIPE")
    expect(reports[1]).toMatch(
      /^Nanoka 数据源命令失败：character (?:zh|en)\/1 详情必须是普通对象$/u,
    )
    expect(result.requests.length).toBeGreaterThan(2)
    expect(
      await readdir(join(result.directory, "raw", "nanoka", "3.0")),
    ).not.toContain("character.json")
  }, 10_000)

  it.each([
    { arguments_: [], version: "3.0", selectedBy: "live" },
    {
      arguments_: ["--channel", "latest"],
      version: "3.1",
      selectedBy: "latest",
    },
    { arguments_: ["--version", "3.0"], version: "3.0", selectedBy: "version" },
  ])(
    "fetches $version via $selectedBy in a non-interactive terminal",
    async ({ arguments_, version, selectedBy }) => {
      const result = await runCli([
        "fetch",
        "--entity",
        "character",
        ...arguments_,
      ])
      expect(result.code).toBe(0)
      expect(result.stderr).toBe("")
      expect(result.stdout).toContain(`已选择版本：${version}（${selectedBy}）`)
      expect(result.stdout).toContain("character 详情进度：2/2")
      expect(result.stdout).toContain(`Nanoka 本地缓存更新完成：${version}`)
      expect(result.stdout).toContain("本次资源: 4")
      expect(result.stdout).not.toContain("请选择")
      expect(result.requests).toHaveLength(4)
      expect(result.requests[0]).toBe("/manifest.json")
      expect(result.requests.slice(1)).toEqual(
        expect.arrayContaining([
          `/zzz/${version}/character.json`,
          `/zzz/${version}/zh/character/1.json`,
          `/zzz/${version}/en/character/1.json`,
        ]),
      )
      expect(
        JSON.parse(
          await readFile(
            join(result.directory, "raw", "nanoka", version, "character.json"),
            "utf8",
          ),
        ),
      ).toEqual({ "1": { name: "Fixture" } })
    },
    10_000,
  )

  it("waits for a valid interactive selection before fetching version resources", async () => {
    const result = await runCli(["fetch", "--entity", "character"], {
      answers: ["invalid", "2"],
    })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("输入无效")
    expect(result.stdout).toContain("已选择版本：3.1（interactive）")
    expect(result.stdout).toContain("Nanoka 本地缓存更新完成：3.1")
    expect(result.requestsBeforeAnswers).toEqual([
      ["/manifest.json"],
      ["/manifest.json"],
    ])
    expect(result.requests).toHaveLength(4)
    expect(
      result.requests.slice(1).every((path) => path.startsWith("/zzz/3.1/")),
    ).toBe(true)
  }, 10_000)

  it("rejects unknown arguments before fetching anything", async () => {
    const result = await runCli(["fetch", "--unknown"])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("未知参数")
    expect(result.requests).toEqual([])
    expect(await readdir(result.directory)).not.toContain("raw")
  }, 10_000)

  it("rejects an unavailable version after fetching only the manifest", async () => {
    const result = await runCli([
      "fetch",
      "--version",
      "4.0",
      "--entity",
      "character",
    ])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("不在 manifest available")
    expect(result.requests).toEqual(["/manifest.json"])
    expect(await readdir(result.directory)).not.toContain("raw")
  }, 10_000)

  it("reports fetch failures with a failing exit code and no completion message or index", async () => {
    const result = await runCli(["fetch", "--entity", "character"], {
      invalidDetail: true,
    })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("Nanoka 数据源命令失败")
    expect(result.stderr).toContain("详情必须是普通对象")
    expect(result.stdout).not.toContain("本地缓存更新完成")
    expect(result.requests.length).toBeGreaterThan(2)
    expect(
      await readdir(join(result.directory, "raw", "nanoka", "3.0")),
    ).not.toContain("character.json")
  }, 10_000)
})

async function runCli(
  arguments_: string[],
  options: {
    answers?: string[]
    invalidDetail?: boolean
    closedStdout?: boolean
  } = {},
) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "nanoka-cli-")))
  temporaryDirectories.push(directory)
  await cp(join(packageDirectory, "scripts"), join(directory, "scripts"), {
    recursive: true,
  })
  await cp(join(packageDirectory, "src"), join(directory, "src"), {
    recursive: true,
  })
  await cp(
    join(packageDirectory, "source-registry.json"),
    join(directory, "source-registry.json"),
  )
  await writeFile(join(directory, "package.json"), '{"type":"module"}\n')
  const preloadPath = join(directory, "nanoka-cli-preload#%.ts")
  await cp(
    join(testDirectory, "fixtures", "nanoka-cli-preload.ts"),
    preloadPath,
  )
  const requestLog = join(directory, "requests.log")
  const child = spawn(
    process.execPath,
    [
      "--import",
      pathToFileURL(preloadPath).href,
      join(directory, "scripts", "nanoka-source.ts"),
      ...arguments_,
    ],
    {
      cwd: directory,
      env: {
        ...process.env,
        NO_COLOR: "1",
        FORCE_COLOR: undefined,
        NANOKA_CLI_TEST_REQUEST_LOG: requestLog,
        NANOKA_CLI_TEST_TTY: options.answers === undefined ? "0" : "1",
        NANOKA_CLI_TEST_INVALID_DETAIL: options.invalidDetail ? "1" : "0",
        NANOKA_CLI_TEST_WAIT_FOR_STDIN: options.closedStdout ? "1" : "0",
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  )
  let stdout = ""
  let stderr = ""
  let answeredPrompts = 0
  let responseQueue = Promise.resolve()
  const requestsBeforeAnswers: string[][] = []
  const answers = options.answers ?? []
  child.stdout.setEncoding("utf8")
  child.stderr.setEncoding("utf8")
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk
    const promptCount = (stripVTControlCharacters(stdout).match(/^> /gmu) ?? [])
      .length
    if (promptCount > answeredPrompts && answeredPrompts < answers.length) {
      const answer = answers[answeredPrompts]
      answeredPrompts += 1
      responseQueue = responseQueue.then(async () => {
        requestsBeforeAnswers.push(await readRequests(requestLog))
        child.stdin.write(`${answer}\n`)
      })
    }
  })
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk
  })
  const completed = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject)
    child.once("close", resolve)
  })
  const timeout = setTimeout(() => child.kill(), 8_000)
  try {
    if (options.closedStdout) {
      // Close the real pipe before the preload lets the command start.
      const stdoutClosed = once(child.stdout, "close")
      child.stdout.destroy()
      await stdoutClosed
      child.stdin.end("start\n")
    } else if (options.answers === undefined) child.stdin.end()
    const code = await completed
    await responseQueue
    return {
      code,
      stdout: stripVTControlCharacters(stdout),
      stderr,
      directory,
      requests: await readRequests(requestLog),
      requestsBeforeAnswers,
    }
  } finally {
    clearTimeout(timeout)
    child.kill()
  }
}

async function readRequests(path: string): Promise<string[]> {
  return (await readFile(path, "utf8")).split("\n").filter(Boolean)
}
