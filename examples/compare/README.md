# fairy compare examples

Concrete fixtures for `fairy compare`.

Run from the repository root. The package script executes inside
`packages/cli`, so fixture paths use `../../`.

```bash
pnpm --silent --filter @randomplay/cli run cli -- compare \
  ../../examples/snapshots/s1-yixuan-sheer.json \
  ../../examples/compare/yixuan-sheer-stronger.snapshot.json \
  --view brief --lang zh --pretty
```

Expected output:

- `yixuan-sheer-stronger.brief.json` — brief `fairy-cli-compare-v1`
  output, including summary, lane, bucket, and contributor deltas.

These fixtures intentionally exercise binary A/B comparison only. RNG lanes
remain part of `fairy calc`; compare does not model random outcomes.
