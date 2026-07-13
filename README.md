# RankYourPolitician

A free, open-source, **non-partisan** civic platform for India: know **who represents your area**,
**what each office is responsible for**, and **how they're performing** — every fact cited to an
official source, with a visible "last updated" date. Ranking is one part of an information-first
profile, never a verdict.

- **Interactive map** of India (Survey-of-India-compliant boundaries) → drill National → State → District → Constituency.
- **Two independent axes:** *Verified Performance* (official data only) and *Public Sentiment* (login-less voting), computed **separately** so opinion can never move the factual measure.
- **Search everywhere** (name, area, district, party) and an **accountability explainer** (MP vs MLA vs local body).
- **22 official languages + English** with a global switcher (English default).
- **Login-less, sybil-resistant voting**, and a **local-only data manager** to curate + publish data.

> Runs locally with **zero setup** — with no Firebase credentials it serves the committed seed
> (real, cited data for Goa + Himachal Pradesh Lok Sabha MPs).

## Stack (all free tiers)

| Concern | Choice |
|---|---|
| Framework / host | Next.js (App Router, TS) on **Vercel**, ISR-cached |
| Database | **Firebase Firestore** (writes via server Admin SDK) |
| Map | `d3-geo` SVG choropleth, DataMeet compliant GeoJSON (projected server-side) |
| Vote integrity | Cloudflare **Turnstile** + device signal + **Upstash** rate-limit + hashed dedupe |
| Ads | Single non-intrusive AdSense slot (reserved height, no layout shift) |

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  (serves the seed — no creds needed)
```

## Project structure

```
app/                     Next.js routes (home, /state, /district, /area, /politician, /search, legal)
  api/vote/              Server vote endpoint (Turnstile + rate-limit + Firestore upsert)
  api/search/            Typeahead search
components/              UI (map, search, ranking, vote widget, i18n switcher, …)
lib/                     types, data layer, ranking math, i18n, geo projection, vote integrity
lib/i18n/messages/       en.json (source of truth) + per-locale overrides
data/seed/               committed seed dataset (politicians.json, constituencies.json)
data/geo/                india-states.json (compliant, simplified)
tools/data-manager/      LOCAL-ONLY: validate / publish / dashboard / importer
firestore.rules          public read, server-only writes
```

## The local Data Manager (never deployed)

Runs on your machine with the Firebase service-account key that **stays local**.

```bash
npm run dm -- validate                 # check every fact is cited + consistent
npm run dm -- stats                    # dataset summary
npm run dm -- publish                  # push to Firestore (needs .env.local creds)
npm run dm -- import <output.json>     # rebuild seed from a sourcing-workflow output
npm run dm:dashboard                   # review UI at http://localhost:4321 (view/validate/publish/add-fact)
```

"No citation, no claim" is enforced: `validate` and the dashboard flag any fact missing a source URL.

## Enable live data (Firebase)

1. Create a Firebase project → enable **Firestore** (production mode).
2. Project Settings → Service accounts → **Generate new private key**. Save it locally (git-ignored).
3. In `.env.local` set `FIREBASE_SERVICE_ACCOUNT_JSON` (one-line JSON) **or** `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`.
4. Deploy the rules: `firebase deploy --only firestore:rules`.
5. `npm run dm -- publish`. The site now reads Firestore automatically (falls back to seed if empty).

> Firestore does **not** auto-pause (unlike some free Postgres tiers), so no keep-alive cron is needed.

## Enable voting integrity (optional but recommended before launch)

- **Cloudflare Turnstile** (free): set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.
- **Upstash Redis** (free): set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- Set a strong `VOTE_HASH_SALT` (`openssl rand -hex 32`).

Without these, voting still works locally (dev mode) with an in-memory store and no bot-check.

## Deploy to Vercel

Import the repo, add the env vars from `.env.example`, deploy. `tools/` is excluded from the build.

> ⚠️ **Vercel Hobby is non-commercial only.** The moment ads or donations go live the site is
> "commercial" — move to **Cloudflare Pages** (free, commercial allowed) or **Vercel Pro** first.

## Ads

Leave `NEXT_PUBLIC_ADSENSE_*` blank until AdSense is approved (needs original content + policy pages —
this repo ships Privacy/Terms/About/Methodology). When set, one in-content slot renders with reserved
height so it never shifts layout.

## Languages

`lib/i18n/messages/en.json` is the source of truth. Add `xx.json` for locale `xx` (any subset of keys;
missing keys fall back to English). The switcher lists all 22 Eighth-Schedule languages + English.

## ⚠️ Pre-launch legal checklist (India)

This is a politically sensitive, public-figure site. **Get a one-time review by an Indian lawyer**
(geospatial + media/IT + data-protection). Before going live:

- [ ] **Map:** verify J&K, Ladakh (Aksai Chin) and Arunachal render as Indian with no dispute markings, at every zoom. Never swap in GADM/Natural Earth/OSM basemaps.
- [ ] **Grievance Officer (IT Rules 2021):** put a real India-based name + monitored email on `/grievance`; honour 24h ack / ~15-day resolution.
- [ ] **Defamation (BNS s.356):** keep the objective layer to official-sourced, dated, neutral facts; no guilt inferences ("N cases declared", never "criminal"). Keep the right-to-reply prominent.
- [ ] **DPDP Act 2023:** publish the privacy policy; store only salted hashes for vote dedupe; add a pre-vote consent notice; rotate the salt; don't retain raw IP/fingerprint.
- [ ] **AdSense/Razorpay:** keep content strictly factual and non-partisan.

## License

MIT (code). Data sources retain their own licences — see `LICENSE` and per-fact citations.
