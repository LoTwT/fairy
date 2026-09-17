# @randomplay/data

Fairy 的游戏来源资料与数据整理包。

Nanoka 是当前已登记的数据来源。在 Fairy 源码工作区内，可以把已支持实体的原始 JSON 抓取到被 Git 忽略的本地缓存。缓存不是权威快照，也不进入 npm 包；独立整合器可以基于明确版本的完整本地输入构建并验证新制品。公开接口见[数据消费与 npm 导出契约](../../docs/specs/data/consumption.md)。

[来源数据整合规范](../../docs/specs/data/integration.md) 定义了第一阶段完整代理人资料的字段归属、命名与注释、多语言拆分、来源追溯与文件契约，已完成本地 Nanoka 3.1 全部 58 个代理人的类型覆盖与离线契约验证。现已实现[包内单代理人纯整合函数](src/integration/integrate-agent.ts)及[正式类型](src/integration/agent-types.ts)，对合成输入执行常规类型与保真测试。现已实现离线全量输入读取、确定性序列化、原始字节与输出字节摘要、总索引生成和完整制品复验。raw 保留来源版本目录；现已支持固定当前 integrated 数据集的多实体 v3 增量维护、按类别的更新差异报告、互斥读取、中断恢复与显式迁移，公开 API 消费随 npm 版本发布的固定快照。

## 使用

```ts
import {
  agentNames,
  loadIndex,
  loadAgentData,
  loadAgentDetails,
  loadAllAgents,
} from "@randomplay/data"
import type { AgentName } from "@randomplay/data"

const name: AgentName = "Astra Yao"
const data = await loadAgentData(name)
const details = await loadAgentDetails(name, "zh")
const index = await loadIndex() // 完整 v3 来源索引，不加载实体
const all = await loadAllAgents("en") // 显式加载全部公共资料和英文详情
console.log(
  agentNames,
  data,
  details,
  index.entities.agents.members["1311"],
  all[name],
)
```

Node ESM 也可直接读取原样 JSON：

```js
import data from "@randomplay/data/integrated/agents/1311/data.json" with { type: "json" }
```

名称取英文详情顶层原值，语言必须显式为 `zh` 或 `en`。四个函数每次返回独立对象，根入口不预载数据。
完整参数、错误、JSON 子路径及兼容性规则统一见[消费契约](../../docs/specs/data/consumption.md)。

## 本地抓取

在 Fairy 仓库根目录运行：

```bash
pnpm --filter @randomplay/data fetch:nanoka
```

该命令只用于源码工作区，`@randomplay/data` 不导出 npm CLI。完整参数、缓存语义和验证边界见 [Nanoka 共享来源规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/nanoka/source.md)。

## 生成 integrated

在仓库根目录显式运行唯一生成入口：

```bash
pnpm --filter @randomplay/data generate:integrated raw/nanoka 3.1 integrated
```

三个位置参数 `rawRoot`、`version`、`targetDirectory` 都必须给出，不自动选版本或联网补齐。
相对路径仍按进程工作目录解析：filter 命令在 `packages/data` 执行，因此上述路径分别是
`packages/data/raw/nanoka` 和 `packages/data/integrated`。在 data 包目录可省略 filter；绝对路径也可用，含空格时加引号。
命令名称不绑定实体；目前只生成已实现的 Nanoka 代理人整合，其他实体尚未接入。

同一个命令自动处理以下情况：

- 目标不存在：首次生成完整数据。
- 新克隆只有合法 JSON、没有本机管理记录：持永久锁完整验证已有制品，建立本机记录，再进入更新流程。
- 已有受管理数据：按记录恢复未完成事务，完整验证旧数据并执行整库增量更新（候选恒按当前规则重建）。

初始化要求当前 v3 格式、当前登记表的全部类别、规则 v4、当前完整语言配置、成员与精确文件集合及实际字节摘要
全部通过验证；空目录、损坏制品、异常控制文件或损坏记录都会拒绝。初始化只登记已验证的数据，不改写 JSON。
v2 外壳的制品不会被隐式登记或转换：静态 v2 制品需要显式迁移；受管理 v2 数据集会被整库重建（实体字节相同的文件
仍复用原 inode），或改用迁移命令只改写索引外壳。
相同输入重复执行仍完整构建和校验，但当前文件的内容、inode 和 mtime 保持不变；临时候选仍有 I/O。
初始化中断后直接重跑同一命令，永久锁保留，进程终止会自动释放锁。独立读取、恢复和静态验证不会初始化非受管理制品。

底层复用[多实体构建器](scripts/nanoka-integration/snapshot-build.ts)、[完整制品验证器](scripts/nanoka-integration/snapshot-verify.ts)、
[当前数据事务模块](scripts/nanoka-integration/current.ts)及[更新报告模块](scripts/nanoka-integration/update-report.ts)。流程仍为：
按类别生成实体 JSON → oxfmt 格式化 → 计算最终字节摘要 → 生成并格式化 index.json → 完整校验 → 比较旧基线与候选、
生成并检查维护报告 → 复用相同实体文件并安装当前数据。
格式化发生在硬链接复用之前，使用仓库 `oxfmt.config.ts`。不要直接格式化当前目录；
`pnpm format` 排除 integrated，`pnpm format:check` 仍检查它，旧排版通过生成入口更新。
raw 保留来源版本目录；integrated 不加来源或版本层级，`data`/`details` 字段与语义不变。

控制目录为目标同级的 `.<目标名>.fairy-state/`，默认是 `packages/data/.integrated.fairy-state/`；
它保存永久锁、本机记录、最新维护报告及事务临时材料，被 Git 忽略。**不要删除永久 lock.sqlite 来解锁，
也不要删除当前数据或管理记录来绕过错误。** 正常完成不保留历史数据目录。

