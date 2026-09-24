import type { SourceParameter } from "../../src/integration/agent-types.ts"
import type {
  SkillCoefficientCurve,
  SkillLevelGroup,
} from "../../src/skills/types.ts"

export interface ParameterTerm {
  readonly parameterId: string
  readonly scale: number
}

type Value = { scalar: number; terms: ParameterTerm[] }

/** 有限的线性语法，不执行来源脚本；花括号只作为分组符。 */
export function parseSkillExpression(
  expression: string,
  property: "1001" | "1002",
): ParameterTerm[] {
  const tokens: string[] = []
  let remaining = expression.trim()
  while (remaining.length) {
    const match = /^(?:\{Skill:\d+,\s*Prop:\d+\}|\d+(?:\.\d+)?|[{}()+*/])/.exec(
      remaining,
    )
    if (!match || tokens.length >= 256)
      throw new Error("Unsupported skill expression")
    tokens.push(match[0])
    remaining = remaining.slice(match[0].length).trimStart()
  }
  let position = 0
  let depth = 0
  const atom = (): Value => {
    const token = tokens[position++]
    if (token === undefined) throw new Error("Incomplete skill expression")
    const reference = /^\{Skill:(\d+),\s*Prop:(\d+)\}$/.exec(token)
    if (reference) {
      if (reference[2] !== property)
        throw new Error("Mismatched skill expression property")
      return { scalar: 0, terms: [{ parameterId: reference[1]!, scale: 1 }] }
    }
    if (token === "{" || token === "(") {
      if (++depth > 32) throw new Error("Skill expression is too deep")
      const result = sum()
      if (tokens[position++] !== (token === "{" ? "}" : ")"))
        throw new Error("Unbalanced skill expression")
      depth--
      return result
    }
    const number = Number(token)
    if (!Number.isFinite(number) || number < 0)
      throw new Error("Invalid skill expression number")
    return { scalar: number, terms: [] }
  }
  const product = (): Value => {
    let value = atom()
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++]
      const right = atom()
      if (operator === "/") {
        if (right.terms.length || right.scalar <= 0)
          throw new Error("Invalid skill divisor")
        value = {
          scalar: value.scalar / right.scalar,
          terms: value.terms.map((term) => ({
            ...term,
            scale: term.scale / right.scalar,
          })),
        }
      } else {
        if (value.terms.length && right.terms.length)
          throw new Error("Nonlinear skill expression")
        value = {
          scalar: value.scalar * right.scalar,
          terms: [
            ...value.terms.map((term) => ({
              ...term,
              scale: term.scale * right.scalar,
            })),
            ...right.terms.map((term) => ({
              ...term,
              scale: term.scale * value.scalar,
            })),
          ],
        }
      }
    }
    return value
  }
  const sum = (): Value => {
    let value = product()
    while (tokens[position] === "+") {
      position++
      const right = product()
      value = {
        scalar: value.scalar + right.scalar,
        terms: [...value.terms, ...right.terms],
      }
    }
    return value
  }
  const result = sum()
  if (
    position !== tokens.length ||
    result.scalar !== 0 ||
    !result.terms.length ||
    result.terms.some((term) => !Number.isFinite(term.scale) || term.scale <= 0)
  )
    throw new Error("Unsupported skill expression result")
  return result.terms
}

export function parameterCurve(
  parameters: Readonly<Record<string, SourceParameter>>,
  terms: readonly ParameterTerm[],
  property: "1001" | "1002",
  levelGroup: SkillLevelGroup,
): SkillCoefficientCurve {
  let base = 0
  let growth = 0
  for (const term of terms) {
    const parameter = Object.hasOwn(parameters, term.parameterId)
      ? parameters[term.parameterId]
      : undefined
    if (!parameter || parameter.format !== "%")
      throw new Error(`Missing or unsupported parameter: ${term.parameterId}`)
    const value =
      property === "1001" ? parameter.damagePercentage : parameter.stunRatio
    const increment =
      property === "1001"
        ? parameter.damagePercentageGrowth
        : parameter.stunRatioGrowth
    if (
      !Number.isSafeInteger(value) ||
      !Number.isSafeInteger(increment) ||
      value < 0 ||
      increment < 0
    )
      throw new Error(`Invalid coefficient parameter: ${term.parameterId}`)
    base += (value * term.scale) / 10000
    growth += (increment * term.scale) / 10000
  }
  if (!Number.isFinite(base) || !Number.isFinite(growth))
    throw new Error("Invalid coefficient sum")
  return { levelGroup, base, growth }
}
