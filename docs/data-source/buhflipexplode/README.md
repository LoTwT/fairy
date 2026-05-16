# buhflipexplode Deadly Assault Source

Status: S5-2c source snapshot baseline
Owner: @TechLead
Decision: D-12

This directory documents how Fairy uses `https://www.buhflipexplode.org/zzz/da/`
as a third-party Deadly Assault source.

## License Boundary

Fairy keeps the repository and runtime packages under MIT. buhflipexplode source
code is GPL-3.0, so Fairy does not copy its JavaScript into `@randomplay/core`,
`@randomplay/data`, or `@randomplay/cli` runtime implementation.

Historical V0.1.0 boundary:

- the raw/source snapshot formerly lived under
  `git-history:data/source/raw/buhflipexplode/`;
- record attribution, URL, fetched time, HTTP metadata, and hashes;
- summarize algorithm behavior in documentation;
- independently implement equivalent Fairy logic and validate it with parity
  fixtures.

Not allowed without a new license decision:

- copying or adapting GPL JavaScript into MIT runtime packages;
- distributing raw source snapshots in npm/package artifacts;
- publishing beta/leak/non-live-server data as cleaned data.

Game data and images remain owned by miHoYo or their respective rights holders.
If a rights holder requests removal, remove the affected raw/source snapshot or
replace the source.

## Drift Gate

The data pipeline uses three layers:

1. `fetch` mode: manual release step fetches live assets and writes a snapshot
   plus `algorithm-manifest.json`.
2. `verify` mode: CI/offline verification checks committed raw snapshots,
   retained hashes, selected algorithm section hashes, and live-only filtering.
3. Parity: later cleaning tasks must compare Fairy's independent implementation
   against archived source inputs and expected outputs before V1 release.

The historical fetch/verify script was removed in V0.1.2 with the raw archive.
Current CI keeps the retired source ids fail-loud through the source registry
and runtime-policy gates instead of re-verifying the removed archive.

## Current Snapshot

- Snapshot: `git-history:data/source/raw/buhflipexplode/2026-05-05T0445Z/`
- Fetched at: `2026-05-05T12:45:00+08:00`
- `da.js` runtime config: `vLive=35`, `vBeta=36`
- Retained live versions: `1.4.1` through `2.7.3`
- Excluded non-live versions: `2.8.1`, `2.8.2`, `2.8.3`, `3.0.1`, `3.0.2`, `3.0.3`

The upstream `da-versions.json`, `enemies.json`, and `buffs.json` can contain
non-live data. Fairy retains only the live-filtered source-format subsets:

- `da/da-versions.live.json`
- `assets/zzz/enemies.live.json`
- `assets/zzz/buffs.live.json`
