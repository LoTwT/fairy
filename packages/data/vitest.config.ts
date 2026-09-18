import { availableParallelism } from "node:os"
import { defineConfig } from "vitest/config"

/**
 * 测试分层：unit 为不启动真实进程、真实格式化或制品构建的常规快速检查；
 * integration 为事务、真实进程、真实格式化与发布链路；packaging 为打包与浏览器验收。
 * unit 采用「全部测试减去集成与打包」的排除式定义：新增测试默认进入快速层，
 * 不会被遗漏；完整 test 与 check 仍运行 unit + integration 全部层次。
 */
const integrationTestFiles = [
  "test/agent-cli.test.ts",
  "test/agent-current.test.ts",
  "test/agent-current-initialization.test.ts",
  "test/agent-current-interruption.test.ts",
  "test/agent-current-migration.test.ts",
  "test/agent-current-workspace.test.ts",
  "test/integrated-verify.test.ts",
  "test/nanoka-cli.test.ts",
  "test/publication.test.ts",
  "test/snapshot-build.test.ts",
  "test/snapshot-convert.test.ts",
  "test/update-report.test.ts",
]
const packagingTestFiles = [
  "test/verify-package.test.ts",
  "test/verify-browser.test.ts",
]

/**
 * 事务与发布测试会派生大量 node/oxfmt/pnpm 子进程；实测 10 核上默认并行度
 * 会过度订阅并拖慢总等待时间，限制为 6 个 worker 后墙钟时间与稳定性都更好。
 * 小机器保持 Vitest 的 availableParallelism - 1 默认值。
 */
const maxWorkers = Math.min(6, Math.max(1, availableParallelism() - 1))

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    maxWorkers,
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/**/*.test.ts"],
          exclude: [...integrationTestFiles, ...packagingTestFiles],
        },
      },
      {
        test: {
          name: "integration",
          include: integrationTestFiles,
          // 事务与发布链路的测试随生产登记表类别增多而变重；GitHub CI runner 比本机慢，
          // 默认 5s 会在并行负载下偶发超时。为该层统一放宽到 30s，与本层既有用例
          // 显式声明的 15s/20s/30s 超时同一量级；unit 层保持默认 5s。
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: "packaging",
          include: packagingTestFiles,
        },
      },
    ],
  },
})
