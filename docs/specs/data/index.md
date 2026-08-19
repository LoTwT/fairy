# `@randomplay/data` 包架构

本规范只定义公开数据在 `@randomplay/data` 中的存放与导入形式。每个数据集的文件名、导出名、类型名和字段
结构由对应的数据集规范决定。

## 当前状态

`@randomplay/data` 的公开 API 当前为空，`package.json` 的 `files` 白名单和公开入口当前都只有 `dist`。下文
描述的是后续公开数据时采用的目标架构，不表示示例中的文件和导出已经存在。

## 共享规范

- [共享清洗规范](cleaning.md)：定义原始缓存到候选公开 JSON 的共同输入边界、转换规则、确定性要求和失败行为。

## JSON 是数据源

每个公开数据集对应一个位于包根目录的 JSON 文件：

```text
packages/data/<dataset>.json
```

JSON 文件进入 Git，并随 npm 包发布。TypeScript 层不维护另一份数据，只为 JSON 结构提供类型声明；包根的
数据导出也读取同一个 JSON 文件。构建后的 JavaScript 入口继续引用随包 JSON，不能把 JSON 内容再内联进
JavaScript 文件。

目标 npm 包包含以下文件：

```text
<dataset>.json
dist/index.mjs
dist/index.d.mts
types/<dataset>-json.d.mts
```

具体数据集规范必须登记自己的 `<dataset>`、命名导出和类型。原始抓取缓存不属于公开数据文件，也不进入
npm 包。

## 包根导入

包根提供数据的命名导出及其 TypeScript 类型。以下名称只用于说明导入形式：

```ts
import { agentCatalog } from "@randomplay/data"
import type { AgentCatalog } from "@randomplay/data"
```

`agentCatalog` 必须读取对应的 `agent-catalog.json`，不能维护独立数据副本。数据对象是否校验或冻结，由代理人
目录规范另行决定。

## JSON 子路径导入

每个公开 JSON 文件在 `package.json` 的 `exports` 中提供对应子路径和类型声明：

```ts
import rawAgentCatalog from "@randomplay/data/agent-catalog.json" with { type: "json" }
```

JSON 子路径返回 JSON 模块的默认导出。文件名、字段和运行时行为以对应数据集规范为准。

## URL 读取

JSON 文件随 npm 包发布后，可以通过 npm 镜像按 URL 读取。URL 必须固定完整包版本：

```text
https://cdn.jsdelivr.net/npm/@randomplay/data@<exact-package-version>/<dataset>.json
```

不能使用 `latest`、版本范围或省略版本的 URL。网络请求、缓存和失败处理由使用方负责，Data 包不提供通用
fetch helper。

## 本规范不定义的内容

本规范不决定数据集字段、来源映射、运行时校验或发布时机。共享清洗规则由[共享清洗规范](cleaning.md)
维护；具体数据集确定结构后，再新增独立规范并在本页登记。
