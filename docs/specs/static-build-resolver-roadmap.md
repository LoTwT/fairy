# 静态构筑解析系统路线图

本文档记录 `Static Build Resolver` 的执行路线，用于约束后续迭代顺序，避免范围继续漂移。

本文件关注：

- 当前状态
- 下一阶段要做什么
- 每阶段明确不做什么
- 进入下一阶段前需要满足什么

本文件不重复定义公式、类型签名或完整 contract；这些内容以：

- [静态构筑解析系统](./static-build-resolver.md)
- [静态构筑解析系统 V1](./static-build-resolver-v1.md)
- [静态构筑解析系统 V2](./static-build-resolver-v2.md)
- [静态构筑解析系统 V25](./static-build-resolver-v25.md)
- [静态构筑解析系统 V26](./static-build-resolver-v26.md)
- [静态构筑解析系统 V27](./static-build-resolver-v27.md)

为准。

## 1. 当前状态

当前工作树对应的 resolver 状态如下：

- 已支持全部强攻 / 命破 / 异常代理人（单次 resolver）
- 已支持全部强攻 / 命破 / 异常音擎，并按 specialty 做兼容校验
- 驱动盘当前为 `9` 套 curated 列表
- 已支持：
  - 单场景静态构筑解析 `resolveStaticBuildDamage`
  - 全技能 / 全段矩阵 `resolveStaticBuildSkillMatrix`
- 已支持 profile：
  - `standard-normal`
  - `standard-sheer`
  - `standard-anomaly`
  - `yixuan-sheer`
- 技能矩阵当前为双轨：
  - 高频代理人：curated 模板
  - 其余强攻 / 命破代理人：通用矩阵生成
  - 异常代理人：暂不支持 skill matrix

当前最大短板不是“能不能算”，而是“算得是否足够完整”：

- catalog 已经放开
- matrix 已经能生成
- 但很多代理人 / 音擎 / 驱动盘尚未收录 curated effect definitions
- 结果会通过 `assumptions` 明示缺失项

因此下一阶段重点不是继续扩 catalog，而是补齐 curated coverage。

当前进度：

- `V2.1 curated coverage` 已完成
- `V2.2 matrix metadata refinement` 已完成
- `V3 anomaly / disorder` 已完成单次 resolver 主线
- `V4 progression-aware resolver` 已在当前 contract 下收口
- `V5 source-aware dynamic snapshot context` 已在当前 contract 下收口
- `V42 source-note summaries` 已收口
- `V43 utility-entry summaries` 已收口
- `V44 source-entry collection aggregates` 已收口
- `V45 source-view summary aggregates` 已收口
- `V46 trigger-matrix summary aggregates` 已收口
- `V47 skill-matrix summary aggregates` 已收口
- `V48 skill-matrix row summaries` 已收口
- `V49 skill-matrix row resolve summaries` 已收口
- `V50 source-damage-view entry resolve summaries` 已收口
- `V51 trigger-matrix row resolve summaries` 已收口
- `V52 source-utility-view entry requirement summaries` 已收口
- `V53 source-utility-view summary requirement aggregates` 已收口
- `V54 source-damage-view summary requirement aggregates` 已收口
- `V55 trigger-matrix summary requirement aggregates` 已收口
- `V56 source-entry collection requirement aggregates` 已收口
- `V65 skill-matrix group caveat summaries` 已收口
- `V66 skill-matrix top-level unsupported effects` 已收口
- `V67 skill-matrix top-level caveat summary` 已收口
- `V68 skill-matrix group caveat summary` 已收口
- 当前边界：`resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`
- `V128 single-build top-level aggregate summary alignment` 已收口
- `V129 single-build effect summary alignment` 已收口
- `V130 single-build compact result alignment` 已收口
- `V131 single-build compact detail gating` 已收口

## 2. 阶段划分

已完成主线：

1. `V2.1 curated coverage`
2. `V2.2 matrix metadata refinement`
3. `V3 anomaly / disorder`
4. `V4 progression-aware resolver`
5. `V5 source-aware dynamic snapshot context`

当前 `V44 source-entry collection aggregates`、`V45 source-view summary aggregates`、`V46 trigger-matrix summary aggregates` 与 `V47 skill-matrix summary aggregates` 已在当前 contract 下收口。

## 60. V55 trigger-matrix summary requirement aggregates

### 60.1 目标

`V54` 收口后，source-damage-view summary 已具备稳定 `requirementSummary`。

但 `ResolveStaticBuildTriggerMatrixResult.summary` 仍缺少聚合 requirement 摘要。

`V55` 只解决一件事：

1. 为 trigger-matrix summary 增加稳定 `requirementSummary`

### 60.2 范围

1. `V55.1` scope freeze
2. `V55.2` summary-level requirement aggregate
3. `V55.3` high-level / prompt alignment
4. `V55.4` docs closeout

### 60.3 当前状态

- `V55.1` 已完成：冻结到 trigger-matrix summary requirement aggregate
- `V55.2` 已完成：`StaticBuildTriggerMatrixSummary` 已新增稳定 `requirementSummary`
- `V55.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.requirementSummary`
- `V55.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 60.4 当前边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixSummary` 增加 `requirementSummary`
2. 聚合当前 trigger rows 的 `requirements`
3. 保持现有 `groups / mainFormulaCount / sourceViewCount / diagnosticSummary / sourceNoteSummary` 兼容

显式不做：

1. 不改变 trigger row 的 `requirements / requirementSummary`
2. 不新增新的 trigger-matrix metadata
3. 不改变 `damage / summary / diagnosticSummary / sourceNoteSummary`

## 61. V56 source-entry collection requirement aggregates

### 61.1 目标

`V55` 收口后，source-damage-view summary、source-utility-view summary 与 trigger-matrix summary 都已具备稳定的 requirement aggregate。

但 `ResolveStaticBuildSourceEntriesResult.summary` 仍只聚合 diagnostics / source notes，没有 mixed collection 级别的 requirement 摘要。

`V56` 只解决一件事：

1. 为 source-entry collection summary 增加稳定 requirement aggregates

### 61.2 范围

1. `V56.1` scope freeze
2. `V56.2` collection-level requirement aggregate
3. `V56.3` high-level / prompt alignment
4. `V56.4` docs closeout

### 61.3 当前状态

