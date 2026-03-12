# AI 协作指南

本文档是 `Codex App` 与 `Claude Code` 共享的项目说明。项目知识、命令、工作流统一维护在 `docs/`；根目录的 `AGENTS.md` 与 `CLAUDE.md` 只保留各自工具的入口约定。

## 关键命令

```bash
# zzz-data 子包命令（在 packages/zzz-data 下）
pnpm run generate   # 从 source.xlsx 生成 data/xlsx/*.json（当前冻结，xlsx 数据源暂不可用）
pnpm run crawl                 # 爬虫脚本，爬取所有数据生成 data/raw/**/*.json
pnpm run crawl:gachabase      # 只爬取 gachabase 数据
pnpm run crawl:buhflipexplode # 只爬取 buhflipexplode 数据
pnpm run crawl:mihoyo-wiki    # 只爬取 baike.mihoyo.com 数据
pnpm run merge      # 合并脚本，从 data/raw/ + i18n/ 生成 data/*.json（对外发布）
pnpm run data:prepare # crawl + merge 全流程
pnpm run test       # vitest 运行测试
pnpm run build      # tsdown 编译，输出 dist/
pnpm run release    # build + merge + pnpm publish

# zzz-agent 子包命令（在 packages/zzz-agent 下）
pnpm run prepare:zzz-data # 先构建 workspace 中的 zzz-data，供 zzz-agent 使用正式包导出
pnpm run dev        # 先构建 zzz-data，再启动 Mastra Studio（localhost:4111）
pnpm run test       # 先构建 zzz-data，再用 vitest 校验 lookup 工具、scorer 与 prompt 行为
pnpm run build      # 先构建 zzz-data，再构建生产服务器
pnpm run start      # 启动已构建的生产服务器

# 根目录命令
pnpm run test       # 运行所有子包测试
pnpm run data:prepare # crawl + merge 全流程（透传 zzz-data 子包）
pnpm run lint --fix # eslint 检查并自动修复（hook 自动执行，通常无需手动运行）
pnpm run prettier   # prettier 格式化（hook 自动执行，通常无需手动运行）
```

## Mastra 开发须知

`packages/zzz-agent` 基于 Mastra 框架。修改该包前，先阅读共享 skill [`.agents/skills/mastra/SKILL.md`](../.agents/skills/mastra/SKILL.md)。Mastra API 迭代快，不要直接依赖模型记忆。

```
src/mastra/
├── index.ts              # Mastra 实例入口
├── agents/
│   └── zzz-agent.ts      # ZZZ 伤害计算 Agent（默认 glm-4.6v，9 个工具）
├── tools/zzz/
│   ├── index.ts           # 统一导出
│   ├── utils.ts           # loadJson / stripHtml / findBestMatch / findTopMatches
│   ├── lookup-agent.ts    # 代理人查询 + 属性计算（支持 compact / skillTypes）
│   ├── lookup-w-engine.ts # 音擎查询 + 属性计算（支持 compact）
│   ├── lookup-bangboo.ts  # 邦布查询 + 属性计算
│   ├── lookup-drive-disc.ts # 驱动盘套装效果查询
│   ├── lookup-game-mode.ts  # DA/SD/TS 游戏模式数据查询 + damageContext
│   ├── resolve-build-damage.ts # 静态构筑高层 resolver（当前支持：全部强攻 / 命破 / 异常代理人 + 对应特性的音擎；single-shot 支持 normal/sheer/anomaly/disorder，并已接入 agentMindscape / energyGenerationRate）
│   ├── resolve-build-source-damage-views.ts # source-specific 额外结算条目 resolver（爱丽丝 [极性强击] / 雅 [霜灼·破] / 柏妮思 [余烬]）
│   ├── resolve-build-skill-matrix.ts # 静态构筑技能矩阵 resolver（全技能 / 全段 / 完整伤害表；当前仅强攻 / 命破，但共享相同的 progression-aware loadout/panel contract）
│   └── calc-damage.ts    # 伤害计算（normal/sheer/anomaly/disorder）
└── scorers/
    └── zzz-scorer.ts      # 评分器（completeness/outputFormat/multiplierAccuracy）
```

环境变量参考 `packages/zzz-agent/.env.example`。

`zzz-agent` 通过 workspace 依赖消费 `zzz-data` 的正式包导出，不直接引用 `zzz-data/src`。为避免开发态或测试态读到过期 `dist/`，其 `dev` / `test` / `build` 都会先执行 `pnpm run prepare:zzz-data`；`start` 仅负责启动已有构建产物。

## 工作流

修改或生成代码后，每次必须按顺序执行以下步骤，不得遗漏：

1. 立即对照本文档的「文档维护规则」检查本次改动是否触发文档更新条件，若触发则先更新文档
2. `pnpm run lint --fix && pnpm run prettier`
3. 运行与改动范围匹配的校验命令：
   - 修改 `packages/zzz-data`：在子包下运行 `pnpm run test`
   - 修改 `packages/zzz-agent`：在子包下依次运行 `pnpm run test` 与 `pnpm run build`
   - 若不确定影响范围：运行根目录 `pnpm run test`，并在涉及 `packages/zzz-agent` 时补充 `pnpm --filter zzz-agent run build`

## 文档维护规则

以下内容是 `Codex App` 与 `Claude Code` 的共享维护规则。

### 共享文档

- 新增或调整面向 AI 的共享说明时，更新 `docs/ai-guide.md`
- 新增文档或修改文档职责时，更新 `docs/index.md`
- 新增/删除/重命名脚本、目录或关键文件时，更新 `docs/architecture.md`
- 新增/删除 devDependencies 时，更新 `docs/dependencies.md`
- 修改命名规范或新增术语约定时，更新 `docs/naming.md`
- 新增/修改 `src/index.ts` 公开类型时，更新 `docs/architecture.md`
- 修改工作流步骤时，更新本文档中的「工作流」

### 工具专属入口

- 新增/调整 Codex 入口约定时，更新 `AGENTS.md`
- 新增/调整 Claude Code 入口约定时，更新 `CLAUDE.md`
- 新增/删除共享 skill 或修改其使用方式时，同时检查 `AGENTS.md`、`CLAUDE.md` 与 `.agents/skills/`
- 新增 Claude Code 本地权限或运行约定时，更新 `.claude/settings.local.json`，并在 `CLAUDE.md` 说明
