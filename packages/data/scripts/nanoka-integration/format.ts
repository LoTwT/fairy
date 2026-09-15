import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url))
const require = createRequire(
  new URL("../../../../package.json", import.meta.url),
)
const formatterPath = join(
  dirname(require.resolve("oxfmt/package.json")),
  "bin/oxfmt",
)
const run = promisify(execFile)

/** 仅用于构建器的独占制品目录；显式配置与工作目录不受调用位置及外层忽略规则影响。 */
export async function formatGeneratedJson(
  artifactDirectory: string,
  paths: string[],
): Promise<void> {
  await run(
    process.execPath,
    [
      formatterPath,
      "--write",
      "--config",
      join(workspaceRoot, "oxfmt.config.ts"),
      "--disable-nested-config",
      ...paths,
    ],
    { cwd: artifactDirectory },
  )
}
