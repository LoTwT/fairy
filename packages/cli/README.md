# @fairy/cli

JSON-only command shell over `@fairy/core`.

## Commands

```bash
pnpm --silent --filter @fairy/cli run cli -- calc snapshot.json --lang zh --pretty
pnpm --silent --filter @fairy/cli run cli -- calc snapshot.json --view verbose --lang zh --pretty
pnpm --silent --filter @fairy/cli run cli -- compare left.json right.json --lang en
pnpm --silent --filter @fairy/cli run cli -- scan snapshot.json --path team[0].panel.attack --from 1000 --to 2000 --step 100
pnpm --silent --filter @fairy/cli run cli -- explain snapshot.json
pnpm --silent --filter @fairy/cli run cli -- migrate snapshot.json
```

Use `-` instead of a file path to read JSON from stdin.
The package bin is `fairy` and points to `packages/cli/bin/fairy.js` in this
workspace.

## Output Contract

Stdout is always JSON.

`calc` defaults to `--view brief`. The brief output is summary-first and contains
only:

- `schemaVersion: "fairy-cli-calc-brief-v1"`
- `view: "brief"`
- `resultMode` when explicitly requested
- `calculationId`
- `summary`
- `warnings`
- `errors`

Brief `summary` exposes deterministic result lanes:

- `summary.lanes.nonCrit`
- `summary.lanes.crit`
- `summary.lanes.fixed` for deterministic damage paths such as anomaly,
  disorder, daze, or manual events
- `summary.daze` when the input produces daze value
- `summary.anomalyBuildup` when non-zero anomaly buildup is produced

Use `--view verbose` to return the full authoritative `CalcResult` from
`@fairy/core`, including `attackSegments`, `buckets`, `modifiers`, `events`,
`trace`, and legacy transition fields such as `summary.rawTotalDamage`,
`summary.displayTotalDamage`, and `summary.expectedDamage`.

Warnings and errors from `CalcResult` are also rendered to stderr as localized
diagnostic lines selected by `--lang zh|en`. The JSON diagnostic objects remain
unchanged and language-independent.

`--result-mode expected|crit|nonCrit` is passed into the snapshot options before
calculation. The default brief view shows non-crit and crit lanes rather than a
crit-rate expectation. `--result-mode expected` remains available for
statistical/theory checks and adds `summary.expectedDamage` to brief output.

Invalid arguments, invalid JSON, and schema validation failures are reported as
JSON error objects on stderr. Their stable `error.code` stays language-independent,
while `error.message` is rendered through the same `--lang zh|en` catalog with
English fallback strings.
