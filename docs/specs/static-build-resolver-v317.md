# 静态构筑解析系统 V317：profile definition contracts

## 目标

`V317` 只解决一件事：

- 把 `profiles.ts` 中通过局部 interface 推断暴露出来的 profile shape 提升为 `build/types.ts` 的显式公开 contract

## 范围

1. `StaticBuildProfileName`
2. `StaticBuildProfileResolveBaseDamageValueInput`
3. `StaticBuildProfileSupportsDamageType`
4. `StaticBuildProfileResolveBaseDamageValue`
5. `StaticBuildProfileDefinition`

## 非目标

1. 不修改任何 profile 运行时逻辑
2. 不新增 profile 类型
3. 不调整 `staticBuildProfiles` 的数据内容

## 结果

- `getStaticBuildProfile()` 与 `staticBuildProfiles` 相关的 profile shape 已统一落到 `build/types.ts`
- `profiles.ts` 不再通过文件内局部 interface 暴露隐式公开 contract
