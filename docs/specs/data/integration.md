# 来源数据整合：代理人

## 状态与目标

**状态：规则 v4；单代理人纯整合、离线全量新制品构建、确定性字节与摘要、总索引及完整复验、显式 pnpm 整合与验证命令已实现。既有数据集的增量更新、事务替换、恢复及公开 API 尚未实现。**
`data.json` 与 `details.{locale}.json` 为已确认的文件名，正式类型与测试使用同一命名。

本阶段把分散的来源记录汇集为可查阅、导出和再次加工的完整资料，尽量保留游戏内原文、数值与展示上下文。
不以 `@randomplay/core` 当前是否使用某字段来裁剪内容。来源资料也包含机器编码、资源标识、来源推荐和
未解释字段，不能把它们全部声称为已经核实的游戏内可见文本。

```text
raw：原始来源缓存
  ↓ 自动整合、检查身份、保留原值、生成导航
integrated：完整来源资料
  ↓ 单独人工讨论与重新建模
definitions：经人工确认的计算语义
  ↓ 集成层结合培养配置、装备与战斗状态
core：计算
```

本规范只定义第一阶段代理人资料，来源为 [Nanoka Agents](../nanoka/agents.md)，上游名称 `character`
在整合目录中称为 `agents`。`definitions` 的内部模型由后续人工讨论决定；data 与 core 保持互不依赖。

## 1. 完整导出的边界

以下内容全部属于完整资料导出范围：

- 实体索引记录，以及每种已取得详情语言的完整记录；
- 角色介绍、个人档案、外观、技能说明、效果文案及附加文案；
- 基础属性、成长、经验、培养材料、完整参数展示行和原显示格式；
- 来源分类编码、机器标签、资源标识、推荐与策略；
- 零值、空字符串、`null`、空数组、空对象，以及尚未解释的来源字段。

“完整”以选定本地索引记录和对应详情为边界，不承诺覆盖所有游戏内容，也不证明上游资料正确。索引记录
与详情是两个独立来源，即使部分值相等也分别保留；索引中的 `ja`、`ko` 名称不能冒充这两种语言的完整详情。

`code_name` 是用户明确接受的保真特例：整合产物只保存按第 4.3 节选择的一个来源原值，各语言原始拼写
仍保留在 raw。该字段的其他语言差异不进入 integrated，也不承诺仅凭整合产物还原这些差异；其余字段
继续遵循完整保留规则。

本层不换算百分比、解释成长、填充游戏默认值、解析文本效果或组装 core 输入；也不按相同 ID、相等数字或
相同文案删掉不同位置的记录。材料名称等不在当前输入中的资料，不根据 ID 猜测或隐式联网补齐。

完整导出包含 `index.json` 与该索引登记的实体文件。只提供三个实体文件会漏掉独立来源索引记录和来源信息，
因此不能称为完整的可追溯制品。逐值核对表、构建器、类型检查输入和验证报告属于维护材料，不要求随数据分发。

## 2. 目录与读取单元

```diff
 packages/data/
   raw/
     nanoka/{version}/
       manifest.json
       character.json
       {locale}/character/{id}.json
+  integrated/
+    nanoka/
+      index.json
+      agents/
+        {id}/
+          data.json
+          details.zh.json
+          details.en.json
+  definitions/
```

`raw` 继续按来源版本保存；`integrated` 维护一份当前数据，没有 `{version}/` 目录。`definitions` 是已确认的
职责名称，本次不创建空目录或填入计算模型。

实体目录是维护和读取的基本单位。使用方可以读取全部数据，也可以通过索引只取指定代理人的公共部分和指定
语言；完整可获取不等于必须一次加载全库。`details` 本身是该语言的剩余来源内容，需结合 `data` 才能还原详情。
后续便捷 API 或按语言组合的导出应复用本契约；本规范不声明已有 npm 导出或查询函数。

下文 `data` 与 `details` 分别指公共文件和对应语言文件的顶层对象，不增加同名包装层。文件名及顶层类型名
的调整保持类型内部字段名与层级不变，例如 `data.json` 中的来源属性块仍为 `stats`。后续类型覆盖修订
可补充已观察字段、可选性和元素类型，继续保留该命名与层级约定。

## 3. 输入与保真要求

离线整合选择一个明确的来源版本，读取 `raw/nanoka/{version}`。版本、manifest、实体 ID 与资源限制复用
[Nanoka 共享来源规范](../nanoka/source.md) 的现有策略，不改变抓取器。

1. `character.json` 的顶层 key 决定全部成员，不能扫描目录推断集合。索引必须非空，成员记录必须是普通对象。
2. 读取来源策略登记的完整详情语言，目前为 `zh`、`en`。不跨版本补缺，不以中文或英文自动填补另一种语言。
3. 本版整合要求详情有数值 `id`，其规范十进制形式与目录及索引 key 一致。缺失或身份冲突时失败；这比抓取器
   的轻量检查更严格，不向原始详情补写 ID。
4. 使用严格 UTF-8 解码。保真指解码后 JSON 值的类型、内容和数组顺序，不承诺源文件空白、转义写法或对象
   成员排列的字节相等；原始字节仍保留在 raw。非有限数值、不安全整数及无法往返序列化的值必须拒绝。
5. 一次输入集合的原始文件字节摘要进入索引。摘要标识本次使用的本地内容，不证明缓存来自同一抓取批次。

