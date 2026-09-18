# 数据消费与 npm 导出契约

本规范是 `@randomplay/data` 公开读取与分发的单一事实来源。字段、来源保真和受管理目录协议见
[来源数据整合规范](integration.md)。本版快照为 Nanoka 3.1，58 个代理人、30 个驱动盘套装、95 个 WEngine、
42 个邦布、293 个怪物、59 个 Shiyu 区域、44 个 Boss 试炼、3 个 Simul 模拟战、zh/en 两种详情语言；公开索引
使用多实体 v3 外壳，类别（`agents`、`drive-discs`、`w-engines`、`bangboos`、`monsters`、`shiyu`、`boss`
与 `simul`）与成员文件摘要来自完整验证后的同一发布副本。驱动盘、WEngine 与邦布已进入生产快照、JSON
子路径导出及根入口的公开名称类型、名称 catalog 与读取 API；怪物、Shiyu、Boss 与 Simul 已进入生产快照、
JSON 子路径导出及根入口的公开 ID 类型、冻结 ID 列表与读取 API。Monster、Shiyu、Boss、Simul 等 End Game
类别名称在类内重名或缺失，公开身份统一使用来源索引顶层 ID 的规范十进制字符串，不套用英文名称唯一性，
也不创造名称、别名或 slug。

## 名称与类型

根入口导出正式字段类型（包含其引用的索引、文件引用、材料计数与来源身份等结构）、`AgentName`、
`LocalizedAgent`、`agentNames`、`DriveDiscName`、`LocalizedDriveDisc`、`driveDiscNames`、`WEngineName`、
`LocalizedWEngine`、`wEngineNames`、`BangbooName`、`LocalizedBangboo`、`bangbooNames`、`MonsterId`、
`LocalizedMonster`、`monsterIds`、`ShiyuId`、`LocalizedShiyu`、`shiyuIds`、`BossId`、`LocalizedBoss`、
`bossIds`、`SimulId`、`LocalizedSimul`、`simulIds` 和二十五个读取函数。
这些类型可供消费者引用，不改变来源 ID 的内部标识用途。`AgentName` 是本次发布所有
`integrated/agents/{来源ID}/details.en.json` 顶层 `name` 原值的精确字符串字面量 union；`DriveDiscName`
同理取 `integrated/drive-discs/{来源ID}/details.en.json`，`WEngineName` 取
`integrated/w-engines/{来源ID}/details.en.json`，`BangbooName` 取
`integrated/bangboos/{来源ID}/details.en.json`。固定取英文，保留大小写、空格及标点，不取
`data.codeName`、索引摘要名或来源索引的 code/en。例如代理人 `1381` 为 `Soldier 0 - Anby`、`1311` 为
`Astra Yao`（codeName 为 `Astra`），驱动盘 `31000` 为 `Woodpecker Electro`，WEngine `12001` 为
`[Lunar] Pleniluna`（保留方括号与空格），邦布 `53001` 为 `Penguinboo`（codeName 拼写一致但属另一字段）、
`53019` 为 `Bild N. Boolok`（保留空格与标点）。
名称、各类别内部英文名称到来源 ID 的映射、导入表及类型均由同一已验证发布副本生成；缺失、非字符串、空名称
或类别内完全重名使构建失败并给出可定位文件，不覆盖、不修改来源。重名检查限定在各类别内；不同类别出现
同名时各套 union 与映射仍按各类别成员独立生成。这些名称约束只适用于名称作为公开身份的类别；
Monster、Shiyu、Boss 与 Simul 的名称是普通来源文本（Simul 无顶层名称），占位名称与类内重名不参与目录
生成，也不触发该检查。发布源必须包含 `agents`、`drive-discs`、`w-engines`、`bangboos`、`monsters`、
`shiyu`、`boss` 与 `simul` 八个类别及完整 zh/en 详情；`MonsterId`/`ShiyuId`/`BossId`/`SimulId` 字面量
union、冻结 ID 列表与懒加载表由同一发布副本对应类别的 `memberIds` 生成。英文更名、
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
由同一已验证发布副本的 `entities.{类别}.memberIds` 生成；ID 精确匹配，
不 trim、不转换 number、不解析科学计数法或补零，未登记字符串返回 undefined，非字符串参数以 TypeError
拒绝。ID 类型不提供任意 string 重载，保留字面量补全。

## 读取接口

