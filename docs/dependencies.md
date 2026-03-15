# Monorepo 依赖说明

本文档记录当前 monorepo 的依赖范围，覆盖：

1. 根目录 `devDependencies`
2. `packages/zzz-data` 的 `devDependencies`
3. `packages/zzz-agent` 的 `devDependencies`
4. 仅在需要理解包职责时补充的关键运行时依赖

## 根目录

- `@ayingott/eslint-config` — ESLint 共享配置
- `@ayingott/prettier-config` — Prettier 共享配置
- `bumpp` — monorepo 发版时统一更新版本号
- `eslint` — 根目录 lint 命令与 `lint-staged` 检查
- `lint-staged` — pre-commit 仅检查暂存文件
- `pnpm` — 锁定 workspace 包管理器版本
- `prettier` — 根目录格式化命令
- `simple-git-hooks` — 注册 `pre-commit` hook
- `taze` — 升级依赖版本

## packages/zzz-data

- `@types/node` — Node.js 类型，供脚本、测试与构建使用
- `cheerio` — 轻量 HTML 解析，处理静态页面爬取
- `exceljs` — 读取 `source.xlsx`
- `playwright` — 浏览器自动化，处理 JS 渲染页面爬取
- `tsdown` — 构建输出 `dist/`
- `tsx` — 直接运行 TypeScript 脚本
- `vitest` — 单元测试与数据结构测试

## packages/zzz-agent

- `@types/node` — Node.js 类型，供 Mastra 服务端代码使用
- `mastra` — Mastra CLI，提供 `dev` / `build` / `start`
- `typescript` — `zzz-agent` 的 TypeScript 编译支持
- `vitest` — `zzz-agent` 的工具与 prompt 回归测试

## packages/zzz-agent 运行时依赖

- `@mastra/core` — Mastra Agent 主框架
- `@mastra/evals` — scorer 与评估工具
- `@mastra/libsql` — LibSQL 存储适配器
- `@mastra/loggers` — Pino logger 集成
- `@mastra/memory` — Agent memory 能力
- `@mastra/observability` — tracing / exporter / 敏感信息过滤
- `zod` — tool 参数与 scorer schema 定义
- `zzz-data` — 复用本仓库发布的数据与类型