最新维护报告是 `.<目标名>.fairy-state/maintenance.json`：`categories` 保留各类别成员的未知字段提示等既有维护信息，
`update` 是本次整库更新的差异报告（按类别的新增、修改、删除、无变化，来源与规则变化，字段级 JSON Pointer 差异，
以及需要重点审查的既有内容摘要）。报告由本次已完整验证的旧基线与候选在提交前生成，不在提交后重新读取当前目录计算，
也不写入 v3 索引；首次生成以 `baseline.kind: "none"` 明确表达；报告失败或超限时不会提交新数据，也不会截断冒充完整报告。
输出未变时回执的 `outcome` 为 `unchanged`，报告仍完整生成并明确表达本次已检查、无变化。
字段含义、计数口径与状态判定见[更新差异报告](../../docs/specs/data/integration.md#更新差异报告)。

报告里的两类变化要分开看：`update.source` 记录来源侧事实，`update.rules` 与 `categories[].rulesVersion` 只记录整合规则版本变化，
两者都不单独表示实体输出被改写（版本切换通常只带来资源名的新增与移除）；实体输出是否被改写看 `categories[].result`，
是否存在需要人工确认的既有内容修改或删除看 `categories[].review`。判定口径与归因规则见上述规范链接，不在本文件重复定义。

若 Git 更新了 JSON，使它与已有本机记录的摘要不一致，生成和恢复会明确拒绝并保留现场；
本次不支持自动重新登记这种受管理数据，也不支持把未知规则或旧语言子集的非受管理制品直接初始化。
已有受管理旧规则/语言/预算数据仍按记录复验、恢复与整库重建。完整规则见
[更新与恢复协议](../../docs/specs/data/integration.md#81-当前数据集更新与恢复协议)。

## 验证、恢复与命令回执

```bash
# 当前数据持锁复验；v2 外壳报 MIGRATION_REQUIRED
pnpm --filter @randomplay/data verify:nanoka:current integrated
# 不读取 raw 的独立恢复；按记录协议恢复，生成入口也会先恢复
pnpm --filter @randomplay/data recover:nanoka:current integrated
# 显式迁移：稳定 v2 数据集只改写索引外壳与管理记录
pnpm --filter @randomplay/data migrate:nanoka:current integrated
# 静态副本（v3 外壳）只读复验，不读取管理记录
pnpm --filter @randomplay/data verify:nanoka:snapshot /absolute/copy/integrated
```

当前目录的消费者必须在内部 `withCurrentDataset` 回调持锁期间读完所需字节；
静态验证命令不能替代并发读取锁。`BUSY` 表示稍后重试，`RECOVERY_REQUIRED` 表示先恢复再读取，
`MIGRATION_REQUIRED` 表示先显式迁移，`INCOMPLETE_LANGUAGES` 表示当前数据集只登记了部分语言、
需要先按当前完整语言配置重新生成（历史语言子集仍可用于复验、恢复与迁移，但不能用于普通读取与当前验证）。
只单独传入 `--help` 或 `-h` 时输出用法、退出 0，不访问输入；缺少、多余、空参数和未知选项在执行前拒绝。
成功时脚本 stdout 输出一个 JSON 对象、退出 0；失败退出 1，stderr 输出转义且限长的错误，不打印堆栈。
机器解析时加 `pnpm --silent`，避免 pnpm 执行信息混入 stdout。

生成回执包含 `outcome`（`committed` 或 `unchanged`）、`artifactDirectory`、`maintenanceReportPath`、`format`、
按类别的 `memberCounts`、`inputFileCount`、`outputFileCount`、`reusedEntityFiles`、`changedEntityFiles`、
`removedEntityFiles`，以及本次更新摘要：`reportVersion`、`firstGeneration`、`sourceVersion`、`sourceChanged`、
`rulesChanged`、`result`、`reviewRequired` 和按类别的 `categories`（`checked`、`presence`、`result`、成员与文件计数、
`sourceRecordsChanged`、`rulesVersionChanged`、`reviewRequired`）。路径为实际绝对路径；实体计数不包含索引；
逐条差异只写在制品外的报告里。验证回执包含目标路径、`format`、按类别的成员数与语言
和 `verified: true`；恢复回执包含目标路径、`outcome`、`available` 与 `format`；迁移回执包含目标路径、
`outcome`（`migrated` 或 `unchanged`）、`format`、按类别的成员数与实体文件数。
提交后清理或 stdout 断管失败也可能退出 1，已经提交的数据会保留；应恢复并复验，不能仅按退出码判断是否提交。

摘要证明制品内部字节一致性，不认证来源真实性或同一抓取批次。协议仅支持可信本机 macOS/Linux、同一文件系统及遵守锁的参与者；
进程中断纳入测试，不承诺断电、内核崩溃、网络文件系统或 Windows；读取者需要控制目录写权限。
`typecheck` / `test` 自动准备被 Git 忽略的 `.generated/`；`build` 使用另一份独占发布副本，
仅支持单次构建。真实工作区尚未完成显式迁移时，`build` / `typecheck` / `test` / `pack` 会因发布源仍是 v2 外壳
而明确失败，这是有意的拒绝。生成目录、静态发布边界与 CI 浏览器验收见[消费契约](../../docs/specs/data/consumption.md)。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包不依赖 `@randomplay/core`。
- 整合资料保留来源原文与数值；计算语义需要单独人工讨论和重新建模，再由后续集成层组装计算输入。
