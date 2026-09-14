import { directoryRoot } from "./nanoka-integration/files.ts"
import { verifyNanokaAgentArtifact } from "./nanoka-integration/verify.ts"
import { createCommandFailureHandler } from "./terminal.ts"

const usage = "用法：verify:nanoka:agents <artifactDirectory>"
const handleFailure = createCommandFailureHandler("Nanoka 代理人验证命令")

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
    if (commandArguments.length !== 1 || !commandArguments[0])
      throw new Error(`需要 1 个非空位置参数；${usage}`)
    const artifactDirectory = await directoryRoot(commandArguments[0])
    const index = await verifyNanokaAgentArtifact({ artifactDirectory })
    process.stdout.write(
      `${JSON.stringify(
        {
          artifactDirectory,
          agentCount: index.scope.agentIds.length,
          detailLocales: index.source.detailLocales,
          verified: true,
        },
        null,
        2,
      )}\n`,
    )
  }
} catch (error) {
  handleFailure(error)
}
