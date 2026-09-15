import {
  recoverNanokaAgents,
  updateNanokaAgents,
  withNanokaCurrentDataset,
} from "./nanoka-integration/current.ts"
import { createCommandFailureHandler } from "./terminal.ts"

const usages = {
  update: "用法：update:nanoka:agents <rawRoot> <version> <targetDirectory>",
  recover: "用法：recover:nanoka:agents <targetDirectory>",
  verify: "用法：verify:nanoka:current <targetDirectory>",
}
const handleFailure = createCommandFailureHandler("Nanoka 代理人当前数据命令")
try {
  process.stdout.on("error", handleFailure)
  const [mode, ...args] = process.argv.slice(2)
  if (mode !== "update" && mode !== "recover" && mode !== "verify")
    throw new Error("需要 update、recover 或 verify 子命令")
  const usage = usages[mode]
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    process.stdout.write(`${usage}\n`)
  } else {
    const option = args.find(
      (argument) =>
        argument.startsWith("-") && argument !== "--help" && argument !== "-h",
    )
    if (option !== undefined) throw new Error(`未知选项：${option}；${usage}`)
    if (args.includes("--help") || args.includes("-h"))
      throw new Error(`--help/-h 只能单独使用；${usage}`)
    const count = mode === "update" ? 3 : 1
    if (args.length !== count || args.some((argument) => !argument))
      throw new Error(`需要 ${count} 个非空位置参数；${usage}`)
    const result =
      mode === "update"
        ? await updateNanokaAgents({
            rawRoot: args[0],
            version: args[1],
            targetDirectory: args[2],
          })
        : mode === "recover"
          ? await recoverNanokaAgents({ targetDirectory: args[0] })
          : await withNanokaCurrentDataset(
              args[0],
              async (artifactDirectory, index) => ({
                artifactDirectory,
                agentCount: index.scope.agentIds.length,
                detailLocales: index.source.detailLocales,
                verified: true,
              }),
            )
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  }
} catch (error) {
  handleFailure(error)
}