## 4. 字段命名、注释与归属

### 4.1 只规范拼写，保留来源用词

`data.json` 与 `details.{locale}.json` 中，已登记的结构字段只从来源 snake_case 转为 camelCase。
保留原来的词义、缩写和层级：`partner_info` → `partnerInfo`、`skill_list` → `skillList`、
`crit_dmg_res` → `critDmgRes`；`desc`、`param`、`prop`、`main`、`defence`、`desc2` 不另起名称。
不把来源 `weapon_type` 改称 `specialties`，也不借改名推断新的游戏语义。

本版另外登记 `live2_d` → `live2D`，以及 `potential_detail/{id}` 内的 `level_show_name` → `levelShowName`、
`ability_list` → `abilityList`、`potential_materials` → `potentialMaterials`；其材料数组元素中的 `item_id` →
`itemId`。`number` 仍称为 `number`，条目 ID 与数组层级不变。

该规则只适用于已识别的结构字段，不能对 JSON 的所有 key 递归执行字符串替换：

- 实体 ID、属性 ID、材料 ID、技能类别 key、阶段 key 和语言 key 均原样保留；`basic_attack` 若是类别 key，
  就不能变成 `basicAttack`。
- 字段值不变，包括机器标签、文本、模板、资源路径、零空值和数组顺序；不改写字符串内部的下划线。
- 未识别字段和未知容器的 key 先保持原名；确认其属于结构字段后，再登记转换。不能猜测未知对象是记录还是字典。
- `index.agents[id].sourceRecord` 是独立来源索引记录，保留原始 key；索引自身的元信息使用 camelCase。
- 来源字段与已登记的驼峰目标名称发生冲突时必须失败，包括目标名已经被未知字段占用的情况；不能覆盖或合并值。

每个显式声明的 TS 字段，包括嵌套字段，都应有独立 JSDoc。注释说明来源 key（发生改名时）、内容或身份空间、
已知单位和缩放、缺失或空值的处理；尚未确认的用途、单位或编码含义要明确标记，不能把推测写成事实。
字典 key 的语义在对应 `Record` 字段上解释，未知结构以 `SourceJson` 保留。注释齐全不等于游戏语义已全部确认。

[正式包内类型](../../../packages/data/src/integration/agent-types.ts) 覆盖本地 `3.1` 索引 58 个成员的已观察结构，两个主要入口是
`AgentData` 和 `AgentDetails`；索引及共享子结构另外声明。该覆盖不外推到未来快照，也未进入包公开 API。
[结构变体 fixture](../../../packages/data/test/fixtures/agent-variants.ts) 同时参与类型检查和整合测试，覆盖可选资源、空对象、潜能和参数数组，不代替完整记录。

### 4.2 共享提取与本语言内容

`data` 表示已明确登记的公共部分；除第 4.3 节的 `codeName` 特例外，均按实体和字段身份核对一致。
它不限定只含数字；`details` 也可以包含原始
数值，尤其是与本语言展示行不可可靠分离的参数。命名转换不改变既有拆分边界。

除 `codeName` 特例外，公共提取必须同时满足：来源路径已登记、对应实体或来源 key 明确、各语言该路径的完整值一致。不能仅因两个值
相等就自动共享，也不能按数组位置对齐不同语言的段落。已登记公共值冲突时明确报错，不默选一种语言。

对按 key 拆分的外观、技能类别、技能元数据、成长阶段、核心技能条目和 talent 阶段，仅共享全部语言都存在
的同一 key；单种语言独有的条目完整留在该语言。未落入登记共享路径的新增字段也留在本语言。整块共享的
对象和数组保留内部所有成员，不能用类型声明挑掉未知成员；这些块出现跨语言差异时仍按公共冲突处理。

可选资源字段为 `live2_d`、`partner_info.icon_path` 和 `partner_info.role_icon`。已提供的值须为字符串；
全部语言同有且完整值相等时提取到 `data`，全部缺失时不生成字段，只在某语言出现时完整留在该语言的
`details` 中，包括空字符串。两侧都提供却不同仍报共享冲突，不能套用 `codeName` 特例。
`partner_info` 容器和 `inter_knot_icon` 继续要求存在；原本缺失的档案字段不补成空字符串或空数组。

下表第一列使用来源拼写，输出两列使用转换后的字段名；未列出的嵌套已知结构字段同样只改变拼写。

