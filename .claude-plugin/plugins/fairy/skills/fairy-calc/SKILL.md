---
name: fairy-calc
description: Use when the user has a fairy BattleSnapshot or a confirmed fairy-snapshot draft and needs trusted calculation through the fairy CLI. Always call fairy calc for validation/calculation, parse the CLI JSON, and summarize only actual fields from the returned CalcResult.
displayName:
  en: Calculate damage
  zh: 计算伤害
---

# fairy-calc

## Purpose

Run a trusted fairy CLI calculation for a confirmed `BattleSnapshot` and produce
a brief user-facing summary from the returned `CalcResult`.

## Trigger Phrases

- calc damage
- calculate damage
- compute damage
- run fairy
- 算伤害
- 跑一下
- 看结果

## Inputs

- `snapshot`: schema-valid `BattleSnapshot` JSON or a path to one.
- `view`: optional CLI view, default `verbose` for plugin validation.
- `lang`: optional session language, `zh` or `en`.

## Outputs

- `calcResult`: the unmodified CLI JSON.
- `briefSummary`: one or two paragraphs based only on `calcResult`.
- `errors`: user-facing fail-loud copy when CLI invocation fails.

## Workflow

1. Check that `fairy` / `@randomplay/cli` is installed and satisfies
   `minFairyCliVersion`.
2. Invoke:

   ```bash
   fairy calc <snapshot> --view verbose --lang <zh|en>
   ```

3. Treat the CLI JSON as the only numeric calculation baseline.
4. Preserve warnings and source/runtime context in the user-facing summary.
5. On failure, stop and surface actionable error copy. Do not continue with a
   model-generated estimate.

## Boundaries

- Do not implement formula logic in the AI layer.
- Do not modify `CalcResult` fields.
- Do not fabricate totals, multipliers, trace steps, or source refs.
- Do not depend on nonexistent preflight/dry-run flags or deferred compare
  commands.
- Do not read raw source archives or retired source snapshots.

## Failure Policy

- Missing or too-old CLI: fail loud with an install/upgrade instruction.
- CLI schema error: translate stderr into a user-facing correction prompt.
- CLI runtime error: stop and preserve the error context; do not summarize.

## References

- `docs/ai-plugin/architecture.md`
- `docs/ai-plugin/user-journeys.md`
- `docs/ai-plugin/prompt-templates.md`
- `docs/ai-plugin/acceptance.md`
- `docs/product/decisions/D-21-ai-plugin.md`
