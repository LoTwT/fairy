/**
 * 只有通过 `loadSource` 读取完整固定源的 SourceData 才参与 ID 漂移登记。
 * 合成夹具通常只构造局部实体，不能让生产登记对它们做“全部命中”校验。
 * WeakSet 不改变数据形状，也不进入任何制品。
 */
const markedSourceData = new WeakSet<object>()

export const markLoadedSourceData = (data: object): void => {
  markedSourceData.add(data)
}

export const isLoadedSourceData = (data: object): boolean =>
  markedSourceData.has(data)