| 来源字段                                          | `data.json`                                                                                           | `details.{locale}.json`                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `id`                                              | `id` 原值                                                                                             | 同值身份副本，便于单文件核对                                    |
| `icon`、`rarity`、`gender`                        | `icon`、`rarity`、`gender` 原值                                                                       | 无重复载荷                                                      |
| `code_name`                                       | `codeName`，按第 4.3 节选取一个来源原值                                                               | 不保留重复值或其他语言的不同拼写                                |
| `live2_d`                                         | `live2D?`，按上述可选资源规则共享                                                                     | 单语言独有时保留 `live2D?` 原值                                 |
| `name`                                            | 无                                                                                                    | `name`，当前语言原名                                            |
| `weapon_type`、`element_type`、`hit_type`、`camp` | 派生 `classificationIds`，见第 5 节                                                                   | `weaponType`、`elementType`、`hitType`、`camp`，完整分类字典    |
| `special_element_type`                            | 不生成分类 ID                                                                                         | `specialElementType`，完整空对象或描述对象                      |
| `partner_info`                                    | `partnerInfo.interKnotIcon` 必需；`iconPath?`、`roleIcon?` 按可选资源规则共享                         | 其余档案字段均可缺失；保留单语言独有的 `iconPath?`、`roleIcon?` |
| `skin`                                            | 按外观 ID 提取 `image`                                                                                | 名称、说明及剩余成员                                            |
| `stats`、`level`、`level_exp`                     | `stats`、`level`、`levelExp`，完整原块                                                                | 无重复载荷                                                      |
| `extra_level`                                     | `extraLevel` 各阶段 `maxLevel`，各属性 `prop`、`value`                                                | `extraLevel` 各属性名称、格式及剩余成员                         |
| `skill`                                           | 按类别 key 提取 `material`                                                                            | 完整 `description`、参数展示行及剩余成员                        |
| `skill_priority`                                  | `skillPriority`，完整来源推荐记录                                                                     | 无重复载荷                                                      |
| `skill_list`                                      | `skillList` 按自身 ID 提取 `elementType`、`hitType`、`potential`                                      | `skillList` 各条目的名称、说明及剩余成员                        |
| `passive`                                         | `materials`，各条目 `id`、`level`                                                                     | 原文、`extraProperty`、`potential` 及剩余成员                   |
| `talent`                                          | 各来源阶段的 `level`                                                                                  | `name`、`desc`、`desc2` 及剩余成员                              |
| `fairy_recommend`                                 | `fairyRecommend` 的 `slot4`、`slot2`、`slotSub`、`partSubList`；`part4/5/6/partSub` 的 `prop`、`icon` | `fairyRecommend` 各属性名称、格式及剩余成员                     |
| `strategy`                                        | 无                                                                                                    | 原字符串数组或原空对象，分别保留                                |
| `potential`                                       | 完整数值数组，允许为空                                                                                | 无重复载荷                                                      |
| `potential_detail`                                | 无                                                                                                    | `potentialDetail`，完整潜能条目字典，允许为空；材料保留数组结构 |
| 索引中的实体记录                                  | 不覆盖到详情                                                                                          | 完整保存在 `index.agents[id].sourceRecord`，不修改原 key        |

该表定义本版共享提取路径，不承诺每个来源字段的游戏语义。必需容器缺失、已登记字段不符合所声明的可选性
或类型时，报告结构不兼容；未知新增成员完整保留并报告待登记，不能因为未写入 TS 类型就丢弃。

提取后的父对象可以保留空壳，以便按来源路径还原；它属于拆分结构，不能冒充来源本来为空。还原时先按显式
登记恢复来源字段拼写，再删除明确登记的辅助字段及重复身份，按不覆盖叶子的规则组合对象；对象可组合，数组
整体保留，重叠叶子必须失败。不能用通用的 camelCase → snake_case 规则猜测所有 key 的原始拼写。

### 4.3 `codeName` 取值特例

来源 `code_name` 是名称字符串，可能包含英文、罗马字、空格或符号，不用作稳定实体 ID。输出只改变字段
拼写为 `codeName`，放入 `data.json`，不翻译、裁剪空白或调整来源值的大小写。

每次整合按来源配置的详情语言顺序，取第一个详情中读到的 `code_name` 原值。该顺序写入
`index.source.detailLocales`，当前为 `zh`、`en`，因此当前取中文详情里的值；选择不依赖并发读取的完成顺序。
后续语言的不同拼写不覆盖已选值，也不触发共享一致性错误；其他共享字段仍严格比较完整值。

这只豁免字符串值的跨语言一致性检查。每个详情的 `code_name` 仍须存在且为字符串；缺失或类型错误
按结构异常处理。空字符串是来源原值，不通过真值判断改用后续语言。

例如本地 `3.1` 的 `1371`、`1471`、`1511` 分别输出 `Yixuan`、`BanYue`、`NangongYu`；英文详情中的
`YiXuan`、`Banyue`、`Nangong Yu` 只保留在 raw。来源定位均为 `zzz/3.1/{locale}/character/{id}.json`
的 `/code_name`。维护用核对报告应明确列出按此特例舍弃的语言差异，不把它们计作相等映射；不得将该豁免
扩大到其他字段。

### 4.4 已观察的类型变体

- `data.partnerInfo.iconPath`、`roleIcon` 及 `details.partnerInfo` 的档案字段允许缺失；本地 `1381`、`1531`、
  `1551` 的来源个人资料仅含 `inter_knot_icon`，共享提取后的语言文件保留空壳 `{}`。
- 各层 `potential` 与参数中的 `attackData` 均为 `number[]`，保留空数组、零值和顺序；同名数组的位置和用途
  分别解释，不能根据相同数值自动建立关联。
- `strategy` 为 `string[] | SourceEmptyObject`；`specialElementType` 为完整 `name/title/desc/icon` 描述记录
  或 `SourceEmptyObject`。该空对象类型使用 `Record<string, never>`，与缺失、`null`、数组分别处理。
- `potentialDetail` 为按自身 ID 保存的 `SourcePotentialDetail` 字典，保留内嵌数值 `id`、原文、`abilityList`
  及有序 `potentialMaterials`；材料元素仍是 `{ itemId, number }`，不改成数量字典。
