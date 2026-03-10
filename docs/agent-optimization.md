# zzz-agent 优化清单

## 1. ~~[高] 裁剪返回数据，减少 LLM 上下文浪费~~ ✅

**问题**: lookup 工具返回大量计算中间量（原始 stats、全部 promotions、全部精炼等级效果等），LLM 上下文被无关数据占满，影响推理质量和 token 成本。例如 lookupAgent 在已计算面板属性后仍返回 6 个突破阶段的 statBoosts 数组；lookupWEngine 始终返回全部 5 个精炼等级的效果文本，其中 4 份是冗余的。

- [x] **lookup-agent**: 有 `calculatedStats` 时省略 `stats`/`promotions` 原始数据；`coreSkills` 只返回指定等级那一条；`mindscape=0` 或未传时返回空数组
- [x] **lookup-w-engine**: 删除 `allEffects`，只返回 `activeEffect`；有计算值时省略 `baseStat`/`advancedStat` 原始值
- [x] **lookup-bangboo**: 有 `calculatedStats` 时省略 `baseStats`

## 2. ~~[高] 增加列表/筛选能力 + 匹配失败返回候选~~ ✅

**问题**: 所有 lookup 工具只支持按名称精确/模糊匹配，无法回答"有哪些冰属性强攻代理人？"等筛选类问题。匹配失败时仅返回"未找到"，不提供候选列表，用户需反复猜名字。lookupGameMode 的 SD/TS 模式无法指定难度，默认返回最高难度且不同难度可能有相同 versionKey 导致歧义。

- [x] 所有 lookup 工具：不传 `name` 时返回简要列表（id + name + rarity + specialty/attributes），支持按 `rarity`/`specialty`/`attribute` 过滤
- [x] 匹配失败时返回 top-3 候选而非仅"未找到"
- [x] lookupGameMode 增加 `difficulty` 参数（SD/TS），增加 `boss` 参数做 boss 名检索

## 3. ~~[中] calcDamage 默认值文档化 + skillMultiplier 兼容百分比~~ ✅

**问题**: calcDamage 有 25+ 个参数，多个参数的默认值对应特定场景但未说明（如 `defenderBaseDefense=953` 是 Lv60 标准敌人、`defenderResistance=0.2` 是标准抗性），LLM 在计算 Lv70 DA boss 时容易忽略修改这些值。`skillMultiplier` 要求小数格式（5.0=500%）但技能数据存的是 `"500%"` 字符串，LLM 容易忘记转换或传入 500 而非 5.0。

- [x] `defenderBaseDefense` description 标注"Lv60 标准敌人 = 953，Lv70 DA boss 需从 lookupGameMode 获取"
- [x] `defenderResistance` description 标注"默认 20% 为标准抗性，DA boss 弱点属性 0%、抗性属性 30%"
- [x] `skillMultiplier` 支持接受百分比字符串（`"500%"`）或小数（`5.0`），工具内部统一转换
- [x] `critRate`/`critDamage` description 标注为裸面板默认值，提醒 LLM 传入实际值

## 4. ~~[中] System Prompt 拆分截图识别部分~~ ✅

**问题**: System Prompt 共约 306 行，其中截图识别指南占 ~130 行（40%+），包括两种截图类型的详细布局描述和对比表。在纯文本查询场景下这些内容完全无用，白白消耗 token budget，还可能干扰 LLM 在非截图场景下的推理路径。

- [x] 拆为 `BASE_PROMPT` + `SCREENSHOT_SUMMARY` + `SCREENSHOT_GUIDE` 三层结构
- 默认只注入精简版截图摘要；调用方设置 `includeScreenshot: true` 时再注入完整截图指南，`includeScreenshot: false` 时完全关闭截图提示

## 5. ~~[低] 其他问题~~ ✅

- [x] `Memory()` 改为传入 `LibSQLStore({ url: "file:./mastra.db" })`，与 Mastra 实例共享同一数据库
- [x] SD/TS version 搜索已通过第 2 条新增的 `difficulty` 参数解决
- [x] `outputFormatScorer` 正则简化为 `/## .+配置/` 等清晰模式
- [x] `lookupAgent` 搜索顺序反转：优先匹配 list 的短名/slug，再 fallback 到 details 的 fullName
