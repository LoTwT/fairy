# 静态构筑解析系统 V324：resolver effect context list contracts

`V324` 只解决一件事：

- 把 `resolver.ts` 中 effect-application 与 diagnostics helper 仍直接使用的内联 list 输入，统一收成显式公开 list contract。

## 范围

1. `summarizeDiagnostics()`
2. `applyEffects()` context 中的 `assumptions`
3. `applyEffects()` context 中的 `diagnostics`
4. `applyEffects()` context 中的 `unsupportedEffects`
5. `resolveStaticBuildDamage()` 中对应 list 初始化

## 非目标

1. 不修改任何 effect 匹配或结算逻辑
2. 不新增新的 summary 字段
3. 不处理 `Set<string>` 一类集合 contract
