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
- 当前边界：`resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`

## 2. 阶段划分

已完成主线：

1. `V2.1 curated coverage`
2. `V2.2 matrix metadata refinement`
3. `V3 anomaly / disorder`
4. `V4 progression-aware resolver`
5. `V5 source-aware dynamic snapshot context`

当前 `V44 source-entry collection aggregates` 已完成，`V45 source-view summary aggregates` 也已在当前 contract 下收口。

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
