/** 稳定元组编码：各字符串按 UTF-16 长度编码为 `长度:内容` 后连接。 */
export function encodeStableTuple(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join("")
}

/** 身份排序比较原始字段，不能按机器编码中的长度前缀排序。 */
export function compareIdentityTuples(
  left: readonly string[],
  right: readonly string[],
): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    if (left[index] !== right[index]) {
      return left[index]! < right[index]! ? -1 : 1
    }
  }
  return left.length - right.length
}
