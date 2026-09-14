/** Nanoka 当前支持的完整详情语言；具体输入顺序仍由来源配置传入。 */
export const supportedLanguages = ["zh", "en"] as const

/** 完整详情的语言身份；索引中其他语言名称不属于详情。 */
export type SupportedLanguage = (typeof supportedLanguages)[number]

/** 来源实体 ID 的规范十进制拼写与路径长度限制；数值详情另检查安全整数及身份相等。 */
export function isValidEntityId(value: string): boolean {
  return value.length <= 32 && /^(0|[1-9]\d*)$/u.test(value)
}
