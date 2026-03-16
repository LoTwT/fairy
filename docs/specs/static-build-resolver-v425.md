# 静态构筑解析系统 V425

## 目标

`V425` 只解决一件事：

- 把 `gachabase/types.ts` 中 `agent-details.json` 外层资源与内容列表 contract 统一收口为显式 alias。

## 范围

1. `SplashArtList`
2. `AgentSkinList`
3. `AgentStatList`
4. `AgentPromotionList`
5. `AgentSkillGroupList`
6. `CoreSkillLevelList`
7. `AgentPotentialVisionList`
8. `AgentMindscapeList`

## 非目标

1. 不改任何 published JSON shape
2. 不改字段语义或顺序
3. 不改 resolver、lookup 或 cleaned helper 逻辑

## 当前状态

- `V425.1` 已完成：范围冻结到 `agent-details.json` 外层 list contract
- `V425.2` 已完成：资源与内容列表已统一复用显式 alias