- `V56.1` 已完成：冻结到 source-entry collection requirement aggregate
- `V56.2` 已完成：`StaticBuildSourceEntryCollectionSummary` 已新增稳定 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V56.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V56.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 61.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceEntryCollectionSummary` 增加两组 requirement aggregate
2. 分别聚合当前 `source-damage-view` 与 `source-utility-view` entries 的 requirements
3. 保持现有 `groups / sourceDamageViewCount / sourceUtilityViewCount / diagnosticSummary / sourceNoteSummary` 兼容

显式不做：

1. 不新增“混合 requirement union”类型
2. 不改变单条 source entry 的 requirement contract
3. 不改变 `entry` 排序或 `groups` 语义

## 3. V2.1：Curated Coverage

### 3.1 目标

目标是减少当前结果中的这类提示：

- 未收录 curated 代理人效果
- 未收录 curated 音擎效果
- 未收录 curated 驱动盘效果

也就是把“可运行”推进到“可稳定复用”。

### 3.2 范围

这一阶段只做：

- 把音擎支持范围从“专属音擎集合”解耦为“按特性兼容的音擎集合”
- 补 curated `agent effects`
- 补 curated `w-engine effects`
- 视需要补 curated `drive-disc effects`
- 补对应测试与示例

这一阶段不改：

- build 输入输出 contract
- profile 体系
- damage type 范围
- raw / cleaned 数据结构

### 3.3 优先级

优先顺序固定如下：

1. support catalog 解耦（已完成）
2. 再按“已支持但当前 assumptions 价值最高”的代理人推进 curated coverage

#### 3.3.1 support catalog 解耦

本轮已完成以下改造：

1. `supportedStaticBuildWEngines` 不再从代理人 `exclusiveWeapon` 派生
2. 改为从公开 `w-engines.json` 独立构建，并按特性筛选
3. `agent` 与 `w-engine` 的兼容关系改为“specialty 兼容”，而不是“是否为专属音擎”
4. 高层 tool 文案、supported scope 返回值、README 示例同步更新
5. 不在这一轮顺带扩更多 effect definition

后续继续下面的 curated coverage 队列。

#### 3.3.2 curated coverage 队列

优先顺序按“已支持但当前 assumptions 价值最高”的代理人推进：

1. 零号·安比
2. 猫又
3. 雨果
4. 奥菲丝&「鬼火」
5. 般岳
6. 真斗
7. 伊德海莉
8. 叶瞬光
9. 希希芙
10. 「席德」

当前批次完成情况：

- 已完成：`零号·安比`、`猫又`、`雨果`、`奥菲丝&「鬼火」`、`般岳`、`真斗`、`伊德海莉`、`叶瞬光`、`希希芙`、`「席德」`
- `V2.1 curated coverage` 队列已完成，下一步进入 `V2.2 matrix metadata refinement`

对应音擎同步补：

- `牺牲洁纯`
- `钢铁肉垫`
- `千面日陨`
- `嚣枪喧焰`
- `怒目金刚`
- `燔火胧夜`
- `海妖摇篮`
- `云霓孤光`
- `鳞齿寻踪`
- `机巧心种`

### 3.4 验收标准

进入下一阶段前，至少满足：

1. 音擎支持范围已完成 specialty 级解耦，不再以“专属音擎集合”为支持边界
2. 上述优先名单中的代理人都有 curated agent effects
3. 对应专属音擎都有 curated effect definitions
4. 高频使用场景下，`assumptions` 不再主要由“缺少 curated effect definitions”占据
5. 新增定义均有测试覆盖

## 4. V2.2：Matrix Metadata Refinement

### 4.1 目标

当前矩阵已经有：

- `actionName`
- `skillName`
- `qualifiers`
- `entryType`
- `segmentLabel`
- `segmentIndex`
- `targetSize`

但对 UI 和自动化分析仍然不够细。

这一阶段的目标是让上层尽量不再依赖 `label` 文本解析。

### 4.2 范围

计划补充：

- 更稳定的技能分类
- 更明确的命中语义
- 是否总伤 / 单段 / 追加段
- 更清晰的属性覆盖标识

当前第一批已完成：

- `templateSource`：区分 `curated` 与 `generated`
- `sourceSkillTypeId` / `sourceStatName` / `sourceOccurrence`：把矩阵行稳定回链到公开 `agent-details.json`
- `attributeSource`：显式区分 `agent-default` / `context` / `template`

当前第二批已完成：

- `canonicalLabel`：基于 metadata 结构化重建规范显示名，减少上层直接消费 `label`
- `stableKey`：提供不依赖展示字符串的稳定行键
- Agent prompt 已明确要求优先消费 `row.metadata.canonicalLabel` / `row.metadata.stableKey`

当前第三批已完成：

- `sourceStatId`：把矩阵行精确回链到 raw `stats[].id`
- `templateCombatTags`：把行内局部条件标签与全局 context 标签拆开

当前第四批已完成：

- `aggregationType`：显式区分 `per-hit` 与 `whole-entry`
- `isAdditionalDamage`：显式标记额外 / 追加伤害条目
- `variantAxis`：显式标记当前分支是 `segment` / `target-size` / `condition`

### 4.3 验收标准

进入 `V3` 前，至少满足：

1. UI 展示不需要再从 `label` 反向猜技能结构
2. Agent 生成表格时优先消费 metadata，而不是自由解释中文技能名
3. 新元数据不破坏现有 matrix row contract
4. 上层不需要再从 `entryType` 二次推断“单段命中 / 总伤 / 条件分支”这类聚合语义

当前状态：已满足，可进入 `V3`。

## 5. V3：Anomaly / Disorder

### 5.1 目标

把 `anomaly / disorder` 接入同一套 static build resolver，而不是长期停留在：

- `normal`
- `sheer`

### 5.2 风险

这是当前真正的“大阶段”，因为它会同时改：

- effect schema
- scenario 输入
- profile / pipeline
- resolved bucket 语义
- trace 输出
- matrix 展示语义

因此它必须晚于 `V2.1` 和 `V2.2`。

### 5.3 子阶段

`V3` 固定拆成两个实现阶段：

1. `V3.1 anomaly`
2. `V3.2 disorder`

共享同一份 V3 contract，并已按顺序完成：

- `V3.1 anomaly`：已完成单次 resolver
- `V3.2 disorder`：已完成单次 resolver
- `V3.3 curated effect coverage`：已完成 anomaly / disorder 直接可表达效果首轮覆盖
  - 代理人：`格莉丝`、`柳`、`简`、`派派`、`薇薇安`、`爱芮`
  - 音擎：`壳中之灵`、`十方锻星`、`飞鸟星梦`、`淬锋钳刺`、`时流贤者`、`灼心摇壶`、`霰落星殿`、`触电唇彩`、`雨林饕客`
  - 驱动盘：`混沌爵士 4 件`
- `V3.4 source-specific assumptions`：已完成 anomaly / disorder 的来源级限制说明与 disorder source 细化
  - `disorderSourceTypes` 已用于区分如薇薇安的侵蚀来源紊乱增伤
  - `minimumResolvedAnomalyProficiency` 已用于区分如时流贤者的异常精通阈值
  - anomaly 代理人 / 音擎不再停留在泛化的“未收录 curated”，而是按来源输出更具体的 assumptions

### 5.4 进入条件

只有满足以下条件才进入 `V3`：

1. 强攻 / 命破主线已经稳定
2. curated coverage 已达到可用水平
3. matrix metadata 足够稳定
4. 已冻结 anomaly / disorder 的输入输出 contract

### 5.5 当前收口状态

当前 V3 主线已完成：

- `resolveStaticBuildDamage` 已支持 `normal / sheer / anomaly / disorder`
- `resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`
- 异常 / 紊乱仍使用单代理人静态快照，不做动态积蓄模拟
- anomaly / disorder 已补齐当前 schema 下可直接表达的高价值效果，优先覆盖：
  - 异常精通
  - 异常暴击
  - 异常 / 紊乱增伤
  - 与异常目标相关的稳定增伤
- 无法直接映射到当前公式的异常掌控换算、剩余时间换算、随机增益和独立异常槽机制，已从泛化 assumptions 收敛为 source-specific assumptions

若继续往下做，优先级应为：

1. 仅在明确需要时再讨论异常 / 紊乱矩阵
2. 若用户明确提出，再为 anomaly / disorder 引入更强的动态 value context，而不是默认扩大 contract

当前状态：roadmap 内的既定阶段已完成。当前唯一保留的显式 out-of-scope 是异常 / 紊乱 skill matrix。

## 6. 明确不做

在进入 `V3` 前，不做以下事项：

- 不扩到全部 specialty
- 不改 raw 数据结构
- 不生成第二份 cleaned 发布 JSON
- 不做全量自动文本 effect 抽取
- 不做动态战斗模拟

## 7. 执行约定

后续每轮 resolver 相关改动都要先判断属于哪个阶段：

- `V2.1`
- `V2.2`
- `V3`
- `V4`

并同步更新：

- 本路线图
- 对应规格文档
- `docs/index.md`

如果某轮改动跨了多个阶段，先拆阶段再实现，不要直接混做。

## 8. Roadmap 完成后的后续计划

当前 `V2.1`、`V2.2`、`V3` 的既定阶段已经完成。后续工作不再属于原 roadmap 主线，而是进入明确排优先级的 backlog。

### 8.1 P0：补齐 anomaly / disorder 的剩余 curated coverage

优先级最高的后续工作，不扩大 contract，只减少当前 source-specific assumptions 的覆盖缺口。

目标：

- 继续把 anomaly / disorder 中仍未直接结构化的高价值来源，从 `assumptions` 推进到 curated effect definitions
- 优先减少“结果能算但仍大量依赖来源说明”的场景

优先补齐对象：

- 代理人：
  - `柏妮思`
  - `爱丽丝`
  - `雅`
- 音擎：
  - `轰鸣座驾`
  - 其余 anomaly specialty 音擎中仍未收录 curated effects 的来源
- 驱动盘：
  - `自由蓝调 4 件`
  - `混沌重金属 4 件`
  - 其余异常相关驱动盘中仍仅通过 assumptions 提示的来源

当前进展：

- 已完成第一批 refinement：
  - `爱丽丝`：已展开物理异常剩余时间对 `disorder` 倍率的影响
  - `灼心摇壶`：已展开满层阈值下的额外异常精通
- 已完成第二批 refinement：
  - `柏妮思`：已展开额外能力带来的灼烧持续时间延长对火源 `disorder` 倍率的影响
- 仍未直接结构化的部分继续保留为 source-specific assumptions，例如：
  - `柏妮思` 的 `[燃点]/[余烬]` 触发链与异常积蓄效率
  - `爱丽丝` 的异常掌控转异常精通与 `[极性强击]`
  - `雅` 的独立烈霜异常槽与 `[霜灼·破]`

当前判断：

- `8.1 P0` 剩余高优先项中，已经没有适合在当前 contract 下继续硬编码的部分
- 这些剩余项都更适合放到 `8.3 dynamic value context` 处理
- 因此下一步转入 `8.2` 立项评估，再决定后续实现顺序

这一阶段不做：

- 不改 `resolveStaticBuildDamage` 的输入输出 contract
- 不做 anomaly / disorder matrix
- 不做动态积蓄模拟

验收标准：

1. anomaly / disorder 高频代理人不再主要依赖 source-specific assumptions 解释核心伤害来源
2. 新增 anomaly / disorder curated effects 都有 resolver 测试覆盖
3. `README` / V3 文档同步列出新增覆盖范围

### 8.2 P1：异常 / 紊乱 skill matrix 立项评估

当前唯一保留的显式 out-of-scope 是 anomaly / disorder 的 skill matrix。若后续明确需要，应先做立项评估，再决定是否进入实现。

评估目标：

- 判断 anomaly / disorder 是否真的需要矩阵化展示
- 明确矩阵行语义是“触发条目”还是“技能入口”
- 明确是否允许一个技能行依赖显式传入的异常状态快照

进入实现前必须先冻结：

1. anomaly / disorder matrix 的输入 contract
2. 行级 metadata 语义
3. 与当前 `normal / sheer` matrix 的共用边界

当前状态：

- 立项评估已完成，见 [anomaly-disorder-skill-matrix-evaluation.md](./anomaly-disorder-skill-matrix-evaluation.md)
- 结论：在 `8.3 dynamic value context` 落地前，不进入 anomaly / disorder matrix 实现

### 8.3 P1：更强的动态 value context

如果异常 / 紊乱需要进一步提高精度，下一步应优先补显式 value context，而不是直接扩大公式层。

优先考虑的上下文字段：

- `finalPanel.anomalyMastery`
- 指定层数 / 充能段位
- 指定异常剩余时间快照
- 指定异常目标状态
- 指定特定来源是否命中阈值

当前进展：

- 已完成第一批：
  - `finalPanel.anomalyMastery` 已进入 `resolveStaticBuildDamage` contract
  - `爱丽丝` 已支持按 `finalPanel.anomalyMastery` 快照展开“异常掌控 -> 异常精通”换算
  - `十方锻星` 与 `爱丽丝` 的 source-specific assumptions 已按是否提供 `anomalyMastery` 拆分
- 当前仍未直接展开的部分：
  - `爱丽丝` 的 `[极性强击]`
  - `柏妮思` 的 `[燃点]/[余烬]` 触发链与异常积蓄效率
  - `雅` 的独立烈霜异常槽与 `[霜灼·破]`

原则：

- 继续保持“静态快照”模型
- 不做时间轴模拟
- 不做团队循环模拟

### 8.4 P2：文档与工程治理

resolver 主线完成后，文档维护需要单独列为持续事项，避免再次出现“实现已变，文档还停留在旧阶段”的漂移。

持续维护项：

1. [dependencies.md](./../dependencies.md) 保持 monorepo 级依赖说明，不再退回到仅覆盖 `packages/zzz-data`
2. `docs/index.md` / `README.md` / 各阶段规格文档在每轮功能收口后同步更新
3. 若后续新增 build layer 目录、脚本或 profile，必须同步更新 [architecture.md](./../architecture.md)
4. 动态 catalog 覆盖范围优先写成“全部兼容对象”而不是硬编码数量；若文档必须列举数量，必须在同一轮实现收口时同步校准

这部分不单独形成新公式阶段，但必须作为每轮迭代的收尾检查项。

## 9. 下一主线：V4 Progression Context

`V2.1`、`V2.2`、`V3` 完成后，下一条真正值得单独立项的主线不再是新 damage type，而是 progression-aware resolver。

对应规格文档：

- [static-build-resolver-v4.md](./static-build-resolver-v4.md)

### 9.1 目标

把 resolver 从“只理解核心技/精炼 + finalPanel 快照”推进到“能理解高价值影画 / 潜能觉醒 / progression 快照”。

### 9.2 范围

第一批固定为：

1. `loadout.agentMindscape`
2. `finalPanel.energyGenerationRate`
3. `minimumMindscape`
4. `柏妮思`、`奥菲丝&「鬼火」` 的高价值 progression-aware coverage

### 9.3 不做什么

- 不做 anomaly / disorder matrix
- 不做团队循环或后台触发链模拟
- 不做全量影画文本自动抽取

### 9.4 执行顺序

1. `V4.1` contract freeze
2. `V4.2` resolver contract / value context 改造
3. `V4.3` 高价值来源 coverage
4. `V4.4` progression-specific assumptions refinement

### 9.5 当前状态

当前 `V4` 第九批已完成：

- `V4.1` 已完成：`loadout.agentMindscape`、`finalPanel.energyGenerationRate`、`minimumMindscape` 已进入公开 contract
- `V4.2` 已完成：resolver / tool schema / trace 已能消费 progression-aware value context
- `V4.3` 已完成第一批：
  - `柏妮思`：潜能觉醒「沸点派对」的异常掌控 / 伤害提升
  - `奥菲丝&「鬼火」`：核心技「准星聚焦」的额外攻击力、影画 1 伤害提升
- `V4.3` 已完成第二批：
  - `奥菲丝&「鬼火」`：影画 1 的火抗无视、影画 2 的终结技后攻击力、影画 4 的强化特殊技 / 终结技增伤
- `V4.3` 已完成第三批：
  - `爱丽丝`：影画 2 的物理来源紊乱增伤、影画 4 的物理异常 / 紊乱无视抗性
  - `薇薇安`：影画 1 的预言目标异常 / 紊乱增伤、影画 2 的以太异常 / 紊乱无视抗性
- `V4.3` 已完成第四批：
  - `简`：影画 2 的 `[啮咬]` 目标减防、强击异常暴击伤害，影画 4 的 `[强击] / [紊乱]` 后异常伤害提升
  - `柳`：影画 1 的 `[洞悉]` 异常精通提升、影画 4 的 `[识破]` 目标穿透率提升
- `V4.3` 已完成第五批：
  - `爱丽丝`：影画 1 的 `[强击]` 后 20% 减防，已通过 `combatTags: [\"aliceAfterAssault\"]` 显式展开
- `V4.3` 已完成第六批：
  - `简`：核心被动中“每点异常精通 -> 强击异常暴击率”已通过第二遍 effect 求值自动折算
- `V4.3` 已完成第七批：
  - `柏妮思`：影画 2 的 `[热意洞穿]` 层数穿透率收益已通过 `combatTags + stacks` 静态展开
  - `格莉丝`：影画 2 的手雷命中后电抗降低已通过 `combatTags` 静态展开
- `V4.3` 已完成第八批：
  - `简`：影画 1 的 `[狂热]` 状态异常精通转增伤已通过第二遍 effect 求值静态展开
  - `柳`：影画 2 的 `[极性紊乱]` 额外突刺倍率已通过 `combatTags + stacks` 静态展开
- `V4.3` 已完成第九批：
  - `爱芮`：影画 1 的 `[异放]` 基础异常暴击与基于 `finalPanel.anomalyMastery` 的额外异常暴击率已静态展开
  - `爱芮`：影画 2 的固定无视防御与 `combatTags: ["ariaDreamtime"]` 控制的额外无视防御已静态展开
- `V4.4` 已完成第九轮 assumptions refinement：
  - 可区分缺少 `agentMindscape`
  - 可区分缺少 `energyGenerationRate`
  - `简` 的 source-specific assumptions 已从“未自动折算 AP->暴击率”收紧到“仅剩物理异常积蓄效率未展开”
  - `柏妮思` / `格莉丝` 的 source-specific assumptions 已收紧到“仅剩施加时机、层数节奏与积蓄效率未展开”
  - `柳` / `简` 的 source-specific assumptions 已进一步收紧到“仅剩能量消耗、积蓄效率与 M6 类动态机制未展开”
  - `爱芮` 的 source-specific assumptions 已收紧到“仅剩 [异放] 比例、失衡额外倍率与 M6 类动态机制未展开”

### 9.6 后续继续项

`V4` 后续不再是改基础 contract，而是继续补高价值 progression-aware coverage，优先级如下：

1. 其余仍高度依赖 progression assumptions 的已支持异常代理人
2. 仅在当前 contract 不够用时，再考虑新增下一批 progression value context
3. 继续避免把堆层、后台自动触发、额外结算次数这类机制伪装成静态快照

### 9.7 V4 收口结论

在完成第九批后，已对剩余异常代理人 / 异常音擎做了一轮收口 review。结论是：

1. 当前 contract 下还能稳定展开的高价值 progression-aware 规则已基本补完
2. 剩余未展开项主要集中在：
   - 积蓄效率、独立异常槽、架势切换
   - 后台自动释放、追击次数、额外结算次数
   - 基于战斗过程的能量 / 喧响值变化
   - 随机或显式多分支机制
3. 这些项若继续塞进 `V4`，会破坏“静态快照、显式输入、无时间轴模拟”的边界

因此，`V4` 当前应视为已收口。后续若继续提升异常 / 紊乱精度，应单独立项：

1. 新的 progression / dynamic value context
2. 或新的 anomaly / disorder damage view

## 10. V5 source-aware dynamic snapshot context

### 10.1 为什么进入 V5

`V4` 收口后，异常 / 紊乱剩余未展开项已经不再适合继续补固定 bucket 或固定快照字段。

真正缺失的是：

- 当前这一轮已经确定的额外结算次数
- 当前这一轮已经确定的额外倍率
- 当前这一轮已经确定的 source-specific 动态状态

这些值不应由 resolver 猜测，但可以由用户显式提供。

### 10.2 V5 目标

`V5` 的目标是：

- 为 `resolveStaticBuildDamage` 增加 `scenario.dynamicSnapshot`
- 保持静态快照模型
- 不进入时间轴 / 循环模拟

### 10.3 V5 范围

第一批只做 anomaly / disorder：

1. `柏妮思`
2. `爱芮`

不做：

- anomaly / disorder skill matrix
- 背景自动触发循环
- 独立异常槽
- 时间轴与资源过程模拟

### 10.4 V5 执行顺序

1. `V5.1` contract freeze
2. `V5.2` dynamic snapshot resolver
3. `V5.3` 第一批来源 coverage
4. `V5.4` assumptions refinement

### 10.5 当前状态

当前 `V5` 已完成：

- `build/types.ts` / `resolve-build-damage` schema / `resolver.ts` 已完成 `dynamicSnapshot` 基础接线
- `柏妮思` 已支持 `[余烬]` 动态快照：
  - `flags.burniceEmberState`
  - `counts.burniceEmberExtraTriggers`
  - `values.burniceEmberDamageRatio`
- `爱芮` 已支持 `[异放]` 动态快照：
  - `values.ariaExflowDamageRatio`
  - `values.ariaStunnedDamageRatio`
- `V5.4 assumptions refinement` 已完成：
  - source-specific notes 已细化到缺失的具体动态快照 key
  - 已区分“缺少 flag / count / value”和“已按快照展开”
  - 保持静态快照模型，不引入时间轴模拟

因此，`V5` 在当前 contract 下已收口。后续若继续提高异常 / 紊乱精度，应进入新的 post-roadmap scope，而不是继续扩大 `V5`。

## 11. V6 source-state snapshot context

`V5` 收口后，剩余高价值异常 / 紊乱精度问题不再主要是“缺少次数 / 倍率”，而是“缺少 source-specific 状态快照”。

对应规格文档：

- [static-build-resolver-v6.md](./static-build-resolver-v6.md)

### 11.1 目标

把 resolver 从“只理解 dynamicSnapshot 的次数 / 倍率快照”推进到“能理解 source-specific state snapshot”。

### 11.2 范围

第一批固定为：

1. `scenario.stateSnapshot`
2. `StaticBuildStateFlagKey`
3. `StaticBuildStateValueKey`
4. `爱丽丝`
5. `雅`

### 11.3 不做什么

- 不做 anomaly / disorder matrix
- 不做独立异常槽积蓄过程模拟
- 不做时间轴 / 循环 / 资源过程模拟

### 11.4 执行顺序

1. `V6.1` contract freeze
2. `V6.2` state snapshot resolver
3. `V6.3` 第一批来源 coverage
4. `V6.4` assumptions refinement

### 11.5 当前状态

当前 `V6.1` / `V6.2` / `V6.3` / `V6.4` 首批状态如下：

- `scenario.stateSnapshot` 已进入公开 build contract
- `StaticBuildStateFlagKey` / `StaticBuildStateValueKey` 已冻结第一批 key
- `resolve-build-damage` tool schema 已接受 `stateSnapshot`
- `V6.2 state snapshot resolver` 已完成基础接线：
  - `StaticBuildEffectCondition` 已可表达 `stateSnapshot` 条件
  - `StaticBuildValueContext` / `resolver` 已可消费 `stateSnapshot`
- `V6.3` 第一批来源 coverage 已完成：
  - `爱丽丝`：`[极性强击]` 可通过 `scenario.stateSnapshot` 显式提供 source-specific 结算倍率，并已并入当前 anomaly 路径
  - `雅`：`[霜灼·破]` 已支持 state-aware assumptions 与倍率快照记录，但仍不强行并入现有 anomaly / disorder 公式
- `V6.4` assumptions refinement 已完成首批细化：
  - 可区分缺少 state flag、缺少 state value、已记录快照但当前公式仍未展开的动态机制

下一步如果继续 `V6`，重点不再是首批 Alice / 雅 覆盖，而是决定是否扩更多 source-state key，或直接切到新阶段。

## 12. V7 resolved snapshot overrides

### 12.1 目标

把 resolver 从“只理解 panel / effect definitions / dynamicSnapshot / stateSnapshot”推进到“还能消费上层已显式算好的最终 bucket 贡献”。

这一阶段解决的问题是：

- 某些来源的最终贡献已经明确
- 但当前 contract 没有稳定入口
- 用户只能继续改 `finalPanel`、`damageMultiplier` 或接受 assumptions

### 12.2 范围

`V7` 只做：

1. `scenario.resolvedSnapshot`
2. 受控的 `bucketDeltas`
3. 受控的 `multiplierFactors`

`V7` 不做：

- 自由字符串 bucket 注入
- skill matrix override
- 时间轴 / 团队循环 / 资源过程模拟

### 12.3 阶段顺序

1. `V7.1` contract freeze
2. `V7.2` resolver wiring
3. `V7.3` source adoption

### 12.4 当前状态

当前 `V7.1` / `V7.2` 状态如下：

- `scenario.resolvedSnapshot` 已进入 build public contract
- `StaticBuildResolvedSnapshotBucketKey` 已冻结第一批受控 bucket key
- `StaticBuildResolvedSnapshotMultiplierKey` 已冻结 `skillMultiplierFactor`
- `resolve-build-damage` tool schema 已接受 `resolvedSnapshot`
- `V7.2 resolver wiring` 已完成：
  - `bucketDeltas` 已并入当前 resolver bucket
  - `multiplierFactors.skillMultiplierFactor` 已作为最终 factor 接入当前结算路径
  - assumptions 已能显式标记当前使用了 `resolvedSnapshot`

`V7.3` 已完成前四批来源迁移，并在当前 contract 下收口：

- `柏妮思` 影画 6 的 `25% 火抗无视` 已改为可通过 `scenario.resolvedSnapshot.bucketDeltas.ignoreResistance` 显式提供
- 特殊 `[余烬]` 与额外 `[灼烧]` 结算仍保留在 assumptions
- `格莉丝 M2` 与 `简` 当前不再建议手动改 `damageMultiplier`；若已知异常积蓄效率折算后的最终倍率，应通过 `scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor` 显式提供
- `派派`、`时流贤者`、`柳 M2`、`薇薇安 M2` 当前也不再建议手动改 `damageMultiplier`；若已知异常积蓄效率折算后的最终倍率，应通过 `scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor` 显式提供

当前结论：

- `resolvedSnapshot` 适合承接“上层已算出的最终 bucket 增量 / 最终倍率 factor”
- 当前剩余 assumptions 中，真正适合继续迁移到 `resolvedSnapshot` 的高价值来源已基本迁完
- 剩余项应分别回到：
  - `dynamicSnapshot`
  - `stateSnapshot`
  - `finalPanel`
  - 或保持为真动态过程 assumptions

因此 `V7` 在当前 contract 下已收口，不再继续扩第五批来源。

## 13. V8 assumption ownership

对应规格文档：

- [static-build-resolver-v8.md](./static-build-resolver-v8.md)

### 13.1 目标

把 anomaly / disorder 剩余 assumptions 统一归到正确 contract：

1. `finalPanel`
2. `dynamicSnapshot`
3. `stateSnapshot`
4. `resolvedSnapshot`
5. 真动态过程

### 13.2 范围

第一批只做：

1. 剩余 assumptions inventory
2. contract 归属判断
3. 仅在确有共性时新增最小 contract

不做：

- anomaly / disorder matrix
- 时间轴 / 资源过程模拟
- 为单一来源新增一次性专用 key

### 13.3 执行顺序

1. `V8.1` contract freeze
2. `V8.2` assumption inventory
3. `V8.3` minimal contract additions
4. `V8.4` source migration / closeout

### 13.4 当前状态

当前已完成：

- `V8.1` contract freeze
- `V8.2` assumption inventory

当前结论：

- 第一批 inventory 已完成，剩余 anomaly / disorder assumptions 已能归到：
  - `finalPanel`
  - `dynamicSnapshot`
  - `stateSnapshot`
  - `resolvedSnapshot`
  - 真动态过程
- 当前没有发现足够共性的新增 public contract 候选
- 因此 `V8.3 minimal contract additions` 先不进入实现
- `V8.4` 前四批已完成，已把高风险 source-specific assumptions 改写成更明确的 contract 归属说明

下一步：

- `V8` 已在当前 contract 下收口；后续进入新的 scope 时，再基于新的 assumptions/backlog 立项

## 14. V9 source-specific damage views

`V8` 结束后，剩余高价值 anomaly / disorder 来源里，有一类已经能通过现有 snapshot contract 显式表达，但它们不适合继续并入主公式：

- 它们是 source-specific 的独立额外结算条目
- 它们不等于主 anomaly / disorder 结果
- 继续塞进主公式会让 resolver contract 变脏

因此下一条新 scope 是：

- 新增 `source-specific damage view`

### 14.1 目标

1. 为不应并入主公式的额外结算提供独立静态 view
2. 只复用现有 contract，不新增新的顶层 snapshot key
3. 明确与主 resolver / skill matrix 的边界

### 14.2 第一批范围

优先来源：

- `爱丽丝` `[极性强击]`
- `雅` `[霜灼·破]`
- `柏妮思` `[燃点]/[余烬]`

### 14.3 不做

- anomaly / disorder skill matrix
- 时间轴 / 资源过程模拟
- 把 source-specific view 强行并入主 anomaly / disorder 公式

### 14.4 执行顺序

1. `V9.1` scope freeze
2. `V9.2` view contract
3. `V9.3` first-batch source coverage
4. `V9.4` docs / integration（已完成：`zzz-agent` 已暴露 `resolve-build-source-damage-views`）

## 15. V10 source-specific delta views

对应规格文档：

- [static-build-resolver-v10.md](./static-build-resolver-v10.md)

### 15.1 目标

继续扩 `source-specific damage view`，但只处理当前 contract 下能通过“含快照结果 - 去除快照结果”稳定表达的 delta source。

### 15.2 第一批范围

1. `爱芮` `[异放]`

research-only，暂不进入实现：

1. `霰落星殿`
2. `混沌重金属 4件`

### 15.3 不做

- 不扩 anomaly / disorder 主公式
- 不做 anomaly / disorder matrix
- 不为 research-only 来源新增新的 snapshot key

### 15.4 执行顺序

1. `V10.1` scope freeze
2. `V10.2` Aria source view coverage
3. `V10.3` closeout / note routing

### 15.5 当前状态

- `V10.1` 已完成
- `V10.2` 已完成：`爱芮 [异放]` 已通过独立 delta view 暴露
- `V10.3` 已完成：`霰落星殿` / `混沌重金属 4件` 已固定为 research-only

## 16. V11 structured source notes

### 16.1 目标

在不改公式和现有 assumptions 字符串兼容层的前提下，把 anomaly / disorder 的高价值来源说明提升成结构化输出。

### 16.2 范围

1. `V11.1` scope freeze
2. `V11.2` resolver note contract
3. `V11.3` consumer adoption

### 16.3 当前状态

- `V11.1` 已完成
- `V11.2` 已完成：resolver 已输出结构化 `sourceNotes`
- `V11.3` 已完成：source view 与 `zzz-agent` 已优先消费结构化 `sourceNotes`

## 17. V12 structured diagnostics

### 17.1 目标

把剩余 generic assumptions、coverage gaps 与 unsupported effects 提升成结构化 diagnostics。

### 17.2 范围

1. `V12.1` scope freeze
2. `V12.2` generic assumption diagnostics
3. `V12.3` coverage / unsupported diagnostics
4. `V12.4` consumer adoption

### 17.3 当前状态

- `V12.1` 已完成
- `V12.2` 已完成：默认 attribute / extraAbilityActive / agentMindscape / anomaly agentLevel 已有结构化 `defaulted-input diagnostics`
- `V12.3` 已完成：未收录 curated source 与缺少 `finalPanel.baseAttack` 等 unsupported effects 已有结构化镜像
- `V12.4` 已完成：高层 resolver、source view 条目与 agent prompt 已优先消费 `diagnostics`

## 18. V13 anomaly/disorder curated coverage

### 18.1 目标

在不新增 contract 的前提下，继续减少 anomaly / disorder 路径中的 `coverage-gap diagnostics`。

### 18.2 范围

1. `V13.1` scope freeze
2. `V13.2` anomaly/disorder coverage inventory
3. `V13.3` batch A coverage
4. `V13.4` batch B coverage
5. `V13.5` closeout

### 18.3 当前状态

- `V13.1` 已完成
- `V13.2` 已完成：剩余 anomaly/disorder coverage-gap 已按 source 和批次冻结
- `V13.3` 已完成：Batch A anomaly/disorder curated coverage 已落地
- `V13.4` 已完成：Batch B anomaly/disorder curated coverage 已落地
- `V13.5` 已完成：在当前 contract 下收口，不再新增 public key

### 18.4 当前批次规划

Batch A：

- `格莉丝`
- `简`
- `柳`
- `派派`
- `淬锋钳刺`
- `时流贤者`
- `触电唇彩`

Batch B：

- `柏妮思`
- `爱丽丝`
- `爱芮`
- `灼心摇壶`
- `壳中之灵`

当前状态：已满足。`V13` 在当前 contract 下已收口，下一步进入 `V14`。

## 19. V14 non-agent source-specific damage views

### 19.1 目标

在不改主 resolver 和不新增 public key 的前提下，评估并补齐适合独立表达的非代理人 `source-specific damage view`。

### 19.2 范围

1. `V14.1` scope freeze
2. `V14.2` non-agent source inventory
3. `V14.3` source view coverage
4. `V14.4` closeout

### 19.3 当前状态

- `V14.1` 已完成：冻结到非代理人来源的 source view，不再继续扩大主公式
- `V14.2` 已完成：候选 inventory 已确认
- `V14.3` 已完成：当前 contract 下未新增新的非代理人 source view
- `V14.4` 已完成：在当前 contract 下收口

### 19.4 当前候选

优先候选：

- `霰落星殿`
- `混沌重金属 4件`

显式不纳入：

- `轰鸣座驾`
- `自由蓝调 4件`

当前状态：已满足。`V14` 在当前 contract 下已收口，下一步进入 `V15`。

## 20. V15 structured source-note guidance

### 20.1 目标

在不改主公式和不新增计算输入 key 的前提下，把 `sourceNotes` 的“下一步该怎么做”提升成结构化 guidance。

### 20.2 范围

1. `V15.1` scope freeze
2. `V15.2` guidance taxonomy
3. `V15.3` source note adoption
4. `V15.4` closeout

### 20.3 当前状态

- `V15.1` 已完成：冻结到 `sourceNotes` guidance，不再继续扩大公式和 snapshot contract
- `V15.2` 已完成：`sourceNotes.guidance` taxonomy 已冻结
- `V15.3` 已完成：`zzz-agent` prompt 与 README 已优先消费 `sourceNotes.guidance`
- `V15.4` 已完成：当前 contract 下已收口，下一步进入新的 post-V15 scope

## 21. V16 generic w-engine curated coverage

### 21.1 目标

在不改主公式和不新增计算输入 key 的前提下，把当前仍靠 generic fallback 的通用音擎逐步补成 curated coverage。

### 21.2 范围

1. `V16.1` scope freeze
2. `V16.2` generic w-engine inventory
3. `V16.3` curated coverage batches
4. `V16.4` closeout

### 21.3 当前状态

- `V16.1` 已完成：冻结到通用音擎 curated coverage，不继续扩大 contract
- `V16.2` 已完成：inventory 与 batch 划分已冻结
- `V16.3` 已完成 Batch C：通用音擎批次已全部落地
- `V16.4` 已完成：当前 contract 下已收口

结论：

1. `V16` 目标已经完成，不再继续向这一阶段追加新的通用音擎批次
2. 仍不适合静态 damage contract 的来源继续保持显式 out-of-scope

### 21.4 当前批次规划

Batch A（已完成）：

- `鎏金花信`
- `星徽引擎`
- `「月相」-晦`
- `「月相」-望`
- `青漪灵鼎`
- `「电磁暴」-壹式`
- `「电磁暴」-贰式`

补充说明：

- `「灰烬」-钴蓝` 已在 Batch A 中完成 source-aware unsupported 收口：它不再落入 generic coverage-gap，但攻击力 buff 不进入当前命破 sheer 公式

Batch B（已完成）：

- `加农转子`
- `幻变魔方`

Batch C（已完成）：

- `强音热望`
- `街头巨星`

显式不纳入：

- `「月相」-朔`
- `「电磁暴」-叁式`

当前状态：已满足。`V16` 在当前 contract 下已收口，下一步进入 `V17`。

## 22. V17 generic drive-disc curated coverage

### 22.1 目标

在不改主公式和不新增计算输入 key 的前提下，把当前仍靠 generic fallback 的通用驱动盘逐步补成 curated coverage。

### 22.2 范围

1. `V17.1` scope freeze
2. `V17.2` generic drive-disc inventory
3. `V17.3` curated coverage batches
4. `V17.4` closeout

### 22.3 当前状态

- `V17.1` 已完成：冻结到通用驱动盘 curated coverage，不继续扩大 contract
- `V17.2` 已完成：通用驱动盘 inventory 与批次已冻结
- `V17.3` 已完成
- `V17.4` 已完成：当前 contract 下已收口

### 22.4 当前边界

优先纳入：

1. 装备者自身生效的 damage / crit / attack / anomaly 类驱动盘
2. 能由现有 `skillTag` / `combatTags` / `enemy.isStunned` / `full-buff` 表达的条件

显式不纳入：

1. “队伍中任意角色”触发的 teamwide 驱动盘
2. 后台来源、护盾值、失衡值、回能、层数衰减等过程型来源

### 22.5 当前批次规划

Batch A（已完成）：

- `拂晓生花`
- `流光咏叹`
- `獠牙重金属`
- `如影相随`
- `折枝剑歌`

Batch B（已完成）：

- `沧浪行歌`
- `囚徒手记`

显式不纳入：

- `雪兔梦游仙境`
- `月光骑士颂`
- `法厄同之歌`
- `山大王`
- `震星迪斯科`
- `原始朋克`
- `灵魂摇滚`
- `摇摆爵士`
- `激素朋克`
- `静听嘉音`

结论：

1. `V17` 目标已经完成，不再继续向这一阶段追加新的通用驱动盘批次
2. `拂晓生花 / 流光咏叹 / 如影相随 / 沧浪行歌 / 囚徒手记` 中仍需过程表达的部分，已经固定为 source note，不再作为 generic coverage-gap

## 23. V18 legacy attack signature closeout

### 23.1 目标

在不改主公式和不新增计算输入 key 的前提下，把最后一批 legacy 强攻代理人 / 专属音擎按当前 contract 能力做收口。

### 23.2 范围

1. `V18.1` scope freeze
2. `V18.2` legacy attack signature inventory
3. `V18.3` partial coverage + source-note batches
4. `V18.4` closeout

### 23.3 当前状态

- `V18.1` 已完成：冻结到 legacy attack signature closeout，不继续扩大 contract
- `V18.2` 已完成：inventory 与批次已冻结
- `V18.3` 已完成：`Batch A` + `Batch B`
- `V18.4` 已完成：当前 contract 下已收口

### 23.4 当前边界

优先纳入：

1. 作用于装备者自身、可直接映射到现有 bucket 的 legacy 强攻来源
2. 可由现有 `skillTag` / `combatTags` / `enemy.isStunned` / `mode` 表达的条件

显式保留为 source note：

1. 姿态切换
2. 距离判断
3. 持续斩击 / 连续命中窗口
4. 真动态的额外结算或追击次数
5. 强依赖流程触发链的状态窗口

### 23.5 当前批次规划

Batch A（已完成）：

- `可琳`
- `家政员`

Batch B（已完成）：

- `比利`
- `仿制星徽引擎`
- `安东`
- `旋钻机-赤轴`

显式不纳入：

- `「月相」-朔`
- `「电磁暴」-叁式`

结论：

1. `V18` 已在当前 contract 下收口；最后一批 legacy attack signatures 不再作为 generic coverage gap 保留
2. 可静态表达的部分已做 curated / partial coverage
3. 不适合静态表达的部分已固定为 source note，且未新增新的 public key

## 24. V19 legacy utility engine closeout

### 24.1 目标

在不新增 public key 的前提下，把最后两个只提供能量回复的旧通用音擎从 generic coverage-gap 收口成 source-aware coverage。

### 24.2 范围

1. `V19.1` scope freeze
2. `V19.2` utility engine inventory
3. `V19.3` source-note closeout
4. `V19.4` closeout

### 24.3 当前状态

- `V19.1` 已完成：冻结到最后两个 utility-only 旧通用音擎
- `V19.2` 已完成：inventory 已冻结
- `V19.3` 已完成：`「月相」-朔 / 「电磁暴」-叁式` 已固定为 process-only source note
- `V19.4` 已完成：当前 contract 下已收口

### 24.4 当前范围

本阶段唯一目标：

- `「月相」-朔`
- `「电磁暴」-叁式`

结论：

1. 这两把音擎只提供能量回复，不进入当前 static damage 主公式
2. `V19` 已在当前 contract 下收口；它们不再作为 generic coverage-gap 保留
3. 当前不新开能量 contract

## 25. V20 source-specific utility / energy views

### 25.1 目标

在不扩大主伤害公式的前提下，为可稳定静态表达的 utility / energy 来源新增独立 view contract。

### 25.2 范围

1. `V20.1` scope freeze
2. `V20.2` first-batch utility view coverage
3. `V20.3` agent / docs integration
4. `V20.4` closeout

### 25.3 当前状态

- `V20.1` 已完成：contract 已冻结
- `V20.2` 已完成：第一批 utility / energy view 已落地
- `V20.3` 已完成：agent / docs integration 已完成
- `V20.4` 已完成：当前 contract 下已收口

### 25.4 第一批范围

第一批仅处理稳定、单来源、可直接结构化表达的 `w-engine` utility 条目：

1. `「月相」-朔`
2. `「电磁暴」-叁式`
3. `家政员`
4. `灼心摇壶`

### 25.5 当前边界

本阶段只做：

1. `source-specific utility / energy view`
2. `energy-refund`
3. `energy-regen-rate`

显式不做：

1. 不把 utility 条目并回主 resolver
2. 不做 utility matrix
3. 不做时间轴 / 覆盖率 / 循环模拟
4. 不在第一批纳入需要复杂层数或后台过程的 anomaly utility 来源

## 26. V21 anomaly / disorder trigger-entry matrix

### 26.1 目标

把 anomaly / disorder 从“没有 matrix”推进到“有独立 trigger-entry matrix”，但不继续伪装成技能矩阵。

### 26.2 范围

1. `V21.1` scope freeze
2. `V21.2` trigger-entry matrix contract
3. `V21.3` first-batch coverage
4. `V21.4` agent / docs integration
5. `V21.5` closeout

### 26.3 当前状态

- `V21.1` 已完成：冻结到 trigger-entry matrix
- `V21.2` 已完成：新增独立 trigger-entry matrix contract
- `V21.3` 已完成：第一批已覆盖 `爱丽丝 / 雅 / 柏妮思 / 爱芮`
- `V21.4` 已完成：`zzz-agent` 已新增 `resolveBuildTriggerMatrix`
- `V21.5` 已完成：文档、测试与构建已收口

### 26.4 第一批范围

第一批只覆盖当前已有 source-specific damage view 的 anomaly / disorder 代理人：

1. `爱丽丝`
2. `雅`
3. `柏妮思`
4. `爱芮`

### 26.5 当前边界

本阶段只做：

1. `main-formula` 主条目
2. `source-view` 附加条目
3. 单次 snapshot 的触发条目矩阵

显式不做：

1. 不做 anomaly / disorder skill matrix
2. 不做 utility / energy matrix
3. 不新增时间轴、覆盖率、积蓄过程 contract

## 27. V22 structured source-entry metadata

### 27.1 目标

为 source damage view / source utility view 补齐稳定 metadata，减少上层对自由文本 `label` 的依赖。

### 27.2 范围

1. `V22.1` scope freeze
2. `V22.2` source damage view metadata
3. `V22.3` source utility view metadata
4. `V22.4` agent / docs integration
5. `V22.5` closeout

### 27.3 当前状态

- `V22.1` 已完成：冻结到 source-entry metadata
- `V22.2` 已完成：source damage view 已补 metadata
- `V22.3` 已完成：source utility view 已补 metadata
- `V22.4` 已完成：agent / docs integration 已完成
- `V22.5` 已完成：当前 contract 下已收口

### 27.4 当前边界

本阶段只做：

1. `source damage view metadata`
2. `source utility view metadata`
3. 上层优先消费 metadata

显式不做：

1. 不新增 utility matrix
2. 不新增 trigger matrix 类型
3. 不新增新的 snapshot key

## 28. V23 unified source-entry collection

### 28.1 目标

为上层新增单一 source-entry collection contract，一次性聚合 source damage views 与 source utility views。

### 28.2 范围

1. `V23.1` scope freeze
2. `V23.2` unified source-entry contract
3. `V23.3` high-level tool integration
4. `V23.4` docs closeout

### 28.3 当前状态

- `V23.1` 已完成：冻结到 unified source-entry collection
- `V23.2` 已完成：新增 `resolveStaticBuildSourceEntries()` 统一聚合 source damage views 与 source utility views
- `V23.3` 已完成：`zzz-agent` 已新增 `resolve-build-source-entries` 高层 tool
- `V23.4` 已完成：README / specs / architecture / index 已同步到统一 source-entry collection

### 28.4 当前边界

本阶段只做：

1. 聚合现有 source damage views
2. 聚合现有 source utility views
3. 允许 utility-only 输入

显式不做：

1. 不把主公式结算并进 source-entry collection
2. 不把 trigger-entry matrix 并进 source-entry collection
3. 不新增新的 damage / utility 公式

## 29. V24 formula-derived second-batch source views

### 29.1 目标

扩第二批 anomaly / disorder source view coverage，但只处理“可由现有 contract 直接推导”的来源。

第一批锁定：

1. `薇薇安 [异放]`

### 29.2 范围

1. `V24.1` scope freeze
2. `V24.2` vivian exflow contract
3. `V24.3` trigger/source-entry integration
4. `V24.4` docs closeout

### 29.3 当前状态

- `V24.1` 已完成：冻结到公式可推导的第二批 source view
- `V24.2` 已完成：`薇薇安 [异放]` 已按 `coreSkillLevel + finalPanel.anomalyProficiency (+ M2 130%)` 落成公式推导型 delta view
- `V24.3` 已完成：`resolveStaticBuildTriggerMatrix()` 与 `resolveStaticBuildSourceEntries()` 已同步覆盖 `薇薇安 [异放]`
- `V24.4` 已完成：高层 tool、测试与文档已全部收口

### 29.4 当前边界

本阶段只做：

1. 仅扩 `薇薇安 [异放]`
2. 只使用现有 `loadout / finalPanel / scenario` 输入
3. 如果 `M2` 对 `[异放]` 的收益提升可稳定折算，则并入同一 source view

显式不做：

1. 不展开 `薇薇安的预言`
2. 不新增新的 snapshot key
3. 不把第二批 source view 并回主公式

## 30. V25 second-batch utility / resource views

### 30.1 目标

扩第二批 utility / resource view，但只处理：

1. 当前 contract 下仍可静态结构化表达的资源来源
2. 目前 `energy-only` utility contract 无法覆盖的 `decibel` 类条目
3. 当前 utility-only 查询因 damage-agent catalog 约束而进不去的 `支援` 特性音擎

第一批锁定：

1. `时光切片`

### 30.2 范围

1. `V25.1` scope freeze
2. `V25.2` decibel utility contract
3. `V25.3` utility-only catalog decoupling
4. `V25.4` time-slice coverage + source-entry integration
5. `V25.5` docs closeout

### 30.3 当前状态

- `V25.1` 已完成：冻结到第二批 utility / resource view
- `V25.2` 已完成：utility contract 已新增 `decibel-gain / decibel`
- `V25.3` 已完成：utility-only agent / w-engine catalog 已与 damage-agent catalog 解耦
- `V25.4` 已完成：`时光切片` 已按每种触发拆成 `decibel + energy` utility entries，并接入 source-entry collection
- `V25.5` 已完成：README / 索引 / 架构入口已同步到“`V25` 已收口”，并统一更新 utility / resource 覆盖说明

### 30.4 当前边界

本阶段只做：

1. 扩 `source-specific utility view`
2. 新增 `decibel-gain`
3. 新增 utility-only agent catalog，用于支援特性音擎兼容校验
4. 第一批只落 `时光切片`

显式不做：

1. 不把资源条目并回主 damage resolver
2. 不做 utility trigger matrix
3. 不做 `支援` 代理人的主伤害 resolver
4. 不做时间轴累计、覆盖率、循环收益模拟

## 31. V26 unified source-entry collection summary

### 31.1 目标

在 `V23` 完成 unified source-entry collection、`V25` 完成第二批 utility / resource view 之后，当前真正缺的不是新的 entry，而是更稳定的 collection-level 消费 contract。

`V26` 只解决一件事：

1. 为 `resolveStaticBuildSourceEntries()` 增加稳定 summary
2. 固定 utility-only / mixed collection 的排序与分组语义

### 31.2 范围

1. `V26.1` scope freeze
2. `V26.2` collection summary contract
3. `V26.3` high-level tool alignment
4. `V26.4` docs closeout

### 31.3 当前状态

- `V26.1` 已完成：冻结到 unified source-entry collection summary
- `V26.2` 已完成：`ResolveStaticBuildSourceEntriesResult` 已新增 `summary`，并固定 utility-only / mixed collection 的排序语义
- `V26.3` 已完成：高层 tool 与 Agent prompt 已改为优先消费 `collection.summary`
- `V26.4` 已完成：README / 总规格 / 索引 / 架构入口已同步到“`V26` 已收口”，并补充 `collection.summary` 的推荐消费方式

### 31.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSourceEntriesResult` 增加 collection-level summary
2. 固定 `entries[]` 排序语义
3. 为上层提供稳定 group summary

显式不做：

1. 不新增新的 source damage view
2. 不新增新的 source utility view
3. 不把 trigger-entry matrix 并进 source-entry collection
4. 不新增新的 snapshot key

## 32. V27 trigger-entry matrix summary

### 32.1 目标

在 `V21` 完成 trigger-entry matrix、`V26` 完成 source-entry collection summary 之后，当前剩余的高层消费缺口落在 trigger-entry matrix 自身。

`V27` 只解决一件事：

1. 为 `resolveStaticBuildTriggerMatrix()` 增加稳定 summary
2. 固定 `main-formula / source-view` 的排序与分组语义

### 32.2 范围

1. `V27.1` scope freeze
2. `V27.2` trigger-matrix summary contract
3. `V27.3` high-level tool alignment
4. `V27.4` docs closeout

### 32.3 当前状态

- `V27.1` 已完成：冻结到 trigger-entry matrix summary
- `V27.2` 已完成：`resolveStaticBuildTriggerMatrix()` 已返回稳定 `summary`
- `V27.3` 已完成：高层 tool / Agent 已直接消费 `matrix.summary`
- `V27.4` 已完成：文档入口与 README 已同步收口

### 32.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildTriggerMatrixResult` 增加 matrix-level summary
2. 固定 `rows[]` 排序语义
3. 为上层提供稳定 group summary

显式不做：

1. 不新增 anomaly / disorder source views
2. 不把 utility entries 并进 trigger-entry matrix
3. 不把 trigger-entry matrix 伪装成 skill matrix
4. 不新增新的 snapshot key

## 33. V28 source-view summary contracts

### 33.1 目标

在 `V26` 完成 unified source-entry collection summary、`V27` 完成 trigger-entry matrix summary 之后，剩余还停留在裸 `entries[]` 的 contract 只剩 source-specific damage / utility views。

`V28` 只解决一件事：

1. 为 `resolveStaticBuildSourceDamageViews()` 增加稳定 `summary`
2. 为 `resolveStaticBuildSourceUtilityViews()` 增加稳定 `summary`

### 33.2 范围

1. `V28.1` scope freeze
2. `V28.2` source-damage-view summary contract
3. `V28.3` source-utility-view summary contract
4. `V28.4` high-level tool alignment
5. `V28.5` docs closeout

### 33.3 当前状态

- `V28.1` 已完成：冻结到 source-view summary contract
- `V28.2` 已完成：`resolveStaticBuildSourceDamageViews()` 已返回稳定 `summary`
- `V28.3` 已完成：`resolveStaticBuildSourceUtilityViews()` 已返回稳定 `summary`
- `V28.4` 已完成：高层 tool / Agent 已直接消费 `views.summary`
- `V28.5` 已完成：README / 总规格 / 索引 / 架构入口已同步收口

### 33.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSourceDamageViewsResult` 增加稳定 `summary`
2. 为 `ResolveStaticBuildSourceUtilityViewsResult` 增加稳定 `summary`
3. 固定 `entries[]` 排序语义
4. 为上层提供稳定 group summary

显式不做：

1. 不新增 anomaly / disorder source damage views
2. 不新增 utility / resource view coverage
3. 不把 source views 重新并回 `source-entry collection`
4. 不新增新的 snapshot key

## 34. V29 main resolver summary contract

### 34.1 目标

在 `V26` 到 `V28` 依次为 collection / matrix / source views 增加稳定 `summary` 之后，当前仍停留在“裸结果对象”的主入口只剩：

1. `resolveStaticBuildDamage()`
2. `resolveStaticBuildSkillMatrix()`

其中优先级更高的是 `resolveStaticBuildDamage()`，因为它仍要求上层同时读取：

- `resolvedPanel`
- `resolvedBuckets`
- `damage.expected.breakdown`
- `diagnostics`
- `sourceNotes`
- `unsupportedEffects`

`V29` 只解决一件事：

1. 为 `ResolveStaticBuildResult` 增加稳定 `summary`

### 34.2 范围

1. `V29.1` scope freeze
2. `V29.2` resolver summary contract
3. `V29.3` high-level tool alignment
4. `V29.4` docs closeout

### 34.3 当前状态

- `V29.1` 已完成：冻结到单次 resolver summary contract
- `V29.2` 已完成：`ResolveStaticBuildResult` 已返回稳定 `summary`
- `V29.3` 已完成：高层 tool / Agent 已对齐 `build.summary`
- `V29.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口

### 34.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildResult` 增加稳定 `summary`
2. 固定单次结果的公式乘区摘要语义
3. 固定 diagnostics / sourceNotes / unsupportedEffects 的 summary 统计语义
4. 让高层 tool / Agent 优先消费 `build.summary`

显式不做：

1. 不新增新的计算 bucket
2. 不调整主伤害公式
3. 不新增新的 snapshot key
4. 不处理 skill matrix summary，下沉到下一阶段处理

## 35. V30 core skill matrix summary

### 35.1 目标

`V29` 完成后，当前还停留在高层 tool 临时 summary 逻辑里的主结果只剩：

- `resolveStaticBuildSkillMatrix()`

`V30` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `summary`

### 35.2 范围

1. `V30.1` scope freeze
2. `V30.2` matrix summary contract
3. `V30.3` high-level tool alignment
4. `V30.4` docs closeout

### 35.3 当前状态

- `V30.1` 已完成：冻结到 core skill matrix summary contract
- `V30.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 已返回稳定 `summary`
- `V30.3` 已完成：高层 tool 已对齐底层 `matrix.summary`
- `V30.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口

### 35.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `summary`
2. 固定矩阵 summary 中的共通 bucket / 可变 bucket 语义
3. 固定矩阵 summary 中的共通公式乘区 / 可变公式乘区语义
4. 让高层 tool 直接透传底层 `matrix.summary`

显式不做：

1. 不新增 skill matrix coverage
2. 不新增 effect summary contract
3. 不调整 row metadata
4. 不新增新的 snapshot key

## 36. V31 core skill matrix effect summary

### 36.1 目标

`V30` 完成后，当前还停留在高层 tool 临时聚合逻辑里的 skill matrix 主结果只剩：

- `effectSummary`

`V31` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `effectSummary`

### 36.2 范围

1. `V31.1` scope freeze
2. `V31.2` matrix effect-summary contract
3. `V31.3` high-level tool alignment
4. `V31.4` docs closeout

### 36.3 当前状态

- `V31.1` 已完成：冻结到 core skill matrix effect-summary contract
- `V31.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `effectSummary`
- `V31.3` 已完成：高层 tool 已对齐底层 `matrix.effectSummary`
- `V31.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口

### 36.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `effectSummary`
2. 固定 skill matrix applied effect summary 的分组与聚合语义
3. 让高层 tool 直接透传底层 `matrix.effectSummary`

显式不做：

1. 不新增 skill matrix coverage
2. 不新增新的 formula summary 字段
3. 不调整 row metadata
4. 不新增新的 snapshot key

## 37. V32 source-entry summary alignment

### 37.1 目标

`V26` 已经把 `ResolveStaticBuildSourceEntriesResult.summary` 固定为稳定 public contract。

当前高层 tool 里还保留着最后一处 summary aliasing：

1. `zzz-data` 底层返回 `sourceDamageViewCount / sourceUtilityViewCount`
2. `zzz-agent` 的 `resolve-build-source-entries` 已直接透传 `sourceDamageViewCount / sourceUtilityViewCount`

`V32` 只解决一件事：

1. 让 `resolve-build-source-entries` 直接透传底层 `collection.summary`

### 37.2 范围

1. `V32.1` scope freeze
2. `V32.2` source-entry summary alignment
3. `V32.3` docs closeout

### 37.3 当前状态

- `V32.1` 已完成：冻结到 source-entry summary alignment
- `V32.2` 已完成：高层 tool 已直接透传 `collection.summary`
- `V32.3` 已完成：README / 总规格 / 索引 / 架构入口已同步收口

### 37.4 当前边界

本阶段只做：

1. 去掉 `resolve-build-source-entries` 对 `collection.summary` 的高层别名改写
2. 更新测试与文档中的 summary key

显式不做：

1. 不新增新的 summary key
2. 不调整 `zzz-data` source-entry collection contract
3. 不调整 source-entry row / metadata contract
4. 不新增新的 source-entry coverage

## 38. V33 support-scope normalization

### 38.1 目标

`V32` 收口后，`zzz-data` 与高层 tool 的主结果 contract 已基本对齐。

当前剩余 drift 主要落在 `zzz-agent` 的 `resolve-build-*` 高层 tool：

1. unsupported / support-scope 响应仍由各个 tool 各自拼装
2. `supportedAgents / supportedWEngines / supportedDriveDiscs / candidates` 的组装逻辑重复
3. `resolve-build-skill-matrix` 仍本地复制 catalog matching helper

`V33` 只解决一件事：

1. 统一 `resolve-build-*` 高层 tool 的 support-scope 组装与 catalog helper

### 38.2 范围

1. `V33.1` scope freeze
2. `V33.2` shared support-scope helpers
3. `V33.3` tool migration
4. `V33.4` docs closeout

### 38.3 当前状态

- `V33.1` 已完成：冻结到 support-scope normalization
- `V33.2` 已完成：共享 support-scope helper 已进入 `resolve-build-shared.ts`
- `V33.3` 已完成：`resolve-build-*` 高层 tool 已完成迁移
- `V33.4` 已完成：总规格 / 索引 / 架构入口已同步收口

### 38.4 当前边界

本阶段只做：

1. 提取并复用高层 tool 的 support-scope helper
2. 统一 unsupported / candidates 返回结构
3. 去掉 `resolve-build-skill-matrix` 中重复的 catalog matching helper

显式不做：

1. 不新增 `zzz-data` public key
2. 不调整底层 build/source-view/trigger-matrix/source-entry contract
3. 不新增新的 coverage
4. 不调整 Agent prompt 输出模板

## 39. V34 matrix row damage summary

### 39.1 目标

`V33` 收口后，`resolve-build-skill-matrix` 的主结果里仍有一处高层临时扁平化：

1. `zzz-data` 底层 row 仍只暴露完整 `build`
2. `zzz-agent` 高层 tool 仍从 `row.build.damage.expected/crit/noCrit.total` 手工拼出 `row.damage`

`V34` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixRow` 增加稳定 `damageSummary`

### 39.2 范围

1. `V34.1` scope freeze
2. `V34.2` matrix row damage-summary contract
3. `V34.3` high-level tool alignment
4. `V34.4` docs closeout

### 39.3 当前状态

- `V34.1` 已完成：冻结到 matrix row damage-summary contract
- `V34.2` 已完成：skill matrix row 已新增 `damageSummary`
- `V34.3` 已完成：高层 tool 已对齐底层 `row.damageSummary`
- `V34.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口

### 39.4 当前边界

本阶段只做：

1. 为 skill matrix row 增加稳定 `damageSummary`
2. 让高层 tool 直接透传底层 `row.damageSummary`
3. 更新测试与文档中的 row 简要伤害字段说明

显式不做：

1. 不新增 trigger-entry row damage summary
2. 不新增 source-entry damage summary
3. 不调整 skill matrix row metadata
4. 不新增新的 matrix coverage

## 40. V35 matrix row compact contract

### 40.1 目标

`V34` 收口后，`resolve-build-skill-matrix` 仍有最后一处 `row.build` 直读：

1. `row.build.resolvedBuckets`
2. `row.build.assumptions`
3. `row.build.unsupportedEffects`

`V35` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixRow` 增加稳定的 row-level compact fields

### 40.2 范围

1. `V35.1` scope freeze
2. `V35.2` matrix row compact contract
3. `V35.3` high-level tool alignment
4. `V35.4` docs closeout

### 40.3 当前状态

- `V35.1` 已完成：冻结到 matrix row compact contract
- `V35.2` 已完成：skill matrix row 已新增 compact fields
- `V35.3` 已完成：高层 tool 已对齐底层 row-level compact fields
- `V35.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口

### 40.4 当前边界

本阶段只做：

1. 为 skill matrix row 增加稳定的 `resolvedBuckets`
2. 为 skill matrix row 增加稳定的 `assumptions`
3. 为 skill matrix row 增加稳定的 `unsupportedEffects`
4. 让高层 tool 直接透传这些 row-level compact fields

显式不做：

1. 不调整 `ResolveStaticBuildResult` 顶层 contract
2. 不新增新的 matrix summary / effect summary
3. 不调整 trigger/source-entry/source-view 的 row contract
4. 不新增新的 matrix coverage

## 41. V36 matrix row explanation contract

### 41.1 目标

`V35` 收口后，`resolve-build-skill-matrix` 的 row contract 仍缺：

1. `diagnostics`
2. `sourceNotes`

`V36` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixRow` 增加稳定的 row-level explanation fields

### 41.2 范围

1. `V36.1` scope freeze
2. `V36.2` matrix row explanation contract
3. `V36.3` high-level tool alignment
4. `V36.4` docs closeout

### 41.3 当前状态

- `V36.1` 已完成：冻结到 matrix row explanation contract
- `V36.2` 已完成：skill matrix row 已新增 `diagnostics / sourceNotes`
- `V36.3` 已完成：高层 tool 已对齐底层 row-level explanation fields
- `V36.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口

### 41.4 当前边界

本阶段只做：

1. 为 skill matrix row 增加稳定的 `diagnostics`
2. 为 skill matrix row 增加稳定的 `sourceNotes`
3. 让高层 tool 直接透传这些 row-level explanation fields

显式不做：

1. 不新增新的 summary / effect summary
2. 不调整 `ResolveStaticBuildResult` 顶层 contract
3. 不新增新的 matrix coverage
4. 不调整 trigger/source-entry/source-view 的 row contract

## 42. V37 compact helper exports

### 42.1 目标

`V36` 收口后，`zzz-agent` 仍保留 3 处薄层 compact 逻辑：

1. `compactMatrix()`
2. `compactTriggerMatrix()`
3. `compactSourceEntries()`

`V37` 只解决一件事：

1. 把高层 compact 逻辑下沉为 `zzz-data` 的可复用 helper exports

### 42.2 范围

1. `V37.1` scope freeze
2. `V37.2` compact helper exports
3. `V37.3` high-level tool alignment
4. `V37.4` docs closeout

### 42.3 当前状态

- `V37.1` 已完成：冻结到 compact helper exports
- `V37.2` 已完成：`zzz-data` 已新增 compact helper exports
- `V37.3` 已完成：`zzz-agent` 已改为直接消费底层 helper
- `V37.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口

### 42.4 当前边界

本阶段只做：

1. 为 skill matrix 提供 compact helper
2. 为 trigger matrix 提供 compact helper
3. 为 source-entry collection 提供 compact helper
4. 让 `zzz-agent` 直接调用底层 helper

显式不做：

1. 不新增新的 build/source/trigger contract key
2. 不调整 damage formula / matrix coverage
3. 不改变 `includeDetails` 语义
4. 不把 compact helper 做成 Agent 私有实现

## 43. V38 source-view compact helpers

### 43.1 目标

`V37` 已把 matrix / trigger / source-entry 的 compact 逻辑下沉，但 source-view 仍是例外：

1. `source-damage-view` 还没有对应的 compact helper exports
2. `resolve-build-source-damage-views` 仍默认返回完整 `build`
3. `source-utility-view` 也还没有与 `V37` 对称的 compact helper

`V38` 只解决一件事：

1. 把 source-damage-view / source-utility-view 收口为与 `V37` 对称的 compact helper exports

### 43.2 范围

1. `V38.1` scope freeze
2. `V38.2` source-view compact helper exports
3. `V38.3` high-level source-view tool alignment
4. `V38.4` docs closeout

### 43.3 当前状态

- `V38.1` 已完成：冻结到 source-view compact helper exports
- `V38.2` 已完成：`zzz-data` 已新增 source-view compact helper exports
- `V38.3` 已完成：高层 source-view tool 已对齐 compact helper
- `V38.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口

### 43.4 当前边界

本阶段只做：

1. 为 source-damage-view 提供 compact helper
2. 为 source-utility-view 提供 compact helper
3. 让 `resolve-build-source-damage-views` 支持 `includeDetails`
4. 让两个高层 source-view tool 直接复用底层 helper

显式不做：

1. 不新增 source-view summary key
2. 不新增新的 source-view coverage
3. 不改变 source-view 的排序 / 分组 contract
4. 不把 source-view compact helper 做成 Agent 私有实现

## 44. V39 trigger row source metadata

### 44.1 目标

`V38` 收口后，`trigger-entry matrix` 仍比 `source-view / source-entry / skill matrix` 少一层稳定来源追溯：

1. `trigger row` 目前只有 `sourceViewId`
2. 上层仍需要借助 `label` 或额外查 `source-view` 才能还原来源

`V39` 只解决一件事：

1. 为 `trigger-entry matrix row` 增加稳定来源元数据

### 44.2 范围

1. `V39.1` scope freeze
2. `V39.2` trigger row source-metadata contract
3. `V39.3` high-level tool / test alignment
4. `V39.4` docs closeout

### 44.3 当前状态

- `V39.1` 已完成：冻结到 trigger row source-metadata contract
- `V39.2` 已完成：trigger row 已新增稳定来源元数据
- `V39.3` 已完成：高层 compact / tool 测试已对齐新 metadata
- `V39.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口

### 44.4 当前边界

本阶段只做：

1. 为 trigger row 增加 `templateSource`
2. 为 source-view 行增加稳定来源字段
3. 保持现有 compact helper 与高层 tool 兼容

显式不做：

1. 不新增 trigger matrix summary key
2. 不新增新的 trigger coverage
3. 不新增 anomaly / disorder skill matrix
4. 不实现独立 trigger-template catalog public export

## 45. V40 requirement summaries

### 45.1 目标

`V39` 收口后，`source-damage-view` 与 `trigger-entry matrix` 仍只有逐条 `requirements[]`：

1. 上层若只想知道是否有未满足条件，仍需手工遍历
2. 若要按 requirement kind 分组，也只能自行统计

`V40` 只解决一件事：

1. 为 source-view / trigger row 增加稳定 requirement summary

### 45.2 范围

1. `V40.1` scope freeze
2. `V40.2` source-view requirement-summary contract
3. `V40.3` trigger-row alignment
4. `V40.4` docs closeout

### 45.3 当前状态

- `V40.1` 已完成：冻结到 requirement-summary contract
- `V40.2` 已完成：source-view entry 已新增稳定 `requirementSummary`
- `V40.3` 已完成：trigger row 与 compact helper 已对齐 `requirementSummary`
- `V40.4` 已完成：README / 总规格 / 路线图 / 索引 / 架构入口已同步收口

### 45.4 当前边界

本阶段只做：

1. 为 source-damage-view entry 增加 `requirementSummary`
2. 为 trigger row 增加 `requirementSummary`
3. 保持现有 `requirements[]` 与 compact helper 兼容

显式不做：

1. 不改变 `requirements[]` 原始数组
2. 不新增新的 coverage
3. 不新增新的顶层 summary key
4. 不实现独立 trigger-template catalog

## 46. V41 diagnostic summaries

### 46.1 目标

`V40` 收口后，`source-damage-view` 与 `trigger-entry matrix row` 仍只有逐条 `diagnostics[]`：

1. 上层若只想知道是否存在 `defaulted-input / coverage-gap / fallback`，仍需手工遍历
2. 若要判断 diagnostics 主要来自 `finalPanel / scenario / source / process`，也只能自行统计

`V41` 只解决一件事：

1. 为 source-view / trigger row 增加稳定 diagnostic summary

### 46.2 范围

1. `V41.1` scope freeze
2. `V41.2` source-view diagnostic-summary contract
3. `V41.3` trigger-row alignment
4. `V41.4` docs closeout

### 46.3 当前状态

- `V41.1` 已完成：冻结到 diagnostic-summary contract
- `V41.2` 已完成：source-view entry 已新增稳定 `diagnosticSummary`
- `V41.3` 已完成：trigger row 与 compact helper 已对齐 `diagnosticSummary`
- `V41.4` 已完成：README / architecture / roadmap 已同步收口

### 46.4 当前边界

本阶段只做：

1. 为 source-damage-view entry 增加 `diagnosticSummary`
2. 为 trigger row 增加 `diagnosticSummary`
3. 保持现有 `diagnostics[]` 与 compact helper 兼容

显式不做：

1. 不改变 `diagnostics[]` 原始数组
2. 不新增新的 coverage
3. 不改 `ResolveStaticBuildResult.summary` 的既有结构

## 47. V42 source-note summaries

### 47.1 目标

`V41` 收口后，`source-damage-view` 与 `trigger-entry matrix row` 仍只有逐条 `sourceNotes[]`：

1. 上层若只想知道是否存在 `missing-input / process-only / research-only`，仍需手工遍历
2. 若要判断 source notes 主要来自 `loadout / finalPanel / scenario / source / process`，也只能自行统计

`V42` 只解决一件事：

1. 为 source-view / trigger row 增加稳定 source-note summary

### 47.2 范围

1. `V42.1` scope freeze
2. `V42.2` source-view source-note-summary contract
3. `V42.3` trigger-row alignment
4. `V42.4` docs closeout

### 47.3 当前状态

- `V42.1` 已完成：冻结到 source-note-summary contract
- `V42.2` 已完成：source-damage-view entry 已新增稳定 `sourceNoteSummary`
- `V42.3` 已完成：trigger row 与 compact helper 已对齐 `sourceNoteSummary`
- `V42.4` 已完成：README / architecture / roadmap 已同步收口

### 47.4 当前边界

本阶段只做：

1. 为 source-damage-view entry 增加 `sourceNoteSummary`
2. 为 trigger row 增加 `sourceNoteSummary`
3. 保持现有 `sourceNotes[]` 与 compact helper 兼容

显式不做：

1. 不改变 `sourceNotes[]` 原始数组
2. 不新增新的 source-note status
3. 不新增新的 coverage
4. 不改 `ResolveStaticBuildResult.summary` 的既有结构

## 48. V43 utility-entry summaries

### 48.1 目标

`V42` 收口后，`source-damage-view entry` 与 `trigger-entry matrix row` 已完成 summary 化，但 `source-utility-view entry` 仍只有逐条数组：

1. `diagnostics[]`
2. `sourceNotes[]`

`V43` 只解决一件事：

1. 为 utility entry 增加稳定 `diagnosticSummary`
2. 为 utility entry 增加稳定 `sourceNoteSummary`

### 48.2 范围

1. `V43.1` scope freeze
2. `V43.2` utility-entry summary contract
3. `V43.3` compact / high-level alignment
4. `V43.4` docs closeout

### 48.3 当前状态

- `V43.1` 已完成：冻结到 utility-entry summary contract
- `V43.2` 已完成：utility entry 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V43.3` 已完成：compact helper 与高层 tool 已对齐 utility-entry summaries
- `V43.4` 已完成：README / architecture / roadmap 已同步收口

### 48.4 当前边界

本阶段只做：

1. 为 utility entry 增加 `diagnosticSummary`
2. 为 utility entry 增加 `sourceNoteSummary`
3. 保持现有 `diagnostics[]` / `sourceNotes[]` 与 compact helper 兼容

显式不做：

1. 不新增 `requirements[]`
2. 不新增新的 utility coverage
3. 不改 source utility view 顶层 `summary`

## 49. V44 source-entry collection aggregates

### 49.1 目标

`V43` 收口后，source damage / utility entries 都已具备 summary，但 unified source-entry collection 顶层仍只统计 entry / group 数量。

`V44` 只解决一件事：

1. 为 collection summary 增加聚合 `diagnosticSummary`
2. 为 collection summary 增加聚合 `sourceNoteSummary`

### 49.2 范围

1. `V44.1` scope freeze
2. `V44.2` collection-summary contract
3. `V44.3` compact / high-level alignment
4. `V44.4` docs closeout

### 49.3 当前状态

- `V44.1` 已完成：冻结到 collection-summary aggregate contract
- `V44.2` 已完成：collection summary 已新增聚合 `diagnosticSummary / sourceNoteSummary`
- `V44.3` 已完成：compact helper 与高层 tool 已对齐新的 collection summary contract
- `V44.4` 已完成：README / 总规格 / index / architecture 已同步到 `V44` 收口状态

### 49.4 当前边界

本阶段只做：

1. 为 source-entry collection summary 增加 `diagnosticSummary`
2. 为 source-entry collection summary 增加 `sourceNoteSummary`
3. 保持现有 `entries[]` 与单条 entry summary 兼容

显式不做：

1. 不改变 source-entry groups
2. 不新增新的 source-entry coverage
3. 不改 source damage / utility 单条 entry 既有 summary contract

## 50. V45 source-view summary aggregates

### 50.1 目标

`V44` 收口后，unified source-entry collection 顶层已具备聚合 `diagnosticSummary / sourceNoteSummary`。

但 standalone source damage / utility views 的顶层 `summary` 仍只统计 entry / group 数量。

`V45` 只解决一件事：

1. 为 source-damage-view 顶层 summary 增加聚合 `diagnosticSummary`
2. 为 source-damage-view 顶层 summary 增加聚合 `sourceNoteSummary`
3. 为 source-utility-view 顶层 summary 增加聚合 `diagnosticSummary`
4. 为 source-utility-view 顶层 summary 增加聚合 `sourceNoteSummary`

### 50.2 范围

1. `V45.1` scope freeze
2. `V45.2` source-view summary contract
3. `V45.3` compact / high-level alignment
4. `V45.4` docs closeout

### 50.3 当前状态

- `V45.1` 已完成：冻结到 standalone source-view summary aggregate contract
- `V45.2` 已完成：source-view 顶层 summary 已新增聚合 `diagnosticSummary / sourceNoteSummary`
- `V45.3` 已完成：高层 tool 与 compact consumer 已对齐新的 source-view summary contract
- `V45.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V45` 收口状态

### 50.4 当前边界

本阶段只做：

1. 为 source-damage-view summary 增加 `diagnosticSummary / sourceNoteSummary`
2. 为 source-utility-view summary 增加 `diagnosticSummary / sourceNoteSummary`
3. 保持现有 `entries[]` 与单条 entry summary 兼容

显式不做：

1. 不改变 source-view groups
2. 不新增新的 source-view coverage
3. 不改 unified source-entry collection 既有 summary contract

## 51. V46 trigger-matrix summary aggregates

### 51.1 目标

`V45` 收口后，standalone source views 与 unified source-entry collection 顶层都已具备聚合 `diagnosticSummary / sourceNoteSummary`。

但 trigger-entry matrix 的顶层 `summary` 仍只统计 row / group 数量。

`V46` 只解决一件事：

1. 为 trigger-matrix 顶层 summary 增加聚合 `diagnosticSummary`
2. 为 trigger-matrix 顶层 summary 增加聚合 `sourceNoteSummary`

### 51.2 范围

1. `V46.1` scope freeze
2. `V46.2` trigger-matrix summary contract
3. `V46.3` compact / high-level alignment
4. `V46.4` docs closeout

### 51.3 当前状态

- `V46.1` 已完成：冻结到 trigger-matrix summary aggregate contract
- `V46.2` 已完成：trigger-matrix 顶层 summary 已新增聚合 `diagnosticSummary / sourceNoteSummary`
- `V46.3` 已完成：compact helper 与高层 `resolve-build-trigger-matrix` 已对齐新的 trigger-matrix summary contract
- `V46.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V46` 收口状态

### 51.4 当前边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixSummary` 增加 `diagnosticSummary / sourceNoteSummary`
2. 保持现有 `rows[]` 与 row-level summary 兼容
3. 对齐 compact helper 与高层 trigger-matrix tool

显式不做：

1. 不改变 trigger-matrix rows
2. 不新增新的 trigger-matrix groups
3. 不改 source-view / source-entry collection 既有 summary contract

## 52. V47 skill-matrix summary aggregates

### 52.1 目标

`V46` 收口后，source-entry collection、standalone source views 与 trigger matrix 顶层都已具备聚合 `diagnosticSummary / sourceNoteSummary`。

但 skill matrix 顶层仍只暴露 `summary` / `effectSummary` / `rows` / `assumptions`。

`V47` 只解决一件事：

1. 为 skill-matrix 顶层增加聚合 `diagnosticSummary`
2. 为 skill-matrix 顶层增加聚合 `sourceNoteSummary`

### 52.2 范围

1. `V47.1` scope freeze
2. `V47.2` matrix-level aggregate contract
3. `V47.3` compact / high-level alignment
4. `V47.4` docs closeout

### 52.3 当前状态

- `V47.1` 已完成：冻结到 skill-matrix aggregate contract
- `V47.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V47.3` 已完成：compact helper 与高层 `resolve-build-skill-matrix` 已对齐新的 matrix aggregate contract
- `V47.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V47` 收口状态

### 52.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加 `diagnosticSummary / sourceNoteSummary`
2. 保持现有 `summary` / `effectSummary` 与 row-level contract 兼容
3. 对齐 compact helper 与高层 `resolve-build-skill-matrix`

显式不做：

1. 不改变现有 `summary` 字段
2. 不改变现有 `effectSummary` 语义
3. 不新增新的 matrix group 或 row metadata

## 53. V48 skill-matrix row summaries

### 53.1 目标

`V47` 收口后，skill matrix 顶层已经具备聚合 `diagnosticSummary / sourceNoteSummary`。

但 `StaticBuildSkillMatrixRow` 本身仍只暴露：

1. `diagnostics`
2. `sourceNotes`

`V48` 只解决一件事：

1. 为 skill-matrix row 增加 `diagnosticSummary`
2. 为 skill-matrix row 增加 `sourceNoteSummary`

### 53.2 范围

1. `V48.1` scope freeze
2. `V48.2` row-level summary contract
3. `V48.3` compact / high-level alignment
4. `V48.4` docs closeout

### 53.3 当前状态

- `V48.1` 已完成：冻结到 skill-matrix row-level summary contract
- `V48.2` 已完成：`StaticBuildSkillMatrixRow` 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V48.3` 已完成：compact helper 与高层 `resolve-build-skill-matrix` 已对齐新的 row-level summary contract
- `V48.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V48` 收口状态

### 53.4 当前边界

本阶段只做：

1. 为 `StaticBuildSkillMatrixRow` 增加 `diagnosticSummary / sourceNoteSummary`
2. 保持现有 `summary` / `effectSummary` / 顶层 aggregate contract 兼容
3. 对齐 compact helper 与高层 `resolve-build-skill-matrix`

显式不做：

1. 不新增 `requirementSummary`
2. 不改变 row-level `diagnostics / sourceNotes` 原始数组
3. 不新增新的 matrix row metadata

## 54. V49 skill-matrix row resolve summaries

### 54.1 目标

`V48` 收口后，skill matrix row 已具备稳定的：

1. `damageSummary`
2. `resolvedBuckets`
3. `diagnosticSummary`
4. `sourceNoteSummary`

但 `ResolveStaticBuildResult.summary` 仍只存在于 `row.build.summary`。

`V49` 只解决一件事：

1. 为 `skill matrix row` 增加稳定 `summary`

### 54.2 范围

1. `V49.1` scope freeze
2. `V49.2` row-level resolve summary contract
3. `V49.3` compact / high-level alignment
4. `V49.4` docs closeout

### 54.3 当前状态

- `V49.1` 已完成：冻结到 skill-matrix row resolve summary contract
- `V49.2` 已完成：`StaticBuildSkillMatrixRow` 已新增稳定 `summary`
- `V49.3` 已完成：compact helper 与高层 `resolve-build-skill-matrix` 已对齐新的 row-level resolve summary contract
- `V49.4` 已完成：README / 总规格 / roadmap / index / architecture 已同步到 `V49` 收口状态

### 54.4 当前边界

本阶段只做：

1. 为 `StaticBuildSkillMatrixRow` 增加 `summary`
2. 保持现有 `damageSummary / resolvedBuckets / diagnosticSummary / sourceNoteSummary` 兼容
3. 对齐 compact helper 与高层 `resolve-build-skill-matrix`

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary`
2. 不改变 `includeDetails` 语义
3. 不新增新的 matrix row metadata

## 55. V50 source-damage-view entry resolve summaries

### 55.1 目标

`V49` 收口后，skill matrix row 已具备稳定 `summary`。

但 `StaticBuildSourceDamageViewEntry` 仍需要在 `includeDetails` 下才可读取 `build.summary`。

`V50` 只解决一件事：

1. 为 source-damage-view entry 增加稳定 `summary`

### 55.2 范围

1. `V50.1` scope freeze
2. `V50.2` entry-level resolve summary contract
3. `V50.3` compact / high-level alignment
4. `V50.4` docs closeout

### 55.3 当前状态

- `V50.1` 已完成：冻结到 source-damage-view entry resolve summary contract
- `V50.2` 已完成：`StaticBuildSourceDamageViewEntry` 已新增稳定 `summary`
- `V50.3` 已完成：compact helper 与高层 source-damage-view tool 已透传 `entry.summary`
- `V50.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 55.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 增加 `summary`
2. 保持现有 `damage / requirementSummary / diagnosticSummary / sourceNoteSummary` 兼容
3. 对齐 compact helper 与高层 `resolve-build-source-damage-views`

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary`
2. 不修改 `includeDetails` 语义
3. 不新增新的 source-view metadata

## 56. V51 trigger-matrix row resolve summaries

### 56.1 目标

`V50` 收口后，source-damage-view entry 已具备稳定 `summary`。

但 `StaticBuildTriggerMatrixRow` 仍需要在 `includeDetails` 下才可读取 `build.summary`。

`V51` 只解决一件事：

1. 为 trigger-matrix row 增加稳定 `summary`

### 56.2 范围

1. `V51.1` scope freeze
2. `V51.2` row-level resolve summary contract
3. `V51.3` compact / high-level alignment
4. `V51.4` docs closeout

### 56.3 当前状态

- `V51.1` 已完成：冻结到 trigger-matrix row resolve summary contract
- `V51.2` 已完成：`StaticBuildTriggerMatrixRow` 已新增稳定 `summary`
- `V51.3` 已完成：compact helper 与高层 trigger-matrix tool 已透传 `row.summary`
- `V51.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 56.4 当前边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixRow` 增加 `summary`
2. 保持现有 `damage / requirementSummary / diagnosticSummary / sourceNoteSummary` 兼容
3. 对齐 compact helper 与高层 `resolve-build-trigger-matrix`

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary`
2. 不修改 `includeDetails` 语义
3. 不新增新的 trigger-row metadata

## 57. V52 source-utility-view entry requirement summaries

### 57.1 目标

`V51` 收口后，trigger-matrix row 已具备稳定 `summary`。

但 `StaticBuildSourceUtilityViewEntry` 当前仍主要依赖：

1. `triggerLabel`
2. `conditionLabel`
3. `cooldownSeconds`

表达触发条件 / 适用条件 / 冷却。

`V52` 只解决一件事：

1. 为 source-utility-view entry 增加稳定 `requirements / requirementSummary`

### 57.2 范围

1. `V52.1` scope freeze
2. `V52.2` utility requirement contract
3. `V52.3` compact / high-level alignment
4. `V52.4` docs closeout

### 57.3 当前状态

- `V52.1` 已完成：冻结到 source-utility-view entry requirement contract
- `V52.2` 已完成：`StaticBuildSourceUtilityViewEntry` 已新增稳定 `requirements / requirementSummary`
- `V52.3` 已完成：compact helper 与高层 `resolve-build-source-utility-views` 已透传该字段
- `V52.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 57.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 增加 `requirements`
2. 为 `StaticBuildSourceUtilityViewEntry` 增加 `requirementSummary`
3. 保持现有 `triggerLabel / conditionLabel / cooldownSeconds` 兼容
4. 对齐 compact helper 与高层 `resolve-build-source-utility-views`

显式不做：

1. 不改变 utility view 的 `value / unit / resolutionMode / targetScope`
2. 不新增新的 utility-only panel contract
3. 不修改 `diagnosticSummary / sourceNoteSummary`

## 58. V53 source-utility-view summary requirement aggregates

### 58.1 目标

`V52` 收口后，source-utility-view entry 已具备稳定 `requirements / requirementSummary`。

但 `ResolveStaticBuildSourceUtilityViewsResult.summary` 仍缺少聚合 requirement 摘要。

`V53` 只解决一件事：

1. 为 source-utility-view summary 增加稳定 `requirementSummary`

### 58.2 范围

1. `V53.1` scope freeze
2. `V53.2` summary-level requirement aggregate
3. `V53.3` high-level / prompt alignment
4. `V53.4` docs closeout

### 58.3 当前状态

- `V53.1` 已完成：冻结到 source-utility-view summary requirement aggregate
- `V53.2` 已完成：`StaticBuildSourceUtilityViewSummary` 已新增稳定 `requirementSummary`
- `V53.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.requirementSummary`
- `V53.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 58.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewSummary` 增加 `requirementSummary`
2. 聚合当前 utility entries 的 `requirements`
3. 保持现有 `groups / triggerCount / rateCount / diagnosticSummary / sourceNoteSummary` 兼容

显式不做：

1. 不改变 utility entry 的 `requirements / requirementSummary`
2. 不新增新的 utility-only panel contract
3. 不引入新的 utility entry metadata

## 59. V54 source-damage-view summary requirement aggregates

### 59.1 目标

`V53` 收口后，source-utility-view summary 已具备稳定 `requirementSummary`。

但 `ResolveStaticBuildSourceDamageViewsResult.summary` 仍缺少聚合 requirement 摘要。

`V54` 只解决一件事：

1. 为 source-damage-view summary 增加稳定 `requirementSummary`

### 59.2 范围

1. `V54.1` scope freeze
2. `V54.2` summary-level requirement aggregate
3. `V54.3` high-level / prompt alignment
4. `V54.4` docs closeout

### 59.3 当前状态

- `V54.1` 已完成：冻结到 source-damage-view summary requirement aggregate
- `V54.2` 已完成：`StaticBuildSourceDamageViewSummary` 已新增稳定 `requirementSummary`
- `V54.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.requirementSummary`
- `V54.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 59.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewSummary` 增加 `requirementSummary`
2. 聚合当前 source-damage-view entries 的 `requirements`
3. 保持现有 `groups / standaloneCount / deltaCount / diagnosticSummary / sourceNoteSummary` 兼容

显式不做：

1. 不改变 source-damage-view entry 的 `requirements / requirementSummary`
2. 不新增新的 source-view metadata
3. 不改变 `damage / summary / diagnosticSummary / sourceNoteSummary`

## 60. V57 source-entry group summaries

### 60.1 目标

`V56` 收口后，source-entry collection 顶层 summary 已能分别给出 mixed collection 中 source-damage-view / source-utility-view 的 requirement aggregate。

但按组拆分 section 时，group 仍缺少局部 diagnostics / source notes 摘要。

`V57` 只解决一件事：

1. 为 `source-entry collection groups` 增加局部 `diagnosticSummary / sourceNoteSummary`

### 60.2 范围

1. `V57.1` scope freeze
2. `V57.2` group-level summaries
3. `V57.3` high-level / prompt alignment
4. `V57.4` docs closeout

### 60.3 当前状态

- `V57.1` 已完成：冻结到 source-entry group summaries
- `V57.2` 已完成：`StaticBuildSourceEntryGroupSummary` 已新增局部 `diagnosticSummary / sourceNoteSummary`
- `V57.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.groups[*].diagnosticSummary / sourceNoteSummary`
- `V57.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 60.4 当前边界

本阶段只做：

1. 为 `source-entry group` 增加局部 `diagnosticSummary / sourceNoteSummary`
2. 保持顶层 collection summary 兼容
3. 不改变 grouping key / ordering

显式不做：

1. 不为 group 增加局部 requirement aggregate
2. 不新增新的 source-entry metadata
3. 不改变 `entries` shape

## 61. V58 source-entry group requirement aggregates

### 61.1 目标

`V57` 收口后，source-entry collection group 已能稳定给出局部 `diagnosticSummary / sourceNoteSummary`。

但当上层按组拆分“额外结算条目 / 回能条目”两个 section 时，组内 requirement 分布仍只能回退到顶层 aggregate 或重新遍历 `entries[*].requirements`。

`V58` 只解决一件事：

1. 为 `source-entry collection groups` 增加局部 requirement aggregates

### 61.2 范围

1. `V58.1` scope freeze
2. `V58.2` group-level requirement aggregates
3. `V58.3` high-level / prompt alignment
4. `V58.4` docs closeout

### 61.3 当前状态

- `V58.1` 已完成：冻结到 source-entry group requirement aggregates
- `V58.2` 已完成：`StaticBuildSourceEntryGroupSummary` 已新增局部 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V58.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.groups[*].sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V58.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 61.4 当前边界

本阶段只做：

1. 为 `source-entry group` 增加局部 requirement aggregates
2. 保持现有 group-level `diagnosticSummary / sourceNoteSummary` 兼容
3. 保持 grouping key / ordering 兼容

显式不做：

1. 不改变顶层 collection requirement aggregate
2. 不新增新的 source-entry metadata
3. 不改变 `entries` shape

## 62. V59 source-utility-view group summaries

### 62.1 目标

`V58` 收口后，source-entry group 已能稳定给出局部 requirement / diagnostics / source notes 摘要。

但独立 `source-utility-view` 结果的 `groups[*]` 仍只有 count 级别信息。上层如果按“按次触发 / 按速率”拆 section，仍要重新遍历 entries 统计 requirement / diagnostics / source notes。

`V59` 只解决一件事：

1. 为 `source-utility-view groups` 增加局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`

### 62.2 范围

1. `V59.1` scope freeze
2. `V59.2` group-level summaries
3. `V59.3` high-level / prompt alignment
4. `V59.4` docs closeout

### 62.3 当前状态

- `V59.1` 已完成：冻结到 source-utility-view group summaries
- `V59.2` 已完成：`StaticBuildSourceUtilityViewGroupSummary` 已新增局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`
- `V59.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*]`
- `V59.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 62.4 当前边界

