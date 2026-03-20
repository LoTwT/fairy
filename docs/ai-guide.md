# AI 协作指南

本文档是 `Codex App` 与 `Claude Code` 共享的项目说明。当前仓库统一通过 `packages/zzz-data/scripts/sources` 管理四个数据源同步：`xlsx` 负责读取 `packages/zzz-data/.sources/source.xlsx` 并生成 `data/source/xlsx/zh-CN` / `scripts/sources/xlsx/types`，`gachabase`、`buhflipexplode`、`mihoyo-wiki` 负责远端 source 数据抓取与派生快照更新。其中 `buhflipexplode` 在写入 `data/source/` 前会先过滤为官网当前可见的正式服历史版本。`packages/zzz-data/src/calculator/` 同时提供一个可发布的纯函数伤害计算核心，规格文档位于 `docs/specs/damage-core.md`；面向静态伤害计算的通用战斗语义快照结构由 `docs/specs/combat-semantics.md` 定义；处理后 `enemy` 数据结构由 `docs/specs/enemy-data.md` 定义。`.sources/source.xlsx` 是手动下载的本地输入，不纳入版本管理，`.sources/source.xlsx.metadata.json` 记录最近一次成功处理的哈希与时间。项目知识、命令、工作流统一维护在 `docs/`，根目录的 `AGENTS.md` 与 `CLAUDE.md` 只保留各自工具的入口约定。

## 关键命令

```bash
# zzz-data 子包命令（在 packages/zzz-data 下）
pnpm run sync                 # 运行全部数据源同步，更新 data/source 与 scripts/sources/xlsx/types/*
pnpm run sync:xlsx            # 读取 .sources/source.xlsx，更新 metadata，并重新生成 data/source/xlsx/zh-CN/*.json 与 scripts/sources/xlsx/types/*
pnpm run sync:gachabase       # 只同步 gachabase 数据
pnpm run sync:buhflipexplode  # 只同步 buhflipexplode 数据
pnpm run sync:mihoyo-wiki     # 只同步米游社百科危局强袭战数据
pnpm run generate:enemy       # 基于 source 数据生成 data/enemy
pnpm run build                # 使用 tsdown 构建 dist/ 下的纯函数计算核心
pnpm run test                 # 使用 vitest 运行 calculator 测试
pnpm run typecheck            # 检查 src / tests / scripts/sources / scripts/data 下的 TypeScript

# 根目录命令
pnpm run sync                 # 透传 zzz-data 全量同步
pnpm run sync:xlsx            # 透传 zzz-data xlsx 同步
pnpm run sync:gachabase       # 透传 zzz-data gachabase 同步
pnpm run sync:buhflipexplode  # 透传 zzz-data buhflipexplode 同步
pnpm run sync:mihoyo-wiki     # 透传 zzz-data mihoyo-wiki 同步
pnpm run generate:enemy       # 透传 zzz-data enemy 数据生成
pnpm run build                # 透传 zzz-data build
pnpm run test                 # 透传 zzz-data test
pnpm run lint --fix           # eslint 检查并自动修复
pnpm run prettier             # prettier 格式化
```

## 工作流

修改数据源同步脚本、xlsx 读取脚本、伤害计算核心或文档后，按下面顺序处理：

1. 先检查本次改动是否改变了目录结构、命令或运行说明；如有变化，先更新文档
2. 如果修改了某个数据源的同步逻辑，运行对应的 `pnpm run sync:<source>`；如果修改了整体调度逻辑，可运行 `pnpm run sync`。其中修改 `xlsx` 读取逻辑前，先确认最新下载的 `.sources/source.xlsx` 已就位；`sync:xlsx` 成功后会更新 `.sources/source.xlsx.metadata.json`，并重新生成 `packages/zzz-data/data/source/xlsx/zh-CN/` 与 `scripts/sources/xlsx/types/` 下的产物；如果修改了处理后 enemy 数据生成逻辑，运行 `pnpm run generate:enemy`；如果这轮不适合实际执行，在结论中明确说明未运行
3. 项目代码或生成产物发生变化后，执行 `pnpm --filter zzz-data run typecheck && pnpm run prettier`
4. 如果修改了 `src/`、`tests/`、构建配置或对外 API，在第 3 步之后继续运行 `pnpm --filter zzz-data run test && pnpm --filter zzz-data run build`

## 文档维护规则

以下内容是 `Codex App` 与 `Claude Code` 的共享维护规则。

### 共享文档

- 新增或调整面向 AI 的共享说明时，更新 `docs/ai-guide.md`
- 新增文档或修改文档职责时，更新 `docs/index.md`
- 新增/删除/重命名脚本、目录或关键文件时，更新 `docs/architecture.md`
- 新增/删除依赖时，更新 `docs/dependencies.md`
- 修改伤害计算范围、纯函数 API 或公式行为时，更新 `docs/specs/damage-core.md`
- 修改静态快照计算的 `panel / snapshot` 语义结构时，更新 `docs/specs/combat-semantics.md`
- 修改 `data/enemy/` 的目录、文件结构或字段语义时，更新 `docs/specs/enemy-data.md`
- 修改抓取目标、xlsx 读取逻辑、输出目录或命令时，更新 `packages/zzz-data/README.md`
- 修改工作流步骤时，更新本文档中的「工作流」

### 工具专属入口

- 新增/调整 Codex 入口约定时，更新 `AGENTS.md`
- 新增/调整 Claude Code 入口约定时，更新 `CLAUDE.md`
- 新增/删除共享 skill 或修改其使用方式时，同时检查 `AGENTS.md`、`CLAUDE.md` 与 `.agents/skills/`
- 新增 Claude Code 本地权限或运行约定时，更新 `.claude/settings.local.json`，并在 `CLAUDE.md` 说明
