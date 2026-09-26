# @randomplay/data

`loadStaticCalculationData({ agents, wEngines })` 按需获取带版本身份的同版计算资料。调用方使用 `resolveAgentAction` 后，将结果传给 core；两个公开包保持相同版本并同批发布。
Node 要求 `>=24.11.0`，使用 ESM；浏览器已验收 Vite 开发与生产构建。
资料读取可单独使用本包，计算时显式安装同版 core。
[安装与旧版升级](https://github.com/LoTwT/fairy/blob/main/docs/specs/packages.md)说明当前源码 API 与 npm `0.1.4` 的差异，
[完整静态计算示例](https://github.com/LoTwT/fairy/blob/main/docs/specs/core/static-calculation.md#完整计算示例)串联公开加载、解析与计算入口。

`loadAgentActions` 按角色读取技能动作目录；`resolveAgentSkillLevel` 和 `resolveAgentAction` 解析显式等级、影画及动作选择。倍率、逐次命中限制和覆盖详情见[技能动作规范](../../docs/specs/data/skill-actions.md)。

根入口提供 `loadAgentLevel60Attributes`、`loadWEngineLevel60Attributes` 和 `loadSDriveDiscMaxLevelAffixes`，按需读取角色 60 级基线与独立核心培养表、音擎 60 级属性和 S 级满强化驱动盘词条。百分比已转换为比例；完整字段、面板边界、固定证据及候选生成命令见[属性规范](../../docs/specs/data/panel-attributes.md)。

静态增益另外提供固定版本 ZZZ-HP 转换制品：`@randomplay/data/definitions/effects/static.json`、`static-catalog.json`、`static-coverage.json`。使用 core 的 `calculateStaticDamageFromCatalog` 读取规则与选项目录，按显式培养、buff 和命中计算伤害；data 根入口不加载这些 JSON，也没有新增运行时计算依赖。覆盖、限制、离线生成方式与示例见[静态数据接入规范](../../docs/specs/data/zzz-hp-static-effects.md)。

Nanoka 是当前已登记的数据来源。在 Fairy 源码工作区内，可以把已支持实体的原始 JSON 抓取到被 Git 忽略的本地缓存。缓存不是权威快照，也不进入 npm 包；独立整合器可以基于明确版本的完整本地输入构建并验证新制品。公开接口见[数据消费与 npm 导出契约](../../docs/specs/data/consumption.md)。

[来源数据整合规范](../../docs/specs/data/integration.md)维护八类资料的字段、类型、规则版本与文件契约，以及当前 v3 数据集的增量更新、差异报告、互斥读取、恢复和迁移协议。npm 消费者读取随包发布的固定快照；来源维护命令仅在源码工作区使用。

效果定义也通过显式 JSON 子路径发布：`@randomplay/data/definitions/effects/starter.json` 与 `@randomplay/data/definitions/effects/automatic.json`。自动规则的范围、事件输入及基础回能请求的执行边界见[消费说明](../../docs/specs/data/consumption.md#自动效果消费)。根入口不自动加载定义。

## 使用

```ts
import {
  agentNames,
  bangbooNames,
  driveDiscNames,
  monsterIds,
  shiyuIds,
  bossIds,
  simulIds,
  wEngineNames,
  loadIndex,
  loadAgentData,
  loadAgentDetails,
  loadAllAgents,
  loadBangbooData,
  loadBangbooDetails,
  loadAllBangboos,
  loadDriveDiscData,
  loadDriveDiscDetails,
  loadAllDriveDiscs,
  loadMonsterData,
  loadMonsterDetails,
  loadAllMonsters,
  loadShiyuData,
  loadShiyuDetails,
  loadAllShiyu,
  loadBossData,
  loadBossDetails,
  loadAllBosses,
  loadSimulData,
  loadSimulDetails,
  loadAllSimul,
  loadWEngineData,
  loadWEngineDetails,
  loadAllWEngines,
} from "@randomplay/data"
import type {
  AgentName,
  BangbooName,
  DriveDiscName,
  MonsterId,
  ShiyuId,
  BossId,
  SimulId,
  WEngineName,
} from "@randomplay/data"

const name: AgentName = "Astra Yao"
const data = await loadAgentData(name)
const details = await loadAgentDetails(name, "zh")
const index = await loadIndex() // 完整 v3 来源索引，不加载实体
const all = await loadAllAgents("en") // 显式加载全部代理人公共资料和英文详情
const disc: DriveDiscName = "Woodpecker Electro"
const discData = await loadDriveDiscData(disc)
const discDetails = await loadDriveDiscDetails(disc, "zh")
const allDiscs = await loadAllDriveDiscs("en") // 显式加载全部驱动盘套装公共资料和英文详情
const engine: WEngineName = "[Lunar] Pleniluna"
const engineData = await loadWEngineData(engine)
const engineDetails = await loadWEngineDetails(engine, "zh")
const allEngines = await loadAllWEngines("en") // 显式加载全部 WEngine 公共资料和英文详情
const boo: BangbooName = "Penguinboo"
const booData = await loadBangbooData(boo)
const booDetails = await loadBangbooDetails(boo, "zh")
const allBoos = await loadAllBangboos("en") // 显式加载全部邦布公共资料和英文详情
const monster: MonsterId = "10000" // 怪物公开身份是来源 ID：名称在类内大量重名
const monsterData = await loadMonsterData(monster)
const monsterDetails = await loadMonsterDetails(monster, "zh")
const allMonsters = await loadAllMonsters("en") // 显式加载全部怪物公共资料和英文详情
const shiyu: ShiyuId = "61001" // Shiyu 公开身份同样是来源 ID：类内大量重名
const shiyuData = await loadShiyuData(shiyu)
const shiyuDetails = await loadShiyuDetails(shiyu, "zh")
const allShiyu = await loadAllShiyu("en") // 显式加载全部 Shiyu 区域公共资料和英文详情
const boss: BossId = "69001" // Boss 公开身份同样是来源 ID：类内名称完全同名
const bossData = await loadBossData(boss)
const bossDetails = await loadBossDetails(boss, "zh")
const allBosses = await loadAllBosses("en") // 显式加载全部 Boss 试炼公共资料和英文详情
const simul: SimulId = "101" // Simul 公开身份同样是来源 ID：详情没有顶层名称
const simulData = await loadSimulData(simul)
const simulDetails = await loadSimulDetails(simul, "zh")
const allSimul = await loadAllSimul("en") // 显式加载全部 Simul 模拟战公共资料和英文详情
console.log(
  agentNames,
  data,
  details,
  index.entities.agents.members["1311"],
  all[name],
  driveDiscNames,
  discData,
  discDetails,
  allDiscs[disc],
  wEngineNames,
  engineData,
  engineDetails,
  allEngines[engine],
  bangbooNames,
  booData,
  booDetails,
  allBoos[boo],
  monsterIds,
  monsterData,
  monsterDetails,
  allMonsters[monster],
  shiyuIds,
  shiyuData,
  shiyuDetails,
  allShiyu[shiyu],
  bossIds,
  bossData,
  bossDetails,
  allBosses[boss],
  simulIds,
  simulData,
  simulDetails,
  allSimul[simul],
)
```

Node ESM 也可直接读取原样 JSON：

```js
import data from "@randomplay/data/integrated/agents/1311/data.json" with { type: "json" }
import driveDisc from "@randomplay/data/integrated/drive-discs/31000/data.json" with { type: "json" }
import driveDiscZh from "@randomplay/data/integrated/drive-discs/31000/details.zh.json" with { type: "json" }
import wEngine from "@randomplay/data/integrated/w-engines/12001/data.json" with { type: "json" }
import wEngineZh from "@randomplay/data/integrated/w-engines/12001/details.zh.json" with { type: "json" }
import bangboo from "@randomplay/data/integrated/bangboos/53001/data.json" with { type: "json" }
import bangbooZh from "@randomplay/data/integrated/bangboos/53001/details.zh.json" with { type: "json" }
import monster from "@randomplay/data/integrated/monsters/10000/data.json" with { type: "json" }
import monsterZh from "@randomplay/data/integrated/monsters/10000/details.zh.json" with { type: "json" }
import shiyu from "@randomplay/data/integrated/shiyu/61001/data.json" with { type: "json" }
import shiyuZh from "@randomplay/data/integrated/shiyu/61001/details.zh.json" with { type: "json" }
import boss from "@randomplay/data/integrated/boss/69001/data.json" with { type: "json" }
import bossZh from "@randomplay/data/integrated/boss/69001/details.zh.json" with { type: "json" }
import simul from "@randomplay/data/integrated/simul/101/data.json" with { type: "json" }
import simulZh from "@randomplay/data/integrated/simul/101/details.zh.json" with { type: "json" }
```

名称取英文详情顶层原值，语言必须显式为 `zh` 或 `en`。读取函数每次返回独立对象，根入口不预载数据；
代理人、驱动盘、WEngine 与邦布的名称类型、catalog 与读取函数遵循同一契约；怪物与 Shiyu 名称在类内大量
重名，其公开身份是来源索引顶层 ID 的规范十进制字符串，`MonsterId`/`ShiyuId`、`monsterIds`/`shiyuIds` 与
读取函数遵循同一契约。各类别按需加载互不串读。完整参数、错误、JSON 子路径及兼容性规则统一见
[消费契约](../../docs/specs/data/consumption.md)。

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
命令名称不绑定实体；生成当前已登记类别的完整快照（代理人、驱动盘、WEngine、邦布、怪物、Shiyu、Boss 与 Simul 八类），
要求这八类对应的完整来源输入齐备，不按目录扫描推断成员，也不接受只覆盖部分类别的输入。

生成入口处理首次生成、合法静态 v3 制品的本机初始化，以及受管理数据的恢复与增量更新。
初始化、旧规则及 v2 外壳的处理条件由[更新与恢复协议](../../docs/specs/data/integration.md#81-当前数据集更新与恢复协议)统一规定；独立读取与普通构建不初始化管理记录。
相同输出保留原文件的内容、inode 和 mtime，但仍执行完整候选构建与校验。

控制目录位于目标同级的 `.<目标名>.fairy-state/`，保存永久锁、本机记录、维护报告与事务材料，
不加入 Git 或 npm 包。不要删除 `lock.sqlite`、当前数据或管理记录来绕过错误。
最新报告为该目录下的 `maintenance.json`，其字段、计数与归因见[更新差异报告](../../docs/specs/data/integration.md#更新差异报告)。

Git 更新 JSON 后若与本机记录不一致，按[数据管理状态同步流程](../../docs/specs/data/integration.md#数据管理状态的同步维护)处理，
不能直接重新登记受管理数据。`BUSY`、未完成事务或归属不明的现场应保留并报告。

生成器在安装前格式化候选；不要直接格式化当前 integrated。`pnpm format` 排除该目录，
`pnpm format:check` 仍检查它，旧排版通过生成入口更新。

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

生成、验证、恢复和迁移回执的完整字段见[当前数据集实现与命令](../../docs/specs/data/integration.md#当前数据集实现与命令)；
逐条更新差异保存在制品外的维护报告中。
提交后清理或 stdout 断管失败也可能退出 1，已经提交的数据会保留；应恢复并复验，不能仅按退出码判断是否提交。

摘要证明制品内部字节一致性，不认证来源真实性或同一抓取批次。协议仅支持可信本机 macOS/Linux、同一文件系统及遵守锁的参与者；
进程中断纳入测试，不承诺断电、内核崩溃、网络文件系统或 Windows；读取者需要控制目录写权限。
`typecheck` / `test` 自动准备被 Git 忽略的 `.generated/`；`build` 使用另一份独占发布副本，
仅支持单次构建。真实工作区尚未完成显式迁移时，`build` / `typecheck` / `test` / `pack` 会因发布源仍是 v2 外壳
而明确失败，这是有意的拒绝。生成目录、静态发布边界与 CI 浏览器验收见[消费契约](../../docs/specs/data/consumption.md)。

## 约束

- 本包拥有原始来源、清洗结果和发布数据。
- 本包没有对 `@randomplay/core` 的运行时依赖。
- 整合资料保留来源原文与数值；计算语义由 definitions 单独维护，完整输入由 core 的静态计算入口组装。
