import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import process from "node:process"

const dataRoot = resolve(process.cwd(), "../zzz-data/data/zh-CN")

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(dataRoot, file), "utf-8")) as T
}

export async function runTool<TInput, TOutput>(
  tool: { execute?: unknown },
  input: TInput,
) {
  const execute = tool.execute as
    | ((input: TInput, context: unknown) => Promise<TOutput> | TOutput)
    | undefined

  if (!execute) {
    throw new TypeError("Tool execute is undefined")
  }

  return await execute(input, {})
}