本阶段只做：

1. 为 `source-utility-view group` 增加局部 summaries
2. 保持顶层 utility-view summary 兼容
3. 保持 grouping key / ordering 兼容

显式不做：

1. 不改变 `entry.requirements / requirementSummary`
2. 不新增新的 utility metadata
3. 不改变 `value / unit / resolutionMode / targetScope`

## 63. V60 source-damage-view group summaries

### 63.1 目标

`V59` 收口后，source-utility-view groups 已能稳定给出局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`。

但独立 `source-damage-view` 结果的 `groups[*]` 仍只有 count 级别信息。上层如果按“独立结算 / 增量结算”拆 section，仍要重新遍历 entries 统计 requirement / diagnostics / source notes。

`V60` 只解决一件事：

1. 为 `source-damage-view groups` 增加局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`

### 63.2 范围

1. `V60.1` scope freeze
2. `V60.2` group-level summaries
3. `V60.3` high-level / prompt alignment
4. `V60.4` docs closeout

### 63.3 当前状态

- `V60.1` 已完成：冻结到 source-damage-view group summaries
- `V60.2` 已完成：`StaticBuildSourceDamageViewGroupSummary` 已新增局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`
- `V60.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*]`
- `V60.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 63.4 当前边界

本阶段只做：

1. 为 `source-damage-view group` 增加局部 summaries
2. 保持顶层 source-damage-view summary 兼容
3. 保持 grouping key / ordering 兼容

显式不做：

1. 不改变 `entry.requirements / requirementSummary`
2. 不新增新的 source-view metadata
3. 不改变 `damage / summary / assumptions`

## 64. V61 trigger-matrix group summaries

### 64.1 目标

`V60` 收口后，`source-damage-view groups` 已能稳定给出局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`。

但 `trigger-entry matrix` 的 `groups[*]` 仍只有 count 级别信息。上层如果按 `main-formula / source-view` 拆 section，仍要重新遍历 rows 统计 requirement / diagnostics / source notes。

`V61` 只解决一件事：

1. 为 `trigger-matrix groups` 增加局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`

### 64.2 范围

1. `V61.1` scope freeze
2. `V61.2` group-level summaries
3. `V61.3` high-level / prompt alignment
4. `V61.4` docs closeout

### 64.3 当前状态

- `V61.1` 已完成：冻结到 trigger-matrix group summaries
- `V61.2` 已完成：`StaticBuildTriggerMatrixGroupSummary` 已新增局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`
- `V61.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*]`
- `V61.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 64.4 当前边界

本阶段只做：

1. 为 `trigger-matrix group` 增加局部 summaries
2. 保持顶层 trigger-matrix summary 兼容
3. 保持 grouping key / ordering 兼容

显式不做：

1. 不改变 `row.requirements / requirementSummary`
2. 不新增新的 trigger-row metadata
3. 不改变 `damage / summary / assumptions`

## 65. V62 skill-matrix group summaries

### 65.1 目标

`V61` 收口后，`trigger-matrix groups` 已能稳定给出局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`。

但 `skill matrix` 顶层仍只有 `rowCount / commonBuckets / commonFormulaMultipliers / effectSummary / diagnosticSummary / sourceNoteSummary`。上层如果按 `row.group` 拆 section，仍要重新遍历 rows 统计组内 diagnostics / source notes。

`V62` 只解决一件事：

1. 为 `skill-matrix summary` 增加局部 `groups[*].diagnosticSummary / sourceNoteSummary`

### 65.2 范围

1. `V62.1` scope freeze
2. `V62.2` group-level summaries
3. `V62.3` high-level / prompt alignment
4. `V62.4` docs closeout

### 65.3 当前状态

- `V62.1` 已完成：冻结到 skill-matrix group summaries
- `V62.2` 已完成：`StaticBuildSkillMatrixSummary` 已新增局部 `groups[*]`
- `V62.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*]`
- `V62.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 65.4 当前边界

本阶段只做：

1. 为 `skill-matrix summary` 增加局部 group summaries
2. 保持现有 `effectSummary / commonFormulaMultipliers` 兼容
3. 保持 `row.group` 和现有 row-level contract 兼容

显式不做：

1. 不改变 `row.summary / row.resolvedBuckets`
2. 不新增 group-level effect summaries
3. 不改变 `effectSummary` 的聚合逻辑

## 66. V63 skill-matrix group effect summaries

### 66.1 目标

`V62` 收口后，`skill-matrix summary` 已能稳定给出局部 `groups[*].diagnosticSummary / sourceNoteSummary`。

但按 `row.group` 拆 section 时，`effectSummary` 仍只有整张矩阵版本。上层如果想在“普通攻击 / 特殊技 / 连携技”分组下分别解释哪些效果生效，仍要重新遍历 rows 再自行聚合。

`V63` 只解决一件事：

1. 为 `skill-matrix summary groups` 增加局部 `effectSummary`

### 66.2 范围

1. `V63.1` scope freeze
2. `V63.2` group-level effect summaries
3. `V63.3` high-level / prompt alignment
4. `V63.4` docs closeout

### 66.3 当前状态

- `V63.1` 已完成：冻结到 skill-matrix group effect summaries
- `V63.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 `effectSummary`
- `V63.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].effectSummary`
- `V63.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 66.4 当前边界

本阶段只做：

1. 为 `skill-matrix summary groups` 增加局部 effect summaries
2. 保持现有全矩阵 `effectSummary` 兼容
3. 保持现有 row-level `unsupportedEffects` / `summary` 契约不变

显式不做：

1. 不改变 `effectSummary` 的聚合维度
2. 不新增 group-level formula summaries
3. 不改变 `row.group` 的分组逻辑

## 67. V64 skill-matrix group formula summaries

### 67.1 目标

`V63` 收口后，`skill-matrix summary groups` 已能稳定给出局部 `effectSummary / diagnosticSummary / sourceNoteSummary`。

但按 `row.group` 拆 section 时，各组仍没有自己的 `commonBuckets / commonFormulaMultipliers`。上层如果要在“普通攻击 / 特殊技 / 连携技”分组下分别展示局部乘区摘要，仍要重新遍历 rows 再自行聚合。

`V64` 只解决一件事：

1. 为 `skill-matrix summary groups` 增加局部 `commonBuckets / variableBuckets / commonFormulaMultipliers / variableFormulaMultipliers`

