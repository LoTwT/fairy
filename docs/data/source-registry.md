# Source registry draft

> Boundary: this is a draft candidate source registry for source review and raw
> evidence planning. It does not approve any source as authoritative by itself,
> does not define canonical glossary terms, and does not create final field maps,
> formulas, fixtures, package APIs, or cleaning scripts.

## Candidate registry

| source_id                      | source_role           | source_class          | expected_trust_level                                                               | evidence_format                                                                                                                 | acquisition_boundary                                                                   | known_limits                                                                                                                                  | phase_2_sample_use                                                   |
| ------------------------------ | --------------------- | --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `zzz_nanoka`                   | working candidate     | third-party community | `secondary` for data discovery; `context` for explanatory material; never official | minimum evidence note with URL/static path, capture time, version marker, `source_id`, observation summary, and live judgment   | public page or public static path review only; no automated bulk collection in this PR | default pages may expose `latest` or `new` data; third-party content is not official proof; version selectors need maintainer acceptance      | yes, only for the `manifest.zzz.live` candidate subset sampled below |
| `zzz_official_wiki`            | official cross-check  | official/wiki         | `primary` only where direct official evidence exists; otherwise `context`          | public page URL plus minimum note; screenshot or archived copy only when required for dispute, instability, or reviewer request | public page review only                                                                | coverage can be incomplete, delayed, or difficult to map to model fields; missing coverage must not be force-filled from unofficial data      | no direct row in this first slice; reserved for later cross-check    |
| `zzz_gachabase_beta_changelog` | change-risk awareness | third-party community | `context` only                                                                     | page URL plus minimum note                                                                                                      | public page review only                                                                | beta and future-version content is explicitly excluded from raw inventory; use only to detect exclusion risk                                  | no inventory rows; exclusion awareness only                          |
| `zzz_buhflipexplode_da`        | DA domain candidate   | third-party community | `secondary/context` for Deadly Assault scope only                                  | page URL plus minimum note                                                                                                      | public page review only; DA data requires separate acceptance before numeric sampling  | page exposes leak, unreleased, and STC controls; restrict to DA scope and exclude leaks/unreleased/STC unless a later source policy says else | registered only; no DA numeric rows in this first sample             |

## Nanoka live selector note

Observed from `https://static.nanoka.cc/manifest.json` at
`2026-07-04T00:04:26+08:00`:

- `manifest.zzz.live = 3.0`
- `manifest.zzz.latest = 3.1.3+17077339`
- `manifest.zzz.live` is only a candidate live-release selector for this sample.
  It is not official proof of release status.

This PR samples only versioned static paths under `zzz/3.0/`. Entries from
`latest`, `new`, future, beta, test, placeholder, unreleased, or
unknown-live-status scopes are excluded from the sample inventory.

## Scaling rule

This registry does not authorize full source collection. Any expansion beyond
the sample slice needs a separate review of source scope, storage, retention,
licensing risk, and reviewer expectations.
