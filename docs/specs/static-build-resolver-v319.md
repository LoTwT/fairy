# 静态构筑解析系统 V319：loadout selection contracts

`V319` 只解决一件事：

- 把 `build/types.ts` 与 `definitions.ts` 中仍然宽泛使用 `StaticBuildCatalogId` 或 inline object 的 loadout 选择输入，统一收成显式公开 contract。

## 范围

1. `StaticBuildDriveDiscSetInput.id`
2. `StaticBuildLoadoutInput.agentId / wEngineId`
3. `StaticBuildEffectLoadoutInput`
4. `getStaticBuildEffectsForLoadout()`

## 非目标

1. 不修改任何 runtime 逻辑
2. 不调整 catalog 数据内容
3. 不处理 source-note / source-coverage helper 的输入 contract
