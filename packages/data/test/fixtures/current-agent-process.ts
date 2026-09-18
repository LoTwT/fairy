import filesystem, { readFile } from "node:fs/promises"
import { syncBuiltinESMExports } from "node:module"
import { join } from "node:path"
import {
  generateCurrentDataset,
  migrateCurrentDataset,
  recoverCurrentDataset,
  updateCurrentDataset,
  withCurrentDataset,
} from "../../scripts/nanoka-integration/current.ts"
import {
  nanokaAgentsSnapshotEntity,
  onboardedSnapshotEntities,
} from "../../scripts/nanoka-integration/snapshot-entities.ts"
import { syntheticSnapshotEntity } from "./snapshot-entities.ts"

// 只供合成子进程实验；不接受生产 CLI 的故障注入环境变量。
globalThis.fetch = async () => {
  throw new Error("测试禁止联网")
}
const options = JSON.parse(await readFile(process.argv[2], "utf8"))
// 父测试用 registry 标记选择与 fixture 相同的类别登记表；默认沿用生产登记表。
const entities =
  options.registry === "synthetic"
    ? [nanokaAgentsSnapshotEntity, syntheticSnapshotEntity]
    : onboardedSnapshotEntities
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
    const agents = index.entities.agents
    await remove(
      join(target, agents.members[agents.memberIds[0]].files.data.path),
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
const write = filesystem.writeFile
filesystem.writeFile = async (path, data, writeOptions) => {
  if (
    options.pause === "initialization-partially-written" &&
    String(path).endsWith("/state.next")
  ) {
    const content = Buffer.from(data as Uint8Array)
    await write(
      path,
      content.subarray(0, Math.floor(content.length / 2)),
      writeOptions,
    )
    await checkpoint("initialization-partially-written")
  }
  return write(path, data, writeOptions)
}
syncBuiltinESMExports()
try {
  const result =
    options.mode === "recover"
      ? await recoverCurrentDataset({
          targetDirectory: options.targetDirectory,
          checkpoint,
          entities,
        })
      : options.mode === "migrate"
        ? await migrateCurrentDataset({
            targetDirectory: options.targetDirectory,
            checkpoint,
            entities,
          })
        : options.mode === "read"
          ? await withCurrentDataset(
              options.targetDirectory,
              async (directory, index) => {
                await checkpoint("reading")
                return {
                  index,
                  bytes: await readFile(`${directory}/index.json`, "utf8"),
                }
              },
              { entities },
            )
          : await (
              options.mode === "generate"
                ? generateCurrentDataset
                : updateCurrentDataset
            )({ ...options, checkpoint, entities })
  process.stdout.write(JSON.stringify(result))
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  process.disconnect?.()
}
