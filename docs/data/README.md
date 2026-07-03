# Data review workspace

> Boundary: this directory is only the Phase 2 source-review workspace for
> candidate sources, minimum evidence references, and a small raw inventory
> sample. It is not a canonical glossary, final field map, formula model,
> fixture set, package API, or implementation source.

## Files

- [source-registry.md](source-registry.md): draft candidate source registry and
  acquisition boundaries.
- [evidence.md](../../data/raw/phase-2-sample/evidence.md): minimum evidence
  notes for the Phase 2 sample slice.
- [phase-2-sample.md](../../data/raw-inventory/phase-2-sample.md): raw observed
  inventory sample rows.

## Storage boundary

The sample uses lightweight evidence notes by default: URL or static path,
capture time, version marker, source id, observation summary, and live/excluded
judgment. Screenshots, archived pages, attachments, raw JSON snapshots, or other
heavy artifacts are exception-only for unstable URLs, unreproducible pages,
disputed version state, unique attachments, or explicit reviewer request.

Expanding beyond this sample requires a separate storage and retention review
before collecting broader raw data.
