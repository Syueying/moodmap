const COLORS = {
  excited: '#e8920a',
  happy:   '#22a869',
  calm:    '#2496c0',
  anxious: '#8e63cc',
  sad:     '#4a62cc',
  angry:   '#cc3348',
};

const EMOTION_META = {
  excited: { emoji: '⚡', label: 'excited' },
  happy:   { emoji: '😊', label: 'happy'   },
  calm:    { emoji: '🌊', label: 'calm'     },
  anxious: { emoji: '🌀', label: 'anxious'  },
  sad:     { emoji: '🌧', label: 'sad'      },
  angry:   { emoji: '🔥', label: 'angry'    },
};

const EMOTIONS = Object.keys(EMOTION_META);

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cellColor(emotion, intensity) {
  const pct = Math.round(18 + (intensity / 10) * 57);
  return `color-mix(in srgb, ${COLORS[emotion]} ${pct}%, white)`;
}

function computeStreak(entries) {
  const todayStr = toDateStr(new Date());
  const cursor = new Date();
  if (!entries[todayStr]) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (n < 400) {
    if (!entries[toDateStr(cursor)]) break;
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

const Storage = {
  async getEntries() {
    return new Promise(resolve =>
      chrome.storage.local.get('entries', d => resolve(d.entries || {}))
    );
  },

  async getEntry(dateStr) {
    const e = await this.getEntries();
    return e[dateStr] ?? null;
  },

  async saveEntry(dateStr, entry) {
    const entries = await this.getEntries();
    const now = Date.now();
    entries[dateStr] = {
      ...entry,
      createdAt: entries[dateStr]?.createdAt ?? now,
      updatedAt: now,
    };
    await new Promise(resolve => chrome.storage.local.set({ entries }, resolve));
    return entries[dateStr];
  },

  async exportJSON() {
    const entries = await this.getEntries();
    const payload = JSON.stringify({ version: 1, exported: new Date().toISOString(), entries }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `moodmap-${toDateStr(new Date())}.json`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async importJSON(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Invalid JSON'); }
    const incoming = data.entries ?? data;
    if (typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('Unrecognised format');
    const valid = Object.fromEntries(
      Object.entries(incoming).filter(([k, v]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(k) && v.emotion && v.intensity
      )
    );
    const merged = { ...(await this.getEntries()), ...valid };
    await new Promise(resolve => chrome.storage.local.set({ entries: merged }, resolve));
    return Object.keys(valid).length;
  },
};
