# 静态构筑解析与伤害计算系统设计

## 1. 定位

本系统用于把：

- 代理人
- 音擎
- 驱动盘
- 面板
- 敌人/模式上下文
- 当前视为生效的效果

解析为可直接输入伤害计算器的结构化参数。

系统定位为：

- 静态构筑解析系统
- 结构化效果系统
- 可热插拔的乘区管线系统

系统**不是**：

- 战斗模拟器
- 覆盖率模拟器
- 循环模拟器
- 自动全文本理解系统

---

## 2. 要解决的问题

当前项目中：

- 伤害公式本身已经结构化
- 但代理人 / 音擎 / 驱动盘效果仍大量以文本形式存在
- LLM 需要从文本中提取乘区、判断条件、生效与否
- 用户也难以判断哪些数值已体现在面板中，哪些应额外计算

因此需要新增一层静态解析系统，把“文本描述的效果”收敛为结构化的效果定义，再根据当前场景解析出最终计算参数。

---

## 3. 系统边界

### 3.1 输入

- 构筑信息
- 面板信息
- 计算场景
- 效果激活状态

### 3.2 输出

- 最终用于计算的面板快照
- 当前生效的结构化效果列表
- 聚合后的各乘区 bucket
- 最终伤害计算输入参数
- 结果 trace / 假设 / 未支持项

### 3.3 不做的内容

- 不模拟时间轴
- 不模拟触发概率
- 不模拟技能循环
- 不模拟能量、控制、回复等非伤害主题
- 不自动从所有原始文本中全量提取结构化效果

---

## 4. 总体设计原则

1. 静态优先，不做动态模拟
2. 显式优先，不隐式猜测
3. 可审计优先，不输出黑盒结果
4. 面板与战斗效果严格分离，避免重复计算
5. 默认公式可复用，但必须允许局部热插拔
6. 对用户和 LLM 提供统一、稳定、可复现的输入输出 contract

---

## 5. 计算模式

系统需要支持三种静态计算模式：

### 5.1 `baseline`

- 只计算明确常驻、明确应纳入当前状态的效果
- 适合作为默认模式
- 结果最保守、最稳

### 5.2 `full-buff`

- 按理论满状态 / 满覆盖计算
- 默认所有可启用效果视为生效
- 层数取满或取预设高值
- 适合查看理论上限

### 5.3 `manual`

- 用户或上层工具显式指定开关、层数和部分条件
- 结果最灵活
- 适合精细分析

**默认建议**：

- 系统默认使用 `baseline`
- `full-buff` 必须显式选择
- `manual` 用于覆盖默认行为

---

## 6. 输入 contract

系统输入由四部分组成。

### 6.1 `loadout`

描述当前带了什么。

最小字段建议：

- `agentId`
- `wEngineId`
- `driveDiscSetIds`
- `agentProgression`
  - `level`
  - `promotion`
  - `coreSkillLevel`
  - `mindscape`
- `wEngineProgression`
  - `level`
  - `star`
  - `refinement`

作用：

- 决定可用的结构化效果定义
- 决定效果数值随等级、精炼、影画等如何变化

### 6.2 `panel`

表示面板从哪里来。

需要支持两种输入模式：

#### `finalPanel`

用户直接给最终面板。

建议字段：

- `attack`
- `critRate`
- `critDamage`
- `anomalyProficiency`
- `penetrationRate`
- `penetrationValue`
- 其他必要最终面板

这是系统的主路径。

#### `derivedPanel`

系统根据构筑和基础规则推导面板。

适用场景：

- 快速估算
- 基础验证

限制：

- 不保证精确反映真实实战面板
- 若用户已提供 `finalPanel`，则不应再重复推导

### 6.3 `scenario`

表示本次计算发生在什么静态场景。

最小字段建议：

- `damageType`
  - `normal`
  - `sheer`
  - `anomaly`
  - `disorder`
- `attribute`
- `skillGroup` 或 `skillId`
- `targetState`
  - `isStunned`
- `enemyContext`
  - 来源于 `lookupGameMode` / cleaned helper
- `modeContext`
  - DA / SD / TS / side / node / wave

### 6.4 `effectState`

表示哪些效果当前视为生效。

建议支持两种状态：

#### 布尔激活

- `enabled: true/false`

#### 参数化激活

- `stacks`
- `selectedSkill`
- `selectedAttribute`
- `isStunned`
- 其他静态条件参数

---

## 7. 效果系统设计

### 7.1 系统名称

建议使用：

- `effect system`

而不是：

- `agent buff system`

原因：

- 效果来源不只代理人
- 不只包含 buff，也包含 debuff、敌人修正、模式修正

### 7.2 效果来源

效果来源至少包括：

- 代理人本体
- 核心技
- 影画
- 音擎
- 驱动盘
- 敌人 / 模式上下文

### 7.3 效果类型

至少分为三类：

#### `panel effects`

修改面板本身。

例如：

- 攻击%
- 固定攻击
- 暴击率
- 暴伤
- 异常精通
- 穿透率
- 穿透值

#### `combat effects`

直接影响伤害公式。

例如：

- 增伤
- 易伤
- 减抗
- 减防
- 失衡易伤
- 异常增伤
- 特殊乘区

#### `context effects`

来源于敌人或模式上下文。

例如：

- 敌人抗性
- side multiplier
- 游戏模式倍率
- boss 特殊修正

### 7.4 重复计算的硬规则

这是系统的关键约束：

1. 若用户输入的是 `finalPanel`，则已计入面板的 `panel effects` 默认不得再次叠加
2. `panel effects` 与 `combat effects` 必须分离
3. 系统必须能够标识：
   - 已在面板中
   - 未在面板中
   - 只在战斗计算中额外生效

否则会出现重复计算。

### 7.5 效果定义最小字段

每条结构化效果至少应具备以下语义：

- `sourceType`
- `sourceId`
- `sourceName`
- `effectId`
- `effectName`
- `effectKind`
- `targetScope`
- `appliesTo`
- `condition`
- `activationType`
- `stackRule`
- `value`
- `sourceTextRef`
- `notes`

### 7.6 适用范围 `appliesTo`

至少能表达：

- 全局
- 某技能组
- 某技能
- 某属性
- 某伤害类型
- 某目标状态
- 某场景标签

---

## 8. 热插拔乘区管线设计

### 8.1 问题背景

标准伤害乘区框架总体固定，但部分代理人会出现：

- 取消某个标准乘区
- 替换某个标准乘区
- 新增专属乘区
- 在标准顺序中插入额外乘区

因此系统不能把公式写死为单一固定链路。

### 8.2 设计目标

将公式抽象为可插拔的 `pipeline profile`。

系统需要有：

- 默认管线
- 若干代理人专属或伤害类型专属管线配置

### 8.3 默认 slot 概念

默认管线可抽象为概念 slot：

- `base`
- `bonus`
- `crit`
- `defense`
- `resistance`
- `vulnerability`
- `daze`
- `special`

异常 / 紊乱 / 贯穿则可在默认管线上衍生。

### 8.4 必须支持的热插拔操作

系统至少需要支持：

#### `disable slot`

禁用某个标准乘区。

#### `replace slot`

用专属逻辑替换标准乘区。

#### `insert slot`

在某个 slot 前后插入新乘区。

#### `reorder slot`

仅在确有需要时调整顺序。

### 8.5 `pipeline profile` 最小能力

每个 profile 至少应能声明：

- 基于哪个默认 profile
- 关闭哪些标准 slot
- 替换哪些 slot
- 插入哪些新 slot
- 每个 slot 的输入来源
- 每个 slot 的激活条件

### 8.6 输出要求

对于热插拔后的管线，系统必须输出：

- 最终 slot 顺序
- 每个 slot 的名称
- 每个 slot 的数值
- 每个 slot 的来源
- 被禁用或替换的标准 slot

否则会形成黑盒结果。

---

## 9. 输出 contract

系统输出不应只有最终伤害值，至少应包含：

### 9.1 `resolvedPanel`

最终参与计算的面板快照。

### 9.2 `activeEffects`

当前实际纳入计算的结构化效果列表。

### 9.3 `resolvedBuckets`

各乘区聚合后的结构化 bucket。

例如：

- 攻击
- 暴击率
- 暴伤
- 增伤
- 减抗
- 减防
- 失衡易伤
- 异常相关参数
- 专属乘区

### 9.4 `damageParams`

最终可直接输入伤害计算器的参数。

### 9.5 `trace`

必须说明：

- 每个 bucket 从哪里来
- 哪些效果被纳入
- 哪些效果被排除
- 为什么排除
- 使用了哪条 pipeline profile

### 9.6 `assumptions`

当前计算依赖的静态假设。

### 9.7 `sourceNotes`

anomaly / disorder 的高价值来源说明。

要求：

- 结构化区分 `finalPanel` / `dynamicSnapshot` / `stateSnapshot` / `resolvedSnapshot` / `sourceView` / `process`
- 结构化区分 `missing-input` / `resolved` / `process-only` / `research-only`
- 与 `assumptions: string[]` 并存，作为机器可消费 contract

### 9.8 `diagnostics`

generic assumptions / coverage gaps / unsupported effects 的结构化镜像。

当前第一批已支持：

- `defaulted-input`

要求：

- 至少包含 `kind` / `owner` / `keys` / `message`
- 与 `sourceNotes: StaticBuildSourceNoteEntry[]` 并列消费
- 不替代既有字符串，只做结构化镜像

### 9.9 `unsupportedEffects`

当前构筑中存在但暂未结构化支持的效果。

---

## 10. 模块设计与目录建议

以下是建议的模块划分，不是最终实现约束。

### 10.1 `zzz-data` 负责的模块

建议新增一组构筑解析相关模块，职责如下：

#### `src/build/types.ts`

职责：

- 定义系统总输入输出类型
- 定义 `loadout` / `panel` / `scenario` / `effectState`
- 定义 `resolvedBuild`

#### `src/build/panel.ts`

职责：

- 处理 `finalPanel` / `derivedPanel`
- 输出统一的 `resolvedPanel`

#### `src/build/effects.ts`

职责：

- 定义结构化效果 schema
- 定义效果分类、作用范围、条件模型

#### `src/build/effect-definitions/`

职责：

- 存放人工维护的结构化效果定义
- 来源于代理人 / 音擎 / 驱动盘 / 影画 / 核心技

#### `src/build/profiles.ts`

职责：

- 定义默认乘区管线
- 定义代理人专属 profile
- 定义 slot 热插拔规则

#### `src/build/resolver.ts`

职责：

- 解析当前生效效果
- 聚合为 bucket
- 生成最终 `damageParams`
- 生成 trace / assumptions / unsupportedEffects