```ts
export declare function loadIndex(): Promise<IntegratedSnapshotIndex>
export declare function loadAgentData(
  name: AgentName,
): Promise<AgentData | undefined>
export declare function loadAgentDetails(
  name: AgentName,
  locale: DetailLocale,
): Promise<AgentDetails | undefined>
export interface LocalizedAgent {
  /** 原有公共资料结构。 */
  data: AgentData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: AgentDetails
}
export declare function loadAllAgents(
  locale: DetailLocale,
): Promise<Record<AgentName, LocalizedAgent>>
export declare function loadDriveDiscData(
  name: DriveDiscName,
): Promise<DriveDiscData | undefined>
export declare function loadDriveDiscDetails(
  name: DriveDiscName,
  locale: DetailLocale,
): Promise<DriveDiscDetails | undefined>
export interface LocalizedDriveDisc {
  /** 原有公共资料结构。 */
  data: DriveDiscData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: DriveDiscDetails
}
export declare function loadAllDriveDiscs(
  locale: DetailLocale,
): Promise<Record<DriveDiscName, LocalizedDriveDisc>>
export declare function loadWEngineData(
  name: WEngineName,
): Promise<WEngineData | undefined>
export declare function loadWEngineDetails(
  name: WEngineName,
  locale: DetailLocale,
): Promise<WEngineDetails | undefined>
export interface LocalizedWEngine {
  /** 原有公共资料结构。 */
  data: WEngineData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: WEngineDetails
}
export declare function loadAllWEngines(
  locale: DetailLocale,
): Promise<Record<WEngineName, LocalizedWEngine>>
export declare function loadBangbooData(
  name: BangbooName,
): Promise<BangbooData | undefined>
export declare function loadBangbooDetails(
  name: BangbooName,
  locale: DetailLocale,
): Promise<BangbooDetails | undefined>
export interface LocalizedBangboo {
  /** 原有公共资料结构。 */
  data: BangbooData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: BangbooDetails
}
export declare function loadAllBangboos(
  locale: DetailLocale,
): Promise<Record<BangbooName, LocalizedBangboo>>
export declare function loadMonsterData(
  id: MonsterId,
): Promise<MonsterData | undefined>
export declare function loadMonsterDetails(
  id: MonsterId,
  locale: DetailLocale,
): Promise<MonsterDetails | undefined>
export interface LocalizedMonster {
  /** 原有公共资料结构。 */
  data: MonsterData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: MonsterDetails
}
export declare function loadAllMonsters(
  locale: DetailLocale,
): Promise<Record<MonsterId, LocalizedMonster>>
export declare function loadShiyuData(
  id: ShiyuId,
): Promise<ShiyuData | undefined>
export declare function loadShiyuDetails(
  id: ShiyuId,
  locale: DetailLocale,
): Promise<ShiyuDetails | undefined>
export interface LocalizedShiyu {
  /** 原有公共资料结构。 */
  data: ShiyuData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: ShiyuDetails
}
export declare function loadAllShiyu(
  locale: DetailLocale,
): Promise<Record<ShiyuId, LocalizedShiyu>>
export declare function loadBossData(id: BossId): Promise<BossData | undefined>
export declare function loadBossDetails(
  id: BossId,
  locale: DetailLocale,
): Promise<BossDetails | undefined>
export interface LocalizedBoss {
  /** 原有公共资料结构。 */
  data: BossData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: BossDetails
}
export declare function loadAllBosses(
  locale: DetailLocale,
): Promise<Record<BossId, LocalizedBoss>>
export declare function loadSimulData(
  id: SimulId,
): Promise<SimulData | undefined>
export declare function loadSimulDetails(
  id: SimulId,
  locale: DetailLocale,
): Promise<SimulDetails | undefined>
export interface LocalizedSimul {
  /** 原有公共资料结构。 */
  data: SimulData
  /** 指定语言详情，locale 与调用参数一致。 */
  details: SimulDetails
}
export declare function loadAllSimul(
  locale: DetailLocale,
): Promise<Record<SimulId, LocalizedSimul>>
```

- `loadIndex` 只加载完整原样索引（v3 外壳），包含快照来源输入、全部已登记类别、各类别的规则版本与语言、
  成员文件引用与独立来源索引记录；不加载实体。根导出同时提供 `IntegratedSnapshotIndex`、
  `IntegratedSnapshotEntity`、`IntegratedSnapshotMember` 与 `IntegratedSnapshotSourceInput` 类型；
  旧的 v2 索引外壳类型不再公开导出，公开读取只有一种索引形状。