- `extraProperty` 的每个来源 key 对应 `SourceExtraProperty` 的 `target`、`value` 数值。当前出现的 `111`、
  `121`、`131` 不改名、不建业务枚举；转换方向、目标属性和计算阶段留给后续人工建模。

上述记录的结构可以明确建模，仍未确认的游戏语义在类型注释中标出。可选字段表示来源可能没有提供，并不授权
用另一语言或默认值补齐。运行时校验还须检查普通 JSON 对象、合法数值及字段冲突，不能仅依赖 TS 赋值检查。

## 5. 分类与参数关联

### 5.1 分类编码

`data.classificationIds` 只包含 `weaponType`、`elementType`、`hitType`、`camp` 四个字段，其值为对应
来源字典的规范十进制 key 数组，按数值升序排列。原字典保留于各语言；共享分类必须核对语言间 ID 集合一致，
不靠译名判断一致。不同字段的相同整数不意味着同一身份。

来源 `special_element_type`（输出 `specialElementType`）不参与该规则。本地 `3.1` 的 `1091`、`1371`、`1431` 含 `name/title/desc/icon`
描述对象，安比则为空对象；不能把这些字段名当成分类 ID。

### 5.2 参数导航

每个语言文件包含 `navigation`：

| 字段                  | 含义                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `parameterIdsByGroup` | 来源技能类别 key → 本类别结构化参数表出现的 ID 数组，去重后按数值升序排列 |
| `parameterRowsById`   | 参数 ID → 指向本文件完整展示行的 JSON Pointer 数组                        |

逐语言遍历 `skill[group].description[section].param[row].param`。包含参数表时，表中每个 ID 都登记当前
**完整展示行**；同一行有多个 ID 就分别登记，同一 ID 在多行出现则全部保留。导航按类别 key 的确定性顺序、
来源段落索引、来源行索引排列。同一 ID 的同一路径不重复，不同路径不能因载荷相等而合并。

不含 `param` 的说明段或展示行仍完整保留，不解析纯文本来生成参数；参数表为空时没有 ID 出现。已消费的
段落和行必须是普通对象，`description` 和展示行 `param` 必须是数组，行内参数表必须是以规范 ID 为 key、
普通对象为值的对象。未登记的位置不参与自动发现。

`skillList`（来源 `skill_list`）与参数表是两个身份空间，**不再生成将同号 ID 合并的 `moves` 表**。安比输出 `skillList[1011002]`
的名称为“普通攻击：落雷”，参数表同号 ID 却出现在“二段伤害倍率”行。同号最多是待考证线索，不能成为已
确认招式关系。元数据只有自身的 key；参数 ID 即使没有对应元数据，也必须正常保留与导航。

Pointer 采用 [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.html) 的字符串形式，根为当前 `details` 文件；
`~` 与 `/` 分别转义为 `~0`、`~1`，解码先处理 `~1` 再处理 `~0`。只能解析已存在的自有成员，不能执行表达式。
数组索引只描述本次文件内的位置，不是跨版本稳定身份；文件变化后必须使用随该文件生成的新导航。

## 6. 来源值、身份副本与派生字段

| 输出位置                                                  | 性质与追溯规则                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `index.agents[id].sourceRecord`                           | 对应 `zzz/{version}/character.json` 的 `/{id}`，完整原值和原 key    |
| `data` 中除 `classificationIds`、`codeName` 外的字段      | 各详情在对应来源路径的已核对原值；已知字段段仅转换拼写              |
| `data.codeName`                                           | `source.detailLocales[0]` 对应详情的 `/code_name` 原值，见第 4.3 节 |
| `details` 中除 `locale`、`navigation`、重复 `id` 外的字段 | 本语言详情在对应来源路径的原值；提取后空壳按第 4 节解释             |
| `details.id`                                              | 从详情复制的身份，与 `data.id`、目录和索引核对                      |
| `details.locale`                                          | 输入文件的语言标识，不是检测或翻译结果                              |
| `data.classificationIds`                                  | 按第 5.1 节从来源对象 key 派生                                      |
| `details.navigation`                                      | 按第 5.2 节派生，仅指向参数出现位置                                 |
| 索引其余字段                                              | 来源定位、范围、规则版本和文件完整性元信息                          |

来源 Pointer 与输出 Pointer 必须分别记录，不能再假定两者相同。例如来源 `/partner_info/profile_desc`
对应输出 `/partnerInfo/profileDesc`；来源字段段改变拼写，ID、类别 key 与数组索引不变。
未知字段原名保留，必须能按实际登记规则恢复原始路径。维护用逐值映射表不要求随资料分发。

原字段 `locale`、`navigation`、`classification_ids` 或 `classificationIds` 若与辅助字段发生顶层重名，
本版必须失败并报告具体位置。字段拼写转换引起的嵌套冲突同样失败，不能覆盖、静默删掉或臆造改名。

不必为每个字面量建立编号映射。只在来源有明确身份时保留分类、实体、材料或参数 ID；原文和机器标签仍可
直接读取。把属性编码映射为 core 枚举、确定倍率单位或解析效果条件属于后续人工建模。

## 7. 索引契约

`index.json` 只描述完成并验证的产物，不保存重试、进度或待写入状态。

