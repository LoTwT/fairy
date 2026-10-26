# ZZZ-HP 991bb0e 升级审计

日期：2026-10-26

本页记录 `2628b32` → `991bb0e` 静态效果来源升级的逐条裁定。权威制品仍是
[静态覆盖报告](../../packages/data/definitions/effects/static-coverage.json)；
本页只记录分类、证据与预期变化，不复制完整制品。

## 基线

- 当前固定源：`2628b32cece086e371bafa05518a9a12650d9f74`。
- 目标固定源：`991bb0ef2a00387f8a1fa18293bbda17256d7270`。
- Nanoka 参考版本：`3.3.12+19634983`。
- 来源清单：19 个文件中 13 个未变、6 个变更；转换器实际执行的静态效果函数未变，
  实质差异主要来自 `zzz-hp-backend/scripts/data/zzz-hp-calculator-buffs.json`。
- 属性与技能继续保留各自未变化的语义证据版本；本批不统一各数据产品的 ZZZ-HP 固定版本。

## 逐条裁定

| 项                      | 上游变化                                                                                         | 裁定                                                                                                                                               | 证据                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 安比 M2 增伤            | 30% `skillDmgBonus` 的 `applyTarget` 从 `self` 变为 `team`                                       | 保留 `self`；按 `beneficiary-target-correction` 登记，公开 ID 不变                                                                                 | Nanoka `agents/1011` `/talent/2/desc`（中英文）                     |
| 安比 M6 普攻范围        | 45% 普攻从所有 basic 收窄到 `anby-basic-ms47yaat`；冲刺攻击仍为 `all-dodge-ms0dnpmr`             | 保留所有 basic + 冲刺攻击；新增最小 `skill-target-scope-correction`，公开 ID 不变                                                                  | Nanoka `agents/1011` `/talent/6/desc`（中英文）                     |
| 安比 M2 失衡值          | block note 新增“强化特殊技命中未失衡敌人时，失衡值提升 10%”，但无机器记录                        | 登记为 `formula-out-of-scope` 的不可选声明；不新增失衡公式                                                                                         | Nanoka `agents/1011` `/talent/2/desc`（中英文）                     |
| 爱丽丝 M2 乱流/异放 15% | 新增 `turbulenceDmgBonus` 与 `anomalyReleaseDmgBonus` 各 15%                                     | 原文只有“强击伤害”和“紊乱伤害”两个对象；新增子类记录无独立文本依据，登记为 `semantic-conflict`，不生成贡献                                         | Nanoka `agents/1401` `/talent/2/desc`（中英文）                     |
| 简 M0 乱流/异放暴击     | 新增 10 条 `turbulence*` / `anomalyRelease*` 暴击、暴伤与精通转化记录                            | Fairy 的宽口径 `anomalyCritRate`/`anomalyCritDmg` 已覆盖异放与乱流；新增记录登记为 `semantic-conflict`，不生成贡献                                 | Nanoka `agents/1261` `/passive/level/1261507/desc/0`（中英文）      |
| 简 M2 乱流/异放暴伤     | 新增 `eff-mvhhs5hr-l/m` 两条 50% 暴伤                                                            | 同上，登记为 `semantic-conflict`                                                                                                                   | Nanoka `agents/1261` `/talent/2/desc`（中英文）                     |
| 简 M2 减防范围          | `legacy-team-reduceDefense` 增加 `conditions.damageTypes: [anomaly, turbulence, anomalyRelease]` | 接受“只对异常类生效”的收窄；具体异常类集合跟随宽口径裁定，本批只记录具名变化                                                                       | Nanoka `agents/1261` `/talent/2/desc`（中英文）                     |
| 旋钻机-赤轴             | 上游新增 `Drill_Rig_Red_Axis` 重复实体（下划线），精炼块为空                                     | 登记为已有 `Drill_Rig_Red-Axis` 的别名；不新增实体，不生成新目录项                                                                                 | ZZZ-HP `2628b32` 已存在同名实体与精炼                               |
| 涅槃初翎精炼 5          | 新增整个零值块 `blk-mviwn8gu-b8fedl`（`dmgBonus: 0`）                                            | 无可执行文本依据；登记为 `semantic-conflict`，不生成零贡献规则                                                                                     | ZZZ-HP `991bb0e` 精炼 5；Nanoka `w-engines/14164` `/talents/5/desc` |
| `externalDefPercent`    | 涅槃初翎与旋钻机的 `advancedStats.externalDefPercent` 增加 32                                    | 静态效果转换器不读 `advancedStats`；Nanoka 每件音擎只有一条高级属性，被动文本无防御；不采纳，不扩展多高级属性模型                                  | Nanoka 音擎 `14164`、`13111`；`panel-attributes.md`                 |
| 菲欧妮/塞维里安         | 仅 note、顺序、更新时间变化                                                                      | 不报语义差异；Pointer 变化按预期清单处理                                                                                                           | ZZZ-HP 数据 diff                                                    |
| 新技能与孤立子类        | 新增 3 条技能和 `1011-basic-mvhir0y7`                                                            | 已由技能修订 53 核对接入：柳 0018/0024 与卢西娅 0025 回填来源身份；余烬触发段与孤立子类不入动作，见[技能来源升级](skill-source-991bb0e-upgrade.md) | `docs/specs/data/skill-actions.md`                                  |

