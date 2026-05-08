# Robots / ToS Check Log

Status: S5 segment 1 evidence
Owner: @TechLead
Checked: 2026-05-05

This is an engineering evidence log, not legal advice. Missing robots.txt or a
public HTTP 200 response does not by itself grant redistribution rights. Formal
data publication still needs Product/human review before V1 release.

## Mihoyo ZZZ Wiki

Target:
`https://baike.mihoyo.com/zzz/wiki/channel/map/13/108`

Commands:

```bash
curl -L -sS -o /tmp/fairy-mihoyo-robots.txt \
  -w '%{http_code} %{content_type} %{url_effective}\n' \
  https://baike.mihoyo.com/robots.txt

curl -I -L -sS https://baike.mihoyo.com/zzz/wiki/channel/map/13/108
```

Observed on 2026-05-05:

- `https://baike.mihoyo.com/robots.txt` returned HTTP 404 with body `Not Found`.
- The target page returned HTTP 200.
- Response headers included `cache-control: max-age=300`, `etag:
  "0E83857DC32EB629AC2FE1208C88796E"`, and `last-modified: Fri, 19 Dec 2025
  10:38:45 GMT`.
- The page is Nuxt HTML for `绳网情报站-绝区零WIKI` and references Mihoyo static /
  API hosts such as `webstatic.mihoyo.com`, `api-takumi.mihoyo.com`, and
  `act-api-takumi.mihoyo.com`.
- Direct HTML fetch returns the Nuxt shell only; Deadly Assault detail text is
  available from public JSON APIs used by the rendered page.
- `entry_page` detail requests require header `x-rpc-wiki_app: zzz`; without it,
  the same numeric id can resolve to unrelated wiki content in another
  namespace.

Engineering policy for segment 2:

- Fetch only public wiki responses needed for live-server data.
- Do not use authenticated endpoints, private APIs, beta-only data, or bypass
  mechanisms.
- Use the channel 13 public list API to derive channel 108 period `content_id`
  values. Do not hard-code detail ids.
- Parse `entry_page` JSON and embedded rich HTML fragments; rendered browser
  automation is discovery-only unless a future source drift requires human
  review.
- Cache fetched payloads and prefer conditional requests using ETag /
  Last-Modified.
- Default automated fetch rate: no more than 12 requests per minute, lower if a
  target response indicates tighter cache or rate expectations.
- Publish only cleaned structures allowed by CONFIRM-16.

## buhflipexplode Deadly Assault

Target:
`https://www.buhflipexplode.org/zzz/da/`

Commands:

```bash
curl -L -sS -o /tmp/fairy-buh-robots.html \
  -w '%{http_code} %{content_type} %{url_effective}\n' \
  https://www.buhflipexplode.org/robots.txt

curl -I -L -sS https://www.buhflipexplode.org/zzz/da/

curl -L -sS https://www.buhflipexplode.org/zzz/da/da.js | rg 'fetch|da-versions|enemies|buffs'
```

Observed on 2026-05-05:

- `https://www.buhflipexplode.org/robots.txt` returned HTTP 404 with the site's
  custom 404 HTML page.
- The target page returned HTTP 200 from GitHub Pages.
- Response headers included `cache-control: max-age=600`, `etag:
  "69f8c67e-13c0"`, and `last-modified: Mon, 04 May 2026 16:17:02 GMT`.
- `da.js` fetches:
  - `https://www.buhflipexplode.org/zzz/da/da-versions.json`
  - `https://www.buhflipexplode.org/assets/zzz/enemies.json`
  - `https://www.buhflipexplode.org/assets/zzz/buffs.json`
- The about page describes the site as fan-created, non-commercial, and not
  affiliated with miHoYo.
- The about page links the source repository:
  `https://github.com/spiritfxxxx/buhflipexplode-src`.
- The source repository has a `LICENSE` file with GPL-3.0 text, which covers
  code reuse but does not by itself settle data/image redistribution rights.
- The about page says most images/data are officially sourced from in-game and
  public fandoms.
- No explicit data redistribution license was found in this check.
- D-12 locks option B: retain raw source snapshots and attribution, but do not
  copy GPL-3.0 JavaScript into Fairy MIT runtime packages.

Engineering policy for segment 2:

- Treat this as a third-party source that requires human/Product review before
  redistributing cleaned values.
- Cache each asset snapshot and record hashes separately.
- Prefer one request per asset per manual run; automated mode must respect the
  same 12 requests/minute ceiling and conditional-request policy.
- Do not copy images or site presentation assets into `@randomplay/data`.
- Do not retain upstream non-live / beta / leaks data; keep only live-filtered
  source-format subsets for data JSON payloads.
- Preserve source attribution and mark derived rows with `sourceId:
  "buhflipexplode-zzz-da"`.

## Excel Workbook

Target: pending lo-user upload.

Current policy:

- Do not commit the workbook to public git until lo-user confirms the storage
  path and redistribution constraints.
- Use workbook hash as the source version if the workbook has no explicit
  version field.
- Keep raw workbook snapshots out of generated cleaned data artifacts unless a
  release task explicitly approves publication.
