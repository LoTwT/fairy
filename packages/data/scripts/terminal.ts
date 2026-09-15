export function escapeTerminalText(value: string): string {
  const maximumInputCodePoints = 4096
  let escaped = ""
  let codePointCount = 0
  for (const character of value) {
    if (codePointCount === maximumInputCodePoints) {
      escaped += "…"
      break
    }
    codePointCount += 1
    const codePoint = character.codePointAt(0)
    escaped +=
      codePoint === undefined || !isUnsafeTerminalCodePoint(codePoint)
        ? character
        : `\\u{${codePoint.toString(16).padStart(4, "0")}}`
  }
  return escaped
}

function isUnsafeTerminalCodePoint(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x61c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x2028 && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  )
}

export function formatCommandFailure(
  error: unknown,
  commandName = "Nanoka 数据源命令",
): string {
  const message = error instanceof Error ? error.message : String(error)
  return `${commandName}失败：${escapeTerminalText(message)}\n`
}

/** 命令入口的同步异常与 stdout 异步错误共用同一个出口。 */
export function createCommandFailureHandler(commandName: string) {
  return (error: unknown): void => {
    process.exitCode = 1
    process.stderr.write(formatCommandFailure(error, commandName))
  }
}
