# moodmap — Product Requirements Document

| Field | Value |
|---|---|
| Status | v1 shipped |
| Owner | Syueying |
| Last updated | June 2026 |

---

## TL;DR

A Chrome extension that helps you understand your emotional year at a glance. Log one mood entry per day — emotion, intensity, optional note — and watch a heatmap of your inner life take shape over time. Everything lives on your machine. No cloud, no account, no drama.

---

## Problem

Emotional self-awareness is hard to build when you can only see one day at a time. Journaling captures the narrative but not the pattern. Mood apps exist, but they're on your phone — the device you're already trying to get away from — and most of them want your data.

The insight worth having isn't "I felt anxious today." It's "I've been anxious every Monday for four months, and somehow I never noticed."

---

## User Persona

**The reflective knowledge worker** — someone who spends significant time in a browser, is intellectually curious about themselves, and suspects their emotional landscape has more structure than they give it credit for. Probably uses a second brain tool. Definitely has strong opinions about notification settings. Doesn't want to hand their mental state to a VC-backed startup.

For now: this is a tool built by one, for one. Generalizability is a v3 concern.

---

## Goals

- Make logging a sub-10-second daily habit by reducing friction to near zero
- Surface multi-month and multi-year emotional patterns that are invisible day-to-day
- Keep all data local and portable — the user owns their data completely
- Match the aesthetic of the tools the user actually enjoys using (iOS 26 glass, clean, fast)

## Non-Goals

- Social features, sharing, or public profiles
- Real-time mood tracking or event-triggered logging
- Correlation analysis or AI insights (v1 — see Milestones)
- Mobile app
- Anything that requires a backend, a login, or a privacy policy

---

## User Stories

### Core logging
- As a user, I want to log today's emotion in one click so that I don't skip days because it felt like effort
- As a user, I want to record how intensely I'm feeling something (not just what) so that a 3/10 anxious day and a 9/10 anxious day don't look the same
- As a user, I want to attach a one-sentence note so that my future self remembers what was actually happening
- As a user, I want to log a past date so that a missed day doesn't become a gap forever

### Visualization
- As a user, I want to see my full year as a heatmap so that I can perceive emotional seasons I can't see day-to-day
- As a user, I want to navigate to past years so that I can compare this year to last year
- As a user, I want to hover over a day and see my note so that the heatmap is a memory, not just a pattern

### Data ownership
- As a user, I want to export my data as JSON so that I can back it up or use it elsewhere
- As a user, I want to import a JSON file so that I can restore a backup or migrate from another device

---

## Functional Requirements

### Log panel

| Ref | Requirement | Priority |
|---|---|---|
| F1 | Six fixed emotion options: excited, happy, calm, anxious, sad, angry | Must |
| F2 | Intensity slider 1–10 | Must |
| F3 | Optional one-sentence note, max 200 characters | Must |
| F4 | Default date is today; any past date is selectable | Must |
| F5 | If a date already has an entry, form pre-fills with existing data and save becomes "Update" | Must |
| F6 | Save is disabled until an emotion is selected | Must |

### Date selection

| Ref | Requirement | Priority |
|---|---|---|
| F7 | Custom glass calendar picker — no native browser widget | Must |
| F8 | Future dates are non-selectable | Must |
| F9 | Selecting a date in a different year auto-navigates the heatmap | Must |
| F10 | Clicking any past cell in the heatmap selects that date | Must |

### Heatmap

| Ref | Requirement | Priority |
|---|---|---|
| F11 | Year grid: 52–53 weeks × 7 days, starting Sunday | Must |
| F12 | Cell color encodes emotion; shade encodes intensity (color-mix, pastel→vivid) | Must |
| F13 | Hover on a logged cell shows date, emotion, intensity, note (if any) | Must |
| F14 | Selected date cell shows accent-color ring outline | Must |
| F15 | Empty past cells show purple tint on hover to signal they're loggable | Must |
| F16 | Year navigation via ← → arrows; bounds are 2000 to current year | Must |

### Data

| Ref | Requirement | Priority |
|---|---|---|
| F17 | All entries stored in `chrome.storage.local` | Must |
| F18 | Export: downloads `moodmap-YYYY-MM-DD.json` | Must |
| F19 | Import: merges incoming entries with existing; existing entries at the same date are overwritten | Must |
| F20 | Import rejects files that don't match the expected schema | Must |

---

## Data Model

```json
{
  "entries": {
    "2026-06-09": {
      "emotion": "excited",
      "intensity": 7,
      "note": "Got the funding news, still can't believe it",
      "createdAt": 1749465600000,
      "updatedAt": 1749465600000
    }
  }
}
```

**emotion**: one of `excited | happy | calm | anxious | sad | angry`  
**intensity**: integer 1–10  
**note**: string, max 200 chars, optional (empty string if absent)  
**createdAt / updatedAt**: Unix timestamps in milliseconds

Export format wraps this in a versioned envelope:

```json
{
  "version": 1,
  "exported": "2026-06-09T12:00:00.000Z",
  "entries": { ... }
}
```

---

## Technical Requirements

| Ref | Requirement |
|---|---|
| T1 | Chrome Extension, Manifest V3 |
| T2 | Zero external dependencies — vanilla JS, no bundler, no npm |
| T3 | `chrome.storage.local` for persistence (no IndexedDB, no localStorage) |
| T4 | Service worker (`background.js`) handles icon click → open/focus year.html |
| T5 | `chrome.storage.local` quota is 5 MB; at ~200 bytes/entry × 365 entries/year, a decade of logs is ~700 KB — well within limits |
| T6 | `color-mix(in srgb, ...)` for intensity rendering — Chrome 111+ required |
| T7 | `backdrop-filter` for glass UI — Chrome 76+ required; effectively all modern Chrome |

---

## UI Design Principles

1. **One thing to notice first** — the heatmap is the hero; the log form is the input
2. **Glass aesthetic** — iOS 26 liquid glass: `backdrop-filter: blur(32px)`, specular highlight, colorful background blobs that show through
3. **Color encodes meaning** — emotion → hue, intensity → saturation via color-mix (not opacity)
4. **No native browser widgets** — custom calendar, custom slider, consistent visual language throughout
5. **Adaptive** — popup height shrinks to content; nothing feels padded for the sake of it

---

## Success Metrics

These are personal metrics, not product KPIs. The product succeeds if:

- Daily logging habit holds past 30 days
- At least one genuine insight is surfaced by the heatmap within 90 days ("huh, I didn't realize…")
- Export/import works well enough that a device migration never causes data loss
- The UI doesn't feel like a chore to open

---

## Open Questions

- Should intensity be a scale (1–10) or a label (low / medium / high)? Currently 1–10 — revisit after 60 days of use.
- Should multiple emotions per day be supported? Instinct: no for v1. Morning you and evening you might deserve separate entries.
- What's the right fallback if `color-mix` isn't supported? Currently untested on older Chrome.
- Tags: still deferred. Revisit in v2 only if the one-sentence note proves insufficient for pattern analysis.

---

## Milestones

See `README.md` for the full milestone roadmap.
