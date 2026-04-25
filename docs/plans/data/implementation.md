# Data Package Implementation Plan

## Status

Placeholder.

## Goal

Implement the normalized `@randomplay/fairy-data` package after the data contract is approved.

## Scope

- Normalized TypeScript record types
- Catalog shape and package exports
- Data version and schema version constants
- Conversion from validated raw artifacts into normalized records
- Catalog validation helpers
- Hand-authored or generated fixtures
- Package build and artifact verification

## Deliverables

- Implemented normalized data types
- Canonical data catalog export
- Validation helpers and validation result types
- Fixture records for each approved record family
- Tests for schema, validation, and package exports
- Build artifacts for `@randomplay/fairy-data`

## Notes

This plan depends on [Data Contract](contract.md) and should preserve the mapping expectations approved in [Data-to-Core Mapping](core-mapping.md). It may consume artifacts from [Data Ingestion Implementation](ingestion-implementation.md), but it does not define source scraping behavior.
