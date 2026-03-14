# 新数据维护 Checklist

本文档定义 `zzz-data` 在重新抓取上游数据后的标准维护流程。目标不是描述某一版 spec，而是给后续所有数据刷新提供固定检查顺序，避免只更新 JSON、不更新 contract 或 resolver coverage。

## 适用范围

适用于以下情况：

- 执行 `pnpm run crawl`
- 执行 `pnpm run merge`
- 执行 `pnpm run data:prepare`
- 手动替换 `packages/zzz-data/data/raw/**`
- 手动更新 `packages/zzz-data/data/en/*.json` / `packages/zzz-data/data/zh-CN/*.json`

不适用于：

- 只改 prompt / scorer / tool schema
- 只改 `build` / `calculator` 的纯逻辑且未更新数据

## 维护顺序

### 1. 先更新原始数据与发布数据

按需要执行：

```bash
pnpm run crawl
pnpm run merge
```

或直接：

```bash
pnpm run data:prepare
```

检查输出是否符合当前结构：

- `packages/zzz-data/data/raw/**`
- `packages/zzz-data/data/en/*.json`
- `packages/zzz-data/data/zh-CN/*.json`

### 2. 先看发布 JSON diff，不要先改 resolver

优先检查：

- 是否只是新增条目
- 是否有字段新增 / 删除 / 改名
- 是否有值域变化
- 是否有富文本结构变化

如果这里已经出现 shape 变化，先修 contract，再考虑 build layer。

### 3. 如果数据结构变化，先修公开 contract

优先检查并更新：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/gachabase/types.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/game-modes.ts`

必要时同步：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/terms.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/text.ts`

判断标准：

- 新字段是否需要进入公开类型
- 旧字段语义是否变化
- 新术语 / 新属性 / 新特性是否需要映射
- 富文本字段是否仍符合 `RichTextString` 语义

### 4. 确认 cleaned/helper layer 是否仍成立

优先检查：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/enemy.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/versions.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/encounter.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/deadly-assault.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/shiyu-defense.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/threshold-simulation.ts`

重点看：

- `elementMult` 顺序是否仍稳定
- `versionTime` 展示语义是否变化
- `DA / SD / TS` 的嵌套结构是否仍能被 helper 正确消费

### 5. 再看 build catalog 是否自动扩容

检查：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/catalog.ts`

重点看：

- 新代理人是否自动进入 `supportedStaticBuildAgents`
- 新音擎是否自动进入 `supportedStaticBuildWEngines`
- 新 utility 代理人 / 音擎是否进入对应 utility catalog
- alias 是否需要手工补强
- `specialty` / `attribute` 是否能被 `terms.ts` 正确识别

说明：

- `catalog.ts` 当前是动态层，会跟 `agents.json` / `w-engines.json` 自动联动
- 但“进入支持列表”不代表“已有 curated effect coverage”

### 6. 再补 curated effect definitions

检查并维护：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/definitions.ts`

如果需要更高层表达，再检查：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/profiles.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/resolver.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/matrix.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/views.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/trigger-matrix.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/utility-views.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/build/source-entries.ts`

判断标准：

- 新角色 / 音擎 / 驱动盘是否需要新增 curated effect definitions
- 新机制是否需要新增 profile / snapshot contract
- 新 source-specific 结算是否需要独立 view，而不是硬塞进主公式

### 7. 最后再同步 zzz-agent

只有在以下任一情况发生时，才需要改 `zzz-agent`：

- `zzz-data` 输入 contract 变了
- `zzz-data` 输出字段变了
- 新增或调整了高层 resolver 的 support scope
- prompt 需要知道新的支持范围或新的结构化字段

优先检查：

- `/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/agents/zzz-agent.ts`
- `/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/scorers/zzz-scorer.ts`

## 文档同步要求

数据刷新后，按改动范围同步以下文档：

- 新增/修改公开类型：更新 `/Users/caoyujie/codes/zzz-data/docs/architecture.md`
- 新增术语 / 映射：更新 `/Users/caoyujie/codes/zzz-data/docs/naming.md`
- 新增/修改 build resolver contract：更新对应 `docs/specs/static-build-resolver-v*.md`
- 变更长期状态：更新 `/Users/caoyujie/codes/zzz-data/docs/specs/static-build-resolver-roadmap.md`
- 新增维护文档：更新 `/Users/caoyujie/codes/zzz-data/docs/index.md`

## 校验命令

完成维护后，至少执行：

```bash
pnpm run lint --fix && pnpm run prettier
pnpm run test
pnpm --filter zzz-data run build
```

如果改到了 `zzz-agent`，再执行：

```bash
pnpm --filter zzz-agent run build
```

## 当前项目匹配状态

当前仓库结构与本 checklist 是匹配的：

- 抓取与合并命令已存在于 `/Users/caoyujie/codes/zzz-data/docs/ai-guide.md`
- 原始数据与发布数据目录已在 `/Users/caoyujie/codes/zzz-data/docs/architecture.md` 明确
- 公开 contract、cleaned/helper layer、build layer 的目录边界已稳定
- `catalog.ts` 已按公开数据动态生成支持范围
- `definitions.ts` 仍是 curated effect coverage 的主维护点

因此，后续抓新数据时可以直接按本 checklist 执行。
