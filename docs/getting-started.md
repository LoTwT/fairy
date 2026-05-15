# Fairy V1 Dogfooding Quick Start

Status: V1 release-gate candidate

Fairy V1 is available as repo-local commands and published npm packages. Use
this guide for checkout-based dogfooding and pre-release review of the next
tag.

V1 dogfooding has passed lo-user single-person deep validation with an overall
4/5 score and zero unresolved B-Calc blockers. QA regression and release notes
still gate the V1 tag. Fairy has not gone through broad community dogfooding
yet.

## 1. Prepare a Clean Checkout

```bash
git clone https://github.com/LoTwT/fairy.git
cd fairy

# Optional: if Product provides a dogfood tag or commit, check it out here.
# git checkout <dogfood-tag-or-commit>

pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm --filter @randomplay/data verify:golden-v1
```

## 2. Run the First Example

Use the root alias scripts for the first pass. Keep `--silent` so stdout is
pure JSON and can be piped to `jq`.

```bash
pnpm --silent fairy:s1 | jq '.summary'
pnpm --silent fairy:s2 | jq '.summary'
pnpm --silent fairy:s3 | jq '.summary'
```

The examples are strict JSON files under `examples/snapshots/`:

| Script | Snapshot | Scenario |
|---|---|---|
| `pnpm --silent fairy:s1` | `examples/snapshots/s1-yixuan-sheer.json` | S1 Yixuan sheer damage against Corruption Priest |
| `pnpm --silent fairy:s2` | `examples/snapshots/s2-yanagi-disorder.json` | S2 Yanagi shock disorder against Pompey |
| `pnpm --silent fairy:s3` | `examples/snapshots/s3-team-g22-g23-acceptance.json` | S3 V1 G22/G23 manual-acceptance demo with Nicole and Yanagi accepted effects |
| direct file | `examples/snapshots/dogfood-anby-core-f-basic16-dullahan-9528.json` | Dogfooding regression: Anby core F basic 16 vs Dullahan defense 952.8 |

The Anby dogfooding fixture is not only a manual example. It is asserted in
`packages/cli/src/examples.test.ts` and therefore runs as part of the fixed
`pnpm test` verification chain. Expected summary values are non-crit `224`,
crit `336`, and daze value `37.536`.

The narrative source for S1 and S2 is
[`docs/ux/starter-scenarios.md`](ux/starter-scenarios.md). That document uses
JSONC for explanation and AI-plugin context; the files in `examples/snapshots/`
are executable strict JSON for CLI dogfooding.

S3 is a V1 executable variant for the accepted G22/G23 Nicole/Yanagi effects.
It intentionally differs from the starter-scenarios S3 narrative, which still
uses Lycaon as a broader target-state modifier propagation example. Lycaon typed
modifier acceptance is outside the current V1 dogfooding gate.

S2 does not simulate the full EX Special -> anomaly buildup -> trigger timeline.
V1 treats `anomalyContribution.buildup=100` as a user-provided snapshot state:
the anomaly is already ready to settle for this calculation.

## 3. Use the Full CLI

The root alias forwards arguments to `@randomplay/cli`:

```bash
pnpm --silent fairy -- help --pretty
pnpm --silent fairy -- calc examples/snapshots/s1-yixuan-sheer.json --lang zh --pretty
pnpm --silent fairy -- calc examples/snapshots/s1-yixuan-sheer.json --lang zh --view verbose --pretty
pnpm --silent fairy -- explain examples/snapshots/s1-yixuan-sheer.json --lang zh --pretty
pnpm --silent fairy -- scan examples/snapshots/s1-yixuan-sheer.json --path 'team[0].panel.attack' --from 1000 --to 2000 --step 100 --pretty
```

Use the package-level command when you want the exact underlying invocation:

```bash
pnpm --silent --filter @randomplay/cli run cli -- calc ../../examples/snapshots/s1-yixuan-sheer.json --lang zh --pretty
```

The package-level command runs with `packages/cli` as its working directory;
that is why the example path uses `../../examples/...`. Prefer the root
`pnpm --silent fairy -- ...` alias for dogfooding.

The CLI accepts `-` for stdin:

```bash
cat examples/snapshots/s1-yixuan-sheer.json \
  | pnpm --silent fairy -- calc - --lang zh --pretty
```

## 4. What to Inspect

Every CLI command writes JSON to stdout. For `calc`, start with:

- `summary.lanes.nonCrit.displayDamage`
- `summary.lanes.crit.displayDamage`
- `summary.daze.value`
- `warnings[]`
- `errors[]`

`fairy calc` defaults to `--view brief`, so it only prints the summary-first
shape plus diagnostics. Use `--view verbose` when you need legacy full fields
such as `summary.rawTotalDamage`, `attackSegments[]`, `buckets[]`,
`modifiers[]`, and `trace[]`.

Use `--result-mode expected` only for statistical/theory checks. The default
brief view shows deterministic non-crit and crit lanes instead of crit-rate
expectation.

Warnings and errors are also rendered to stderr in the selected `--lang zh|en`
language. JSON diagnostic keys remain language-independent.

## 5. Dogfooding Feedback

When reporting feedback, include:

1. The command you ran.
2. The snapshot file or edited JSON.
3. The relevant stdout/stderr.
4. Whether `jq empty` can parse stdout.
5. What was confusing or numerically wrong.

Feedback routing:

| Feedback | Owner |
|---|---|
| Calculation mismatch, crash, schema failure | TechLead + QA |
| `ERR-*` copy is unclear | UX |
| Starter scenario or example is hard to use | UX |
| Missing scenario or unsupported feature | Product backlog for V1.x |

## 6. Current V1 Boundaries

- V1 is a static `BattleSnapshot` calculator, not a battle timeline simulator.
- V1 does not yet provide a Web UI or automatic character/equipment resolver.
- Users provide or edit explicit JSON snapshots.
- The executable golden gate is 28 anchors passed with zero blocking diagnostics.
- The V1 dogfooding gate is lo-user single-person deep validation plus QA
  regression. It passed 4/5 with zero unresolved B-Calc blockers; broad
  community validation is deferred.
- G13, G18, G19, and G20 have been added as V1.x executable anchors; no golden
  anchors remain deferred.
