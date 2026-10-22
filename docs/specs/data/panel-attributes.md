# 60 级基础属性与 S 级驱动盘词条

`@randomplay/data` 提供构建局外面板所需的标准化静态属性，当前覆盖 Nanoka 3.3.12+19634983 的全部
62 名角色、103 个音擎，以及通用 S 级满强化驱动盘主副词条。正式类型以
[shared 属性契约](../../../packages/shared/src/attributes.ts)为准；data 的 [`src/attributes/types.ts`](../../../packages/data/src/attributes/types.ts) 重导出共同类型并维护来源清单。
本接口不组装完整面板、不计算伤害、不识别截图，不提供其他等级或品质。

## 读取契约

```ts
import {
  loadAgentLevel60Attributes,
  loadWEngineLevel60Attributes,
  loadSDriveDiscMaxLevelAffixes,
} from "@randomplay/data"

const agent = await loadAgentLevel60Attributes("Astra Yao")
const engine = await loadWEngineLevel60Attributes("Elegant Vanity")
const discs = await loadSDriveDiscMaxLevelAffixes()
const coreB = agent?.coreAttributeBonuses[3]
```

| 接口                                        | 返回类型                                         | 内容                                                                          |
| ------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `loadAgentLevel60Attributes(AgentName)`     | `Promise<AgentLevel60Attributes \| undefined>`   | `level: 60`、培养前 `baseAttributes`、独立核心累计表 `coreAttributeBonuses`   |
| `loadWEngineLevel60Attributes(WEngineName)` | `Promise<WEngineLevel60Attributes \| undefined>` | `level: 60`、`baseAttribute`、`advancedAttribute`                             |
| `loadSDriveDiscMaxLevelAffixes()`           | `Promise<SDriveDiscMaxLevelAffixes>`             | `rarity: "S"`、`enhancement: "maximum"`、`mainStatsBySlot`、`substatsPerRoll` |

名称精确匹配发布名称（agents 的 `AgentName` 为来源索引 en 名，`WEngineName` 为 `WEngineData.names.en`（来源索引 en 名）），沿用
`AgentName` / `WEngineName`，不 trim、补别名或接收数值 ID。
未登记字符串返回 `undefined`；非字符串以 `TypeError` 拒绝。加载失败原样拒绝。每次读取深复制对象树。
根入口不读取 JSON；三个函数各自仅加载目标属性文件，不连带读取原始资料、索引、manifest 或其他实体。
浏览器与 Node 公开行为相同，JSON 模块缓存不影响返回值隔离。

以下公开子路径映射到包内 `dist/definitions/attributes/`，Node 直接导入需要 JSON import attributes：

- `@randomplay/data/definitions/attributes/agents/{来源ID}.json`
- `@randomplay/data/definitions/attributes/w-engines/{来源ID}.json`
- `@randomplay/data/definitions/attributes/drive-disc-affixes.json`
- `@randomplay/data/definitions/attributes/manifest.json`

## 属性语义与计算精度

`value` 使用计算单位：百分比为比例（18% 是 `0.18`），固定值保留点数，基础回能是每秒能量。
基线字段显式标注单位；提升条目同时标注 `attribute`、`operation`、`unit` 和 `value`。

| operation            | 含义                                 | 示例                        |
| -------------------- | ------------------------------------ | --------------------------- |
| `base-add`           | 加入基础值，再供初始百分比计算       | 核心基础攻击、音擎基础攻击  |
| `initial-percentage` | 对相应基础值的比例提升               | 攻击 30%、冲击力 18%        |
| `initial-fixed`      | 初始面板固定加数，不被装备百分比放大 | 驱动盘攻击 316、异常精通 92 |
| `ratio-add`          | 给比例属性增加比例                   | 暴击率 24%、穿透率 24%      |
| `damage-bonus`       | 限定元素的伤害加成                   | 火伤 30%                    |

