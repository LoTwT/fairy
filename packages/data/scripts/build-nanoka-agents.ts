import { buildNanokaAgents } from "./nanoka-integration/build.ts"
import { createCommandFailureHandler } from "./terminal.ts"

const usage =
  "用法：integrate:nanoka:agents <rawRoot> <version> [temporaryParent]"
const handleFailure = createCommandFailureHandler("Nanoka 代理人整合命令")

try {
  process.stdout.on("error", handleFailure)
  const commandArguments = process.argv.slice(2)
  if (
    commandArguments.length === 1 &&
    (commandArguments[0] === "--help" || commandArguments[0] === "-h")
  ) {
    process.stdout.write(`${usage}\n`)
  } else {
    const option = commandArguments.find(
      (argument) =>
        argument.startsWith("-") && argument !== "--help" && argument !== "-h",
    )
    if (option !== undefined) throw new Error(`未知选项：${option}；${usage}`)
    if (commandArguments.includes("--help") || commandArguments.includes("-h"))
      throw new Error(`--help/-h 只能单独使用；${usage}`)
    const [rawRoot, version, temporaryParent] = commandArguments
    if (
      !rawRoot ||
      !version ||
      commandArguments.length > 3 ||
      temporaryParent === ""
    )
      throw new Error(`需要 2 或 3 个非空位置参数；${usage}`)
    const result = await buildNanokaAgents({
      rawRoot,
      version,
      ...(temporaryParent === undefined ? {} : { temporaryParent }),
    })
    process.stdout.write(
      `${JSON.stringify(
        {
          buildDirectory: result.buildDirectory,
          artifactDirectory: result.artifactDirectory,
          maintenanceReportPath: result.maintenanceReportPath,
          agentCount: result.index.scope.agentIds.length,
          detailLocales: result.index.source.detailLocales,
          inputFileCount: result.inputFileCount,
          outputFileCount: result.outputFileCount,
          unknownFieldCount: result.maintenance.diagnostics.length,
          codeNameDifferenceCount:
            result.maintenance.codeNameDifferences.length,
        },
        null,
        2,
      )}\n`,
    )
  }
} catch (error) {
  handleFailure(error)
}
