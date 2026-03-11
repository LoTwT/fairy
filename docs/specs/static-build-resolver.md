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

### 9.7 `unsupportedEffects`

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

### 17.2 后续 TODO

下一阶段仍有三块工作未完成：

1. 继续把 curated effect definitions 从当前高频名单扩展到更多强攻 / 命破代理人，减少 `assumptions` 中的“缺少 curated 效果定义”提示
2. 继续把技能矩阵元数据从当前的 `actionName/skillName/qualifiers/entryType/segmentIndex` 扩到更细的命中次数语义与稳定技能分类，而不是让 UI 继续依赖 label 文本解析
3. 把 `anomaly / disorder` 接入同一套 static build resolver，而不是长期停在 `normal / sheer`
