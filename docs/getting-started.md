# Fairy V1 Dogfooding Quick Start

Status: V1 dogfood candidate

Fairy V1 is currently a repo-local CLI baseline. It is not published as a
global npm package yet. Use this guide for dogfooding and pre-release review.

V1 dogfooding is currently scoped to lo-user single-person deep validation plus
QA regression. It has not gone through broad community dogfooding yet.

## 1. Prepare a Clean Checkout

```bash
git clone https://github.com/LoTwT/fairy.git
cd fairy

# Optional: if Product provides a dogfood tag or commit, check it out here.
# git checkout <dogfood-tag-or-commit>

pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm --filter @fairy/data verify:golden-v1
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

The root alias forwards arguments to `@fairy/cli`:

```bash
pnpm --silent fairy -- help --pretty
pnpm --silent fairy -- calc examples/snapshots/s1-yixuan-sheer.json --lang zh --pretty
pnpm --silent fairy -- explain examples/snapshots/s1-yixuan-sheer.json --lang zh --pretty
pnpm --silent fairy -- scan examples/snapshots/s1-yixuan-sheer.json --path 'team[0].panel.attack' --from 1000 --to 2000 --step 100 --pretty
```

Use the package-level command when you want the exact underlying invocation:

```bash
pnpm --silent --filter @fairy/cli run cli -- calc ../../examples/snapshots/s1-yixuan-sheer.json --lang zh --pretty
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

- `summary.displayTotalDamage`
- `summary.rawTotalDamage`
- `attackSegments[]`
- `buckets[]`
- `modifiers[]`
- `trace[]`
- `warnings[]`
- `errors[]`

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
- The V1 golden gate is 19 anchors passed with zero blocking diagnostics.
- The V1 dogfooding gate is lo-user single-person deep validation plus QA
  regression; broad community validation is deferred.
- G13, G18, G19, and G20 are intentionally deferred to V1.x.