### 67.2 范围

1. `V64.1` scope freeze
2. `V64.2` group-level formula summaries
3. `V64.3` high-level / prompt alignment
4. `V64.4` docs closeout

### 67.3 当前状态

- `V64.1` 已完成：冻结到 skill-matrix group formula summaries
- `V64.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 multiplier summaries
- `V64.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].commonFormulaMultipliers`
- `V64.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 67.4 当前边界

本阶段只做：

1. 为 `skill-matrix summary groups` 增加局部 bucket / formula summaries
2. 保持全矩阵 `summary.commonFormulaMultipliers` 兼容
3. 保持现有 group-level effect / diagnostic / source-note summaries 兼容

显式不做：

1. 不改变全矩阵 `commonBuckets / variableBuckets`
2. 不新增 group-level resolve summary
3. 不改变 `row.group` 的分组逻辑

## 68. V65 skill-matrix group caveat summaries

### 68.1 目标

`V64` 收口后，`skill-matrix summary groups` 已能稳定给出局部 `commonBuckets / commonFormulaMultipliers / effectSummary / diagnosticSummary / sourceNoteSummary`。

但按 `row.group` 拆 section 时，组级 caveat 仍只有 row 级版本。上层如果想在“普通攻击 / 特殊技 / 连携技”分组下分别解释组内 assumptions / unsupportedEffects，仍要重新遍历 rows 再自行去重聚合。

`V65` 只解决一件事：

1. 为 `skill-matrix summary groups` 增加局部 `assumptions / unsupportedEffects`

### 68.2 范围

1. `V65.1` scope freeze
2. `V65.2` group-level caveat summaries
3. `V65.3` high-level / prompt alignment
4. `V65.4` docs closeout

### 68.3 当前状态

- `V65.1` 已完成：冻结到 skill-matrix group caveat summaries
- `V65.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 `assumptions / unsupportedEffects`
- `V65.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].assumptions / unsupportedEffects`
- `V65.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 68.4 当前边界

本阶段只做：

1. 为 `skill-matrix summary groups` 增加局部 caveat summaries
2. 保持全矩阵 `assumptions / unsupportedEffects` 兼容
3. 保持现有 group-level formula / effect / diagnostic / source-note summaries 兼容

显式不做：

1. 不改变 row-level `assumptions / unsupportedEffects`
2. 不新增新的 group 分组维度
3. 不改变 `row.group` 的分组逻辑

## 69. V66 skill-matrix top-level unsupported effects

### 69.1 目标

`V65` 收口后，`skill-matrix summary groups` 已能稳定给出局部 `assumptions / unsupportedEffects`。

但整张 skill matrix 顶层仍只有 `assumptions`，没有对称的 `unsupportedEffects`。上层如果想先判断整张矩阵是否存在 unsupported coverage gap，仍要重新遍历 rows 再自行去重聚合。

`V66` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加顶层 `unsupportedEffects`

### 69.2 范围

1. `V66.1` scope freeze
2. `V66.2` top-level unsupported-effects aggregate
3. `V66.3` high-level / prompt alignment
4. `V66.4` docs closeout

### 69.3 当前状态

- `V66.1` 已完成：冻结到 top-level skill-matrix unsupportedEffects
- `V66.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 与 compact result 已新增顶层 `unsupportedEffects`
- `V66.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.unsupportedEffects`
- `V66.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 69.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加顶层 `unsupportedEffects`
2. 由当前 rows 去重聚合 unsupported coverage gap
3. 保持现有 group-level / row-level `unsupportedEffects` 兼容

显式不做：

1. 不改变 `summary` 结构
2. 不改变 `assumptions` 的现有语义
3. 不改变 `row.group` 或 `groups[*]` 的聚合逻辑

## 70. V67 skill-matrix top-level caveat summary

### 70.1 目标

`V66` 收口后，整张 skill matrix 顶层已经有 `unsupportedEffects`，组级也已有 `assumptions / unsupportedEffects`。

但顶层仍只有裸数组，没有稳定的 caveat 计数语义。上层如果想先判断“当前矩阵是否有 assumptions / unsupportedEffects、各有多少条”，仍要自己统计数组长度。

`V67` 只解决一件事：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加顶层 `caveatSummary`

### 70.2 范围

1. `V67.1` scope freeze
2. `V67.2` top-level caveat summary
3. `V67.3` high-level / prompt alignment
4. `V67.4` docs closeout

### 70.3 当前状态

- `V67.1` 已完成：冻结到 top-level skill-matrix caveat summary
- `V67.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 与 compact result 已新增顶层 `caveatSummary`
- `V67.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.caveatSummary`
- `V67.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 70.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 增加顶层 `caveatSummary`
2. 从现有顶层 `assumptions / unsupportedEffects` 衍生计数与布尔位
3. 保持现有 `summary / diagnosticSummary / sourceNoteSummary / rows` 兼容

显式不做：

1. 不新增 group-level `caveatSummary`
2. 不改变 `assumptions / unsupportedEffects` 的现有数组语义
3. 不改变 `summary` 结构

## 71. V68 skill-matrix group caveat summary

### 71.1 目标

`V67` 收口后，整张 skill matrix 顶层已经有稳定 `caveatSummary`。

但按 `row.group` 拆 section 时，组级仍只有 `assumptions / unsupportedEffects` 裸数组。上层如果想先判断某组是否有 caveat、各有多少条，仍要自己统计数组长度。

`V68` 只解决一件事：

1. 为 `StaticBuildSkillMatrixGroupSummary` 增加局部 `caveatSummary`

### 71.2 范围

1. `V68.1` scope freeze
2. `V68.2` group-level caveat summary
3. `V68.3` high-level / prompt alignment
4. `V68.4` docs closeout

### 71.3 当前状态

- `V68.1` 已完成：冻结到 group-level skill-matrix caveat summary
- `V68.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 `caveatSummary`
- `V68.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].caveatSummary`
- `V68.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 71.4 当前边界

本阶段只做：

1. 为 `StaticBuildSkillMatrixGroupSummary` 增加局部 `caveatSummary`
2. 从现有 group-level `assumptions / unsupportedEffects` 衍生计数与布尔位
3. 保持现有 group-level arrays / formula / effect / diagnostic / source-note summaries 兼容

显式不做：

1. 不改变 group-level `assumptions / unsupportedEffects` 的现有数组语义
2. 不新增新的 group 分组维度
3. 不改变 `summary` 结构

## 72. V69 skill-matrix row caveat summary

### 72.1 目标

`V68` 收口后，整张 skill matrix 顶层和按 `row.group` 聚合后的 section 都已经有稳定 `caveatSummary`。

但单行 `row` 仍只有 `assumptions / unsupportedEffects` 裸数组。上层如果只想判断某一行是否带 caveat、各有多少条，仍要自己统计数组长度。

`V69` 只解决一件事：

1. 为 `StaticBuildSkillMatrixRow` 增加局部 `caveatSummary`

### 72.2 范围

1. `V69.1` scope freeze
2. `V69.2` row-level caveat summary
3. `V69.3` high-level / prompt alignment
4. `V69.4` docs closeout

### 72.3 当前状态

- `V69.1` 已完成：冻结到 row-level skill-matrix caveat summary
- `V69.2` 已完成：`StaticBuildSkillMatrixRow` 与 compact row 已新增局部 `caveatSummary`
- `V69.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `row.caveatSummary`
- `V69.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 72.4 当前边界

本阶段只做：

1. 为 `StaticBuildSkillMatrixRow` 增加局部 `caveatSummary`
2. 从现有 row-level `assumptions / unsupportedEffects` 衍生计数与布尔位
3. 保持现有 row-level arrays / summary / diagnostics / source-notes 兼容

显式不做：

1. 不改变 row-level `assumptions / unsupportedEffects` 的现有数组语义
2. 不新增新的 row 分组维度
3. 不改变 `summary`、`diagnosticSummary` 或 `sourceNoteSummary` 结构

## 73. V70 trigger-matrix top-level assumption summary

### 73.1 目标

`trigger-entry matrix` 当前顶层已经有稳定的 `summary`，也保留了原始 `assumptions` 数组。

但如果上层只想先判断“当前整张 trigger matrix 是否带 assumptions、共有多少条”，仍要自己统计数组长度。

`V70` 只解决一件事：

1. 为 `ResolveStaticBuildTriggerMatrixResult` 与 compact result 增加顶层 `assumptionSummary`

### 73.2 范围

1. `V70.1` scope freeze
2. `V70.2` top-level assumption summary
3. `V70.3` high-level / prompt alignment
4. `V70.4` docs closeout

### 73.3 当前状态

- `V70.1` 已完成：冻结到 top-level trigger-matrix assumption summary
- `V70.2` 已完成：`ResolveStaticBuildTriggerMatrixResult` 与 compact result 已新增 `assumptionSummary`
- `V70.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.assumptionSummary`
- `V70.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 73.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildTriggerMatrixResult` 与 compact result 增加顶层 `assumptionSummary`
2. 从现有顶层 `assumptions` 衍生计数与布尔位
3. 保持现有 `summary / rows / assumptions` 兼容

显式不做：

1. 不改变顶层 `assumptions` 的现有数组语义
2. 不新增 row-level `assumptionSummary`
3. 不改变 `summary` 结构

## 74. V71 trigger-matrix row assumption summary

### 74.1 目标

`V70` 收口后，整张 `trigger-entry matrix` 顶层已经有稳定的 `assumptionSummary`。

但单行 `row` 仍只有 `assumptions` 裸数组。上层如果只想判断某一行是否带 assumptions、共有多少条，仍要自己统计数组长度。

`V71` 只解决一件事：

1. 为 `StaticBuildTriggerMatrixRow` 与 compact row 增加局部 `assumptionSummary`

### 74.2 范围

1. `V71.1` scope freeze
2. `V71.2` row-level assumption summary
3. `V71.3` high-level / prompt alignment
4. `V71.4` docs closeout

### 74.3 当前状态

- `V71.1` 已完成：冻结到 row-level trigger-matrix assumption summary
- `V71.2` 已完成：`StaticBuildTriggerMatrixRow` 与 compact row 已新增局部 `assumptionSummary`
- `V71.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `row.assumptionSummary`
- `V71.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 74.4 当前边界

本阶段只做：

1. 为 `StaticBuildTriggerMatrixRow` 与 compact row 增加局部 `assumptionSummary`
2. 从现有 row-level `assumptions` 衍生计数与布尔位
3. 保持现有 `requirements / diagnostics / sourceNotes / assumptions` 兼容

显式不做：

1. 不改变 row-level `assumptions` 的现有数组语义
2. 不新增新的 row 分组维度
3. 不改变 `requirementSummary`、`diagnosticSummary` 或 `sourceNoteSummary` 结构

## 75. V72 source-damage-view top-level assumption summary

### 75.1 目标

`source-damage views` 当前顶层已经有稳定的 `summary`，也保留了原始 `assumptions` 数组。

但如果上层只想先判断“当前整组 source-damage views 是否带 assumptions、共有多少条”，仍要自己统计数组长度。

`V72` 只解决一件事：

1. 为 `ResolveStaticBuildSourceDamageViewsResult` 与 compact result 增加顶层 `assumptionSummary`

### 75.2 范围

1. `V72.1` scope freeze
2. `V72.2` top-level assumption summary
3. `V72.3` high-level / prompt alignment
4. `V72.4` docs closeout

### 75.3 当前状态

- `V72.1` 已完成：冻结到 top-level source-damage-view assumption summary
- `V72.2` 已完成：`ResolveStaticBuildSourceDamageViewsResult` 与 compact result 已新增 `assumptionSummary`
- `V72.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.assumptionSummary`
- `V72.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 75.4 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSourceDamageViewsResult` 与 compact result 增加顶层 `assumptionSummary`
2. 从现有顶层 `assumptions` 衍生计数与布尔位
3. 保持现有 `summary / entries / assumptions` 兼容

显式不做：

1. 不改变顶层 `assumptions` 的现有数组语义
2. 不新增 entry-level `assumptionSummary`
3. 不改变 `summary` 结构

## 76. V73 source-damage-view entry assumption summary

`V72` 收口后，source-damage-view 顶层已经有稳定的 `assumptionSummary`。

但当上层只想先判断“某一条 source-damage-view entry 是否带 assumptions、共有多少条”时，仍要回退到 `entry.assumptions.length` 手工统计。

`V73` 只解决一件事：

- 为 `StaticBuildSourceDamageViewEntry` 与 compact entry 增加局部 `assumptionSummary`

### 76.1 当前状态

- `V73.1` 已完成：冻结到 source-damage-view entry assumption summary
- `V73.2` 已完成：`StaticBuildSourceDamageViewEntry` 与 compact entry 已新增局部 `assumptionSummary`
- `V73.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `entry.assumptionSummary`
- `V73.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 76.2 目标

1. 为 source-damage-view entry 增加稳定 `assumptionSummary`
2. 直接从当前 entry 的 `assumptions` 派生计数与布尔位
3. 对齐 compact helper 与高层 `resolve-build-source-damage-views`

### 76.3 Out of Scope

1. 不改变 entry 级 `assumptions` 的原始数组语义
2. 不新增 source-utility-view entry 的 `assumptionSummary`
3. 不改变顶层 `summary` 或顶层 `assumptionSummary`

## 77. V74 source-utility-view top-level assumption summary

`V73` 收口后，source-damage-view 已经完成 entry-level `assumptionSummary`，但 source-utility-view 顶层仍只有原始 `assumptions` 数组。

当上层只想先判断“当前整组 utility views 是否带 assumptions、共有多少条”时，仍要自己统计数组长度。

`V74` 只解决一件事：

- 为 `ResolveStaticBuildSourceUtilityViewsResult` 与 compact result 增加顶层 `assumptionSummary`

### 77.1 当前状态

- `V74.1` 已完成：冻结到 top-level source-utility-view assumption summary
- `V74.2` 已完成：`ResolveStaticBuildSourceUtilityViewsResult` 与 compact result 已新增 `assumptionSummary`
- `V74.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.assumptionSummary`
- `V74.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 77.2 目标

1. 为 source-utility-view 顶层结果增加稳定 `assumptionSummary`
2. 直接从现有顶层 `assumptions` 派生计数与布尔位
3. 对齐 compact helper 与高层 `resolve-build-source-utility-views`

### 77.3 Out of Scope

1. 不改变顶层 `assumptions` 的原始数组语义
2. 不新增 source-utility-view entry 的 `assumptionSummary`
3. 不改变顶层 `summary`

## 78. V75 source-utility-view entry assumption summary

`V74` 收口后，source-utility-view 顶层已经有稳定的 `assumptionSummary`。

但当上层只想先判断“某一条 utility entry 是否带 assumptions、共有多少条”时，仍要回退到 `entry.assumptions.length` 手工统计。

`V75` 只解决一件事：

- 为 `StaticBuildSourceUtilityViewEntry` 与 compact entry 增加局部 `assumptionSummary`

### 78.1 当前状态

- `V75.1` 已完成：冻结到 source-utility-view entry assumption summary
- `V75.2` 已完成：`StaticBuildSourceUtilityViewEntry` 与 compact entry 已新增局部 `assumptionSummary`
- `V75.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `entry.assumptionSummary`
- `V75.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 78.2 目标

1. 为 source-utility-view entry 增加稳定 `assumptionSummary`
2. 直接从当前 entry 的 `assumptions` 派生计数与布尔位
3. 对齐 compact helper 与高层 `resolve-build-source-utility-views`

### 78.3 Out of Scope

1. 不改变 entry 级 `assumptions` 的原始数组语义
2. 不改变顶层 `summary` 或顶层 `assumptionSummary`
3. 不为其他 source-entry 类型追加新 key

## 79. V76 source-entry collection assumption summary

`V75` 收口后，standalone source-damage-view、source-utility-view 与 trigger-matrix 都已经具备顶层 `assumptionSummary`。

但 unified `source-entry collection` 仍只有原始 `assumptions` 数组。上层如果只想先判断“当前 mixed collection 是否带 assumptions、共有多少条”，仍要回退到 `collection.assumptions.length` 手工统计。

`V76` 只解决一件事：

- 为 `ResolveStaticBuildSourceEntriesResult` 与 compact collection 增加顶层 `assumptionSummary`

### 79.1 当前状态

- `V76.1` 已完成：冻结到 source-entry collection assumption summary
- `V76.2` 已完成：`ResolveStaticBuildSourceEntriesResult` 与 compact collection 已新增顶层 `assumptionSummary`
- `V76.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.assumptionSummary`
- `V76.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 79.2 目标

1. 为 unified source-entry collection 增加稳定 `assumptionSummary`
2. 直接从当前 collection 的 `assumptions` 派生计数与布尔位
3. 对齐 compact helper 与高层 `resolve-build-source-entries`

### 79.3 Out of Scope

1. 不改变 collection 级 `assumptions` 的原始数组语义
2. 不改变 `summary` 或 `entries[*]` contract
3. 不提前引入 group 级 `assumptionSummary`

## 80. V77 source-entry group assumption summary

`V76` 收口后，mixed `source-entry collection` 顶层已经有稳定的 `assumptionSummary`。

但如果上层是按组拆“额外结算条目 / 回能条目”两个 section，仍要回退到组内 entries 的 `assumptions` 手工统计，才能判断某一组是否带 assumptions。

`V77` 只解决一件事：

- 为 `StaticBuildSourceEntryGroupSummary` 增加局部 `assumptionSummary`

### 80.1 当前状态

- `V77.1` 已完成：冻结到 source-entry group assumption summary
- `V77.2` 已完成：`StaticBuildSourceEntryGroupSummary` 已新增局部 `assumptionSummary`
- `V77.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.groups[*].assumptionSummary`
- `V77.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 80.2 目标

1. 为 source-entry collection groups 增加稳定 `assumptionSummary`
2. 直接从当前 group entries 的 `assumptions` 派生计数与布尔位
3. 对齐 mixed collection 的组级解释 contract

### 80.3 Out of Scope

1. 不改变 group 内 entries 的原始 `assumptions` 数组语义
2. 不改变顶层 `collection.assumptionSummary`
3. 不为 source-damage-view / source-utility-view standalone groups 引入额外同名字段

## 81. V78 source-damage-view group assumption summary

`V77` 收口后，mixed `source-entry collection groups` 已经具备局部 `assumptionSummary`。

但 standalone `source-damage-view` 的 `summary.groups[*]` 仍没有同类摘要。上层按“独立结算 / 主结算差值”拆 section 时，仍要回退到组内 entries 的 `assumptions` 手工统计。

`V78` 只解决一件事：

- 为 `StaticBuildSourceDamageViewGroupSummary` 增加局部 `assumptionSummary`

### 81.1 当前状态

- `V78.1` 已完成：冻结到 source-damage-view group assumption summary
- `V78.2` 已完成：`StaticBuildSourceDamageViewGroupSummary` 已新增局部 `assumptionSummary`
- `V78.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*].assumptionSummary`
- `V78.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 81.2 目标

1. 为 source-damage-view groups 增加稳定 `assumptionSummary`
2. 直接从当前 group entries 的 `assumptions` 派生计数与布尔位
3. 对齐 standalone / delta 组级解释 contract

### 81.3 Out of Scope

1. 不改变 entry 级 `assumptions` 的原始数组语义
2. 不改变顶层 `views.assumptionSummary`
3. 不提前引入 source-utility-view group 的同名字段

## 82. V79 source-utility-view group assumption summary

`V78` 收口后，standalone `source-damage-view groups` 已经具备局部 `assumptionSummary`。

但 standalone `source-utility-view` 的 `summary.groups[*]` 仍没有同类摘要。上层按“按次触发 / 按速率”拆 section 时，仍要回退到组内 entries 的 `assumptions` 手工统计。

`V79` 只解决一件事：

- 为 `StaticBuildSourceUtilityViewGroupSummary` 增加局部 `assumptionSummary`

### 82.1 当前状态

- `V79.1` 已完成：冻结到 source-utility-view group assumption summary
- `V79.2` 已完成：`StaticBuildSourceUtilityViewGroupSummary` 已新增局部 `assumptionSummary`
- `V79.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*].assumptionSummary`
- `V79.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 82.2 目标

1. 为 source-utility-view groups 增加稳定 `assumptionSummary`
2. 直接从当前 group entries 的 `assumptions` 派生计数与布尔位
3. 对齐 trigger / rate 组级解释 contract

### 82.3 Out of Scope

1. 不改变 entry 级 `assumptions` 的原始数组语义
2. 不改变顶层 `views.assumptionSummary`
3. 不提前引入 trigger-matrix group 的同名字段

## 83. V80 trigger-matrix group assumption summary

`V79` 收口后，standalone `source-utility-view groups` 已经具备局部 `assumptionSummary`。

但 `trigger-entry matrix` 的 `summary.groups[*]` 仍缺少对应字段；上层按 `main-formula / source-view` 拆 section 时，还需要自己遍历组内 rows 统计 assumptions。

`V80` 只解决一件事：

- 为 `StaticBuildTriggerMatrixGroupSummary` 增加局部 `assumptionSummary`

### 83.1 当前状态

- `V80.1` 已完成：冻结到 trigger-matrix group assumption summary
- `V80.2` 已完成：`StaticBuildTriggerMatrixGroupSummary` 已新增局部 `assumptionSummary`
- `V80.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].assumptionSummary`
- `V80.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 83.2 目标

1. 为 trigger-matrix groups 增加稳定 `assumptionSummary`
2. 直接从当前 group rows 的 `assumptions` 派生计数与布尔位
3. 对齐 `main-formula / source-view` 组级解释 contract

### 83.3 Out of Scope

1. 不改变 row 级 `assumptions` 的原始数组语义
2. 不改变顶层 `matrix.assumptionSummary`
3. 不提前引入 skill-matrix group 的同名字段

## 84. V81 trigger-matrix summary assumption summary

`V80` 收口后，`trigger-entry matrix` 已具备：

- 顶层 `matrix.assumptionSummary`
- 组级 `matrix.summary.groups[*].assumptionSummary`
- 行级 `row.assumptionSummary`

但 `matrix.summary` 仍缺少同名聚合字段。上层若只消费 `summary`，仍要额外跳回 result 顶层拿 assumptions 摘要。

`V81` 只解决一件事：

- 为 `StaticBuildTriggerMatrixSummary` 增加稳定 `assumptionSummary`

### 84.1 当前状态

- `V81.1` 已完成：冻结到 trigger-matrix summary assumption summary
- `V81.2` 已完成：`StaticBuildTriggerMatrixSummary` 已新增稳定 `assumptionSummary`
- `V81.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.assumptionSummary`
- `V81.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 84.2 目标

1. 为 `matrix.summary` 增加稳定 assumption aggregate
2. 保持与既有顶层 `matrix.assumptionSummary` 一致
3. 让 trigger-matrix 顶层 `summary` 在四类聚合上对齐 requirement / diagnostics / source notes

### 84.3 Out of Scope

1. 不改变既有顶层 `matrix.assumptionSummary`
2. 不改变 row / group 级 assumption contract
3. 不提前扩到 source-view / source-entry / skill-matrix summary 的同名字段

## 85. V82 source-damage-view summary assumption summary

`V81` 收口后，trigger-entry matrix 已具备：

- 顶层 `matrix.assumptionSummary`
- 顶层 `matrix.summary.assumptionSummary`
- 组级 `matrix.summary.groups[*].assumptionSummary`
- 行级 `row.assumptionSummary`

但 standalone `source-damage-view` 仍只有：

- 顶层 `views.assumptionSummary`
- 组级 `views.summary.groups[*].assumptionSummary`
- entry 级 `entry.assumptionSummary`

`views.summary` 本身还缺少同名聚合字段。

`V82` 只解决一件事：

- 为 `StaticBuildSourceDamageViewSummary` 增加稳定 `assumptionSummary`

### 85.1 当前状态

- `V82.1` 已完成：冻结到 source-damage-view summary assumption summary
- `V82.2` 已完成：`StaticBuildSourceDamageViewSummary` 已新增稳定 `assumptionSummary`
- `V82.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.assumptionSummary`
- `V82.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 85.2 目标

1. 为 `views.summary` 增加稳定 assumption aggregate
2. 保持与既有顶层 `views.assumptionSummary` 一致
3. 让 source-damage-view 顶层 `summary` 在四类聚合上对齐 requirement / diagnostics / source notes

### 85.3 Out of Scope

1. 不改变既有顶层 `views.assumptionSummary`
2. 不改变 entry / group 级 assumption contract
3. 不提前扩到 source-utility-view / source-entry summary 的同名字段

## 86. V83 source-utility-view summary assumption summary

`V82` 收口后，standalone `source-utility-view` 仍只有：

- 顶层 `views.assumptionSummary`
- 组级 `views.summary.groups[*].assumptionSummary`
- entry 级 `entry.assumptionSummary`

`views.summary` 本身还缺少同名聚合字段。

`V83` 只解决一件事：

- 为 `StaticBuildSourceUtilityViewSummary` 增加稳定 `assumptionSummary`

### 86.1 当前状态

- `V83.1` 已完成：冻结到 source-utility-view summary assumption summary
- `V83.2` 已完成：`StaticBuildSourceUtilityViewSummary` 已新增稳定 `assumptionSummary`
- `V83.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.assumptionSummary`
- `V83.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 86.2 目标

1. 为 `views.summary` 增加稳定 assumption aggregate
2. 保持与既有顶层 `views.assumptionSummary` 一致
3. 让 source-utility-view 顶层 `summary` 在四类聚合上对齐 requirement / diagnostics / source notes

### 86.3 Out of Scope

1. 不改变既有顶层 `views.assumptionSummary`
2. 不改变 entry / group 级 assumption contract
3. 不提前扩到 unified source-entry summary 的同名字段

## 87. V84 source-entry collection summary assumption summary

`V83` 收口后，unified `source-entry collection` 仍只有：

- 顶层 `collection.assumptionSummary`
- 组级 `collection.summary.groups[*].assumptionSummary`
- entry 级 `entry.assumptionSummary`

`collection.summary` 本身还缺少同名聚合字段。

`V84` 只解决一件事：

- 为 `StaticBuildSourceEntryCollectionSummary` 增加稳定 `assumptionSummary`

### 87.1 当前状态

- `V84.1` 已完成：冻结到 source-entry collection summary assumption summary
- `V84.2` 已完成：`StaticBuildSourceEntryCollectionSummary` 已新增稳定 `assumptionSummary`
- `V84.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.assumptionSummary`
- `V84.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 87.2 目标

1. 为 `collection.summary` 增加稳定 assumption aggregate
2. 保持与既有顶层 `collection.assumptionSummary` 一致
3. 让 source-entry collection 顶层 `summary` 在四类聚合上对齐 requirement / diagnostics / source notes

### 87.3 Out of Scope

1. 不改变既有顶层 `collection.assumptionSummary`
2. 不改变 entry / group 级 assumption contract
3. 不提前扩到其他未对齐的 summary 字段

## 88. V85 skill-matrix summary caveat summary

`V84` 收口后，skill matrix 仍只有：

- 顶层 `matrix.caveatSummary`
- 组级 `matrix.summary.groups[*].caveatSummary`
- 行级 `row.caveatSummary`

`matrix.summary` 本身还缺少同名聚合字段。

`V85` 只解决一件事：

- 为 `StaticBuildSkillMatrixSummary` 增加稳定 `caveatSummary`

### 88.1 当前状态

- `V85.1` 已完成：冻结到 skill-matrix summary caveat summary
- `V85.2` 已完成：`StaticBuildSkillMatrixSummary` 已新增稳定 `caveatSummary`
- `V85.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.caveatSummary`
- `V85.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 88.2 目标

1. 为 `matrix.summary` 增加稳定 caveat aggregate
2. 保持与既有顶层 `matrix.caveatSummary` 一致
3. 不改变既有 row / group 级 caveat 语义

### 88.3 Out of Scope

1. 不改变既有顶层 `matrix.caveatSummary`
2. 不改变 row / group 级 `caveatSummary`
3. 不提前把 `diagnosticSummary / sourceNoteSummary / effectSummary` 下沉到 `summary`

## 89. V86 skill-matrix summary diagnostic/source-note summaries

`V85` 收口后，`matrix.summary` 已具备：

- 数值汇总
- group-level diagnostics / source notes
- 顶层 `caveatSummary`

但如果上层想只消费 `matrix.summary` 这一个聚合对象，仍然需要额外跳回：

- `matrix.diagnosticSummary`
- `matrix.sourceNoteSummary`

`V86` 只解决一件事：

- 为 `StaticBuildSkillMatrixSummary` 增加稳定 `diagnosticSummary / sourceNoteSummary`

### 89.1 当前状态

- `V86.1` 已完成：冻结到 skill-matrix summary diagnostic/source-note summaries
- `V86.2` 已完成：`StaticBuildSkillMatrixSummary` 已新增稳定 `diagnosticSummary / sourceNoteSummary`
- `V86.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary`
- `V86.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 89.2 目标

1. 为 `matrix.summary` 增加稳定 diagnostics / source notes aggregate
2. 保持与既有顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary` 一致
3. 不改变既有 row / group 级 diagnostics / source notes 语义

### 89.3 Out of Scope

1. 不改变既有顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary`
2. 不改变 row / group 级 `diagnosticSummary / sourceNoteSummary`
3. 不提前把 `effectSummary` 下沉到 `summary`

## 90. V87 skill-matrix summary effect summary

`V86` 收口后，`matrix.summary` 已具备：

- 数值汇总
- diagnostics / source notes 顶层聚合
- 顶层 `caveatSummary`

但如果上层想只消费 `matrix.summary` 这一个聚合对象，仍然需要额外跳回：

- `matrix.effectSummary`

`V87` 只解决一件事：

- 为 `StaticBuildSkillMatrixSummary` 增加稳定 `effectSummary`

### 90.1 当前状态

- `V87.1` 已完成：冻结到 skill-matrix summary effect summary
- `V87.2` 已完成：`StaticBuildSkillMatrixSummary` 已新增稳定 `effectSummary`
- `V87.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.effectSummary`
- `V87.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 90.2 目标

1. 为 `matrix.summary` 增加稳定 effect summary aggregate
2. 保持与既有顶层 `matrix.effectSummary` 一致
3. 不改变既有 group 级 effect summary 语义

### 90.3 Out of Scope

1. 不改变既有顶层 `matrix.effectSummary`
2. 不改变 group 级 `effectSummary`
3. 不改变 diagnostics / source notes / caveats 的既有 contract

## 91. V88 skill-matrix top-level assumption summary

`V87` 收口后，`skill-matrix` 顶层已具备：

- `effectSummary`
- `caveatSummary`
- `diagnosticSummary`
- `sourceNoteSummary`

但如果上层只想先判断整张矩阵是否存在 assumptions，仍然只能回退到：

- `matrix.assumptions`

`V88` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `assumptionSummary`

### 91.1 当前状态

- `V88.1` 已完成：冻结到 skill-matrix top-level assumption summary
- `V88.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 与 compact result 已新增 `assumptionSummary`
- `V88.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.assumptionSummary`
- `V88.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 91.2 目标

1. 为 skill-matrix 顶层结果增加稳定 `assumptionSummary`
2. 保持与既有顶层 `matrix.assumptions` 一致
3. 不改变既有 `matrix.caveatSummary`

### 91.3 Out of Scope

1. 不改变既有顶层 `matrix.assumptions`
2. 不提前把 `assumptionSummary` 下沉到 `matrix.summary / summary.groups[*] / row`
3. 不改变 diagnostics / source notes / effect summaries 的既有 contract

## 92. V89 skill-matrix summary assumption summary

`V88` 收口后，`skill-matrix` 已具备：

- 顶层 `matrix.assumptionSummary`
- 顶层 `matrix.summary.caveatSummary`
- 顶层 `matrix.summary.diagnosticSummary`
- 顶层 `matrix.summary.sourceNoteSummary`
- 顶层 `matrix.summary.effectSummary`

但如果上层只消费 `matrix.summary` 这一个聚合对象，仍然要额外跳回：

- `matrix.assumptionSummary`

### 92.1 当前状态

- `V89.1` 已完成：冻结到 skill-matrix summary assumption summary
- `V89.2` 已完成：`StaticBuildSkillMatrixSummary` 已新增稳定 `assumptionSummary`
- `V89.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.assumptionSummary`
- `V89.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 92.2 目标

1. 为 `matrix.summary` 增加稳定 `assumptionSummary`
2. 保持与既有顶层 `matrix.assumptionSummary` 一致
3. 不改变既有 `matrix.summary.caveatSummary`

### 92.3 Out of Scope

1. 不改变既有顶层 `matrix.assumptionSummary`
2. 不提前把 `assumptionSummary` 下沉到 `matrix.summary.groups[*] / row`
3. 不改变 diagnostics / source notes / effect summaries 的既有 contract

## 93. V90 skill-matrix group assumption summary

`V89` 收口后，`skill-matrix summary` 已具备：

- 顶层 `matrix.summary.assumptionSummary`
- 顶层 `matrix.summary.effectSummary`
- 顶层 `matrix.summary.caveatSummary`
- 组级 `matrix.summary.groups[*].assumptions`

但如果上层按 `group` 拆 section，仍然要额外自己统计：

- `matrix.summary.groups[*].assumptions.length`

### 93.1 当前状态

- `V90.1` 已完成：冻结到 skill-matrix group assumption summary
- `V90.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增稳定 `assumptionSummary`
- `V90.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].assumptionSummary`
- `V90.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 93.2 目标

1. 为 `matrix.summary.groups[*]` 增加稳定 `assumptionSummary`
2. 保持与既有 `matrix.summary.groups[*].assumptions` 一致
3. 不改变既有 `matrix.summary.groups[*].caveatSummary`

### 93.3 Out of Scope

1. 不改变既有 `matrix.summary.groups[*].assumptions`
2. 不提前把 `assumptionSummary` 下沉到 `rows[*]`
3. 不改变 diagnostics / source notes / effect summaries 的既有 contract

## 94. V91 skill-matrix row assumption summary

`V90` 收口后，`skill-matrix` 已具备：

- 顶层 `matrix.summary.assumptionSummary`
- 组级 `matrix.summary.groups[*].assumptionSummary`
- 行级 `row.assumptions`

但如果上层逐行消费矩阵，仍然要额外自己统计：

- `row.assumptions.length`

### 94.1 当前状态

- `V91.1` 已完成：冻结到 skill-matrix row assumption summary
- `V91.2` 已完成：`StaticBuildSkillMatrixRow` 与 compact row 已新增稳定 `assumptionSummary`
- `V91.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `row.assumptionSummary`
- `V91.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 94.2 目标

1. 为 `rows[*]` 增加稳定 `assumptionSummary`
2. 保持与既有 `row.assumptions` 一致
3. 不改变既有 `row.caveatSummary`

### 94.3 Out of Scope

