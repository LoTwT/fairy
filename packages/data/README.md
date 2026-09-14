# @randomplay/data

Fairy 的游戏来源资料与数据整理包。

Nanoka 是当前已登记的数据来源。在 Fairy 源码工作区内，可以把已支持实体的原始 JSON 抓取到被 Git 忽略的本地缓存。缓存不是权威快照，也不进入 npm 包；独立整合器可以基于明确版本的完整本地输入构建并验证新制品。当前公开导出仍保持为空。

[来源数据整合规范](../../docs/specs/data/integration.md) 定义了第一阶段完整代理人资料的字段归属、命名与注释、多语言拆分、来源追溯与文件契约，已完成本地 Nanoka 3.1 全部 58 个代理人的类型覆盖与离线契约验证。现已实现[包内单代理人纯整合函数](src/integration/integrate-agent.ts)及[正式类型](src/integration/agent-types.ts)，对合成输入执行常规类型与保真测试。现已实现离线全量输入读取、确定性序列化、原始字节与输出字节摘要、总索引生成和完整制品复验。raw 保留来源版本目录；本步仅创建新的临时制品，增量维护当前 integrated 数据集与公开 API 尚未实现。

## 本地抓取

在 Fairy 仓库根目录运行：

```bash
pnpm --filter @randomplay/data fetch:nanoka
```

该命令只用于源码工作区，`@randomplay/data` 不导出 npm CLI。完整参数、缓存语义和验证边界见 [Nanoka 共享来源规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/nanoka/source.md)。

## 离线全量构建

在仓库根目录显式调用；前两个位置参数分别是 `raw/nanoka` 根目录与确切版本，没有默认版本或网络补齐：

```bash
node packages/data/scripts/build-nanoka-agents.ts packages/data/raw/nanoka 3.1
```

可选第三个参数是已存在的临时父目录，必须位于 raw 范围外。每次创建独占的 `fairy-nanoka-agents-*` 子目录，成功后打印完整制品与维护报告的位置；失败只清理本次目录。重复执行会创建新的制品，不覆盖已有 integrated。

- [构建模块](scripts/nanoka-integration/build.ts)：`buildNanokaAgents({ rawRoot, version, temporaryParent?, policy? })`；返回 `buildDirectory`、`artifactDirectory`、`maintenanceReportPath`、已复验索引和计数。策略默认从工作区加载，显式传入的 `policy` 仍须通过相同校验。
- [序列化模块](src/integration/serialize-json.ts)：纯函数 `serializeJson(value)`，返回规范 UTF-8 字节。
- [验证模块](scripts/nanoka-integration/verify.ts)：`verifyNanokaAgentArtifact({ artifactDirectory })`，重新读取全部文件，核对摘要、身份、语言、路径及精确文件集合。

`buildDirectory` 是本次独占构建根目录，使用完毕后可整体删除，包括制品与维护报告。制品位于其 `integrated/nanoka/`，含 `index.json` 和索引登记的全部实体文件，不加版本目录。`maintenance.json` 位于本次目录根部，单独登记未知字段和 `codeName` 差异。重复构建应比较两个制品目录的全部文件字节；临时目录路径不是数据内容。

构建器始终写出规范序列化字节。独立验证器也接受按实际字节重算摘要后的紧凑 JSON 或其他排版副本；索引本身可以重新排版。它只验证该副本内部的一致性，与原制品的 JSON 值相等需另行核对；传输压缩需先解压。

单独复验（替换最后的目录参数）：

```bash
node --input-type=module -e 'import { verifyNanokaAgentArtifact } from "./packages/data/scripts/nanoka-integration/verify.ts"; const index = await verifyNanokaAgentArtifact({ artifactDirectory: process.argv[1] }); console.log(index.scope)' /absolute/build/integrated/nanoka
```

摘要只标识使用的字节，不证明 raw 来自同一抓取批次；单独复验制品也不认证来源真实性。本步没有现有数据集的事务替换、增量删除或中断恢复协议。资源上限、路径边界、合成测试与真实验证范围见[整合规范](../../docs/specs/data/integration.md#当前离线全量新制品构建)。上述入口仅供源码工作区使用，不增加 npm 导出；普通 `build`、`test`、`verify:pack` 不触发真实数据构建。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包不依赖 `@randomplay/core`。
- 整合资料保留来源原文与数值；计算语义需要单独人工讨论和重新建模，再由后续集成层组装计算输入。
