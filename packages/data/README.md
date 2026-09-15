# @randomplay/data

Fairy 的游戏来源资料与数据整理包。

Nanoka 是当前已登记的数据来源。在 Fairy 源码工作区内，可以把已支持实体的原始 JSON 抓取到被 Git 忽略的本地缓存。缓存不是权威快照，也不进入 npm 包；独立整合器可以基于明确版本的完整本地输入构建并验证新制品。当前公开导出仍保持为空。

[来源数据整合规范](../../docs/specs/data/integration.md) 定义了第一阶段完整代理人资料的字段归属、命名与注释、多语言拆分、来源追溯与文件契约，已完成本地 Nanoka 3.1 全部 58 个代理人的类型覆盖与离线契约验证。现已实现[包内单代理人纯整合函数](src/integration/integrate-agent.ts)及[正式类型](src/integration/agent-types.ts)，对合成输入执行常规类型与保真测试。现已实现离线全量输入读取、确定性序列化、原始字节与输出字节摘要、总索引生成和完整制品复验。raw 保留来源版本目录；现已支持固定当前 integrated 数据集的增量维护、互斥读取和中断恢复，公开 API 尚未实现。

## 本地抓取

在 Fairy 仓库根目录运行：

```bash
pnpm --filter @randomplay/data fetch:nanoka
```