#### `src/build/context.ts`

职责：

- 连接 `game-modes` cleaned helper
- 将敌人 / 模式数据映射为统一 context

### 10.2 `zzz-agent` 负责的模块

`zzz-agent` 不负责定义规则，只负责调用与解释。

建议新增一层高阶 tool：

#### `build damage params tool`

职责：

- 接收用户输入
- 组装 `loadout` / `panel` / `scenario` / `effectState`
- 调用 `zzz-data` resolver
- 返回给用户可读结果

#### `calc damage tool`

职责：

- 保留现有公式计算能力
- 作为底层纯计算器

#### `lookup tools`

职责：

- 提供代理人 / 音擎 / 驱动盘 / 游戏模式数据查询
- 作为 resolver 的输入辅助，而不是主要乘区解析逻辑

---

## 11. 数据来源策略

第一版不建议做全量自动文本抽取。

建议策略：

1. 原始文本仍来自现有数据源
2. 结构化效果单独维护为 curated data
3. 每条结构化效果保留原始文本引用
4. 先覆盖高频代理人 / 音擎 / 驱动盘
5. 后续逐步扩覆盖率

原因：

- 自动抽取不稳定
- 先把 schema 和 resolver 做对更重要
- 全量覆盖应在模型稳定后再做

---

## 12. 用户输入模式

系统建议对外支持两条主路径。

### 12.1 Quick Mode

- 用户直接提供最终面板
- 系统根据构筑和场景补齐结构化效果
- 最适合普通用户和 LLM

### 12.2 Build Mode

- 用户输入构筑、等级、精炼、影画、驱动盘信息
- 系统尽量推导面板和效果
- 适合重度用户
- 需要明确精度依赖输入完整度

建议：

- `Quick Mode` 作为主路径
- `Build Mode` 作为增强路径

---

## 13. MVP 范围

第一版建议只做：

1. 系统 schema
2. 三种计算模式：`baseline` / `full-buff` / `manual`
3. `finalPanel` 主路径
4. 常见 `combat effects`
5. 少量高频代理人 / 音擎 / 驱动盘
6. 默认公式管线 + 少量代理人专属 profile

### 第一版必须支持的效果类型

- 攻击%
- 固定攻击
- 暴击率
- 暴伤
- 增伤
- 穿透率
- 穿透值
- 减防
- 减抗
- 易伤
- 失衡易伤
- 异常精通
- 异常增伤
- 专属特殊乘区

### 第一版可不做的内容

- 动态覆盖率推演
- 技能循环模拟
- 非伤害机制
- 全角色 / 全音擎 / 全驱动盘自动结构化
- 纯自动文本抽取

---

## 14. 验收标准

系统完成后，至少要满足：

1. 用户给出 `finalPanel + scenario` 时，可稳定输出结果
2. 同一构筑在 `baseline` / `full-buff` / `manual` 下结果可复现
3. 每个结果都能追踪哪些效果生效
4. 特殊代理人可以替换或插入乘区
5. 不会因 `finalPanel` 输入而重复计算静态面板效果
6. `zzz-agent` 不再以“读全文本抽乘区”作为主路径

---

## 15. 风险与约束

最大风险依次为：

1. 结构化效果定义边界不清
2. 面板与效果重复计算
3. 过早追求全量覆盖
4. 特殊 profile 与默认公式的兼容性失控

控制策略：

- 先定 schema
- 再做 resolver
- 再做 profile
- 最后逐步扩角色覆盖

---

## 16. 后续扩展顺序

在 V2 已落地后，后续扩展建议仍按以下顺序推进：

1. 输入 / 输出 contract 扩展
2. effect schema 扩展
3. pipeline profile 的热插拔规则扩展
4. 支持范围扩展

---

## 17. 已落地能力与后续 TODO

### 17.1 全技能 / 全段批量计算（已落地）

当前实现已在单场景 resolver 之上增加一层 `skill matrix builder`：

1. 接口：`resolveStaticBuildSkillMatrix`
2. 输入：`loadout + finalPanel + context + effectOverrides`
3. 输出：`rows[]`，每行包含技能分组、标签、倍率和单次 `build` 结果
4. 模式：与单场景 resolver 一致，支持 `baseline` / `full-buff` / `manual`
5. 实现方式：矩阵 builder 负责按预定义模板展开技能段数，逐行复用 `resolveStaticBuildDamage`

这样系统已经能区分：

- 用户显式指定的单技能计算
- 系统批量生成的全技能 / 全段概览

并且批量输出仍保留：

- `trace`
- `assumptions`
- `unsupportedEffects`

因此没有退化成黑盒表格。

### 17.2 当前状态与后续方向

当前 roadmap 主线已完成：

- `V2.1 curated coverage` 已完成
- `V2.2 matrix metadata refinement` 已完成
- `V3 anomaly / disorder` 已完成到单次 `resolveStaticBuildDamage`
- `resolveStaticBuildSkillMatrix` 仍只支持 `normal / sheer`

当前唯一保留的显式 out-of-scope 是：

- anomaly / disorder 的 skill matrix

对应立项评估见：

- [异常 / 紊乱 Skill Matrix 立项评估](./anomaly-disorder-skill-matrix-evaluation.md)

后续方向不再属于原始主线，而是进入 post-roadmap backlog：