| 字段                               | 类型与约束                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `format`                           | 固定 `fairy-nanoka-integrated/v2`，约束文件外壳、拆分和导航契约                      |
| `rulesVersion`                     | 本版 `nanoka-agent-reference/4`，标识共享提取、字段拼写及派生规则                    |
| `scope.kind`                       | 完整索引导出为 `full-index`；当前单实体样例为 `single-agent-example`                 |
| `scope.agentIds`                   | 当前输出 ID，按数值升序、无重复，必须与 `agents` key 集合完全一致                    |
| `scope.completeDataset`            | `full-index` 为 `true`，并须验证全部来源索引成员；样例为 `false`                     |
| `source.id`                        | 固定 `nanoka-zzz`                                                                    |
| `source.version`                   | 明确输入版本，与全部详情输入一致；不添加产物版本目录                                 |
| `source.detailLocales`             | 实际读取的完整详情语言，按来源配置顺序；当前 `zh`、`en`                              |
| `source.inputs`                    | 每个输入的 `resource`、原始字节 `sha256`；索引摘录可带 `pointer`                     |
| `agents[id].sourceRecord`          | 完整来源索引记录，保持原字段和原类型                                                 |
| `agents[id].files.stats`           | `{ path, sha256 }`，指向 `data.json`                                                 |
| `agents[id].files.content[locale]` | `{ path, sha256 }`，指向 `details.{locale}.json`，成员与 `source.detailLocales` 一致 |

索引字段 `files.stats` 与 `files.content` 保持既有名称；本次文件重命名只更新其中的 `path`。

`resource` 使用来源相对资源名：`manifest.json`、`zzz/{version}/character.json`、
`zzz/{version}/{locale}/character/{id}.json`。输入清单依次记录 manifest、实体索引，再按实体 ID 和配置
语言顺序记录详情；文件摘要均为小写十六进制 SHA-256。一个资源只登记一次，完整导出不带摘录 Pointer。

输出 `path` 相对于 `integrated/nanoka/`，必须等于第 2 节对应实体及语言的固定路径；不得使用绝对路径、
`..` 或远程 URL。输出 `sha256` 针对实际文件字节。索引不记录自身摘要，避免循环；也不记录生成时间或主机路径。
输入哈希和输出哈希用途不同，不能互相替代。

索引原记录是独立的来源材料。阅读某语言时不能把其中混合语言的 `desc` 自动当作当前语言的详情或回退文本。

规则 v3 增加 `codeName` 取值特例；v4 另外登记可选资源提取和潜能详情内的字段拼写，文件外壳仍为 v2。
已有规则 v2/v3 产物必须重新判定并生成受影响文件，不能只改索引中的版本标记来宣称已符合新规则。

## 8. 序列化、增量与导出一致性

实体文件及索引使用 UTF-8、两个空格缩进、末尾 LF。规范十进制 key 按整数值排序并置前，其余 key 按
UTF-16 代码单元顺序排列；数组原序保留。固定输入和规则应得到相同字节，对象 key 的输入排列不影响结果。
可对制品使用紧凑 JSON 或传输压缩，但重新序列化后必须按实际输出字节重算索引中的输出哈希；JSON 值仍需相等。

首次建立当前数据，后续增量识别新增、内容变化、规则变化及索引成员移除；相同内容无需反复重写实体文件。
来源版本变化必须先取得该版本完整输入集合，不能混用旧版本详情填缺。失败抓取或暂时缺少文件不能解释为删除。
完整且验证通过的来源索引才可以决定成员移除。

三个实体文件与索引构成一次一致的读取结果。**最后写索引与逐文件原子替换都不等于多文件事务**：覆盖一部分
文件后中断，旧索引无法让旧文件自动恢复。哈希只能发现不一致，不能保证回滚。

针对既有当前目录的生产更新写入器，必须提供整组写入、失败恢复和并发读取约束，并通过中断实验验收；本轮未实现该协议。离线全量构建只创建独占的新临时制品，不覆盖已有目录。
读取或再次导出时应基于一个已完成的数据集，读取文件后核对摘要，再对已核对的同一批字节解码使用；检测到
更新中或摘要不符即拒绝，不拼接新旧文件。可供消费的完整制品与可变工作目录不能混为一谈。

完整资料不因排版行数大而删减。优先按实体和语言读取、压缩传输；按语言组装的视图只能重排或组合资料，不能
悄悄变成面向计算器的精简模型。真实数据分发与包边界继续引用 [来源规范](../nanoka/source.md)。
单实体整合模块仅供包内使用，npm `files`、`exports` 及当前空 API 不变。

## 9. 包内实现与验收证据

### 当前单实体实现

[纯整合函数](../../../packages/data/src/integration/integrate-agent.ts) `integrateAgent` 接受
`{ entityId, sourceRecord, details, detailLocales }`：实体 ID 明确给出，独立索引记录和各语言详情以 `unknown`
进入运行时校验；显式有序的语言列表决定 `codeName` 来源。详情集合必须恰好覆盖该列表。
调用方负责后续从来源配置取得完整语言列表，函数本身不读取配置或文件，也不填补未传入语言。

