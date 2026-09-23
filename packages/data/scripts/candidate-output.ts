import { lstat, mkdir, readdir, rename, rm } from "node:fs/promises"
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path"
import { directoryRoot } from "./nanoka-integration/files.ts"

// 保守保留兼容字符及完整大小写变体，包括 macOS 与 ASCII s 等价的长 s（ſ）。
function reservedDirectoryName(name: string): string {
  return name.normalize("NFKC").toUpperCase().toLowerCase().normalize("NFKC")
}

/** 只解析和验证路径；调用方通过后才能创建候选父目录或临时目录。 */
export async function resolveCandidateOutputDirectory(
  outputDirectory: string,
  integratedDirectory: string,
): Promise<string> {
  const requested = resolve(outputDirectory)
  try {
    await lstat(requested)
    throw new Error("Candidate output directory already exists")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  // 从已有祖先解析路径别名，不为检查不存在的父目录而提前写入。
  let ancestor = dirname(requested)
  const missing: string[] = []
  while (true) {
    try {
      await lstat(ancestor)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      missing.unshift(basename(ancestor))
      ancestor = dirname(ancestor)
    }
  }
  const output = join(
    await directoryRoot(ancestor),
    ...missing,
    basename(requested),
  )
  const integrated = resolve(integratedDirectory)
  const parent = await directoryRoot(dirname(integrated))
  // 尚不存在的控制目录无法 realpath；在其父目录下保留名称的大小写/Unicode 变体。
  const outputEntry = reservedDirectoryName(
    relative(parent, output).split(sep)[0],
  )
  for (const protectedDirectory of [
    join(parent, basename(integrated)),
    join(parent, `.${basename(integrated)}.fairy-state`),
  ]) {
    try {
      if ((await lstat(protectedDirectory)).isSymbolicLink())
        throw new Error(
          "Candidate source and control directories must not be symbolic links",
        )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
    const path = relative(protectedDirectory, output)
    if (
      outputEntry === reservedDirectoryName(basename(protectedDirectory)) ||
      path === "" ||
      (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
    )
      throw new Error(
        "Candidate output directory must be outside integrated and its control directory",
      )
  }
  return output
}

/** 独占创建目标后搬入候选内容；未取得目标的调用不能替换或清理其他任务的输出。 */
export async function installCandidateOutputDirectory(
  candidateDirectory: string,
  outputDirectory: string,
): Promise<void> {
  const entries = await readdir(candidateDirectory)
  await mkdir(outputDirectory)
  try {
    for (const entry of entries)
      await rename(
        join(candidateDirectory, entry),
        join(outputDirectory, entry),
      )
  } catch (error) {
    await rm(outputDirectory, { recursive: true, force: true })
    throw error
  }
}
