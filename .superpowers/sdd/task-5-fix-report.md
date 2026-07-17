# Task 5 fix report — criminal-case fact reconciliation

**Date:** 2026-07-17  
**Branch:** `fix/mla-byelection-staleness`  
**Pre-refresh baseline:** `eeeb9b2`

## Problem

After the MLA roster refresh (`refresh-mlas`), `politicians.json` was rebuilt without MyNeta affidavit facts, but `criminal_cases.json` still referenced 2,087 members. Validate reported **1,626 blocking errors**: `criminal-case record but no criminal_cases_declared fact`.

A prior partial remediation had restored ~474 unchanged MLAs; this run completes reconciliation.

## Approach

1. Loaded pre-refresh `politicians.json` from `git show eeeb9b2:data/seed/politicians.json`.
2. For each `criminal_cases.json` record whose politician lacked `criminal_cases_declared`:
   - **Remove** if the record's `source_url` matches a *different* pre-refresh MLA at the same `constituencyId` (predecessor / stale id mapping).
   - **Restore** otherwise by copying affidavit facts from the pre-refresh record matched by politician `id` (all 1,509 restorable cases matched by id; seat+name fallback implemented but unused).
3. Copied `criminal_cases_declared` plus co-cited affidavit fields (`assets_total`, `liabilities_total`, `education`) from the same MyNeta page when absent.

Tool: `npx tsx tools/data-manager/restore-criminal-case-facts.ts`

## Results

| Action | Count |
|--------|------:|
| Facts restored | 1,509 |
| Mis-mapped records removed | 117 |
| Skipped (no safe match) | 0 |
| **Validate errors before** | **1,626** |
| **Validate errors after** | **0** |

- `criminal_cases.json`: 2,087 → 1,970 records  
- Every remaining record has a matching `criminal_cases_declared` fact with agreeing `source_url` and count.

## Removed records (117)

These rows cited a predecessor's MyNeta affidavit at the same seat — including bye-election seat changes (e.g. Shorapur: Raja Venkatappa Naik → Raja Venugopal Naik), family succession (Baramati: Ajit Pawar → Sunetra Pawar), and roster-parse stubs where the MLA name was wrong (constituency label or party name as `name`, e.g. `Achampet (SC)`, `The Economic Times`, `Indian National Congress`).

New winners without their own affidavit fetch (e.g. Shiggaon — Pathan Yasir Ahmed Khan) had no `criminal_cases.json` row and needed no action.

## Validate

```
npm run dm -- validate
✓ No blocking errors - safe to publish.
```

## Concerns / follow-ups

1. **117 seats** lost per-case criminal detail until `fetch-criminal-cases` is run for the *current* sitting MLA's affidavit (or a bye-election winner's declaration is sourced).
2. **~36 roster stubs** still have constituency/party names instead of MLA names — separate MLA-parse quality issue, not introduced by this fix.
3. **Districts empty** on refreshed MLAs (`districts: []`) — pre-existing refresh gap; warnings only.
4. Restore script is idempotent for already-fixed seed; safe to re-run with `--dry-run`.