保留来源公式推导的小数，不提前取整；网页整数不自动成为计算步骤。本表不能证明游戏内部精度。
截图或手动输入值直接采用，不反推隐藏精度。固定穿透 `penetrationValue` 与穿透率
`penetrationRatio` 不混用；5 号位伤害加成保留物理、火、冰、电、以太、风六个独立选项。
各项都是 `damage-bonus`、`ratio`、`0.3`；风伤仅允许 5 号位，复用现有 `wind` 伤害通道。

### 角色与核心

角色基线为 60 级满突破，**不含核心培养提升或核心被动属性转化**。等级 60 不推定核心 F。
核心沿用现有 `coreSkillLevel`：1 为未升级，2—7 对应 A—F。每行已累计，只选一行，不把各行求和。
核心被动增益的参数表与这里的 `extraLevel` 属性表互相独立。

生命、攻击、防御使用 `(初始值 × 10000 + 59 × 成长值 + 满突破累计值 × 10000) / 10000`。
突破只选择 `levelMax = 60` 的一行。异常精通为 `elementMystery`，异常掌控为
`elementAbnormalPower`；暴击率、暴伤、穿透率除以 10000，`spRecover` 除以 100。3.2 新增的
锐暴伤害 `sharpCriticalDamage` 同为万分比直伤属性，除以 10000 进入 `baseAttributes`：
锋御克拉蕾为 `1.5`（基础 150%），其余代理人为 `0`，不以音擎或驱动盘暴伤代替。

| 核心来源 prop         | 属性                                             | 运算与缩放                       |
| --------------------- | ------------------------------------------------ | -------------------------------- |
| 11101 / 12101 / 12201 | health / attack / impact                         | `base-add`，点数                 |
| 11102 / 12102         | health / attack                                  | `initial-percentage`，除以 10000 |
| 20101 / 21101 / 23101 | criticalRate / criticalDamage / penetrationRatio | `ratio-add`，除以 10000          |
| 30501                 | energyRegen                                      | `base-add`，除以 100             |
| 31201 / 31401         | anomalyProficiency / anomalyMastery              | `base-add`，点数                 |

例如耀嘉音基线攻击 `640.7699`、回能 `1.2`；B 累计加基础攻击 25、回能 0.12，F 累计加 75、0.36。
照的 F 核心含生命比例 0.18，千夏含攻击比例 0.21，核心提升不能统一解释成固定值。

