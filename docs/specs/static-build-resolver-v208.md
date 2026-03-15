# 静态构筑解析系统 V208

## 目标

去掉 [resolve-build-source-entries.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-entries.ts) 里最后两个 `as any`，把 `panel / scenario` 归一化成底层 resolver 能直接接收的显式类型。

本阶段只处理：

1. utility-only 路径下的 `finalPanel` 归一化
2. anomaly / disorder 路径下的 `finalPanel` 明确校验
3. `scenario` 的显式类型收口

## 变更

1. [resolve-build-source-entries.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/resolve-build-source-entries.ts) 改为：
   - utility-only 路径把 `finalPanel` 归一化为显式完整 panel
   - anomaly / disorder 路径继续通过 `finalPanelSchema.safeParse()` 获取完整 panel
   - 不再使用 `panel: input.finalPanel as any` 与 `scenario: scenario as any`
2. [resolve-build-source-entries.test.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/tests/resolve-build-source-entries.test.ts) 新增 utility-only partial `finalPanel` 回归测试

## 非目标

1. 不改变 `source-entry collection` 的返回 shape
2. 不放宽 anomaly / disorder 对完整 `finalPanel` 的要求
3. 不改变底层 `zzz-data` 的 `ResolveStaticBuildSourceEntriesInput` contract
4. 不新增新的 build 计算能力

## 收口标准

1. `resolve-build-source-entries.ts` 不再使用 `as any` 传 `panel / scenario`
2. utility-only 路径仍接受只包含 utility 字段的 `finalPanel`
3. anomaly / disorder 路径仍在缺少完整 `finalPanel` 时显式失败
4. 现有高层测试与 build 校验通过
