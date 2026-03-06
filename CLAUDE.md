# zzz-data

Zenless Zone Zero 游戏数据包，从 `source.xlsx` 生成 JSON 数据，公开 TypeScript 类型手动维护。

需要了解项目细节时，先查阅 [docs/index.md](./docs/index.md)。

## 关键命令

```bash
# zzz-data 子包命令（在 packages/zzz-data 下）
pnpm run generate   # 从 source.xlsx 生成 data/xlsx/*.json（当前冻结，xlsx 数据源暂不可用）
pnpm run crawl                 # 爬虫脚本，爬取所有数据生成 data/crawl/*.json
pnpm run crawl:gachabase      # 只爬取 gachabase 数据
pnpm run crawl:buhflipexplode # 只爬取 buhflipexplode 数据
pnpm run test       # vitest 运行测试
pnpm run build      # tsdown 编译，输出 dist/
pnpm run release    # build + pnpm publish

# zzz-agent 子包命令（在 packages/zzz-agent 下）
pnpm run dev        # 启动 Mastra Studio（localhost:4111）
pnpm run build      # 构建生产服务器
pnpm run start      # 启动生产服务器

# 根目录命令
pnpm run lint --fix # eslint 检查并自动修复
pnpm run prettier   # prettier 格式化
```

## Mastra 开发须知

`packages/zzz-agent` 基于 Mastra 框架。**修改该包前必须先加载 Mastra skill**（`/mastra` 命令），Mastra API 迭代快，训练数据中的用法可能已过时。

```
src/mastra/
├── index.ts      # Mastra 实例入口
├── agents/       # Agent 定义
├── tools/        # 工具函数（可复用给 MCP Server）
├── workflows/    # 多步骤工作流
└── mcp/          # MCP Server 配置（可选）
```

环境变量参考 `packages/zzz-agent/.env.example`。

## 工作流

修改或生成代码后，**每次**必须按顺序执行以下步骤，不得遗漏：

1. 在子包下跑测试：`pnpm run test`
2. **在项目根目录跑 lint 和格式化（必须）**：`pnpm run lint --fix && pnpm run prettier`
3. 按「维护 CLAUDE.md」规则更新对应文档（本文件 + docs/ 下相关文档）

## 维护 CLAUDE.md

当以下内容发生变更时，必须同步更新本文件及 docs/ 下对应文档：

**zzz-data 包：**

- 新增/删除/重命名脚本、目录或关键文件 → 更新 [architecture.md](./docs/architecture.md)
- 新增/修改 package.json scripts → 更新「关键命令」
- 新增/删除 devDependencies → 更新 [dependencies.md](./docs/dependencies.md)
- 修改命名规范或新增术语约定 → 更新 [naming.md](./docs/naming.md)
- 新增/修改 `src/index.ts` 公开类型 → 更新 [architecture.md](./docs/architecture.md)
- 修改工作流步骤 → 更新「工作流」

**zzz-agent 包：**

- 新增/删除 Mastra tool/agent/workflow → 更新「Mastra 开发须知」中的目录结构
- 新增/修改 package.json scripts → 更新「关键命令」中 zzz-agent 部分
- 新增环境变量 → 更新 `.env.example` 并在「Mastra 开发须知」中说明