## 开放问题

**宽口径是否覆盖乱流**：`anomalyDmgBonus`/`anomalyCritRate` 已覆盖异放，核心术语
把异放定义为对应属性异常伤害；乱流是否也属于该口径目前没有直接证据。本批
保持旧宽口径不动，只把新增子类记录登记为 `semantic-conflict`，不标成
`superseded`（避免宣称语义等价）。后续单独审计同一实体上宽口径与子类记录并存的
现有候选，并在取得文字或实测证据后再裁定。

后续 revision 55 已完成该审计：格莉丝、薇薇安 M0、爱丽丝 M2、简和琳琅鎏心
按块 note 与 Nanoka 中英文把命名子类的宽口径记录收窄为 `anomaly`，详见
[宽口径异常增伤审计](anomaly-broad-scope-audit.md)。菲欧妮的全部相关记录仍为
`semantic-conflict`；`w-engine:14147` 精炼 2 的上游 `stat` 笔误已由
[修订 56](wrathful-vajra-r2-sheer-correction.md) 单独修正。

## 预期制品变化

### 静态规则

- 简 M2 减防：`damageKinds` 收窄为异常类；这是本批唯一预期会改变可执行规则语义的条目。
- 安比 M2/M6、爱丽丝 M2、简 M0/M2 的现有规则数值与公开 ID 不变。
- 除审计列出的差异外，现有规则按 `effectId` 键的 canonical JSON 深度相等。

### 目录与覆盖

- 新增不可选 `semantic-conflict` 记录：爱丽丝 2 条、简 10 + 2 条。
- 新增不可选 `formula-out-of-scope` 声明：安比 M2 失衡值 1 条。
- 涅槃初翎精炼 5 新增 1 条 `semantic-conflict` 覆盖记录与不可选变体。
- 安比 M2/M6、爱丽丝 M2 的现有 optionId/effectId 保持不变；覆盖报告的状态从
  `converted` 变为 `corrected` 或 `semantic-conflict`。
- Pointer 允许变化：菲欧妮 M0 块内 18 条重排，爱丽丝 M2、简 M0/M2 旧记录位置后移。
- 别名 `Drill_Rig_Red_Axis` 不出现在任何新增目录项中；13111 只有一个目录实体。
- 不出现现有公开 ID 的删除；`removed` 必须为空。

### 计数

重生成后从 `static-coverage.json` 的 `summary` 读取实际值，不手算。实体、pack、
原始效果、规则、选项、converted/corrected/unsupported 与补充来源计数同步写入
`docs/specs/data/zzz-hp-static-effects.md` 的“当前状态”。

### 实施结果（revision 53）

规则集 revision `53`。实际制品为 196 个实体、1,118 个 pack、1,375 条原始效果、
931 条规则、1,002 个选项；coverage 为 1,165 converted / 118 corrected / 92
unsupported；catalog 变体为 1,233 converted / 124 corrected / 126 unsupported
（共 1,483 个）；补充来源 102 条（68 integrated / 34 out-of-scope）。

