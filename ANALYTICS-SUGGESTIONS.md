# Boxii Analytics Dashboard — Suggested Additions

A review list of analytics we *could* add, grounded in the data the Lawbrokr
PostHog project actually collects (verified against the event/property schema).
Nothing here is built yet — tick what you want and we'll scope it.

## Already built

- **Overview tab** — Views (full width), Clicks / CTA-clicks toggle, Avg. view
  duration; global 7d / 30d / 90d date filter.
- **Heatmap tab** — click heatmap over a live snapshot of the overlay, with a
  Desktop / Mobile toggle.

## Legend

| Tag | Meaning |
|-----|---------|
| ✅ Ready | Data confirmed present — can build now |
| ⚠️ Verify | PostHog captures it, but volume/quality needs a quick check first |
| 🔧 Work | Needs enabling, new capture, or meaningful engineering |
| **P1 / P2 / P3** | Suggested priority (P1 = highest value / lowest effort) |

---

## 1. Conversion & funnel — *highest value*

The single biggest gap: right now the cards are independent counts. Tying them
together tells you where people fall off.

- [ ] **View → Open → CTA → Lead funnel** — the core Boxii story. ✅ Ready (Lead step ⚠️ — `lead_captured` taxonomy exists but has no data until the lead widget ships). **P1**
- [ ] **Open rate** (`overlay_opened` ÷ pageviews) — % of visitors who engage the overlay. ✅ Ready. **P1**
- [ ] **CTA rate** (`cta_click` ÷ `overlay_opened`) — % of openers who click a CTA. ✅ Ready. **P1**
- [ ] **CTA leaderboard** — rank CTAs by clicks using `cta_label` / `cta_action` / `cta_location` (e.g. "Talk to Sales" vs "See how it works" vs "call_business"). ✅ Ready. **P1**
- [ ] **Bounced opens** — sessions that opened the overlay but clicked nothing. ✅ Ready. **P2**
- [ ] **Close behavior** — how people dismiss it, via `overlay_closed.trigger` (close button vs other). ✅ Ready. **P3**

---

## 2. Segmentation / breakdowns — *slice metrics you already have*

Every event carries these dimensions automatically. Each becomes a "break down
by…" on the existing charts.

- [ ] **Traffic source** — organic / paid / AI / direct, via `traffic_source` + `traffic_channel`. Answers "which channels convert." ✅ Ready. **P1**
- [ ] **Device type** — desktop vs mobile vs tablet conversion (`$device_type`). ✅ Ready. **P1**
- [ ] **Geography** — country / region / city (GeoIP). Optional map view. ✅ Ready. **P2**
- [ ] **UTM campaign performance** — opens/CTAs by `utm_source` / `utm_campaign` / `utm_medium`. ✅ Ready. **P2**
- [ ] **Browser / OS** — support-matrix style breakdown. ✅ Ready. **P3**
- [ ] **New vs returning / reopens** — `reopen_overlay` action + session recency. ✅ Ready. **P3**

---

## 3. Engagement depth

- [ ] **Scroll depth** — how far down the overlay people get. The heatmap API has a `scrolldepth` type we're not using yet. ✅ Ready (new query). **P2**
- [ ] **View-duration distribution** — not just the average; a histogram (e.g. <10s, 10–30s, 30s–2m, 2m+) shows the shape. ✅ Ready. **P2**
- [ ] **Rageclicks / dead clicks** — `$rageclick` / `$dead_click` flag friction (clicking things that aren't clickable). ⚠️ Verify volume. **P2**
- [ ] **Session replay links** — deep-link the actual recordings (already captured, overlay-scoped) from a CTA or a heatmap hotspot. 🔧 Work. **P3**

---

## 4. Traffic quality & health

- [ ] **Bot & AI-agent filter** — `$virt_is_bot` / `$virt_traffic_type` (Regular / Bot / **AI Agent** / Automation). Either strip bots from the numbers, or a dedicated "AI crawler traffic" view (increasingly interesting). ✅ Ready. **P2**
- [ ] **Overlay errors** — `$exception` events surfacing JS errors inside the overlay. ⚠️ Verify volume. **P3**
- [ ] **Web vitals** — `$web_vitals` (LCP / CLS / INP) for overlay performance. ⚠️ Verify volume. **P3**

---

## 5. Heatmap enhancements

- [ ] **Date range on the heatmap** — same 7/30/90d control the Overview has (heatmap API is date-windowed; ~90-day retention). ✅ Ready. **P2**
- [ ] **More heatmap types** — `mousemove` (attention) and `rageclick` (frustration) overlays alongside clicks. ✅ Ready. **P2**
- [ ] **Multiple overlay pages** — today it's scoped to `www.lawbrokr.com/`; a page picker would cover other URLs the overlay runs on. ⚠️ Verify which pages. **P3**
- [ ] **Live rendered overlay (dynamic device)** — replace the static screenshot with the real overlay in a device-sized iframe so it's always current and any viewport works. 🔧 Work (needs a hosted mount page; discussed earlier). **P3**

---

## 6. Advanced PostHog features (bigger builds)

All supported against the same data, but each is a larger surface:

- [ ] **Retention / stickiness** — do visitors come back and re-engage the overlay? 🔧 Work (⚠️ limited by anonymous visitors — see caveats). **P3**
- [ ] **Paths / lifecycle** — what people do before/after opening; new vs dormant composition. 🔧 Work. **P3**
- [ ] **Cohorts, surveys, A/B experiments, feature flags** — PostHog supports all of these; relevant once the overlay is being actively optimized. 🔧 Work. **P3**

---

## Data caveats — read before committing

1. **Anonymous by design.** Boxii runs `person_profiles: 'identified_only'`, so anonymous visitors get no person profile. Event- and session-level analytics (everything above) are fine; true *per-person* metrics (unique-user retention, cross-session dedup) are limited until `lead_captured` identifies someone.
2. **No generic click event.** Autocapture is off, so "total clicks" comes only from the coordinate heatmap store, queried one day at a time — which is why that metric is a little slower to load. There is no per-element click event to query.
3. **Scoped to one page.** All current metrics are filtered to `https://www.lawbrokr.com/`. If the overlay runs on more pages, decide whether to aggregate or keep per-page.
4. **Heatmap retention ~90 days.** Heatmap coordinate data doesn't go back further.
5. **Mobile is sparser.** Far fewer mobile clicks than desktop; mobile breakdowns will be noisier.

---

## Suggested phasing

**Phase 1 — quick wins (all ✅ Ready, high value):**
View→Open→CTA funnel, open rate + CTA rate KPIs, CTA leaderboard, traffic-source
and device breakdowns.

**Phase 2 — depth & segmentation:**
Geography, UTM performance, scroll depth, duration distribution, bot/AI filter,
heatmap date range + mousemove/rageclick layers.

**Phase 3 — advanced:**
Session-replay links, live rendered overlay, retention/paths, experiments.

---

*Pick the items you want (checkboxes above) and I'll confirm the data is really
there for each, then build them out.*
