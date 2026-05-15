# Changelog

All notable changes to Fairy are documented in this file.

## Unreleased

### Added

- Batch import the approved-live nanoka 2.8 Bangboo catalog into runtime cleaned data without a package version bump.
- Record the V1.2.x full-data batch import discovery and PR sequence without a package version bump.
- Batch import the approved-live nanoka 2.8 character catalog into runtime cleaned data without a package version bump.
- Batch import the approved-live nanoka 2.8 W-Engine catalog into runtime cleaned data without a package version bump.
- Batch import the approved-live nanoka 2.8 Drive Disc set catalog into runtime cleaned data without a package version bump.
- Batch import the approved-live nanoka 2.8 enemy catalog into runtime cleaned data without a package version bump.
- Batch import the approved-live nanoka 2.8 current Deadly Assault period catalog into runtime cleaned data without a package version bump.

## 0.1.0 - 2026-05-15

### Added

- Add nanoka source gate foundation (#57)
- Add nanoka adapter skeleton (#58)
- Add nanoka live panel resampling gate (#59)
- Add nanoka adrenaline resource promote gate (#60)
- Add nanoka DA formal-live mapping gate
- Add nanoka enemy variant mapping gate (#62)
- Add nanoka snapshot diff history gate (#63)
- Promote nanoka source metadata gates (#64)
- Add nanoka promotion extra gate (#65)
- Add nanoka bangboo element gate (#66)
- Add nanoka drive disc slot audit (#67)
- Add nanoka disorder formula audit (#68)
- Add nanoka disorder daze-level audit (#69)
- Add phase 3 drift foundation (#70)
- Add first phase 3 drift sync
- Add phase 3 missing anchor candidates
- Add phase 3 semantic rulings
- Add phase 3 G27 G28 sync
- Cut over nanoka runtime data

### Documentation

- Audit source migration candidates
- Add nanoka schema inventory (#52)
- Refine nanoka coverage research (#53)
- Audit nanoka DA sentinel patch coverage (#54)
- Update nanoka matrix for locked scope (#55)
- D-20 v0.4 data source migration decision log (#56)
- Prepare v0.1.0 release notes

## 0.0.4 - 2026-05-14

### Changed

- Decouple release creation from registry smoke

### Documentation

- Document golden changelog convention
- Draft Bangboo V1.1 technical framing

### Golden Anchors

- Add G24 bangboo actor anchor (#48)
- Add G25 sharkboo anchor (#49)
- Add G26 plugboo anchor

## 0.0.3 - 2026-05-14

### Changed

- Normalize release housekeeping (#40)

### Golden Anchors

- Add G18 part-break golden anchor (#41)
- Add G13 anomaly threshold composition (#42)
- Add G19 daze recovery anchor (#43)
- Add G20 daze recovery anchor (#44)

## 0.0.2 - 2026-05-13

### Changed

- Migrate release flow to v3 runbook (#39)

## 0.0.1 - 2026-05-10

### Added

- Add agent data parsing and API endpoints
- Add middleware for CORS, CSRF, caching, and trailing slash handling
- Implement OpenAPI integration with agents API and add response schemas
- Add W-Engines data parsing, API endpoints, and schemas
- Add Bangboos data parsing, API endpoints, and schemas
- Add Drive Discs data parsing, API endpoints, schemas, and JSON data
- Implement web scraper for agent data
- Add energy limit and regeneration properties to agent schema and data
- Add type satisfaction for schemas in agents, bangboos, drive discs, and w-engines
- Add typecheck script to package.json and fix baseUrl path in tsconfig.json
- Enhance agent scraping logic and update common images structure
- Implement bangboo scraping and add bangboos data structure
- Refactor scraping logic to use NAVIGATION_OPTIONS for page navigation
- Add W-Engines scraping functionality and data structure
- Add Drive Discs scraping functionality and data structure
- Rename parse-data script to gen-data and add generate-data functionality
- Add rarity extraction
- Add additional properties to agent schema and types
- Add avatar, sprite, rarity, and rarityIcon fields to Bangboo schema and data
- Update WEngine schema and type to replace rank with rarity and add new properties
- Add avatar and sprite fields to DriveDisc schema and data
- Add timing logs for data generation and scraping processes
- Scrape deadly assaults
- Add anomalies schema, API, and data handling
- Add deadly assaults api, schema and types
- Add runtime contract schemas (#7)
- Add formula engine and handler DSL
- Implement anomaly and disorder formulas
- Add JSON command shell
- Add source ingestion skeleton
- Add buhflipexplode DA source snapshot
- Archive Mihoyo Deadly Assault source
- Add V1 golden replay baseline
- Clear golden harness pending anchors
- Accept G22 G23 golden modifiers
- Add D-19 summary-first calc output (#30)
- Migrate command parsing to citty

### Changed

- Migrate to monorepo (#1)
- Reinit (#2)
- Retry npm install with backoff for CDN propagation (#38)

### Documentation

- Add decisions log index (PM-1, #4)
- Draft S2 data contracts (TL-3, #5)
- Add monorepo development guide (#9)
- V0.4 errata — sync to TL-3 schema + extend i18n (#8)
- Add ERR-CALC-PENDING-ANOMALY/DISORDER zh+en messages (#11)
- Add ERR-CLI-* bilingual messages + i18n README (UX-S4-1) (#15)
- Cleaned schema meeting minutes + D-13~D-16 (PM-S5-2-meeting, #20)
- Add cleaned schema design spec
- Starter-scenarios v0.4.1 patch — D-13 V1 = DA (UX-S5-1, #48) (#22)
- ERR-DAT-005 / ERR-DAT-006 catalog (UX-S5-2-err-catalog, #52) (#23)
- Audit Excel source coverage (#25)
- Add V1 dogfooding quick start (#29)
- Update V1 release-gate status
- Resolve DA source conflict audit
- Add V1 dogfooding report — passes release gate (4/5) (#31)
- V1 errata + v0.0.1 CHANGELOG + release notes draft (#37)

### Fixed

- Update agent parsing logic to exclude header row and improve data integrity
- Update release scripts to ensure build before publishing
- Localize shell error messages