返回 `{ data, details, sourceRecord, maintenance }`：`data` 和 `details[locale]` 分别是文件对应的顶层对象，
`sourceRecord` 为独立索引副本；`maintenance` 单独记录未知字段提示及其他语言的 `codeName` 差异。
失败抛出 `AgentIntegrationError`，携带实体、语言和来源 JSON Pointer，不返回部分结果。
共享提取与改名路径集中在[结构登记表](../../../packages/data/src/integration/agent-schema.ts)，
抓取器和整合器共用[来源身份策略](../../../packages/data/src/nanoka-identity.ts)。

整合前检查共享结构登记：`shared` 只能标记可拆分对象的字段，支持整块共享对象和数组；
数组内部、已声明整块共享的值内部及字典元素本身不能再标记 `shared`。不支持的登记抛出携带
schema 路径的维护错误，不冒充来源结构异常，也不依赖来源字段是否出现；对应
[共享登记回归测试](../../../packages/data/test/agent-sharing-schema.test.ts)纳入包常规检查。

该纯函数仅处理已解析 JSON，验证来源值、必需字段、可选结构、共享一致性、保真与对象结果确定性。
文件读取、严格 UTF-8 解码、摘要、序列化和全量索引由下述独立模块负责，这些职责不加入 `integrateAgent`。
单实体对象测试不代替文件流程验收。未实现计算 helpers、definitions、core 映射或公开查询 API。

旧文档 example 已迁移并删除：

- 类型成为[唯一正式定义](../../../packages/data/src/integration/agent-types.ts)，保留逐字段中文 JSDoc。
- 结构变体进入[类型正例 fixture](../../../packages/data/test/fixtures/agent-variants.ts)、
  [类型正反例](../../../packages/data/test/agent-types.typecheck.ts)及[整合测试](../../../packages/data/test/agent-integration.test.ts)。
  包 `typecheck` 开启 `exactOptionalPropertyTypes`；负例的 `@ts-expect-error` 必须实际匹配错误。
- 局部 JSON 示意中的多 ID、重复用途、纯文本、单语言条目和 Pointer 转义进入同一整合测试，使用
  [完整合法的最小合成输入](../../../packages/data/test/fixtures/agent-source.ts)。测试不把旧局部示意当作完整记录，
  也不依赖真实 raw；[独立测试侧还原](../../../packages/data/test/fixtures/agent-roundtrip.ts)核对全部来源载荷，
  另以手写预期检查共享归属、分类集合和导航。

在仓库根目录运行常规离线检查（`verify:pack` 包含普通 build 及离线安装检查）：

```bash
pnpm --filter @randomplay/data typecheck
pnpm --filter @randomplay/data test
pnpm --filter @randomplay/data verify:pack
```

### 当前离线全量新制品构建

[构建器](../../../packages/data/scripts/nanoka-integration/build.ts) `buildNanokaAgents` 接受
`{ rawRoot, version, temporaryParent?, policy? }`。`rawRoot` 明确指向 `raw/nanoka`；版本必须在该版本目录的
已校验 manifest 的 `available` 内，不自动取最新版本。默认读取工作区来源配置，显式注入的策略也调用
抓取器共用的 `validateSourcePolicy`；详情必须覆盖配置中的全部语言并保留顺序。

`character.json` 的非空顶层 key 是唯一成员来源。只按实体数值升序读取索引成员的全部详情，目录中的旧缓存
不参与构建；不跨版本或跨语言填缺。逐个实体调用既有 `integrateAgent`，不复制字段转换、共享提取或导航规则。
[文件读取模块](../../../packages/data/scripts/nanoka-integration/files.ts)通过同一个文件句柄分块读取，
严格 UTF-8 解码、JSON 解析、JSON 值校验与原始摘要共用同一份字节。错误保留资源名、实体、语言和来源 Pointer。
原始字节摘要不证明缓存来自同一抓取批次。

本地预算复用来源策略中的以下口径（包含 manifest 和完整索引）：

| 来源配置                  | 本地口径                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `maximumResponseBytes`    | 每个原始文件最多 16 MiB，检查文件大小并在读取增长时执行硬上限 |
| `maximumRecordsPerEntity` | 索引最多 10,000 个成员                                        |
| `maximumAssetsPerRun`     | manifest、索引和全部配置语言详情合计最多 25,000 个资源        |
| `maximumBytesPerRun`      | 本次实际读取的原始字节合计最多 256 MiB                        |
| `maxConcurrency`          | 本地串行读取与逐实体处理，并发为 1，不超过来源上限            |

表中数值是当前配置，运行时以已校验策略为准。网络节流、HTTP 重试和超时不应用于离线构建，不加载 HTTP 客户端。
输出另设原始单文件与累计字节预算各 16 倍的有限膨胀上限，以容纳缩进、导航和索引；索引受累计输出预算限制。
超限时失败，不裁剪内容。配置文件属于工作区受信维护输入，不登记到原始来源资源清单。

显式根目录先解析系统路径别名（如 macOS `/var`），其解析结果作为边界。根下每级路径拒绝符号链接，包含
仍指向根内的链接；版本和 ID 复用来源策略，文件必须是普通文件。打开时使用 `O_NOFOLLOW`、`O_NONBLOCK`，
检查句柄身份和路径边界，防止静态链接越界、设备文件或 FIFO 读取。临时父目录不能位于只读 raw 范围内。
本步要求构建期间本地目录不被并发替换；没有提供对并发目录重命名攻击的隔离或现有数据集的并发更新协议。

