# Source registry draft（source registry 草案）

> Boundary：这是供 source review 和 raw evidence planning 使用的 draft candidate
> source registry。它本身不批准任何 source 成为 authoritative source，不定义
> canonical glossary term，也不创建 final field map、formula、fixture、package
> API 或 cleaning script。

## Candidate registry（候选 registry）

| source_id                      | source_role           | source_class          | expected_trust_level                                                               | evidence_format                                                                                                                 | acquisition_boundary                                                                   | known_limits                                                                                                                                  | phase_2_sample_use                                                   |
| ------------------------------ | --------------------- | --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `zzz_nanoka`                   | working candidate     | third-party community | `secondary` for data discovery; `context` for explanatory material; never official | minimum evidence note with URL/static path, capture time, version marker, `source_id`, observation summary, and live judgment   | public page or public static path review only; no automated bulk collection in this PR | default pages may expose `latest` or `new` data; third-party content is not official proof; version selectors need maintainer acceptance      | yes, only for the `manifest.zzz.live` candidate subset sampled below |
| `zzz_official_wiki`            | official cross-check  | official/wiki         | `primary` only where direct official evidence exists; otherwise `context`          | public page URL plus minimum note; screenshot or archived copy only when required for dispute, instability, or reviewer request | public page review only                                                                | coverage can be incomplete, delayed, or difficult to map to model fields; missing coverage must not be force-filled from unofficial data      | no direct row in this first slice; reserved for later cross-check    |
| `zzz_gachabase_beta_changelog` | change-risk awareness | third-party community | `context` only                                                                     | page URL plus minimum note                                                                                                      | public page review only                                                                | beta and future-version content is explicitly excluded from raw inventory; use only to detect exclusion risk                                  | no inventory rows; exclusion awareness only                          |
| `zzz_buhflipexplode_da`        | DA domain candidate   | third-party community | `secondary/context` for Deadly Assault scope only                                  | page URL plus minimum note                                                                                                      | public page review only; DA data requires separate acceptance before numeric sampling  | page exposes leak, unreleased, and STC controls; restrict to DA scope and exclude leaks/unreleased/STC unless a later source policy says else | registered only; no DA numeric rows in this first sample             |

## Nanoka live selector note（Nanoka live selector 观察记录）

在 `2026-07-04T00:04:26+08:00` 从
`https://static.nanoka.cc/manifest.json` 观察到：

- `manifest.zzz.live = 3.0`
- `manifest.zzz.latest = 3.1.3+17077339`
- `manifest.zzz.live` 在这个 sample 中只作为 candidate live-release selector，不是
  release status 的 official proof。

这个 PR 只采样 `zzz/3.0/` 下的 versioned static path。来自 `latest`、`new`、
future、beta、test、placeholder、unreleased 或 unknown-live-status scope 的条目
不进入 sample inventory。

## Scaling rule（扩展规则）

这个 registry 不授权 full source collection。任何超出 sample slice 的扩展，都需要
单独 review source scope、storage、retention、licensing risk 和 reviewer
expectation。