- `loadAgentData` 只加载该成员 data；`loadAgentDetails` 只加载该成员指定语言 details。均无需先调用索引。
- `loadAllAgents` 显式加载本版全部 data 与指定语言 details，目前为 58 + 58 个文件；结果以 AgentName 为 key。
  `data` 和 `details` 保持两个独立对象，不合并同名字段。索引的成员表是
  `entities.agents.members`，仍以来源数字字符串为 key。
- `loadDriveDiscData` 只加载该套装 data；`loadDriveDiscDetails` 只加载该套装指定语言 details；
  `loadAllDriveDiscs` 显式加载全部驱动盘套装 data 与指定语言 details，目前为 30 + 30 个文件，结果以
  DriveDiscName 为 key，`data` 与 `details` 同样分开保留。索引的成员表是
  `entities["drive-discs"].members`。
- `loadWEngineData` 只加载该 WEngine data；`loadWEngineDetails` 只加载该 WEngine 指定语言 details；
  `loadAllWEngines` 显式加载全部 WEngine data 与指定语言 details，目前为 95 + 95 个文件，结果以
  WEngineName 为 key，`data` 与 `details` 同样分开保留。索引的成员表是 `entities["w-engines"].members`。
- `loadBangbooData` 只加载该邦布 data；`loadBangbooDetails` 只加载该邦布指定语言 details；
  `loadAllBangboos` 显式加载全部邦布 data 与指定语言 details，目前为 42 + 42 个文件，结果以
  BangbooName 为 key，`data` 与 `details` 同样分开保留。索引的成员表是 `entities["bangboos"].members`。
- `loadMonsterData` 只加载该怪物 data；`loadMonsterDetails` 只加载该怪物指定语言 details；两者以来源 ID
  （规范十进制字符串）为身份，ID 精确匹配，不 trim、不转换 number、不解析科学计数法或补零；未登记 ID
  返回 undefined，非字符串以 TypeError 拒绝，locale 校验先于 ID 查找。`loadAllMonsters` 显式加载全部怪物
  data 与指定语言 details，目前为 293 + 293 个文件，结果以 MonsterId 为 key，`data` 与 `details` 同样分开
  保留。索引的成员表是 `entities["monsters"].members`。
- `loadShiyuData`/`loadShiyuDetails`/`loadAllShiyu` 遵循与 Monster 相同的按 ID 读取契约；`loadAllShiyu`
  目前为 59 + 59 个文件，结果以 ShiyuId 为 key。索引的成员表是 `entities["shiyu"].members`。
- `loadBossData`/`loadBossDetails`/`loadAllBosses` 遵循与 Monster 相同的按 ID 读取契约；`loadAllBosses`
  目前为 44 + 44 个文件，结果以 BossId 为 key。索引的成员表是 `entities["boss"].members`。
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

## 分发与按需加载

包保持 ESM，Node 范围沿用包清单，浏览器首版验收目标为 Vite 开发与生产消费。根入口导入不加载任何数据 JSON；
允许加载小型名称元数据和显式动态导入表。Node 与 browser 条件入口由同一源码和副本生成；
Node 使用 JSON 导入属性，browser 入口交由 Vite 转换 JSON，默认开发预构建无需额外 exclude 配置。消费者无需配置路径表或运行生成器，无运行时服务、CDN 或 core 依赖。
npm 安装包含完整数据；浏览器只在调用时请求对应 JSON 模块或构建后的分块，全量读取需显式调用。

公开 JSON 子路径（前缀 `@randomplay/data`）：

- `/integrated/index.json`
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

这些路径映射到包内 `dist/integrated/` 的已验证发布副本。JSON 原字节、字段、层级、文件名、摘要全部保留，
索引成员引用为 `files.data` 与 `files.details.{locale}`。包内包含八个类别的完整数据；根入口的名称与 ID
元数据及显式动态导入表引用全部已发布 JSON，但导入根入口仍不加载任何数据 JSON：浏览器只在调用对应函数时
请求该 JSON 模块或构建后的分块，全量读取需显式调用。包只包含 dist 与 npm 标准清单、README、LICENSE；
不包含 raw、本机控制目录、抓取/恢复工具及内部维护材料。直接 JSON 导入遵循宿主模块缓存语义；
返回对象隔离保证属于上述二十五个函数。