[纯序列化模块](../../../packages/data/src/integration/serialize-json.ts) `serializeJson` 实现第 8 节字节契约，
直接输出对象成员，避免 JavaScript 对整数属性枚举的二次排序。规范十进制 key 用长度及代码单元比较整数大小，
不经 `Number` 转换；未知成员、特殊自有 key、Unicode 字符串与数组原序保留。

每次以 `mkdtemp` 创建独占的新目录，文件以排他创建方式写入：

```text
fairy-nanoka-agents-<独占后缀>/
  integrated/nanoka/
    index.json
    agents/{id}/data.json
    agents/{id}/details.{locale}.json
  maintenance.json
```

全部实体文件写出并回读验证、文件集合与完整来源索引对应后，才构造 `completeDataset: true` 的总索引。
索引写出后由[制品验证器](../../../packages/data/scripts/nanoka-integration/verify.ts)
`verifyNanokaAgentArtifact` 再次完整检查路径、实际字节摘要、身份、语言、来源清单顺序和成员集合，
拒绝缺失、多余文件、额外空目录和混入的维护文件；解码校验使用摘要核对的同一批字节。
构建器始终调用规范序列化函数，实体文件以该字节摘要回读核对；同时传入完整输入所导出的预期索引，
核对索引规范字节、来源记录与输入摘要未在写入过程中改变。
独立验证器允许按第 8 节重新序列化实体文件并更新摘要，也允许索引自身重新排版；不强制副本采用构建器的排版。
副本与原制品的 JSON 值相等需另行核对，验证器只检查副本内部一致性；传输压缩先解压再验证。
独立调用验证器只证明制品自身一致，不认证 raw 来源真实性或重新证明完整抓取批次。

成功返回本次独占根目录 `buildDirectory`、`artifactDirectory`、复验索引、计数和独立的 `maintenanceReportPath`；
使用完毕后可整体删除 `buildDirectory`，包含制品与维护报告。所有维护诊断保存在
`integrated/nanoka` 外。任何校验或写入失败都不返回成功路径，只清理本次独占目录。可用制品不得被当作
可变当前目录使用；本步不覆盖现有 integrated，不实现增量、成员删除、迁移、事务替换或进程中断恢复。

工作区显式复跑入口（在仓库根目录执行）：

```bash
pnpm --filter @randomplay/data integrate:nanoka:agents raw/nanoka 3.1
pnpm --filter @randomplay/data verify:nanoka:agents /absolute/build/integrated/nanoka
```

命令分别接受 `<rawRoot> <version> [temporaryParent]` 和 `<artifactDirectory>`。相对路径以进程工作目录解析；
上述 filter 调用在 `packages/data` 执行，因此使用 `raw/nanoka`。在 data 包目录执行可省略 filter；绝对路径也可用，
带空格路径须加引号。第三个参数是已存在且位于 raw 外的父目录，省略时用系统临时目录，不是最终制品目录。
每次返回新路径；同一输入复跑时比较全部制品文件字节。仓库内任意层级的 `fairy-nanoka-agents-*` 临时目录被 Git 忽略，
相邻源码、文档与人工维护的数据文件不因该规则被忽略。