常驻被动转化由 core 的[静态面板组装](../core/static-calculation.md#面板与来源)处理。本的防御转攻击来自
`details.zh.passive.level.*.extraProperty`，不在 `extraLevel`，现有静态增益目录也未包含它。
本的 F 核心属性攻击为 `653.0866`、防御 `724.0351`；再应用 F 核心的 80% 防御转攻击后才是
`1232.31468`。属性读取接口不输出该最终结果。命破角色的生命/攻击转贯穿力同样由静态面板组装处理。
已结算面板路径不能再加这些转化。

当前 `penDelta` 全为零，非零时拒绝生成，不能按名称推断为固定穿透。护甲、护盾、抗性与特殊资源
暂不归一化；`spRecover = 0` 是有效零，不以 `rpRecover` 猜测替代。

### 音擎与驱动盘

音擎基础属性为 `baseProperty.value × (10000 + level[60].rate + stars[5].starRate) / 10000`；
按经核对的中文 `name` 路由：`基础攻击力` 产出 `attack` 的 `base-add`（`attack-points`），
3.2 新增的 `基础防御力`（锋御音擎）产出 `defense` 的 `base-add`（`defense-points`），两者共用同一
等级与突破缩放，不按音擎类别猜测属性。高级属性为 `randProperty.value × (10000 + stars[5].randRate) / 10000`，
再按明确单位缩放。`stars[5]` 是满突破，不是精炼 5。玲珑妆匣基础攻击 `713.76`、高级攻击比例 `0.30`，
不按精炼复制属性表；猩红渴望（3.2）基础防御 `431.23`、高级防御比例 `0.48`，同一缩放经独立核对。

高级属性按经核对的中文 `name2` 与格式映射：攻击/生命/防御百分比、冲击力、异常掌控、能量自动回复
使用 `initial-percentage`；暴击率、暴伤、穿透率使用 `ratio-add`，上述数值再除以 10000。
异常精通使用 `initial-fixed` 点数。未知名称、格式、非有限值、负值、不安全整数和缺少阶段均拒绝生成。

驱动盘 1—3 号主词条固定，4—6 号返回全部合法选项，调用方选择一项。副词条表返回每档值；初始词条也算
一档，后续每次强化增加一档。不预设用户实际副词条种类或强化次数，不为每个套装复制这张通用表。

## 面板与增益边界

core 的配装路径计入角色基线、所选核心属性、音擎基础及高级属性、主副词条和满足件数的二件套效果；
4＋2 含两套各自的二件套，每套一次。四件套按有效条件进入增益阶段。套装定义仍以现有 effects 制品为准。
影画按门槛解锁/修改增益，精炼择一取参，均不混入本属性表；提高技能等级的影画条款交给技能倍率选择。

实际面板路径直接采用截图或手动值，跳过已包含的基础、配装和常驻转化，只处理尚未包含的有效增益。
不得为适配 `GeneralStatInput` 要求用户重拆全部基础值，也不得将实际面板直接放入 `baseValue` 后套基础百分比。
已结算面板输入、增益去重和完整伤害衔接见[静态计算规范](../core/static-calculation.md)；技能/动作倍率见[技能动作规范](skill-actions.md)。

## 固定证据、生成与发布

角色与音擎使用经过验证的 Nanoka 3.2 快照（受管理目录持锁，静态工作区按静态消费流程）；既有驱动盘词条来自 ZZZ-HP 固定提交
`0df40c5bc38f8da7ed0f9eed6be87fb8155b8357`，风伤主词条采用下述独立补充证据。公式查验 URL、文件 SHA-256 与用途固定在
[`evidence.json`](../../../packages/data/scripts/panel-attributes/evidence.json)，随 manifest 发布。
Nanoka 前端仅作公式佐证，不升级来源版本；正常消费和构建不联网、不依赖 ZZZ-HP 仓库或 raw。
独立的 93 个已匹配音擎显示攻击样本来自固定提交的 `wengines[].baseAtk`，测试样本保留原文件摘要，
不使用本转换器生成期望值；其余 2 个音擎不冒充跨来源对比通过。

### 风伤主词条的独立补充证据

2026-10-15 核实 [ZenlessData 固定提交 `462563ec0f8ffc7493f6e2a46f64f8b34ea2d547`](https://git.mero.moe/dimbreath/ZenlessData/src/commit/462563ec0f8ffc7493f6e2a46f64f8b34ea2d547/FileCfg/)，
并以 [Enka API 文档固定提交 `88fc20697fda924430943434c11e0c45eb39509f`](https://github.com/EnkaNetwork/API-docs/blob/88fc20697fda924430943434c11e0c45eb39509f/docs/zzz/api.md#formulas)
交叉核对品质与强化公式。补充范围仅为风伤主词条；本轮 D5-1 已把 Nanoka 升级到 3.3.12+19634983，ZZZ-HP 固定提交仍为旧来源，待 D5-2 切换。
旧 ZZZ-HP 的 `dmgBonus: 30` 是通用增伤选项，不能据此声称它已提供独立风伤记录；目标
ZZZ Calculator `d58e276973c3df944bc36fc81a783f3d17018708` 的 `windDmg: 30` 仅作对照，不作为独立来源。

| 原始文件                                  | 核实记录与含义                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `EquipmentRarityTemplateTb.json`          | `CECLEKPMEJB=4` 为 S，`KPJDEHGMFPH=5` 为 5 号位；`BHMOPMMIKAK=405` 指向主词条池，`LGNKABDCGKC=15` 为强化上限。 |
| `RandPropertyLibraryTemplateTb.json`      | `ELJCOOALAMO=405010` 属于池 `405`；属性 `IINHKLMBKBN=32303`，初值 `GAGPGKIOODG=750`。                          |
| `EquipmentLevelTemplateTb.json`           | 品质 `4`、等级 `15` 的累计强化率 `DPKJPJNGJEK=30000`，除以 10000 为 3。                                        |
| `PropertyTemplateTb.json`                 | 属性 `32303` 的名称是 `AddedDamageRatio_Wind`；`CADKKABBIFG=10000`，显示格式为百分比。                         |
| `SmithyBasePropertyChooseTemplateTb.json` | 完整主词条定向选择表中，属性 `32303` 仅出现在槽位 `5`，记录编号 `510`。                                        |

因此满强化风伤为 `750 × (1 + 30000/10000) / 10000 = 0.30`；Enka 的 S 级公式
`初值 × (1 + 等级 × 0.2)` 得到相同结果。原始文件摘要由下载字节计算，ZenlessData 文件同时核对固定
Git blob 身份；相关原始行及 JSON pointer 冻结在[独立证据夹具](../../../packages/data/test/fixtures/drive-disc-wind-evidence.json)，
不由 Fairy 转换器生成期望值。正式 manifest 携带来源 URL、摘要与用途，普通测试离线读取冻结记录。

### 生成与发布校验

manifest 记录 schema 1、规则 `panel-attributes/2`、来源版本、代理人/音擎成员、其 data/中英文详情摘要、
全部派生文件摘要、证据和限制。规则改变时递增规则版本并重建。已知差异以 manifest 的具名
`discrepancies` 为准，包括冲击力 18% 的上游点数处理、耀嘉音异常掌控 93/92、显示取整、本的被动转化、
聚宝箱等音擎的回能单位待核对。属性生成器不据此改写效果定义。

维护者在仓库根目录显式生成候选：

```bash
pnpm --filter @randomplay/data generate:panel-attributes /absolute/pinned-source /absolute/new-candidate
```

`pinned-source` 须含固定提交的 `zzz-hp/src/utils/affixDriveDiscConfig.ts` 和 `affixPanelCalc.ts`，
生成器先核对两文件摘要，再通过既有发布准备获取稳定 integrated，转换、格式化、写入摘要并复验。
输出路径必须不存在，并遵守[候选路径边界](consumption.md#静态发布与受管理目录边界)；命令不覆盖或安装正式 definitions。
审核通过后由维护操作显式替换正式目录并验证。
常规失败清理临时目录；进程强制中断可能留下临时目录或部分候选，应丢弃该候选、换新路径重跑，不能当作正式输出。
本命令不提供安装事务、自动备份或中断恢复协议，也不修改 integrated 或本机管理记录。

来源副本获取不校验旧属性，因此属性过期不会阻止重新生成。`prepare:consumer` 和 build 在另一步冻结全部
definitions，并核对属性 manifest 与同次 integrated 的成员和实际消费文件摘要；无关怪物或关卡更新不使属性过期。
缺文件、额外文件、规则过期、来源/制品摘要不符均拒绝。每次 build 独占 `.publication-*`，类型、catalog、
integrated、definitions 与 manifest 都取自这次副本；构建结束不再复制可变 definitions。dist 再按归档逐文件核对 JSON 值、归档摘要与发布摘要。
data 不新增运行时 core/effects 依赖。

验收沿用 `pnpm check` 和 `pnpm --filter @randomplay/data verify:browser`；覆盖独立数值样本、错误拒绝、
跨调用隔离、消费文件过期检测、构建期间来源/属性同时变化、离线安装、公开类型和开发/生产按需请求。
风伤验收共享[公开入口场景](../../../packages/data/test/fixtures/drive-disc-wind-consumer.ts)：洛克茜快速支援「听凭差遣」
最终 12 级，采用现有 Nanoka 3.2 已确认倍率 `100.8% + 11 × 9.2% = 202%`。固定攻击 `1057.2958`、
目标防御 0、风抗 20%，5 号位生命切换为风伤时，非暴击伤害从 `1708.5900128` 增至 `2221.16701664`，
差值 `512.57700384`；其他伤害通道不变，1—4、6 号位拒绝风伤，已结算面板路径不重复添加。
该场景同时用于源码、Node 离线安装包与浏览器验收，不以目标库维琳娜的已知倍率差异判断风伤公式。
数据管理维护统一遵循[同步流程](integration.md#数据管理状态的同步维护)，静态 worktree 不创建本机管理记录。
