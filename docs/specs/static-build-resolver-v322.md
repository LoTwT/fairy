# 静态构筑解析系统 V322：resolver summary input list contracts

`V322` 只解决一件事：

- 把 `resolver.ts` 中公开 summary helper 仍直接暴露的数组输入，统一收成显式公开 list contract。

## 范围

1. `StaticBuildDiagnosticEntryList`
2. `StaticBuildSourceNoteEntryList`
3. `StaticBuildTraceItemList`
4. `summarizeDiagnosticEntries()`
5. `summarizeSourceNoteEntries()`
6. `summarizeAssumptions()`
7. `summarizeResolveEffects()`
8. `summarizeResolveCaveats()`

## 非目标

1. 不修改任何 summary runtime 逻辑
2. 不新增新的 summary 字段
3. 不处理 compact helper 输出 contract