## 静态发布与受管理目录边界

整合规范第 8 节的「读取同一批字节、复核摘要后使用」继续适用于维护、再次导出及准备发布副本。
准备阶段复用完整验证器，并拒绝输入根目录为符号链接，避免漏认真实目标的管理状态。
若同级控制目录存在，必须使用原持锁读取协议，在回调持锁期间读完并复制全部字节，
不能返回路径后解锁再读取，也不自动初始化、恢复或重置本机记录。没有控制目录的新克隆可直接验证已跟踪的静态 JSON，
无需 raw 或本机管理状态。静态输入在复制期间不得并发初始化/修改，检测到新增控制目录即拒绝。
受管理目录因已接入实体、整合规则、来源版本或 `integrated` 变化需要同步维护时，按整合规范的
[数据管理状态的同步维护](integration.md#数据管理状态的同步维护)执行；发布路径本身不做隐式修复。
发布的文件清单来自完整验证后的 v3 索引，覆盖全部已登记类别；类型、名称、映射与 JSON 来自同一已验证发布副本。
受管理源仍是 v2 外壳时明确报 `MIGRATION_REQUIRED`，提示先运行 `migrate:nanoka:current`，不隐式转换、不改写数据；
只登记部分历史语言的数据集在普通读取与当前验证时报 `INCOMPLETE_LANGUAGES`，提示按当前完整语言配置重新生成，
发布要求完整语言配置。

构建在独占临时副本完整验证后生成类型、名称与导入表，并只从该副本构建和复制到 dist；
不会在生成类型后重新打包可变 integrated。打包前复验发布副本，解包验收再次核对实际文件集合、原字节和摘要。
公开 API 消费随 npm 版本固定的快照，不接受本地目录，不操作锁或恢复记录，运行时不重算原 JSON 的 SHA-256。
这将维护时的字节完整性检查落实在发布边界；不把静态模块缓存当作受管理目录并发读取协议，也不认证来源真实性。
普通 build/test/check/pack 不读取真实 raw、不抓取、不生成或格式化真实 integrated。

真实工作区若尚未完成显式迁移，`build`、`typecheck`、`test` 与 `pack` 都会因发布源仍是 v2 外壳而明确失败；
这是有意的拒绝，不是可以绕过的错误。`typecheck`、`test`（含 watch/coverage）通过 `prepare:consumer` 自动重建包内 `.generated/`，
其中包含本地类型检查使用的已验证副本和名称目录；它被 Git 忽略，不是发布输入。
每次 `build` 另建独占 `.publication-*/` 副本，成功后或进程退出时清理。
构建仅支持单次运行，`build --watch` 在创建副本或清理 dist 前拒绝；修改后重新运行 `build`。

## 验收入口

`pnpm --filter @randomplay/data check` 覆盖名称生成、类型、API、静态/受管理发布准备及实际打包解包、离线安装；
它在一次运行内只准备一次 `.generated/`，随后依次执行类型检查、常规测试与打包验收。
常规测试按 `vitest.config.ts` 的 project 分层：`pnpm --filter @randomplay/data test:fast` 只运行不启动真实进程、
真实格式化或制品构建的快速单元与 API 层，适合日常迭代；`pnpm --filter @randomplay/data test:integration` 运行事务、
真实进程、真实格式化与发布链路；`test` 运行两层全部常规测试（含 watch/coverage）。分层只影响入口选择，
不缩减 `check` 与 CI 的覆盖范围。
`pnpm --filter @randomplay/data verify:browser` 对离线安装包进行真实 Chromium 的 Vite 开发/生产请求验收，
输出 npm/解包字节数、初始与按需请求字节数、gzip 参考值和分块清单；gzip 是离线测量，不冒充服务器实际压缩传输量。
浏览器验收需要本机 Playwright Chromium（首次运行 `pnpm --filter @randomplay/data exec playwright install chromium`）；测试使用合成 fixture，包与浏览器验收使用已跟踪的完整静态快照。

CI 的 Node 24 作业安装 Chromium 并运行 `verify:browser`；普通 `check` 不要求本机浏览器。
打包验收的临时 checkout 使用独立离线安装的依赖，避免 IDE 或直接启动测试时改写工作区依赖。
