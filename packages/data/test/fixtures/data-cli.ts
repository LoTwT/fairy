import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * data 包 CLI 脚本到实际 Node 入口的映射，与 package.json 的 scripts 保持一致。
 *
 * 帮助、参数校验与错误矩阵只需要脚本自身的退出码与输出；直接执行同一入口可跳过
 * 每次约 0.4 秒的包管理器启动。脚本映射、根目录与包目录调用、相对路径、真实管道与
 * EPIPE 仍由 agent-cli.test.ts 中经过 pnpm 的用例覆盖。
 */
const cliScripts = {
  "generate:integrated": {
    entry: "scripts/current-nanoka-dataset.ts",
    nodeOptions: ["--disable-warning=ExperimentalWarning"],
    prefixArguments: ["generate"],
  },
  "verify:nanoka:current": {
    entry: "scripts/current-nanoka-dataset.ts",
    nodeOptions: ["--disable-warning=ExperimentalWarning"],
    prefixArguments: ["verify"],
  },
  "recover:nanoka:current": {
    entry: "scripts/current-nanoka-dataset.ts",
    nodeOptions: ["--disable-warning=ExperimentalWarning"],
    prefixArguments: ["recover"],
  },
  "migrate:nanoka:current": {
    entry: "scripts/current-nanoka-dataset.ts",
    nodeOptions: ["--disable-warning=ExperimentalWarning"],
    prefixArguments: ["migrate"],
  },
  "verify:nanoka:snapshot": {
    entry: "scripts/verify-nanoka-snapshot.ts",
    nodeOptions: [],
    prefixArguments: [],
  },
} as const

export type DataCliCommand = keyof typeof cliScripts

const packageDirectory = fileURLToPath(new URL("../../", import.meta.url))

/** 以与包脚本相同的 Node 入口与参数直接执行 CLI；cwd 与包脚本一致为包目录。 */
export function runDataCli(
  command: DataCliCommand,
  commandArguments: string[],
  options: { env?: NodeJS.ProcessEnv; timeout?: number } = {},
) {
  const script = cliScripts[command]
  return spawnSync(
    process.execPath,
    [
      ...script.nodeOptions,
      join(packageDirectory, script.entry),
      ...script.prefixArguments,
      ...commandArguments,
    ],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      timeout: options.timeout ?? 20_000,
      env: options.env ?? process.env,
    },
  )
}
