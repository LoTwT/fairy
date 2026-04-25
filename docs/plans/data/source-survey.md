# Data Source Survey Plan

## Status

Placeholder.

## Goal

Evaluate candidate sources for ZZZ combat content and decide which sources are acceptable inputs for Fairy's data pipeline.

## Scope

- Existing repository reference material
- Legacy data packages or source artifacts
- External source candidates
- Field coverage for agents, skills, enemies, W-Engines, drive discs, Bangboo, and special mechanics
- Source trust, freshness, attribution, and legal boundaries
- Missing-value and manual-verification gaps

## Deliverables

- Source matrix with coverage and trust notes
- Representative raw samples for each major record family
- Gap list for fields required by `@randomplay/fairy-core`
- Recommendation for primary source, fallback source, and manual-only fields
- Constraints that the ingestion workflow must preserve

## Notes

This plan does not implement scraping or normalization. It only identifies which sources are viable and what raw evidence the ingestion workflow must preserve.