后续 revision 54 修正了维琳娜异常增伤的宽口径重复计入，当前计数见
[修订 54](../specs/data/zzz-hp-static-effects.md#修订-54维琳娜异常增伤伤害种类收窄)；
本页保留 revision 53 的批次结果。

按 effectId 比较，规则语义变化只有简 M2 减防的 `damageKinds` 收窄；安比 M2/M6
的规则只发生来源版本、section 与引用 Pointer 变化。新增 16 个选项：Alice 2、
Jane 12、Anby M2 失衡声明 1、Plume 零值块 1；没有现有公开 optionId/effectId 被移除。
另修复作者层语义比较器对 `-0`/`0` 的误报，否则 `2628b32` 在基线上也无法重生成。

## 实施拆分

本次作为单个原子提交落地。来源切换、ID 规范化、语义登记和制品重生成互为前提；
拆开会留下固定源与已发布制品不一致的中间状态。提交内部按以下逻辑边界组织。

### 机制与审计

- 新建本页并加入 `docs/index.md`。
- 新建 `packages/data/scripts/static-effects/source-id-normalization.ts`：
  - 登记结构包含 `sourceCommit`、实体、rankKind/rank、上游 block/effect、冻结
    block/effect、`expectedRaw` 指纹和说明。
  - 只在 `SOURCE_COMMIT` 命中时生效且要求全部登记命中；raw 漂移、旧 ID 冲突、
    重复登记、块内漏登记均拒绝生成。
  - 在 ID 派生之前改写 block/effect ID，使 optionId、effectId、覆盖键一起稳定。
- 新增 `packages/data/test/source-id-normalization.test.ts` 覆盖上述负例。
- 用 `2628b32` 重生成三个制品，必须与已提交版本字节一致；这是机制无副作用的
  基线证明。

### 来源切换与制品

- `source.ts` 的 `SOURCE_COMMIT` 切到 `991bb0e`，更新 `source-manifest.json` 摘要。
- `identities.json` 与 `SOURCE_ENTITY_ALIASES` 增加 `Drill_Rig_Red_Axis` 别名。
- `source-id-normalization.ts` 登记安比 M2/M6、爱丽丝 M2 三条 ID 漂移。
- `semantics.ts` 登记安比 M2/M6 修正、爱丽丝/简的 `semantic-conflict`。
- `supplements.ts` 登记安比 M2 失衡值 `formula-out-of-scope`。
- 重生成三个静态制品并更新证据夹具、来源引用与计数。

## 验证

```sh
# 固定源归档到仓库外
mkdir -p /tmp/fairy-zzz/{2628b32,991bb0e} /tmp/fairy-out
git -C /Users/caoyujie/codes/ZZZ-HP archive 2628b32 | tar -x -C /tmp/fairy-zzz/2628b32
git -C /Users/caoyujie/codes/ZZZ-HP archive 991bb0e | tar -x -C /tmp/fairy-zzz/991bb0e

# 基线字节一致
pnpm --filter @randomplay/data generate:static-effects /tmp/fairy-zzz/2628b32 /tmp/fairy-out/base

# 目标源生成与确定性
pnpm --filter @randomplay/data generate:static-effects /tmp/fairy-zzz/991bb0e /tmp/fairy-out/next
pnpm --filter @randomplay/data generate:static-effects /tmp/fairy-zzz/991bb0e /tmp/fairy-out/next-2

# 具名差异审计
node /tmp/fairy-audit/compare-static-artifacts.mjs /tmp/fairy-out/base /tmp/fairy-out/next

# 数据包与仓库门禁
pnpm --filter @randomplay/data authoring:verify
pnpm --filter @randomplay/data verify:artifact-dependencies
pnpm --filter @randomplay/data audit:data-identity
pnpm --filter @randomplay/data explain agents:anby:mindscape:2:blk-ms47xm3l-3pumvj:eff-ms47xm3l-nf7ga7
pnpm check
```

## 数据管理状态

本批只改 Git 跟踪的 ZZZ-HP 固定源、静态 effects 制品与仓库内测试夹具，不改
Nanoka 整合规则、Nanoka 来源版本或 `packages/data/integrated`。按
[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)，
`definitions` 不属于受管理 `integrated` 协议；因此不创建或改写管理记录。

主工作区已存在 `packages/data/.integrated.fairy-state`。合并回主工作区前后都应执行只读
复验，作为现场证据：

```sh
pnpm --filter @randomplay/data verify:nanoka:current integrated
```

若返回 `BUSY`、`RECOVERY_REQUIRED` 或存在未完成事务，保留现场并报告，不执行
`recover`、`generate` 或手工改写管理记录。

## 回退

- 整个升级是原子提交；回退它即回到 `2628b32`，不需要逐文件恢复制品。
- 机制层虽然有独立负例，但不能脱离来源切换单独发布；若机制有误，随整个提交一并回退。
- 若语义守卫拒绝生成，先确认是重排/Pointer 漂移还是语义漂移；禁止放宽守卫来跑通。