仅单独的 `--help` 或 `-h` 输出用法并以 0 退出，不访问输入或创建产物；缺少、多余、空位置参数或未知选项
在调用构建器或验证器前拒绝。成功时脚本 stdout 输出一个 JSON 对象，退出码为 0；失败时 stdout 不输出回执，
stderr 使用[共享终端错误规则](../nanoka/source.md#终端错误文本)，退出码为 1。库的结构化异常和来源原值保持完整。
两个离线入口也将 stdout 的异步错误交给同一错误出口，包含接收端提前关闭产生的 `EPIPE`；帮助和 JSON 回执均适用。
回执发送失败时保留已经完成的制品，不将输出传输失败视为构建失败而清理数据。
整合回执保留全部原有路径与计数字段，并包含 `buildDirectory`；验证回执从已验证索引取得 `agentCount`、
`detailLocales`，连同实际绝对 `artifactDirectory` 与 `verified: true` 返回。机器解析时使用 `pnpm --silent`，
避免 pnpm 自身的执行信息混入 stdout。

完整命令、回执字段与按确切 `buildDirectory` 清理的方法见[data README](../../../packages/data/README.md#离线全量构建)。
脚本不挂接普通 `build`、`test`、`check`、`prepack` 生命周期，不增加 npm `bin`、`files`、`exports` 或公开 API。

[全量合成测试](../../../packages/data/test/agent-build.test.ts)覆盖完整输入、非法编码/数值/结构、资源预算、
路径越界/符号链接/非普通文件、忽略旧缓存、缺失拒绝、输入字节复用、全部摘要、配置语言顺序、重复构建、
来源排版变化、重新序列化副本与制品篡改；大诊断量测试核对预算内未知字段及维护信息完整保留，
不把诊断数组展开为调用实参。模拟中途及索引/报告写入失败，核对只清理本次资源。
[实际命令测试](../../../packages/data/test/agent-cli.test.ts)通过真实 `pnpm --silent` package scripts 串联构建与复验，
覆盖仓库根目录 filter/data 包目录、相对/绝对/空格路径、实际回执、帮助和参数拒绝、缺失和无效制品、
来源控制字符及超长 Pointer 的转义与限制、失败清理和已有目录保留，并用 `git check-ignore` 检查实际临时目录及相邻正常文件。
断管测试先关闭真实 stdout 管道的接收端，再放行命令，检查帮助和回执失败的错误格式、退出码及原始数据和制品保留。
这些命令测试仅使用合成输入和独占临时目录，禁止网络请求，不触发真实数据生成。
[独立序列化预期](../../../packages/data/test/agent-serialization.test.ts)使用手写字节检查大整数 key、
非规范数字 key、特殊自有 key、Unicode 与数组顺序。普通测试不依赖真实 raw 或网络，步骤一类型和整合测试保留。

2026-09-14 使用此实现显式读取本地 `3.1`，并在新目录重复构建：实际索引 58 个成员，配置语言 `zh/en`，
118 个原始输入文件、175 个制品文件。两次全部制品字节一致；独立回读核对所有输入摘要及输出摘要通过。
未知字段诊断 0；`codeName` 差异 3，实体为 `1371`、`1471`、`1511`，沿用第 4.3 节的原值选择。
真实制品、维护报告及一次性摘要核对报告仅位于本机临时目录，不加入 Git；该验证不扩展下述历史还原和类型验证范围。

### 历史契约验证

以下保留此前一次性工具对当时本地快照的验证记录；不是当前纯函数对真实 raw 的重跑结果，也不代表文件写入协议已完成。

2026-09-14 按规则 v4 重新读取本地 `3.1` 索引全部成员及双语详情，执行离线拆分、还原和严格类型赋值：

| 检查       | 结果                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 输入范围   | 58 个索引成员、116 个详情；连同索引与 manifest 核对 118 个输入摘要                                   |
| 输出与类型 | 174 个实体文件及 1 个完整索引；175 处严格 TS 赋值通过，开启 `exactOptionalPropertyTypes`             |
| 来源保真   | 173,705 条来源值映射通过；仅按特例排除 3 处英文 `code_name` 差异，其余详情及索引记录可还原           |
| `codeName` | `1371`、`1471`、`1511` 分别取 `Yixuan`、`BanYue`、`NangongYu`；差异单列记录                          |
| 参数导航   | 4,810 次参数出现均有准确行指针；重复用途、纯文本行及数组顺序保留                                     |
| 文件确定性 | 175 个输出摘要核对通过；颠倒输入对象 key 顺序不改变输出字节；原始输入摘要未变                        |
| 边界验证   | 46 个运行时探针通过，覆盖配置顺序、空字符串、缺失/错误类型、其他共享冲突、单侧可选资源及新增命名冲突 |
| 类型边界   | 18 个合法形态通过，24 个错误形态被拒绝；另有 72 处边界输出赋值通过                                   |
| 字段注释   | 212 处显式属性声明均有独立 JSDoc；未知游戏语义仍明确标注                                             |

该轮生成的是用于验证当时契约的本地完整资料；当时尚未实现生产整合工具。当时的一次性脚本不等于当前构建器，
也不证明增量写入、故障恢复、运行时查询 API 或发布已实现；本地一次性验证脚本不能当作生产工具。此前安比 v2 的实体文件与仅改文件名的数据副本保持原状，不能冒充 v4 产物。

## 10. 后续实现的验收入口

后续增量更新和恢复流程应复用本契约、当前纯函数与全量构建器。下列是完整流程的验收清单；单实体与
全量新制品部分已通过合成测试，跳过重写、成员删除、现有目录替换及中断恢复仍待实现，真实 raw 不作为 CI 前提：

1. 完整索引成员、语言和身份检查，忽略多余旧缓存；非法输入、缺详情、错误编码和数值明确失败。
2. 双向完整性：除第 4.3 节明确列出的其他语言 `code_name` 差异外，每个来源值都有相等输出；
   `data.codeName` 必须等于选定来源原值。每个输出值来自来源、身份副本、声明派生规则或拆分空壳。
3. 共享值冲突、来源字段及驼峰目标重名、未知成员、零空值、独有语言条目及特殊自有 key；字典 key 不改名。
4. 导航精确覆盖多 ID、重复用途、纯文本、缺元数据、特殊字符及跨语言独立数组顺序。
5. 确定性字节、输出摘要、来源摘要、篡改拒绝，以及内容不变时跳过重写。
6. 新增、修改、规则升级、权威索引移除与失败抓取的区分；多文件更新中断和恢复。
7. 普通 build、test、pack 保持离线，不读取真实缓存，不触发真实数据抓取或写入真实数据集；测试仅使用合成输入，并在独占临时目录中执行构建与验证，输出与维护材料按制品边界分别检查。
8. `codeName` 的等值、不同拼写、空字符串、缺失和错误类型；按配置顺序选值，读取完成顺序变化不影响结果，
   后续语言不覆盖，且相同豁免不适用于其他共享字段。

本步已将正式类型、单实体整合、离线全量构建、严格解码、确定性摘要与序列化、总索引及制品复验纳入常规检查，
并接入显式 pnpm 整合与验证命令。固定当前数据集的更新协议属于步骤三，仍需实现增量识别与跳过重写、完整索引驱动的成员移除、规则升级、现有数据集的
整组替换、并发读取约束及中断恢复验收。运行时查询 API、制品发布渠道和人工计算模型分别在其对应任务中确定。
