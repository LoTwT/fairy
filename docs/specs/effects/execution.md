# 效果模型类型与执行契约

本文确定模型实现应遵守的行为，交付范围按[实施阶段](#实施阶段)划分。字段、联合分支与单位以正式类型为准，shared 与 core 的类型职责见[规范入口与职责](index.md#规范入口与职责)；业务动机见[模型总览](index.md)，游戏条款及其证据限制见[实例页](examples.md)。包已实现运行时校验、`prepareEffects`、`supplyEffectState`、`synchronizeSuppliedInstances`、`evaluateEffects` 与 `advanceEffects`，两个实施阶段均已交付，满足完整 `EffectEngine` 接口。

[contract-examples.ts](contract-examples.ts) 提供可编译的规则、输入和类型反例，直接引用包内正式类型；`pnpm check:spec-types` 编译该文件作为类型契约检查，包测试另行验证这些实例通过运行时校验。其中 `syntheticRuleSet` 是纯合成验收数据；游戏实例中显式选择的读取时点、刷新策略和动作别名只用于验证表达能力，不据此发布游戏规则。

静态计算入口 `calculateStaticDamage` 与目录入口 `calculateStaticDamageFromCatalog` 也已实现；培养档位和来源优先级见[静态快照规范](static-snapshot.md)，正式制品及范围见[批量数据接入规范](../data/zzz-hp-static-effects.md)。

## 数据与身份

### 定义和绑定

- `RuleSet.schemaVersion` 固定为 `1`；`ruleSetId + revision` 标识一份不可变定义。修改内容必须改变 `revision`。`source.references` 保留来源版本与 JSON Pointer，不能代替本模型的定义版本。
- 效果、状态、动作分别在规则集内唯一。运行时实体、来源绑定、实例、层、事件、快照、请求使用不同 ID 前缀；后缀必须非空。数组中的重复身份报错，不采用后者覆盖前者。
- 规则按 `source.identity.kind + entityId` 匹配来源绑定。一个绑定实例代表一个持有者的一项来源；同一套装的件数合并为一个绑定。同一持有者的同种同 ID 来源不得重复绑定。
- `eligible: false` 不产生效果或修改。配置条件仍是必填项，无条件写 `constant: true`。不支持的配置字段不能当作零：例如音擎规则读取 `mindscapeRank` 是定义与来源不相容。
- 等级表至少记录一项有限数值，只接受该培养字段域内的档位键。配置条件为假时跳过规则，对启用规则按绑定选值，再执行修改；实际需要的档位缺失报 `MISSING_RANK`，不插值、不回退、不以零替代。基础效果不为每个档位复制。

本版允许登记代理人、驱动盘、音擎、邦布、敌人、环境来源；后三类暂未登记额外培养配置。这表示身份协议可容纳它们，不表示已经覆盖它们的所有机制。实体 ID、技能语义 ID 与来源文件 ID 彼此独立。

同一运行会话固定来源绑定、配置和角色队伍归属。换装备、影画、规则版本或队伍配置时重新 `prepareEffects`，并显式构造新状态；不能把旧的不透明状态交给另一份准备结果。召唤物在场状态和世界状态可以随事件变化。

### 角色与目标

| 引用                     | 解析方式                                               |
| ------------------------ | ------------------------------------------------------ |
| `holder`                 | 当前规则绑定的持有者                                   |
| `triggerActor`           | 触发事件的 `actorId`；查询已有层时来自该层的 `trigger` |
| `entryActor`             | `entry`、`entry-followup` 的 `actorId`                 |
| `supportActor`           | `entry-followup.supportActorId`                        |
| `beneficiary`            | 当前逐目标求值的受益者                                 |
| `hitActor` / `hitTarget` | 当前查询命中的进攻方与受击方                           |
| `entity`                 | 显式运行时 ID，必须能在对应时点解析                    |

没有某个角色的上下文不能读取它。`continuous` 规则不能读取触发角色或 `activation` 快照；`supplied` 规则只有在所提供层确实携带触发上下文时才可读取。`scope: entity` 不允许使用命中事实或 `action-start`，`scope: hit` 必须有命中上下文。修改规则继承目标可用的上下文，不能给实体作用域的目标附加依赖命中的修改。这些跨字段限制由定义校验器执行。

目标选择器中的队伍均为持有者队伍，只选择 `actor`，不自动包含召唤物。`holder-and-trigger-actor` 返回两个身份的去重集合，并要求触发者属于持有者队伍。需要排除持有者自身触发时，另外写实体不相等条件。

`continuous` 在查询时解析目标；`triggered` 在事件的 `before` 世界中解析并写入实例，之后不随目标列表变化而改写；`supplied` 由调用方提供对应集合。目标顺序按 ID 排序，不参与游戏语义。

`supplied.maximumLayers` 可声明配置阶段求值的正整数上限；同一绑定、效果、受益者的各实例层数合计受此限制，不能通过拆分受益集合绕过。`supplied.exclusiveGroup` 在同一绑定内只允许一条同组规则。低层接口中旧定义省略上限时保留原有行为；静态入口对没有上限声明的旧规则只允许选择一层。

`recipientPartition: individual` 对每名受益者分别建组；`selected-set` 对排序后的整个目标集合建组。逻辑组键为 `(effectId, bindingId, beneficiaryIds, stackKey, lifecycleGroupKey)`。`stackKey` 按 `layering.keys` 声明顺序取触发者 ID 或招式分类，不得重复声明键或使用事件没有的分类。

`lifecycleGroupKey` 从实例的 `lifetime` 得到：限时和外部实例分别使用 `timed`、`supplied`；状态绑定实例使用 `(state-bound, stateId, stateOwnerId, stateActivationId)`。状态的两次进入属于不同组，即使效果、受益者和叠层键相同。限时实例的 `firstActivatedAt` 是时钟锚点，不加入组键。

### 世界观察与原始属性

`WorldObservation` 是调用方提供的事实，不是效果引擎生成的游戏世界。它包括角色原始属性、召唤物归属和部署状态、状态观察与实体对距离。

- `GeneralStatInput` 的基础值和四组调整、`DirectStatInput` 的基础值与加数，只包含本次规则集以外的输入。已经交给规则产生的增益不得再次填入；不能把包含该增益的最终面板当作基础值。
- 属性可以按需提供，但被当前查询或依赖读取的属性必须完整。未提供与本次结果无关的属性，不阻止本次查询。
- 状态按 `(stateId, bindingId, ownerId)` 标识。每次进入另有独立 `activationId`，即使同一时刻退出再进入也不能复用。观察到未生效必须显式给 `active: false, activationId: null, since: null`；缺记录不是未生效。生效记录的 `since` 不得晚于所观察时点。
- 状态定义的来源解析到同一持有者的绑定，再匹配所有者。召唤物状态可以以其运行时 ID 为所有者，但所属持有者必须匹配。解析出多个来源绑定时报错。
- 距离按无序实体对唯一记录，单位为米且非负；自距为零。范围条件筛选同一所有者、指定种类且已部署的召唤物，任一距离不超过阈值即成立。候选集合为空为假；缺少判断必需的距离报 `MISSING_FACT`。已找到范围内候选时，无需读取其余距离。

`StateDefinition.input: observed` 表示进入、退出、召唤物移动与返回由调用方维护。配置修改后的状态参数通过 `PreparedEffects.stateParameters` 交给该维护方。引擎不会因得到 `lingerSeconds + 5.5` 就伪造一条延后返回的观察。

## 五个接口

接口完整签名见 `EffectEngine`。全部接收不可变输入，不修改传入对象；返回的新状态也不得影响旧状态。

| 方法                                                      | 责任                                           | 成功结果                                    |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `prepareEffects(definitions, bindings)`                   | 校验定义、引用、来源及配置；选参；折叠配置修改 | 不透明的 `PreparedEffects` 与已解析状态参数 |
| `supplyEffectState(prepared, input)`                      | 校验调用方提供的有效实例、快照、冷却与事件游标 | 属于该准备结果和会话的 `EffectState`        |
| `synchronizeSuppliedInstances(prepared, previous, input)` | 完整替换指定的外部实例范围，保留其他状态       | 同一会话的新 `EffectState`                  |
| `advanceEffects(prepared, previous, input)`               | 接受一个事件，更新生命周期，生成一次性请求     | 新状态及本事件的请求数组                    |
| `evaluateEffects(prepared, state, input)`                 | 在给定世界和时点求值，不推进状态或产生请求     | 贡献、属性及可选的命中计算输入              |

`PreparedEffects`、`EffectState` 的品牌字段用于阻止结构化伪造；运行时还须验证状态归属。它们不是序列化协议，首版没有隐含的 JSON 导出或恢复接口。`StateInput` 是显式导入的规范结构。

### JSON 解析入口

`parseEffectRuleSet(input: unknown): Result<RuleSet>` 是 JSON 消费的边界入口：验证结构、判别联合、必填字段、单位、完整档位、精确引用与跨字段上下文限制，并把通过校验的值以 `RuleSet` 类型返回。输入对象本身不被修改，返回值直接引用输入结构。无效定义即使未被任何绑定启用也在此报告；多个独立问题按稳定指针顺序返回。

解析不代替 `prepareEffects` 对实际绑定、配置选择与来源归属的检查：解析通过只表示定义自洽，`prepareEffects` 仍校验来源绑定、配置字段与来源相容性、同持有者目标约束及配置修改折叠。

所有时间使用同一会话的非负有限秒数；同时间状态变更的 `sequence` 为非负安全整数。事件推进与外部实例同步共用 `StateChangeCursor` 及 `eventHistory`，按 `(atSeconds, sequence)` 严格递增。导入的 `eventHistory.last` 必须出现在无重复的 `processedIds` 中，且时间不晚于状态时刻；空历史必须有 `last: null`。外部有效层携带的历史触发上下文不自动声明该事件已被本引擎处理。

### 导入与查询

`supplyEffectState` 只能导入 `contribution` 的有效层，不能导入 `continuous`、`instant` 或 `modification` 实例。`supplied` 激活方式接受 `lifetime: supplied`；`triggered` 必须与定义的限时或状态绑定模式一致，并校验层数、分组、共用时钟等约束。目标合法性、世界归属等依赖世界输入的检查在首次使用该事实时完成。

限时层须有非空到期时刻；状态绑定层的 `expiresAt` 必须为 `null`。外部提供的层可给到期时间，也可用 `null` 表示调用方显式断言仍有效，不能据此反推出游戏持续时间。层开始时间不得晚于输入状态时刻。事件生成的层必须有真实触发上下文；外部层的 `trigger: null` 仅适用于不读取触发角色或快照的规则。

查询时间必须不早于 `state.atSeconds`。查询只过滤在该时点已经到期或绑定状态已结束的层，不把过滤结果写回旧状态。使用更晚时点查询的前提是调用方已经提供期间会影响结果的事件；世界观察不能补造遗漏的触发。状态绑定实例记录 `stateActivationId`，只在当前观察仍生效且 `activationId` 与之相等时保留；状态结束后重新进入，必须有新的触发才能重建实例。

- `panel` 只返回所请求实体、属性的结果，以及为它们实际消费的有效贡献。
- `hit` 计算进攻方本命中所需属性、暴击率和各基础伤害项；通用贡献和匹配本命中的局部贡献共同参与，输出携带 `hitId`，不得写回全局面板。
- `contributions` 返回指定受益者的全部有效实体作用域贡献，不计算没有命中上下文的局部规则；因此可能比单属性面板查询需要更多输入。

三类结果均不含最终伤害公式结果。`attributes` 只暴露该查询的输出属性，不把内部依赖节点一并当作请求结果。`hit.damageItems` 给出经过修改的倍率及对应最终属性值，调用方再补齐其他 core 计算输入。

同一状态重复查询不会回能或追加攻击。对同一个旧状态重复调用 `advanceEffects` 则会返回相同的新状态和相同请求 ID，调用方执行请求时按 ID 去重；向已经接收该事件的新状态重放会报错。

### 外部实例同步

`supplyEffectState` 用于显式初始化或导入完整状态。已有会话更新外部实例时使用 `synchronizeSuppliedInstances`，无需读取或重建不透明状态内部的自动层、冷却及历史。

`SuppliedInstancesUpdate.replacements` 的每一项以 `(effectId, bindingId)` 指定替换范围，`instances` 是该范围同步后的完整实例列表；空列表表示清除该范围，未列出的范围保持不变。一次同步不能重复指定同一范围。只能指定激活方式为 `supplied` 的贡献规则，空列表也不能用来删除引擎维护的 `triggered` 实例。

同步按以下顺序原子执行：

1. 校验准备结果与旧状态的归属，以及同步游标。时间不得早于旧状态时刻，ID 不得重放，顺序须晚于旧游标；违反顺序报 `EVENT_ORDER`。
2. 校验全部替换范围、实例及补充快照。实例的效果、绑定必须与所在项一致，`lifetime` 必须为 `supplied`；目标和规则所需事实按 `world` 校验。实例和层身份在替换后的整个状态中不得重复。
3. 对保留的实例 ID，效果、绑定、受益集合、叠层键及生命周期身份不得变化；对保留的层 ID，归属实例、开始时间和触发上下文不得变化。同一层续期可更新 `expiresAt`；重新激活或更换触发上下文须使用新层 ID。已存在快照的同 ID 同内容可重复提供，内容冲突则失败，不能用新观察覆盖旧快照。
4. 替换所列范围，合并补充快照，追加同步 ID 和游标，并返回新状态。保留其他外部实例、全部自动实例、冷却及既有快照和历史，不输出请求，也不判断触发规则。任一项失败时不返回部分更新，旧状态不变。

同步的 `world` 只用于校验本次外部输入；不会代替遗漏的战斗事件推进自动生命周期。调用方须先按时间顺序提交实际发生的事件。保留的自动层仍由下一次查询或事件推进按时点及状态观察过滤。

同步使用独立的 `eventId` 记录这次状态变更，不能复用入场等战斗事件的 ID；同时间先后发生的同步和战斗事件使用不同 `sequence`。历史中出现同步 ID 不构成真实入场或追加动作的证据。对同一旧状态重复同步得到相同结果；向同步后的新状态重放同一输入报 `EVENT_ORDER`。

### 快照与时点

| 时点           | 数值来源                                                         |
| -------------- | ---------------------------------------------------------------- |
| `before-event` | 事件接受前、旧实例已按当前时刻过滤后的属性依赖图和 `before` 世界 |
| `activation`   | 本层 `trigger.activationSnapshotId` 引用的事件前快照             |
| `evaluation`   | 当前查询世界与依赖图                                             |
| `action-start` | `hit.actionSnapshotId` 引用的动作释放快照                        |

属性的 `initial` / `current` 是公式阶段，与上述时间轴独立。直接属性只支持 `current`。

`SavedSnapshot.attributes` 保存该时点已计算的属性，`world` 保存状态、距离等观察；不能拿最新世界或在新配置下重算的面板填补历史缺项。必须提供的历史属性缺失时报 `MISSING_SNAPSHOT`，该快照内所需状态、距离缺失时报 `MISSING_FACT`。`observedSnapshots` 是本次额外输入：推进或同步时纳入新状态，查询时只作只读补充。

相同快照 ID 必须对应相同内容；重复且不同报错。动作快照不得晚于命中，触发快照时间须等于对应层最初触发时刻。刷新旧层不更新其触发者、开始时间或激活快照；替换或新增层才捕获新的上下文。

## 修改的解析

`ModificationRule` 没有独立贡献。目标 ID 必须存在，且仅可指向贡献规则或状态定义，不能指向另一修改或瞬时动作规则。修改绑定与目标绑定必须有同一持有者；目标按其来源身份精确匹配，不能跨持有者批量修改。

| 阶段            | 条件与数值读取                     | 允许修改                                 | 作用时间                 |
| --------------- | ---------------------------------- | ---------------------------------------- | ------------------------ |
| `configuration` | 来源配置、修改规则自身的参数       | 贡献参数、结果、时长、延长上限；状态参数 | 准备时一次性折叠         |
| `activation`    | 目标将要接受的触发及事件前世界     | 限时贡献的时长、延长上限                 | 仅该次新建或刷新计时     |
| `contribution`  | 目标当前层、受益者及可用命中上下文 | 贡献参数、结果                           | 仅该层、该目标、本次查询 |

`extension-maximum` 只适用于已经声明有限延长上限的策略，不能凭空把 `refresh` 变成 `extend`。当前不登记 `layer-maximum`、`beneficiary`、`condition` 三个专用修改字段；层数上限、目标选择器和贡献条件仍在基础规则中声明。表达式引用的已声明参数仍遵循参数修改契约，这不提供替换条件结构或目标选择器的能力。配置门槛、事件触发条件、持续方式、时钟方式、输出地址和归约操作不允许直接替换。

首版不支持战斗中动态更改目标集合、层数上限、事件条件或外部状态参数，也不追溯改写已存在层的时长。需要条件数值变化用贡献阶段，需要条件时长变化用激活阶段；超出已列字段的行为必须先扩展契约，不能用任意对象路径绕过。

每个阶段内，先在该阶段修改前的上下文判断所有修改条件及求出操作数，再按字段统一执行 `set → add → scale`。数值公式为 `(选中的 set 或原值 + 所有 add 之和) × 所有 scale 之积`。结果字段只允许 `add/scale`。不同有效 `set` 冲突；单位相同且数值相等的 `set` 合并。

配置阶段可以确定修改操作数，但被修改的时长或输出本身可能依赖事件、属性。此时折叠的是表达式及其修改步骤，实际基值仍在对应阶段求出；不能在准备阶段要求尚不存在的事件事实。

`prepareEffects` 把配置级修改折叠进对应绑定的准备结果，并保留来源及修改 ID。后续查询直接使用该结果，不重复判断配置修改或再次累计其加数。激活阶段与贡献阶段的修改保留各自上下文；例如丽娜的范围强化仍按当前受益者计算，不能在准备阶段算成整队共用的固定值。

表达式中的 `parameter` 总是读取其所属规则自己的参数，不隐式读取目标字段。目标字段单位由目标定义决定；修改声明的单位必须相同，`scale` 的操作数单独使用乘数单位。参数先改再执行原表达式，结果修改在原表达式完成后执行，包括原表达式内部的封顶。

配置修改先建立基线；贡献阶段在该基线上产生局部参数和结果修改。贡献条件 `when` 使用基线，不反复尝试修改后的条件；依赖最终属性的条件仍参与依赖图，不因称作基线而忽略真实环。配置修改了未启用的合法目标不产生实例，属于合法的暂未生效配置。

输出修改作用于每一层的原始结果，之后才归约各层。当前没有“先合计全组层数再修改总值”的隐含行为。

## 事件与生命周期

### 事件的事实

| 事件                    | 专属事实与身份约定                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `hit-resolved`          | `actorId == hit.actorId`；有命中、暴击结果与招式分类                                                             |
| `entry`                 | 行为主体是入场者；入场方式取类型中四种之一                                                                       |
| `entry-followup`        | 行为主体仍是入场者；`supportActorId` 为追加攻击者，`energySpent` 是后者本次实际消耗；`entryEventId` 关联入场事件 |
| `energy-spent`          | 行为主体是消耗者；提供本次消耗量，不隐含窗口累计                                                                 |
| `precision-support`     | 行为主体是触发精准支援的持有者                                                                                   |
| `summon-attack-ordered` | 行为主体为所有者；列出的召唤物必须属于它                                                                         |
| `state-observed`        | 提供新的状态观察；必须与 `after` 世界的同一条记录一致                                                            |

事件来源负责真实动作分类和复合过程关联；校验器检查类型、引用、身份一致性，不能仅凭一个 ID 证明两个游戏动作实际关联。`entry-followup.entryEventId` 必须存在于已处理 ID 集中。没有实际消耗的免费追加可给零，不能自动通过 `energySpent > 0` 条件。

条件按声明的顺序短路：`all([])` 为真，`any([])` 为假。前序条件已经决定结果时不读取后序事实；实际需要的事实缺失则失败，不当作假。`eventKinds` 在触发条件之前筛选。只有 `hit-resolved` 有 `isCriticalHit` 与 `event.skillCategory`，入场方式只存在于入场类事件，能量消耗只存在于两种消耗相关事件。

### 原子推进顺序

1. 校验会话、事件身份、时间和所需观察。事件 ID 不得已存在于当前状态的 `processedIds`；顺序按 `(atSeconds, sequence)` 严格递增，同时间按调用方的 `sequence`。时间不得早于状态时刻。
2. 建立事件前有效视图：过滤已到期层，以及 `before` 已结束或激活身份不再匹配的状态绑定层。有效区间为 `[startedAt, expiresAt)`；恰好到期时的事件产生新组。
3. 用这一共同旧视图和 `before` 世界判断触发、解析目标并冻结所需事件前快照。随后需要求值的激活阶段修改也读取这一视图，不读取本事件刚产生的另一项增益。
4. 另建用于变更的工作视图，先移除 `after` 中已结束或激活身份变化的状态绑定旧组。对通过触发条件的状态绑定候选，从 `after` 解析状态所有者及新的 `activationId`；状态未生效时不产生层候选。此步不改写第 3 步的事件前快照。
5. 按完整逻辑组键在工作视图中判断层数、计时和旧冷却，计算新增/保留/替换层及一次性请求。同一冷却组基于旧冷却一起裁决；不能先写冷却再遍历同组第二条规则。状态重新进入不重置冷却。
6. 全部候选计算成功后原子提交层变更、快照、冷却、事件 ID 和游标，输出新状态与请求。所有存活状态绑定实例均须匹配 `after` 的激活身份。

任一阶段失败均不返回部分更新或可执行的半组请求。`after` 只含调用方已发生的世界变化，不含本次待执行请求的后果。请求引发的能量消耗、攻击等由调用方执行后作为新事件输入，不能在同一次推进中递归执行。

例如旧状态 A 提供攻击力 100，原始攻击力为 1000；事件前快照为 1100。本事件结束 A 并进入 B，且满足建层条件时，先清除 A 的工作组，再在 B 的空组创建一层。因此 `maximum: 1 + keep-count` 不会因旧 A 已满而丢掉新 B。若未触发或冷却阻止触发，只清除 A，不自动创建 B。

### 冷却和请求身份

冷却键由 `groupId + partition` 的实际身份形成，后者分别是绑定 ID、持有者 ID、触发者 ID、持有者队伍 ID 或全局常量。不同组不能因为持有者相同而共用冷却。同一实际键上的候选须采用一致的冷却时长，否则报告定义或上下文冲突；需要一个触发产生多个结果时优先使用一个 `action-request.actions` 数组。

在 `time >= availableAt` 时可接受触发，接受后设为 `time + seconds`。没有候选产生层变更、计时变化或请求时不消耗冷却；有多项输出时只消耗一次。冷却不足则整组本次候选不接受。

稳定元组的编码定义为：将各字符串按 JavaScript UTF-16 长度编码成 `长度:内容` 后直接连接，例如 `["ab", "c"] → "2:ab1:c"`。嵌套集合先按 ID 排序并编码为一个字符串元素，身份比较使用 UTF-16 字符串顺序，不使用本地化排序。生成 ID 在编码结果前添加类型前缀。

请求身份含 `(sessionId, ruleSetId, revision, eventId, effectId, bindingId, beneficiaryId, operationIndex)`。实例身份含会话、规则版本、完整逻辑组键与创建事件；层身份再包含其创建事件和本事件内层序号。状态绑定身份因此包含对应 `stateActivationId`，重入时不得复用旧实例或层 ID。序号按规则内操作声明顺序生成，规则输入数组重排不改变身份。`StateInput.cooldowns.partitionKey` 为 `(partition, 实际作用域身份)` 的编码，全局身份用 `global`；导入时必须能解析回声明的作用域。

一次动作请求的 `count` 必须为正整数；同数组中同名动作按各自序号保持独立。`triggerSnapshotId` 是触发快照，不是动作实际释放时刻。执行方产生动作实例及后续命中时，提供自己的 `actionSnapshotId`，并保留 `origin` 中的请求、效果与绑定身份。

### 层数和时钟

层数上限是每个逻辑组的正整数。`keep-count` 在空组创建一层，在非空组保持层数；`add-layer` 每次接受触发尝试新增一层。满层时由 `atCapacity` 决定忽略新层或替换最早层，同开始时间按层 ID 打破平局。`keep-count` 只允许 `ignore-new-layer`，不暗含替换快照。

层操作与旧层计时更新独立：满层但忽略新增时仍可以刷新。旧层选择针对工作视图中同一完整逻辑组的存活层完成，不跨状态激活身份选择；`newest` 选择开始时间最晚的一层，平局按层 ID。被替换的旧层不再更新，新层使用本次触发上下文。

以当前时刻 `t`、旧到期时间 `e`、本次时长 `d`、组首次生效时间 `t0`、上限 `m` 表示：

| 方式                              | 被选中的旧时钟的新到期时间 |
| --------------------------------- | -------------------------- |
| `keep`                            | `e`                        |
| `refresh`                         | `t + d`                    |
| `extend / none`                   | `e + d`                    |
| `extend / remaining`              | `min(e + d, t + m)`        |
| `extend / since-first-activation` | `min(e + d, t0 + m)`       |

这里只处理 `e > t` 的存活层。新组时钟为 `t + d`，存在延长上限时也按同一上限裁剪；有界延长要求 `0 < d <= m`。激活阶段改变时长/上限后重新校验。组只要仍有存活层就保留 `t0`，替换最后一层不重置总时长锚点；整个组已到期后重建才重置。

- `shared`：全部层共用组时钟，`refreshExisting` 必须是 `all`。旧组先按表更新时钟，新层加入后沿用该时钟；不擅自为新层另开完整时长。
- `per-layer`：仅更新选中的旧层，新层从 `t + d` 起算；若声明首次触发总时长上限，新层也不得越过 `t0 + m`。
- `per-layer + keep` 要求 `refreshExisting: none`；采用其他更新方式时必须选择 `all` 或 `newest`。
- `state-bound` 没有定时字段。候选组使用 `after` 中生效状态的 `activationId`；旧身份的组在层数判断前移除，新身份从空组开始。未发生有效触发时只清理旧组，不创建新组，也不存在暂停后恢复旧层。

## 数值图、唯一性与 core 输入

### 求值节点

节点身份至少包括实体、属性、阶段、时点/快照和命中作用域。边从提供值的节点指向读取者；条件、参数修改、结果修改里的读取都建立边。按当前查询需要展开，不预先求出全规则集所有数值。

首阶段采用按需递归求值、结果缓存和求值栈。缓存按完整节点身份区分，限于单次调用的不可变上下文；访问栈中再次出现同一节点时报告依赖环及完整路径。与当前查询无关的数值节点不展开。实体、属性阶段、时点与命中不同的节点不能合并；只有在后续需求证实有必要时，再引入独立的图存储或调度组件。

实体作用域规则始终读取通用属性节点，即使其结果随后用于命中。命中作用域规则读取当前进攻方属性时使用本命中的局部节点；其他实体仍使用通用节点。历史快照只提供该历史时点保存的值，不混入当前命中的局部调整。

每个属性节点先确定适用层和局部修改，逐层求值，再进行来源唯一性选择，最后把有效调整交给属性 helper。下游只能读取此时确定的属性值，不能读取去重前面板。读取自身最终属性并写回同一节点形成环；读取自身穿透率、写队友穿透率不会仅因名称相同形成环。

命中局部属性节点从原始属性输入、逐条实体贡献和本命中的局部贡献重新聚合：实体贡献仍按实体上下文计算，但参与本命中消费时使用本命中地址。不能先取已经聚合的通用最终属性再追加局部贡献，否则无法在两类来源间重新选择唯一贡献。全局属性节点与其他命中的节点独立，历史快照仍只读。

顺序性来源只允许真实的快照时点，不自动把环改为快照。环错误必须列出实体、效果、属性阶段与时点组成的路径。相同输入的数字聚合按稳定 ID 次序进行，避免输入数组重排改变浮点加法顺序；使用 JavaScript 有限数语义，显示舍入不进入中间计算。

加算贡献相加，乘算贡献相乘。`add/minimum/maximum` 的操作数同单位；`multiply` 的系数为比例或乘数，结果保持被乘数单位。跨单位必须使用 `convert`，其 `input.unit` 与外层 `unit` 分别声明输入和输出单位，`rate` 是每一输入单位对应的输出单位数；不隐式处理百分数。阈值用输入单位的 `maximum/add` 表达，上限用输出单位的 `minimum` 表达，属性读取继续参与同一依赖图。乘算系数、时长、距离非负，实际持续时长及其上限严格为正；层数、次数严格为正整数。比例与倍率加数的允许符号按落点契约决定，不能统一夹在 `[0, 1]`。

贡献阶段的 `input` 表达式读取调用方显式传入的 `EvaluationInput.inputs`，按 `(bindingId, name)` 匹配并校验单位。重复键、未绑定来源、非有限值或未知字段均拒绝；实际读取的值缺失报 `MISSING_FACT`。手工值不回退到默认面板或当前属性，也不等同于历史快照。已有 `activation/action-start` 读取仍使用对应 `SavedSnapshot`。

通用属性新增 `base` 读取阶段，只读取明确的 `GeneralStatInput.baseValue`，不消费任何百分比或固定贡献；初始/最终阶段继续按已有 helper 求值。它用于以基础回能、异常掌控为底数的来源增益，不能以最终面板替代。

角色观察可显式启用 `deriveSheerForce`：贯穿力节点在对应 initial/current 阶段的独立贡献上加上 `0.1 × health + 0.3 × attack`，同样参与依赖环与缺失属性诊断。默认关闭以兼容低层输入；目录入口自动开启，其贯穿力输入分解与历史最终值边界见批量接入规范。

命中条件增加 `hit.element`、`hit.damageKind`、`hit.targetState` 与 `hit.skillTag`。前三者按登记枚举比较，技能标签按数组中任一标签匹配；标签为空表示明确没有，省略表示未提供。旧命中可以省略这些字段，只有实际读取缺失事实时才报错。`hit.skillCategory` 的 `one-of` 同样按登记值精确比较，不做别名或归并扩展；目录入口按分类归并附加的 `zzz-hp:category:*` 标签是独立的标签事实，不改变该条件的比较语义（归并范围见[静态快照与目录匹配](static-snapshot.md#计算范围)）。命中查询的可选 `stats` 可请求额外属性，仍使用同一命中局部依赖图，不另算通用面板冒充命中结果。

### 唯一性候选

先将输出归一到本次消费地址，再把同一 `(bindingId, effectId, beneficiaryId, outputAddress)` 的有效层归约为一个来源候选，最后按 `(uniqueness.key, scopeIdentity, beneficiaryId, outputAddress)` 选择。这里的 `outputAddress` 是归一后的 `ResolvedOutput.address`，不是定义的 `scope`。地址按落点区分实体、属性阶段、Factor 通道或命中字段，并携带消费节点的命中 ID；实体贡献与局部贡献用于同一命中时不会因定义作用域不同而分组。同一唯一组必须声明一致的选择方式和归约操作；不同地址分别裁决，键相同不表示跨地址互斥。

例如通用增伤 10% 和某命中增伤 20% 共用 `highest-value` 唯一键：该命中选择 20%，通用贡献查询及不匹配的命中仍为 10%。没有唯一性声明时，该命中正常相加得到 30%。不同受益者、命中、属性阶段或 Factor 通道不相互抑制。

| 方式                 | 选择与冲突                                                                             |
| -------------------- | -------------------------------------------------------------------------------------- |
| `single-source-only` | 只允许一个来源候选；多个候选即 `UNIQUENESS_CONFLICT`，用于明确拒绝尚未核实的多来源场景 |
| `highest-value`      | 比较各来源已经归约后的值，取最大值                                                     |
| `latest-activation`  | 按来源有效层的最近 `startedAt` 选择；不能用于无触发时间的 `continuous`                 |
| `priority`           | 比较配置求出的整数，数值较大者优先；优先级必须有对应规则依据                           |

优先级或时间相同且贡献值不同时报冲突；值相同可以按来源 ID 选择一个等价结果。`highest-value` 的同值也按来源 ID 选择。未被选中的来源状态仍独立存在，之后会随到期等变化重新裁决。

结果 `contributions` 只包含本次输出直接消费的获选逐层贡献与修改 ID，并使用消费地址；不把被抑制来源混入，也不把候选合计值伪装成某一层的输出。内部依赖节点的贡献不另行混进结果：例如命中查询读取了持有者的通用攻击力节点，不返回该节点的通用贡献供调用方再加一次。`panel` 只返回所请求属性消费的贡献，`hit` 返回进攻方局部属性、Factor 和倍率所消费的贡献，`contributions` 返回指定受益者的实体贡献。返回顺序稳定。需要完整决策轨迹的调试器可在集成层另外记录，不改变 core 输入类型。

### 输出适配

`scope` 决定规则的适用性与可读上下文，输出地址表示实际消费位置：通用面板与实体贡献查询使用 `hitId: null`；命中查询的通用和局部贡献统一使用当前命中 ID。来源作用域可通过 `origin.effectId` 找回，不能靠输出的 `hitId` 反推定义作用域。逐命中属性只影响进攻方本次计算；注册面向特定敌人的减益时，必须有对应目标事实与生命周期，不能仅添加一个通道就假定所有敌人已被施加减益。

普通命中暴击率加数使用 `scope: hit` 下的 `stat-adjustment / criticalRate / direct`，输出为 `{ kind: stat, stat: criticalRate, stage: direct, entityId: hit.actorId, hitId }`，与该命中消费的通用暴击率贡献共同归约和去重；数值 +1 仍是加数，不代表来源必暴。`hit-adjustment` 处理倍率，输出地址为 `{ kind: hit, field: damageMultiplier, hitId }`，指定基础伤害项时另带 `itemId`。来源必暴使用下述独立的固定最终概率语义。

| 输出                                 | core 或调用方输入                                                      | 数值方向                             |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------ |
| 四类通用属性调整                     | `calculateInitialStat` / `calculateFinalStat` 对应数组                 | 有符号有限数，遵循 helper 校验       |
| 直接暴击率、暴伤、穿透率、锐暴伤害   | 基础值加有效贡献                                                       | 有符号比例；本层不擅自实施概率裁剪   |
| `damage-bonus`                       | `damageBonusFactor` 输入数组                                           | 有符号比例                           |
| `daze-dealt-increase`                | `dazeDealtFactor.dazeDealtIncreases`                                   | 非负比例                             |
| `daze-dealt-reduction`               | `dazeDealtFactor.dazeDealtReductions`                                  | 非负比例，由 core 执行减法           |
| `target-resistance-reduction`        | `resistanceFactor.targetResistanceReductions`                          | 非负比例                             |
| `attacker-resistance-ignore`         | `resistanceFactor.attackerResistanceIgnoreValues`                      | 非负比例                             |
| `energy-generation-rate`             | `energyGenerationRateFactor` 输入数组                                  | 有符号比例                           |
| `target-defense-adjustment`          | `calculateTargetEffectiveDefense.defensePercentageAdjustments`         | 有符号比例；减防为负数               |
| `attacker-penetration-value`         | `calculateTargetEffectiveDefense.penetrationValues`                    | 防御点数，交由 core 归约             |
| `damage-taken-increase/reduction`    | `damageTakenFactor` 对应数组                                           | 非负比例                             |
| `stun-damage-adjustment`             | `stunDamageFactor.targetStunDamageMultiplierAdjustments`               | 有符号倍率加数                       |
| `sheer-damage-bonus`                 | `sheerDamageBonusFactor` 输入数组                                      | 有符号比例                           |
| `sharpen-damage-bonus`               | `sharpenDamageBonusFactor` 输入数组                                    | 有符号比例                           |
| `anomaly-damage-bonus`               | `anomalyDamageBonusFactor` 输入数组                                    | 有符号比例                           |
| `anomaly-critical-rate`              | 静态异常伤害的期望权重                                                 | 有符号比例，最终概率裁剪至 `[0, 1]`  |
| `anomaly-critical-damage`            | `anomalyCriticalFactor.anomalyCriticalDamageContributions`             | 有符号比例                           |
| `refringe-coefficient-increase`      | `calculateRefringeMultiplier.refringeCoefficientIncreases`             | 非负比例                             |
| `luminize-multiplier-addition`       | `luminizeMultiplierFactor.baseLuminizeMultiplier` 的加数               | 有符号倍率加数                       |
| `luminize-multiplier-scale`          | `luminizeMultiplierFactor.multiplicativeLuminizeMultiplierAdjustments` | 非负乘数，输出操作为 `scale`         |
| `base-multiplier-addition`           | 目录基础伤害项倍率加数                                                 | 有符号倍率加数                       |
| `base-multiplier-increase`           | 目录各伤害项乘以 `1 + Σincrease`                                       | 有符号比例，最终倍率须合法           |
| `settlement-multiplier-addition`     | 目录 `role: settlement` 项倍率加数                                     | 有符号倍率加数；缺独立项即拒绝       |
| `anomaly-duration-addition`          | 目录紊乱/乱流项的时间准备                                              | 秒数，加入一次，按原异常元素独立筛选 |
| `luminize-multiplier-increase`       | 耀变倍率乘以 `1 + Σincrease`                                           | 有符号比例                           |
| `luminize-special-addition/increase` | 已登记的耀变独立调整 `(1 + Σaddition) × (1 + Σincrease)`               | 有符号比例，不是通用特殊乘区         |
| `luminize-proficiency-input`         | 目录唯一参数映射传给 core 的精通值                                     | 异常精通点数；由 core 唯一换算       |
| 命中 `damageMultiplier / add, scale` | 每项按 `(原倍率 + Σadd) × Πscale` 归约后交给 `baseDamageFactor`        | 加数可带符号，乘数及归约后的倍率非负 |
| `resource-generation`                | 能量公式 `baseEnergyGenerationValues` 的一次基础值                     | 非负能量点数，效率适用性另行确认     |
| `action-request`                     | 外部动作执行方                                                         | 次数与动作身份；不提供猜测的伤害倍率 |

各 Factor 的其他必需参数仍由调用方补齐；例如抗性区的目标抗性不由“降低抗性”贡献推导。低层查询只提供贡献和属性；静态入口另行计算暴击与期望。命中倍率修改省略 `itemIds` 时作用于全部基础伤害项，指定时只作用于对应项，不改变其他项；加算与乘算按上述顺序归约。存在分项规则时，全项和分项贡献统一到每个基础伤害项的消费地址上裁决唯一来源，输出携带 `itemId`；只有全项规则时保留全项输出。生效的分项修改引用命中中不存在的项时，返回 `MISSING_REFERENCE`。

具体数值公式、裁剪和错误行为引用 [core 规范](../core/index.md)，此处只规定落点。效果求值校验通过也不表示已经完成整条伤害公式计算。

### 本命中失衡乘区替代

`stun-damage-replacement` 仅用于 `scope: hit`、`supplied` 贡献。`bonus` 和
`maximumBonus` 都是贡献阶段 `ratio` 表达式，分别要求有限非负、有限且在 `[0,2]`。
非法字面量、错误单位、未知字段在定义校验拒绝，依赖输入的越界值在实际求值拒绝。
本操作的条件计算为 `1 + min(bonus, maximumBonus)`，输出
`{kind: "hit", field: "stunDamageMultiplier", hitId}`、`operator: "replace"`、
`Quantity<"multiplier">`，并保留完整来源与配置修改归因。它不接受 `uniqueness`、
输出数值修改或贡献阶段参数修改；配置阶段参数修改仍可使用，结果仍须满足值域。
具名数据的输入语义及未验证的游戏换算见[叶瞬光帷幕登记](../data/zzz-hp-static-effects.md#修订-32叶瞬光帷幕易伤)。

实际适用层必须携带 `trigger`；`trigger.actorId` 表示捕获敌人，
`activationSnapshotId` 引用入场快照。快照时点须等于层 `startedAt`，且不晚于求值；
历史和当前 world 都必须观察到持有者及该敌人，两者为敌对 actor。本次命中必须由
持有者攻击该敌人，种类为 `regular` 或 `sharpen`、来源为 `direct`。每个伤害项按
`item.statSource → hit.attributeSources[item.stat] → hit.actorId` 解析的缩放来源
都须是持有者当前属性，允许多项，不能混入其他角色或保存的属性快照。
快照只验证捕获上下文，不存储或核实输入比例，也不检测跨独立请求换数。

先按有效来源、配置、实例/层、受益者及真实 `when` 确定候选；超过一个实际适用层
即报 `CONTEXT_MISMATCH`，在读取任一数值前判定，包括相同值、同一来源的多个实例。
关闭、过期或条件不成立的层不形成冲突。同世界其他受益者的普通命中不受影响。

替代生效时，普通 `stun-damage-adjustment` 的来源及条件依赖仍需成立，但其输出
表达式、输出修改和按值唯一性不再求值或报告为已消费。目录仅延迟可证明由这些
被丢弃输出独占的输入要求，并以本次真实求值确认豁免；其他通道、真实条件、独立
声明前提、显式额外属性查询仍须提供事实。已提供的非法输入不被豁免。
`panel` 与 `contributions` 查询不消费命中替代，也不删除普通实体贡献。

静态适配以最终值作为该次 `stunDamageFactor` 的基础，普通调整数组为空，保留原
`isTargetStunned`；结果 `[1,3]` 位于两状态合法区间内。关闭后恢复普通基础和加数。
原始基线仍须合法（包括非负基础、有限数组项）；被丢弃的有限加数不求和，避免无关
溢出。普通失衡 helper 的定义与状态钳制不改变，暴击、增伤、抗性等其他乘区独立。

### 来源保证必暴

`operation: { kind: "guaranteed-critical", itemId }` 只表达来源保证**最终暴击概率为 1**。定义仅允许 `scope: hit` 和精确非空的单个 `itemId`，不接受任意概率、数值表达式、stat 或运算符。它没有可数值修改的输出：配置/贡献阶段的 output 修改和没有输出表达式可作用的贡献阶段 parameter 修改均报 `INVALID_MODIFICATION`；配置参数仍可供原 `when` 使用。多层不增加概率，唯一性选择沿用原来源策略，固定输出值为 1。

求值针对当前 actor、hit 和实际存在的具名项，按有效绑定、实例/层、受益者、原 `when` 与唯一性选择判定。未选、0 层、条件不成立、非本受益者或 item 不匹配时不产生保证，也不额外限制普通概率/声明路径。必要 when 事实缺失和真实属性依赖仍按既有结构化错误处理。实际适用时，公共 `evaluateEffects` 和静态 core 入口均要求本次只有该唯一项、`damageKind: regular`、`origin.kind: direct`；混合项或非 regular/direct 报 `CONTEXT_MISMATCH`，缺少伤害类别事实报 `MISSING_FACT`。目录的独占、培养、分类、holder-current 和零初始倍率要求继续生效。

活动必暴与任何显式 `hit.attributeSources.criticalRate`（包括本人 current、他人及有效快照）或低层 `declaredCriticalRate`（包括 1）冲突，报 `CONTEXT_MISMATCH`。目录无声明 owner 的既有 `INVALID_INPUT` 前置拒绝保留；字段结构错误仍可先被格式校验拒绝。普通实体/hit CR 增减不影响最终 1，概率结算不读取被替代的普通 CR，也不求其输出表达式/输出修改或索取相关事实。其他实际表达式、when 或调用方明确查询的属性仍可读取普通 CR，缺项和循环依赖不被隐藏。

结果贡献使用地址 `{ kind: hit, field: criticalRate, hitId, itemId }`、`operator: guarantee`、固定 `{ unit: ratio, value: 1 }`，保留 effect/binding/instance/layer/beneficiary 归因。不伪造 `current CR=1` 的属性观察，不将被替代的普通 CR 贡献报告为本次概率消费，不更新世界或通用面板。普通暴伤默认、显式实体、保存快照和合法命中暴伤贡献保持；未指定 CD 来源才读取命中角色当前普通 CD，缺必要 CD 事实仍失败。`nonCritical` 保留反事实分支，`critical` 使用原 CD 模型，`expected === critical`。

### 静态伤害计算

`calculateStaticDamage(StaticDamageInput)` 接收规则、来源绑定、显式效果选择、原始世界属性、命中与 core 所需基线，返回贡献、属性、非暴击/暴击伤害、期望及各乘区。它建立独立 supplied 状态，再沿用准备、状态导入与命中求值，不调用事件推进。每次改变培养配置或选择均重新调用；输入不变，重复调用不会累计贡献。

- `continuous` 仍由配置决定；`selections` 只选择 `supplied` 效果，未选择即关闭。选中未知来源、不适用配置或其他激活类型时报错。准备阶段只为本次选择的 supplied 规则、continuous 规则及相关修改选参；普通 `prepareEffects` 仍准备全部符合配置的规则。
- 普通静态入口在结构、正整数层数、世界/命中与定义/绑定准备均通过后，若选择的 effectId 不存在于完整规则集，返回 `MISSING_REFERENCE`，指向 `/selections/<i>/effectId` 并保留 effectId/bindingId 归因；定义存在但绑定、配置或激活方式不适用时仍返回 `CONTEXT_MISMATCH /selections/<i>`。这是未知 effectId 原 `CONTEXT_MISMATCH` 的诊断细分，不改变先行校验：低层 0 层仍为 `INVALID_INPUT /selections/<i>/layers`；目录未支持选项（含 0 层）继续按目录契约拒绝。
- 层数和互斥组由定义校验，目标由规则的选择器与实际队伍推导。装备适用性由调用方给出 `eligible`，引擎不根据实体 ID 猜测阵营或职业。不能把预设默认值当作本次有效状态。
- `atSeconds` 省略为静态时点 0，快照省略为空；需要历史读取时仍须提供真实快照或规则声明的显式 `input`。触发角色来自可选 `selection.trigger`，静态入口不生成战斗历史。
- 基线数据不能包含本次规则再次提供的贡献。敌人抗性、防御、失衡倍率等必须明确给出；无增益的数组显式写 `[]`。普通/贯穿伤害的暴伤、锐化伤害的锐暴伤害以及有防御区公式的穿透率、异常公式的异常精通由本次命中求值读取。低层命中原有的暴击率读取保持兼容：未声明最终暴击概率且没有[活动来源必暴](#来源保证必暴)的静态命中仍须提供该属性；声明概率或来源必暴替代普通概率读取后，是否仍需普通暴击率只取决于其他真实依赖（普通暴击伤害的条件分支事实要求始终保持）。
- `regular` 使用普通伤害，`sheer` 使用贯穿伤害；`anomaly/disorder/vortex/anomaly-settlement` 使用当前 core 异常伤害公式，基础倍率由调用方先按对应机制确认；`luminize` 使用耀光公式。异常/耀光的 `damageBonus` 可以是尚未结算的贡献数组，也可以是 `{ settledMultiplier }`。后者保留给定快照或特殊固定乘区，不再叠加当前 `damage-bonus`，相关贡献列为本次不适用。跨角色虚拟快照可先由 core 的 `calculateVirtualAgentSnapshot` 构造，再明确提供本次使用的属性与已结算增伤。
- 普通及异常暴击率只在计算期望时裁剪至 `[0, 1]`，暴伤裁剪仍由各 core 公式负责。耀光没有暴击分支，返回 `critical: null`。计算过程不做显示舍入。
- 已登记但不适用于该伤害公式的贡献进入 `notApplicableContributions`，例如能量生成或贯穿伤害中的减防；未登记通道在规则校验时直接拒绝。原始基线非法或 core 计算失败返回 `INVALID_INPUT`，不输出半组伤害结果。

每项可通过 `statSource` 指定属性来源，其他乘区属性通过 `hit.attributeSources` 指定。来源没有 snapshotId 时读取该实体的当前属性；指定 snapshotId 时只读取已保存的 current 属性项，缺失报 `MISSING_SNAPSHOT`。结果属性携带 snapshotId 区分同一实体的历史和当前值；不能以当前世界兜底。

`hit.declaredCriticalRate` 是静态命中可选的**声明最终暴击概率**：由调用方显式声明本次结算命中的最终暴击 r（`expected = (1−r)×nonCritical + r×critical`），替换语义而非加数——不读取命中角色面板普通暴击率，也不把声明写回世界属性、伪造成 current 属性观察或一条贡献。字段缺省且没有[活动来源必暴](#来源保证必暴)时沿用普通路径（读面板暴击率并消费命中作用域暴击率调整），声明无默认值。

- 取值必须是有限数且 `0 ≤ r ≤ 1`（NaN/±Infinity/负数/>1/非数值报 `INVALID_INPUT`，指向 `/hit/declaredCriticalRate`，不静默钳制非法声明）；仅支持 `regular` 且恰好一个伤害项的结算，该项实际缩放属性须解析为当前命中角色的当前属性（`item.statSource` → `hit.attributeSources[item.stat]` → 缺省命中角色；借另一实体或保存快照拒绝）；与 `hit.attributeSources.criticalRate` 并存是两种概率来源，按 `CONTEXT_MISMATCH` 拒绝。伤害种类只在可安全判定（受支持字符串）时参与该适用范围检查；damage 形状非法（缺失、null 等）保持 `/damage` 的结构化失败返回，不因声明分支读取伤害种类而抛异常或追加声明错误。
- 与**本命中实际生效**的命中作用域 `criticalRate/direct` 调整互斥（按冲突 `CONTEXT_MISMATCH` 拒绝并指明 effectId/bindingId）：判断只看该消费地址上是否存在适用的 hit 作用域层——复用与普通读取相同的激活/有效层、受益者与 when 语义（关闭的层、其他受益者/绑定或条件不成立的层不构成冲突，输出字面 0 的适用层同样冲突），但不为该判定求值被替换的 CR 输出、贡献阶段输出修改或按值唯一性选择；实体作用域候选在收集前即排除，其输出依赖缺失不产生缺事实错误。实体作用域的普通暴击率增益不参与形成最终概率、不因存在而报冲突，也不被伪报为概率消费。其他表达式真实依赖普通暴击率时（如暴击率转增伤的转换），仍按原有世界属性/贡献依赖读取并如实记账，声明不覆盖这些 stat-read。
- r=0/1 表示调用方声明的单次非暴击/暴击结果，中间值是调用方自己的概率假设，不是引擎抽签；结果 `criticalRate` 返回实际采用的声明值，`nonCritical`/`critical` 始终是两个条件分支——`critical` 继续采用当前普通暴击伤害及本命中合法暴伤贡献，这是调用方选择的 regular 条件计算模型，不证明游戏附伤能暴击或继承该暴击伤害；r=0 时 `critical` 是未采用的反事实分支值，r=1 时 `nonCritical` 同理。为输出条件分支，普通暴击伤害的必要事实要求保持（r=0 不伪造 critical 分支）。
- 目录 `StaticCatalogDamageItemRequirement.requiredCriticalRateDeclaration: true` 的要求项（必须位于 `exclusiveDamageItem` 变体的唯一要求项，role base、仅 direct、holder-current）使启用该选项的结算强制声明：缺声明报 `MISSING_FACT`；声明归属当前命中 actor 的唯一有效启用绑定——目录最终受益集合（含声明受益者交集，队伍职业人数、受益职业/元素筛选后的结果）不含当前 actor 的选择不授权也不强制，0 层关闭、ineligible、职业不适配或其他持有者的选择同样不授权（误带字段按 `INVALID_INPUT` 拒绝，有效但错持有者按 `CONTEXT_MISMATCH` 拒绝）。目录受益筛选决定字段归属授权；规则 `when` 仍只决定贡献，缺精确目标等 when 不成立时独立项按既有契约保持零贡献，不反向求值任意 when 来授权字段。

低层异化接受原 helper 参数或 `{ settledMultiplier }`。已结算分支直接复用倍率，不再次叠加异化通道。目录 `from-effects` 则将完整系数加数求和后加 1，仅计算一次；目录 `settled` 不再读取被跳过转化的当前属性或输入。

`calculateStaticDamageFromCatalog` 在上述路径前校验选项目录、展开静态选择并准备倍率。身份/职业与互斥、已选缺档/缺输入、耀变唯一参数映射、异常来源及时间派生规则集中在[数据接入规范](../data/zzz-hp-static-effects.md)，类型以 `StaticCatalogDamageInput` 为准。luminize 的 `anomalySource` 携带 `mechanism: "remielle-special-voidflare"` 时走具名机制分支：受限攻击/精通在独立求值上下文中读取，抗穿按具名来源元数据区分通用与耀变专属，strength 档位并入耀变倍率乘区；完整契约见[静态计算输入组装](../core/static-calculation.md#蕾米埃尔自身特殊虚曜)。表中标明“目录”的新通道在低层入口仅作为不适用贡献返回，不隐式更改原有倍率。时间派生来源保留在结果 `preparations`，不要求时间线。

## 校验与验收

### 爱丽丝核心周期附伤的条件结算

`calculateStaticDamage(AliceCorePeriodicDamageInput)` 与
`calculateStaticDamageFromCatalog(AliceCorePeriodicCatalogInput)` 以顶层
`mechanism: "alice-core-periodic-damage"` 分流，返回独立的
`AliceCorePeriodicDamageResult`；普通 overload 及其结果保持原义。
`EffectEngine` 同步提供这两个 overload，包根导出对应类型与函数。

本入口采用一次事件的**项目条件模型** `P = D × 0.025`。D 是调用方声明的原普通
物理强击、未按显示值取整的已结算**实际伤害**，已含原事件适用的全部乘区、
实际异常暴击结果和异化。只接受 `kind: assault`、`element: physical`，
`isAnomalyCritical` 必须为 boolean，true 仅保留历史归因。本事件不再抽签或乘暴伤，
也不读取当前 ATK/AP/CR/CD、防御、抗性、易伤、失衡或任何普通贡献。
`settledDamage` 是封闭 `{ unit: "damage-points", value: number }`，值必须有限且非负，
零值合法。概率、期望伤害、普通 `hit/damage/damageItems/inputs/declaredCriticalRate`
等混入字段及未知机制均拒绝。极性强击、紊乱、异放、非物理原事件明确拒绝；
这不表示它们在游戏中没有周期附伤。来源文本只直接证明比例、触发条件和间隔，
不能证明本条件模型的读数层级及继承是游戏实测。

`atSeconds`、`world`、`snapshots`、`event`、`originalAnomalies` 必填。
event 有独立 `eventId`，携带 Alice 的 `actorId`、敌人 `targetId`、唯一
`sourceBindingId`、`originalAnomalyEventId`、`originalAnomalySnapshotId` 与字面量
`originalAnomalyActive: true`。周期事件不能复用原事件 ID；每条原事实以 eventId
唯一标识，并携带 snapshotId、sourceActorId、targetId、kind、element、历史暴击标志
及 D。同一 eventId 跨快照仍属重复；额外事实不参与求和，但必须通过结构及重复校验。

当前 Alice 与目标必须存在且敌对，事件绑定须为 eligible 的 Alice 1401 agent、holder
与 actor 相等，核心 1—7、影画 0—6 配置合法。目录 actorSources 必须与绑定一致。
被引用快照不晚于本次时点，且保存同一 Alice、原施加者、同一敌人；历史 Alice 与
施加者同队、目标敌对。施加者可为 Alice，当前可离场或变队；缺历史角色不得由当前
世界补齐。快照见证历史身份和时点，**不声称其中保存或证明了调用方提供的 D**。
sourceActorId 是原异常施加／最终触发者，不声称其独自提供全部属性；D 可以含普通
异常的合法加权结果。本入口不构造积蓄、虚拟代理人或新的跨时点身份系统。

具名 operation 的唯一数值来源是正式规则中的 literal/ratio `0.025`。规则只能是
supplied、最大一层、holder、scope hit、恒真 when、空参数、无 uniqueness；配置
固定覆盖真实培养域，禁止任何 modification 指向它。`hit` scope 在此只表示一次事件，
结算器不造普通 HitContext。定义篡改即使未选也拒绝，普通 evaluateEffects 或普通
静态入口不能应用该操作。目录 metadata 只登记机制、1401、optionId、effectId 和
references，按 metadata → 唯一选项／变体 → 唯一规则及来源引用双向校验，不另存比例。
现有蕾米埃尔 metadata 保留为判别 union 的原成员。

具名请求唯一允许启用的选择是事件 Alice 绑定的周期选项／规则；其它 layers>0 的
来源一律 `CONTEXT_MISMATCH`，含另一名 Alice、M1/M2/M4、旧紊乱和 M6。
其它合法来源可显式为 0，但仍核对引用、绑定、配置和结构，不索取其输出输入或伤害项。
重复 effect/option + binding 拒绝，0 不能掩盖重复。未选或本选项 0 返回 inactive，
仍完整验证本事件和历史，不能用关闭掩盖缺事实、未来快照、不支持类别或非法值。

结果 `nonCritical = expected = P`、`critical: null`、`criticalRate: 0`、
`criticalSemantics: no-critical-settlement`；nonCritical 表示本事件没有再次暴击分支，
D 本身仍可能已暴击，expected 是确定性值的别名。关闭时 P 与 effectivePeriodicRatio
均为 0，originalSettledDamage 仍保留。provenance 保存完整周期事件、Alice holder／binding／
effect、原事件事实及有效比例；启用只有一条真实比例 contribution，关闭为空。
结果不是普通 EvaluationResult，不填伪造属性或 damage item。重复调用不修改输入、不累加，
也不提供跨请求去重。0.95 秒只记来源；状态仍有效和本事件发生由调用方声明，不验周期编号、
间隔、剩余时长、自动次数或总伤害，也不向普通动作追加事件。

缺原事实为 `MISSING_FACT`，缺快照／历史角色为 `MISSING_SNAPSHOT`；错身份、队伍、
未来快照或不支持类别为 `CONTEXT_MISMATCH`；结构、值域、单位、层数非法为
`INVALID_INPUT`，重复身份为 `DUPLICATE_ID`。规则／metadata 形状使用
`INVALID_DEFINITION`，未知引用沿既有 `MISSING_REFERENCE`，禁止修改使用
`INVALID_MODIFICATION`。既有公共解析器可优先报告其更具体错误，均带 JSON pointer，
不输出部分数值成功。完整公开调用示例见 `contract-examples.ts` 中
`calculateDeclaredAliceCorePeriod`，来源与生成守卫见
[修订 33](../data/zzz-hp-static-effects.md#修订-33爱丽丝核心周期附伤)。

### 耀嘉音 M4 跨角色附伤的条件结算

`astra-yao-m4-quick-assist-damage` 只结算一次调用方声明已发生的事件。中英 M4 文本支持：
咏叹华彩中，其他同队强攻角色通过快速支援入场，下一次快速支援重击额外造成
3×耀嘉音 ATK 的伤害。文本没有证明附伤的元素、暴击能力、命中归属、属性读取时点
或其他乘区归属；以下是显式项目条件模型，不是游戏实测结论。

| 身份或读取                     | 契约                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 来源持有者                     | event.sourceBindingId 对应 eligible 的 agent/1311，当前世界中的耀嘉音实例                                          |
| 触发者、hit actor、beneficiary | event.triggerActorId，必须与 holder 不同且同队，命中同一 observed 敌人                                             |
| 职业                           | 低层 triggerSpecialty=attack 是调用方断言；目录从本触发者的 actorSources 映射核验正式 profession=强攻              |
| ATK 提供者                     | holder 的 current 最终 ATK，包含实际适用的实体属性贡献；不是核心转模的 initial 输入                                |
| 分类、元素                     | regular / uncategorized；元素必填且合法，不从耀嘉音或触发动作推断                                                  |
| 最终概率                       | conditionalModel.criticalRate 的 ratio 数量，有限 [0,1]，无默认；不读双方面板 CR 或触发重击的暴击结果              |
| CD、穿透率                     | conditionalModel 中两个独立 AttributeSource，必须显式指向本 holder 或本 trigger 的 current 或保存 current 阶段属性 |
| 其余普通乘区                   | trigger 当前命中消费的普通贡献；damage 基线仍是调用方显式提供的条件参数，不能视为已核实的游戏面板                  |

`AstraYaoM4Event` 必填合法 eventId/sourceBindingId/triggerActorId/targetId，
triggerSpecialty="attack"，idyllicCadenza、enteredViaQuickAssist、nextQuickAssistHeavyHit
三个字面量 true；atSeconds 必须显式有限且非负。职业和触发事实不构成游戏时间线验证，
目录的身份核验也以调用方 actorSources 映射为前提。此入口不建立队列、不去重跨请求 eventId，
不检测 3 秒或 15 秒窗口，不实施同句异常积蓄或失衡条款。

`AstraYaoM4ConditionalModel` 固定 attackReading="holder-current"、
factorBeneficiary="trigger-actor-current"。CD/穿透快照必须存在、保存指定实体和属性的
current 值与 actor 身份、时点不晚于事件；缺失不回退当前值。非 hit actor 的当前来源
不消费 trigger 命中级 stat 加数；保存值不再叠加当前实体或命中级 stat 加数。
r=0/1 仍计算两个普通 CD 条件分支，expected=(1-r)×nonCritical+r×critical，
不会省略未取分支需要的 CD/穿透事实。ATK 必须有限非负，合法 ATK=0 仍可为 applied。

唯一 item 为 `astrayao:m4-quick-assist-bonus-damage`：attack、输入倍率严格为 0，
statSource 显式为本 holder current，无 snapshotId；目录还要求 direct/base。
唯一目录目标为 `zzz-hp:skill:astrayao-m4-quick-assist-bonus-damage`，
其 agentEntityId=1311 表示来源所有者，只有本具名入口在身份校验后采用这一归属。
普通目标所有权、旧 declaredCriticalRate、来源必暴及帷幕来源限制保持原契约。
低层不增加 skillTargetIds，内部补本目标；显式 skillTags 至多包含本目标和
`zzz-hp:category:uncategorized`。不得携带 hit.declaredCriticalRate、hit.attributeSources、
其他项、目标、分类标签或 follow-up 身份。

封闭 operation 为 `{ kind: "astra-yao-m4-quick-assist-damage", multiplier: { unit: "multiplier", value: 3 } }`。
仅允许 agent1311、hit scope、supplied 最大一层、M4/核心1—7、team-except-holder、
true when、空参数；不接受 uniqueness、任意输出表达式或针对它的修改。
目录必须保持规则↔单选项↔mechanism 双向唯一、完整同源 references、team 目标、
单变体与唯一独占伤害项要求。坏定义或 metadata 在未选和 0 层也拒绝。
普通 prepare 可包含未启用规则，实际消费必须走具名入口；未知 mechanism 结构化拒绝。
内部只将验证后的 operation 桥接为本项一次 +3 和独立概率，不改写调用方对象、
目录、hit actor 或面板 CR；桥接上下文不是公开普通输入。

启用1层、合法 M4—6/核心1—7且受益有效为 applied；未选或0层为 inactive，
三个伤害读数均为0，但保留显式概率，仍验证所有身份、属性来源和其他已选依赖。
M0—3 可以关闭，不能启用。所有选中来源均按 eligible、层数与最终受益范围判定；
唯一有效来源必须等于 event.sourceBindingId，多个有效来源明确拒绝，不挑最高值。
同 holder 重复绑定继续先按既有结构规则拒绝。被过滤、关闭的另一来源不构成活动冲突。

普通实体/命中增益可共存。耀嘉音核心 initial ATK 输入仍必填，其实际作用于 holder
的 ATK 贡献进入 current 读取，M2 沿旧转换修改执行；M6 的自身招式分类不会扩散至本项。
实际匹配本项的其他精确或 wildcard 倍率 add/scale 一律报 CONTEXT_MISMATCH，
inactive 也不能被注入倍率；另一项、未选、条件不成立或非本受益者不造成污染冲突。
缺失 when 事实仍是错误。实际适用的命中 CR 或来源必暴与声明概率冲突，包括 r=1，
不先求被替代 CR 输出或唯一性赢家；不消费的实体 CR 不索取其输出事实。
Alice 周期或其他独立事件不能借本入口激活。

`calculateStaticDamage`、`calculateStaticDamageFromCatalog` 和 EffectEngine 提供具名 overload。
`calculateStaticActionDamage` 对同一完整具名目录输入作窄转发，复用目录的绑定和 actorSources
校验；此分支由调用方显式提供 world，不从普通动作或配装自动生成事件、面板或附伤。
普通动作解析、segments、items 与其他入口的返回类型保持。
结果扩展 StaticDamageResult，携 mechanism、status 和 provenance：
event、effect/sourceBinding、holder/trigger/hitActor/beneficiary/target、ATK current 提供者、
CD/穿透来源、r 及 caller-asserted/catalog-verified 职业依据。inactive 不报告新 operation 消费；
合法零 ATK 的 applied 仍保留真实来源贡献。错误沿用 INVALID_INPUT、UNIT_MISMATCH、
CONTEXT_MISMATCH、MISSING_FACT、MISSING_REFERENCE、MISSING_SNAPSHOT 等，
坏嵌套返回结构化问题而非 TypeError。可执行示例见
[calculateDeclaredAstraYaoM4](contract-examples.ts)。

### 露西小猪继承与一次 M6 猪雨

`lucy-guard-boar` 是具名条件模型，分别由 `LucyGuardBoarDamageInput`（低层）和
`LucyGuardBoarCatalogInput`（目录及高层窄转发）提供。固定中英核心文本证明继承
ATK/冲击/异常精通、额外能力条件下的 CR/CD，以及核心 1—7 对小猪[加油！]的
140/150/160/170/180/190/200% 强化；M6 文本证明另一名同队角色处于[加油！]时
强化特殊技命中后，一只小猪爆炸造成小猪 ATK 的 300% 火伤。
文本未证明自有属性数值、读取时点、叠加顺序、爆炸暴击能力或完整乘区归属；
以下算法必须由调用方显式确认，不视为游戏实测。

世界保留真实 summon：`boar.entityId` 指向已部署的 `summonKind: "lucy-guard-boar"`，
owner 是 `sourceBindingId` 指向的 eligible agent/1151 holder，二者同队。
同一请求只允许一个 eligible Lucy 来源绑定。触发队友、Lucy、boar、敌人分别保留真实 ID，
不把 summon 伪装成 actor，也不改写 world。
`boar.ownerSource` 仅为本 holder current；实际可读的非 undefined `snapshotId` 一律拒绝，
包括原型继承与不可枚举属性，不回退保存阶段。
`ownStats` 必填六个有单位的有限非负量：ATK、Impact、AP、CR、CD、穿透率；
自有 CR/穿透率域为 [0,1]，其余不设人为上限。

`teamCondition` 为 `not-satisfied`，或另一实例队友及
`same-element | same-faction | rupture` 理由。低层标明 caller-asserted；
目录按 actorSources 与正式元素、职业“命破”及具名阵营清单验证。
阵营清单仅由固定 integrated index 的 camp=4 得到
1071/1151/1161/1171/1281/1351，mechanism 保存逐成员来源引用；
不向旧目录实体添加阵营字段。false 条件也遍历所有同队其他 actor，缺身份为错误。
Lucy 自己不能满足条件；另一个同名运行实例可以，异队无效。
该身份条件在继承关闭时仍须合法。

条件确认固定四个字面量：
`statComposition="own-plus-owner-current-without-selected-lucy-cheer"`、
`otherEffects="lucy-options-only"`、`damageFactors="explicit-boar-baseline"`、
`criticalDamage="resolved-boar"`。
world 与 ownStats 是选中效果加入前的调用方基线；隐藏在基线中的同源加油无法自动识别，
调用方不得预先混入后再选择同项。

允许同一个 Lucy binding 的五个来源：新增继承、M6 和原加油固定值/初始攻击转化/M4。
三条旧规则通过原准备器、状态与求值器得到真实贡献，原规则参数与公式不另行实现。
设 A/T/P/R/D 为本次 Lucy current 属性，C 为两条已选旧加油实际 ATK 贡献之和，
M 为已选 M4 实际 CD 贡献，h 为当前核心档固定倍率。继承启用时：

- boar ATK = own ATK + (A − C) + hC；Impact/AP = own + T/P。
- 队伍条件成立：CR = own CR + R；CD = own CD + (D − M) + M。
- 条件不成立：CR = own CR；CD = own CD + M。
- 穿透率始终等于 own 穿透率。M4 不乘 h，加油不放大整块继承属性。

继承关闭时 ATK = own ATK + C，CD = own CD + M，其余保留 own；
仍可独立选择旧两条加油或 M4。C/M 未选或合法零层即为零，不因解锁或 cheerOn 自动启用。
只有继承启用才读取 owner Impact/AP，且仅队伍条件成立时读取 owner CR/CD。
属性 CR 允许超过 1；爆炸概率是另外的显式 ratio [0,1]，不从属性 CR 夹取或推导。

转化旧规则读取 owner initial ATK。正层转化未给输入时，具名入口用既有属性求值派生，
并标为 `derived-owner-initial`；显式同名输入必须等于同一 owner 的实际 initial ATK，
单位必须为 attack-points，关闭时也不能藏矛盾输入。另一 binding 的同名输入拒绝。
转化关闭且未显式给值时，不索取 initial ATK。初始与 current 阶段的差异仍真实保留。

完整定义先解析校验。其他正层 supplied 来源即使 when=false 也返回 CONTEXT_MISMATCH；
eligible 且 config 匹配的 continuous 候选，以及会修改本次已选允许目标的
configuration/contribution 修改候选，在准备器应用修改前拒绝。
activation timing 修改因这些目标是 supplied、没有计时配置，已由规则解析器
先返回 INVALID_MODIFICATION。未选或合法零层的其他 supplied 保留结构、身份、
档位、层数验证，不求其输出事实。普通入口仍按原语义消费它们。

`settlement.kind="attributes"` 只返回属性，选中正层 M6 为冲突；
`m6-explosion` 必填 eventId/sourceBindingId/triggerActorId/targetId、
`skillCategory="enhanced-special"` 与 `cheerOn=true`。
触发者必须为另一 observed 同队 actor，target 为 observed 敌方 actor；
cheerOn 是本次触发断言，不自动打开加油选项。atSeconds 有限非负。
M6 最低影画 6，合法零层也检查门槛；未选可在低影画关闭，但仍校验完整事件与条件模型。

一次 M6 使用唯一 item `lucy:m6-boar-rain`、
target `nanoka:lucy-m6-boar-rain`，fire / regular / uncategorized / 空 skillTags，
固定 3×已解析 boar ATK。damage 的其余基线乘区、最终概率全部显式提供，
CD 用已解析 boar CD、穿透率用 own 值，复用原 regular 公式返回 nonCritical/critical/expected。
未选或零层 M6 返回 inactive 与三个零结果，属性及其他已选依赖仍正常求值。
不接收普通 hit/items、任意倍率、元素、分类、snapshot 或其他属性来源覆盖。

结果 `LucyGuardBoarResult` 分开记录 own、owner 实际读取、移除的 owner 加油、
直接给 boar 的加油/M4、继承贡献以及 M6 的 effect/binding/references 与各运行身份。
重复求值不改变输入、不累计状态。错误保持结构化 Result，不以裸 TypeError 表示坏嵌套。
可执行正例和历史来源反例见
[calculateDeclaredLucyGuardBoar 与 rejectHistoricalLucyOwner](contract-examples.ts)。

旧四条小猪动作继续遵守[露西面板代算约定](../data/skill-actions.md#具名约定露西亲卫队小猪面板代算)，
本路径不接收这四条动作。M6 后续回旋挥击须由调用方另选旧动作；
持续延长、三次上限/刷新、三只小猪、随机攻击、攻击频率、冷却/能量和自动排队均未实现。

### 两层校验

TypeScript 可以拒绝不相容单位、属性阶段、部分身份混用、错误规则分支和已声明的禁止字段。部分档位表的非空约束与实际所选档位由运行时校验；它不会验证任意 JSON，也不能静态证明字符串参数名存在、目标规则操作匹配或运行时没有依赖环。

运行时校验器必须检查未知字段、判别联合、所有必填字段、整数及有限数、非空身份、合法档位与实际选值、来源与配置匹配、精确引用、参数单位、修改合法性，以及跨字段的上下文限制。未知字段不能静默丢弃。无效定义即使当前未启用也应报告；仅依赖实际绑定或战斗输入的问题延迟到对应阶段。

| 问题                                | 错误码                                             |
| ----------------------------------- | -------------------------------------------------- |
| 结构、字段或数值定义非法            | `INVALID_DEFINITION`；输入对象对应 `INVALID_INPUT` |
| 重复身份 / 引用缺失                 | `DUPLICATE_ID` / `MISSING_REFERENCE`               |
| 单位错误 / 读取时机错误             | `UNIT_MISMATCH` / `INVALID_PHASE`                  |
| 修改目标或字段不合法 / 不同有效 set | `INVALID_MODIFICATION` / `MODIFICATION_CONFLICT`   |
| 必需事实 / 快照缺失                 | `MISSING_FACT` / `MISSING_SNAPSHOT`                |
| 实际使用的参数档位缺失              | `MISSING_RANK`                                     |
| 数值环 / 唯一性无法裁决             | `DEPENDENCY_CYCLE` / `UNIQUENESS_CONFLICT`         |
| 重放、逆序事件                      | `EVENT_ORDER`                                      |
| 状态归属、角色或世界身份不一致      | `CONTEXT_MISMATCH`                                 |

模型错误用 `Result` 返回，问题包含字段指针、可用的效果/绑定 ID；多个独立问题按稳定指针顺序报告。任何计算中间值溢出均为失败，不能输出部分正常值。调用既有 core helper 时仍遵循其错误契约，错误直接传播，不伪造一次成功的模型结果。

### 类型附件检查

本检查已接入仓库根验收流程：`pnpm check:spec-types`（随 `pnpm check` 运行）。它以严格模式编译 `contract-examples.ts`，后者直接引用 `@randomplay/core` 的包内正式类型；命令本身以根 `package.json` 的脚本为唯一权威来源，不在本文复制完整参数。

合法例通过 `satisfies` 检查；`RejectedCombinations` 用类型断言确保非法例不能赋给目标类型，不用忽略诊断的注释掩盖错误。这是类型契约检查，不是求值器执行测试。

### 求值器实现时的验收矩阵

下表规定未来实现应通过的行为，不表示本次已运行这些测试。真实数值基准只引用[实例页](examples.md)，合成时序基准不提升为游戏事实。

| 场景                                                                        | 预期                                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `astraPanelQuery` 配合给定状态，核心 7、2 影、持有者初始攻击力 3000         | 核心只贡献一次 1600，受益者攻击力为 3600；切到 1 影重新准备时贡献 1050，攻击力 3050                                   |
| `astraCoreNumericCases` 各项分别遍历 0—6 影                                 | 0—1 影匹配基础值，2—6 影匹配强化值；覆盖核心等级 1—7、零值、两个封顶点及其前后；浮点比较容差为 `1e-9` 攻击力点数      |
| 配置准备一次后重复查询，再调整配置重新准备                                  | 同一准备结果不会重复累计 `+0.19/+400`；换配置使用新准备结果，旧准备结果、规则和有效层输入不变                         |
| 丽娜 1 影，两个受益者一内一外                                               | 分别得到强化值和基础值；求值顺序不改变结果                                                                            |
| 自动第三段与普通第三段同动作身份、来源不同                                  | 只有匹配追加请求来源的命中获得对应暴击率，不污染面板                                                                  |
| 合成状态参数 `2 + 5.5`                                                      | 返回 7.5 秒给状态维护方；原始世界观察不会自动变化                                                                     |
| 合成时长 10 秒，激活修改条件真/假                                           | 新层时长分别为 15.5/10 秒，原定义和旧层不变                                                                           |
| 20 秒层在第 15 秒延长 20 秒，上限 30                                        | 剩余上限得到到期 40；首次触发总时长上限得到到期 30；刷新得到到期 35                                                   |
| 6 秒层恰在第 6 秒再次触发                                                   | 先到期再创建新层，不延续旧快照或总时长锚点                                                                            |
| 已满层、允许刷新但不新增                                                    | 层数不变，时钟更新，原层激活快照不变                                                                                  |
| 不同绑定、目标、招式组与冷却组                                              | 只共享声明要求共享的状态，队友暴击不触发自己的啄木鸟                                                                  |
| 5 秒冷却，在第 4.999 秒和第 5 秒触发                                        | 前者不输出，后者可输出；一次多动作请求不会被自身冷却截断                                                              |
| 同状态查询两次；同旧状态推进两次；新状态重放一次                            | 查询无请求；两次推进请求 ID 相同；重放报 `EVENT_ORDER`                                                                |
| `syntheticGlobalDamage` 与 `syntheticHitDamage` 用于 `syntheticHitQuery`    | 相同唯一组选择 20%；实体贡献查询与不匹配的命中为 10%；移除唯一性声明后本命中为 30%                                    |
| 通用与命中局部攻击力调整共用唯一键，原始攻击力为 1000，分别加 100/200       | 命中属性为 1200，通用面板仍为 1100；不能从 1100 再追加 200；依赖节点贡献不重复返回                                    |
| 通用与 `scope: hit` 的直接暴击率调整共用唯一键                              | 使用同一命中的 `stat/direct` 地址后选择一次，局部贡献不污染面板；不同受益者、命中或通道仍独立                         |
| `mixedStateBeforeSynchronization` 接受 `renewSuppliedAstra`                 | 核心层到期由 20 改为 30；自动层、其他 supplied 实例、到期为 5 的音擎冷却和已有快照/历史保留，追加同步游标，不产生请求 |
| 续期后接受 `clearSuppliedAstra`                                             | 仅删除耀嘉音该绑定的核心实例，其他实例与冷却保持不变                                                                  |
| 同步批次含重复范围、错误效果/绑定、非 supplied 规则或冲突快照               | 整批失败，旧状态不变；空列表也不能越权清除自动实例                                                                    |
| 同旧状态同步两次；新状态重放；同步后同时间提交不同顺序的战斗事件            | 两次同步结果相同；重放或逆序报 `EVENT_ORDER`；较大 sequence 的不同事件 ID 正常推进                                    |
| `stateBeforeReentry` 接受 `stateReentryTransition`，最大一层且 `keep-count` | 事件前攻击力快照为 1100；移除 A，再为 B 创建一个新实例和新层，层的激活快照仍为事件前结果                              |
| 同一激活身份重触发；更换身份但不满足触发条件或受冷却阻止                    | 前者保留原层身份与快照；后者只移除旧组，不凭状态生效自动建层或重置冷却                                                |
| 下游读取有唯一性的属性                                                      | 只读已选贡献，候选选择自身依赖结果时正确报告环                                                                        |
| 跨实体同名属性依赖、真实环、与查询无关的环                                  | 前者正常求值，真实环报告完整路径，无关的数值环不被本次查询展开；重复依赖复用本次调用的结果                            |
| 缺少必要快照、距离、原始属性、无效 JSON                                     | 定位缺项并失败，不补零或使用新时点数据                                                                                |
| 规则数组重排，或输入被深冻结                                                | 结果与稳定 ID 不变；不尝试修改输入                                                                                    |

## 实施阶段

第一阶段交付运行时校验、配置修改折叠、给定状态的求值与外部实例同步，包含 `prepareEffects`、`supplyEffectState`、`synchronizeSuppliedInstances`、`evaluateEffects` 四个接口。来源绑定、条件、单位、属性阶段、必要快照、唯一性和依赖环检查均属于这一阶段。可以导入并消费符合契约的限时或状态绑定实例；有效层由调用方明确提供，查询按给定时点过滤有效性，不从事件补造实例。

这一阶段以耀嘉音完整数值矩阵、丽娜逐目标范围、命中与通用贡献去重、快照及动作来源、外部同步保留状态等用例验收；不以单个封顶数值作为完成条件。

第二阶段增加 `advanceEffects`，实现已定义的触发、激活阶段修改、时钟、叠层、冷却、稳定请求身份和事件顺序，再验收本节的事件与重入用例。完成这一阶段后才满足完整 `EffectEngine` 接口。游戏定义的自动时序适配须满足[实例页](examples.md#尚需补充的游戏证据)的证据要求。

层数上限、受益对象与生效条件的专用修改字段尚无真实案例，未纳入当前 `ConfigurationChange`。后续加入前须提供具体条款、可区分不同解释的样例，并同步扩展类型、执行语义和验收；合成夹具本身不作为纳入能力的依据。当前定义中的这些字段仍可按其既有类型声明，未登记的修改字段应在校验时拒绝。
