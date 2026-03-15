# 静态构筑解析系统 V332：source-note key collection contracts

`V332` 只解决一件事：

- 把 `definitions.ts` 中 source-note key 收集仍直接使用的只读 `string[]` 与 `Set<string>` 统一收成显式公开 contract。

## 范围

1. `StaticBuildReadonlySourceNoteKeyList`
2. `StaticBuildSourceNoteKeySet`
3. `StaticBuildSourceNote.keysOverride`
4. `collectStaticBuildSourceNoteKeys()`
5. `build/index.ts` 对应 type export

## 非目标

1. 不修改任何 source-note key 文案
2. 不调整 source-note 推导逻辑
3. 不处理 `definitions.ts` 中其他业务 `Set` / `Map`
