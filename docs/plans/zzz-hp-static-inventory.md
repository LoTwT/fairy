# ZZZ-HP 静态增益来源盘点

状态：2026-09-22 的固定输入盘点，批量转换现已落地；实际去向与限制以[正式覆盖报告](../../packages/data/definitions/effects/static-coverage.json)为准。本页的“记录”包含音擎每档精炼的独立来源记录，不表示可叠加规则数量，也不表示已支持的游戏机制数量。正式要求见[接入规范](../specs/data/zzz-hp-static-effects.md)。

## 基线与复核方式

- Fairy 基线：`1c3c0305f6cda77ac48c4f4bc6456a4007ecc3ba`。
- ZZZ-HP 固定提交：`0df40c5bc38f8da7ed0f9eed6be87fb8155b8357`。
- [增益 JSON](https://github.com/Nie7bai/ZZZ-HP/blob/0df40c5bc38f8da7ed0f9eed6be87fb8155b8357/zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json)：8,420,796 字节。
- 增益 SHA-256：`34b8dbeef2f710fd27379502d248f850da5a8c19dc6a0a7568ef51fb4c4fe19c`。
- 本次已验证 Nanoka 副本的 index SHA-256：`6593c21a7b689d00ac39e39da0506852f3ccca1ddd4b232d2e5f686f71d35aea`。
- 通过 `prepare:consumer` 的持锁验证取得本次 `.generated/integrated` 副本后核对身份；没有改写 integrated、raw 或管理记录。
- 对每条选中来源记录反向解析 JSON Pointer，核对其确实指向同一原始对象；统计不跨兼容表示重复累计。

| 固定读取/求值资源                           | SHA-256                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `zzz-hp/src/utils/buffEffect.ts`            | `944d263a8bb3ed8531799792b7a3296bfb9e904002209442883039cf87f4ad95` |
| `zzz-hp/src/utils/panelBuffCalc.ts`         | `43ec23eafa28b8d0748636ab9885e1497fab8cd11e458268acd746c9adc40c09` |
| `zzz-hp/src/utils/damageCalc.ts`            | `2ef2e81cd11af03a3f9a5df82622c238ae3b6f9596346eee97136b7a2b427a71` |
| `zzz-hp/src/utils/multFactorPercent.ts`     | `eee1f52bfa9c128d0e278c5890717c6aa1e897695237a9c6573751489ad311cb` |
| `zzz-hp/src/stores/calculatorBuffs.ts`      | `a080573ff7217ffd37c25e161346240cce2cb121f2bb6b3edd1b350393466e6b` |
| `zzz-hp/src/utils/calculatorUi.ts`          | `e61bf67fab73920889338997d77d12190b45d29cfd5cb49703802a0953fb1cfe` |
| `zzz-hp/src/data/calculatorBuffDefaults.ts` | `4500dbc92ebb0ad649c47d960bdf26cc332e0f896a539d74bbeb945c4ffdacca` |
| `zzz-hp/src/utils/remielUtils.ts`           | `1cb8084a981115924b0cdc64961a67f937c280fe82babe2710758c7b279d8773` |

以下数量盘点按原始资源的代理人 `mindscapeBuffs[0..6]`、音擎 `fixedBuffs` 与 `refinementBuffs[0..4]`、驱动盘两件套入口与 `fourPieceBuffs` 统计。每个 pack 按有实际效果的 effectBlocks、effects、适用旧汇总字段择一路径；本次原始非空 pack 全部选择效果块。完整消费语义还必须先经过上游加载规范化，不能把这份原始位置盘点当作规范化后数据的完整副本。

## 范围与数量

| 类别        | 来源实体 | 当前 Fairy 实体 | 已映射 | 未匹配真实实体 | 占位项 |  pack | 空 pack | 效果记录 |
| ----------- | -------: | --------------: | -----: | -------------: | -----: | ----: | ------: | -------: |
| agents      |       59 |              58 |     58 |              1 |      0 |   413 |     182 |      491 |
| w-engines   |       98 |              95 |     93 |              4 |      1 |   588 |     177 |      726 |
| drive-discs |       30 |              30 |     30 |              0 |      0 |    60 |       7 |       73 |
| 合计        |      187 |             183 |    181 |              5 |      1 | 1,061 |     366 |    1,290 |

- 695 个非空 pack；`fixed` 941 条、`stacked` 278 条、`convert` 71 条。
- 覆盖 52 个 stat 字段；`general` 1,039 条、`skill` 227 条、`anomalyRelease` 12 条、`anomaly` 5 条、`disorder` 4 条、`turbulence` 3 条。
- 157 条记录引用具体技能子分类；自用记录 969 条、团队记录 321 条；失衡条件 24 条、非失衡条件 1 条。
- 37 条记录属于当前未匹配的真实实体；其余 1,253 条身份已可对应，最终转换状态分别保留在正式覆盖报告，不能仅凭身份对应宣称支持。
- 完全没有选中效果记录的实体：16 个音擎（包括 none 占位项）和 2 套驱动盘。空记录不能证明其游戏中没有作用。
- 同一类别、实体、培养位置内，未发现重复的原始 effect ID；跨培养位置及跨实体仍不能直接使用局部 ID。

固定 JSON 另有邦布 4 个、技能子分类 96 个、追加攻击规则 5 个、伤害模式 9 个、技能 1,116 个和技能组 7 个。除本次效果所引用的技能定位信息外，不将这些集合默认为本 PR 已交付范围。

## 明确的身份差异

精确中文原名匹配 173 项；另有 8 项通过英文名称、codeName 或资源身份核对。以下映射不修改任一来源名称：

| 来源类别 / ID                         | 上游名称                | Fairy ID / 中文原值       | 依据                                                                 |
| ------------------------------------- | ----------------------- | ------------------------- | -------------------------------------------------------------------- |
| agents / `pyrois`                     | 佩洛伊斯（影画6待补充） | `1551` / `佩洛伊斯`       | 英文 Pyrois / codeName 对应；上游中文名附带影画缺失提示              |
| agents / `seed`                       | 席德                    | `1461` / `「席德」`       | 英文 Seed / codeName 对应；中文引号差异                              |
| agents / `trigger`                    | 扳机                    | `1361` / `「扳机」`       | 英文 Trigger / codeName 对应；中文引号差异                           |
| agents / `miyabi`                     | 星见雅                  | `1091` / `雅`             | 英文 Miyabi / codeName 对应；中文短名差异                            |
| agents / `harumasa`                   | 浅羽悠真                | `1201` / `悠真`           | 英文 Harumasa / codeName 对应；中文短名差异                          |
| w-engines / `cloudcleave-radiance`    | 云霓弧光                | `14143` / `云霓孤光`      | 英文 Cloudcleave Radiance 对应；弧/孤差异保留                        |
| w-engines / `Half-Sugar_Bunny`        | 半塘雪兔                | `14134` / `半糖雪兔`      | 英文 Half-Sugar Bunny 对应；塘/糖差异保留                            |
| drive-discs / `SuitBunnyinWonderland` | 雪兔梦游仙境            | `33700` / `雪兔梦游仙境 ` | 英文 Bunny in Wonderland 及套装资源身份对应；Nanoka 中文末尾空格保留 |

当前无 Fairy 身份的真实实体为代理人 `claret`（克拉蕾），以及音擎 `Lunar_Semiluna`（「月相」-弦）、`Promotion Stats`（喵运当头）、`Scarlet-Craving`（猩红渴望）、`BloodCasket`（血髓秘匣）。音擎 `none` 是“未选择”占位项。这些项保留来源记录，不编造身份，不因名称相似映射到其他实体。

反向检查：Fairy 已有但本来源音擎目录未收录的记录为：

- `w-engines/12014`：「恒等式」-变格。
- `w-engines/13111`：旋钻机-赤轴。

## 必须进入实现验收的语义事实

- 代理人对象没有显式核心等级字段；mindscapeBuffs 的下标表达影画，不能把 0 影当核心等级或把默认面板当满级证据。
- 音擎实际读取包含跨精炼异常适用标记归并；只逐档平移 JSON 会漏掉调用方行为。
- 倍率修正字段保存增量，实际组合有先加后乘；不能对每个贡献独立乘算。
- `pierce` 表示贯穿力；`special`、`specialMult`、`specialMultFactor` 使用不同计算位置。
- 来源包含潜能条目、互斥状态、未记录事件历史的手工读取和具体技能目标，需要明确静态选择/输入，不能默认全部有效。
- 灵魂摇滚和震星迪斯科没有实际效果记录；震星迪斯科的空块仍含“冲击力 +6%”描述，但这不等于已经存在可直接转换的结构化效果。若补齐，应明确补充证据。
- 耀嘉音 2 影的负数抵消采用既有具名修正；不可因“ZZZ-HP 第一来源”覆盖已验收正确规则。

## 二次复核：规范化与计算边界

2026-09-23 对上述同一固定输入执行原始 `normalizeBuffEffect` 函数的离线探针：1,290 条选中来源效果中，0 条被移除，9 条补充 `skillTargets`，没有条目在这一步新增异常适用标记。原始函数由 TypeScript 转译执行，其数值、技能键依赖采用固定源码；未启动 Pinia、Vue 或上游应用。该探针不等于上游完整加载流程验收。

| 来源位置                                                 | 规范化后的技能目标                 |
| -------------------------------------------------------- | ---------------------------------- |
| `/driveDiscs/5/twoPieceEffectBlocks/0/effects/0`         | `follow_up`                        |
| `/driveDiscs/5/twoPieceEffectBlocks/0/effects/1`         | `dodge` / `all-dodge-ms0dnpmr`     |
| `/driveDiscs/8/twoPieceEffectBlocks/0/effects/0`         | `basic`                            |
| `/driveDiscs/8/fourPieceBuffs/effectBlocks/0/effects/0`  | `basic`                            |
| `/driveDiscs/12/fourPieceBuffs/effectBlocks/0/effects/0` | `basic`                            |
| `/driveDiscs/12/fourPieceBuffs/effectBlocks/0/effects/1` | `dodge` / `all-dodge-ms0dnpmr`     |
| `/driveDiscs/14/fourPieceBuffs/effectBlocks/0/effects/1` | `ultimate`                         |
| `/driveDiscs/17/fourPieceBuffs/effectBlocks/0/effects/2` | `special` / `all-special-ms0fcqv7` |
| `/driveDiscs/17/fourPieceBuffs/effectBlocks/0/effects/3` | `assist`                           |

随后用 TypeScript AST 提取未改写的 `applyAnomalyFlagsToPack` 与 `withRefinementAnomalyFlags`，对音擎五档数据执行归并。实际有 2 条从未显式标记变为 `appliesToAnomaly: true`：

- 家政员精炼 5：`/wengines/33/refinementBuffs/4/effectBlocks/0/effects/1`。
- 心弦夜响精炼 5：`/wengines/39/refinementBuffs/4/effectBlocks/0/effects/1`。

这两条变化属于跨精炼调用逻辑，与上述单条规范化结果分别记录。数量仍按原始位置计，身份映射与分母未发生改变。

对当前 Fairy 静态入口的合成探针还确认：精通 500 已由规则生成 0.1 异化贡献时，再给已有 helper 参数传精通 500 会得到 1.2，单次换算应为 1.1；旧入口暂不接受已保存的最终异化倍率分支。感电剩余时间 10 秒的 core 标准紊乱倍率为 17，再加一次 3 秒会变成 20.75。这些探针用于锁定新目录接口的输入归属和验收要求，不表示本次已修改引擎代码。修订契约见[派生输入与历史结算值](../specs/data/zzz-hp-static-effects.md#派生输入与历史结算值)。

## 出现的字段

| 字段                       | 来源记录数 |
| -------------------------- | ---------: |
| `anomalyControl`           |         22 |
| `anomalyControlPercent`    |          1 |
| `anomalyCritDmg`           |          4 |
| `anomalyCritRate`          |          2 |
| `anomalyDmgBonus`          |         27 |
| `anomalyDuration`          |          5 |
| `anomalyReleaseCritDmg`    |          1 |
| `anomalyReleaseCritRate`   |          3 |
| `anomalyReleaseDmgBonus`   |          6 |
| `anomalyReleaseMult`       |         24 |
| `anomalyReleaseMultFactor` |          5 |
| `atk`                      |         31 |
| `critDmg`                  |        107 |
| `critRate`                 |        115 |
| `def`                      |          1 |
| `directDmgMult`            |         24 |
| `directDmgMultFactor`      |          2 |
| `disorderBaseMult`         |          3 |
| `disorderBaseMultFactor`   |          5 |
| `disorderDmgBonus`         |         19 |
| `dmgBonus`                 |        277 |
| `energyRegen`              |         57 |
| `externalAtkPercent`       |          2 |
| `externalDefPercent`       |          1 |
| `externalHpPercent`        |          2 |
| `globalStaggerVulnerable`  |          2 |
| `inCombatAtkPercent`       |         97 |
| `inCombatDefPercent`       |          5 |
| `inCombatHpPercent`        |         25 |
| `mastery`                  |         91 |
| `mutationCoeff`            |          3 |
| `penRate`                  |         10 |
| `pierce`                   |         10 |
| `pierceDmgBonus`           |         25 |
| `radianceMult`             |          1 |
| `radianceMultFactor`       |          1 |
| `radianceResPen`           |          1 |
| `reduceDefense`            |         45 |
| `resPen`                   |         67 |
| `settlementDmgMult`        |          5 |
| `sharpenCritDmgBonus`      |          2 |
| `sharpenDmgBonus`          |          5 |
| `skillDmgBonus`            |        119 |
| `special`                  |          4 |
| `specialMult`              |          1 |
| `specialMultFactor`        |          1 |
| `staggerVulnerable`        |         11 |
| `staggerVulnerableOnly`    |          2 |
| `turbulenceBaseMult`       |          1 |
| `turbulenceBaseMultFactor` |          1 |
| `turbulenceDmgBonus`       |          8 |
| `vulnerable`               |          1 |

## 全部实体身份清单

表中的数量沿用来源记录口径；0 表示本次读取路径没有效果记录。来源实体 pointer 为固定增益 JSON 中的位置，效果级 pointer 由正式生成器写入覆盖报告。

| 类别        | 上游 ID                     | 名称                    | 来源 pointer     | Fairy ID              | 效果记录 |
| ----------- | --------------------------- | ----------------------- | ---------------- | --------------------- | -------: |
| agents      | `soldier11`                 | 「11号」                | `/agents/0`      | `1041`                |        5 |
| agents      | `alexandrina`               | 丽娜                    | `/agents/1`      | `1211`                |       10 |
| agents      | `yixuan`                    | 仪玄                    | `/agents/2`      | `1371`                |        7 |
| agents      | `yidhari`                   | 伊德海莉                | `/agents/3`      | `1051`                |        8 |
| agents      | `evelyn`                    | 伊芙琳                  | `/agents/4`      | `1321`                |        6 |
| agents      | `pyrois`                    | 佩洛伊斯（影画6待补充） | `/agents/5`      | `1551`                |        6 |
| agents      | `claret`                    | 克拉蕾                  | `/agents/6`      | 当前 Fairy 无匹配实体 |        7 |
| agents      | `caesar`                    | 凯撒                    | `/agents/7`      | `1071`                |        8 |
| agents      | `sunna`                     | 千夏                    | `/agents/8`      | `1491`                |        8 |
| agents      | `nangongyu`                 | 南宫羽                  | `/agents/9`      | `1511`                |       13 |
| agents      | `lucia`                     | 卢西娅                  | `/agents/10`     | `1451`                |       11 |
| agents      | `corin`                     | 可琳                    | `/agents/11`     | `1061`                |        5 |
| agents      | `yeshunguang`               | 叶瞬光                  | `/agents/12`     | `1431`                |        6 |
| agents      | `orphie&magus`              | 奥菲丝&「鬼火」         | `/agents/13`     | `1301`                |       10 |
| agents      | `nicole`                    | 妮可                    | `/agents/14`     | `1031`                |        3 |
| agents      | `anton`                     | 安东                    | `/agents/15`     | `1111`                |        4 |
| agents      | `anby`                      | 安比                    | `/agents/16`     | `1011`                |        2 |
| agents      | `cissia`                    | 希希芙                  | `/agents/17`     | `1521`                |       12 |
| agents      | `xigelide`                  | 希格莉德                | `/agents/18`     | `1591`                |       11 |
| agents      | `seed`                      | 席德                    | `/agents/19`     | `1461`                |       11 |
| agents      | `trigger`                   | 扳机                    | `/agents/20`     | `1361`                |        6 |
| agents      | `sbilly`                    | 星徽·比利               | `/agents/21`     | `1531`                |        8 |
| agents      | `miyabi`                    | 星见雅                  | `/agents/22`     | `1091`                |        7 |
| agents      | `promeia`                   | 普罗米娅                | `/agents/23`     | `1541`                |       13 |
| agents      | `benbigger`                 | 本                      | `/agents/24`     | `1121`                |        2 |
| agents      | `zhuyuan`                   | 朱鸢                    | `/agents/25`     | `1241`                |        6 |
| agents      | `burnice`                   | 柏妮思                  | `/agents/26`     | `1171`                |       13 |
| agents      | `yuzuha`                    | 柚叶                    | `/agents/27`     | `1411`                |       16 |
| agents      | `yanagi`                    | 柳                      | `/agents/28`     | `1221`                |       11 |
| agents      | `grace`                     | 格莉丝                  | `/agents/29`     | `1181`                |        5 |
| agents      | `jufufu`                    | 橘福福                  | `/agents/30`     | `1391`                |       10 |
| agents      | `billy`                     | 比利                    | `/agents/31`     | `1081`                |        5 |
| agents      | `pulchra`                   | 波可娜                  | `/agents/32`     | `1351`                |        6 |
| agents      | `piper`                     | 派派                    | `/agents/33`     | `1281`                |        4 |
| agents      | `harumasa`                  | 浅羽悠真                | `/agents/34`     | `1201`                |        7 |
| agents      | `panyinhu`                  | 潘引壶                  | `/agents/35`     | `1421`                |        4 |
| agents      | `zhao`                      | 照                      | `/agents/36`     | `1341`                |       10 |
| agents      | `alice`                     | 爱丽丝                  | `/agents/37`     | `1401`                |        6 |
| agents      | `aria`                      | 爱芮                    | `/agents/38`     | `1501`                |       17 |
| agents      | `nekomata`                  | 猫又                    | `/agents/39`     | `1021`                |        8 |
| agents      | `koleda`                    | 珂蕾妲                  | `/agents/40`     | `1101`                |        7 |
| agents      | `dialyn`                    | 琉音                    | `/agents/41`     | `1481`                |        7 |
| agents      | `manato`                    | 真斗                    | `/agents/42`     | `1441`                |        7 |
| agents      | `jane`                      | 简                      | `/agents/43`     | `1261`                |       14 |
| agents      | `velina`                    | 维琳娜                  | `/agents/44`     | `1561`                |       15 |
| agents      | `astrayao`                  | 耀嘉音                  | `/agents/45`     | `1311`                |        8 |
| agents      | `banyue`                    | 般岳                    | `/agents/46`     | `1471`                |       11 |
| agents      | `ellen`                     | 艾莲                    | `/agents/47`     | `1191`                |        8 |
| agents      | `soukaku`                   | 苍角                    | `/agents/48`     | `1131`                |        5 |
| agents      | `lycaon`                    | 莱卡恩                  | `/agents/49`     | `1141`                |        4 |
| agents      | `lighter`                   | 莱特                    | `/agents/50`     | `1161`                |       10 |
| agents      | `remiel`                    | 蕾米埃尔                | `/agents/51`     | `1581`                |       15 |
| agents      | `vivian`                    | 薇薇安                  | `/agents/52`     | `1331`                |       14 |
| agents      | `norma`                     | 诺姆                    | `/agents/53`     | `1571`                |       10 |
| agents      | `seth`                      | 赛斯                    | `/agents/54`     | `1271`                |        4 |
| agents      | `hugo`                      | 雨果                    | `/agents/55`     | `1291`                |       15 |
| agents      | `s0anby`                    | 零号·安比               | `/agents/56`     | `1381`                |        9 |
| agents      | `lucy`                      | 露西                    | `/agents/57`     | `1151`                |        3 |
| agents      | `qingyi`                    | 青衣                    | `/agents/58`     | `1251`                |        8 |
| w-engines   | `Identity_Base`             | 「恒等式」-本格         | `/wengines/0`    | `12013`               |        0 |
| w-engines   | `Lunar_Semiluna`            | 「月相」-弦             | `/wengines/1`    | 当前 Fairy 无匹配实体 |        5 |
| w-engines   | `Luna_Descrescent`          | 「月相」-晦             | `/wengines/2`    | `12002`               |        5 |
| w-engines   | `Lunar_Noviluna`            | 「月相」-朔             | `/wengines/3`    | `12003`               |        0 |
| w-engines   | `Lunar_Pleniluna`           | 「月相」-望             | `/wengines/4`    | `12001`               |        5 |
| w-engines   | `Reverb_Mark_III`           | 「残响」-Ⅲ型            | `/wengines/5`    | `12006`               |        5 |
| w-engines   | `Reverb_Mark_II`            | 「残响」-Ⅱ型            | `/wengines/6`    | `12005`               |       10 |
| w-engines   | `Reverb_Mark_I`             | 「残响」-Ⅰ型            | `/wengines/7`    | `12004`               |        0 |
| w-engines   | `Vortex_Hatchet`            | 「湍流」-斧型           | `/wengines/8`    | `12009`               |        0 |
| w-engines   | `Vortex_Arrow`              | 「湍流」-矢型           | `/wengines/9`    | `12008`               |        0 |
| w-engines   | `Vortex_Revolver`           | 「湍流」-铳型           | `/wengines/10`   | `12007`               |        0 |
| w-engines   | `Cinder_Cobalt`             | 「灰烬」-钴蓝           | `/wengines/11`   | `12015`               |        5 |
| w-engines   | `Magnetic_Storm_Charlie`    | 「电磁暴」-叁式         | `/wengines/12`   | `12012`               |        0 |
| w-engines   | `Magnetic_Storm_Alpha`      | 「电磁暴」-壹式         | `/wengines/13`   | `12010`               |        5 |
| w-engines   | `Magnetic_Storm_Bravo`      | 「电磁暴」-贰式         | `/wengines/14`   | `12011`               |        5 |
| w-engines   | `cloudcleave-radiance`      | 云霓弧光                | `/wengines/15`   | `14143`               |       15 |
| w-engines   | `Steam_Oven`                | 人为刀俎                | `/wengines/16`   | `13005`               |        0 |
| w-engines   | `Starlight_Engine_Replica`  | 仿制星徽引擎            | `/wengines/17`   | `13108`               |        5 |
| w-engines   | `Reel_Projector`            | 光影刻刀                | `/wengines/18`   | `13016`               |        0 |
| w-engines   | `Bunny_Band`                | 兔能环                  | `/wengines/19`   | `13010`               |       10 |
| w-engines   | `Cannon_Rotor`              | 加农转子                | `/wengines/20`   | `14001`               |        5 |
| w-engines   | `Practiced_Perfection`      | 十方锻星                | `/wengines/21`   | `14140`               |       10 |
| w-engines   | `Myriad_Eclipse`            | 千面日陨                | `/wengines/22`   | `14129`               |       10 |
| w-engines   | `Half-Sugar_Bunny`          | 半塘雪兔                | `/wengines/23`   | `14134`               |       20 |
| w-engines   | `Weapon_A_Common_08`        | 双生泣星                | `/wengines/24`   | `13008`               |        5 |
| w-engines   | `Bashful_Demon`             | 含羞恶面                | `/wengines/25`   | `13113`               |       10 |
| w-engines   | `Boisterous_Echoes`         | 咚哒回声                | `/wengines/26`   | `13018`               |        5 |
| w-engines   | `Weeping_Cradle`            | 啜泣摇篮                | `/wengines/27`   | `14121`               |       15 |
| w-engines   | `Promotion Stats`           | 喵运当头                | `/wengines/28`   | 当前 Fairy 无匹配实体 |        5 |
| w-engines   | `Bellicose_Blaze`           | 嚣枪喧焰                | `/wengines/29`   | `14130`               |       10 |
| w-engines   | `Angel_In_The_Shell`        | 壳中之灵                | `/wengines/30`   | `14150`               |       20 |
| w-engines   | `Tusks_Of_Fury`             | 奔袭獠牙                | `/wengines/31`   | `14107`               |        5 |
| w-engines   | `Kaboom_The_Cannon`         | 好斗的阿炮              | `/wengines/32`   | `13115`               |        5 |
| w-engines   | `Housekeeper`               | 家政员                  | `/wengines/33`   | `13106`               |       10 |
| w-engines   | `Fusion_Compiler`           | 嵌合编译器              | `/wengines/34`   | `14118`               |       10 |
| w-engines   | `Six_Shooter`               | 左轮转子                | `/wengines/35`   | `14003`               |        0 |
| w-engines   | `Puzzle_Sphere`             | 幻变魔方                | `/wengines/36`   | `13012`               |       10 |
| w-engines   | `Marcato_Desire`            | 强音热望                | `/wengines/37`   | `13015`               |        5 |
| w-engines   | `Demara_Battery_Mark_II`    | 德玛拉电池Ⅱ型           | `/wengines/38`   | `13101`               |        5 |
| w-engines   | `Heartstring_Nocturne`      | 心弦夜响                | `/wengines/39`   | `14132`               |       10 |
| w-engines   | `Wrathful_Vajra`            | 怒目金刚                | `/wengines/40`   | `14147`               |       10 |
| w-engines   | `Thoughtbop`                | 思络成歌                | `/wengines/41`   | `14149`               |       15 |
| w-engines   | `Weapon_S_1141`             | 拘缚者                  | `/wengines/42`   | `14114`               |        0 |
| w-engines   | `Sol_Exuvia`                | 日冕遗蜕                | `/wengines/43`   | `14155`               |        6 |
| w-engines   | `Slice_Of_Time`             | 时光切片                | `/wengines/44`   | `13002`               |        0 |
| w-engines   | `Timeweaver`                | 时流贤者                | `/wengines/45`   | `14122`               |       10 |
| w-engines   | `Starlight_Engine`          | 星徽引擎                | `/wengines/46`   | `13004`               |        5 |
| w-engines   | `Spring_Embrace`            | 春日融融                | `/wengines/47`   | `13011`               |        0 |
| w-engines   | `Yesterday_Calls`           | 昨夜来电                | `/wengines/48`   | `14148`               |       10 |
| w-engines   | `Frostfall_Sickle`          | 朔月裁霜                | `/wengines/49`   | `14154`               |       10 |
| w-engines   | `none`                      | 未选择                  | `/wengines/50`   | 占位项                |        0 |
| w-engines   | `Cordis_Germina`            | 机巧心种                | `/wengines/51`   | `14146`               |       15 |
| w-engines   | `Original_Transmorpher`     | 正版变身器              | `/wengines/52`   | `13007`               |        5 |
| w-engines   | `Zanshin_Herb_Case`         | 残心青囊                | `/wengines/53`   | `14120`               |       10 |
| w-engines   | `Big_Cylinder`              | 比格气缸                | `/wengines/54`   | `13112`               |        0 |
| w-engines   | `Kraken's_Cradle`           | 海妖摇篮                | `/wengines/55`   | `14105`               |       10 |
| w-engines   | `Sharpened_Stinger`         | 淬锋钳刺                | `/wengines/56`   | `14126`               |        5 |
| w-engines   | `Deep_Sea_Visitor`          | 深海访客                | `/wengines/57`   | `14119`               |       10 |
| w-engines   | `Flamemaker_Shaker`         | 灼心摇壶                | `/wengines/58`   | `14117`               |       15 |
| w-engines   | `The_Simmering_Pot`         | 炎炙沸釜                | `/wengines/59`   | `13020`               |        5 |
| w-engines   | `Blazing_Laurel`            | 焰心桂冠                | `/wengines/60`   | `14116`               |        5 |
| w-engines   | `Hellfire_Gears`            | 燃狱齿轮                | `/wengines/61`   | `14110`               |        5 |
| w-engines   | `Grill_O_Wisp`              | 燔火胧夜                | `/wengines/62`   | `13144`               |       10 |
| w-engines   | `Severed_Innocence`         | 牺牲洁纯                | `/wengines/63`   | `14138`               |       15 |
| w-engines   | `Metanukimorphosis`         | 狸法七变化              | `/wengines/64`   | `14141`               |       10 |
| w-engines   | `Scarlet-Craving`           | 猩红渴望                | `/wengines/65`   | 当前 Fairy 无匹配实体 |       15 |
| w-engines   | `Ice-Jade_Teapot`           | 玉壶青冰                | `/wengines/66`   | `14125`               |        5 |
| w-engines   | `Elegant_Vanity`            | 玲珑妆匣                | `/wengines/67`   | `14131`               |        5 |
| w-engines   | `Joyau_Dore`                | 琳琅鎏心                | `/wengines/68`   | `14156`               |       20 |
| w-engines   | `Radiowave_Journey`         | 电波漫步                | `/wengines/69`   | `13014`               |        5 |
| w-engines   | `The_Brimstone`             | 硫磺石                  | `/wengines/70`   | `14104`               |        5 |
| w-engines   | `Roaring_Furnice`           | 福虓炉炉                | `/wengines/71`   | `14139`               |        5 |
| w-engines   | `Ode_Of_Resurrected_Wings`  | 空羽复归之诗            | `/wengines/72`   | `14158`               |       15 |
| w-engines   | `Spectral_Gaze`             | 索魂影眸                | `/wengines/73`   | `14136`               |        5 |
| w-engines   | `Peacekeeper_Specialized`   | 维序者-特化型           | `/wengines/74`   | `13127`               |        5 |
| w-engines   | `The_Vault`                 | 聚宝箱                  | `/wengines/75`   | `13103`               |       10 |
| w-engines   | `BloodCasket`               | 血髓秘匣                | `/wengines/76`   | 当前 Fairy 无匹配实体 |        5 |
| w-engines   | `Street_Superstar`          | 街头巨星                | `/wengines/77`   | `13001`               |        5 |
| w-engines   | `Box_Cutter`                | 裁纸刀                  | `/wengines/78`   | `13135`               |        5 |
| w-engines   | `Electro_Lip_Gloss`         | 触电唇彩                | `/wengines/79`   | `13009`               |       10 |
| w-engines   | `Precious_Fossilized_Core`  | 贵重骨核                | `/wengines/80`   | `13006`               |        0 |
| w-engines   | `Roaring_Ride`              | 轰鸣座驾                | `/wengines/81`   | `13128`               |       10 |
| w-engines   | `Starlight_Rider_Faceplate` | 辉骑面铠                | `/wengines/82`   | `14153`               |       10 |
| w-engines   | `Unfettered_Game_Ball`      | 逍遥游球                | `/wengines/83`   | `14002`               |        5 |
| w-engines   | `Gilded_Blossom`            | 鎏金花信                | `/wengines/84`   | `13013`               |       10 |
| w-engines   | `Steel_Cushion`             | 钢铁肉垫                | `/wengines/85`   | `14102`               |       10 |
| w-engines   | `Dreamlit_Hearth`           | 铸梦炉歌                | `/wengines/86`   | `14145`               |       15 |
| w-engines   | `Riot_Suppressor_Mark_VI`   | 防暴者Ⅵ型               | `/wengines/87`   | `14124`               |       10 |
| w-engines   | `Rainforest_Gourmet`        | 雨林饕客                | `/wengines/88`   | `13003`               |        5 |
| w-engines   | `Tremor_Trigram_Vessel`     | 震元奇枢                | `/wengines/89`   | `13142`               |        5 |
| w-engines   | `Neon_Fantasies`            | 霓虹妄想                | `/wengines/90`   | `14151`               |       15 |
| w-engines   | `Hailstorm_Shrine`          | 霰落星殿                | `/wengines/91`   | `14109`               |       10 |
| w-engines   | `Qingming_Birdcage`         | 青溟笼舍                | `/wengines/92`   | `14137`               |       15 |
| w-engines   | `Cauldron_Of_Clarity`       | 青漪灵鼎                | `/wengines/93`   | `13019`               |       10 |
| w-engines   | `Flight_of_Fancy`           | 飞鸟星梦                | `/wengines/94`   | `14133`               |        5 |
| w-engines   | `Head_Lackey`               | 首席跟班                | `/wengines/95`   | `14157`               |       15 |
| w-engines   | `Weapon_S_1591`             | 骁骑礼赞                | `/wengines/96`   | `14159`               |       10 |
| w-engines   | `Serpentine_Seeker`         | 鳞齿寻踪                | `/wengines/97`   | `14152`               |       10 |
| drive-discs | `SuitYunkuiTales`           | 云岿如我                | `/driveDiscs/0`  | `33100`               |        3 |
| drive-discs | `SuitProtoPunk`             | 原始朋克                | `/driveDiscs/1`  | `31900`               |        1 |
| drive-discs | `SuitWutheringSalon`        | 呼啸沙龙                | `/driveDiscs/2`  | `33900`               |        3 |
| drive-discs | `woodpecker`                | 啄木鸟电音              | `/driveDiscs/3`  | `31000`               |        2 |
| drive-discs | `SuitNotesFromtheChained`   | 囚徒手记                | `/driveDiscs/4`  | `33800`               |        4 |
| drive-discs | `SuitShadow`                | 如影相随                | `/driveDiscs/5`  | `32900`               |        4 |
| drive-discs | `SuitKingoftheSummit`       | 山大王                  | `/driveDiscs/6`  | `33200`               |        1 |
| drive-discs | `SuitBranch&BladeSong`      | 折枝剑歌                | `/driveDiscs/7`  | `32700`               |        3 |
| drive-discs | `SuitDawnsBloom`            | 拂晓生花                | `/driveDiscs/8`  | `33300`               |        2 |
| drive-discs | `SuitTheSkyAblaze`          | 拂晓行纪                | `/driveDiscs/9`  | `34000`               |        3 |
| drive-discs | `SuitSwingJazz`             | 摇摆爵士                | `/driveDiscs/10` | `31600`               |        2 |
| drive-discs | `SuitMoonlightLullaby`      | 月光骑士颂              | `/driveDiscs/11` | `33400`               |        2 |
| drive-discs | `polar`                     | 极地重金属              | `/driveDiscs/12` | `32500`               |        3 |
| drive-discs | `SuitWhiteWaterBallad`      | 沧浪行歌                | `/driveDiscs/13` | `33500`               |        3 |
| drive-discs | `SuitPufferElectro`         | 河豚电音                | `/driveDiscs/14` | `31100`               |        3 |
| drive-discs | `SuitSavior`                | 法厄同之歌              | `/driveDiscs/15` | `33000`               |        3 |
| drive-discs | `SuitShiningAria`           | 流光咏叹                | `/driveDiscs/16` | `33600`               |        3 |
| drive-discs | `chaos-jazz`                | 混沌爵士                | `/driveDiscs/17` | `31800`               |        5 |
| drive-discs | `SuitChaosMetal`            | 混沌重金属              | `/driveDiscs/18` | `32300`               |        3 |
| drive-discs | `hormone`                   | 激素朋克                | `/driveDiscs/19` | `31400`               |        2 |
| drive-discs | `SuitSoulRock`              | 灵魂摇滚                | `/driveDiscs/20` | `31500`               |        0 |
| drive-discs | `SuitInfernoMetal`          | 炎狱重金属              | `/driveDiscs/21` | `32200`               |        2 |
| drive-discs | `fanged`                    | 獠牙重金属              | `/driveDiscs/22` | `32600`               |        2 |
| drive-discs | `SuitFreedomBlues`          | 自由蓝调                | `/driveDiscs/23` | `31300`               |        1 |
| drive-discs | `SuitThornedRose`           | 荆棘玫瑰                | `/driveDiscs/24` | `34200`               |        4 |
| drive-discs | `SuitFeatheredFate`         | 谶羽之誓                | `/driveDiscs/25` | `34100`               |        3 |
| drive-discs | `SuitBunnyinWonderland`     | 雪兔梦游仙境            | `/driveDiscs/26` | `33700`               |        2 |
| drive-discs | `SuitThunderMetal`          | 雷暴重金属              | `/driveDiscs/27` | `32400`               |        2 |
| drive-discs | `SuitShockstarDisco`        | 震星迪斯科              | `/driveDiscs/28` | `31200`               |        0 |
| drive-discs | `SuitAstralVoice`           | 静听嘉音                | `/driveDiscs/29` | `32800`               |        2 |