1. 继续补 anomaly / disorder 剩余 curated coverage
2. 仅在明确需要时再评估 anomaly / disorder skill matrix
3. 若需要进一步提高异常 / 紊乱精度，优先补显式 dynamic value context，而不是默认扩大 contract
4. progression-aware resolver 已完成 `V4` 第九批并在当前 contract 下收口，见 [静态构筑解析系统 V4](./static-build-resolver-v4.md)
5. `V5` source-aware dynamic snapshot context 已在当前 contract 下完成，见 [静态构筑解析系统 V5](./static-build-resolver-v5.md)
6. `V6` source-state snapshot context 已完成首批 `爱丽丝` / `雅` 的来源覆盖与 state-aware assumptions refinement，见 [静态构筑解析系统 V6](./static-build-resolver-v6.md)
7. `V7` resolved snapshot overrides 已完成 `V7.3` 前四批来源迁移，并在当前 contract 下收口；当前已把 `柏妮思 M6` 的 `25% 火抗无视` 接到 `scenario.resolvedSnapshot.bucketDeltas.ignoreResistance`，并把 `格莉丝 M2`、`简`、`派派`、`时流贤者`、`柳 M2`、`薇薇安 M2` 的异常倍率折算收口到 `scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor`，见 [静态构筑解析系统 V7](./static-build-resolver-v7.md)
8. `V8` assumption ownership 已完成 inventory 与 `V8.4` 前四批 source-note 收口，并在当前 contract 下收口；当前已确认 anomaly / disorder 剩余 assumptions 应优先归到 `finalPanel` / `dynamicSnapshot` / `stateSnapshot` / `resolvedSnapshot` / 真动态过程，而不是继续无边界扩 snapshot contract；当前没有新增 public key 的必要性，见 [静态构筑解析系统 V8](./static-build-resolver-v8.md)
9. `V9` source-specific damage view：已完成 `V9.4` docs / tool integration；`爱丽丝 [极性强击]`、`雅 [霜灼·破]`、`柏妮思 [余烬]` 已通过独立静态 view 暴露，而不继续并入主 anomaly / disorder 公式，`zzz-agent` 也已提供高层 `resolve-build-source-damage-views` 入口，见 [静态构筑解析系统 V9](./static-build-resolver-v9.md)
10. `V10` source-specific delta view：已在当前 contract 下收口；`爱芮 [异放]` 已通过“含快照结果 - 去除快照结果”的独立 view 暴露，`霰落星殿` 与 `混沌重金属 4件` 固定为 research-only，见 [静态构筑解析系统 V10](./static-build-resolver-v10.md)
11. `V11` structured source notes：已在当前 contract 下收口；`ResolveStaticBuildResult` 与 source-specific damage view 都已新增结构化 `sourceNotes`，`zzz-agent` 也已优先消费该 contract，同时保持旧 assumptions 兼容，见 [静态构筑解析系统 V11](./static-build-resolver-v11.md)
12. `V12` structured diagnostics：已在当前 contract 下收口；当前 `ResolveStaticBuildResult.diagnostics` 已覆盖 `defaulted-input`、`coverage-gap`、`unsupported-effect` 三类结构化镜像，`resolveBuildDamage` / source view 条目 / `zzz-agent` prompt 也已优先消费该 contract，见 [静态构筑解析系统 V12](./static-build-resolver-v12.md)
13. `V13` anomaly/disorder curated coverage：已在当前 contract 下收口；`格莉丝`、`简`、`柳`、`派派`、`柏妮思`、`爱丽丝`、`爱芮` 及 `淬锋钳刺`、`时流贤者`、`触电唇彩`、`灼心摇壶`、`壳中之灵` 的高价值 anomaly / disorder curated coverage 已落地，且未为消除 coverage-gap 额外引入 public key，见 [静态构筑解析系统 V13](./static-build-resolver-v13.md)
14. `V14` non-agent source-specific damage views：已在当前 contract 下收口；`霰落星殿`、`混沌重金属 4件` 继续保持 `research-only`，`轰鸣座驾`、`自由蓝调 4件` 继续保持 source note，不新增新的非代理人 source view，见 [静态构筑解析系统 V14](./static-build-resolver-v14.md)
15. `V15` structured source-note guidance：已在当前 contract 下收口；当前 `sourceNotes.guidance` 已进入公开 contract，`zzz-agent` prompt 与 README 已优先消费该结构化 guidance，且未新增新的计算输入 key，见 [静态构筑解析系统 V15](./static-build-resolver-v15.md)
16. `V16` generic w-engine curated coverage：已在当前 contract 下收口；当前 `鎏金花信`、`星徽引擎`、`「月相」-晦`、`「月相」-望`、`青漪灵鼎`、`电波漫步`、`「电磁暴」-壹式`、`「电磁暴」-贰式` 已补为 curated coverage，`「灰烬」-钴蓝` 已收口为 source-aware unsupported，`加农转子`、`幻变魔方`、`强音热望`、`街头巨星` 已纳入稳定 bucket / partial coverage，见 [静态构筑解析系统 V16](./static-build-resolver-v16.md)
17. `V17` generic drive-disc curated coverage：当前已完成 `V17.4` closeout；`拂晓生花`、`流光咏叹`、`獠牙重金属`、`如影相随`、`折枝剑歌`、`沧浪行歌`、`囚徒手记` 已补为 curated / partial coverage，其中仍需过程表达的部分固定为 source note，不再作为 generic coverage-gap，见 [静态构筑解析系统 V17](./static-build-resolver-v17.md)
18. `V18` legacy attack signature closeout：已在当前 contract 下收口；最后一批 legacy 强攻签名 `可琳 / 比利 / 安东 / 家政员 / 仿制星徽引擎 / 旋钻机-赤轴` 已按 partial coverage / source note 分层固定，其中姿态、距离、持续命中与真动态额外结算继续保持 source note，不新增新的 public key，见 [静态构筑解析系统 V18](./static-build-resolver-v18.md)
19. `V19` legacy utility engine closeout：已在当前 contract 下收口；最后两个 utility-only 旧通用音擎 `「月相」-朔 / 「电磁暴」-叁式` 已固定为 process-only source note，不新增能量相关 public key，见 [静态构筑解析系统 V19](./static-build-resolver-v19.md)
20. `V20` source-specific utility / energy views：已在当前 contract 下完成第一批收口；当前已通过独立 utility view 暴露稳定的回能 / 回能速率条目，不再只保留在 source note 中，也不会把它们并回主 damage resolver，见 [静态构筑解析系统 V20](./static-build-resolver-v20.md)
21. `V21` anomaly / disorder trigger-entry matrix：已落地独立触发条目矩阵，不继续伪装成技能矩阵；当前通过 `resolveStaticBuildTriggerMatrix()` 为 `爱丽丝 / 雅 / 柏妮思 / 爱芮 / 薇薇安` 暴露并列的主结算 + 额外结算条目，见 [静态构筑解析系统 V21](./static-build-resolver-v21.md)
22. `V22` structured source-entry metadata：已为 source damage view / utility view 补齐稳定 metadata，对齐 `canonicalLabel / stableKey / entryKind` 风格；`zzz-agent` 已优先消费 `entry.metadata`，见 [静态构筑解析系统 V22](./static-build-resolver-v22.md)
23. `V23` unified source-entry collection：已完成统一 source-entry collection，当前已通过 `resolveStaticBuildSourceEntries()` 一次性聚合 source damage views 与 source utility views，`zzz-agent` 也已暴露 `resolve-build-source-entries` 高层入口，见 [静态构筑解析系统 V23](./static-build-resolver-v23.md)
24. `V24` formula-derived second-batch source views：已在当前 contract 下收口；`薇薇安 [异放]` 已通过公式推导型 delta view 暴露，并同步接入 trigger matrix 与 source-entry collection，见 [静态构筑解析系统 V24](./static-build-resolver-v24.md)
25. `V25` second-batch utility / resource views：已在当前 contract 下收口；`时光切片` 已按触发类型拆成 `喧响值 + 能量` 的结构化 utility entries，并同步接入 unified source-entry collection；utility-only 查询也已与 damage-agent catalog 解耦，见 [静态构筑解析系统 V25](./static-build-resolver-v25.md)
26. `V26` unified source-entry collection summary：已在当前 contract 下收口；`resolveStaticBuildSourceEntries()` 已新增稳定 `summary`，并固定 utility-only / mixed collection 的分组与排序语义；高层 tool 与 Agent 也已优先消费 `collection.summary`，见 [静态构筑解析系统 V26](./static-build-resolver-v26.md)
27. `V27` trigger-entry matrix summary：已在当前 contract 下收口；`resolveStaticBuildTriggerMatrix()` 已新增稳定 `summary`，并固定 `main-formula / source-view` 的分组与排序语义；高层 tool 与 Agent 也已优先消费 `matrix.summary`，见 [静态构筑解析系统 V27](./static-build-resolver-v27.md)
28. `V28` source-view summary contracts：已在当前 contract 下收口；`resolveStaticBuildSourceDamageViews()` 与 `resolveStaticBuildSourceUtilityViews()` 已新增稳定 `summary`，并固定 standalone / delta / trigger / rate 的分组与排序语义；高层 tool 与 Agent 也已优先消费 `views.summary`，见 [静态构筑解析系统 V28](./static-build-resolver-v28.md)
29. `V29` main resolver summary contract：已在当前 contract 下收口；`ResolveStaticBuildResult` 已新增稳定 `summary`，收口单场景结果的公式乘区摘要与 diagnostics / sourceNotes / unsupportedEffects 的分组统计；高层 tool 与 Agent 也已优先消费 `build.summary`，见 [静态构筑解析系统 V29](./static-build-resolver-v29.md)
30. `V30` core skill matrix summary：已在当前 contract 下收口；`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `summary`，把原本只存在于高层 tool 的 `commonBuckets / commonFormulaMultipliers` 下沉到 `zzz-data` public contract；高层 tool 与 Agent 已直接消费 `matrix.summary`，见 [静态构筑解析系统 V30](./static-build-resolver-v30.md)
31. `V31` core skill matrix effect summary：已在当前 contract 下收口；`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `effectSummary`，把当前只存在于高层 tool 的增益清单聚合逻辑下沉到 `zzz-data` public contract；高层 tool 与 Agent 已直接消费 `matrix.effectSummary`，见 [静态构筑解析系统 V31](./static-build-resolver-v31.md)
32. `V32` source-entry summary alignment：当前阶段已收口；`resolve-build-source-entries` 已直接透传底层 `ResolveStaticBuildSourceEntriesResult.summary`，高层 tool 与底层 contract 现已使用同一组 key，见 [静态构筑解析系统 V32](./static-build-resolver-v32.md)
33. `V33` support-scope normalization：当前阶段已收口；`resolve-build-*` 高层 tool 的 unsupported / support-scope 组装与 catalog helper 已统一到 `resolve-build-shared.ts`，见 [静态构筑解析系统 V33](./static-build-resolver-v33.md)
34. `V34` matrix row damage summary：当前阶段已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定 `damageSummary`，`resolve-build-skill-matrix` 不再手工拼装 `row.damage`，见 [静态构筑解析系统 V34](./static-build-resolver-v34.md)
35. `V35` matrix row compact contract：当前阶段已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定的 `resolvedBuckets / assumptions / unsupportedEffects`，`resolve-build-skill-matrix` 不再从 `row.build` 手工抽取这些紧凑字段，见 [静态构筑解析系统 V35](./static-build-resolver-v35.md)
36. `V36` matrix row explanation contract：当前阶段已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定的 `diagnostics / sourceNotes`，`resolve-build-skill-matrix` 不再依赖完整 `row.build` 才能输出结构化行级解释，见 [静态构筑解析系统 V36](./static-build-resolver-v36.md)
37. `V37` compact helper exports：已把 `zzz-agent` 高层的 `compactMatrix / compactTriggerMatrix / compactSourceEntries` 下沉为 `zzz-data` 可复用导出，当前由 `compactStaticBuildSkillMatrixResult()`、`compactStaticBuildTriggerMatrixResult()`、`compactStaticBuildSourceEntryCollection()` 统一提供，见 [静态构筑解析系统 V37](./static-build-resolver-v37.md)
38. `V38` source-view compact helpers：已把 `source-damage-view / source-utility-view` 收口为与 `V37` 对称的 compact helper exports，并让高层 source-view tool 对齐 `includeDetails` 语义，见 [静态构筑解析系统 V38](./static-build-resolver-v38.md)
39. `V39` trigger row source metadata：当前阶段已收口；`trigger-entry matrix row` 已新增稳定来源追溯字段 `templateSource / sourceType / sourceId / sourceStableKey`，上层不再需要依赖 `label` 或额外反查 `sourceViewId`，见 [静态构筑解析系统 V39](./static-build-resolver-v39.md)
40. `V40` requirement summaries：当前阶段已收口；`source-damage-view entry` 与 `trigger-entry matrix row` 已新增稳定 `requirementSummary`，compact helper 与高层 tool 也已对齐，不再需要上层手工统计 `requirements[]`，见 [静态构筑解析系统 V40](./static-build-resolver-v40.md)
41. `V41` diagnostic summaries：当前阶段已收口；`source-damage-view entry` 与 `trigger-entry matrix row` 已新增稳定 `diagnosticSummary`，compact helper 与高层 tool 也已对齐，不再需要上层手工统计 `diagnostics[]` 的 kind / owner 分布，见 [静态构筑解析系统 V41](./static-build-resolver-v41.md)
42. `V42` source-note summaries：当前阶段已收口；`source-damage-view entry` 与 `trigger-entry matrix row` 已新增稳定 `sourceNoteSummary`，compact helper 与高层 tool 也已对齐，不再需要上层手工遍历 `sourceNotes[]` 统计 status / owner 分布，见 [静态构筑解析系统 V42](./static-build-resolver-v42.md)
43. `V43` utility-entry summaries：当前阶段已收口；`source-utility-view entry` 已新增稳定 `diagnosticSummary / sourceNoteSummary`，compact helper 与高层 tool 也已对齐，source-entry union 不再因为 utility entry 缺 summary 而额外分支，见 [静态构筑解析系统 V43](./static-build-resolver-v43.md)
44. `V44` source-entry collection aggregates：当前阶段已收口；unified source-entry collection 的 `summary` 已新增聚合 `diagnosticSummary / sourceNoteSummary`，compact helper 与高层 tool 也已对齐，上层不再需要自行遍历 mixed entries 统计 diagnostics / source notes，见 [静态构筑解析系统 V44](./static-build-resolver-v44.md)
45. `V45` source-view summary aggregates：当前阶段已收口；standalone source-damage-view / source-utility-view 的顶层 `summary` 已新增聚合 `diagnosticSummary / sourceNoteSummary`，高层 tool 与 compact consumer 也已对齐，上层不再需要自行遍历 views 统计 diagnostics / source notes，见 [静态构筑解析系统 V45](./static-build-resolver-v45.md)
46. `V46` trigger-matrix summary aggregates：当前阶段已收口；`resolveStaticBuildTriggerMatrix().summary` 已新增聚合 `diagnosticSummary / sourceNoteSummary`，trigger matrix 与 source views / source-entry collection 的顶层摘要能力已保持对称，见 [静态构筑解析系统 V46](./static-build-resolver-v46.md)
47. `V47` skill-matrix summary aggregates：当前阶段已收口；`ResolveStaticBuildSkillMatrixResult` 已新增聚合 `diagnosticSummary / sourceNoteSummary`，skill matrix 与 trigger matrix / source views / source-entry collection 的顶层摘要能力已保持对称，见 [静态构筑解析系统 V47](./static-build-resolver-v47.md)
48. `V48` skill-matrix row summaries：当前阶段已收口；`StaticBuildSkillMatrixRow` 已新增稳定 `diagnosticSummary / sourceNoteSummary`，skill matrix row 的行级摘要能力已与 `source-view entry / trigger row` 对齐，见 [静态构筑解析系统 V48](./static-build-resolver-v48.md)
49. `V49` skill-matrix row resolve summaries：当前阶段已收口；`StaticBuildSkillMatrixRow` 已新增稳定 `summary`，行级 contract 现在可直接暴露 `ResolveStaticBuildResult.summary`，不再需要依赖 `row.build.summary`，见 [静态构筑解析系统 V49](./static-build-resolver-v49.md)
50. `V50` source-damage-view entry resolve summaries：当前阶段已收口；`StaticBuildSourceDamageViewEntry` 已新增稳定 `summary`，source-damage-view entry 现在可直接暴露 `ResolveStaticBuildResult.summary`，不再需要依赖 `entry.build.summary`，见 [静态构筑解析系统 V50](./static-build-resolver-v50.md)
51. `V51` trigger-matrix row resolve summaries：当前阶段已收口；`StaticBuildTriggerMatrixRow` 已新增稳定 `summary`，trigger row 现在可直接暴露 `ResolveStaticBuildResult.summary`，不再需要依赖 `row.build.summary`，见 [静态构筑解析系统 V51](./static-build-resolver-v51.md)
52. `V52` source-utility-view entry requirement summaries：当前阶段已收口；`StaticBuildSourceUtilityViewEntry` 已新增稳定 `requirements / requirementSummary`，utility entry 现在可直接暴露触发条件 / 适用条件 / 冷却的结构化摘要，不再只依赖 `triggerLabel / conditionLabel / cooldownSeconds`，见 [静态构筑解析系统 V52](./static-build-resolver-v52.md)
53. `V53` source-utility-view summary requirement aggregates：当前阶段已收口；`StaticBuildSourceUtilityViewSummary` 已新增稳定 `requirementSummary`，顶层 utility-view summary 现在可直接聚合当前条目的 requirement 分布，不再需要上层自行遍历 `entries[*].requirements`，见 [静态构筑解析系统 V53](./static-build-resolver-v53.md)
54. `V54` source-damage-view summary requirement aggregates：当前阶段已收口；`StaticBuildSourceDamageViewSummary` 已新增稳定 `requirementSummary`，顶层 source-damage-view summary 现在可直接聚合当前条目的 requirement 分布，不再需要上层自行遍历 `entries[*].requirements`，见 [静态构筑解析系统 V54](./static-build-resolver-v54.md)
55. `V55` trigger-matrix summary requirement aggregates：当前阶段已收口；`StaticBuildTriggerMatrixSummary` 已新增稳定 `requirementSummary`，顶层 trigger-matrix summary 现在可直接聚合当前 rows 的 requirement 分布，不再需要上层自行遍历 `rows[*].requirements`，见 [静态构筑解析系统 V55](./static-build-resolver-v55.md)
56. `V56` source-entry collection requirement aggregates：当前阶段已收口；`StaticBuildSourceEntryCollectionSummary` 已新增稳定 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`，顶层 mixed collection 现在可分别聚合两类条目的 requirement 分布，不再需要上层自行遍历 `entries[*].requirements`，见 [静态构筑解析系统 V56](./static-build-resolver-v56.md)
57. `V57` source-entry group summaries：当前阶段已收口；`StaticBuildSourceEntryGroupSummary` 已新增局部 `diagnosticSummary / sourceNoteSummary`，上层按组渲染时不再需要先过滤 mixed entries 再自行统计组内解释信息，见 [静态构筑解析系统 V57](./static-build-resolver-v57.md)
58. `V58` source-entry group requirement aggregates：当前阶段已收口；`StaticBuildSourceEntryGroupSummary` 已新增局部 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`，上层按组渲染时不再需要回退到顶层 aggregate 或重新遍历 mixed entries 统计组内 requirement 分布，见 [静态构筑解析系统 V58](./static-build-resolver-v58.md)
59. `V59` source-utility-view group summaries：当前阶段已收口；`StaticBuildSourceUtilityViewGroupSummary` 已新增局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`，上层按组渲染 utility 条目时不再需要先过滤 entries 再自行统计组内解释信息，见 [静态构筑解析系统 V59](./static-build-resolver-v59.md)
60. `V60` source-damage-view group summaries：当前阶段已收口；`StaticBuildSourceDamageViewGroupSummary` 已新增局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`，上层按组渲染 source-damage-view 条目时不再需要先过滤 entries 再自行统计组内解释信息，见 [静态构筑解析系统 V60](./static-build-resolver-v60.md)
61. `V61` trigger-matrix group summaries：当前阶段已收口；`StaticBuildTriggerMatrixGroupSummary` 已新增局部 `requirementSummary / diagnosticSummary / sourceNoteSummary`，上层按组渲染 trigger-entry rows 时不再需要先过滤 rows 再自行统计组内解释信息，见 [静态构筑解析系统 V61](./static-build-resolver-v61.md)
62. `V62` skill-matrix group summaries：当前阶段已收口；`StaticBuildSkillMatrixSummary` 已新增局部 `groups[*].diagnosticSummary / sourceNoteSummary`，上层按 `row.group` 拆分矩阵 section 时不再需要先过滤 rows 再自行统计组内解释信息，见 [静态构筑解析系统 V62](./static-build-resolver-v62.md)
63. `V63` skill-matrix group effect summaries：当前阶段已收口；`StaticBuildSkillMatrixGroupSummary` 已新增局部 `effectSummary`，上层按 `row.group` 拆分矩阵 section 时不再需要先过滤 rows 再自行聚合组内效果解释，见 [静态构筑解析系统 V63](./static-build-resolver-v63.md)
64. `V64` skill-matrix group formula summaries：当前阶段已收口；`StaticBuildSkillMatrixGroupSummary` 已新增局部 `commonBuckets / commonFormulaMultipliers`，上层按 `row.group` 拆分矩阵 section 时不再需要先过滤 rows 再自行聚合组内乘区摘要，见 [静态构筑解析系统 V64](./static-build-resolver-v64.md)
65. `V65` skill-matrix group caveat summaries：当前阶段已收口；`StaticBuildSkillMatrixGroupSummary` 已新增局部 `assumptions / unsupportedEffects`，上层按 `row.group` 拆分矩阵 section 时不再需要先过滤 rows 再自行聚合组内 caveats，见 [静态构筑解析系统 V65](./static-build-resolver-v65.md)
66. `V66` skill-matrix top-level unsupported effects：当前阶段已收口；`ResolveStaticBuildSkillMatrixResult` 已新增顶层 `unsupportedEffects`，上层先判断整张矩阵是否存在 unsupported coverage gap 时不再需要先遍历 `rows[*].unsupportedEffects` 再自行去重，见 [静态构筑解析系统 V66](./static-build-resolver-v66.md)
67. `V67` skill-matrix top-level caveat summary：当前阶段已收口；`ResolveStaticBuildSkillMatrixResult` 已新增顶层 `caveatSummary`，上层先判断整张矩阵的 assumptions / unsupported coverage gap 规模时不再需要自己统计数组长度，见 [静态构筑解析系统 V67](./static-build-resolver-v67.md)
68. `V68` skill-matrix group caveat summary：当前阶段已收口；`StaticBuildSkillMatrixGroupSummary` 已新增局部 `caveatSummary`，上层按 `row.group` 拆分矩阵 section 时不再需要自己统计组内 assumptions / unsupported coverage gap 规模，见 [静态构筑解析系统 V68](./static-build-resolver-v68.md)
69. `V69` skill-matrix row caveat summary：当前阶段已收口；`StaticBuildSkillMatrixRow` 与 compact row 已新增局部 `caveatSummary`，上层逐行展示矩阵时不再需要自己统计某一行的 assumptions / unsupported coverage gap 规模，见 [静态构筑解析系统 V69](./static-build-resolver-v69.md)
70. `V70` trigger-matrix top-level assumption summary：当前阶段已收口；`ResolveStaticBuildTriggerMatrixResult` 与 compact result 已新增顶层 `assumptionSummary`，上层先判断整张 trigger-entry matrix 是否带 assumptions 时不再需要自己统计数组长度，见 [静态构筑解析系统 V70](./static-build-resolver-v70.md)
71. `V71` trigger-matrix row assumption summary：当前阶段已收口；`StaticBuildTriggerMatrixRow` 与 compact row 已新增局部 `assumptionSummary`，上层逐行展示 trigger-entry rows 时不再需要自己统计某一行的 assumptions 数量，见 [静态构筑解析系统 V71](./static-build-resolver-v71.md)
72. `V72` source-damage-view top-level assumption summary：当前阶段已收口；`ResolveStaticBuildSourceDamageViewsResult` 与 compact result 已新增顶层 `assumptionSummary`，上层先判断整组 source-damage views 是否带 assumptions 时不再需要自己统计数组长度，见 [静态构筑解析系统 V72](./static-build-resolver-v72.md)
73. `V73` source-damage-view entry assumption summary：当前阶段已收口；`StaticBuildSourceDamageViewEntry` 与 compact entry 已新增局部 `assumptionSummary`，上层先判断单条 source-damage-view 是否带 assumptions 时不再需要自己统计 `entry.assumptions.length`，见 [静态构筑解析系统 V73](./static-build-resolver-v73.md)
74. `V74` source-utility-view top-level assumption summary：当前阶段已收口；`ResolveStaticBuildSourceUtilityViewsResult` 与 compact result 已新增顶层 `assumptionSummary`，上层先判断整组 utility views 是否带 assumptions 时不再需要自己统计数组长度，见 [静态构筑解析系统 V74](./static-build-resolver-v74.md)
75. `V75` source-utility-view entry assumption summary：当前阶段已收口；`StaticBuildSourceUtilityViewEntry` 与 compact entry 已新增局部 `assumptionSummary`，上层先判断单条 utility entry 是否带 assumptions 时不再需要自己统计 `entry.assumptions.length`，见 [静态构筑解析系统 V75](./static-build-resolver-v75.md)
76. `V76` source-entry collection assumption summary：当前阶段已收口；`ResolveStaticBuildSourceEntriesResult` 与 compact collection 已新增顶层 `assumptionSummary`，上层先判断整组 mixed collection 是否带 assumptions 时不再需要自己统计 `collection.assumptions.length`，见 [静态构筑解析系统 V76](./static-build-resolver-v76.md)
77. `V77` source-entry group assumption summary：当前阶段已收口；`StaticBuildSourceEntryGroupSummary` 已新增局部 `assumptionSummary`，上层按组拆 mixed collection 时不再需要自己统计组内 assumptions，见 [静态构筑解析系统 V77](./static-build-resolver-v77.md)
78. `V78` source-damage-view group assumption summary：当前阶段已收口；`StaticBuildSourceDamageViewGroupSummary` 已新增局部 `assumptionSummary`，上层按组拆 standalone / delta views 时不再需要自己统计组内 assumptions，见 [静态构筑解析系统 V78](./static-build-resolver-v78.md)
79. `V79` source-utility-view group assumption summary：当前阶段已收口；`StaticBuildSourceUtilityViewGroupSummary` 已新增局部 `assumptionSummary`，上层按组拆 trigger / rate views 时不再需要自己统计组内 assumptions，见 [静态构筑解析系统 V79](./static-build-resolver-v79.md)
80. `V80` trigger-matrix group assumption summary：当前阶段已收口；`StaticBuildTriggerMatrixGroupSummary` 已新增局部 `assumptionSummary`，上层按组拆 `main-formula / source-view` 时不再需要自己统计组内 assumptions，见 [静态构筑解析系统 V80](./static-build-resolver-v80.md)
81. `V81` trigger-matrix summary assumption summary：当前阶段已收口；`StaticBuildTriggerMatrixSummary` 已新增稳定 `assumptionSummary`，上层只消费 `matrix.summary` 时不再需要额外跳回 `matrix.assumptionSummary`，见 [静态构筑解析系统 V81](./static-build-resolver-v81.md)
82. `V82` source-damage-view summary assumption summary：当前阶段已收口；`StaticBuildSourceDamageViewSummary` 已新增稳定 `assumptionSummary`，上层只消费 `views.summary` 时不再需要额外跳回 `views.assumptionSummary`，见 [静态构筑解析系统 V82](./static-build-resolver-v82.md)
83. `V83` source-utility-view summary assumption summary：当前阶段已收口；`StaticBuildSourceUtilityViewSummary` 已新增稳定 `assumptionSummary`，上层只消费 `views.summary` 时不再需要额外跳回 `views.assumptionSummary`，见 [静态构筑解析系统 V83](./static-build-resolver-v83.md)
84. `V84` source-entry collection summary assumption summary：当前阶段已收口；`StaticBuildSourceEntryCollectionSummary` 已新增稳定 `assumptionSummary`，上层只消费 `collection.summary` 时不再需要额外跳回 `collection.assumptionSummary`，见 [静态构筑解析系统 V84](./static-build-resolver-v84.md)
85. `V85` skill-matrix summary caveat summary：当前阶段已收口；`StaticBuildSkillMatrixSummary` 已新增稳定 `caveatSummary`，上层只消费 `matrix.summary` 时不再需要额外跳回 `matrix.caveatSummary`，见 [静态构筑解析系统 V85](./static-build-resolver-v85.md)
86. `V86` skill-matrix summary diagnostic/source-note summaries：当前阶段已收口；`StaticBuildSkillMatrixSummary` 已新增稳定 `diagnosticSummary / sourceNoteSummary`，上层只消费 `matrix.summary` 时不再需要额外跳回 `matrix.diagnosticSummary / matrix.sourceNoteSummary`，见 [静态构筑解析系统 V86](./static-build-resolver-v86.md)
87. `V87` skill-matrix summary effect summary：当前阶段已收口；`StaticBuildSkillMatrixSummary` 已新增稳定 `effectSummary`，上层只消费 `matrix.summary` 时不再需要额外跳回 `matrix.effectSummary`，见 [静态构筑解析系统 V87](./static-build-resolver-v87.md)
88. `V88` skill-matrix top-level assumption summary：当前阶段已收口；`ResolveStaticBuildSkillMatrixResult` 与 compact result 已新增顶层 `assumptionSummary`，上层先判断整张矩阵是否带 assumptions 时不再需要自己统计 `matrix.assumptions.length`，见 [静态构筑解析系统 V88](./static-build-resolver-v88.md)
89. `V89` skill-matrix summary assumption summary：当前阶段已收口；`StaticBuildSkillMatrixSummary` 已新增稳定 `assumptionSummary`，上层只消费 `matrix.summary` 时不再需要额外跳回 `matrix.assumptionSummary`，见 [静态构筑解析系统 V89](./static-build-resolver-v89.md)
90. `V90` skill-matrix group assumption summary：当前阶段已收口；`StaticBuildSkillMatrixGroupSummary` 已新增稳定 `assumptionSummary`，上层按组拆 section 时不再需要自己统计 `groups[*].assumptions.length`，见 [静态构筑解析系统 V90](./static-build-resolver-v90.md)
91. `V91` skill-matrix row assumption summary：当前阶段已收口；`StaticBuildSkillMatrixRow` 与 compact row 已新增稳定 `assumptionSummary`，上层逐行消费矩阵时不再需要自己统计 `row.assumptions.length`，见 [静态构筑解析系统 V91](./static-build-resolver-v91.md)
92. `V92` source-damage-view caveat summary：当前阶段已收口；`ResolveStaticBuildSourceDamageViewsResult` 与 `StaticBuildSourceDamageViewSummary` 已新增稳定 `caveatSummary`，上层不再需要手工组合 `assumptionSummary + unsupportedCount` 来判断整组 source-damage-view 的 caveat，见 [静态构筑解析系统 V92](./static-build-resolver-v92.md)
93. `V93` source-damage-view group caveat summary：当前阶段已收口；`StaticBuildSourceDamageViewGroupSummary` 已新增稳定 `caveatSummary`，上层按 `standalone / delta` 分组展示 source-damage views 时不再需要手工组合组级 `assumptionSummary + unsupportedCount`，见 [静态构筑解析系统 V93](./static-build-resolver-v93.md)
94. `V94` source-utility-view caveat summary：当前阶段已收口；`ResolveStaticBuildSourceUtilityViewsResult` 与 `StaticBuildSourceUtilityViewSummary` 已新增稳定 `caveatSummary`，上层不再需要手工组合 `assumptionSummary + unsupportedCount` 来判断整组 source-utility-view 的 caveat，见 [静态构筑解析系统 V94](./static-build-resolver-v94.md)
95. `V95` source-utility-view group caveat summary：当前阶段已收口；`StaticBuildSourceUtilityViewGroupSummary` 已新增稳定 `caveatSummary`，上层按 `trigger / rate` 分组展示 utility views 时不再需要手工组合组级 `assumptionSummary + unsupportedCount`，见 [静态构筑解析系统 V95](./static-build-resolver-v95.md)
96. `V96` source-entry collection caveat summary：当前阶段已收口；`ResolveStaticBuildSourceEntriesResult` 与 `StaticBuildSourceEntryCollectionSummary` 已新增稳定 `caveatSummary`，上层先判断整组 mixed collection 是否带 caveat 时不再需要手工组合 assumptions 与 unsupported 计数，见 [静态构筑解析系统 V96](./static-build-resolver-v96.md)
97. `V97` source-entry group caveat summary：当前阶段已收口；`StaticBuildSourceEntryGroupSummary` 已新增稳定 `caveatSummary`，上层按 `source-damage-view / source-utility-view` 分组展示 mixed collection 时不再需要手工组合组级 `assumptionSummary + unsupportedCount`，见 [静态构筑解析系统 V97](./static-build-resolver-v97.md)
98. `V98` trigger-matrix caveat summary：当前阶段已收口；`ResolveStaticBuildTriggerMatrixResult` 与 `StaticBuildTriggerMatrixSummary` 已新增稳定 `caveatSummary`，上层先判断整张 trigger matrix 是否带 caveat 时不再需要手工组合 assumptions 与 unsupported 计数，见 [静态构筑解析系统 V98](./static-build-resolver-v98.md)
99. `V99` trigger-matrix group caveat summary：当前阶段已收口；`StaticBuildTriggerMatrixGroupSummary` 已新增稳定 `caveatSummary`，上层按 `main-formula / source-view` 分组展示 trigger matrix 时不再需要手工组合组级 `assumptionSummary + unsupportedCount`，见 [静态构筑解析系统 V99](./static-build-resolver-v99.md)
100. `V100` trigger-matrix row caveat summary：当前阶段已收口；`StaticBuildTriggerMatrixRow` 与 compact row 已新增稳定 `caveatSummary`，上层逐行展示 trigger rows 时不再需要手工组合 `row.assumptions` 与 `row.supported`，见 [静态构筑解析系统 V100](./static-build-resolver-v100.md)
101. `V101` source-utility-view entry caveat summary：当前阶段已收口；`StaticBuildSourceUtilityViewEntry` 与 compact entry 已新增稳定 `caveatSummary`，上层逐条展示 utility entries 时不再需要手工组合 `entry.assumptions` 与 `entry.supported`，见 [静态构筑解析系统 V101](./static-build-resolver-v101.md)
102. `V102` source-utility-view entry summary：当前阶段已收口；`StaticBuildSourceUtilityViewEntry` 与 compact entry 已新增稳定 `summary`，上层逐条展示 utility entries 时不再需要散读 `value / unit / targetScope / resolutionMode` 与多组 count flag，见 [静态构筑解析系统 V102](./static-build-resolver-v102.md)
103. `V103` source-entry utility-entry summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 utility entry 的 `summary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.summary`，见 [静态构筑解析系统 V103](./static-build-resolver-v103.md)
104. `V104` source-entry damage-entry summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 source-damage entry 的 `summary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.summary`，见 [静态构筑解析系统 V104](./static-build-resolver-v104.md)
105. `V105` source-entry mixed-entry assumption summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 mixed entry 的 `assumptionSummary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.assumptionSummary`，见 [静态构筑解析系统 V105](./static-build-resolver-v105.md)
106. `V106` source-entry mixed-entry caveat summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 mixed entry 的 `caveatSummary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.caveatSummary`，见 [静态构筑解析系统 V106](./static-build-resolver-v106.md)
107. `V107` source-entry mixed-entry diagnostic summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 mixed entry 的 `diagnosticSummary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.diagnosticSummary`，见 [静态构筑解析系统 V107](./static-build-resolver-v107.md)
108. `V108` source-entry mixed-entry source-note summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 mixed entry 的 `sourceNoteSummary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.sourceNoteSummary`，见 [静态构筑解析系统 V108](./static-build-resolver-v108.md)
109. `V109` source-entry mixed-entry requirement summary alignment：当前阶段已收口；unified `source-entry collection` 路径已把 mixed entry 的 `requirementSummary` 视为正式公共 contract，高层 tool、Agent prompt 与 README 已对齐 `entry.requirementSummary`，见 [静态构筑解析系统 V109](./static-build-resolver-v109.md)
110. `V110` source-entry top-level diagnostic/source-note summary alignment：当前阶段已收口；`ResolveStaticBuildSourceEntriesResult` 与 compact collection 已新增稳定 `diagnosticSummary / sourceNoteSummary`，高层 tool、Agent prompt 与 README 已对齐 `collection.summary.diagnosticSummary / collection.summary.sourceNoteSummary`，并保留 `collection.diagnosticSummary / collection.sourceNoteSummary` 作为顶层兼容字段，见 [静态构筑解析系统 V110](./static-build-resolver-v110.md)
111. `V111` standalone source-view top-level diagnostic/source-note summary alignment：当前阶段已收口；`ResolveStaticBuildSourceDamageViewsResult`、`ResolveStaticBuildSourceUtilityViewsResult` 与对应 compact result 已新增稳定 `diagnosticSummary / sourceNoteSummary`，高层 tool、Agent prompt 与 README 已对齐 `views.summary.diagnosticSummary / views.summary.sourceNoteSummary`，并保留 `views.diagnosticSummary / views.sourceNoteSummary` 作为顶层兼容字段，见 [静态构筑解析系统 V111](./static-build-resolver-v111.md)
112. `V112` standalone source-view top-level requirement summary alignment：当前阶段已收口；`ResolveStaticBuildSourceDamageViewsResult`、`ResolveStaticBuildSourceUtilityViewsResult` 与对应 compact result 已新增稳定 `requirementSummary`，高层 tool、Agent prompt 与 README 已对齐 `views.summary.requirementSummary`，并保留 `views.requirementSummary` 作为顶层兼容字段，见 [静态构筑解析系统 V112](./static-build-resolver-v112.md)
113. `V113` trigger-matrix top-level diagnostic/source-note summary alignment：当前阶段已收口；`ResolveStaticBuildTriggerMatrixResult` 与 compact trigger matrix 已新增稳定 `diagnosticSummary / sourceNoteSummary`，高层 tool、Agent prompt 与 README 已对齐 `matrix.summary.diagnosticSummary / matrix.summary.sourceNoteSummary`，并保留 `matrix.diagnosticSummary / matrix.sourceNoteSummary` 作为顶层兼容字段，见 [静态构筑解析系统 V113](./static-build-resolver-v113.md)
114. `V114` trigger-matrix top-level requirement summary alignment：当前阶段已收口；`ResolveStaticBuildTriggerMatrixResult` 与 compact trigger matrix 已新增稳定 `requirementSummary`，高层 tool、Agent prompt 与 README 已对齐 `matrix.summary.requirementSummary`，并保留 `matrix.requirementSummary` 作为顶层兼容字段，见 [静态构筑解析系统 V114](./static-build-resolver-v114.md)
115. `V115` source-entry top-level dual requirement summary alignment：当前阶段已收口；`ResolveStaticBuildSourceEntriesResult` 与 compact collection 已新增稳定 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary`，高层 tool、Agent prompt 与 README 已对齐 `collection.summary.sourceDamageRequirementSummary / collection.summary.sourceUtilityRequirementSummary`，并保留 `collection.sourceDamageRequirementSummary / collection.sourceUtilityRequirementSummary` 作为顶层兼容字段，见 [静态构筑解析系统 V115](./static-build-resolver-v115.md)
116. `V116` trigger-matrix top-level effect summary alignment：当前阶段已收口；`StaticBuildTriggerMatrixSummary` 与 `ResolveStaticBuildTriggerMatrixResult` 已补齐稳定 `effectSummary`，compact result、高层 tool、Agent prompt 与 README 已对齐 `matrix.summary.effectSummary / matrix.effectSummary`，见 [静态构筑解析系统 V116](./static-build-resolver-v116.md)
117. `V117` trigger-matrix group effect summary alignment：当前阶段已收口；`StaticBuildTriggerMatrixGroupSummary` 已补齐稳定 `effectSummary`，高层 tool、Agent prompt 与 README 已对齐 `matrix.summary.groups[*].effectSummary`，见 [静态构筑解析系统 V117](./static-build-resolver-v117.md)
118. `V118` trigger-matrix row effect summary alignment：当前阶段已收口；`StaticBuildTriggerMatrixRow` 与 compact row 已补齐稳定 `effectSummary`，高层 tool、Agent prompt 与 README 已对齐 `row.effectSummary`，见 [静态构筑解析系统 V118](./static-build-resolver-v118.md)
119. `V119` source-damage-view top-level effect summary alignment：当前阶段已收口；`views.summary.effectSummary` 与顶层兼容字段 `views.effectSummary` 已补齐，高层 tool、Agent prompt 与 README 已对齐 `views.summary.effectSummary`，见 [静态构筑解析系统 V119](./static-build-resolver-v119.md)
120. `V120` source-damage-view group effect summary alignment：当前阶段已收口；`views.summary.groups[*].effectSummary` 已补齐，高层 tool、Agent prompt 与 README 已对齐 `views.summary.groups[*].effectSummary`，见 [静态构筑解析系统 V120](./static-build-resolver-v120.md)
121. `V121` source-damage-view entry effect summary alignment：当前阶段已收口；`entries[*].effectSummary` 与 compact entry 已补齐，高层 tool、Agent prompt 与 README 已对齐 `entry.effectSummary`，见 [静态构筑解析系统 V121](./static-build-resolver-v121.md)
122. `V122` source-entry collection top-level effect summary alignment：当前阶段已收口；`collection.summary.effectSummary` 与顶层兼容字段 `collection.effectSummary` 已补齐，高层 tool、Agent prompt 与 README 已对齐 `collection.summary.effectSummary`，见 [静态构筑解析系统 V122](./static-build-resolver-v122.md)
123. `V123` source-entry collection group effect summary alignment：当前阶段已收口；`collection.summary.groups[*].effectSummary` 已补齐，按组解释 mixed source-entry collection 时不再需要先过滤组内 entries 再手工聚合 effect 变化，见 [静态构筑解析系统 V123](./static-build-resolver-v123.md)
124. `V124` source-entry mixed-entry effect summary alignment：当前阶段已收口；utility entry 已补齐稳定 `entry.effectSummary`，当前固定返回空数组；高层 tool、Agent prompt 与 README 已对齐 `entry.effectSummary`，调用方逐条读取 mixed source-entry entry 时不再需要按 `entryKind` 手工补默认值，见 [静态构筑解析系统 V124](./static-build-resolver-v124.md)
125. `V125` source-utility-view compact entry effect summary alignment：当前阶段已收口；`StaticBuildCompactSourceUtilityViewEntry` 已补齐稳定 `effectSummary`，当前固定返回空数组；高层 utility-view prompt、compact helper 测试与 README 已对齐 `entry.effectSummary`，compact consumer 不再需要依赖 runtime 隐式行为，见 [静态构筑解析系统 V125](./static-build-resolver-v125.md)
126. `V126` source-utility-view top-level effect summary alignment：当前阶段已收口；`views.summary.effectSummary`、顶层兼容字段 `views.effectSummary` 与 `views.summary.groups[*].effectSummary` 已补齐；standalone utility views 的 top-level / group / entry effect summary 当前都固定返回空数组；高层 utility-view prompt、测试与 README 已对齐这些字段，见 [静态构筑解析系统 V126](./static-build-resolver-v126.md)
127. `V127` skill-matrix requirement summary alignment：当前阶段已收口；`matrix.summary.requirementSummary`、顶层兼容字段 `matrix.requirementSummary`、`matrix.summary.groups[*].requirementSummary`、`row.requirementSummary` 与 compact matrix requirement summary 已补齐；当前 skill matrix 的 top-level / group / row requirement summary 都固定返回空聚合；高层 skill-matrix prompt、测试与 README 已对齐这些字段，见 [静态构筑解析系统 V127](./static-build-resolver-v127.md)
128. `V128` single-build top-level aggregate summary alignment：当前阶段已收口；`ResolveStaticBuildResult` 已补齐稳定 `diagnosticSummary / sourceNoteSummary / assumptionSummary / caveatSummary`；高层 `resolveBuildDamage` prompt、测试与 README 已改为优先读取这些顶层 summary，同时保留 `build.summary.*` 兼容读取路径，见 [静态构筑解析系统 V128](./static-build-resolver-v128.md)
129. `V129` single-build effect summary alignment：当前阶段已收口；`ResolveStaticBuildResult` 已补齐稳定 `effectSummary`；高层 `resolveBuildDamage` prompt、测试与 README 已改为优先读取 `build.effectSummary` 生成单场景“增益清单”，同时保留 `trace` 作为逐条展开的兼容路径，见 [静态构筑解析系统 V129](./static-build-resolver-v129.md)
130. `V130` single-build compact result alignment：当前阶段已收口；`zzz-data` 已新增 `CompactStaticBuildResult / compactStaticBuildResult()`；高层 `resolveBuildDamage` 默认返回 compact build，并通过 `includeDetails=true` 暴露 `build.trace / build.damageParams`，见 [静态构筑解析系统 V130](./static-build-resolver-v130.md)
131. `V131` single-build compact detail gating：当前阶段已收口；compact single-build 默认已不再携带 `diagnostics / sourceNotes`，高层 `resolveBuildDamage` 需通过 `includeDetails=true` 才展开 `build.diagnostics / build.sourceNotes / build.trace / build.damageParams`，见 [静态构筑解析系统 V131](./static-build-resolver-v131.md)
132. `V132` skill-matrix compact row detail gating：当前阶段已收口；compact `skill-matrix rows` 默认已不再携带 `row.diagnostics / row.sourceNotes`，高层 `resolveBuildSkillMatrix` 需通过 `includeDetails=true` 才展开 `row.diagnostics / row.sourceNotes / row.build`，见 [静态构筑解析系统 V132](./static-build-resolver-v132.md)
133. `V133` trigger-matrix compact row detail gating：当前阶段已收口；compact `trigger-matrix rows` 默认已不再携带 `row.diagnostics / row.sourceNotes`，高层 `resolveBuildTriggerMatrix` 需通过 `includeDetails=true` 才展开 `row.diagnostics / row.sourceNotes / row.build`，见 [静态构筑解析系统 V133](./static-build-resolver-v133.md)
134. `V134` source-damage-view compact entry detail gating：当前阶段已收口；compact `source-damage-view entries` 默认已不再携带 `entry.diagnostics / entry.sourceNotes`，高层 `resolveBuildSourceDamageViews` 需通过 `includeDetails=true` 才展开 `entry.diagnostics / entry.sourceNotes / entry.build`，见 [静态构筑解析系统 V134](./static-build-resolver-v134.md)
135. `V135` source-utility-view compact entry detail gating：当前阶段已收口；compact `source-utility-view entries` 默认已不再携带 `entry.diagnostics / entry.sourceNotes`，高层 `resolveBuildSourceUtilityViews` 需通过 `includeDetails=true` 才展开 `entry.diagnostics / entry.sourceNotes`，见 [静态构筑解析系统 V135](./static-build-resolver-v135.md)
136. `V136` source-entry compact entry detail gating：当前阶段已收口；compact mixed `source-entry entries` 默认已不再携带 `entry.diagnostics / entry.sourceNotes / entry.build`，高层 `resolveBuildSourceEntries` 需通过 `includeDetails=true` 才展开逐条 entry 级明细，其中 `entry.build` 仅在对应 `source-damage-view` 原始结果本来带 `build` 时透传，见 [静态构筑解析系统 V136](./static-build-resolver-v136.md)
137. `V137` trigger-matrix compact row requirement gating：当前阶段已收口；compact `trigger-matrix rows` 默认已不再携带 `row.requirements`，高层 `resolveBuildTriggerMatrix` 需通过 `includeDetails=true` 才展开逐条 row 级 raw requirements，见 [静态构筑解析系统 V137](./static-build-resolver-v137.md)
138. `V138` source-damage-view compact entry requirement gating：当前阶段已收口；compact standalone `source-damage-view entries` 默认已不再携带 `entry.requirements`，高层 `resolveBuildSourceDamageViews` 需通过 `includeDetails=true` 才展开逐条 entry 级 raw requirements，见 [静态构筑解析系统 V138](./static-build-resolver-v138.md)
139. `V139` source-utility-view compact entry requirement gating：当前阶段已收口；compact standalone `source-utility-view entries` 默认已不再携带 `entry.requirements`，高层 `resolveBuildSourceUtilityViews` 需通过 `includeDetails=true` 才展开逐条 entry 级 raw requirements，见 [静态构筑解析系统 V139](./static-build-resolver-v139.md)
140. `V140` source-entry compact entry requirement gating：当前阶段已收口；compact mixed `source-entry entries` 默认已不再携带 `entry.requirements`，高层 `resolveBuildSourceEntries` 需通过 `includeDetails=true` 才展开逐条 entry 级 raw requirements，见 [静态构筑解析系统 V140](./static-build-resolver-v140.md)
141. `V141` trigger-matrix compact row assumption gating：当前阶段已收口；compact `trigger-matrix rows` 默认已不再携带 `row.assumptions`，高层 `resolveBuildTriggerMatrix` 需通过 `includeDetails=true` 才展开逐条 row 级 raw assumptions，见 [静态构筑解析系统 V141](./static-build-resolver-v141.md)
142. `V142` source-damage-view compact entry assumption gating：当前阶段已收口；compact standalone `source-damage-view entries` 默认已不再携带 `entry.assumptions`，高层 `resolveBuildSourceDamageViews` 需通过 `includeDetails=true` 才展开逐条 entry 级 raw assumptions，见 [静态构筑解析系统 V142](./static-build-resolver-v142.md)
143. `V143` source-utility-view compact entry assumption gating：当前阶段已收口；compact standalone `source-utility-view entries` 默认已不再携带 `entry.assumptions`，高层 `resolveBuildSourceUtilityViews` 需通过 `includeDetails=true` 才展开逐条 entry 级 raw assumptions，见 [静态构筑解析系统 V143](./static-build-resolver-v143.md)
144. `V144` source-entry compact entry assumption gating：当前阶段已收口；compact mixed `source-entry entries` 默认已不再携带 `entry.assumptions`，高层 `resolveBuildSourceEntries` 需通过 `includeDetails=true` 才展开逐条 entry 级 raw assumptions，见 [静态构筑解析系统 V144](./static-build-resolver-v144.md)
145. `V145` skill-matrix compact row assumption gating：当前阶段已收口；compact `skill-matrix rows` 默认已不再携带 `row.assumptions`，高层 `resolveBuildSkillMatrix` 需通过 `includeDetails=true` 才展开逐条 row 级 raw assumptions，见 [静态构筑解析系统 V145](./static-build-resolver-v145.md)
146. `V146` skill-matrix compact row unsupported gating：当前阶段已收口；compact `skill-matrix rows` 默认已不再携带 `row.unsupportedEffects`，高层 `resolveBuildSkillMatrix` 需通过 `includeDetails=true` 才展开逐条 row 级 raw unsupported effects，见 [静态构筑解析系统 V146](./static-build-resolver-v146.md)
147. `V147` single-build compact top-level assumption gating：当前阶段已收口；compact single-build 默认已不再携带顶层 `build.assumptions`，高层 `resolveBuildDamage` 需通过 `includeDetails=true` 才展开 raw assumptions，见 [静态构筑解析系统 V147](./static-build-resolver-v147.md)
148. `V148` single-build compact top-level unsupported gating：当前阶段已收口；compact single-build 默认已不再携带顶层 `build.unsupportedEffects`，高层 `resolveBuildDamage` 需通过 `includeDetails=true` 才展开 raw unsupported effects，见 [静态构筑解析系统 V148](./static-build-resolver-v148.md)
149. `V149` skill-matrix compact top-level assumption gating：当前阶段已收口；compact skill-matrix 默认已不再携带顶层 `matrix.assumptions`，高层 `resolveBuildSkillMatrix` 需通过 `includeDetails=true` 才展开 raw assumptions，见 [静态构筑解析系统 V149](./static-build-resolver-v149.md)
150. `V150` skill-matrix compact top-level unsupported gating：当前阶段已收口；compact skill-matrix 默认已不再携带顶层 `matrix.unsupportedEffects`，高层 `resolveBuildSkillMatrix` 需通过 `includeDetails=true` 才展开 raw unsupported effects，见 [静态构筑解析系统 V150](./static-build-resolver-v150.md)
151. `V151` trigger-matrix compact top-level assumption gating：当前阶段已收口；compact trigger-matrix 默认已不再携带顶层 `matrix.assumptions`，高层 `resolveBuildTriggerMatrix` 需通过 `includeDetails=true` 才展开 raw assumptions，见 [静态构筑解析系统 V151](./static-build-resolver-v151.md)
152. `V152` source-damage-view compact top-level assumption gating：当前阶段已收口；compact source-damage-view 默认已不再携带顶层 `views.assumptions`，高层 `resolveBuildSourceDamageViews` 需通过 `includeDetails=true` 才展开 raw assumptions，见 [静态构筑解析系统 V152](./static-build-resolver-v152.md)
153. `V153` source-utility-view compact top-level assumption gating：当前阶段已收口；compact source-utility-view 默认已不再携带顶层 `views.assumptions`，高层 `resolveBuildSourceUtilityViews` 需通过 `includeDetails=true` 才展开 raw assumptions，见 [静态构筑解析系统 V153](./static-build-resolver-v153.md)
154. `V154` source-entry compact top-level assumption gating：当前阶段已收口；compact mixed `source-entry collection` 默认已不再携带顶层 `collection.assumptions`，高层 `resolveBuildSourceEntries` 需通过 `includeDetails=true` 才展开 raw assumptions，见 [静态构筑解析系统 V154](./static-build-resolver-v154.md)
155. `V155` skill-matrix compact group assumption/unsupported gating：当前阶段已收口；compact `skill-matrix summary.groups[*]` 默认已不再携带组级 raw `assumptions / unsupportedEffects`，高层 `resolveBuildSkillMatrix` 需通过 `includeDetails=true` 才展开这些组级 raw 明细，见 [静态构筑解析系统 V155](./static-build-resolver-v155.md)
156. `V156` explicit compact summary contracts：当前阶段已收口；trigger/source/source-entry 的 compact `summary` 已改为显式 compact types，不再直接复用 raw summary type，从而固定 compact contract 边界，见 [静态构筑解析系统 V156](./static-build-resolver-v156.md)
157. `V157` explicit compact row/entry summaries：当前阶段已收口；compact row / entry 的 `summary` 已改为显式 compact types，不再直接复用 raw summary type；unified `source-entry collection` 中复用这些 compact entry shape 的路径也同步对齐，见 [静态构筑解析系统 V157](./static-build-resolver-v157.md)
158. `V158` explicit compact skill-matrix summaries：当前阶段已收口；compact `skill-matrix summary / group summary` 已改为显式 compact types，不再半复用 raw summary type，从而把 `skill-matrix` 的 compact summary contract 与 `V156/V157` 拉齐，见 [静态构筑解析系统 V158](./static-build-resolver-v158.md)
159. `V159` explicit compact group summaries：当前阶段已收口；compact `trigger-matrix`、`source-damage-view`、`source-utility-view`、`source-entry collection` 的 `group summary` 已改为显式 compact types，不再直接复用 raw group summary type，从而把这几条 compact group contract 与 `V158` 对齐，见 [静态构筑解析系统 V159](./static-build-resolver-v159.md)
160. `V160` explicit compact top-level summaries：当前阶段已收口；compact `trigger-matrix`、`source-damage-view`、`source-utility-view`、`source-entry collection` 的 top-level `summary` 已改为显式 compact types，不再通过 `Omit<raw, "groups">` 复用 raw summary type，从而把这些 compact top-level summary contract 与 `V159` 对齐，见 [静态构筑解析系统 V160](./static-build-resolver-v160.md)
161. `V161` explicit compact aggregate summaries：当前阶段已收口；compact 结果对象顶层的 `diagnosticSummary`、`sourceNoteSummary`、`assumptionSummary`、`caveatSummary` 与 `entry caveatSummary` 已改为显式 compact types，不再直接复用 raw aggregate summary type，从而把 compact result-level aggregate summary contract 与 `V160` 对齐，见 [静态构筑解析系统 V161](./static-build-resolver-v161.md)
162. `V162` explicit compact row and entry aggregate summaries：当前阶段已收口；compact `skill-matrix row`、`trigger-matrix row`、`source-damage-view entry`、`source-utility-view entry` 与 mixed `source-entry entry` 上的 `diagnosticSummary`、`sourceNoteSummary`、`assumptionSummary`、`caveatSummary` 已改为显式 compact types，不再直接复用 raw aggregate summary type，从而把 compact row / entry aggregate summary contract 与 `V161` 对齐，见 [静态构筑解析系统 V162](./static-build-resolver-v162.md)
163. `V163` explicit compact top-level summary aggregate summaries：当前阶段已收口；compact `skill-matrix summary`、`trigger-matrix summary`、`source-damage-views summary`、`source-utility-views summary` 与 `source-entry collection summary` 上的 `diagnosticSummary`、`sourceNoteSummary`、`assumptionSummary`、`caveatSummary` 已改为显式 compact types，不再直接复用 raw aggregate summary type，从而把 compact top-level summary aggregate summary contract 与 `V162` 对齐，见 [静态构筑解析系统 V163](./static-build-resolver-v163.md)
164. `V164` explicit compact group aggregate summaries：当前阶段已收口；compact `skill-matrix group`、`trigger-matrix group`、`source-damage-view group`、`source-utility-view group` 与 `source-entry collection group` 上的 `diagnosticSummary`、`sourceNoteSummary`、`assumptionSummary`、`caveatSummary` 已改为显式 compact types，不再直接复用 raw aggregate summary type，从而把 compact group aggregate summary contract 与 `V163` 对齐，见 [静态构筑解析系统 V164](./static-build-resolver-v164.md)
165. `V165` explicit compact result-level requirement summaries：当前阶段已收口；compact `skill-matrix result.requirementSummary`、`trigger-matrix result.requirementSummary`、`source-damage-views result.requirementSummary`、`source-utility-views result.requirementSummary` 与 `source-entry collection` 顶层的 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary` 已改为显式 compact requirement summary types，不再直接复用 raw requirement summary type，从而把 result-level requirement summary contract 与前面的 compact summary contract 规范化主线对齐，见 [静态构筑解析系统 V165](./static-build-resolver-v165.md)
166. `V166` explicit compact top-level summary requirement summaries：当前阶段已收口；compact `skill-matrix summary.requirementSummary`、`trigger-matrix summary.requirementSummary`、`source-damage-views summary.requirementSummary`、`source-utility-views summary.requirementSummary` 与 `source-entry collection summary` 上的 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary` 已改为显式 compact requirement summary types，不再直接复用 raw requirement summary type，从而把 top-level summary requirement summary contract 与 `V165` 对齐，见 [静态构筑解析系统 V166](./static-build-resolver-v166.md)
167. `V167` explicit compact group requirement summaries：当前阶段已收口；compact `skill-matrix summary.groups[*].requirementSummary`、`trigger-matrix summary.groups[*].requirementSummary`、`source-damage-views summary.groups[*].requirementSummary`、`source-utility-views summary.groups[*].requirementSummary` 与 `source-entry collection summary.groups[*]` 上的 `sourceDamageRequirementSummary / sourceUtilityRequirementSummary` 已改为显式 compact requirement summary types，不再直接复用 raw requirement summary type，从而把 group requirement summary contract 与 `V166` 对齐，见 [静态构筑解析系统 V167](./static-build-resolver-v167.md)
168. `V168` explicit compact row requirement summaries：当前阶段已收口；compact `skill-matrix row.requirementSummary` 与 `trigger-matrix row.requirementSummary` 已改为显式 compact requirement summary types，不再直接复用 raw requirement summary type，从而把 row requirement summary contract 与 `V167` 对齐，见 [静态构筑解析系统 V168](./static-build-resolver-v168.md)
169. `V169` explicit compact entry requirement summaries：当前阶段已收口；compact `source-damage-view entry.requirementSummary`、`source-utility-view entry.requirementSummary` 与 mixed `source-entry entry.requirementSummary` 已改为显式 compact requirement summary types，不再直接复用 raw requirement summary type，从而把 entry requirement summary contract 与 `V168` 对齐，并让当前 compact requirement summary 规范化主线在 `result / summary / group / row / entry` 五层全部收口，见 [静态构筑解析系统 V169](./static-build-resolver-v169.md)
170. `V170` explicit compact result-level effect summaries：当前阶段已收口；single-build、`skill-matrix result`、`trigger-matrix result`、`source-damage-views result`、`source-utility-views result` 与 `source-entry collection` 顶层的 `effectSummary` 已改为显式 compact effect summary item types，不再直接复用 raw item type，从而开始收口当前 compact effect summary 规范化主线，见 [静态构筑解析系统 V170](./static-build-resolver-v170.md)
171. `V171` explicit compact top-level summary effect summaries：当前阶段已收口；compact `skill-matrix summary.effectSummary`、`trigger-matrix summary.effectSummary`、`source-damage-views summary.effectSummary`、`source-utility-views summary.effectSummary` 与 `source-entry collection summary.effectSummary` 已改为显式 compact effect summary item types，不再直接复用 raw item type，从而把 top-level `summary.effectSummary` contract 与 `V170` 对齐，见 [静态构筑解析系统 V171](./static-build-resolver-v171.md)
172. `V172` explicit compact group effect summaries：当前阶段已收口；compact `skill-matrix summary.groups[*].effectSummary`、`trigger-matrix summary.groups[*].effectSummary`、`source-damage-views summary.groups[*].effectSummary`、`source-utility-views summary.groups[*].effectSummary` 与 `source-entry collection summary.groups[*].effectSummary` 已改为显式 compact effect summary item types，不再直接复用 raw item type，从而把 `group.effectSummary` contract 与 `V171` 对齐，见 [静态构筑解析系统 V172](./static-build-resolver-v172.md)
173. `V173` explicit compact row and entry effect summaries：当前阶段已收口；compact `trigger-matrix row.effectSummary`、`source-damage-view entry.effectSummary`、`source-utility-view entry.effectSummary` 与 mixed `source-entry entry.effectSummary` 已改为显式 compact effect summary item types，不再直接复用 raw item type，从而让当前 compact effect summary 规范化主线在 `result / summary / group / row / entry` 五层全部收口，见 [静态构筑解析系统 V173](./static-build-resolver-v173.md)
174. `V174` explicit compact summary group items：当前阶段已收口；compact `build.summary.diagnosticGroups`、`build.summary.sourceNoteGroups`、`diagnosticSummary.kindGroups / ownerGroups` 与 `sourceNoteSummary.statusGroups / ownerGroups` 已改为显式 compact group item types，不再直接复用 raw summary group item type，从而把 compact summary 规范化主线继续推进到嵌套 group item 层，见 [静态构筑解析系统 V174](./static-build-resolver-v174.md)
175. `V175` explicit compact diagnostic/source-note detail entries：当前阶段已收口；compact single-build、`skill-matrix row`、`trigger-matrix row`、`source-damage-view entry`、`source-utility-view entry` 与 mixed `source-entry entry` 上的 `diagnostics / sourceNotes` 已改为显式 compact detail entry item types，不再直接复用 raw `StaticBuildDiagnosticEntry / StaticBuildSourceNoteEntry`，从而把 compact contract 的 detail-entry 规范化主线继续推进到 includeDetails 路径，见 [静态构筑解析系统 V175](./static-build-resolver-v175.md)
176. `V176` explicit compact requirement detail entries：当前阶段已收口；compact `trigger-matrix row`、`source-damage-view entry`、`source-utility-view entry` 与 mixed `source-entry entry` 上的 `requirements[]` 已改为显式 compact requirement item types，不再直接复用 raw `StaticBuildSourceDamageViewRequirement / StaticBuildSourceUtilityViewRequirement`，从而把 compact contract 的 detail-entry 规范化主线继续推进到 requirements 明细层，见 [静态构筑解析系统 V176](./static-build-resolver-v176.md)
177. `V177` explicit compact single-build trace items：当前阶段已收口；compact single-build 的 `trace[]` 与 `trace[].modifiers[]` 已改为显式 compact trace item types，不再直接复用 raw `StaticBuildTraceItem / StaticBuildTraceModifier`，从而把 compact detail-entry 规范化主线继续推进到 single-build trace 明细层，见 [静态构筑解析系统 V177](./static-build-resolver-v177.md)
178. `V178` explicit compact resolved buckets：当前阶段已收口；compact single-build `resolvedBuckets` 与 compact `skill-matrix row.resolvedBuckets` 已改为显式 compact type，不再直接复用 raw `StaticBuildResolvedBuckets`，从而把 compact single-build / row 的核心 bucket contract 再向前收口一步，见 [静态构筑解析系统 V178](./static-build-resolver-v178.md)
179. `V179` explicit compact resolved panel：当前阶段已收口；compact single-build `resolvedPanel` 已改为显式 compact type，不再直接复用 raw `StaticBuildResolvedPanel`，从而把 compact single-build 的核心 panel contract 与 `V178` 继续对齐，见 [静态构筑解析系统 V179](./static-build-resolver-v179.md)
180. `V180` explicit compact damage params：当前阶段已收口；compact single-build `damageParams` 已改为显式 compact type，不再直接复用 raw calculator params，从而把 compact single-build 顶层核心输入快照 contract 与 `V179` 继续对齐，见 [静态构筑解析系统 V180](./static-build-resolver-v180.md)
181. `V181` explicit compact damage results：当前阶段已收口；compact single-build `damage.expected / crit / noCrit` 已改为显式 compact type，不再直接复用 raw `DamageResult`，从而把 compact single-build 顶层核心输出 contract 与 `V180` 继续对齐，见 [静态构筑解析系统 V181](./static-build-resolver-v181.md)
182. `V182` explicit compact loadout：当前阶段已收口；compact single-build `loadout` 已改为显式 compact type，不再直接复用 raw `StaticBuildResolvedLoadout`，从而把 compact single-build 顶层 loadout contract 与 `V181` 继续对齐，见 [静态构筑解析系统 V182](./static-build-resolver-v182.md)
183. `V183` explicit compact single-build header：当前阶段已收口；compact single-build `profile / mode / manualBaseMode` 已改为显式 compact type，不再直接复用 raw result header type，从而把 compact single-build 顶层 header contract 与 `V182` 继续对齐，见 [静态构筑解析系统 V183](./static-build-resolver-v183.md)
184. `V184` explicit compact matrix result headers：当前阶段已收口；compact `skill-matrix / trigger-matrix` 顶层 `profile / mode / manualBaseMode / loadout` 已改为显式 compact type，不再直接复用 raw result header type，从而把 compact matrix result 顶层 header contract 与 `V183` 继续对齐，见 [静态构筑解析系统 V184](./static-build-resolver-v184.md)
185. `V185` explicit compact source-view result headers：当前阶段已收口；compact `source-damage-views / source-utility-views / source-entry collection` 顶层 `mode / manualBaseMode / loadout` 已改为显式 compact type，不再直接复用 raw result header type，从而把 compact source-view result 顶层 header contract 与 `V184` 继续对齐，见 [静态构筑解析系统 V185](./static-build-resolver-v185.md)
186. `V186` explicit compact source-view entry metadata：当前阶段已收口；compact `source-damage-view / source-utility-view` entry `metadata` 已改为显式 compact type，不再直接复用 raw metadata type，从而把 source-view entry compact contract 与 `V185` 继续对齐，见 [静态构筑解析系统 V186](./static-build-resolver-v186.md)
