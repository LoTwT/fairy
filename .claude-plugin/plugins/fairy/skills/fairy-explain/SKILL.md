---
name: fairy-explain
description: Use when the user provides an existing fairy CalcResult JSON and needs a natural-language explanation of actual summary, trace, warnings, modifiers, and sourceRef fields. Never rerun calculation or invent fields absent from the input JSON.
displayName:
  en: Explain result
  zh: 解释结果
---

# fairy-explain

## Purpose

Explain an existing fairy `CalcResult` JSON without rerunning calculation.

## Trigger Phrases

- explain
- explain trace
- explain this result
- trace breakdown
- 解释结果
- 解释 trace
- 解读
- 分析
- 为什么是这个数

## Inputs

- `calcResult`: existing fairy `CalcResult` JSON or a path to one.
- `focus`: optional focus area: `trace`, `summary`, `warnings`, or `full`.
- `lang`: optional session language, `zh` or `en`.

## Outputs

- `explanation`: natural-language walkthrough in the session language.
- `grounding`: references to actual `CalcResult` fields used by the
  explanation.

## Workflow

1. Parse the provided `CalcResult`.
2. Identify available summary lanes, warnings, trace entries, modifiers, and
   source refs.
3. Explain only fields present in the input JSON.
4. State when trace detail is unavailable instead of reconstructing it.
5. Include data source / disclaimer copy where relevant.

## Boundaries

- Do not call `fairy calc`; if the user wants a new calculation, switch to
  `fairy-calc`.
- Do not infer multipliers, totals, source refs, or trace steps from natural
  language.
- Do not explain fields absent from the input `CalcResult`.
- Do not read raw source archives or retired source snapshots.

## Failure Policy

- Malformed JSON: ask the user to paste complete `fairy calc --view verbose`
  output.
- Missing trace: explain summary/warnings and state that trace detail is absent.
- Unknown sourceRef label: show the sourceRef and avoid inventing a friendly
  name.

## References

- `docs/ai-plugin/architecture.md`
- `docs/ai-plugin/user-journeys.md`
- `docs/ai-plugin/prompt-templates.md`
- `docs/ai-plugin/acceptance.md`
- `docs/product/decisions/D-21-ai-plugin.md`
- `docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`
