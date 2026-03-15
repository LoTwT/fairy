# 静态构筑解析系统 V342：segment token parser contracts

## 1. 目标

`V342` 只解决一件事：

- 把 `matrix.ts` 中最后残留的 `parseSegmentToken(token: string)` helper 收成显式公开 contract，作为当前 build helper raw 参数清理主线的收口。

## 2. 范围

1. `StaticBuildSegmentToken`
2. `StaticBuildSegmentBaseQualifier`
3. `StaticBuildSegmentTokenParseResult`
4. `matrix.ts:parseSegmentToken()`
5. `build/index.ts` 对应导出

## 3. 非目标

1. 不改变 segment 解析逻辑
2. 不修改 skill-matrix row metadata 语义
3. 不新增新的运行时输出字段

## 4. 完成条件

1. `parseSegmentToken()` 不再直接使用裸 `token: string`
2. parser 返回 shape 已收成显式公开 contract
3. 新增 alias 已对外导出
4. 全量校验通过
