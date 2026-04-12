# ZZZ Fairy Package Structure Plan

## Summary

- This document only defines package naming, package layout, and responsibility boundaries. It does not include implementation details.
- The first stage keeps only 3 packages: `data`, `core`, and `cli`.
- `cli` does not handle data processing. It is only the command-line entry for computation.

## Package Naming

- Use a single npm scope: `@randomplay`
- Use a single package prefix: `fairy-`
- The naming rule is fixed as: `@randomplay/fairy-<domain>`

Recommended package names:

- `@randomplay/fairy-data`
- `@randomplay/fairy-core`
- `@randomplay/fairy-cli`

Naming constraints:

- Do not use overly generic names such as `@randomplay/core`, `@randomplay/data`, or `@randomplay/cli`
- Do not mix multiple prefix conventions
- Each package should map to one clear responsibility domain

## Package Structure

The package directories are fixed as:

- `packages/data`
- `packages/core`
- `packages/cli`

## Package Responsibilities

### `@randomplay/fairy-data`

- Maintain and export normalized game data
- Own the final data artifacts produced from raw sources plus manual corrections
- Expose normalized data schemas, data types, and data version semantics
- The normalized data schema may reference the input needs of `core`, but no package-level dependency on `core` is assumed yet
- Does not handle damage calculation

### `@randomplay/fairy-core`

- Own the damage-calculation domain model and computation logic
- Accept normalized data, builds, and scenario inputs, then output calculation results
- Own the rule system, multiplier models, and extension points
- Does not handle raw data collection, import, or normalization

### `@randomplay/fairy-cli`

- Provide the command-line entry point
- Only wrap the public capabilities of `core`
- Target local debugging, batch calculation, and result output
- Does not handle data import, data construction, data validation, or data export workflows

## Future Tasks

- Define the boundary and versioning strategy of normalized data in `fairy-data`
- Define the input model, output model, and rule layering in `fairy-core`
- Define the command set, parameter semantics, and output format of `fairy-cli`
- Define the mapping between the normalized data schema in `fairy-data` and the input model in `fairy-core`
- Decide whether `fairy-data` and `fairy-core` should have a direct package dependency or remain fully decoupled
- Leave room for a future AI adapter package instead of forcing it into existing packages too early
- Decide whether to add Web- or AI-related packages only after the core interfaces are stable

## Key Rules

1. **Respect package boundaries.** Each package has a single responsibility domain.
2. **Dependency direction:** `cli` → `core`. Both may read `data` types once a dependency is established. `data` depends on nothing.
3. **No premature abstractions.** Do not create shared packages, schema packages, or cross-cutting libraries unless a stable contract is proven across 2+ packages.
4. **No unapproved packages.** Do not add AI, Web, or adapter packages without explicit approval.
5. **Check which package a change belongs to** before writing anything.

## Assumptions

- Do not split out a standalone `schema` package for now
- Do not assume a direct dependency between `fairy-data` and `fairy-core` for now
- The normalized data schema in `fairy-data` may draw from the input needs of `fairy-core`, but it may also remain independently defined
- `cli` only serves computation and does not touch the data pipeline
- If a stable shared contract is later reused across multiple packages, consider adding a dedicated shared package
