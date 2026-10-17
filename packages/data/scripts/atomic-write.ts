import { randomUUID } from "node:crypto"
import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export interface AtomicWriteOptions {
  /** 目标已存在时以 EEXIST 拒绝，保留 `writeFile` 的 `wx` 排他语义。 */
  exclusive?: boolean
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

/**
 * 原子写入文件：全部内容先写进同目录临时文件，再 rename 到目标路径，
 * 目标路径只会出现完整内容；任何失败路径都清理临时文件，不触碰目标。
 */
export async function writeFileAtomically(
  path: string,
  bytes: string | Uint8Array,
  { exclusive = false }: AtomicWriteOptions = {},
): Promise<void> {
  if (exclusive && (await pathExists(path))) {
    const error: NodeJS.ErrnoException = Object.assign(
      new Error(`EEXIST: file already exists, atomic write refused: ${path}`),
      { code: "EEXIST" },
    )
    throw error
  }
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}