1. 不改变既有 `row.assumptions`
2. 不改变顶层 `matrix.summary` 与 group 级 `summary.groups[*]`
3. 不改变 diagnostics / source notes / effect summaries 的既有 contract

## 95. V92 source-damage-view caveat summary

`V91` 收口后，`source-damage-view` 已具备：

- 顶层 `views.assumptionSummary`
- 顶层 `views.summary.assumptionSummary`
- 顶层 `views.summary.supportedCount / unsupportedCount`

但如果上层只想先判断整组 source-damage-view 是否存在 caveat，仍然要自己组合：

- `views.assumptionSummary`
- `views.summary.unsupportedCount`

### 95.1 当前状态

- `V92.1` 已完成：冻结到 source-damage-view caveat summary
- `V92.2` 已完成：`ResolveStaticBuildSourceDamageViewsResult` 与 `StaticBuildSourceDamageViewSummary` 已新增稳定 `caveatSummary`
- `V92.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.caveatSummary` / `views.caveatSummary`
- `V92.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 95.2 目标

1. 为 `views` 顶层结果增加稳定 `caveatSummary`
2. 为 `views.summary` 增加稳定 `caveatSummary`
3. 保持与既有 assumptions、supportedCount、unsupportedCount 一致

### 95.3 Out of Scope

1. 不为 `groups[*]` 增加 `caveatSummary`
2. 不为单条 `entry` 增加 `caveatSummary`
3. 不同时扩到 `source-utility-view`、`source-entry collection`、`trigger-matrix`

## 96. V93 source-damage-view group caveat summary

`V92` 收口后，`source-damage-view` 已具备：

- 顶层 `views.caveatSummary`
- `views.summary.caveatSummary`

但如果上层按 `standalone / delta` 分组输出 section，仍然需要自己组合：

- `views.summary.groups[*].assumptionSummary`
- `views.summary.groups[*].unsupportedCount`

### 96.1 当前状态

- `V93.1` 已完成：冻结到 source-damage-view group caveat summary
- `V93.2` 已完成：`StaticBuildSourceDamageViewGroupSummary` 已新增稳定 `caveatSummary`
- `V93.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*].caveatSummary`
- `V93.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 96.2 目标

1. 为 `views.summary.groups[*]` 增加稳定 `caveatSummary`
2. 保持与组级 assumptions、supportedCount、unsupportedCount 一致
3. 让上层按组消费 source-damage views 时不再手工组合 caveat

### 96.3 Out of Scope

1. 不为单条 `entry` 增加 `caveatSummary`
2. 不把同一套 group-level caveat contract 扩到 `source-utility-view`、`source-entry collection`、`trigger-matrix`
3. 不改变既有 `views.summary.caveatSummary` / `views.caveatSummary`

## 97. V94 source-utility-view caveat summary

当前 `source-utility-view` 已具备：

- 顶层 `views.assumptionSummary`
- `views.summary.assumptionSummary`
- `views.summary.supportedCount / unsupportedCount`

但如果上层只想先判断整组 utility views 是否存在 caveat，仍然要自己组合：

- `views.assumptionSummary`
- `views.summary.unsupportedCount`

### 97.1 当前状态

- `V94.1` 已完成：冻结到 source-utility-view caveat summary
- `V94.2` 已完成：`ResolveStaticBuildSourceUtilityViewsResult` 与 `StaticBuildSourceUtilityViewSummary` 已新增稳定 `caveatSummary`
- `V94.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.caveatSummary` / `views.caveatSummary`
- `V94.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 97.2 目标

1. 为 `views` 顶层结果增加稳定 `caveatSummary`
2. 为 `views.summary` 增加稳定 `caveatSummary`
3. 保持与现有 assumptions、supportedCount、unsupportedCount 一致

### 97.3 Out of Scope

1. 不为 `groups[*]` 增加 `caveatSummary`
2. 不为单条 `entry` 增加 `caveatSummary`
3. 不同时扩到 `source-entry collection`、`trigger-matrix`

## 98. V95 source-utility-view group caveat summary

`V94` 收口后，`source-utility-view` 已具备：

- 顶层 `views.caveatSummary`
- `views.summary.caveatSummary`

但如果上层按 `trigger / rate` 分组输出 section，仍然需要自己组合：

- `views.summary.groups[*].assumptionSummary`
- `views.summary.groups[*].unsupportedCount`

### 98.1 当前状态

- `V95.1` 已完成：冻结到 source-utility-view group caveat summary
- `V95.2` 已完成：`StaticBuildSourceUtilityViewGroupSummary` 已新增稳定 `caveatSummary`
- `V95.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `views.summary.groups[*].caveatSummary`
- `V95.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 98.2 目标

1. 为 `views.summary.groups[*]` 增加稳定 `caveatSummary`
2. 保持与组级 assumptions、supportedCount、unsupportedCount 一致
3. 让上层按组消费 utility views 时不再手工组合 caveat

### 98.3 Out of Scope

1. 不为单条 `entry` 增加 `caveatSummary`
2. 不把同一套 group-level caveat contract 扩到 `source-entry collection`、`trigger-matrix`
3. 不改变既有 `views.summary.caveatSummary` / `views.caveatSummary`

## 99. V96 source-entry collection caveat summary

`V95` 收口后，unified `source-entry collection` 已具备：

- 顶层 `collection.assumptionSummary`
- `collection.summary.assumptionSummary`
- `collection.summary.supportedCount / unsupportedCount`

但如果上层只想先判断整组 mixed collection 是否存在 caveat，仍然要自己组合：

- `collection.assumptionSummary`
- `collection.summary.unsupportedCount`

### 99.1 当前状态

- `V96.1` 已完成：冻结到 source-entry collection caveat summary
- `V96.2` 已完成：`ResolveStaticBuildSourceEntriesResult` 与 `StaticBuildSourceEntryCollectionSummary` 已新增稳定 `caveatSummary`
- `V96.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.caveatSummary` / `collection.caveatSummary`
- `V96.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 99.2 目标

1. 为 `collection` 顶层结果增加稳定 `caveatSummary`
2. 为 `collection.summary` 增加稳定 `caveatSummary`
3. 保持与现有 assumptions、supportedCount、unsupportedCount 一致

### 99.3 Out of Scope

1. 不为 `groups[*]` 增加 `caveatSummary`
2. 不为单条 `entry` 增加 `caveatSummary`
3. 不同时扩到 `trigger-matrix`

## 100. V97 source-entry group caveat summary

`V96` 收口后，unified `source-entry collection` 已具备：

- 顶层 `collection.caveatSummary`
- `collection.summary.caveatSummary`

但如果上层按 `source-damage-view / source-utility-view` 拆 section，仍然需要自己组合：

- `collection.summary.groups[*].assumptionSummary`
- `collection.summary.groups[*].unsupportedCount`

### 100.1 当前状态

- `V97.1` 已完成：冻结到 source-entry group caveat summary
- `V97.2` 已完成：`StaticBuildSourceEntryGroupSummary` 已新增稳定 `caveatSummary`
- `V97.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `collection.summary.groups[*].caveatSummary`
- `V97.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 100.2 目标

1. 为 `collection.summary.groups[*]` 增加稳定 `caveatSummary`
2. 保持与组级 assumptions、supportedCount、unsupportedCount 一致
3. 让上层按组消费 mixed collection 时不再手工组合 caveat

### 100.3 Out of Scope

1. 不为单条 `entry` 增加 `caveatSummary`
2. 不改变既有 `collection.summary.caveatSummary` / `collection.caveatSummary`
3. 不同时扩到 `trigger-matrix`

## 101. V98 trigger-matrix caveat summary

`V97` 收口后，`trigger-matrix` 已具备：

- 顶层 `matrix.assumptionSummary`
- `matrix.summary.assumptionSummary`
- `matrix.summary.supportedCount / unsupportedCount`

但如果上层只想先判断整张 `trigger-entry matrix` 是否带 caveat，仍然要自己组合：

- `matrix.assumptionSummary`
- `matrix.summary.unsupportedCount`

### 101.1 当前状态

- `V98.1` 已完成：冻结到 trigger-matrix caveat summary
- `V98.2` 已完成：`ResolveStaticBuildTriggerMatrixResult` 与 `StaticBuildTriggerMatrixSummary` 已新增稳定 `caveatSummary`
- `V98.3` 已完成：compact helper、高层 tool 断言与 agent prompt 已对齐 `matrix.summary.caveatSummary` / `matrix.caveatSummary`
- `V98.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 101.2 目标

1. 为 `matrix` 顶层结果增加稳定 `caveatSummary`
2. 为 `matrix.summary` 增加稳定 `caveatSummary`
3. 让上层判断整张 trigger matrix 是否带 caveat 时，不再手工组合 assumptions 与 unsupported 计数

### 101.3 Out of Scope

1. 不为 `groups[*]` 增加 `caveatSummary`
2. 不为单条 `row` 增加 `caveatSummary`
3. 不改变既有 `groups[*].assumptionSummary`

## 102. V99 trigger-matrix group caveat summary

`V98` 收口后，`trigger-matrix` 已具备：

- 顶层 `matrix.caveatSummary`
- `matrix.summary.caveatSummary`

但如果上层按 `main-formula / source-view` 拆 section，仍然需要自己组合：

- `matrix.summary.groups[*].assumptionSummary`
- `matrix.summary.groups[*].unsupportedCount`

### 102.1 当前状态

- `V99.1` 已完成：冻结到 trigger-matrix group caveat summary
- `V99.2` 已完成：`StaticBuildTriggerMatrixGroupSummary` 已新增稳定 `caveatSummary`
- `V99.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].caveatSummary`
- `V99.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 102.2 目标

1. 为 `matrix.summary.groups[*]` 增加稳定 `caveatSummary`
2. 保持与组级 assumptions、supportedCount、unsupportedCount 一致
3. 让上层按组消费 trigger matrix 时不再手工组合 caveat

### 102.3 Out of Scope

1. 不为单条 `row` 增加 `caveatSummary`
2. 不改变既有 `matrix.summary.caveatSummary` / `matrix.caveatSummary`
3. 不同时扩到 `source-entry collection`

## 103. V100 trigger-matrix row caveat summary

`V99` 收口后，`trigger-matrix` 已具备：

- 顶层 `matrix.caveatSummary`
- `matrix.summary.caveatSummary`
- `matrix.summary.groups[*].caveatSummary`

但如果上层逐行消费 `trigger rows`，仍然需要自己组合：

- `row.assumptions`
- `row.supported`

### 103.1 当前状态

- `V100.1` 已完成：冻结到 trigger-matrix row caveat summary
- `V100.2` 已完成：`StaticBuildTriggerMatrixRow` 与 compact row 已新增稳定 `caveatSummary`
- `V100.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `row.caveatSummary`
- `V100.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

## 104. V101 source-utility-view entry caveat summary

`V100` 收口后，`source-utility-view` 已具备：

- 顶层 `views.caveatSummary`
- `views.summary.caveatSummary`
- `views.summary.groups[*].caveatSummary`

但单条 `entry` 仍只有：

- `requirements / requirementSummary`
- `diagnostics / diagnosticSummary`
- `sourceNotes / sourceNoteSummary`
- `assumptionSummary`

如果上层只想先判断某条 utility entry 是否带 caveat，仍需要手工组合：

- `entry.assumptions.length`
- `entry.supported`

这一层还不对称。

### 104.1 目标

1. 为 `source-utility-view entry` 增加稳定 `caveatSummary`
2. 让 utility entry 的 caveat contract 与 source-damage-view / trigger-row 对齐

### 104.2 范围

1. `V101.1` scope freeze
2. `V101.2` utility-entry caveat contract
3. `V101.3` high-level / prompt alignment
4. `V101.4` docs closeout

### 104.3 当前状态

- `V101.1` 已完成：冻结到 source-utility-view entry caveat summary
- `V101.2` 已完成：`StaticBuildSourceUtilityViewEntry` 与 compact entry 已新增稳定 `caveatSummary`
- `V101.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `entry.caveatSummary`
- `V101.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 104.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 增加稳定 `caveatSummary`
2. 复用现有 `StaticBuildEntryCaveatSummary`
3. 保持 entry-level caveat 只反映 assumptions 规模与 unsupported 状态

显式不做：

1. 不改变 `views.summary.caveatSummary`
2. 不改变 `views.summary.groups[*].caveatSummary`
3. 不把 utility entry caveat 进一步并回 `source-entry collection`

## 105. V102 source-utility-view entry summary

`V101` 收口后，`source-utility-view entry` 已具备：

- `requirements / requirementSummary`
- `diagnostics / diagnosticSummary`
- `sourceNotes / sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`

但仍没有一个稳定的 entry-level `summary`。

如果上层只想快速读取某条 utility entry 的：

- 数值与单位
- 目标范围与触发模式
- requirement / assumptions / diagnostics / sourceNotes 的计数

仍需要散读多组字段。

### 105.1 目标

1. 为 `source-utility-view entry` 增加稳定 `summary`
2. 让 utility entry 与 `source-damage-view entry` / `trigger row` 在“逐条摘要层”上更对称

### 105.2 范围

1. `V102.1` scope freeze
2. `V102.2` utility-entry summary contract
3. `V102.3` high-level / prompt alignment
4. `V102.4` docs closeout

### 105.3 当前状态

- `V102.1` 已完成：冻结到 source-utility-view entry summary
- `V102.2` 已完成：`StaticBuildSourceUtilityViewEntry` 与 compact entry 已新增稳定 `summary`
- `V102.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `entry.summary`
- `V102.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 105.4 当前边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 增加稳定 `summary`
2. 覆盖 entry-level 最常消费的 value/unit/target/resolution/count/flag 摘要
3. 保持原始 entry 字段全部兼容

显式不做：

1. 不改变 `views.summary`
2. 不改变 `views.summary.groups[*]`
3. 不新增 utility entry 的 build-like nested result

## 106. V103 source-entry utility-entry summary alignment

`V102` 收口后，standalone `source-utility-view` 已把 `entry.summary` 作为稳定 contract。

但 unified `source-entry collection` 这条混合入口里：

- 高层 source-entry tool 断言
- Agent prompt
- README mixed collection 示例

还没有把 utility entry 的 `summary` 视为明确公共接口。

这样上层虽然“能拿到这个字段”，却仍可能继续散读：

- `value`
- `unit`
- `targetScope`
- `resolutionMode`

### 106.1 目标

1. 把 mixed collection 中 utility entry 的 `summary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 `resolveBuildSourceUtilityViews` 在 utility-entry 消费方式上保持一致

### 106.2 范围

1. `V103.1` scope freeze
2. `V103.2` source-entry tool assertion alignment
3. `V103.3` prompt / README alignment
4. `V103.4` docs closeout

### 106.3 当前状态

- `V103.1` 已完成：冻结到 source-entry utility-entry summary alignment
- `V103.2` 已完成：高层 source-entry tool 断言已对齐 `entry.summary`
- `V103.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 utility entry 的 `summary` 视为正式 contract
- `V103.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 106.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 utility entry 的 `summary` 消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 source-damage-view entry contract
3. 不新增 source-entry collection 的新类型

## 107. V104 source-entry damage-entry summary alignment

`V103` 收口后，unified `source-entry collection` 已把 utility entry 的 `summary` 视为正式公共 contract。

但 mixed collection 这条统一入口里，`source-damage-view` entry 虽然从 `V50` 起就稳定暴露 `summary`，当前仍缺：

- source-entry collection 断言没有把 `entry.summary` 当成 damage entry 的正式消费层
- Agent prompt 还没明确要求在 mixed collection 路径优先读取 source-damage entry 的 `summary`
- README 也还没把这层写成 source-entry collection 的公共 contract

### 107.1 目标

1. 把 mixed collection 中 source-damage-view entry 的 `summary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 `resolveBuildSourceDamageViews` 在 damage-entry 消费方式上保持一致

### 107.2 范围

1. `V104.1` scope freeze
2. `V104.2` source-entry tool assertion alignment
3. `V104.3` prompt / README alignment
4. `V104.4` docs closeout

### 107.3 当前状态

- `V104.1` 已完成：冻结到 source-entry damage-entry summary alignment
- `V104.2` 已完成：高层 source-entry tool 断言已对齐 damage entry 的 `entry.summary`
- `V104.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 damage entry 的 `summary` 视为正式 contract
- `V104.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 107.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 source-damage-view entry 的 `summary` 消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 standalone source-damage-view contract
3. 不新增 source-entry collection 的新类型

## 108. V105 source-entry mixed-entry assumption summary alignment

`V104` 收口后，unified `source-entry collection` 已把 mixed entry 的 `summary` 视为正式公共 contract。

但同一条 mixed collection 路径里，`entry.assumptionSummary` 虽然已经存在，当前仍缺：

- source-entry collection 断言没有把 `entry.assumptionSummary` 当成 mixed entry 的正式消费层
- Agent prompt 还没明确要求在 mixed collection 路径优先读取 `entry.assumptionSummary`
- README 也还没把这层写成 source-entry collection 的公共 contract

### 108.1 目标

1. 把 mixed collection 中 entry-level `assumptionSummary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 standalone source views 在“逐条 assumptions 摘要消费”上保持一致

### 108.2 范围

1. `V105.1` scope freeze
2. `V105.2` source-entry tool assertion alignment
3. `V105.3` prompt / README alignment
4. `V105.4` docs closeout

### 108.3 当前状态

- `V105.1` 已完成：冻结到 source-entry mixed-entry assumptionSummary alignment
- `V105.2` 已完成：高层 source-entry tool 断言已对齐 mixed entry 的 `entry.assumptionSummary`
- `V105.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 entry 的 `assumptionSummary` 视为正式 contract
- `V105.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 108.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 entry-level `assumptionSummary` 的消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 standalone source-damage-view / source-utility-view contract
3. 不新增 source-entry collection 的新类型

## 109. V106 source-entry mixed-entry caveat summary alignment

`V105` 收口后，unified `source-entry collection` 已把 mixed entry 的 `assumptionSummary` 视为正式公共 contract。

但同一条 mixed collection 路径里，`entry.caveatSummary` 虽然已经存在，当前仍缺：

- source-entry collection 断言没有把 `entry.caveatSummary` 当成 mixed entry 的正式消费层
- Agent prompt 还没明确要求在 mixed collection 路径优先读取 `entry.caveatSummary`
- README 也还没把这层写成 source-entry collection 的公共 contract

### 109.1 目标

1. 把 mixed collection 中 entry-level `caveatSummary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 standalone source views 在“逐条 caveat 摘要消费”上保持一致

### 109.2 范围

1. `V106.1` scope freeze
2. `V106.2` source-entry tool assertion alignment
3. `V106.3` prompt / README alignment
4. `V106.4` docs closeout

### 109.3 当前状态

- `V106.1` 已完成：冻结到 source-entry mixed-entry caveatSummary alignment
- `V106.2` 已完成：高层 source-entry tool 断言已对齐 mixed entry 的 `entry.caveatSummary`
- `V106.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 entry 的 `caveatSummary` 视为正式 contract
- `V106.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 109.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 entry-level `caveatSummary` 的消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 standalone source-damage-view / source-utility-view contract
3. 不新增 source-entry collection 的新类型

## 110. V107 source-entry mixed-entry diagnostic summary alignment

`V106` 收口后，unified `source-entry collection` 已把 mixed entry 的 `caveatSummary` 视为正式公共 contract。

但同一条 mixed collection 路径里，`entry.diagnosticSummary` 虽然已经存在，当前仍缺：

- source-entry collection 断言没有把 `entry.diagnosticSummary` 当成 mixed entry 的正式消费层
- Agent prompt 还没明确要求在 mixed collection 路径优先读取 `entry.diagnosticSummary`
- README 也还没把这层写成 source-entry collection 的公共 contract

### 110.1 目标

1. 把 mixed collection 中 entry-level `diagnosticSummary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 standalone source views 在“逐条 diagnostics 摘要消费”上保持一致

### 110.2 范围

1. `V107.1` scope freeze
2. `V107.2` source-entry tool assertion alignment
3. `V107.3` prompt / README alignment
4. `V107.4` docs closeout

### 110.3 当前状态

- `V107.1` 已完成：冻结到 source-entry mixed-entry diagnosticSummary alignment
- `V107.2` 已完成：高层 source-entry tool 断言已对齐 mixed entry 的 `entry.diagnosticSummary`
- `V107.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 entry 的 `diagnosticSummary` 视为正式 contract
- `V107.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 110.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 entry-level `diagnosticSummary` 的消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 standalone source-damage-view / source-utility-view contract
3. 不新增 source-entry collection 的新类型

## 111. V108 source-entry mixed-entry source-note summary alignment

`V107` 收口后，unified `source-entry collection` 已把 mixed entry 的 `diagnosticSummary` 视为正式公共 contract。

但同一条 mixed collection 路径里，`entry.sourceNoteSummary` 虽然已经存在，当前仍缺：

- source-entry collection 断言没有把 `entry.sourceNoteSummary` 当成 mixed entry 的正式消费层
- Agent prompt 还没明确要求在 mixed collection 路径优先读取 `entry.sourceNoteSummary`
- README 也还没把这层写成 source-entry collection 的公共 contract

### 111.1 目标

1. 把 mixed collection 中 entry-level `sourceNoteSummary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 standalone source views 在“逐条 source notes 摘要消费”上保持一致

### 111.2 范围

1. `V108.1` scope freeze
2. `V108.2` source-entry tool assertion alignment
3. `V108.3` prompt / README alignment
4. `V108.4` docs closeout

### 111.3 当前状态

- `V108.1` 已完成：冻结到 source-entry mixed-entry sourceNoteSummary alignment
- `V108.2` 已完成：高层 source-entry tool 断言已对齐 mixed entry 的 `entry.sourceNoteSummary`
- `V108.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 entry 的 `sourceNoteSummary` 视为正式 contract
- `V108.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 111.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 entry-level `sourceNoteSummary` 的消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 standalone source-damage-view / source-utility-view contract
3. 不新增 source-entry collection 的新类型

## 112. V109 source-entry mixed-entry requirement summary alignment

`V108` 收口后，unified `source-entry collection` 已把 mixed entry 的 `sourceNoteSummary` 视为正式公共 contract。

但同一条 mixed collection 路径里，`entry.requirementSummary` 虽然已经存在，当前仍缺：

- source-entry collection 断言没有把 `entry.requirementSummary` 当成 mixed entry 的正式消费层
- Agent prompt 还没明确要求在 mixed collection 路径优先读取 `entry.requirementSummary`
- README 也还没把这层写成 source-entry collection 的公共 contract

### 112.1 目标

1. 把 mixed collection 中 entry-level `requirementSummary` 视为正式 contract
2. 让 `resolveBuildSourceEntries` 与 standalone source views 在“逐条 requirement 摘要消费”上保持一致

### 112.2 范围

1. `V109.1` scope freeze
2. `V109.2` source-entry tool assertion alignment
3. `V109.3` prompt / README alignment
4. `V109.4` docs closeout

### 112.3 当前状态

- `V109.1` 已完成：冻结到 source-entry mixed-entry requirementSummary alignment
- `V109.2` 已完成：高层 source-entry tool 断言已对齐 mixed entry 的 `entry.requirementSummary`
- `V109.3` 已完成：Agent prompt 与 README 已把 mixed collection 中 entry 的 `requirementSummary` 视为正式 contract
- `V109.4` 已完成：相关 specs、roadmap、索引与架构文档已同步

### 112.4 当前边界

本阶段只做：

1. 明确 mixed collection 中 entry-level `requirementSummary` 的消费方式
2. 保持底层 `ResolveStaticBuildSourceEntriesResult` 不变

显式不做：

1. 不新增 collection-level aggregate
2. 不改变 standalone source-damage-view / source-utility-view contract
3. 不新增 source-entry collection 的新类型

## 113. V110 source-entry top-level diagnostic/source-note summary alignment

`V109` 收口后，unified `source-entry collection` 已把 mixed entry 的
`requirementSummary` 视为正式公共 contract。

但 `ResolveStaticBuildSourceEntriesResult` 顶层仍只暴露：

- `summary`
- `caveatSummary`
- `assumptionSummary`

而没有和其他 result 类型对齐的：

- `diagnosticSummary`
- `sourceNoteSummary`

这导致上层如果只想判断整组 mixed collection 是否存在 diagnostics /
source notes，仍要退回 `collection.summary.*`，缺少与 source views /
trigger matrix / skill matrix 一致的顶层兼容字段。

### 113.1 目标

1. 给 unified `source-entry collection` 顶层补齐稳定的 `diagnosticSummary / sourceNoteSummary`
2. 保持 `collection.summary.diagnosticSummary / collection.summary.sourceNoteSummary` 原语义不变

### 113.2 范围

1. `V110.1` scope freeze
2. `V110.2` runtime contract alignment
3. `V110.3` compact / tool assertion alignment
4. `V110.4` prompt / README / docs closeout

### 113.3 当前状态

- `V110.1` 已完成：冻结到 source-entry top-level diagnostic/source-note summary alignment
- `V110.2` 已完成：底层 result 与 compact collection 已补齐 `diagnosticSummary / sourceNoteSummary`
- `V110.3` 已完成：高层 source-entry tool 断言已对齐顶层 `collection.diagnosticSummary / collection.sourceNoteSummary`
- `V110.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 113.4 当前边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceEntriesResult` 顶层新增 `diagnosticSummary / sourceNoteSummary`
2. 让 compact source-entry collection 透传这两个字段
3. 明确上层优先读取 `collection.summary.*`，兼容读取 `collection.*`

显式不做：

1. 不改变 `summary.diagnosticSummary / summary.sourceNoteSummary` 的语义
2. 不改变 `entry.diagnosticSummary / entry.sourceNoteSummary` 的语义
3. 不新增新的 aggregate 类型

## 114. V111 standalone source-view top-level diagnostic/source-note summary alignment

`V110` 收口后，unified `source-entry collection` 已把顶层
`diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但 standalone `source-damage-view` / `source-utility-view` 顶层仍只暴露：

1. `summary`
2. `caveatSummary`
3. `assumptionSummary`

虽然 `views.summary` 已经稳定包含：

1. `diagnosticSummary`
2. `sourceNoteSummary`

但 result 顶层还缺与 mixed collection / skill-matrix / trigger-matrix 一致的兼容字段。

### 114.1 目标

1. 给 standalone `source-damage-view` 顶层补齐稳定的
   `diagnosticSummary / sourceNoteSummary`
2. 给 standalone `source-utility-view` 顶层补齐稳定的
   `diagnosticSummary / sourceNoteSummary`
3. 保持 `views.summary.diagnosticSummary / views.summary.sourceNoteSummary` 原语义不变

### 114.2 范围

1. `V111.1` scope freeze
2. `V111.2` runtime contract alignment
3. `V111.3` compact / tool assertion alignment
4. `V111.4` prompt / README / docs closeout

### 114.3 当前状态

- `V111.1` 已完成：冻结到 standalone source-view top-level diagnostic/source-note summary alignment
- `V111.2` 已完成：底层 result 与 compact source views 已补齐 `diagnosticSummary / sourceNoteSummary`
- `V111.3` 已完成：高层 source-view tool 断言已对齐顶层 `views.diagnosticSummary / views.sourceNoteSummary`
- `V111.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 114.4 当前边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceDamageViewsResult` 顶层新增 `diagnosticSummary / sourceNoteSummary`
2. 在 `ResolveStaticBuildSourceUtilityViewsResult` 顶层新增 `diagnosticSummary / sourceNoteSummary`
3. 让 compact source views 透传这两个字段
4. 明确上层优先读取 `views.summary.*`，兼容读取 `views.*`

显式不做：

1. 不改变 `summary.diagnosticSummary / summary.sourceNoteSummary` 的语义
2. 不改变 `entry.diagnosticSummary / entry.sourceNoteSummary` 的语义
3. 不新增新的 aggregate 类型

## 115. V112 standalone source-view top-level requirement summary alignment

`V111` 收口后，standalone `source-damage-view` / `source-utility-view` 已把顶层
`diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但这两条 result 顶层仍只缺最后一组与 `summary` 对齐的 requirement 聚合：

1. `views.summary.requirementSummary` 已稳定存在
2. `views.requirementSummary` 仍不存在

### 115.1 目标

1. 给 standalone `source-damage-view` 顶层补齐稳定 `requirementSummary`
2. 给 standalone `source-utility-view` 顶层补齐稳定 `requirementSummary`
3. 保持 `views.summary.requirementSummary` 原语义不变

### 115.2 范围

1. `V112.1` scope freeze
2. `V112.2` runtime contract alignment
3. `V112.3` compact / tool assertion alignment
4. `V112.4` prompt / README / docs closeout

### 115.3 当前状态

- `V112.1` 已完成：冻结到 standalone source-view top-level requirement summary alignment
- `V112.2` 已完成：底层 result 与 compact source views 已补齐 `requirementSummary`
- `V112.3` 已完成：高层 source-view tool 断言已对齐顶层 `views.requirementSummary`
- `V112.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 115.4 当前边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceDamageViewsResult` 顶层新增 `requirementSummary`
2. 在 `ResolveStaticBuildSourceUtilityViewsResult` 顶层新增 `requirementSummary`
3. 让 compact source views 透传该字段
4. 明确上层优先读取 `views.summary.requirementSummary`，兼容读取 `views.requirementSummary`

显式不做：

1. 不改变 `summary.requirementSummary` 的语义
2. 不改变 `entry.requirementSummary` 的语义
3. 不改变 `groups[*].requirementSummary` 的语义

## 116. V113 trigger-matrix top-level diagnostic/source-note summary alignment

`V112` 收口后，standalone source views 已把顶层
`requirementSummary / diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但 `trigger-entry matrix` 顶层仍存在最后一组与 `summary` 不对称的 diagnostics / source-note 聚合：

1. `matrix.summary.diagnosticSummary` 已稳定存在
2. `matrix.summary.sourceNoteSummary` 已稳定存在
3. `matrix.diagnosticSummary / matrix.sourceNoteSummary` 仍不存在

### 116.1 目标

1. 给 `trigger-entry matrix` 顶层补齐稳定 `diagnosticSummary`
2. 给 `trigger-entry matrix` 顶层补齐稳定 `sourceNoteSummary`
3. 保持 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary` 原语义不变

### 116.2 范围

1. `V113.1` scope freeze
2. `V113.2` runtime contract alignment
3. `V113.3` compact / tool assertion alignment
4. `V113.4` prompt / README / docs closeout

### 116.3 当前状态

- `V113.1` 已完成：冻结到 trigger-matrix top-level diagnostic/source-note summary alignment
- `V113.2` 已完成：底层 result 与 compact trigger matrix 已补齐 `diagnosticSummary / sourceNoteSummary`
- `V113.3` 已完成：高层 trigger-matrix tool 断言已对齐顶层 `matrix.diagnosticSummary / matrix.sourceNoteSummary`
- `V113.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 116.4 当前边界

本阶段只做：

1. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增 `diagnosticSummary`
2. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增 `sourceNoteSummary`
3. 让 compact trigger matrix 透传这两个字段
4. 明确上层优先读取 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary`，兼容读取 `matrix.diagnosticSummary / matrix.sourceNoteSummary`

显式不做：

1. 不改变 `summary.diagnosticSummary / summary.sourceNoteSummary` 的语义
2. 不改变 `rows[*].diagnosticSummary / rows[*].sourceNoteSummary` 的语义
3. 不改变 `groups[*].diagnosticSummary / groups[*].sourceNoteSummary` 的语义

## 117. V114 trigger-matrix top-level requirement summary alignment

`V113` 收口后，`trigger-entry matrix` 顶层已经把
`diagnosticSummary / sourceNoteSummary` 固定为稳定兼容字段。

但同一路径顶层仍缺最后一组与 `summary` 对齐的 requirement 聚合：

1. `matrix.summary.requirementSummary` 已稳定存在
2. `matrix.requirementSummary` 仍不存在

### 117.1 目标

1. 给 `trigger-entry matrix` 顶层补齐稳定 `requirementSummary`
2. 保持 `matrix.summary.requirementSummary` 原语义不变
3. 不引入新的 requirement aggregate 类型

### 117.2 范围

1. `V114.1` scope freeze
2. `V114.2` runtime contract alignment
3. `V114.3` compact / tool assertion alignment
4. `V114.4` prompt / README / docs closeout

### 117.3 当前状态

- `V114.1` 已完成：冻结到 trigger-matrix top-level requirement summary alignment
- `V114.2` 已完成：底层 result 与 compact trigger matrix 已补齐 `requirementSummary`
- `V114.3` 已完成：高层 trigger-matrix tool 断言已对齐顶层 `matrix.requirementSummary`
- `V114.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 117.4 当前边界

本阶段只做：

1. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增 `requirementSummary`
2. 让 compact trigger matrix 透传该字段
3. 明确上层优先读取 `matrix.summary.requirementSummary`，兼容读取 `matrix.requirementSummary`

显式不做：

1. 不改变 `summary.requirementSummary` 的语义
2. 不改变 `rows[*].requirementSummary` 的语义
3. 不改变 `groups[*].requirementSummary` 的语义

## 118. V115 source-entry top-level dual requirement summary alignment

`V114` 收口后，`trigger-entry matrix` 顶层已经把 requirement / diagnostics /
source-note 兼容字段补齐。

但 mixed `source-entry collection` 顶层仍缺最后一组与 `summary` 对齐的 requirement 聚合：

1. `collection.summary.sourceDamageRequirementSummary` 已稳定存在
2. `collection.summary.sourceUtilityRequirementSummary` 已稳定存在
3. `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary` 仍不存在

### 118.1 目标

1. 给 mixed `source-entry collection` 顶层补齐稳定 `sourceDamageRequirementSummary`
2. 给 mixed `source-entry collection` 顶层补齐稳定 `sourceUtilityRequirementSummary`
3. 保持 `collection.summary.sourceDamageRequirementSummary / collection.summary.sourceUtilityRequirementSummary` 原语义不变

### 118.2 范围

1. `V115.1` scope freeze
2. `V115.2` runtime contract alignment
3. `V115.3` compact / tool assertion alignment
4. `V115.4` prompt / README / docs closeout

### 118.3 当前状态

- `V115.1` 已完成：冻结到 source-entry top-level dual requirement summary alignment
- `V115.2` 已完成：底层 result 与 compact source-entry collection 已补齐 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`
- `V115.3` 已完成：高层 source-entry tool 断言已对齐顶层 `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary`
- `V115.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 118.4 当前边界

本阶段只做：

1. 在 `ResolveStaticBuildSourceEntriesResult` 顶层新增 `sourceDamageRequirementSummary`
2. 在 `ResolveStaticBuildSourceEntriesResult` 顶层新增 `sourceUtilityRequirementSummary`
3. 让 compact source-entry collection 透传这两个字段
4. 明确上层优先读取 `collection.summary.sourceDamageRequirementSummary / collection.summary.sourceUtilityRequirementSummary`，兼容读取 `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary`

显式不做：

1. 不改变 `summary.sourceDamageRequirementSummary / summary.sourceUtilityRequirementSummary` 的语义
2. 不改变 `groups[*].sourceDamageRequirementSummary / groups[*].sourceUtilityRequirementSummary` 的语义
3. 不改变 `entry.requirementSummary` 的语义
4. 不新增新的 aggregate 类型

## 119. V116 trigger-matrix top-level effect summary alignment

`V115` 收口后，standalone source views、mixed source-entry collection 与
trigger-entry matrix 顶层已经把
`requirementSummary / diagnosticSummary / sourceNoteSummary / assumptionSummary /
caveatSummary` 这些兼容字段补齐。

但 `trigger-entry matrix` 仍缺少与 `skill-matrix` 对称的结构化效果聚合：

1. `matrix.summary.effectSummary` 不存在
2. `matrix.effectSummary` 不存在

### 119.1 目标

1. 给 `trigger-entry matrix` 的 `summary` 补齐稳定 `effectSummary`
2. 给 `trigger-entry matrix` 顶层补齐稳定 `effectSummary`
3. 保持现有 `rows[*].build.trace` 与 `rows[*].summary` 原语义不变

### 119.2 范围

1. `V116.1` scope freeze
2. `V116.2` runtime contract alignment
3. `V116.3` compact / tool assertion alignment
4. `V116.4` prompt / README / docs closeout

### 119.3 当前状态

- `V116.1` 已完成：冻结到 trigger-matrix top-level effect summary alignment
- `V116.2` 已完成：底层 result 与 `summary` 已补齐 `effectSummary`
- `V116.3` 已完成：compact trigger matrix 与高层 tool 断言已对齐顶层 `matrix.effectSummary`
- `V116.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步