该命令只用于源码工作区，`@randomplay/data` 不导出 npm CLI。完整参数、缓存语义和验证边界见 [Nanoka 共享来源规范](https://github.com/LoTwT/fairy/blob/main/docs/specs/nanoka/source.md)。

## 离线全量构建

在仓库根目录显式调用；前两个位置参数分别是 `raw/nanoka` 根目录与确切版本，没有默认版本或网络补齐：

```bash
pnpm --filter @randomplay/data integrate:nanoka:agents raw/nanoka 3.1
```

所有相对路径都相对于进程工作目录解析。通过 `pnpm --filter @randomplay/data` 运行时，工作目录是
`packages/data`，因此上面的 `raw/nanoka` 指向 `packages/data/raw/nanoka`。在 data 包目录可省略 filter：

```bash
pnpm integrate:nanoka:agents raw/nanoka 3.1
```

也可使用绝对路径；路径含空格时加引号。可选第三个参数 `temporaryParent` 是已存在的临时父目录，必须位于
raw 范围外，并非最终制品目录；省略时使用系统临时目录。每次创建独占的 `fairy-nanoka-agents-*` 子目录，
构建失败只清理本次目录。重复执行会创建新的制品，不覆盖已有 integrated。仓库内任意层级的这些临时目录均被 Git 忽略。

- [构建模块](scripts/nanoka-integration/build.ts)：`buildNanokaAgents({ rawRoot, version, temporaryParent?, policy? })`；返回 `buildDirectory`、`artifactDirectory`、`maintenanceReportPath`、已复验索引和计数。策略默认从工作区加载，显式传入的 `policy` 仍须通过相同校验。
- [序列化模块](src/integration/serialize-json.ts)：纯函数 `serializeJson(value)`，返回规范 UTF-8 字节。
- [验证模块](scripts/nanoka-integration/verify.ts)：`verifyNanokaAgentArtifact({ artifactDirectory })`，重新读取全部文件，核对摘要、身份、语言、路径及精确文件集合。

`buildDirectory` 是本次独占构建根目录，使用完毕后可按回执中的确切路径整体删除（例如 `rm -rf -- "/absolute/fairy-nanoka-agents-xxxxxx"`），包括制品与维护报告；不要删除 `temporaryParent`。制品位于其 `integrated/nanoka/`，含 `index.json` 和索引登记的全部实体文件，不加版本目录。`maintenance.json` 位于本次目录根部，单独登记未知字段和 `codeName` 差异。重复构建应比较两个制品目录的全部文件字节；临时目录路径不是数据内容。

构建器始终写出规范序列化字节。独立验证器也接受按实际字节重算摘要后的紧凑 JSON 或其他排版副本；索引本身可以重新排版。它只验证该副本内部的一致性，与原制品的 JSON 值相等需另行核对；传输压缩需先解压。

单独复验（替换最后的目录参数）：

```bash
pnpm --filter @randomplay/data verify:nanoka:agents /absolute/build/integrated/nanoka
```

两个命令的参数契约：

```text
integrate:nanoka:agents <rawRoot> <version> [temporaryParent]
verify:nanoka:agents <artifactDirectory>
```

单独传入 `--help` 或 `-h` 时只输出用法，退出码为 0，不读取输入或创建产物。缺少、多余、空参数或未知选项
在执行前拒绝。成功退出码为 0，脚本 stdout 只输出一个 JSON 对象；失败退出码为 1，stdout 无成功回执，
stderr 输出经过转义及长度限制的错误，不打印堆栈或嵌套 cause。终端规则见[共享来源规范](../../docs/specs/nanoka/source.md#终端错误文本)。
stdout 接收端提前关闭等输出错误也按失败处理；回执发送失败时保留已经完成的制品，详见[命令契约](../../docs/specs/data/integration.md#当前离线全量新制品构建)。

整合回执包含 `buildDirectory`、`artifactDirectory`、`maintenanceReportPath`、`agentCount`、`detailLocales`、
`inputFileCount`、`outputFileCount`、`unknownFieldCount` 和 `codeNameDifferenceCount`；验证回执包含
`artifactDirectory`、`agentCount`、`detailLocales` 和 `verified: true`。目录为实际绝对路径，数量和语言来自实际结果。

pnpm 自身可能打印执行信息。程序解析 stdout 时使用 `--silent`（两个命令均已通过实际命令测试）：

```bash
pnpm --silent --filter @randomplay/data integrate:nanoka:agents raw/nanoka 3.1
pnpm --silent --filter @randomplay/data verify:nanoka:agents /absolute/build/integrated/nanoka
```

摘要只标识使用的字节，不证明 raw 来自同一抓取批次；单独复验制品也不认证来源真实性。全量新制品入口继续保持只创建行为；固定当前数据集请使用下述独立更新命令。资源上限、路径边界、合成测试与真实验证范围见[整合规范](../../docs/specs/data/integration.md#当前离线全量新制品构建)。上述入口仅供源码工作区使用，不增加 npm 导出；普通 `build`、`test`、`verify:pack` 不触发真实数据构建。

## 首次生成、增量更新与恢复

从仓库根目录执行（filter 命令在 data 包目录运行）：

```bash
pnpm --filter @randomplay/data update:nanoka:agents raw/nanoka 3.1 integrated/nanoka
pnpm --filter @randomplay/data verify:nanoka:current integrated/nanoka
pnpm --filter @randomplay/data recover:nanoka:agents integrated/nanoka
```

首次生成和后续更新使用同一命令，三个参数依次为 `rawRoot`、确切版本、目标目录；都必须明确给出。
更新会完整验证该版本的配置语言输入，离线生成候选，再复用实际字节相等的当前文件 inode。合法完整索引决定成员移除；
缺文件或校验失败会保留旧集，不跨版本填缺。相同输入仍会执行完整校验，实体文件内容及 mtime 不变；临时候选仍有 I/O。
首次目标必须不存在；已有非受管理目录（包括空目录）或损坏数据会报错，不能通过删除目标来绕过恢复。

[更新与恢复协议](../../docs/specs/data/integration.md#81-当前数据集更新与恢复协议)是事务、锁、读取及清理规则的唯一来源。
固定目标保持 `packages/data/integrated/nanoka/`；控制记录、临时候选、备份和最新维护报告在同级
`.nanoka.fairy-state/` 中。正常完成后只留当前数据和最新维护报告，不长期保存旧版本。
**保留永久 `lock.sqlite`，不要手工删除它来解锁。** 进程终止会自动释放 SQLite 锁，恢复命令无需 raw；更新也会先恢复。

当前数据的消费者必须在 `withNanokaCurrentDataset` 内部回调持锁期间读完并使用所需字节；该内部维护能力没有 npm 导出。
当前目录使用 `verify:nanoka:current`；`verify:nanoka:agents` 继续用于静态制品，不能替代并发读取锁。
忙碌时明确报 `BUSY` 并重试；未完成事务报 `RECOVERY_REQUIRED`，先执行恢复命令。错误、回执字段及提交后失败语义见
[命令契约](../../docs/specs/data/integration.md#当前数据更新实现与命令)。机器解析使用 `pnpm --silent`。

协议使用本机 macOS/Linux、同文件系统的 SQLite 排他锁、目录 rename 和硬链接；受控子进程中断纳入常规测试。
不保证网络文件系统、Windows、绕过锁修改目录、断电或内核崩溃时的持久性；读取者需要控制目录写权限。
真实当前数据和控制目录均被 Git 忽略，不自动暂存、不进入 npm；普通 build/test/check/pack 不生成或依赖真实数据。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包不依赖 `@randomplay/core`。
- 整合资料保留来源原文与数值；计算语义需要单独人工讨论和重新建模，再由后续集成层组装计算输入。
