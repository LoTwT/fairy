# 静态构筑解析系统 V338：source-view requirement key helper contracts

## 1. 目标

`V338` 只解决一件事：

- 把 `views.ts / utility-views.ts` 中 `createRequirement()` helper 仍直接使用的裸 `key: string` 统一收成既有显式公开 `StaticBuildRequirementKey`。

## 2. 范围

1. `views.ts:createRequirement()`
2. `utility-views.ts:createRequirement()`
3. 对应的 type import

## 3. 非目标

1. 不改变 requirement 生成逻辑
2. 不修改 requirement 文案
3. 不新增新的公开 alias

## 4. 完成标准

1. 两个 helper 的 `key` 参数都不再使用裸 `string`
2. lint、test、agent build 全部通过
