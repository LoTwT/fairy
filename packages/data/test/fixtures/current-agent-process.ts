import filesystem, { readFile } from "node:fs/promises"
import { syncBuiltinESMExports } from "node:module"
import { join } from "node:path"
import {
  recoverNanokaAgents,
  updateNanokaAgents,
  withNanokaCurrentDataset,
} from "../../scripts/nanoka-integration/current.ts"

// 只供合成子进程实验；不接受生产 CLI 的故障注入环境变量。
globalThis.fetch = async () => {
  throw new Error("测试禁止联网")
}
const options = JSON.parse(await readFile(process.argv[2], "utf8"))
const checkpoint = async (stage: string) => {
  if (stage === options.pause) {
    process.send?.({ stage })
    await new Promise<void>((resolve) =>
      process.once("message", () => resolve()),
    )
  }
}
// 清理中途终止：先实际删除一个事务文件，再停住；测试不依赖 rm 的系统调用调度时机。
const remove = filesystem.rm
filesystem.rm = async (path, removeOptions) => {
  const target = String(path)
  if (
    options.pause === "backup-partially-cleaned" &&
    target.endsWith(".fairy-state/backup")
  ) {
    const index = JSON.parse(await readFile(join(target, "index.json"), "utf8"))
    await remove(
      join(target, index.agents[index.scope.agentIds[0]].files.stats.path),
    )
    await checkpoint("backup-partially-cleaned")
  }
  if (
    options.pause === "work-partially-cleaned" &&
    target.endsWith(".fairy-state/work")
  ) {
    await remove(join(target, "candidate/index.json"))
    await checkpoint("work-partially-cleaned")
  }
  return remove(path, removeOptions)
}
syncBuiltinESMExports()
try {
  const result =
    options.mode === "recover"
      ? await recoverNanokaAgents({
          targetDirectory: options.targetDirectory,
          checkpoint,
        })
      : options.mode === "read"
        ? await withNanokaCurrentDataset(
            options.targetDirectory,
            async (directory, index) => {
              await checkpoint("reading")
              return {
                index,
                bytes: await readFile(`${directory}/index.json`, "utf8"),
              }
            },
          )
        : await updateNanokaAgents({ ...options, checkpoint })
  process.stdout.write(JSON.stringify(result))
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  process.disconnect?.()
}