### 119.4 当前边界

本阶段只做：

1. 在 `StaticBuildTriggerMatrixSummary` 新增稳定 `effectSummary`
2. 在 `ResolveStaticBuildTriggerMatrixResult` 顶层新增稳定 `effectSummary`
3. 让 compact trigger matrix 透传该字段
4. 明确上层优先读取 `matrix.summary.effectSummary`，兼容读取 `matrix.effectSummary`

显式不做：

1. 不改变 `rows[*].build.trace` 的语义
2. 不改变 `rows[*].summary` 的语义
3. 不提前扩到 `summary.groups[*].effectSummary`
4. 不提前扩到 `rows[*].effectSummary`

## 120. V117 trigger-matrix group effect summary alignment

`V116` 收口后，`trigger-entry matrix` 顶层与 `summary` 已补齐稳定
`effectSummary`。

但按 `main-formula / source-view` 拆 section 时，组级仍缺少对应聚合：

1. `matrix.summary.groups[*].effectSummary` 不存在

### 120.1 目标

1. 给 `trigger-entry matrix summary.groups[*]` 补齐稳定 `effectSummary`
2. 保持顶层 `matrix.summary.effectSummary / matrix.effectSummary` 原语义不变
3. 保持 `rows[*].build.trace` 与 `rows[*].summary` 原语义不变

### 120.2 范围

1. `V117.1` scope freeze
2. `V117.2` runtime contract alignment
3. `V117.3` tool assertion / prompt alignment
4. `V117.4` README / roadmap / docs closeout

### 120.3 当前状态

- `V117.1` 已完成：冻结到 trigger-matrix group effect summary alignment
- `V117.2` 已完成：`StaticBuildTriggerMatrixGroupSummary` 已补齐稳定 `effectSummary`
- `V117.3` 已完成：高层 trigger-matrix tool 断言与 Agent prompt 已对齐 `matrix.summary.groups[*].effectSummary`
- `V117.4` 已完成：README、roadmap、索引与架构文档已同步

### 120.4 当前边界

本阶段只做：

1. 在 `StaticBuildTriggerMatrixGroupSummary` 新增稳定 `effectSummary`
2. 让组级 `effectSummary` 复用现有 trigger-matrix effect 聚合语义
3. 明确按组解释 trigger matrix 时优先读取 `matrix.summary.groups[*].effectSummary`

显式不做：

1. 不改变顶层 `matrix.summary.effectSummary / matrix.effectSummary` 的语义
2. 不提前扩到 `rows[*].effectSummary`

### 103.2 目标

1. 为 `rows[*]` 增加稳定 `caveatSummary`
2. 保持与 row-level assumptions、supported 状态一致
3. 让上层逐行消费 trigger rows 时不再手工组合 caveat

### 103.3 Out of Scope

1. 不改变既有 `matrix.summary.caveatSummary`
2. 不改变既有 `matrix.summary.groups[*].caveatSummary`
3. 不同时扩到 `source-view entry`

## 121. V118 trigger-matrix row effect summary alignment

`V117` 收口后，`trigger-entry matrix` 已在顶层与 group 层补齐稳定 `effectSummary`。

但逐行消费时，调用方仍只能继续读 `row.build.trace`，或自己把单行 trace 重新聚合成 effect 概况。

`V118` 只解决一件事：

1. 给 `trigger-entry matrix rows[*]` 补齐稳定 `effectSummary`

### 121.1 阶段范围

1. `V118.1` scope freeze
2. `V118.2` runtime contract alignment
3. `V118.3` tool assertion / prompt alignment
4. `V118.4` README / roadmap / docs closeout

### 121.2 当前状态

- `V118.1` 已完成：冻结到 trigger-matrix row effect summary alignment
- `V118.2` 已完成：`StaticBuildTriggerMatrixRow` 与 compact row 已补齐稳定 `effectSummary`
- `V118.3` 已完成：高层 trigger-matrix tool 断言与 Agent prompt 已对齐 `row.effectSummary`
- `V118.4` 已完成：README、roadmap、索引与架构文档已同步

### 121.3 当前边界

本阶段只做：

1. 在 `StaticBuildTriggerMatrixRow` 新增稳定 `effectSummary`
2. 让 row-level `effectSummary` 复用现有 trigger-matrix effect 聚合语义
3. 明确逐行解释 trigger matrix 时优先读取 `row.effectSummary`

显式不做：

1. 不改变顶层 `matrix.summary.effectSummary / matrix.effectSummary` 的语义
2. 不改变组级 `matrix.summary.groups[*].effectSummary` 的语义

## 122. V119 source-damage-view top-level effect summary alignment

`source-specific damage views` 目前已经补齐了 requirement / diagnostic / source-note / assumption / caveat summary，但如果调用方想直接知道“本次额外结算条目涉及了哪些乘区变化”，仍然只能遍历 `entries[*].build.trace` 自己聚合。

`V119` 只解决一件事：

1. 给 `source-specific damage views` 的顶层与 `summary` 补齐稳定 `effectSummary`

### 122.1 阶段范围

1. `V119.1` scope freeze
2. `V119.2` runtime contract alignment
3. `V119.3` tool assertion / prompt alignment
4. `V119.4` README / roadmap / docs closeout

### 122.2 当前状态

- `V119.1` 已完成：冻结到 source-damage-view top-level effect summary alignment
- `V119.2` 已完成：`views.summary.effectSummary` 与顶层兼容字段 `views.effectSummary` 已补齐
- `V119.3` 已完成：高层 source-damage-view tool 断言与 Agent prompt 已对齐 `views.summary.effectSummary`
- `V119.4` 已完成：README、roadmap、索引与架构文档已同步

### 122.3 当前边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewSummary` 新增稳定 `effectSummary`
2. 为 `ResolveStaticBuildSourceDamageViewsResult` 新增兼容字段 `effectSummary`
3. 明确解释 source-specific damage views 的乘区变化时优先读取 `views.summary.effectSummary`

显式不做：

1. 不改变既有 `summary.groups[*]` 结构
2. 不提前扩到 `groups[*].effectSummary`
3. 不提前扩到 `entries[*].effectSummary`

## 123. V120 source-damage-view group effect summary alignment

`V119` 收口后，`source-specific damage views` 顶层已经有稳定 `effectSummary`。

但如果调用方按 `standalone / delta` 分组输出额外结算条目，仍然只能先过滤 `entries` 再自行聚合组内 effect 变化，不能像 `trigger-matrix groups` 或 `skill-matrix groups` 那样直接读取结构化结果。

`V120` 只解决一件事：

1. 给 `source-damage-view summary.groups[*]` 补齐稳定 `effectSummary`

### 123.1 阶段范围

1. `V120.1` scope freeze
2. `V120.2` runtime contract alignment
3. `V120.3` tool assertion / prompt alignment
4. `V120.4` docs closeout

### 123.2 当前状态

- `V120.1` 已完成：冻结到 source-damage-view group effect summary alignment
- `V120.2` 已完成：`views.summary.groups[*].effectSummary` 已补齐
- `V120.3` 已完成：高层 source-damage-view tool 断言与 Agent prompt 已对齐 `views.summary.groups[*].effectSummary`
- `V120.4` 已完成：README、roadmap、索引与架构文档已同步

### 123.3 当前边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewGroupSummary` 新增稳定 `effectSummary`
2. 让组级 `effectSummary` 复用现有 source-damage-view effect 聚合语义
3. 明确按组解释 source-specific damage views 时优先读取 `views.summary.groups[*].effectSummary`

显式不做：

1. 不改变顶层 `views.summary.effectSummary / views.effectSummary` 的语义
2. 不提前扩到 `entries[*].effectSummary`
3. 不改变现有 `standalone / delta` 分组方式

## 124. V121 source-damage-view entry effect summary alignment

`V120` 收口后，`source-specific damage views` 已在顶层与 group 层补齐稳定 `effectSummary`。

但逐条展示 `entries[*]` 时，调用方仍然只能回退到 `entry.build.trace` 自己聚合当前条目涉及的 effect 变化，和 `trigger-matrix row`、`skill-matrix row` 的 entry-level contract 还不对称。

`V121` 只解决一件事：

1. 给 `source-damage-view entries[*]` 补齐稳定 `effectSummary`

### 124.1 阶段范围

1. `V121.1` scope freeze
2. `V121.2` runtime contract alignment
3. `V121.3` tool assertion / prompt alignment
4. `V121.4` docs closeout

### 124.2 当前状态

- `V121.1` 已完成：冻结到 source-damage-view entry effect summary alignment
- `V121.2` 已完成：`entries[*].effectSummary` 与 compact entry 已补齐
- `V121.3` 已完成：高层 source-damage-view tool 断言与 Agent prompt 已对齐 `entry.effectSummary`
- `V121.4` 已完成：README、roadmap、索引与架构文档已同步

### 124.3 当前边界

本阶段只做：

1. 为 `StaticBuildSourceDamageViewEntry` 新增稳定 `effectSummary`
2. 让 entry-level `effectSummary` 复用当前条目的 `build.trace` 聚合语义
3. 明确逐条解释 source-specific damage views 时优先读取 `entry.effectSummary`

显式不做：

1. 不改变顶层 `views.summary.effectSummary / views.effectSummary` 的语义
2. 不改变组级 `views.summary.groups[*].effectSummary` 的语义
3. 不为没有 `build.trace` 的 delta 条目伪造 effect 明细

## 125. V122 source-entry collection top-level effect summary alignment

`V121` 收口后，`source-damage-view` 已在 top-level / group / entry 三层补齐稳定 `effectSummary`。

但 unified `source-entry collection` 仍然只能给出 requirement / diagnostic / source-note / assumption / caveat 聚合；如果调用方想先判断“当前额外来源条目整体涉及了哪些乘区变化”，仍然只能先过滤 `source-damage-view` entries 再自行聚合。

`V122` 只解决一件事：

1. 给 unified `source-entry collection` 的顶层与 `summary` 补齐稳定 `effectSummary`

### 125.1 阶段范围

1. `V122.1` scope freeze
2. `V122.2` runtime contract alignment
3. `V122.3` tool assertion / prompt alignment
4. `V122.4` docs closeout

### 125.2 当前状态

- `V122.1` 已完成：冻结到 source-entry collection top-level effect summary alignment
- `V122.2` 已完成：`collection.summary.effectSummary` 与顶层兼容字段 `collection.effectSummary` 已补齐
- `V122.3` 已完成：高层 source-entry tool 断言与 Agent prompt 已对齐 `collection.summary.effectSummary`
- `V122.4` 已完成：README、roadmap、索引与架构文档已同步

### 125.3 当前边界

本阶段只做：

1. 为 `StaticBuildSourceEntryCollectionSummary` 新增稳定 `effectSummary`
2. 为 `ResolveStaticBuildSourceEntriesResult` 新增兼容字段 `effectSummary`
3. 明确解释 mixed source-entry collection 的乘区变化时优先读取 `collection.summary.effectSummary`

显式不做：

1. 不提前扩到 `collection.summary.groups[*].effectSummary`
2. 不改变 `entry` 级 mixed union 的结构
3. 不为 utility-only collection 伪造非空 effect 明细

## 126. V123 source-entry collection group effect summary alignment

`V122` 收口后，unified `source-entry collection` 已在顶层与 `summary` 补齐稳定 `effectSummary`。

但如果调用方按 `collection.summary.groups[*]` 拆成“额外结算条目 / 回能条目”两个 section，仍然拿不到局部 effect 聚合；要解释“这一组条目涉及了哪些乘区变化”，还得先过滤组内 entries 再自行聚合。

`V123` 只解决一件事：

1. 给 unified `source-entry collection groups[*]` 补齐稳定 `effectSummary`

### 126.1 阶段范围

1. `V123.1` scope freeze
2. `V123.2` runtime contract alignment
3. `V123.3` tool assertion / prompt alignment
4. `V123.4` docs closeout

### 126.2 当前状态

- `V123.1` 已完成：冻结到 source-entry collection group effect summary alignment
- `V123.2` 已完成：`collection.summary.groups[*].effectSummary` 已补齐
- `V123.3` 已完成：高层 source-entry tool 断言与 Agent prompt 已对齐 `collection.summary.groups[*].effectSummary`
- `V123.4` 已完成：README、roadmap、索引与架构文档已同步

### 126.3 当前边界

本阶段只做：

1. 为 `StaticBuildSourceEntryGroupSummary` 新增稳定 `effectSummary`
2. 让 group-level `effectSummary` 复用现有 source-damage-view effect 聚合语义
3. 明确按组解释 mixed source-entry collection 时优先读取 `collection.summary.groups[*].effectSummary`

显式不做：

1. 不改变顶层 `collection.summary.effectSummary / collection.effectSummary` 的语义
2. 不提前给 mixed union `entry` 增加新的 effect 字段
3. 不为 utility-only group 伪造非空 effect 明细

## 127. V124 source-entry mixed-entry effect summary alignment

`V123` 收口后，unified `source-entry collection` 已在 top-level 与 group 两层补齐稳定 `effectSummary`。

但 mixed collection 的 entry-level contract 仍不对称：

- source-damage-view entry 已有稳定 `entry.effectSummary`
- utility entry 仍然缺这个字段

这会迫使调用方在逐条读取 mixed entries 时继续按 `entryKind` 分支，只为了给 utility entry 补一个默认空数组。

`V124` 只解决一件事：

1. 给 unified `source-entry collection` 中的 mixed entry 补齐稳定 `entry.effectSummary`

### 127.1 阶段范围

1. `V124.1` scope freeze
2. `V124.2` runtime contract alignment
3. `V124.3` tool assertion / prompt alignment
4. `V124.4` docs closeout

### 127.2 当前状态

- `V124.1` 已完成：冻结到 source-entry mixed-entry effect summary alignment
- `V124.2` 已完成：utility entry 已补齐稳定 `effectSummary: []`
- `V124.3` 已完成：高层 source-entry / source-utility tool 断言与 Agent prompt 已对齐 `entry.effectSummary`
- `V124.4` 已完成：README、roadmap、索引与架构文档已同步

### 127.3 当前边界

本阶段只做：

1. 为 `StaticBuildSourceUtilityViewEntry` 新增稳定 `effectSummary`
2. 明确 utility entry 当前固定返回空数组
3. 明确解释 mixed source-entry entry 时优先读取 `entry.effectSummary`

显式不做：

1. 不改变顶层 `collection.summary.effectSummary / collection.effectSummary` 的语义
2. 不改变组级 `collection.summary.groups[*].effectSummary` 的语义
3. 不为 utility entry 伪造非空 effect 明细

## 128. V125 source-utility-view compact entry effect summary alignment

`V124` 收口后，runtime contract 已为 utility entry 补齐稳定 `entry.effectSummary: []`。

但 compact contract 仍不对称：

- `compactStaticBuildSourceEntry()` 透传了 utility entry 的 `effectSummary`
- `StaticBuildCompactSourceUtilityViewEntry` 还没有把这个字段正式声明为公共 contract

这意味着 runtime 行为已经存在，但类型、测试和文档还没有把它固定下来。

`V125` 只解决一件事：

1. 给 compact utility entry 补齐稳定 `entry.effectSummary`

### 128.1 阶段范围

1. `V125.1` scope freeze
2. `V125.2` runtime/type contract alignment
3. `V125.3` tool assertion / prompt alignment
4. `V125.4` docs closeout

### 128.2 当前状态

- `V125.1` 已完成：冻结到 source-utility-view compact entry effect summary alignment
- `V125.2` 已完成：`StaticBuildCompactSourceUtilityViewEntry` 已补齐稳定 `effectSummary`
- `V125.3` 已完成：高层 source-utility-view prompt / 断言已对齐 `entry.effectSummary`
- `V125.4` 已完成：README、roadmap、索引与架构文档已同步

### 128.3 当前边界

本阶段只做：

1. 为 `StaticBuildCompactSourceUtilityViewEntry` 新增稳定 `effectSummary`
2. 固定 compact utility entry 当前返回空数组
3. 明确 utility-only compact consumer 也优先读取 `entry.effectSummary`

显式不做：

1. 不为 standalone utility views 顶层新增 `effectSummary`
2. 不为 utility entry 伪造非空 effect 明细
3. 不改变 source-entry mixed-entry 的既有 `entry.effectSummary` 语义

## 129. V126 source-utility-view top-level effect summary alignment

`V125` 收口后，standalone utility views 还存在最后一个 effect-summary 对称缺口：

- `entry.effectSummary` 已存在，固定返回空数组
- compact utility entry 也已存在 `entry.effectSummary`
- 但 `views.summary.effectSummary`
- `views.effectSummary`
- `views.summary.groups[*].effectSummary`

还没有被正式声明和透传。

`V126` 只解决一件事：

1. 为 standalone source-utility-view 的顶层 / summary / group 补齐稳定 `effectSummary`

### 129.1 阶段范围

1. `V126.1` scope freeze
2. `V126.2` runtime/type contract alignment
3. `V126.3` tool assertion / prompt alignment
4. `V126.4` docs closeout

### 129.2 当前状态

- `V126.1` 已完成：冻结到 source-utility-view top-level effect summary alignment
- `V126.2` 已完成：`ResolveStaticBuildSourceUtilityViewsResult / summary / groups` 已补齐稳定 `effectSummary`
- `V126.3` 已完成：高层 source-utility-view prompt / 断言已对齐 `views.summary.effectSummary / views.effectSummary / views.summary.groups[*].effectSummary`
- `V126.4` 已完成：README、roadmap、索引与架构文档已同步

### 129.3 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSourceUtilityViewsResult` 新增稳定 `effectSummary`
2. 为 `StaticBuildSourceUtilityViewSummary` 与 `summary.groups[*]` 新增稳定 `effectSummary`
3. 明确 standalone utility views 的 top-level / group / entry effect summary 当前都固定返回空数组

显式不做：

1. 不为 utility-only source views 伪造非空 effect 明细
2. 不改变 requirement / diagnostics / source notes / assumptions 的既有 contract
3. 不改变 mixed source-entry collection 的既有 `effectSummary` 语义

## 130. V127 skill-matrix requirement summary alignment

`V126` 收口后，skill matrix 仍有最后一个 requirement-summary 对称缺口：

- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的 top-level / group / entry requirement summary。

但 `skill-matrix` 仍然只有 assumptions / diagnostics / source notes / caveats / effects：

- `matrix.summary.requirementSummary`
- `matrix.requirementSummary`
- `matrix.summary.groups[*].requirementSummary`
- `row.requirementSummary`

还没有被正式声明和透传。

`V127` 只解决一件事：

1. 为 skill matrix 的 result / summary / group / row / compact 补齐稳定 `requirementSummary`

### 130.1 阶段范围

1. `V127.1` scope freeze
2. `V127.2` runtime/type contract alignment
3. `V127.3` tool assertion / prompt alignment
4. `V127.4` docs closeout

### 130.2 当前状态

- `V127.1` 已完成：冻结到 skill-matrix requirement summary alignment
- `V127.2` 已完成：`ResolveStaticBuildSkillMatrixResult / summary / groups / rows` 与 compact result 已补齐稳定 `requirementSummary`
- `V127.3` 已完成：高层 skill-matrix prompt / 断言已对齐 `matrix.summary.requirementSummary / matrix.requirementSummary / matrix.summary.groups[*].requirementSummary / row.requirementSummary`
- `V127.4` 已完成：README、roadmap、索引与架构文档已同步

### 130.3 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildSkillMatrixResult` 新增稳定 `requirementSummary`
2. 为 `StaticBuildSkillMatrixSummary` 与 `summary.groups[*]` 新增稳定 `requirementSummary`
3. 为 `StaticBuildSkillMatrixRow` 与 compact row 新增稳定 `requirementSummary`
4. 明确当前 skill matrix 的 top-level / group / row requirement summary 都固定返回空聚合

显式不做：

1. 不为 skill matrix 伪造真实技能 requirements
2. 不改变 assumptions / diagnostics / source notes / caveats / effects 的既有 contract
3. 不改变 `trigger-matrix`、`source views`、`source-entry collection` 的既有 requirement-summary 语义

## 131. V128 single-build top-level aggregate summary alignment

`V127` 收口后，单次 `resolveStaticBuildDamage()` 仍然是唯一一条没有顶层结构化 aggregate summary 的主路径。

当前状态不对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的：

- `diagnosticSummary`
- `sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`

但单次 resolver 仍然只有：

- `summary.diagnosticGroups`
- `summary.sourceNoteGroups`
- `summary.hasUnsupportedEffects`

还没有顶层结构化聚合。

`V128` 只解决一件事：

1. 为 `ResolveStaticBuildResult` 补齐稳定的 top-level aggregate summaries

### 131.1 阶段范围

1. `V128.1` scope freeze
2. `V128.2` runtime/type contract alignment
3. `V128.3` tool assertion / prompt alignment
4. `V128.4` docs closeout

### 131.2 当前状态

- `V128.1` 已完成：冻结到 single-build top-level aggregate summary alignment
- `V128.2` 已完成：`ResolveStaticBuildResult` 已补齐稳定 `diagnosticSummary / sourceNoteSummary / assumptionSummary / caveatSummary`
- `V128.3` 已完成：高层 `resolveBuildDamage` prompt / 断言已对齐这些顶层 summary，同时保留 `build.summary.*` 兼容读取路径
- `V128.4` 已完成：README、roadmap、索引与架构文档已同步

### 131.3 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildResult` 新增稳定 `diagnosticSummary`
2. 为 `ResolveStaticBuildResult` 新增稳定 `sourceNoteSummary`
3. 为 `ResolveStaticBuildResult` 新增稳定 `assumptionSummary`
4. 为 `ResolveStaticBuildResult` 新增稳定 `caveatSummary`

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary` 的既有结构
2. 不为单次 resolver 新增 `effectSummary` 或 `requirementSummary`
3. 不改变 matrix / views / source-entry collection 的既有 aggregate summary 语义

## 132. V129 single-build effect summary alignment

`V128` 收口后，单次 `resolveStaticBuildDamage()` 的 diagnostics / source notes / assumptions / caveats 已经有了顶层 aggregate summary，但“增益清单”仍然是最后一个未对齐的缺口。

当前状态不对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的 `effectSummary`。

但单次 resolver 仍然只有原始 `trace`，上层如果要生成“增益清单”，还得自己遍历 applied modifiers。

`V129` 只解决一件事：

1. 为 `ResolveStaticBuildResult` 补齐稳定的 top-level `effectSummary`

### 132.1 阶段范围

1. `V129.1` scope freeze
2. `V129.2` runtime/type contract alignment
3. `V129.3` tool assertion / prompt alignment
4. `V129.4` docs closeout

### 132.2 当前状态

- `V129.1` 已完成：冻结到 single-build effect summary alignment
- `V129.2` 已完成：`ResolveStaticBuildResult` 已补齐稳定 `effectSummary`
- `V129.3` 已完成：高层 `resolveBuildDamage` prompt / 断言已对齐 `build.effectSummary`
- `V129.4` 已完成：README、roadmap、索引与架构文档已同步

### 132.3 当前边界

本阶段只做：

1. 为 `ResolveStaticBuildResult` 新增稳定 `effectSummary`
2. 用 applied trace modifiers 生成单场景 effect summary
3. 高层 `resolveBuildDamage` 优先消费 `build.effectSummary`

## 133. V130 single-build compact result alignment

`V129` 收口后，单次 `resolveStaticBuildDamage()` 的 summary / effectSummary 已经完整，但高层 `resolveBuildDamage` 仍然是唯一没有 compact result 的主路径。

当前状态不对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`
- `source-entry collection`

这些路径都已经有稳定的 compact helper，并通过 `includeDetails` 控制是否附带完整 `build` 明细。

但单次 resolver 仍默认返回完整 `ResolveStaticBuildResult`，会直接暴露 `trace / damageParams`。

`V130` 只解决一件事：

1. 为单次 `resolveStaticBuildDamage()` 补齐 compact helper，并让高层 `resolveBuildDamage` 默认返回 compact build

### 133.1 阶段范围

1. `V130.1` scope freeze
2. `V130.2` runtime/type contract alignment
3. `V130.3` tool assertion / prompt alignment
4. `V130.4` docs closeout

### 133.2 当前状态

- `V130.1` 已完成：冻结到 single-build compact result alignment
- `V130.2` 已完成：`zzz-data` 已新增 `CompactStaticBuildResult / compactStaticBuildResult()`
- `V130.3` 已完成：高层 `resolveBuildDamage` 已默认返回 compact build，并通过 `includeDetails=true` 暴露 `build.trace / build.damageParams`
- `V130.4` 已完成：README、roadmap、索引与架构文档已同步

### 133.3 当前边界

本阶段只做：

1. 为单次 resolver 新增 compact helper export
2. 默认省略 `trace / damageParams`
3. 保留 `diagnostics / sourceNotes / assumptions / unsupportedEffects`
4. 高层 tool、prompt 与 README 对齐 compact 语义

## 134. V131 single-build compact detail gating

`V130` 收口后，单次 `resolveBuildDamage` 已默认返回 compact build，但仍默认携带 `diagnostics / sourceNotes` 两类明细数组。

当前状态仍不够对称：

- `skill-matrix`
- `trigger-matrix`
- `source-damage-view`
- `source-utility-view`

这些路径默认都优先暴露 `*Summary`，只有在需要时才展开更多 detail。

`V131` 只解决一件事：

1. 把 compact single-build 的 `diagnostics / sourceNotes` 也移到 `includeDetails=true`

### 134.1 阶段范围

1. `V131.1` scope freeze
2. `V131.2` runtime/type contract alignment
3. `V131.3` tool assertion / prompt alignment
4. `V131.4` docs closeout

### 134.2 当前状态

- `V131.1` 已完成：冻结到 single-build compact detail gating
- `V131.2` 已完成：`CompactStaticBuildResult` 默认已不再携带 `diagnostics / sourceNotes`
- `V131.3` 已完成：高层 `resolveBuildDamage` 测试与 prompt 已对齐 `includeDetails=true`
- `V131.4` 已完成：README、roadmap、索引与架构文档已同步

## 135. V132 skill-matrix compact row detail gating

`V131` 收口后，single-build compact 已默认不再携带 `diagnostics / sourceNotes`。

但 `resolveBuildSkillMatrix` 默认返回的 compact rows 仍默认携带这两类明细数组，而行级 `diagnosticSummary / sourceNoteSummary / assumptionSummary / caveatSummary` 已经齐全。

`V132` 只解决一件事：

1. 把 compact skill-matrix rows 的 `diagnostics / sourceNotes` 也移到 `includeDetails=true`

### 135.1 范围

1. `V132.1` scope freeze
2. `V132.2` runtime/type contract alignment
3. `V132.3` tool assertion / prompt alignment
4. `V132.4` docs closeout

### 135.2 当前状态

- `V132.1` 已完成：冻结到 skill-matrix compact row detail gating
- `V132.2` 已完成：`StaticBuildCompactSkillMatrixRow` 默认已不再携带 `diagnostics / sourceNotes`
- `V132.3` 已完成：高层 `resolveBuildSkillMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V132.4` 已完成：README、roadmap、索引与架构文档已同步

## 136. V133 trigger-matrix compact row detail gating

`V132` 收口后，compact `skill-matrix rows` 已默认不再携带 `diagnostics / sourceNotes`。

但 `resolveBuildTriggerMatrix` 默认返回的 compact rows 仍默认携带这两类明细数组，而行级 `diagnosticSummary / sourceNoteSummary / requirementSummary / assumptionSummary / caveatSummary` 已经齐全。

`V133` 只解决一件事：

1. 把 compact trigger-matrix rows 的 `diagnostics / sourceNotes` 也移到 `includeDetails=true`

### 136.1 范围

1. `V133.1` scope freeze
2. `V133.2` runtime/type contract alignment
3. `V133.3` tool assertion / prompt alignment
4. `V133.4` docs closeout

### 136.2 当前状态

- `V133.1` 已完成：冻结到 trigger-matrix compact row detail gating
- `V133.2` 已完成：`StaticBuildCompactTriggerMatrixRow` 默认已不再携带 `diagnostics / sourceNotes`
- `V133.3` 已完成：高层 `resolveBuildTriggerMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V133.4` 已完成：README、roadmap、索引与架构文档已同步

显式不做：

1. 不改变 `ResolveStaticBuildResult.summary` 的既有结构
2. 不改变 `trace` 的既有明细语义
3. 不重构 matrix / views / source-entry collection 的既有 effect-summary 类型

## 137. V134 source-damage-view compact entry detail gating

`V133` 收口后，compact `trigger-matrix rows` 已默认不再携带 `diagnostics / sourceNotes`。

但 `resolveBuildSourceDamageViews` 默认返回的 compact entries 仍默认携带这两类明细数组，而 entry 级 `diagnosticSummary / sourceNoteSummary / requirementSummary / assumptionSummary / caveatSummary / effectSummary / summary` 已经齐全。

`V134` 只解决一件事：

1. 把 compact source-damage-view entries 的 `diagnostics / sourceNotes` 也移到 `includeDetails=true`

### 137.1 范围

1. `V134.1` scope freeze
2. `V134.2` runtime/type contract alignment
3. `V134.3` tool assertion / prompt alignment
4. `V134.4` docs closeout

### 137.2 当前状态

- `V134.1` 已完成：冻结到 source-damage-view compact entry detail gating
- `V134.2` 已完成：`StaticBuildCompactSourceDamageViewEntry` 默认已不再携带 `diagnostics / sourceNotes`
- `V134.3` 已完成：高层 `resolveBuildSourceDamageViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V134.4` 已完成：README、roadmap、索引与架构文档已同步

## 138. V135 source-utility-view compact entry detail gating

`V134` 收口后，compact `source-damage-view entries` 已默认不再携带 `diagnostics / sourceNotes`。

但 `resolveBuildSourceUtilityViews` 默认返回的 compact utility entries 仍默认携带这两类明细数组，而 entry 级 `diagnosticSummary / sourceNoteSummary / requirementSummary / assumptionSummary / caveatSummary / effectSummary / summary` 已经齐全。

`V135` 只解决一件事：

1. 把 compact source-utility-view entries 的 `diagnostics / sourceNotes` 也移到 `includeDetails=true`

### 138.1 范围

1. `V135.1` scope freeze
2. `V135.2` runtime/type contract alignment
3. `V135.3` tool assertion / prompt alignment
4. `V135.4` docs closeout

### 138.2 当前状态

- `V135.1` 已完成：冻结到 source-utility-view compact entry detail gating
- `V135.2` 已完成：`StaticBuildCompactSourceUtilityViewEntry` 默认已不再携带 `diagnostics / sourceNotes`
- `V135.3` 已完成：高层 `resolveBuildSourceUtilityViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V135.4` 已完成：README、roadmap、索引与架构文档已同步

## 139. V136 source-entry compact entry detail gating

`V135` 收口后，standalone `source-damage-view` 与 `source-utility-view` 的 compact entry detail gating 已经分别完成。

但 mixed `resolveBuildSourceEntries` 仍缺少显式 contract：

1. runtime 已默认通过 compact helper 收紧 `entry.diagnostics / entry.sourceNotes / entry.build`
2. 高层 tool、prompt、测试与文档还没有把这个行为稳定写死

`V136` 只解决一件事：

1. 把 compact mixed `source-entry entries` 的 detail gating 明确收口到 `includeDetails=true`

### 139.1 范围

1. `V136.1` scope freeze
2. `V136.2` tool assertion / runtime contract alignment
3. `V136.3` prompt / README alignment
4. `V136.4` docs closeout

### 139.2 当前状态

- `V136.1` 已完成：冻结到 mixed source-entry compact detail gating
- `V136.2` 已完成：默认 compact mixed entries 已不再携带 `entry.diagnostics / entry.sourceNotes / entry.build`
- `V136.3` 已完成：高层 `resolveBuildSourceEntries` 测试、prompt 与 README 已对齐 `includeDetails=true`
- `V136.4` 已完成：README、roadmap、索引与架构文档已同步

## 140. V137 trigger-matrix compact row requirement gating

`V136` 收口后，mixed `source-entry entries` 的 raw details 已收紧到 `includeDetails=true`。

但 compact `trigger-matrix rows` 仍默认携带原始 `row.requirements`，而行级 / 组级 / 顶层 `requirementSummary` 已经齐全。

`V137` 只解决一件事：

1. 把 compact `trigger-matrix rows` 的 `row.requirements` 也移动到 `includeDetails=true`

### 140.1 范围

1. `V137.1` scope freeze
2. `V137.2` runtime/type contract alignment
3. `V137.3` tool assertion / prompt alignment
4. `V137.4` docs closeout

### 140.2 当前状态

- `V137.1` 已完成：冻结到 trigger-matrix compact row requirement gating
- `V137.2` 已完成：`StaticBuildCompactTriggerMatrixRow` 默认已不再携带 `requirements`
- `V137.3` 已完成：高层 `resolveBuildTriggerMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V137.4` 已完成：README、roadmap、索引与架构文档已同步

## 141. V138 source-damage-view compact entry requirement gating

