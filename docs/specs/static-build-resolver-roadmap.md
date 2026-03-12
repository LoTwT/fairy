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
- 当前边界：`resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`

## 2. 阶段划分

已完成主线：

1. `V2.1 curated coverage`
2. `V2.2 matrix metadata refinement`
3. `V3 anomaly / disorder`
4. `V4 progression-aware resolver`
5. `V5 source-aware dynamic snapshot context`

当前下一主线切换为 `V7 resolved snapshot overrides`。

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

`V7.3` 已完成第一批来源迁移：

- `柏妮思` 影画 6 的 `25% 火抗无视` 已改为可通过 `scenario.resolvedSnapshot.bucketDeltas.ignoreResistance` 显式提供
- 特殊 `[余烬]` 与额外 `[灼烧]` 结算仍保留在 assumptions

下一步继续 `V7.3` 后续批次，挑选更多高价值来源把剩余 assumptions 迁移到 `resolvedSnapshot`。
