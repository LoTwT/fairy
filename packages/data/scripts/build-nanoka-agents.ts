import { buildNanokaAgents } from "./nanoka-integration/build.ts"

// 工作区显式脚本，位置参数不提供自动版本选择，也不接入 build/test/pack。
const [rawRoot, version, temporaryParent, ...extra] = process.argv.slice(2)
if (!rawRoot || !version || extra.length) {
  throw new Error(
    "用法：node packages/data/scripts/build-nanoka-agents.ts <raw/nanoka根目录> <版本> [已存在的临时父目录]",
  )
}
const result = await buildNanokaAgents({
  rawRoot,
  version,
  ...(temporaryParent ? { temporaryParent } : {}),
})
console.log(
  JSON.stringify(
    {
      artifactDirectory: result.artifactDirectory,
      maintenanceReportPath: result.maintenanceReportPath,
      agentCount: result.index.scope.agentIds.length,
      detailLocales: result.index.source.detailLocales,
      inputFileCount: result.inputFileCount,
      outputFileCount: result.outputFileCount,
      unknownFieldCount: result.maintenance.diagnostics.length,
      codeNameDifferenceCount: result.maintenance.codeNameDifferences.length,
    },
    null,
    2,
  ),
)