### 141.1 背景

`V134` 收口后，standalone `source-damage-view entries` 的 raw details 已收紧到 `includeDetails=true`。

但 compact standalone `source-damage-view entries` 仍默认携带原始 `entry.requirements`，而 entry / group / top-level `requirementSummary` 已经齐全。

`V138` 只解决一件事：

1. 把 compact standalone `source-damage-view entries` 的 `entry.requirements` 也移动到 `includeDetails=true`

### 141.2 范围

1. `V138.1` scope freeze
2. `V138.2` runtime/type contract alignment
3. `V138.3` tool assertion / prompt alignment
4. `V138.4` docs closeout

### 141.3 当前状态

- `V138.1` 已完成：冻结到 standalone source-damage-view compact entry requirement gating
- `V138.2` 已完成：`StaticBuildCompactSourceDamageViewEntry` 默认已不再携带 `requirements`
- `V138.3` 已完成：高层 `resolveBuildSourceDamageViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V138.4` 已完成：README、roadmap、索引与架构文档已同步

## 142. V139 source-utility-view compact entry requirement gating

### 142.1 背景

`V135` 收口后，standalone `source-utility-view entries` 的 raw details 已收紧到 `includeDetails=true`。

但 compact standalone `source-utility-view entries` 仍默认携带原始 `entry.requirements`，而 entry / group / top-level `requirementSummary` 已经齐全。

`V139` 只解决一件事：

1. 把 compact standalone `source-utility-view entries` 的 `entry.requirements` 也移动到 `includeDetails=true`

### 142.2 范围

1. `V139.1` scope freeze
2. `V139.2` runtime/type contract alignment
3. `V139.3` tool assertion / prompt alignment
4. `V139.4` docs closeout

### 142.3 当前状态

- `V139.1` 已完成：冻结到 standalone source-utility-view compact entry requirement gating
- `V139.2` 已完成：`StaticBuildCompactSourceUtilityViewEntry` 默认已不再携带 `requirements`
- `V139.3` 已完成：高层 `resolveBuildSourceUtilityViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V139.4` 已完成：README、roadmap、索引与架构文档已同步

## 143. V140 source-entry compact entry requirement gating

### 143.1 背景

`V136` 收口后，mixed `source-entry entries` 的 raw details 已收紧到 `includeDetails=true`。

但 compact mixed `source-entry entries` 仍默认携带原始 `entry.requirements`，而 mixed entry / group / top-level requirement aggregates 已经齐全。

`V140` 只解决一件事：

1. 把 compact mixed `source-entry entries` 的 `entry.requirements` 也移动到 `includeDetails=true`

### 143.2 范围

1. `V140.1` scope freeze
2. `V140.2` runtime/type contract alignment
3. `V140.3` tool assertion / prompt alignment
4. `V140.4` docs closeout

### 143.3 当前状态

- `V140.1` 已完成：冻结到 mixed source-entry compact entry requirement gating
- `V140.2` 已完成：compact mixed entries 默认已不再携带 `requirements`
- `V140.3` 已完成：高层 `resolveBuildSourceEntries` 测试与 prompt 已对齐 `includeDetails=true`
- `V140.4` 已完成：README、roadmap、索引与架构文档已同步

## 144. V141 trigger-matrix compact row assumption gating

### 144.1 背景

`V137` 收口后，compact `trigger-matrix rows` 的 raw `row.requirements` 已收紧到 `includeDetails=true`。

但 compact trigger rows 仍默认携带原始 `row.assumptions`，而 row / group / top-level `assumptionSummary` 已经齐全。

`V141` 只解决一件事：

1. 把 compact `trigger-matrix rows` 的 `row.assumptions` 也移动到 `includeDetails=true`

### 144.2 范围

1. `V141.1` scope freeze
2. `V141.2` runtime/type contract alignment
3. `V141.3` tool assertion / prompt alignment
4. `V141.4` docs closeout

### 144.3 当前状态

- `V141.1` 已完成：冻结到 trigger-matrix compact row assumption gating
- `V141.2` 已完成：compact trigger rows 默认已不再携带 `assumptions`
- `V141.3` 已完成：高层 `resolveBuildTriggerMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V141.4` 已完成：README、roadmap、索引与架构文档已同步

## 145. V142 source-damage-view compact entry assumption gating

### 145.1 背景

`V138` 收口后，compact standalone `source-damage-view entries` 的 raw `entry.requirements` 已收紧到 `includeDetails=true`。

但 compact standalone source-damage-view entries 仍默认携带原始 `entry.assumptions`，而 entry / group / top-level `assumptionSummary` 已经齐全。

`V142` 只解决一件事：

1. 把 compact standalone `source-damage-view entries` 的 `entry.assumptions` 也移动到 `includeDetails=true`

### 145.2 范围

1. `V142.1` scope freeze
2. `V142.2` runtime/type contract alignment
3. `V142.3` tool assertion / prompt alignment
4. `V142.4` docs closeout

### 145.3 当前状态

- `V142.1` 已完成：冻结到 standalone source-damage-view compact entry assumption gating
- `V142.2` 已完成：compact standalone source-damage-view entries 默认已不再携带 `assumptions`
- `V142.3` 已完成：高层 `resolveBuildSourceDamageViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V142.4` 已完成：README、roadmap、索引与架构文档已同步

## 146. V143 source-utility-view compact entry assumption gating

### 146.1 背景

`V139` 收口后，compact standalone `source-utility-view entries` 的 raw `entry.requirements` 已收紧到 `includeDetails=true`。

但 compact standalone source-utility-view entries 仍默认携带原始 `entry.assumptions`，而 entry / group / top-level `assumptionSummary` 已经齐全。

`V143` 只解决一件事：

1. 把 compact standalone `source-utility-view entries` 的 `entry.assumptions` 也移动到 `includeDetails=true`

### 146.2 范围

1. `V143.1` scope freeze
2. `V143.2` runtime/type contract alignment
3. `V143.3` tool assertion / prompt alignment
4. `V143.4` docs closeout

### 146.3 当前状态

- `V143.1` 已完成：冻结到 standalone source-utility-view compact entry assumption gating
- `V143.2` 已完成：compact standalone source-utility-view entries 默认已不再携带 `assumptions`
- `V143.3` 已完成：高层 `resolveBuildSourceUtilityViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V143.4` 已完成：README、roadmap、索引与架构文档已同步

## 147. V144 source-entry compact entry assumption gating

### 147.1 背景

`V140` 收口后，compact mixed `source-entry entries` 的 raw `entry.requirements` 已收紧到 `includeDetails=true`。

但 compact mixed source-entry entries 仍默认携带原始 `entry.assumptions`，而 entry / group / top-level `assumptionSummary` 已经齐全。

`V144` 只解决一件事：

1. 把 compact mixed `source-entry entries` 的 `entry.assumptions` 也移动到 `includeDetails=true`

### 147.2 范围

1. `V144.1` scope freeze
2. `V144.2` runtime/type contract alignment
3. `V144.3` tool assertion / prompt alignment
4. `V144.4` docs closeout

### 147.3 当前状态

- `V144.1` 已完成：冻结到 mixed source-entry compact entry assumption gating
- `V144.2` 已完成：compact mixed source-entry entries 默认已不再携带 `assumptions`
- `V144.3` 已完成：高层 `resolveBuildSourceEntries` 测试与 prompt 已对齐 `includeDetails=true`
- `V144.4` 已完成：README、roadmap、索引与架构文档已同步

## 148. V145 skill-matrix compact row assumption gating

`V132` 收口后，compact `skill-matrix rows` 的 raw `row.diagnostics / row.sourceNotes` 已收紧到 `includeDetails=true`。

但 compact `skill-matrix rows` 仍默认携带原始 `row.assumptions`，而 row / group / top-level `assumptionSummary` 已经齐全。

`V145` 只解决一件事：

1. 把 compact `skill-matrix rows` 的 `row.assumptions` 也移动到 `includeDetails=true`

### 148.1 分阶段

1. `V145.1` scope freeze
2. `V145.2` runtime/type contract alignment
3. `V145.3` tool assertion / prompt alignment
4. `V145.4` docs closeout

### 148.2 非目标

1. 不改变顶层 `matrix.assumptions`
2. 不改变既有 `row.assumptionSummary`
3. 不改变 `row.diagnostics / row.sourceNotes / row.build`

### 148.3 当前状态

- `V145.1` 已完成：冻结到 skill-matrix compact row assumption gating
- `V145.2` 已完成：compact `skill-matrix rows` 默认已不再携带 `row.assumptions`
- `V145.3` 已完成：高层 `resolveBuildSkillMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V145.4` 已完成：README、roadmap、索引与架构文档已同步

## 149. V146 skill-matrix compact row unsupported gating

`V145` 收口后，compact `skill-matrix rows` 的 raw `row.assumptions` 已收紧到 `includeDetails=true`。

但 compact `skill-matrix rows` 仍默认携带原始 `row.unsupportedEffects`，而 row / group / top-level `caveatSummary` 已经齐全。

`V146` 只解决一件事：

1. 把 compact `skill-matrix rows` 的 `row.unsupportedEffects` 也移动到 `includeDetails=true`

### 149.1 分阶段

1. `V146.1` scope freeze
2. `V146.2` runtime/type contract alignment
3. `V146.3` tool assertion / prompt alignment
4. `V146.4` docs closeout

### 149.2 非目标

1. 不改变顶层 `matrix.unsupportedEffects`
2. 不改变既有 `row.caveatSummary`
3. 不改变 `row.assumptions / row.diagnostics / row.sourceNotes / row.build`

### 149.3 当前状态

- `V146.1` 已完成：冻结到 skill-matrix compact row unsupported gating
- `V146.2` 已完成：compact `skill-matrix rows` 默认已不再携带 `row.unsupportedEffects`
- `V146.3` 已完成：高层 `resolveBuildSkillMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V146.4` 已完成：README、roadmap、索引与架构文档已同步

## 150. V147 single-build compact top-level assumption gating

`V146` 收口后，compact `skill-matrix rows` 的 raw `row.unsupportedEffects` 已收紧到 `includeDetails=true`。

但 compact single-build 顶层结果仍默认携带原始 `build.assumptions`，而 `build.assumptionSummary / build.caveatSummary / build.summary` 已经齐全。

`V147` 只解决一件事：

1. 把 compact single-build 的顶层 `build.assumptions` 也移动到 `includeDetails=true`

### 150.1 分阶段

1. `V147.1` scope freeze
2. `V147.2` runtime/type contract alignment
3. `V147.3` tool assertion / prompt alignment
4. `V147.4` docs closeout

### 150.2 非目标

1. 不改变顶层 `build.unsupportedEffects`
2. 不改变 `build.assumptionSummary / build.caveatSummary`
3. 不改变 `build.diagnostics / build.sourceNotes / build.trace / build.damageParams`

### 150.3 当前状态

- `V147.1` 已完成：冻结到 single-build compact top-level assumption gating
- `V147.2` 已完成：默认 compact single-build 已不再携带顶层 `build.assumptions`
- `V147.3` 已完成：高层 `resolveBuildDamage` 测试与 prompt 已对齐 `includeDetails=true`
- `V147.4` 已完成：README、roadmap、索引与架构文档已同步

## 151. V148 single-build compact top-level unsupported gating

`V147` 收口后，compact single-build 顶层的 raw `build.assumptions` 已收紧到 `includeDetails=true`。

但 compact single-build 顶层结果仍默认携带原始 `build.unsupportedEffects`，而 `build.caveatSummary / build.summary` 已经齐全。

`V148` 只解决一件事：

1. 把 compact single-build 的顶层 `build.unsupportedEffects` 也移动到 `includeDetails=true`

### 151.1 分阶段

1. `V148.1` scope freeze
2. `V148.2` runtime/type contract alignment
3. `V148.3` tool assertion / prompt alignment
4. `V148.4` docs closeout

### 151.2 非目标

1. 不改变 `build.caveatSummary`
2. 不改变 `build.assumptionSummary`
3. 不改变 `build.assumptions / build.diagnostics / build.sourceNotes / build.trace / build.damageParams`

### 151.3 当前状态

- `V148.1` 已完成：冻结到 single-build compact top-level unsupported gating
- `V148.2` 已完成：默认 compact single-build 已不再携带顶层 `build.unsupportedEffects`
- `V148.3` 已完成：高层 `resolveBuildDamage` 测试与 prompt 已对齐 `includeDetails=true`
- `V148.4` 已完成：README、roadmap、索引与架构文档已同步

## 152. V149 skill-matrix compact top-level assumption gating

`V148` 收口后，compact single-build 顶层的 raw `build.unsupportedEffects` 已收紧到 `includeDetails=true`。

但 compact skill-matrix 顶层结果仍默认携带原始 `matrix.assumptions`，而 `matrix.summary.assumptionSummary / matrix.assumptionSummary / matrix.caveatSummary` 已经齐全。

`V149` 只解决一件事：

1. 把 compact skill-matrix 的顶层 `matrix.assumptions` 也移动到 `includeDetails=true`

### 152.1 分阶段

1. `V149.1` scope freeze
2. `V149.2` runtime/type contract alignment
3. `V149.3` tool assertion / prompt alignment
4. `V149.4` docs closeout

### 152.2 非目标

1. 不改变顶层 `matrix.unsupportedEffects`
2. 不改变 `matrix.assumptionSummary / matrix.caveatSummary`
3. 不改变行级 `row.assumptions / row.unsupportedEffects / row.diagnostics / row.sourceNotes / row.build`

### 152.3 当前状态

- `V149.1` 已完成：冻结到 skill-matrix compact top-level assumption gating
- `V149.2` 已完成：默认 compact skill-matrix 已不再携带顶层 `matrix.assumptions`
- `V149.3` 已完成：高层 `resolveBuildSkillMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V149.4` 已完成：README、roadmap、索引与架构文档已同步

## 153. V150 skill-matrix compact top-level unsupported gating

`V149` 收口后，compact skill-matrix 顶层的 raw `matrix.assumptions` 已收紧到 `includeDetails=true`。

但 compact skill-matrix 顶层结果仍默认携带原始 `matrix.unsupportedEffects`，而 `matrix.summary.caveatSummary / matrix.caveatSummary` 已经齐全。

`V150` 只解决一件事：

1. 把 compact skill-matrix 的顶层 `matrix.unsupportedEffects` 也移动到 `includeDetails=true`

### 153.1 分阶段

1. `V150.1` scope freeze
2. `V150.2` runtime/type contract alignment
3. `V150.3` tool assertion / prompt alignment
4. `V150.4` docs closeout

### 153.2 非目标

1. 不改变 `matrix.assumptionSummary`
2. 不改变 `matrix.caveatSummary`
3. 不改变 `matrix.assumptions / row.assumptions / row.unsupportedEffects / row.diagnostics / row.sourceNotes / row.build`

### 153.3 当前状态

- `V150.1` 已完成：冻结到 skill-matrix compact top-level unsupported gating
- `V150.2` 已完成：默认 compact skill-matrix 已不再携带顶层 `matrix.unsupportedEffects`
- `V150.3` 已完成：高层 `resolveBuildSkillMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V150.4` 已完成：README、roadmap、索引与架构文档已同步

## 154. V151 trigger-matrix compact top-level assumption gating

`V150` 收口后，compact skill-matrix 顶层的 raw `matrix.unsupportedEffects` 已收紧到 `includeDetails=true`。

但 compact trigger-matrix 顶层结果仍默认携带原始 `matrix.assumptions`，而 `matrix.summary.assumptionSummary / matrix.assumptionSummary / matrix.caveatSummary` 已经齐全。

`V151` 只解决一件事：

1. 把 compact trigger-matrix 的顶层 `matrix.assumptions` 也移动到 `includeDetails=true`

### 154.1 分阶段

1. `V151.1` scope freeze
2. `V151.2` runtime/type contract alignment
3. `V151.3` tool assertion / prompt alignment
4. `V151.4` docs closeout

### 154.2 非目标

1. 不改变 `matrix.caveatSummary`
2. 不改变 `matrix.assumptionSummary`
3. 不改变 `row.assumptions / row.requirements / row.diagnostics / row.sourceNotes / row.build`

### 154.3 当前状态

- `V151.1` 已完成：冻结到 trigger-matrix compact top-level assumption gating
- `V151.2` 已完成：默认 compact trigger-matrix 已不再携带顶层 `matrix.assumptions`
- `V151.3` 已完成：高层 `resolveBuildTriggerMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V151.4` 已完成：README、roadmap、索引与架构文档已同步

## 155. V152 source-damage-view compact top-level assumption gating

`V151` 收口后，compact trigger-matrix 顶层的 raw `matrix.assumptions` 已收紧到 `includeDetails=true`。

但 compact source-damage-view 顶层结果仍默认携带原始 `views.assumptions`，而 `views.summary.assumptionSummary / views.assumptionSummary / views.caveatSummary` 已经齐全。

`V152` 只解决一件事：

1. 把 compact source-damage-view 的顶层 `views.assumptions` 也移动到 `includeDetails=true`

### 155.1 分阶段

1. `V152.1` scope freeze
2. `V152.2` runtime/type contract alignment
3. `V152.3` tool assertion / prompt alignment
4. `V152.4` docs closeout

### 155.2 非目标

1. 不改变 `views.caveatSummary`
2. 不改变 `views.assumptionSummary`
3. 不改变 `entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes / entry.build`

### 155.3 当前状态

- `V152.1` 已完成：冻结到 source-damage-view compact top-level assumption gating
- `V152.2` 已完成：默认 compact source-damage-view 已不再携带顶层 `views.assumptions`
- `V152.3` 已完成：高层 `resolveBuildSourceDamageViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V152.4` 已完成：README、roadmap、索引与架构文档已同步

## 156. V153 source-utility-view compact top-level assumption gating

`V152` 收口后，compact source-damage-view 顶层的 raw `views.assumptions` 已收紧到 `includeDetails=true`。

但 compact source-utility-view 顶层结果仍默认携带原始 `views.assumptions`，而 `views.summary.assumptionSummary / views.assumptionSummary / views.caveatSummary` 已经齐全。

`V153` 只解决一件事：

1. 把 compact source-utility-view 的顶层 `views.assumptions` 也移动到 `includeDetails=true`

### 156.1 分阶段

1. `V153.1` scope freeze
2. `V153.2` runtime/type contract alignment
3. `V153.3` tool assertion / prompt alignment
4. `V153.4` docs closeout

### 156.2 非目标

1. 不改变 `views.caveatSummary`
2. 不改变 `views.assumptionSummary`
3. 不改变 `entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes`

### 156.3 当前状态

- `V153.1` 已完成：冻结到 source-utility-view compact top-level assumption gating
- `V153.2` 已完成：默认 compact source-utility-view 已不再携带顶层 `views.assumptions`
- `V153.3` 已完成：高层 `resolveBuildSourceUtilityViews` 测试与 prompt 已对齐 `includeDetails=true`
- `V153.4` 已完成：README、roadmap、索引与架构文档已同步

## 157. V154 source-entry compact top-level assumption gating

`V153` 收口后，standalone source-damage-view 与 source-utility-view 顶层的 raw `views.assumptions` 已都收紧到 `includeDetails=true`。

但 compact mixed `source-entry collection` 顶层结果仍默认携带原始 `collection.assumptions`，而 `collection.summary.assumptionSummary / collection.assumptionSummary / collection.caveatSummary` 已经齐全。

`V154` 只解决一件事：

1. 把 compact mixed `source-entry collection` 的顶层 `collection.assumptions` 也移动到 `includeDetails=true`

### 157.1 分阶段

1. `V154.1` scope freeze
2. `V154.2` runtime/type contract alignment
3. `V154.3` tool assertion / prompt alignment
4. `V154.4` docs closeout

### 157.2 非目标

1. 不改变 `collection.caveatSummary`
2. 不改变 `collection.assumptionSummary`
3. 不改变 `entry.assumptions / entry.requirements / entry.diagnostics / entry.sourceNotes / entry.build`

### 157.3 当前状态

- `V154.1` 已完成：冻结到 mixed source-entry collection compact top-level assumption gating
- `V154.2` 已完成：默认 compact mixed source-entry collection 已不再携带顶层 `collection.assumptions`
- `V154.3` 已完成：高层 `resolveBuildSourceEntries` 测试与 prompt 已对齐 `includeDetails=true`
- `V154.4` 已完成：README、roadmap、索引与架构文档已同步

## 158. V155 skill-matrix compact group assumption/unsupported gating

`V154` 收口后，compact `skill-matrix` 的顶层 `matrix.assumptions / matrix.unsupportedEffects` 与行级 `row.assumptions / row.unsupportedEffects` 已都按 `includeDetails=true` 收紧。

但 `compact matrix.summary.groups[*]` 仍原样透传组级 raw `assumptions / unsupportedEffects`，而组级 `assumptionSummary / caveatSummary` 已经齐全。

`V155` 只解决一件事：

1. 把 compact `skill-matrix summary.groups[*]` 的 raw `assumptions / unsupportedEffects` 也移动到 `includeDetails=true`

### 158.1 分阶段

1. `V155.1` scope freeze
2. `V155.2` runtime/type contract alignment
3. `V155.3` tool assertion / prompt alignment
4. `V155.4` docs closeout

### 158.2 非目标

1. 不改变顶层 `matrix.assumptionSummary / matrix.caveatSummary`
2. 不改变行级 `row.assumptions / row.unsupportedEffects`
3. 不改变非 compact 的原始 `matrix.summary.groups[*].assumptions / unsupportedEffects`

### 158.3 当前状态

- `V155.1` 已完成：冻结到 compact skill-matrix group raw assumption/unsupported gating
- `V155.2` 已完成：默认 compact `matrix.summary.groups[*]` 已不再携带 raw `assumptions / unsupportedEffects`
- `V155.3` 已完成：高层 `resolveBuildSkillMatrix` 测试与 prompt 已对齐 `includeDetails=true`
- `V155.4` 已完成：README、roadmap、索引与架构文档已同步

## 159. V156 explicit compact summary contracts

`V155` 收口后，compact contract 在 runtime 上已经比较干净。

但 `trigger-matrix`、`source-damage-view`、`source-utility-view` 与 mixed `source-entry collection` 的 compact `summary` 仍直接复用 raw summary type。当前虽然没有继续泄漏 raw 明细，但后续 raw summary 新增字段时，compact contract 仍可能被动扩张。

`V156` 只解决一件事：

1. 为这些 compact result 引入显式 summary / group compact types，并在 helper 中显式构造

### 159.1 分阶段

1. `V156.1` scope freeze
2. `V156.2` runtime/type contract alignment
3. `V156.3` tests / prompt alignment
4. `V156.4` docs closeout

### 159.2 非目标

1. 不改变任何 runtime 字段值
2. 不新增或删除现有 summary 字段
3. 不改变 `includeDetails` 语义

### 159.3 当前状态

- `V156.1` 已完成：冻结到 explicit compact summary contracts
- `V156.2` 已完成：trigger/source/source-entry compact summary 已改为显式 compact types
- `V156.3` 已完成：现有测试无需新增行为断言，类型与 runtime 校验已覆盖
- `V156.4` 已完成：README、roadmap、索引与架构文档已同步

## 160. V157 explicit compact row/entry summaries

`V156` 收口后，result-level compact `summary` 已不再直接复用 raw summary type。

但 compact row / entry 上的 `summary` 仍直接指向 raw summary type：单次 build、skill-matrix row、trigger-matrix row、source-damage-view entry 与 source-utility-view entry 都还存在同类风险。

`V157` 只解决一件事：

1. 把 compact row / entry 的 `summary` 也改成显式 compact type

### 160.1 分阶段

1. `V157.1` scope freeze
2. `V157.2` runtime/type contract alignment
3. `V157.3` tests / prompt alignment
4. `V157.4` docs closeout

### 160.2 非目标

1. 不改变任何 runtime summary 值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

### 160.3 当前状态

- `V157.1` 已完成：冻结到 explicit compact row/entry summaries
- `V157.2` 已完成：compact row / entry summary 已改为显式 compact types
- `V157.3` 已完成：现有测试与 runtime 校验已覆盖
- `V157.4` 已完成：roadmap、索引与架构文档已同步

## 161. V158 explicit compact skill-matrix summaries

`V157` 收口后，compact `skill-matrix` 的 `summary / summary.groups[*]` 仍在类型层半复用 raw summary type。

`V158` 只解决一件事：

1. 把 compact `skill-matrix summary / group summary` 改为显式 compact type

### 161.1 分阶段

1. `V158.1` scope freeze
2. `V158.2` runtime/type contract alignment
3. `V158.3` tests / prompt alignment
4. `V158.4` docs closeout

### 161.2 非目标

1. 不改变任何 runtime summary 值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

### 161.3 当前状态

- `V158.1` 已完成：冻结到 explicit compact skill-matrix summaries
- `V158.2` 已完成：compact skill-matrix `summary / group summary` 已改为显式 compact types
- `V158.3` 已完成：现有测试与 runtime 校验已覆盖
- `V158.4` 已完成：roadmap、索引与架构文档已同步

## 162. V159 explicit compact group summaries

`V158` 收口后，compact `trigger-matrix`、`source-damage-view`、`source-utility-view`、`source-entry collection` 的 `summary.groups[*]` 仍直接复用 raw group summary type。

`V159` 只解决一件事：

1. 把这些 compact `group summary` 改成显式 compact type

### 162.1 分阶段

1. `V159.1` scope freeze
2. `V159.2` runtime/type contract alignment
3. `V159.3` tests / prompt alignment
4. `V159.4` docs closeout

### 162.2 非目标

1. 不改变任何 runtime group summary 值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

### 162.3 当前状态

- `V159.1` 已完成：冻结到 explicit compact group summaries
- `V159.2` 已完成：上述 compact `group summary` 已改为显式 compact types
- `V159.3` 已完成：现有测试与 runtime 校验已覆盖
- `V159.4` 已完成：roadmap、索引与架构文档已同步

## 163. V160 explicit compact top-level summaries

`V159` 收口后，compact `trigger-matrix`、`source-damage-view`、`source-utility-view`、`source-entry collection` 的 top-level `summary` 仍在通过 `Omit<raw, "groups">` 复用 raw type。

`V160` 只解决一件事：

1. 把这些 compact top-level `summary` 改成显式 compact type

### 163.1 分阶段

1. `V160.1` scope freeze
2. `V160.2` runtime/type contract alignment
3. `V160.3` tests / prompt alignment
4. `V160.4` docs closeout

### 163.2 非目标

1. 不改变任何 runtime top-level summary 值
2. 不改变 `includeDetails` 语义
3. 不新增业务字段

### 163.3 当前状态

- `V160.1` 已完成：冻结到 explicit compact top-level summaries
- `V160.2` 已完成：上述 compact top-level `summary` 已改为显式 compact types
- `V160.3` 已完成：现有测试与 runtime 校验已覆盖
- `V160.4` 已完成：roadmap、索引与架构文档已同步

## 164. V161 explicit compact aggregate summaries

`V160` 收口后，compact result-level contract 里仍直接复用 raw aggregate summary type 的部分主要集中在：

- `diagnosticSummary`
- `sourceNoteSummary`
- `assumptionSummary`
- `caveatSummary`
- `entry caveatSummary`

`V161` 只解决一件事：

1. 把 compact 结果对象顶层的这些 aggregate summary 改成显式 compact type

### 164.1 分阶段

1. `V161.1` scope freeze
2. `V161.2` runtime/type contract alignment
3. `V161.3` tests / prompt alignment
4. `V161.4` docs closeout

### 164.2 非目标

1. 不改变 row / entry / group 上的 aggregate summary type
2. 不改变任何 aggregate summary 的字段值
3. 不改变 `includeDetails` 语义

### 164.3 当前状态

- `V161.1` 已完成：冻结到 explicit compact result-level aggregate summaries
- `V161.2` 已完成：compact 结果对象顶层的 aggregate summary 已改为显式 compact types
- `V161.3` 已完成：现有测试与 runtime 校验已覆盖
- `V161.4` 已完成：roadmap、索引与架构文档已同步

## 165. V162 explicit compact row and entry aggregate summaries

`V161` 收口后，compact contract 中仍直接复用 raw aggregate summary type 的剩余显式缺口主要集中在：

- `skill-matrix row`
- `trigger-matrix row`
- `source-damage-view entry`
- `source-utility-view entry`
- mixed `source-entry entry`

`V162` 只解决一件事：

1. 把上述 row / entry 级 aggregate summary 改成显式 compact type

### 165.1 分阶段

1. `V162.1` scope freeze
2. `V162.2` runtime/type contract alignment
3. `V162.3` tests / prompt alignment
4. `V162.4` docs closeout

### 165.2 非目标

1. 不改变 `summary / group` 上的 aggregate summary type
2. 不改变任何 aggregate summary 的字段值
3. 不改变 `includeDetails` 语义

### 165.3 当前状态

- `V162.1` 已完成：冻结到 explicit compact row / entry aggregate summaries
- `V162.2` 已完成：compact row / entry 的 aggregate summary 已改为显式 compact types
- `V162.3` 已完成：现有测试与 runtime 校验已覆盖
- `V162.4` 已完成：roadmap、索引与架构文档已同步

## 166. V163 explicit compact top-level summary aggregate summaries

`V162` 收口后，compact contract 中仍直接复用 raw aggregate summary type 的剩余显式缺口主要集中在：

- `skill-matrix summary`
- `trigger-matrix summary`
- `source-damage-views summary`
- `source-utility-views summary`
- `source-entry collection summary`

`V163` 只解决一件事：

1. 把上述 top-level `summary` 上的 aggregate summary 改成显式 compact type

### 166.1 分阶段

1. `V163.1` scope freeze
2. `V163.2` runtime/type contract alignment
3. `V163.3` tests / prompt alignment
4. `V163.4` docs closeout

### 166.2 非目标

1. 不改变 `group` 上的 aggregate summary type
2. 不改变任何 aggregate summary 的字段值
3. 不改变 `includeDetails` 语义

### 166.3 当前状态

- `V163.1` 已完成：冻结到 explicit compact top-level summary aggregate summaries
- `V163.2` 已完成：compact top-level `summary` 的 aggregate summary 已改为显式 compact types
- `V163.3` 已完成：现有测试与 runtime 校验已覆盖
- `V163.4` 已完成：roadmap、索引与架构文档已同步

## 167. V164 explicit compact group aggregate summaries

`V163` 收口后，compact contract 中仍直接复用 raw aggregate summary type 的最后一批显式缺口集中在：

- `skill-matrix group`
- `trigger-matrix group`
- `source-damage-view group`
- `source-utility-view group`
- `source-entry collection group`

`V164` 只解决一件事：

1. 把上述 `group` 上的 aggregate summary 改成显式 compact type

### 167.1 分阶段

1. `V164.1` scope freeze
2. `V164.2` runtime/type contract alignment
3. `V164.3` tests / prompt alignment
4. `V164.4` docs closeout

### 167.2 非目标

1. 不改变 aggregate summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 compact payload 的业务含义

### 167.3 当前状态

- `V164.1` 已完成：冻结到 explicit compact group aggregate summaries
- `V164.2` 已完成：compact `group` 的 aggregate summary 已改为显式 compact types
- `V164.3` 已完成：现有测试与 runtime 校验已覆盖
- `V164.4` 已完成：roadmap、索引与架构文档已同步

## 168. V165 explicit compact result-level requirement summaries

`V164` 收口后，compact contract 中下一批仍直接复用 raw summary type 的显式缺口主要集中在结果对象顶层的 requirement summaries：

- `skill-matrix result.requirementSummary`
- `trigger-matrix result.requirementSummary`
- `source-damage-views result.requirementSummary`
- `source-utility-views result.requirementSummary`
- `source-entry collection.sourceDamageRequirementSummary`
- `source-entry collection.sourceUtilityRequirementSummary`

`V165` 只解决一件事：

1. 把上述 result-level requirement summary 改成显式 compact type

### 168.1 分阶段

1. `V165.1` scope freeze
2. `V165.2` runtime/type contract alignment
3. `V165.3` tests / prompt alignment
4. `V165.4` docs closeout

### 168.2 非目标

1. 不改变 `summary / group / row / entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

### 168.3 当前状态

- `V165.1` 已完成：冻结到 explicit compact result-level requirement summaries
- `V165.2` 已完成：compact 结果对象顶层的 requirement summary 已改为显式 compact types
- `V165.3` 已完成：现有测试与 runtime 校验已覆盖
- `V165.4` 已完成：roadmap、索引与架构文档已同步

## 169. V166 explicit compact top-level summary requirement summaries

`V165` 收口后，compact contract 中下一批仍直接复用 raw requirement summary type 的显式缺口主要集中在 top-level `summary`：

- `skill-matrix summary.requirementSummary`
- `trigger-matrix summary.requirementSummary`
- `source-damage-views summary.requirementSummary`
- `source-utility-views summary.requirementSummary`
- `source-entry collection summary.sourceDamageRequirementSummary`
- `source-entry collection summary.sourceUtilityRequirementSummary`

`V166` 只解决一件事：

1. 把上述 top-level `summary` requirement summary 改成显式 compact type

### 169.1 分阶段

1. `V166.1` scope freeze
2. `V166.2` runtime/type contract alignment
3. `V166.3` tests / prompt alignment
4. `V166.4` docs closeout

### 169.2 非目标

1. 不改变 `group / row / entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

### 169.3 当前状态

- `V166.1` 已完成：冻结到 explicit compact top-level summary requirement summaries
- `V166.2` 已完成：compact top-level `summary` 的 requirement summary 已改为显式 compact types
- `V166.3` 已完成：现有测试与 runtime 校验已覆盖
- `V166.4` 已完成：roadmap、索引与架构文档已同步

## 170. V167 explicit compact group requirement summaries

`V166` 收口后，compact contract 中下一批仍直接复用 raw requirement summary type 的显式缺口主要集中在 `group`：

- `skill-matrix summary.groups[*].requirementSummary`
- `trigger-matrix summary.groups[*].requirementSummary`
- `source-damage-views summary.groups[*].requirementSummary`
- `source-utility-views summary.groups[*].requirementSummary`
- `source-entry collection summary.groups[*]` 上的：
  - `sourceDamageRequirementSummary`
  - `sourceUtilityRequirementSummary`

`V167` 只解决一件事：

1. 把上述 `group` requirement summary 改成显式 compact type

### 170.1 分阶段

1. `V167.1` scope freeze
2. `V167.2` runtime/type contract alignment
3. `V167.3` tests / prompt alignment
4. `V167.4` docs closeout

### 170.2 非目标

