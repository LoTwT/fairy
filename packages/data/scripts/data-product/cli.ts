import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"

/** 用 realpath 比较入口，避免通过符号链接调用时静默不执行。 */
export function isMainModuleEntry(
  entry: string | undefined,
  moduleUrl: string,
): boolean {
  if (entry === undefined) return false
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(moduleUrl))
  } catch {
    return false
  }
}
