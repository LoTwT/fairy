# 静态构筑解析系统 V321：source note lookup input contracts

`V321` 只解决一件事：

- 把 `definitions.ts` 中 `source note` 相关 helper 仍直接暴露的 inline lookup input，统一收成显式公开 contract。

## 范围

1. `StaticBuildSourceNoteLookupInput`
2. `matchesStaticBuildSourceNote()`
3. `getStaticBuildSourceNoteEntries()`
4. `getStaticBuildSourceNotes()`

## 非目标

1. 不修改任何 runtime 匹配逻辑
2. 不处理 `source note` 输出结构
3. 不调整 source-note 数据内容
