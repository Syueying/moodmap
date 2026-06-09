# moodmap

> A Chrome extension that turns a year of daily moods into something you can actually look at.

One entry per day. Pick an emotion, set the intensity, write one sentence if you feel like it. Over time a heatmap builds up — your emotional fingerprint for the year. Patterns emerge that you'd never see day-to-day. Everything stays on your machine.

---

## Features

- **6 emotions** — excited, happy, calm, anxious, sad, angry
- **Intensity 1–10** — color encodes emotion, shade encodes how strongly you felt it
- **One-sentence note** — optional, but you'll be glad it's there when you hover over a day six months from now
- **Full year heatmap** — GitHub-contribution-graph energy, but for your inner life
- **Year navigation** — browse any past year; your 2022 data is there if you logged it
- **Custom glass date picker** — log a missed day without hunting for it in the grid
- **Hover tooltips** — date, emotion, intensity, and note on any logged cell
- **Export / Import JSON** — your data is yours; back it up, move it between machines
- **Streak counter** — because apparently we're all Pavlovian dogs and it works
- **iOS 26 glass aesthetic** — backdrop-filter blur, specular highlights, colorful background blobs. It looks nice. That matters.

---

## Installation

This extension is not on the Chrome Web Store (yet). Load it manually:

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `moodmap` folder
6. Pin the moodmap icon from the extensions menu

Click the icon to open your year view. That's it.

> **Note:** If you need to regenerate the extension icons, run `python3 make_icons.py` from inside the `moodmap` folder.

---

## Usage

**Logging a day**

Click the moodmap icon → the year view opens. Pick an emotion, set the intensity, write a note (or don't), hit **Log today**. Takes about 8 seconds once you're in the habit.

**Logging a past date**

Click the date display in the top-left of the log panel. A glass calendar opens. Pick any past date. The form fills with existing data if you've already logged that day, or presents a fresh form if you haven't.

Alternatively: navigate to the right year with the `←` `→` arrows, then click any cell directly in the heatmap.

**Reading your data**

Hover over any colored cell for a tooltip showing the date, emotion, intensity score, and note. The top-right of the year card shows your three most common emotions for that year.

**Export / Import**

- **Export**: click `↓ Export` in the log panel header — downloads `moodmap-YYYY-MM-DD.json`
- **Import**: click `↑ Import` and select a previously exported file — merges with existing data (same-date entries are overwritten by the import)

---

## Data Format

All entries are stored in `chrome.storage.local` and exported as:

```json
{
  "version": 1,
  "exported": "2026-06-09T12:00:00.000Z",
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

Keys are ISO date strings (`YYYY-MM-DD`). No server, no account, no telemetry.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Platform | Chrome Extension MV3 | Always open in the browser, zero install friction |
| Storage | `chrome.storage.local` | Persists across sessions, survives browser updates, no quota anxiety at diary-entry scale |
| UI | Vanilla JS + CSS | Zero build step, zero dependencies, easy to audit |
| Visual | `backdrop-filter` + `color-mix()` | Native CSS, no canvas, no SVG; Chrome 111+ |

---

## Milestones

### v1 — Core loop ✅ *(current)*

The minimum thing worth using every day.

- [x] Log emotion + intensity + note
- [x] Year heatmap (color = emotion, shade = intensity)
- [x] Hover tooltip with note
- [x] Date picker — log any past date
- [x] Click heatmap cell to select date
- [x] Year navigation (← 2022 2023 2024 2025 [2026] →)
- [x] Streak counter
- [x] Export / Import JSON
- [x] Glass UI (iOS 26 aesthetic)
- [x] Chrome extension (icon → opens year view)

---

### v2 — Patterns *(next)*

Make the data useful beyond "neat heatmap."

- [ ] Weekly sparkline in the year view (already scaffolded)
- [ ] Monthly summary: average intensity, dominant emotion, days logged vs missed
- [ ] Longest streak and personal records
- [ ] Basic trend line: rolling 7-day average intensity
- [ ] Optional daily reminder via `chrome.alarms` — a badge on the icon if today isn't logged by a set time
- [ ] Tags — `#work` `#health` `#relationship` — for filtering the heatmap
- [ ] Filter heatmap by tag or by emotion
- [ ] Dark mode

---

### v3 — Insight *(later)*

Turn the log into something that teaches you about yourself.

- [ ] AI-powered pattern summaries — "You've been calm for 3 weeks, which is unusual for Q1. What changed?"
- [ ] Day-of-week breakdown — does Monday really ruin your week, or does it just feel that way?
- [ ] Year-over-year comparison — 2025 vs 2026 side by side
- [ ] Export to CSV and PDF (shareable annual report)
- [ ] Optional encrypted cloud backup (no account required — passphrase-based)
- [ ] Chrome Web Store listing

---

## License

MIT. Do whatever you want with it.
