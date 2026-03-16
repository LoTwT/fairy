# 静态构筑解析系统 V424

## 目标

`V424` 只解决一件事：

- 把 `gachabase/types.ts` 中共享的 `StatBoost` / `AgentSkillDescription` / `AgentSkillStat` list contract 统一收口为显式 alias。

## 范围

1. `StatBoostList`
2. `AgentSkillDescriptionList`
3. `AgentSkillStatList`
4. 复用到 `AgentPromotion`、`AgentSkillGroup`、`CoreSkillLevel`、`BangbooOptimization`

## 非目标

1. 不改任何 published JSON shape
2. 不改字段语义或顺序
3. 不改 resolver、lookup 或 cleaned helper 逻辑

## 当前状态

- `V424.1` 已完成：范围冻结到共享技能/加成 list contract
- `V424.2` 已完成：`StatBoost` 与 agent skill 相关列表已统一复用显式 alias
