# @fairy/cli

JSON-only command shell over `@fairy/core`.

## Commands

```bash
pnpm --silent --filter @fairy/cli run cli -- calc snapshot.json --lang zh --pretty
pnpm --silent --filter @fairy/cli run cli -- compare left.json right.json --lang en
pnpm --silent --filter @fairy/cli run cli -- scan snapshot.json --path team[0].panel.attack --from 1000 --to 2000 --step 100
pnpm --silent --filter @fairy/cli run cli -- explain snapshot.json
pnpm --silent --filter @fairy/cli run cli -- migrate snapshot.json
```

Use `-` instead of a file path to read JSON from stdin.
The package bin is `fairy` and points to `packages/cli/bin/fairy.js` in this
workspace.

## Output Contract

Stdout is always JSON. `calc` returns the authoritative `CalcResult` from
`@fairy/core`, including `summary`, `attackSegments`, `buckets`, `modifiers`,
`trace`, `warnings`, and `errors`.

Warnings and errors from `CalcResult` are also rendered to stderr as localized
diagnostic lines selected by `--lang zh|en`. The JSON diagnostic objects remain
unchanged and language-independent.

`--result-mode expected|crit|nonCrit` is passed into the snapshot options before
calculation so the same snapshot can produce expected, forced-crit, and
forced-non-crit output.

Invalid arguments, invalid JSON, and schema validation failures are reported as
JSON error objects on stderr.
