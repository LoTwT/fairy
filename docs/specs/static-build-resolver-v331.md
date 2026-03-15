# 静态构筑解析系统 V331：coverage id set contracts

`V331` 只解决一件事：

- 把 `source-view` 与 `source-utility-view` 中 coverage helper 仍直接使用的 `Set<string>` 统一收成显式公开 contract。

## 范围

1. `StaticBuildAgentIdSet`
2. `StaticBuildWEngineIdSet`
3. `views.ts` 中 `sourceViewAgentIdSet`
4. `utility-views.ts` 中 `utilityViewWEngineIdSet`
5. `build/index.ts` 对应 type export

## 非目标

1. 不调整任何 coverage 范围
2. 不处理 summary reducer 中的其他 `Set` / `Map`
3. 不修改 catalog 兼容性逻辑
