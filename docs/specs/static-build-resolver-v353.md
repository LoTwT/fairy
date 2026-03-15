# 静态构筑解析系统 V353：agent source-entry context contracts

## 背景

`V352` 收口后，`zzz-agent` 侧剩余最明显的公开 helper shape 落在
[resolve-build-source-entry-context.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-entry-context.ts)。

这一层当前仍直接暴露内联 object/union：

1. `resolveBuildToolSourceEntriesContext(input: { scenario; finalPanel })`
2. success / failure 返回分支

## 目标

`V353` 只解决一件事：

- 给 `source-entry context` helper 的导出输入与结果 shape 补显式公开 contract，不改变任何 scenario 或 panel 归一化逻辑。

## 范围

1. `BuildToolSourceEntriesContextInput`
2. `BuildToolResolvedSourceEntriesContextSuccess`
3. `BuildToolResolvedSourceEntriesContextFailure`
4. `BuildToolResolvedSourceEntriesContextResult`
5. `resolveBuildToolSourceEntriesContext()`

## 非目标

1. 不改 `source-entry` 结果 schema
2. 不改 `finalPanelSchema` 校验规则
3. 不调整 anomaly/disorder 的 panel 必填要求

## 完成标准

1. `resolveBuildToolSourceEntriesContext()` 不再暴露内联输入/返回 shape
2. utility-only 与 anomaly/disorder 分支行为保持不变
3. `zzz-agent` 测试与构建通过
