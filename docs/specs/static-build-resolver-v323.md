# 静态构筑解析系统 V323：derived view assumption list contracts

`V323` 只解决一件事：

- 把 `views.ts`、`utility-views.ts`、`source-entries.ts`、`matrix.ts`、`trigger-matrix.ts` 中仍直接暴露的 assumption / unsupported list 输入，统一收成显式公开 list contract。

## 范围

1. `summarizeSourceDamageViews()`
2. `summarizeSourceDamageViewCaveats()`
3. `summarizeSourceUtilityViews()`
4. `summarizeSourceUtilityViewCaveats()`
5. `summarizeSourceEntries()`
6. `summarizeSourceEntryCaveats()`
7. `summarizeSourceEntryAssumptions()`
8. `summarizeSkillMatrixCaveats()`
9. `summarizeTriggerMatrixRows()`
10. `summarizeTriggerMatrixCaveats()`
11. `summarizeTriggerMatrixRowCaveat()`

## 非目标

1. 不修改任何 summary runtime 逻辑
2. 不新增新的 summary 字段
3. 不处理 compact helper 输出 contract
