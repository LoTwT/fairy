# 数据消费与 npm 导出契约

标准化属性另提供 `loadAgentLevel60Attributes`、`loadWEngineLevel60Attributes` 和
`loadSDriveDiscMaxLevelAffixes`，及 `definitions/attributes/` 的四类 JSON 子路径。
类型、数值语义、来源与生成边界统一见[60 级属性规范](panel-attributes.md)，下文原始资料接口保持来源语义。

本规范是 `@randomplay/data` 公开读取与分发的单一事实来源。字段、来源保真和受管理目录协议见
[来源数据整合规范](integration.md)。本版快照为 Nanoka 3.2，60 个代理人、30 个驱动盘套装、100 个 WEngine、
42 个邦布、306 个怪物、62 个 Shiyu 区域、47 个 Boss 试炼、3 个 Simul 模拟战、zh/en 两种详情语言。
成员集合与数量以[发布源索引](../../../packages/data/integrated/index.json)的各类别 `memberIds` 为准；公开索引
使用多实体 v3 外壳，类别（`agents`、`drive-discs`、`w-engines`、`bangboos`、`monsters`、`shiyu`、`boss`
与 `simul`）与成员文件摘要来自完整验证后的同一归档副本；发布副本的排版与字节摘要见
[发布副本与摘要双链](#发布副本与摘要双链)。驱动盘、WEngine 与邦布已进入生产快照、JSON
子路径导出及根入口的公开名称类型、名称 catalog 与读取 API；怪物、Shiyu、Boss 与 Simul 已进入生产快照、
JSON 子路径导出及根入口的公开 ID 类型、冻结 ID 列表与读取 API。Monster、Shiyu、Boss、Simul 等 End Game
类别名称在类内重名或缺失，公开身份统一使用来源索引顶层 ID 的规范十进制字符串，不套用英文名称唯一性，
也不创造名称、别名或 slug。

## 名称与类型

根入口导出正式字段类型（包含其引用的索引、文件引用、材料计数与来源身份等结构）、八个类别的公开身份类型
与冻结身份列表（`AgentName`、`agentNames`、`DriveDiscName`、`driveDiscNames`、`WEngineName`、`wEngineNames`、
`BangbooName`、`bangbooNames`、`MonsterId`、`monsterIds`、`ShiyuId`、`shiyuIds`、`BossId`、`bossIds`、
`SimulId`、`simulIds`）、四个名称身份类别的来源 ID 类型与名称/ID 双向冻结映射（见
[身份映射与持久化](#身份映射与持久化)）、`Localized` 泛型与八个类别别名、`snapshotInfo` 快照信息常量、
三十八个读取函数、两个纯解析函数（`resolveAgentSkillLevel`、`resolveAgentAction`）与
`calculationDataVersion`。本节与[读取接口](#读取接口)共同构成根入口全部导出的唯一清单：技能动作读取
与等级解析的语义见[技能动作规范](skill-actions.md)，标准化属性读取的语义见
[60 级属性规范](panel-attributes.md)，静态计算资料读取与错误契约见[读取接口](#读取接口)；
未在本节或读取接口登记的名称不属于根入口导出。这些类型可供消费者引用，不改变来源 ID 的内部标识用途。`AgentName` 是本次发布所有
`integrated/agents/{来源ID}/data.json` 的 `names.en` 原值的精确字符串字面量 union——即来源索引
`character.json` 成员的 `en` 名称，作为稳定来源与英文详情显示名解耦（本地 3.2 两者取值一致；
上游改写详情翻译不再构成 `AgentName` 的类型变化）。`DriveDiscName`、`WEngineName` 与 `BangbooName`
自本版起同样读取各自 `data.json` 的 `names.en`（来源索引记录的 `en` 名称），不再读取
`details.en.json` 顶层 `name`。固定取英文，保留大小写、空格及标点，不取
`data.codeName`。例如代理人 `1381` 为 `Soldier 0 - Anby`、`1311` 为
`Astra Yao`（codeName 为 `Astra`），驱动盘 `31000` 为 `Woodpecker Electro`，WEngine `12001` 为
`[Lunar] Pleniluna`（保留方括号与空格），邦布 `53001` 为 `Penguinboo`（codeName 拼写一致但属另一字段）、
`53019` 为 `Bild N. Boolok`（保留空格与标点）。
本地化（zh）名称不在 `agentNames` 等名称常量导出中，需按成员调用 `loadAgentDetails` 等对应类别的
details 读取函数，从返回的当前语言 details 顶层 `name` 读取（如代理人 `1151` 的 zh 名称为「露西」）。
名称、各类别内部英文名称到来源 ID 的映射、导入表及类型均由同一已验证快照生成；缺失、非字符串、空名称
或类别内完全重名使构建失败并给出可定位文件，不覆盖、不修改来源。重名检查限定在各类别内；不同类别出现
同名时各套 union 与映射仍按各类别成员独立生成。这些名称约束只适用于名称作为公开身份的类别；
Monster、Shiyu、Boss 与 Simul 的名称是普通来源文本（Simul 无顶层名称），占位名称与类内重名不参与目录
生成，也不触发该检查。发布源必须包含 `agents`、`drive-discs`、`w-engines`、`bangboos`、`monsters`、
`shiyu`、`boss` 与 `simul` 八个类别及完整 zh/en 详情；`MonsterId`/`ShiyuId`/`BossId`/`SimulId` 字面量
union、冻结 ID 列表与懒加载表由同一已验证快照对应类别的 `memberIds` 生成。英文更名、
成员删除属于公开取值的兼容性变化，须在该次变更的 Git 记录或发布说明中明确记录，不自动添加别名。
来源数字字符串目录、索引 key、`SourceId` 和数值成员 `data.id` 保持原义。

`agentNames: readonly AgentName[]`、`driveDiscNames: readonly DriveDiscName[]`、
`wEngineNames: readonly WEngineName[]` 与 `bangbooNames: readonly BangbooName[]` 分别覆盖本版全部成员，
沿用索引 `entities.{类别}.memberIds` 的来源 ID 数值升序，运行时冻结，调用方不能通过修改列表影响后续使用。
名称类型不提供任意 string 重载，保留字面量补全。

`MonsterId` 是本次发布全部 `integrated/monsters/{来源ID}` 成员的来源索引顶层 ID（规范十进制字符串）的
精确字面量 union；`monsterIds: readonly MonsterId[]` 覆盖本版全部怪物成员，沿用同一 memberIds 数值升序，
运行时冻结。`ShiyuId` 与 `shiyuIds` 同理取 `integrated/shiyu/{来源ID}` 成员，`BossId` 与 `bossIds` 同理取
`integrated/boss/{来源ID}` 成员，`SimulId` 与 `simulIds` 同理取 `integrated/simul/{来源ID}` 成员。
ID 字面量、冻结列表与懒加载表
由同一已验证快照的 `entities.{类别}.memberIds` 生成；ID 精确匹配，
不 trim、不转换 number、不解析科学计数法或补零，未登记字符串返回 undefined，非字符串参数以 TypeError
拒绝。ID 类型不提供任意 string 重载，保留字面量补全。

### 身份映射与持久化

`AgentSourceId`、`DriveDiscSourceId`、`WEngineSourceId` 与 `BangbooSourceId` 是四个名称身份类别
本次发布全部成员的来源索引顶层 ID（规范十进制字符串）精确字面量 union，取值与实体文件路径、索引成员
key 及 End Game 类别的 ID 身份同一空间，由同一已验证快照对应类别的 `memberIds` 生成。
`agentSourceIds: Readonly<Record<AgentName, AgentSourceId>>`、`driveDiscSourceIds`、`wEngineSourceIds`
与 `bangbooSourceIds` 是名称 → 来源 ID 的冻结映射；`agentNamesBySourceId:
Readonly<Record<AgentSourceId, AgentName>>`、`driveDiscNamesBySourceId`、`wEngineNamesBySourceId` 与
`bangbooNamesBySourceId` 是互为反向的来源 ID → 名称冻结映射。两组映射覆盖本版全部成员、运行时冻结，
调用方不能通过修改映射影响后续使用；查找精确匹配，不提供任意 string 重载。名称与 ID 的对应已经通过
`data.id` 间接公开，映射只是把同一事实变成可直接引用的常量，不新增身份空间或读取路径；英文更名时
正向与反向映射同步变化，属于须在发布说明记录的兼容性变化。

持久化建议：跨版本保存配装、队伍或扫描结果时保存来源 ID 与快照版本（`snapshotInfo.source.version`），
英文名称只作为本次发布的 API 键与显示文本，读取时用反向映射换回当前名称。core 静态计算输入中的
`agentEntityId`、`wEngine.entityId` 与 `driveDiscs[n].setEntityId` 同样使用来源 ID，组装时应取自这些
映射或读取结果的 `entityId` 字段，不手写数字。恢复持久化数据时成员可能已被删除：先用 `Object.hasOwn`
查反向映射（如 `Object.hasOwn(agentNamesBySourceId, id)`），查不到的 ID 视为本版不可用，与
`loadStaticCalculationData` 的 `UnknownCalculationEntitiesError` 走同一条处理路径；把失效 ID 经反向映射
得到的 undefined 传给名称参数会以 TypeError 拒绝，不属于"未知身份"语义。

身份划分原则：展示与浏览类读取以类别公开身份为键（名称类别用英文名称，ID 类别用来源 ID）；计算输入
一律使用来源 ID。划分依据是值最终在哪里被消费——core 的 `StaticActorConfiguration` 全程以 `entityId`
关联，名称在计算链中不出现——`loadStaticCalculationData` 的 selection 是计算入口，只接受来源 ID。

## 读取接口

```ts
export interface Localized<Data, Details> {
  /** 原有公共资料结构。 */
  data: Data
  /** 指定语言详情，locale 与调用参数一致。 */
  details: Details
}
export type LocalizedAgent = Localized<AgentData, AgentDetails>
export type LocalizedDriveDisc = Localized<DriveDiscData, DriveDiscDetails>
export type LocalizedWEngine = Localized<WEngineData, WEngineDetails>
export type LocalizedBangboo = Localized<BangbooData, BangbooDetails>
export type LocalizedMonster = Localized<MonsterData, MonsterDetails>
export type LocalizedShiyu = Localized<ShiyuData, ShiyuDetails>
export type LocalizedBoss = Localized<BossData, BossDetails>
export type LocalizedSimul = Localized<SimulData, SimulDetails>
export declare function loadIndex(): Promise<IntegratedSnapshotIndex>
export declare function loadAgentData(
  name: AgentName,
): Promise<AgentData | undefined>
export declare function loadAgentDetails(
  name: AgentName,
  locale: DetailLocale,
): Promise<AgentDetails | undefined>
export declare function loadAllAgents(
  locale: DetailLocale,
): Promise<Record<AgentName, LocalizedAgent>>
export declare function loadAllAgentData(): Promise<
  Record<AgentName, AgentData>
>
export declare function loadDriveDiscData(
  name: DriveDiscName,
): Promise<DriveDiscData | undefined>
export declare function loadDriveDiscDetails(
  name: DriveDiscName,
  locale: DetailLocale,
): Promise<DriveDiscDetails | undefined>
export declare function loadAllDriveDiscs(
  locale: DetailLocale,
): Promise<Record<DriveDiscName, LocalizedDriveDisc>>
export declare function loadAllDriveDiscData(): Promise<
  Record<DriveDiscName, DriveDiscData>
>
export declare function loadWEngineData(
  name: WEngineName,
): Promise<WEngineData | undefined>
export declare function loadWEngineDetails(
  name: WEngineName,
  locale: DetailLocale,
): Promise<WEngineDetails | undefined>
export declare function loadAllWEngines(
  locale: DetailLocale,
): Promise<Record<WEngineName, LocalizedWEngine>>
export declare function loadAllWEngineData(): Promise<
  Record<WEngineName, WEngineData>
>
export declare function loadBangbooData(
  name: BangbooName,
): Promise<BangbooData | undefined>
export declare function loadBangbooDetails(
  name: BangbooName,
  locale: DetailLocale,
): Promise<BangbooDetails | undefined>
export declare function loadAllBangboos(
  locale: DetailLocale,
): Promise<Record<BangbooName, LocalizedBangboo>>
export declare function loadAllBangbooData(): Promise<
  Record<BangbooName, BangbooData>
>
export declare function loadMonsterData(
  id: MonsterId,
): Promise<MonsterData | undefined>
export declare function loadMonsterDetails(
  id: MonsterId,
  locale: DetailLocale,
): Promise<MonsterDetails | undefined>
export declare function loadAllMonsters(
  locale: DetailLocale,
): Promise<Record<MonsterId, LocalizedMonster>>
export declare function loadAllMonsterData(): Promise<
  Record<MonsterId, MonsterData>
>
export declare function loadShiyuData(
  id: ShiyuId,
): Promise<ShiyuData | undefined>
export declare function loadShiyuDetails(
  id: ShiyuId,
  locale: DetailLocale,
): Promise<ShiyuDetails | undefined>
export declare function loadAllShiyu(
  locale: DetailLocale,
): Promise<Record<ShiyuId, LocalizedShiyu>>
export declare function loadAllShiyuData(): Promise<Record<ShiyuId, ShiyuData>>
export declare function loadBossData(id: BossId): Promise<BossData | undefined>
export declare function loadBossDetails(
  id: BossId,
  locale: DetailLocale,
): Promise<BossDetails | undefined>
export declare function loadAllBosses(
  locale: DetailLocale,
): Promise<Record<BossId, LocalizedBoss>>
export declare function loadAllBossData(): Promise<Record<BossId, BossData>>
export declare function loadSimulData(
  id: SimulId,
): Promise<SimulData | undefined>
export declare function loadSimulDetails(
  id: SimulId,
  locale: DetailLocale,
): Promise<SimulDetails | undefined>
export declare function loadAllSimul(
  locale: DetailLocale,
): Promise<Record<SimulId, LocalizedSimul>>
export declare function loadAllSimulData(): Promise<Record<SimulId, SimulData>>
```

- `loadIndex` 只加载完整索引（v3 外壳；发布排版已压缩，字段、键顺序与 JSON 值不变），包含快照来源输入、全部已登记类别、各类别的规则版本与语言、
  成员文件引用与独立来源索引记录；不加载实体。根导出同时提供 `IntegratedSnapshotIndex`、
  `IntegratedSnapshotEntity`、`IntegratedSnapshotMember` 与 `IntegratedSnapshotSourceInput` 类型；
  旧的 v2 索引外壳类型不再公开导出，公开读取只有一种索引形状。`loadIndex` 定位为完整性与归档清单读取：
  其体积主要来自逐成员的 SHA-256 文件摘要与完整 sourceRecord；摘要描述归档字节，公开 API 不在运行时重算摘要，
  发布字节的摘要见 `/publication.json`。
- 根入口同时提供 `IntegratedSnapshotCategory`（八个已接入类别名的字面量 union）与
  `snapshotInfo: IntegratedSnapshotInfo` 冻结常量：常量来自同一已验证快照完整索引的轻量
  信息，含 `format`、`source.id`、`source.version` 与各类别的 `rulesVersion`、`detailLocales`、`memberIds`，
  `entities` 以 `Record<IntegratedSnapshotCategory, …>` 类型化——全部已接入类别都在场，类别属性访问
  不需要存在性判断；不含 sourceRecord、文件引用或输入摘要，运行时深冻结，导入根入口即可同步访问。
  只想读取快照身份、类别规则版本或成员清单时使用它，不必加载完整索引。`loadIndex` 返回的完整索引
  保持开放类别 key（历史迁移与合成验收制品可为类别子集），按名称访问前应做存在性检查。
- `loadAgentData` 只加载该成员 data；`loadAgentDetails` 只加载该成员指定语言 details。均无需先调用索引。
- `loadAllAgents` 显式加载本版全部 data 与指定语言 details，目前为 60 + 60 个文件；结果以 AgentName 为 key。
  `data` 和 `details` 保持两个独立对象，不合并同名字段。索引的成员表是
  `entities.agents.members`，仍以来源数字字符串为 key。
- `loadAllAgentData`、`loadAllDriveDiscData`、`loadAllWEngineData`、`loadAllBangbooData`、`loadAllMonsterData`、
  `loadAllShiyuData`、`loadAllBossData` 与 `loadAllSimulData` 只显式加载对应类别全部成员的公共资料，
  不加载任何语言的详情，也不加载索引或其他类别；结果以该类别公开身份为 key（名称类别按英文名称、
  ID 类别按来源 ID），任一必要文件失败即整体拒绝，每次返回独立对象树。
- `loadDriveDiscData` 只加载该套装 data；`loadDriveDiscDetails` 只加载该套装指定语言 details；
  `loadAllDriveDiscs` 显式加载全部驱动盘套装 data 与指定语言 details，目前为 30 + 30 个文件，结果以
  DriveDiscName 为 key，`data` 与 `details` 同样分开保留。索引的成员表是
  `entities["drive-discs"].members`。
- `loadWEngineData` 只加载该 WEngine data；`loadWEngineDetails` 只加载该 WEngine 指定语言 details；
  `loadAllWEngines` 显式加载全部 WEngine data 与指定语言 details，目前为 100 + 100 个文件，结果以
  WEngineName 为 key，`data` 与 `details` 同样分开保留。索引的成员表是 `entities["w-engines"].members`。
- `loadBangbooData` 只加载该邦布 data；`loadBangbooDetails` 只加载该邦布指定语言 details；
  `loadAllBangboos` 显式加载全部邦布 data 与指定语言 details，目前为 42 + 42 个文件，结果以
  BangbooName 为 key，`data` 与 `details` 同样分开保留。索引的成员表是 `entities["bangboos"].members`。
- `loadMonsterData` 只加载该怪物 data；`loadMonsterDetails` 只加载该怪物指定语言 details；两者以来源 ID
  （规范十进制字符串）为身份，ID 精确匹配，不 trim、不转换 number、不解析科学计数法或补零；未登记 ID
  返回 undefined，非字符串以 TypeError 拒绝，locale 校验先于 ID 查找。`loadAllMonsters` 显式加载全部怪物
  data 与指定语言 details，每个索引成员各读取两个文件，结果以 MonsterId 为 key，`data` 与 `details` 同样分开
  保留。索引的成员表是 `entities["monsters"].members`。
- `loadShiyuData`/`loadShiyuDetails`/`loadAllShiyu` 遵循与 Monster 相同的按 ID 读取契约；`loadAllShiyu`
  读取该类别每个索引成员的 data 与指定语言 details，结果以 ShiyuId 为 key。索引的成员表是 `entities["shiyu"].members`。
- `loadBossData`/`loadBossDetails`/`loadAllBosses` 遵循与 Monster 相同的按 ID 读取契约；`loadAllBosses`
  读取该类别每个索引成员的 data 与指定语言 details，结果以 BossId 为 key。索引的成员表是 `entities["boss"].members`。
- `loadSimulData`/`loadSimulDetails`/`loadAllSimul` 遵循与 Monster 相同的按 ID 读取契约；`loadAllSimul`
  目前为 3 + 3 个文件，结果以 SimulId 为 key。索引的成员表是 `entities["simul"].members`。
- 每次调用返回独立的 JSON 对象树，任意嵌套修改不污染后续调用、同时调用或其他调用方。
- 名称精确匹配，不 trim、不忽略大小写、不接受数值 ID。单体函数对未知字符串返回 undefined。
- 非字符串 name、缺少或不支持的 locale 均使 Promise 以 TypeError 拒绝。locale 必须显式为 zh 或 en，
  不默认、不转换 zh-CN、不回退；未知名称也不能绕过 locale 校验。
- 已登记文件缺失、JSON 解析或模块加载失败使 Promise 拒绝，不转换为 undefined；全量任一必要项失败即整体拒绝。
- 代理人不加载驱动盘、WEngine、邦布、怪物、Shiyu、Boss 或 Simul 文件，驱动盘不加载代理人、WEngine、
  邦布、怪物、Shiyu、Boss、Simul 文件或索引，WEngine 不加载代理人、驱动盘、邦布、怪物、Shiyu、Boss、
  Simul 文件或索引，邦布不加载代理人、驱动盘、WEngine、怪物、Shiyu、Boss、Simul 文件或索引，怪物不加载
  代理人、驱动盘、WEngine、邦布、Shiyu、Boss、Simul 文件或索引，Shiyu 不加载代理人、驱动盘、WEngine、
  邦布、怪物、Boss、Simul 文件或索引，Boss 不加载代理人、驱动盘、WEngine、邦布、怪物、Shiyu、Simul 文件
  或索引，Simul 不加载代理人、驱动盘、WEngine、邦布、怪物、Shiyu、Boss 文件或索引；各类别加载边界互不
  串读。End Game 类别中的 Monster 引用不触发 Monster 自动加载。
- `loadStaticCalculationData(selection)` 按来源 ID（`AgentSourceId`、`WEngineSourceId`）选择代理人与
  WEngine，一次读取静态计算所需的同版资料（属性、动作、音擎属性、驱动盘词条、静态效果定义、效果目录
  与面板适配规则），返回值由调用方整体传递与缓存。selection 必须是含 `agents`、`wEngines` 两个来源 ID
  字符串数组的对象：selection 不是对象、任一数组缺失或元素不是字符串，都以 TypeError 拒绝；传英文名称
  属于未登记 ID，同样落入未登记分支。任一未登记 ID 以 `UnknownCalculationEntitiesError` 拒绝，其
  `agents` 与 `wEngines` 字段一次列出全部未知来源 ID（保持选择原序与重复），不因第一个未知项短路；
  已登记文件缺失或解析失败同样使 Promise 拒绝，不返回部分结果。重复 ID 按出现次数重复读取，
  空选择返回空成员数组的完整结构。身份组装遵循[身份映射与持久化](#身份映射与持久化)。
- 跨语言共享字段直接消费 `data`：严格共享下，登记为公共的字段（如 `live2D`、`partnerInfo.iconPath`、
  `partnerInfo.roleIcon`、`skill.*.material`、`extraLevel.*.maxLevel`、Shiyu 的 `zone` 数值骨架）要么在
  `data` 中完整存在，要么来源在全部语言缺失——不存在"部分语言提供"的制品状态，读取时没有也不需要
  "先查 data、缺失再读 details 同位置"的回退。`details` 只承载本语言本地化文本；除登记的身份副本
  （如 `details.id`）外，同一来源字段不会同时出现在两个文件中，字段缺失即来源本身缺失，不补默认值。

## 分发与按需加载

技能动作读取与等级解析另见[技能动作规范](skill-actions.md)。`loadAgentActions` 沿用单体懒加载和深复制契约；
`resolveAgentAction`、`resolveAgentSkillLevel` 为不读取 JSON 的纯函数。技能 JSON 子路径为
`/definitions/skills/agents/{来源ID}.json` 与 `/definitions/skills/manifest.json`，与其他 definitions 一起冻结发布。

包保持 ESM，Node 范围沿用包清单，浏览器首版验收目标为 Vite 开发与生产消费。根入口导入不加载任何数据 JSON；
允许加载小型名称与 ID 元数据、名称/ID 冻结映射、`snapshotInfo` 常量和显式动态导入表。Node 与 browser 条件入口由同一源码和副本生成；
Node 使用 JSON 导入属性，browser 入口交由 Vite 转换 JSON，默认开发预构建无需额外 exclude 配置。消费者无需配置路径表或运行生成器，无运行时服务、CDN 或 core 依赖。
npm 安装包含完整数据；浏览器只在调用时请求对应 JSON 模块或构建后的分块，全量读取需显式调用。

公开 JSON 子路径（前缀 `@randomplay/data`）：

- `/definitions/effects/starter.json`
- `/definitions/effects/automatic.json`
- `/definitions/effects/static.json`
- `/definitions/effects/static-catalog.json`
- `/definitions/effects/static-coverage.json`
- `/integrated/index.json`
- `/publication.json`
- `/definitions-publication.json`
- `/integrated/agents/{来源ID}/data.json`
- `/integrated/agents/{来源ID}/details.zh.json`
- `/integrated/agents/{来源ID}/details.en.json`
- `/integrated/drive-discs/{来源ID}/data.json`
- `/integrated/drive-discs/{来源ID}/details.zh.json`
- `/integrated/drive-discs/{来源ID}/details.en.json`
- `/integrated/w-engines/{来源ID}/data.json`
- `/integrated/w-engines/{来源ID}/details.zh.json`
- `/integrated/w-engines/{来源ID}/details.en.json`
- `/integrated/bangboos/{来源ID}/data.json`
- `/integrated/bangboos/{来源ID}/details.zh.json`
- `/integrated/bangboos/{来源ID}/details.en.json`
- `/integrated/monsters/{来源ID}/data.json`
- `/integrated/monsters/{来源ID}/details.zh.json`
- `/integrated/monsters/{来源ID}/details.en.json`
- `/integrated/shiyu/{来源ID}/data.json`
- `/integrated/shiyu/{来源ID}/details.zh.json`
- `/integrated/shiyu/{来源ID}/details.en.json`
- `/integrated/boss/{来源ID}/data.json`
- `/integrated/boss/{来源ID}/details.zh.json`
- `/integrated/boss/{来源ID}/details.en.json`
- `/integrated/simul/{来源ID}/data.json`
- `/integrated/simul/{来源ID}/details.zh.json`
- `/integrated/simul/{来源ID}/details.en.json`

这些路径映射到包内对应 `dist/` 的已验证发布副本：`/integrated/*` 来自受管理归档副本生成的发布副本，`/definitions/effects/*.json` 是 Git 跟踪的静态效果规则集，构建时逐文件字节复验后冻结归档，再发布压缩副本；`/definitions-publication.json` 记录 definitions 归档 → 发布的摘要映射。`starter.json` 保留耀嘉音核心、耀嘉音 2 影与啄木鸟电音两件套三条规则，`automatic.json` 的范围由[首批自动规则接入](../effects/automatic-rules.md)维护；类型与执行契约由[统一效果规则模型](../effects/index.md)维护。导入根入口不加载任何数据或定义 JSON，效果定义同样只在显式导入该子路径时读取。JSON 字段、层级、文件名与 JSON 值全部保留；`integrated` 的发布字节只删除字符串外的排版空白，归档字节摘要与发布字节摘要的映射见 `dist/publication.json`（[发布副本与摘要双链](#发布副本与摘要双链)），
索引成员引用为 `files.data` 与 `files.details.{locale}`。包内包含八个类别的完整数据；根入口的名称与 ID
元数据、名称/ID 冻结映射、快照信息常量及显式动态导入表引用全部已发布 JSON，但导入根入口仍不加载任何数据 JSON：浏览器只在调用对应函数时
请求该 JSON 模块或构建后的分块，全量读取需显式调用。包只包含 dist 与 npm 标准清单、README、LICENSE；
不包含 raw、本机控制目录、抓取/恢复工具及内部维护材料。直接 JSON 导入遵循宿主模块缓存语义；
返回对象隔离保证属于根入口导出的全部读取函数。

## 自动效果消费

应用显式导入 `@randomplay/data/definitions/effects/automatic.json`（Node 使用 `with { type: "json" }`，Vite 直接导入 JSON），将导入结果交给 `@randomplay/core` 的 `parseEffectRuleSet`。依次调用 `prepareEffects` 绑定适用装备及精炼档位、`supplyEffectState` 建立会话，再用 `advanceEffects` 按真实事件推进。每一步都检查 `Result.ok`，缺少实体或队伍事实的错误不能解释为未触发。data 与 core 之间没有运行时包依赖。

静态目录消费使用 `static.json`、`static-catalog.json` 与 core 的 `calculateStaticDamageFromCatalog`；逐条支持状态与缺失原因在 `static-coverage.json`。三个显式子路径与其它 definitions 一样，发布时只删除 JSON 字符串之外的排版空白；归档字节 → 发布字节的映射见 `dist/definitions-publication.json`。根入口不导入它们。新静态规则集是独立消费单位，不与 starter / automatic 的重复机制直接拼接。完整输入和覆盖边界见[静态数据接入规范](zzz-hp-static-effects.md)。Node 打包消费及 Vite 开发/生产消费均验证目录计算和根入口冷启动边界。

当前 `entry` 仅代表快速支援、连携技、招架支援、回避支援四种真实入场。普通切人不在其中；调用方不得把其他动作标成任意一个合法 `EntryAction`。`entry-followup` 表示关联追加动作，不是第二次入场。事件的来源映射由应用依据真实动作完成，本包不提供未经核实的原始动作 ID 映射。

接受入场后，`advanceEffects` 返回的新状态记录冷却与事件游标，应用须保留并用于后续推进。`requests` 中的 `resource-generation` 只携带持有者的基础能量请求 `baseAmount`，不会改变世界观察或角色能量。执行方按 `requestId` 去重；同一旧状态与事件重算会得到相同请求身份，向新状态重放已处理事件会报 `EVENT_ORDER`。`evaluateEffects` 的面板查询不会再次产生请求。

`baseAmount` 不代表最终能量结算，能量获得效率是否适用仍待确认；不能把效率强制设为 1 或声称已还原最终回能。其他未接入机制与证据缺口见[实例与核对记录](../effects/examples.md#尚需补充的游戏证据)。

`automatic-effects@1` 和 `starter-effects@1` 可分别消费。需要组合时，由应用显式构造自己的 `ruleSetId` 与 `revision`，合并两组的 `effects`、`states`、`actions` 后重新调用 `parseEffectRuleSet`，再准备绑定与运行状态。没有隐式注册表或组合 API，不可复用另一规则集的旧状态。

## 静态发布与受管理目录边界

整合规范第 8 节的「读取同一批字节、复核摘要后使用」继续适用于维护、再次导出及准备发布副本。
准备阶段复用完整验证器，并拒绝输入根目录为符号链接，避免漏认真实目标的管理状态。
若同级控制目录存在，必须使用原持锁读取协议，在回调持锁期间读完并复制全部字节，
不能返回路径后解锁再读取，也不自动初始化、恢复或重置本机记录。没有控制目录的新克隆可直接验证已跟踪的静态 JSON，
无需 raw 或本机管理状态。静态输入在复制期间不得并发初始化/修改，检测到新增控制目录即拒绝。
受管理目录因已接入实体、整合规则、来源版本或 `integrated` 变化需要同步维护时，按整合规范的
[数据管理状态的同步维护](integration.md#数据管理状态的同步维护)执行；发布路径本身不做隐式修复。
发布的文件清单来自完整验证后的 v3 索引，覆盖全部已登记类别；类型、名称、映射与 JSON 来自同一已验证归档副本，
发布副本只删除其 JSON 字符串之外的排版空白。
受管理源仍是 v2 外壳时明确报 `MIGRATION_REQUIRED`，不隐式转换、不改写数据；迁移入口只接受与当前规则版本
及完整语言匹配的 v2 外壳，真实 v2 外壳需按当前规则从 raw 重新生成；
只登记部分历史语言的数据集在普通读取与当前验证时报 `INCOMPLETE_LANGUAGES`，提示按当前完整语言配置重新生成，
发布要求完整语言配置。

构建在独占临时副本完整验证后生成类型、名称与导入表，并只从该副本构建和复制到 dist；
不会在生成类型后重新打包可变 integrated。打包前复验发布副本，解包验收再次核对实际文件集合、发布字节与摘要清单。
全部 definitions 在同次构建准备阶段冻结；冻结完成后复验来源与副本的完整文件集合和字节，捕获期间发生变化则拒绝，
包括不属于属性 manifest 的 effects 制品。属性 manifest 另对照同次 integrated 核对成员与依赖文件摘要；
后续只把固定 definitions 压缩发布到 `dist/definitions`，按归档逐文件核对 JSON 值与摘要并写出
`definitions-publication.json`，不在构建结束重新读取可变定义。旧属性过期不阻止来源副本获取，
仅在消费准备和发布边界拒绝；详见[属性生成与发布](panel-attributes.md#固定证据生成与发布)。
技能 manifest 同时核对角色来源输入、固定语义 registry 和本次冻结的效果目标目录摘要；其过期处理遵循同一边界。
公开 API 消费随 npm 版本固定的快照，不接受本地目录，不操作锁或恢复记录，运行时不重算原 JSON 的 SHA-256。
这将维护时的字节完整性检查落实在发布边界；不把静态模块缓存当作受管理目录并发读取协议，也不认证来源真实性。
普通 build/test/check/pack 不读取真实 raw、不抓取、不生成或格式化真实 integrated。

### 发布副本与摘要双链

归档副本（Git 跟踪的 `packages/data/integrated/`）保持原字节，索引中的 `files.*.sha256` 描述归档字节；
消费快照标识 `calculationDataVersion.snapshotId` 由归档输入（索引、definitions manifests、静态效果与面板规则）
计算，不随发布排版变化。发布副本（`dist/integrated/`）只删除
JSON 字符串之外的排版空白，字符串内容、字段、键顺序与全部 JSON 值不变；因此发布字节与归档字节不同，
但两者表达同一份数据。

`dist/publication.json` 是两侧的字节级映射，外壳为 `fairy-publication-manifest/v1`
（可通过 `@randomplay/data/publication.json` 显式导入，使用 JSON 导入属性时与其它 JSON 子路径一致）：

- `archiveIndexSha256`：归档 `index.json` 的摘要，是本清单与归档快照的唯一绑定；
- `files.{path}`：`archiveSha256`、`publicationSha256`、`archiveBytes`、`publicationBytes`；
  覆盖 `index.json` 与全部成员文件的完整发布清单；
- `source`：来源身份与版本，与发布索引一致。

校验分两层：结构、成员范围、JSON 值与身份由完整验证器按发布字节复核；字节摘要由本清单核对。
发布清单的归档侧摘要必须与索引登记一致，发布侧摘要必须与磁盘实际字节一致；任一侧不符即拒绝。
`index.json` 自身不登记摘要，`archiveIndexSha256` 与 `files["index.json"].archiveSha256` 必须互相一致；
传入归档目录时，验证器会逐文件读取归档字节并独立核对这两个值，而不采信清单自证。
发布清单本身不记录自身摘要，其完整性由 npm tarball 的签名与完整性机制承担；这是清单作为根信任的边界。
`snapshotId` 不随发布排版变化，也不因本清单改变；引用该标识的夹具与消费方无需刷新。

`definitions/` 使用同一类但独立的外壳 `fairy-definitions-publication-manifest/v1`，位于包根
`dist/definitions-publication.json`（子路径 `/definitions-publication.json`），不放进
`dist/definitions/`，以免破坏该目录的精确成员校验。它逐文件记录 `archiveSha256`、
`publicationSha256`、`archiveBytes` 与 `publicationBytes`；归档是 Git 跟踪的 definitions
冻结副本，发布副本只删除 JSON 字符串外的排版空白。属性与技能 manifest 的 `inputs` 继续描述
归档 integrated 字节，`artifacts` 继续描述 definitions 归档字节；校验发布副本时使用新清单的
`publicationSha256`，不能把内部 manifest 的归档摘要当作包内文件摘要。

内部属性和静态增益候选生成命令只接受不存在的输出目录。在创建任何父目录或临时目录前，先解析已有祖先的实际路径，
拒绝输出位于 integrated 或其同级控制目录内；控制目录尚不存在时也同样保护。路径别名不能绕过此检查，
这两个目录名在所属父目录下按 Unicode 兼容规范化及完整大小写转换后的保留名称处理，覆盖大小写、长 s 和连字等路径变体。
来源或控制目录自身为符号链接时同样前置拒绝；拒绝时不在来源或控制目录留下文件、空目录或管理记录。
两个生成器共用独占创建输出目录、再搬入候选内容的安装步骤；并发竞争同一输出时仅一个成功，未取得目录的任务不得替换或清理已有输出。

真实工作区若仍停留在 v2 外壳，`build`、`typecheck`、`test` 与 `pack` 都会明确失败；
这是有意的拒绝，不是可以绕过的错误。当前真实 v2 外壳不匹配迁移契约，补救是按当前规则从 raw 重新生成，
而不是尝试显式迁移。`typecheck`、`test`（含 watch/coverage）通过 `prepare:consumer` 自动重建包内 `.generated/`，
其中包含本地类型检查使用的已验证副本和名称目录；它被 Git 忽略，不是发布输入。
每次 `build` 另建独占 `.publication-*/` 副本，成功后或进程退出时清理。
构建仅支持单次运行，`build --watch` 在创建副本或清理 dist 前拒绝；修改后重新运行 `build`。

## 验收入口

`pnpm --filter @randomplay/data check` 覆盖名称生成、类型、API、静态/受管理发布准备及实际打包解包、离线安装；
它由 `check:source`（`prepare:consumer` + `typecheck:prepared` + `test:prepared`，一次运行只准备一次 `.generated/`）
与 `verify:pack` 组成。core 的 `check` 同样拆出类型检查与常规测试的 `check:source`；根 `check` 保持原有完整覆盖。
常规测试按 `vitest.config.ts` 的 project 分层：`pnpm --filter @randomplay/data test:fast` 只运行不启动真实进程、
真实格式化或制品构建的快速单元与 API 层，适合日常迭代；`pnpm --filter @randomplay/data test:integration` 运行事务、
真实进程、真实格式化与发布链路；`test` 运行两层全部常规测试（含 watch/coverage）。分层只影响入口选择，
不缩减 `check` 与 CI 的覆盖范围。
`pnpm --filter @randomplay/data verify:browser` 对离线安装包进行真实 Chromium 的 Vite 开发/生产请求验收，
输出 npm/解包字节数、初始与按需请求字节数、gzip 参考值和分块清单；gzip 是离线测量，不冒充服务器实际压缩传输量。
打包验收同时离线安装隔离构建的 core 制品，从公开 JSON 子路径解析自动规则并推进得到基础回能请求；浏览器验收额外核对两组定义按需导入，根入口冷启动不请求定义 JSON。

浏览器验收需要本机 Playwright Chromium（首次运行 `pnpm --filter @randomplay/data exec playwright install chromium`）；测试使用合成 fixture，包与浏览器验收使用已跟踪的完整静态快照。

PR CI 以 [check.yml](../../../.github/workflows/check.yml) 为唯一权威定义：源码检查与包消费检查分到两条独立
runner lane 并行，Node 24.11.0 与 Node 24 都运行两条 lane。source lane 先运行 `pnpm check:quality`，再运行
`pnpm --recursive --if-present check:source`；package lane 从冷检出依次运行两个包的 `verify:pack`，其中
Node 24 另安装 Chromium 并运行 `verify:browser`。package lane 不依赖 source lane 的 `dist/`、`.generated/`
或其它构建产物，同一 lane 内的构建、打包与准备步骤保持串行。每个 Node 的汇总检查名为 `Node 24.11.0` 与
`Node 24`，只在两条 lane 都成功时通过，失败、取消或跳过都不产生成功。
本地 `pnpm check` 仍包含质量检查、类型、全部常规测试与两个包的打包验收，覆盖不缩减。
浏览器验收继续使用独立的 `pnpm --filter @randomplay/data verify:browser`。
main 合并不再重复整轮检查，其前提是 main 要求经 PR 合并、两项必需检查通过并启用 strict 最新 base 规则，
且这些规则对实际合并账号生效；合并复用对应 PR 的验证结果并核对合并内容，代码或 base 变化按实际失效范围重新
验证。
打包验收的临时 checkout 使用独立离线安装的依赖，避免 IDE 或直接启动测试时改写工作区依赖。
