import { createHash } from "node:crypto"
import { constants } from "node:fs"
import { lstat, open, realpath } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import { decodeUtf8Json } from "../nanoka/policy.ts"
import { copyJson } from "../../src/integration/source-json.ts"
import type { SourceLocation } from "../../src/integration/source-json.ts"

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

/** 根目录允许系统路径别名（如 macOS /var）；以解析后的显式根作为边界。 */
export async function directoryRoot(path: string): Promise<string> {
  const root = await realpath(resolve(path))
  if (!(await lstat(root)).isDirectory()) throw new Error(`${path}: 不是目录`)
  return root
}

/** 所有子路径拒绝符号链接，即使链接仍位于根内；目录不通过扫描推导输入成员。 */
export async function checkedPath(root: string, path: string): Promise<string> {
  const segments = path.split("/")
  if (
    isAbsolute(path) ||
    segments.some(
      (part) => !part || part === "." || part === ".." || part.includes("\\"),
    )
  )
    throw new Error(`${path}: 路径越界或不是规范相对路径`)
  let target = root
  for (const [index, segment] of segments.entries()) {
    target = join(target, segment)
    const stat = await lstat(target)
    if (stat.isSymbolicLink()) throw new Error(`${path}: 不允许符号链接`)
    if (index < segments.length - 1 && !stat.isDirectory())
      throw new Error(`${path}: 父路径不是目录`)
  }
  const actual = await realpath(target)
  const fromRoot = relative(root, actual)
  if (
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  )
    throw new Error(`${path}: 路径越界`)
  return target
}

/** 使用同一个文件句柄分块读取，静态大小与增长均受硬上限约束；FIFO 不会阻塞。 */
export async function readBytes(
  root: string,
  path: string,
  maximumBytes: number,
): Promise<Uint8Array> {
  try {
    const target = await checkedPath(root, path)
    const before = await lstat(target)
    if (!before.isFile()) throw new Error("不是普通文件")
    const handle = await open(
      target,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    )
    try {
      const stat = await handle.stat()
      if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino)
        throw new Error("不是同一普通文件")
      await checkedPath(root, path)
      if (stat.size > maximumBytes)
        throw new Error(`字节数超过上限 ${maximumBytes}`)
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const buffer = Buffer.alloc(Math.min(65536, maximumBytes - size + 1))
        const { bytesRead } = await handle.read(buffer)
        if (!bytesRead) break
        size += bytesRead
        if (size > maximumBytes)
          throw new Error(`字节数超过上限 ${maximumBytes}`)
        chunks.push(buffer.subarray(0, bytesRead))
      }
      return Buffer.concat(chunks, size)
    } finally {
      await handle.close()
    }
  } catch (error) {
    throw new Error(
      `${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}

/** 解码、JSON 值校验与调用方摘要共用传入的同一份字节。 */
export function parseBytes(
  bytes: Uint8Array,
  resource: string,
  location: SourceLocation,
) {
  try {
    return copyJson(decodeUtf8Json(bytes, resource), location)
  } catch (error) {
    throw new Error(
      `${resource}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}