1. 不改变 `row / entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

### 170.3 当前状态

- `V167.1` 已完成：冻结到 explicit compact group requirement summaries
- `V167.2` 已完成：compact `group` 的 requirement summary 已改为显式 compact types
- `V167.3` 已完成：现有测试与 runtime 校验已覆盖
- `V167.4` 已完成：roadmap、索引与架构文档已同步

## 171. V168 explicit compact row requirement summaries

`V167` 收口后，compact contract 中下一批仍直接复用 raw requirement summary type 的显式缺口主要集中在 `row`：

- `skill-matrix row.requirementSummary`
- `trigger-matrix row.requirementSummary`

`V168` 只解决一件事：

1. 把上述 `row` requirement summary 改成显式 compact type

### 171.1 分阶段

1. `V168.1` scope freeze
2. `V168.2` runtime/type contract alignment
3. `V168.3` tests / prompt alignment
4. `V168.4` docs closeout

### 171.2 非目标

1. 不改变 `entry` 上的 requirement summary type
2. 不改变 requirement summary 的字段值
3. 不改变 `includeDetails` 语义

### 171.3 当前状态

- `V168.1` 已完成：冻结到 explicit compact row requirement summaries
- `V168.2` 已完成：compact `row` 的 requirement summary 已改为显式 compact types
- `V168.3` 已完成：现有测试与 runtime 校验已覆盖
- `V168.4` 已完成：roadmap、索引与架构文档已同步

## 172. V169 explicit compact entry requirement summaries

`V168` 收口后，compact contract 中最后一批仍直接复用 raw requirement summary type 的显式缺口集中在 `entry`：

- `source-damage-view entry.requirementSummary`
- `source-utility-view entry.requirementSummary`
- mixed `source-entry entry.requirementSummary`

`V169` 只解决一件事：

1. 把上述 `entry` requirement summary 改成显式 compact type

### 172.1 分阶段

1. `V169.1` scope freeze
2. `V169.2` runtime/type contract alignment
3. `V169.3` tests / prompt alignment
4. `V169.4` docs closeout

### 172.2 非目标

1. 不改变 requirement summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 compact payload 的业务含义

### 172.3 当前状态

- `V169.1` 已完成：冻结到 explicit compact entry requirement summaries
- `V169.2` 已完成：compact `entry` 的 requirement summary 已改为显式 compact types
- `V169.3` 已完成：现有测试与 runtime 校验已覆盖
- `V169.4` 已完成：roadmap、索引与架构文档已同步

## 173. V170 explicit compact result-level effect summaries

`V169` 收口后，compact contract 中下一批仍直接复用 raw item type 的显式缺口主要集中在结果对象顶层的 `effectSummary`：

- single-build `effectSummary`
- `skill-matrix result.effectSummary`
- `trigger-matrix result.effectSummary`
- `source-damage-views result.effectSummary`
- `source-utility-views result.effectSummary`
- `source-entry collection.effectSummary`

`V170` 只解决一件事：

1. 把上述 result-level `effectSummary` 改成显式 compact effect summary item types

### 173.1 分阶段

1. `V170.1` scope freeze
2. `V170.2` runtime/type contract alignment
3. `V170.3` tests / prompt alignment
4. `V170.4` docs closeout

### 173.2 非目标

1. 不改变 `summary / group / row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

### 173.3 当前状态

- `V170.1` 已完成：冻结到 explicit compact result-level effect summaries
- `V170.2` 已完成：compact 结果对象顶层的 effect summary 已改为显式 compact item types
- `V170.3` 已完成：现有测试与 runtime 校验已覆盖
- `V170.4` 已完成：roadmap、索引与架构文档已同步

## 174. V171 explicit compact top-level summary effect summaries

`V170` 收口后，compact contract 中下一批仍直接复用 raw effect summary item type 的显式缺口主要集中在 top-level `summary`：

- `skill-matrix summary.effectSummary`
- `trigger-matrix summary.effectSummary`
- `source-damage-views summary.effectSummary`
- `source-utility-views summary.effectSummary`
- `source-entry collection summary.effectSummary`

`V171` 只解决一件事：

1. 把上述 top-level `summary.effectSummary` 改成显式 compact effect summary item types

### 174.1 分阶段

1. `V171.1` scope freeze
2. `V171.2` runtime/type contract alignment
3. `V171.3` tests / prompt alignment
4. `V171.4` docs closeout

### 174.2 非目标

1. 不改变 `group / row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

### 174.3 当前状态

- `V171.1` 已完成：冻结到 explicit compact top-level summary effect summaries
- `V171.2` 已完成：compact top-level `summary.effectSummary` 已改为显式 compact item types
- `V171.3` 已完成：现有测试与 runtime 校验已覆盖
- `V171.4` 已完成：roadmap、索引与架构文档已同步

## 175. V172 explicit compact group effect summaries

`V171` 收口后，compact contract 中下一批仍直接复用 raw effect summary item type 的显式缺口主要集中在 `group`：

- `skill-matrix summary.groups[*].effectSummary`
- `trigger-matrix summary.groups[*].effectSummary`
- `source-damage-views summary.groups[*].effectSummary`
- `source-utility-views summary.groups[*].effectSummary`
- `source-entry collection summary.groups[*].effectSummary`

`V172` 只解决一件事：

1. 把上述 `group.effectSummary` 改成显式 compact effect summary item types

### 175.1 分阶段

1. `V172.1` scope freeze
2. `V172.2` runtime/type contract alignment
3. `V172.3` tests / prompt alignment
4. `V172.4` docs closeout

### 175.2 非目标

1. 不改变 `row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

### 175.3 当前状态

- `V172.1` 已完成：冻结到 explicit compact group effect summaries
- `V172.2` 已完成：compact `group.effectSummary` 已改为显式 compact item types
- `V172.3` 已完成：现有测试与 runtime 校验已覆盖
- `V172.4` 已完成：roadmap、索引与架构文档已同步

## 176. V173 explicit compact row and entry effect summaries

`V172` 收口后，compact contract 中最后一批仍直接复用 raw effect summary item type 的显式缺口主要集中在 `row / entry`：

- `trigger-matrix row.effectSummary`
- `source-damage-view entry.effectSummary`
- `source-utility-view entry.effectSummary`
- mixed `source-entry entry.effectSummary`

`V173` 只解决一件事：

1. 把上述 `row / entry.effectSummary` 改成显式 compact effect summary item types

### 176.1 分阶段

1. `V173.1` scope freeze
2. `V173.2` runtime/type contract alignment
3. `V173.3` tests / prompt alignment
4. `V173.4` docs closeout

### 176.2 非目标

1. 不改变 effect summary 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 result / summary / group 已完成的 effect summary contract

### 176.3 当前状态

- `V173.1` 已完成：冻结到 explicit compact row and entry effect summaries
- `V173.2` 已完成：compact `row / entry.effectSummary` 已改为显式 compact item types
- `V173.3` 已完成：现有测试与 runtime 校验已覆盖
- `V173.4` 已完成：roadmap、索引与架构文档已同步

## 177. V174 explicit compact summary group items

`V173` 收口后，compact contract 中仍直接复用 raw summary group item type 的显式缺口主要集中在 summary 内部的 group 数组：

- `build.summary.diagnosticGroups`
- `build.summary.sourceNoteGroups`
- `diagnosticSummary.kindGroups / ownerGroups`
- `sourceNoteSummary.statusGroups / ownerGroups`

`V174` 只解决一件事：

1. 把上述内部 group item 改成显式 compact group item types

### 177.1 分阶段

1. `V174.1` scope freeze
2. `V174.2` runtime/type contract alignment
3. `V174.3` tests / prompt alignment
4. `V174.4` docs closeout

### 177.2 非目标

1. 不改变这些 group item 的字段值
2. 不改变外层 `summary / diagnosticSummary / sourceNoteSummary` 的统计语义
3. 不改变 `includeDetails` 语义

### 177.3 当前状态

- `V174.1` 已完成：冻结到 explicit compact summary group items
- `V174.2` 已完成：compact summary 内部 group item 已改为显式 compact types
- `V174.3` 已完成：现有测试与 runtime 校验已覆盖
- `V174.4` 已完成：roadmap、索引与架构文档已同步

## 178. V175 explicit compact diagnostic/source-note detail entries

`V174` 收口后，compact contract 中仍直接复用 raw detail entry type 的显式缺口主要集中在 `diagnostics / sourceNotes`：

- single-build `diagnostics / sourceNotes`
- `skill-matrix row.diagnostics / sourceNotes`
- `trigger-matrix row.diagnostics / sourceNotes`
- `source-damage-view entry.diagnostics / sourceNotes`
- `source-utility-view entry.diagnostics / sourceNotes`
- mixed `source-entry entry.diagnostics / sourceNotes`

`V175` 只解决一件事：

1. 把上述 detail entry 改成显式 compact item types

### 178.1 分阶段

1. `V175.1` scope freeze
2. `V175.2` runtime/type contract alignment
3. `V175.3` tests / prompt alignment
4. `V175.4` docs closeout

### 178.2 非目标

1. 不改变这些 detail entry 的字段值
2. 不改变 `includeDetails` gating 语义
3. 不改变各类 `diagnosticSummary / sourceNoteSummary` 的聚合统计语义

### 178.3 当前状态

- `V175.1` 已完成：冻结到 explicit compact diagnostic/source-note detail entries
- `V175.2` 已完成：compact `diagnostics / sourceNotes` 已改为显式 compact item types
- `V175.3` 已完成：现有测试与 runtime 校验已覆盖
- `V175.4` 已完成：roadmap、索引与架构文档已同步

## 179. V176 explicit compact requirement detail entries

`V175` 收口后，compact contract 中仍直接复用 raw detail entry type 的显式缺口主要集中在 `requirements[]`：

- `trigger-matrix row.requirements`
- `source-damage-view entry.requirements`
- `source-utility-view entry.requirements`
- mixed `source-entry entry.requirements`

`V176` 只解决一件事：

1. 把上述 detail requirement entry 改成显式 compact item types

### 179.1 分阶段

1. `V176.1` scope freeze
2. `V176.2` runtime/type contract alignment
3. `V176.3` tests / prompt alignment
4. `V176.4` docs closeout

### 179.2 非目标

1. 不改变这些 requirement item 的字段值
2. 不改变 `includeDetails` gating 语义
3. 不改变现有 `requirementSummary` 聚合统计语义

### 179.3 当前状态

- `V176.1` 已完成：冻结到 explicit compact requirement detail entries
- `V176.2` 已完成：compact `requirements[]` 已改为显式 compact item types
- `V176.3` 已完成：现有测试与 runtime 校验已覆盖
- `V176.4` 已完成：roadmap、索引与架构文档已同步

## 180. V177 explicit compact single-build trace items

`V176` 收口后，compact contract 中仍直接复用 raw detail item type 的显式缺口优先级最高的是 single-build `trace`：

- compact single-build `trace[]`
- `trace[].modifiers[]`

`V177` 只解决一件事：

1. 把上述 trace item 改成显式 compact item types

### 180.1 分阶段

1. `V177.1` scope freeze
2. `V177.2` runtime/type contract alignment
3. `V177.3` tests / prompt alignment
4. `V177.4` docs closeout

### 180.2 非目标

1. 不改变 `trace` 的字段值
2. 不改变 `includeDetails` gating 语义
3. 不改变 row / entry 内 `build` 嵌套结果里仍保持 raw shape 的 contract

### 180.3 当前状态

- `V177.1` 已完成：冻结到 explicit compact single-build trace items
- `V177.2` 已完成：compact single-build `trace[]` 已改为显式 compact item types
- `V177.3` 已完成：现有测试与 runtime 校验已覆盖
- `V177.4` 已完成：roadmap、索引与架构文档已同步

## 181. V178 explicit compact resolved buckets

`V177` 收口后，compact contract 中下一处仍直接复用 raw build type 的稳定缺口是：

1. `CompactStaticBuildResult.resolvedBuckets`
2. `StaticBuildCompactSkillMatrixRow.resolvedBuckets`

`V178` 只解决一件事：

1. 把 compact single-build 与 compact skill-matrix row 上的 `resolvedBuckets` 改为显式 compact type

### 181.1 分阶段

1. `V178.1` scope freeze
2. `V178.2` runtime/type contract alignment
3. `V178.3` tests / prompt alignment
4. `V178.4` docs closeout

### 181.2 非目标

1. 不改变 `resolvedBuckets` 的字段值
2. 不改变 `resolvedPanel`
3. 不改变 `damageParams`
4. 不改变 `includeDetails` 语义

### 181.3 当前状态

- `V178.1` 已完成：冻结到 explicit compact resolved buckets
- `V178.2` 已完成：compact single-build 与 compact skill-matrix row 的 `resolvedBuckets` 已改为显式 compact type
- `V178.3` 已完成：现有测试与 runtime 校验已覆盖
- `V178.4` 已完成：roadmap、索引与架构文档已同步

## 182. V179 explicit compact resolved panel

`V178` 收口后，compact single-build 结果里仍直接复用 raw build type 的稳定缺口是：

1. `CompactStaticBuildResult.resolvedPanel`

`V179` 只解决这一件事：

1. 把 compact single-build 顶层的 `resolvedPanel` 改为显式 compact type

### 182.1 分阶段

1. `V179.1` scope freeze
2. `V179.2` runtime/type contract alignment
3. `V179.3` tests / prompt alignment
4. `V179.4` docs closeout

### 182.2 非目标

1. 不改变 `resolvedPanel` 的字段值
2. 不改变 `resolvedBuckets`
3. 不改变 `damageParams`
4. 不改变 `includeDetails` 语义

### 182.3 当前状态

- `V179.1` 已完成：冻结到 explicit compact resolved panel
- `V179.2` 已完成：compact single-build 的 `resolvedPanel` 已改为显式 compact type
- `V179.3` 已完成：现有测试与 runtime 校验已覆盖
- `V179.4` 已完成：roadmap、索引与架构文档已同步

## 183. V180 explicit compact damage params

`V179` 收口后，compact single-build 结果里仍直接复用 raw calculator type 的稳定缺口是：

1. `CompactStaticBuildResult.damageParams`

`V180` 只解决这一件事：

1. 把 compact single-build 顶层的 `damageParams` 及其嵌套参数改为显式 compact type

### 183.1 分阶段

1. `V180.1` scope freeze
2. `V180.2` runtime/type contract alignment
3. `V180.3` tests / prompt alignment
4. `V180.4` docs closeout

### 183.2 非目标

1. 不改变 `damageParams` 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 `resolvedPanel`
4. 不改变 `resolvedBuckets`

### 183.3 当前状态

- `V180.1` 已完成：冻结到 explicit compact damage params
- `V180.2` 已完成：compact single-build 的 `damageParams` 已改为显式 compact type
- `V180.3` 已完成：现有测试与 runtime 校验已覆盖
- `V180.4` 已完成：roadmap、索引与架构文档已同步

## 184. V181 explicit compact damage results

`V180` 收口后，compact single-build 结果里仍直接复用 raw calculator result type 的稳定缺口是：

1. `CompactStaticBuildResult.damage`

`V181` 只解决这一件事：

1. 把 compact single-build 顶层的 `damage.expected / crit / noCrit` 及其 `breakdown` 改为显式 compact type

### 184.1 分阶段

1. `V181.1` scope freeze
2. `V181.2` runtime/type contract alignment
3. `V181.3` tests / prompt alignment
4. `V181.4` docs closeout

### 184.2 非目标

1. 不改变 `damage` 的字段值
2. 不改变 `damageParams`
3. 不改变 `resolvedPanel`
4. 不改变 `resolvedBuckets`

### 184.3 当前状态

- `V181.1` 已完成：冻结到 explicit compact damage results
- `V181.2` 已完成：compact single-build 的 `damage.expected / crit / noCrit` 已改为显式 compact type
- `V181.3` 已完成：现有测试与 runtime 校验已覆盖
- `V181.4` 已完成：roadmap、索引与架构文档已同步

## 185. V182 explicit compact loadout

`V181` 收口后，compact single-build 结果里仍直接复用 raw build loadout type 的稳定缺口是：

1. `CompactStaticBuildResult.loadout`

`V182` 只解决这一件事：

1. 把 compact single-build 顶层的 `loadout` 改为显式 compact type

### 185.1 分阶段

1. `V182.1` scope freeze
2. `V182.2` runtime/type contract alignment
3. `V182.3` tests / prompt alignment
4. `V182.4` docs closeout

### 185.2 非目标

1. 不改变 `loadout` 的字段值
2. 不改变 `profile`
3. 不改变 `damage`
4. 不改变 `includeDetails` 语义

### 185.3 当前状态

- `V182.1` 已完成：冻结到 explicit compact loadout
- `V182.2` 已完成：compact single-build 的 `loadout` 已改为显式 compact type
- `V182.3` 已完成：现有测试与 runtime 校验已覆盖
- `V182.4` 已完成：roadmap、索引与架构文档已同步

## 186. V183 explicit compact single-build header

`V182` 收口后，compact single-build 结果里仍直接复用 raw single-build header type 的稳定缺口是：

1. `CompactStaticBuildResult.profile`
2. `CompactStaticBuildResult.mode`
3. `CompactStaticBuildResult.manualBaseMode`

`V183` 只解决这一件事：

1. 把 compact single-build 顶层的 `profile / mode / manualBaseMode` 改为显式 compact type

### 186.1 分阶段

1. `V183.1` scope freeze
2. `V183.2` runtime/type contract alignment
3. `V183.3` tests / prompt alignment
4. `V183.4` docs closeout

### 186.2 非目标

1. 不改变 `profile / mode / manualBaseMode` 的字段值
2. 不改变 `loadout`
3. 不改变 `damage`
4. 不改变 `includeDetails` 语义

### 186.3 当前状态

- `V183.1` 已完成：冻结到 explicit compact single-build header
- `V183.2` 已完成：compact single-build 的 `profile / mode / manualBaseMode` 已改为显式 compact type
- `V183.3` 已完成：现有测试与 runtime 校验已覆盖
- `V183.4` 已完成：roadmap、索引与架构文档已同步

## 187. V184 explicit compact matrix result headers

`V183` 收口后，compact matrix result 顶层仍直接复用 raw header type 的稳定缺口是：

1. `CompactStaticBuildSkillMatrixResult.profile / mode / manualBaseMode / loadout`
2. `CompactStaticBuildTriggerMatrixResult.profile / mode / manualBaseMode / loadout`

`V184` 只解决这一件事：

1. 把 compact `skill-matrix / trigger-matrix` 顶层的 `profile / mode / manualBaseMode / loadout` 改为显式 compact type

### 187.1 分阶段

1. `V184.1` scope freeze
2. `V184.2` runtime/type contract alignment
3. `V184.3` tests / prompt alignment
4. `V184.4` docs closeout

### 187.2 非目标

1. 不改变 `rows` 的字段值
2. 不改变 `summary`
3. 不改变 `includeDetails` 语义
4. 不改变 standalone source views

### 187.3 当前状态

- `V184.1` 已完成：冻结到 explicit compact matrix result headers
- `V184.2` 已完成：compact `skill-matrix / trigger-matrix` 顶层 header 已改为显式 compact type
- `V184.3` 已完成：现有测试与 runtime 校验已覆盖
- `V184.4` 已完成：roadmap、索引与架构文档已同步

## 188. V185 explicit compact source-view result headers

`V184` 收口后，compact source-view result 顶层仍直接复用 raw header type 的稳定缺口是：

1. `CompactStaticBuildSourceDamageViewsResult.mode / manualBaseMode / loadout`
2. `CompactStaticBuildSourceUtilityViewsResult.loadout`
3. `CompactStaticBuildSourceEntryCollection.loadout`

`V185` 只解决这一件事：

1. 把 compact `source-damage-views / source-utility-views / source-entry collection` 顶层的 `mode / manualBaseMode / loadout` 改为显式 compact type

### 188.1 分阶段

1. `V185.1` scope freeze
2. `V185.2` runtime/type contract alignment
3. `V185.3` tests / prompt alignment
4. `V185.4` docs closeout

### 188.2 非目标

1. 不改变 `entries` 的字段值
2. 不改变 `summary`
3. 不改变 entry-level metadata
4. 不改变 `includeDetails` 语义

### 188.3 当前状态

- `V185.1` 已完成：冻结到 explicit compact source-view result headers
- `V185.2` 已完成：compact source-view 顶层 header 已改为显式 compact type
- `V185.3` 已完成：现有测试与 runtime 校验已覆盖
- `V185.4` 已完成：roadmap、索引与架构文档已同步

## 189. V186 explicit compact source-view entry metadata

`V185` 收口后，compact source-view entry 里仍直接复用 raw metadata type 的稳定缺口是：

1. `StaticBuildCompactSourceDamageViewEntry.metadata`
2. `StaticBuildCompactSourceUtilityViewEntry.metadata`

`V186` 只解决这一件事：

1. 把 compact `source-damage-view / source-utility-view` entry 的 `metadata` 改为显式 compact type

### 189.1 分阶段

1. `V186.1` scope freeze
2. `V186.2` runtime/type contract alignment
3. `V186.3` tests / prompt alignment
4. `V186.4` docs closeout

### 189.2 非目标

1. 不改变 entry 的字段值
2. 不改变 entry `summary`
3. 不改变 entry `damage`
4. 不改变 `includeDetails` 语义

### 189.3 当前状态

- `V186.1` 已完成：冻结到 explicit compact source-view entry metadata
- `V186.2` 已完成：compact source-view entry metadata 已改为显式 compact type
- `V186.3` 已完成：现有测试与 runtime 校验已覆盖
- `V186.4` 已完成：roadmap、索引与架构文档已同步

## 190. V187 explicit compact skill-matrix row metadata

`V186` 收口后，compact `skill-matrix` row 里仍直接复用 raw metadata type 的稳定缺口是：

1. `StaticBuildCompactSkillMatrixRow.metadata`

`V187` 只解决这一件事：

1. 把 compact `skill-matrix row.metadata` 改为显式 compact type

### 190.1 分阶段

1. `V187.1` scope freeze
2. `V187.2` runtime/type contract alignment
3. `V187.3` tests / prompt alignment
4. `V187.4` docs closeout

### 190.2 非目标

1. 不改变 row 的字段值
2. 不改变 `row.summary`
3. 不改变 `row.resolvedBuckets`
4. 不改变 `includeDetails` 语义

### 190.3 当前状态

- `V187.1` 已完成：冻结到 explicit compact skill-matrix row metadata
- `V187.2` 已完成：compact `skill-matrix row.metadata` 已改为显式 compact type
- `V187.3` 已完成：现有测试与 runtime 校验已覆盖
- `V187.4` 已完成：roadmap、索引与架构文档已同步

## 191. V188 explicit compact trigger row metadata

`V187` 收口后，compact `trigger-matrix` row 里仍直接复用 raw metadata type 的稳定缺口是：

1. `StaticBuildCompactTriggerMatrixRow.metadata`

`V188` 只解决这一件事：

1. 把 compact `trigger-matrix row.metadata` 改为显式 compact type

### 191.1 分阶段

1. `V188.1` scope freeze
2. `V188.2` runtime/type contract alignment
3. `V188.3` tests / prompt alignment
4. `V188.4` docs closeout

### 191.2 非目标

1. 不改变 row 的字段值
2. 不改变 `row.summary`
3. 不改变 `row.damage`
4. 不改变 `includeDetails` 语义

### 191.3 当前状态

- `V188.1` 已完成：冻结到 explicit compact trigger row metadata
- `V188.2` 已完成：compact `trigger-matrix row.metadata` 已改为显式 compact type
- `V188.3` 已完成：现有测试与 runtime 校验已覆盖
- `V188.4` 已完成：roadmap、索引与架构文档已同步

## 192. V189 explicit compact entry damage summaries

`V188` 收口后，compact entry 级结果里仍直接复用 raw damage summary shape 的稳定缺口是：

1. `StaticBuildCompactTriggerMatrixRow.damage`
2. `StaticBuildCompactSourceDamageViewEntry.damage`

`V189` 只解决这一件事：

1. 把 compact `trigger-row / source-damage-view entry` 的 `damage` 改为显式 compact type

### 192.1 分阶段

1. `V189.1` scope freeze
2. `V189.2` runtime/type contract alignment
3. `V189.3` tests / prompt alignment
4. `V189.4` docs closeout

### 192.2 非目标

1. 不改变 `damage` 的字段值
2. 不改变 `summary`
3. 不改变 `build`
4. 不改变 `includeDetails` 语义

### 192.3 当前状态

- `V189.1` 已完成：冻结到 explicit compact entry damage summaries
- `V189.2` 已完成：compact entry `damage` 已改为显式 compact type
- `V189.3` 已完成：现有测试与 runtime 校验已覆盖
- `V189.4` 已完成：roadmap、索引与架构文档已同步

## 193. V190 explicit compact nested build details

`V189` 收口后，compact `includeDetails` 路径里仍直接复用 raw single-build result 的稳定缺口是：

1. `StaticBuildCompactSkillMatrixRow.build`
2. `StaticBuildCompactTriggerMatrixRow.build`
3. `StaticBuildCompactSourceDamageViewEntry.build`

`V190` 只解决这一件事：

1. 把 compact `includeDetails.build` 改为 nested compact build

### 193.1 分阶段

1. `V190.1` scope freeze
2. `V190.2` runtime/type contract alignment
3. `V190.3` tests / prompt alignment
4. `V190.4` docs closeout

### 193.2 非目标

1. 不改变 `build` 的字段值
2. 不改变 `includeDetails` 开关语义
3. 不改变 `summary`
4. 不改变 row / entry 的非 `build` 字段

### 193.3 当前状态

- `V190.1` 已完成：冻结到 explicit compact nested build details
- `V190.2` 已完成：compact nested `build` 已改为显式 compact build
- `V190.3` 已完成：现有测试与 runtime 校验已覆盖
- `V190.4` 已完成：roadmap、索引与架构文档已同步

## 194. V191 explicit compact source utility view contracts

`V190` 收口后，compact `source-utility-view` contract 中仍直接复用 raw entry enum/summary shape 的稳定缺口集中在：

1. `StaticBuildCompactSourceUtilityViewEntry.sourceType`
2. `StaticBuildCompactSourceUtilityViewEntry.utilityType`
3. `StaticBuildCompactSourceUtilityViewEntry.resolutionMode`
4. `StaticBuildCompactSourceUtilityViewEntry.targetScope`
5. `StaticBuildCompactSourceUtilityViewEntry.unit`
6. `CompactStaticBuildSourceUtilityViewEntrySummary`
7. `CompactStaticBuildSourceUtilityViewMeta`

`V191` 只解决这一件事：

1. 把 compact `source-utility-view` 的 entry/meta/summary 改为显式 compact types

### 194.1 分阶段

1. `V191.1` scope freeze
2. `V191.2` runtime/type contract alignment
3. `V191.3` tests / prompt alignment
4. `V191.4` docs closeout

### 194.2 非目标

1. 不改变 utility entry 的字段值
2. 不改变 `includeDetails` 语义
3. 不改变 source-damage-view / skill-matrix / trigger-matrix 的 metadata contract
4. 不改变 runtime 生成逻辑

### 194.3 当前状态

- `V191.1` 已完成：冻结到 explicit compact source utility view contracts
- `V191.2` 已完成：compact `source-utility-view` 的 entry/meta/summary 已改为显式 compact types
- `V191.3` 已完成：现有测试与 runtime 校验已覆盖
- `V191.4` 已完成：roadmap、索引与架构文档已同步

## 195. V192 explicit compact source damage view contracts

`V191` 收口后，compact `source-damage-view` contract 中仍直接复用 raw entry enum shape 的稳定缺口集中在：

1. `StaticBuildCompactSourceDamageViewEntry.sourceType`
2. `StaticBuildCompactSourceDamageViewEntry.damageType`
3. `StaticBuildCompactSourceDamageViewEntry.resolutionMode`
4. `CompactStaticBuildSourceDamageViewMeta`

`V192` 只解决这一件事：

1. 把 compact `source-damage-view` 的 entry/meta 改为显式 compact types

### 195.1 分阶段

1. `V192.1` scope freeze
2. `V192.2` runtime/type contract alignment
3. `V192.3` tests / prompt alignment
4. `V192.4` docs closeout

### 195.2 非目标

1. 不改变 damage entry 的字段值
2. 不改变 `damage / summary / build`
3. 不改变 `includeDetails` 语义
4. 不改变 trigger-matrix metadata contract

### 195.3 当前状态

- `V192.1` 已完成：冻结到 explicit compact source damage view contracts
- `V192.2` 已完成：compact `source-damage-view` 的 entry/meta 已改为显式 compact types
- `V192.3` 已完成：现有测试与 runtime 校验已覆盖
- `V192.4` 已完成：roadmap、索引与架构文档已同步

## 196. V193 explicit compact trigger row metadata sources

`V192` 收口后，compact `trigger-matrix row.metadata` 中仍直接复用 raw metadata enum/source shape 的稳定缺口是：

1. `entryKind`
2. `templateSource`
3. `damageType`
4. `sourceType`
5. `sourceViewResolutionMode`

`V193` 只解决这一件事：

1. 把 compact `trigger-matrix row.metadata` 改为显式 compact metadata contract

### 196.1 分阶段

1. `V193.1` scope freeze
2. `V193.2` runtime/type contract alignment
3. `V193.3` tests / prompt alignment
4. `V193.4` docs closeout

### 196.2 非目标

1. 不改变 row 值
2. 不改变 `summary / damage / build`
3. 不改变 `includeDetails` 语义
4. 不改变 skill-matrix row metadata contract

### 196.3 当前状态

- `V193.1` 已完成：冻结到 explicit compact trigger row metadata sources
- `V193.2` 已完成：compact `trigger-matrix row.metadata` 已改为显式 compact metadata contract
- `V193.3` 已完成：现有测试与 runtime 校验已覆盖
- `V193.4` 已完成：roadmap、索引与架构文档已同步

## 197. V194 explicit compact skill row metadata sources

`V193` 收口后，compact `skill-matrix row` 中仍直接复用 raw row / metadata enum shape 的稳定缺口集中在：

1. `StaticBuildCompactSkillMatrixRow.damageType`
2. `CompactStaticBuildSkillMatrixRowMeta.templateSource`
3. `CompactStaticBuildSkillMatrixRowMeta.attributeSource`
4. `CompactStaticBuildSkillMatrixRowMeta.entryType`
5. `CompactStaticBuildSkillMatrixRowMeta.aggregationType`
6. `CompactStaticBuildSkillMatrixRowMeta.variantAxis`
7. `CompactStaticBuildSkillMatrixRowMeta.targetSize`

`V194` 只解决这一件事：

1. 把 compact `skill-matrix row` 的结构语义字段改为显式 compact types

### 197.1 分阶段

1. `V194.1` scope freeze
2. `V194.2` runtime/type contract alignment
3. `V194.3` tests / prompt alignment
4. `V194.4` docs closeout

### 197.2 非目标

1. 不改变 row 值
2. 不改变 `attribute / skillTag / skillMultiplier`
3. 不改变 `summary / damage / build`
4. 不改变 `includeDetails` 语义

### 197.3 当前状态

- `V194.1` 已完成：冻结到 explicit compact skill row metadata sources
- `V194.2` 已完成：compact `skill-matrix row` 的结构语义字段已改为显式 compact types
- `V194.3` 已完成：现有测试与 runtime 校验已覆盖
- `V194.4` 已完成：roadmap、索引与架构文档已同步

## 198. V195 explicit compact detail source types

`V194` 收口后，compact detail entry 中仍直接复用 raw `sourceType` 的稳定缺口集中在：

1. `CompactStaticBuildDiagnosticEntry.sourceType`
2. `CompactStaticBuildSourceNoteEntry.sourceType`
3. `CompactStaticBuildTraceItem.sourceType`

`V195` 只解决这一件事：

1. 把 compact `diagnostic / source-note / trace` 三类 detail entry 的 `sourceType` 统一改为显式 compact source type

### 198.1 分阶段

1. `V195.1` scope freeze
2. `V195.2` runtime/type contract alignment
3. `V195.3` tests / prompt alignment
4. `V195.4` docs closeout

### 198.2 非目标

1. 不改变 `kind / owner / status / guidance / trace status`
2. 不改变 entry 值
3. 不改变 summary 结构
4. 不改变 runtime 生成逻辑

### 198.3 当前状态

- `V195.1` 已完成：冻结到 explicit compact detail source types
- `V195.2` 已完成：compact detail entry 的 `sourceType` 已统一为显式 compact source type
- `V195.3` 已完成：现有测试与 runtime 校验已覆盖
- `V195.4` 已完成：roadmap、索引与架构文档已同步

## 199. V196 explicit compact base damage stat summaries

`V195` 收口后，compact header/summary 里仍直接复用 raw `baseDamageStat` 的稳定缺口剩下两处：

1. `CompactStaticBuildResolveSummary.baseDamageStat`
2. `CompactStaticBuildSkillMatrixSummary.baseDamageStat`

`V196` 只解决这一件事：

1. 把 compact summary 层的 `baseDamageStat` 统一改为显式 compact type

### 199.1 分阶段

1. `V196.1` scope freeze
2. `V196.2` runtime/type contract alignment
3. `V196.3` tests / prompt alignment
4. `V196.4` docs closeout

### 199.2 非目标

1. 不改变 `baseDamageStat` 的值域
2. 不改变 `resolvedPanel.baseDamageStat`
3. 不改变其他 summary 字段
4. 不改变 runtime 生成逻辑

### 199.3 当前状态

- `V196.1` 已完成：冻结到 explicit compact base damage stat summaries
- `V196.2` 已完成：compact summary 层的 `baseDamageStat` 已统一为显式 compact type
- `V196.3` 已完成：现有测试与 runtime 校验已覆盖
- `V196.4` 已完成：roadmap、索引与架构文档已同步

## 174. V171 explicit compact top-level summary effect summaries

`V170` 收口后，compact contract 中下一批仍直接复用 raw effect summary item type 的显式缺口主要集中在 top-level `summary`：

- `skill-matrix summary.effectSummary`
- `trigger-matrix summary.effectSummary`
- `source-damage-views summary.effectSummary`
- `source-utility-views summary.effectSummary`
- `source-entry collection summary.effectSummary`

`V171` 只解决一件事：

1. 把上述 top-level `summary.effectSummary` 改成显式 compact effect summary item types

### 174.1 分阶段

1. `V171.1` scope freeze
2. `V171.2` runtime/type contract alignment
3. `V171.3` tests / prompt alignment
4. `V171.4` docs closeout

### 174.2 非目标

1. 不改变 `group / row / entry` 上的 effect summary type
2. 不改变 effect summary 的字段值
3. 不改变 `includeDetails` 语义

### 174.3 当前状态

- `V171.1` 已完成：冻结到 explicit compact top-level summary effect summaries
- `V171.2` 已完成：compact top-level `summary.effectSummary` 已改为显式 compact item types
- `V171.3` 已完成：现有测试与 runtime 校验已覆盖
- `V171.4` 已完成：roadmap、索引与架构文档已同步
