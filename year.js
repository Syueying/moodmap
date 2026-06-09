const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ═══ State ═══
let currentYear     = new Date().getFullYear();
let selectedDate    = toDateStr(new Date());
let selectedEmotion = null;
let allEntries      = {};

// ═══ Init ═══
async function init() {
  allEntries = await Storage.getEntries();

  // Streak
  const streak = computeStreak(allEntries);
  if (streak > 0) {
    const badge = document.getElementById('streak-badge');
    badge.textContent   = `🔥 ${streak}`;
    badge.style.display = 'inline-block';
  }

  // Log panel wiring
  setupDatePicker();
  setupLogPanel();
  updateDateHeader(selectedDate);
  loadDateIntoForm(selectedDate);

  // Year navigation
  document.getElementById('btn-prev-year').addEventListener('click', () => changeYear(-1));
  document.getElementById('btn-next-year').addEventListener('click', () => changeYear(1));
  updateYearNavButtons();

  // Build initial view
  rebuildYearView();
  buildProfilesSection();

  // Tooltip + actions
  setupTooltip();
  setupDataActions();
  buildIntensityStrip();
}

// ═══════════════════════════════════════════════════
// LOG PANEL
// ═══════════════════════════════════════════════════

function setupLogPanel() {
  const slider = document.getElementById('intensity-input');
  slider.addEventListener('input', () => setSlider(+slider.value));
  setSlider(5);

  document.querySelectorAll('.ec').forEach(ec =>
    ec.addEventListener('click', () => pickEmotion(ec.dataset.emotion))
  );

  document.getElementById('btn-save').addEventListener('click', saveEntry);

  document.getElementById('btn-back-today').addEventListener('click', () => {
    selectDate(toDateStr(new Date()));
  });

  document.getElementById('date-text').addEventListener('click', openDatePicker);
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  updateDateHeader(dateStr);
  loadDateIntoForm(dateStr);

  const dateYear = new Date(dateStr + 'T00:00:00').getFullYear();
  if (dateYear !== currentYear) {
    // Auto-navigate the heatmap to the year of the chosen date
    currentYear = dateYear;
    rebuildYearView();   // highlights cell internally at the end
    updateYearNavButtons();
  } else {
    highlightCell(dateStr);
  }
}

function updateDateHeader(dateStr) {
  const date    = new Date(dateStr + 'T00:00:00');
  const isToday = dateStr === toDateStr(new Date());
  const opts    = { weekday: 'short', month: 'short', day: 'numeric' };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';

  document.getElementById('date-text').textContent          = date.toLocaleDateString('en-US', opts);
  document.getElementById('today-tag').style.display        = isToday ? '' : 'none';
  document.getElementById('btn-back-today').style.display   = isToday ? 'none' : '';
}

function loadDateIntoForm(dateStr) {
  const entry   = allEntries[dateStr];
  const isToday = dateStr === toDateStr(new Date());

  if (entry) {
    pickEmotion(entry.emotion);
    const slider = document.getElementById('intensity-input');
    slider.value = entry.intensity;
    setSlider(entry.intensity);
    document.getElementById('note-input').value     = entry.note || '';
    document.getElementById('btn-save').textContent = 'Update';
    document.getElementById('btn-save').disabled    = false;
  } else {
    pickEmotion(null);
    document.getElementById('intensity-input').value = 5;
    setSlider(5);
    document.getElementById('note-input').value     = '';
    document.getElementById('btn-save').textContent = isToday ? 'Log today' : 'Log this day';
    document.getElementById('btn-save').disabled    = true;
  }
}

function pickEmotion(name) {
  selectedEmotion = name;
  document.querySelectorAll('.ec').forEach(ec =>
    ec.classList.toggle('selected', ec.dataset.emotion === name)
  );
  const c = name ? COLORS[name] : 'var(--accent)';
  document.getElementById('sfill').style.background = c;
  document.getElementById('sthumb').style.boxShadow = `0 1px 5px rgba(0,0,0,0.18), 0 0 0 2px ${c}`;
  document.getElementById('int-val').style.color    = c;
  if (name) document.getElementById('btn-save').disabled = false;
}

function setSlider(v) {
  const pct = ((v - 1) / 9) * 100;
  document.getElementById('sfill').style.width   = pct + '%';
  document.getElementById('sthumb').style.left   = pct + '%';
  document.getElementById('int-val').textContent = v;
}

async function saveEntry() {
  if (!selectedEmotion) return;
  const intensity = +document.getElementById('intensity-input').value;
  const note      = document.getElementById('note-input').value.trim();
  const btn       = document.getElementById('btn-save');
  const isUpdate  = !!allEntries[selectedDate];

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    const saved              = await Storage.saveEntry(selectedDate, { emotion: selectedEmotion, intensity, note });
    allEntries[selectedDate] = saved;
    btn.textContent          = 'Update';
    btn.disabled             = false;
    showToast(isUpdate ? 'Updated ✓' : 'Logged ✓');

    // Live-update the cell if it's in the currently displayed year
    if (new Date(selectedDate + 'T00:00:00').getFullYear() === currentYear) {
      refreshCell(selectedDate);
    }
    // Update stats
    buildStats(allEntries, currentYear);
  } catch {
    btn.disabled    = false;
    btn.textContent = isUpdate ? 'Update' : 'Log this day';
    showToast('Save failed — try again');
  }
}

// Update a single cell without a full heatmap rebuild
function refreshCell(dateStr) {
  const cell  = document.querySelector(`.cell[data-key="${dateStr}"]`);
  const entry = allEntries[dateStr];
  if (!cell || !entry) return;
  const dt = new Date(dateStr + 'T00:00:00');
  cell.style.background  = cellColor(entry.emotion, entry.intensity);
  cell.classList.add('logged');
  cell.dataset.emotion   = entry.emotion;
  cell.dataset.intensity = entry.intensity;
  cell.dataset.note      = entry.note || '';
  cell.dataset.date      = `${DAYS_SHORT[dt.getDay()]}, ${MONTHS_LONG[dt.getMonth()]} ${dt.getDate()}`;
}

// ═══════════════════════════════════════════════════
// YEAR NAVIGATION
// ═══════════════════════════════════════════════════

function changeYear(direction) {
  const next    = currentYear + direction;
  const maxYear = new Date().getFullYear();
  if (next < 2000 || next > maxYear) return;
  currentYear = next;
  rebuildYearView();
  updateYearNavButtons();
}

function updateYearNavButtons() {
  const maxYear = new Date().getFullYear();
  document.getElementById('btn-next-year').disabled = currentYear >= maxYear;
  document.getElementById('btn-prev-year').disabled = currentYear <= 2000;
}

function rebuildYearView() {
  document.getElementById('year-num').textContent = currentYear;
  document.getElementById('weeks').innerHTML      = '';
  document.getElementById('month-row').innerHTML  = '';
  document.getElementById('sparkline').innerHTML  = '';

  buildHeatmap(allEntries, currentYear);
  buildStats(allEntries, currentYear);
  buildSparkline(allEntries);

  // Restore selected-date highlight if it falls in this year
  if (selectedDate.startsWith(String(currentYear))) {
    highlightCell(selectedDate);
  }
}

// ═══════════════════════════════════════════════════
// HEATMAP
// ═══════════════════════════════════════════════════

function buildHeatmap(entries, year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const today     = new Date();

  const gridStart = new Date(yearStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const weeksEl   = document.getElementById('weeks');
  const monthRow  = document.getElementById('month-row');
  const monthSeen = {};

  for (let w = 0; w < 53; w++) {
    const col = document.createElement('div');
    col.className = 'wk';

    for (let d = 0; d < 7; d++) {
      const dt = new Date(gridStart);
      dt.setDate(gridStart.getDate() + w * 7 + d);

      const cell     = document.createElement('div');
      cell.className = 'cell';

      const inYear = dt >= yearStart && dt <= yearEnd;
      const isPast = dt <= today;

      if (inYear && d === 0 && !(dt.getMonth() in monthSeen)) {
        monthSeen[dt.getMonth()] = w;
      }

      if (!inYear) {
        cell.style.opacity       = '0';
        cell.style.pointerEvents = 'none';
      } else {
        const key = toDateStr(dt);
        cell.dataset.key  = key;
        cell.dataset.date = `${DAYS_SHORT[dt.getDay()]}, ${MONTHS_LONG[dt.getMonth()]} ${dt.getDate()}`;

        if (isPast) {
          const entry = entries[key];
          if (entry) {
            cell.style.background  = cellColor(entry.emotion, entry.intensity);
            cell.classList.add('logged');
            cell.dataset.emotion   = entry.emotion;
            cell.dataset.intensity = entry.intensity;
            cell.dataset.note      = entry.note || '';
          }
          cell.classList.add('past');
          cell.addEventListener('click', () => selectDate(key));
        } else {
          // Future cells in the current year — visible but passive
          cell.style.opacity = '0.3';
        }
      }

      col.appendChild(cell);
    }
    weeksEl.appendChild(col);
  }

  // Month labels
  monthRow.style.cssText = `position:relative;height:14px;width:${53 * 13}px`;
  Object.entries(monthSeen).forEach(([m, w]) => {
    const span = document.createElement('span');
    span.style.cssText = `position:absolute;left:${w * 13}px;font-size:10px;color:var(--muted)`;
    span.textContent   = MONTHS_SHORT[+m];
    monthRow.appendChild(span);
  });
}

function highlightCell(dateStr) {
  document.querySelectorAll('.cell.selected-date').forEach(c => c.classList.remove('selected-date'));
  const cell = document.querySelector(`.cell[data-key="${dateStr}"]`);
  if (cell) cell.classList.add('selected-date');
}

// ═══════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════

function buildStats(entries, year) {
  const yearEntries = Object.entries(entries).filter(([k]) => k.startsWith(String(year)));
  const total       = yearEntries.length;

  document.getElementById('year-sub').textContent = total
    ? `${total} day${total !== 1 ? 's' : ''} logged`
    : 'no entries yet';

  const counts = {};
  EMOTIONS.forEach(e => counts[e] = 0);
  yearEntries.forEach(([, v]) => counts[v.emotion] = (counts[v.emotion] || 0) + 1);

  const top3 = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  [1, 2, 3].forEach(i => {
    const valEl = document.getElementById(`stat-${i}-val`);
    const lblEl = document.getElementById(`stat-${i}-lbl`);
    const entry = top3[i - 1];
    if (entry) {
      const [emotion, count] = entry;
      valEl.textContent  = `${Math.round(count / total * 100)}%`;
      valEl.style.color  = COLORS[emotion];
      lblEl.textContent  = emotion;
    } else {
      valEl.textContent = '—';
      valEl.style.color = 'var(--muted)';
      lblEl.textContent = '—';
    }
  });
}

// ═══════════════════════════════════════════════════
// SPARKLINE  (always last 7 calendar days)
// ═══════════════════════════════════════════════════

function buildSparkline(entries) {
  const el   = document.getElementById('sparkline');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  days.forEach(d => {
    const key   = toDateStr(d);
    const entry = entries[key];
    const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });

    const group = document.createElement('div');
    group.className = 'spark-group';

    const bar = document.createElement('div');
    bar.className = 'spark-bar';
    if (entry) {
      bar.style.height     = (entry.intensity * 4) + 'px';
      bar.style.background = cellColor(entry.emotion, entry.intensity);
    } else {
      bar.style.height     = '2px';
      bar.style.background = 'rgba(200,195,255,0.35)';
    }

    const lbl = document.createElement('div');
    lbl.className   = 'spark-day';
    lbl.textContent = label;

    group.append(bar, lbl);
    el.appendChild(group);
  });
}

// ═══════════════════════════════════════════════════
// INTENSITY STRIP
// ═══════════════════════════════════════════════════

function buildIntensityStrip() {
  [18, 32, 46, 60, 75].forEach((pct, i) => {
    document.getElementById(`sw${i + 1}`).style.background =
      `color-mix(in srgb, ${COLORS.excited} ${pct}%, white)`;
  });
}

// ═══════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════

function setupTooltip() {
  const tooltip   = document.getElementById('tooltip');
  const ttDate    = document.getElementById('tt-date');
  const ttDot     = document.getElementById('tt-dot');
  const ttEmotion = document.getElementById('tt-emotion');
  const ttInt     = document.getElementById('tt-intensity');
  const ttNote    = document.getElementById('tt-note');
  let hideTimer;

  document.getElementById('weeks').addEventListener('mousemove', e => {
    const cell = e.target.closest('.cell.logged');
    if (!cell) { tooltip.classList.remove('show'); return; }
    clearTimeout(hideTimer);

    ttDate.textContent     = cell.dataset.date;
    ttDot.style.background = COLORS[cell.dataset.emotion];
    ttEmotion.textContent  = cell.dataset.emotion;
    ttEmotion.style.color  = COLORS[cell.dataset.emotion];
    ttInt.textContent      = `· ${cell.dataset.intensity} / 10`;

    if (cell.dataset.note) {
      ttNote.textContent   = `"${cell.dataset.note}"`;
      ttNote.style.display = 'block';
    } else {
      ttNote.style.display = 'none';
    }

    const x = Math.min(e.clientX + 14, window.innerWidth  - 250);
    const y = e.clientY - tooltip.offsetHeight - 16;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = (y < 8 ? e.clientY + 20 : y) + 'px';
    tooltip.classList.add('show');
  });

  document.getElementById('weeks').addEventListener('mouseleave', () => {
    hideTimer = setTimeout(() => tooltip.classList.remove('show'), 80);
  });
}

// ═══════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════

function setupDataActions() {
  document.getElementById('btn-export').addEventListener('click', async () => {
    await Storage.exportJSON();
    showToast('Exported ✓');
  });

  const fileInput = document.getElementById('import-file');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const text  = await file.text();
      const count = await Storage.importJSON(text);
      allEntries  = await Storage.getEntries();
      showToast(`Imported ${count} entries ✓`);
      rebuildYearView();
    } catch (err) {
      showToast(`Import failed: ${err.message}`);
    }
    fileInput.value = '';
  });
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// CUSTOM DATE PICKER
// ═══════════════════════════════════════════════════

let dpYear  = 0;
let dpMonth = 0;
let dpOpen  = false;

function setupDatePicker() {
  // One delegated listener on the panel — handles ALL clicks inside it.
  // stopPropagation keeps these clicks from reaching the outside-click handler.
  document.getElementById('datepicker').addEventListener('click', e => {
    e.stopPropagation();
    const t = e.target;

    if (t.id === 'dp-prev')      { shiftMonth(-1); renderCalendar(); return; }
    if (t.id === 'dp-next')      { shiftMonth(+1); renderCalendar(); return; }
    if (t.id === 'dp-today-btn') { selectDate(toDateStr(new Date())); closeDatePicker(); return; }

    const day = t.closest('.dp-day[data-date]');
    if (day) { selectDate(day.dataset.date); closeDatePicker(); }
  });
}

function openDatePicker() {
  if (dpOpen) { closeDatePicker(); return; }

  const d = new Date(selectedDate + 'T00:00:00');
  dpYear  = d.getFullYear();
  dpMonth = d.getMonth();

  renderCalendar();
  positionPicker();
  document.getElementById('datepicker').style.display = 'block';
  dpOpen = true;

  // Defer registration so the current click (on the date button) doesn't immediately close it
  setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
}

function closeDatePicker() {
  document.getElementById('datepicker').style.display = 'none';
  document.removeEventListener('click', onOutsideClick);
  dpOpen = false;
}

// Any click that reaches the document is outside the panel (stopPropagation handles the rest)
function onOutsideClick() { closeDatePicker(); }

function positionPicker() {
  const btn  = document.getElementById('date-text');
  const rect = btn.getBoundingClientRect();
  const pw   = 252;
  let left   = rect.left;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  left = Math.max(8, left);
  const panel = document.getElementById('datepicker');
  panel.style.top  = (rect.bottom + 6) + 'px';
  panel.style.left = left + 'px';
}

function renderCalendar() {
  const today    = new Date();
  const todayStr = toDateStr(today);

  document.getElementById('dp-month-label').textContent =
    new Date(dpYear, dpMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.getElementById('dp-prev').disabled =
    (dpYear === 2000 && dpMonth === 0);
  document.getElementById('dp-next').disabled =
    (dpYear === today.getFullYear() && dpMonth >= today.getMonth());

  const grid        = document.getElementById('dp-days');
  grid.innerHTML    = '';
  const firstDay    = new Date(dpYear, dpMonth, 1).getDay();
  const daysInMonth = new Date(dpYear, dpMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'dp-day dp-day-empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dt   = new Date(dpYear, dpMonth, d);
    const dStr = toDateStr(dt);
    const el   = document.createElement('button');
    el.type        = 'button';
    el.className   = 'dp-day';
    el.textContent = d;

    if (dt > today) {
      el.classList.add('dp-day-future');
    } else {
      el.dataset.date = dStr;                              // picked up by delegated handler
      if (dStr === todayStr)    el.classList.add('dp-day-today');
      if (dStr === selectedDate) el.classList.add('dp-day-selected');
    }

    grid.appendChild(el);
  }
}

function shiftMonth(dir) {
  dpMonth += dir;
  if (dpMonth < 0)  { dpMonth = 11; dpYear--; }
  if (dpMonth > 11) { dpMonth = 0;  dpYear++; }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// ═══════════════════════════════════════════════════
// PERSONALITY PATTERNS GALLERY
// ═══════════════════════════════════════════════════

const PROFILE_TYPES = ['ENTP', 'INFP', 'INTJ', 'ESFJ', 'ENFP', 'ISTP'];
const PROFILE_TAGLINES = {
  ENTP: 'The Debater',
  INFP: 'The Mediator',
  INTJ: 'The Architect',
  ESFJ: 'The Consul',
  ENFP: 'The Campaigner',
  ISTP: 'The Virtuoso',
};

let previewActive = false;
let previewBackup = null;
let previewCard   = null;

async function buildProfilesSection() {
  const grid = document.getElementById('profiles-grid');

  // Load all 6 profiles in parallel, preserve order
  const cards = await Promise.all(
    PROFILE_TYPES.map(async type => {
      try {
        const url  = chrome.runtime.getURL(`mock_data/moodmap-${type}.json`);
        const res  = await fetch(url);
        const data = await res.json();
        return buildProfileCard(type, data.entries);
      } catch {
        return null;
      }
    })
  );

  cards.filter(Boolean).forEach(card => grid.appendChild(card));

  // Wire exit-preview button
  document.getElementById('btn-exit-preview')
    .addEventListener('click', exitPreview);
}

function buildProfileCard(type, entries) {
  const card = document.createElement('div');
  card.className = 'profile-card';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'pc-header';
  hdr.innerHTML = `<span class="pc-type">${type}</span>
                   <span class="pc-tagline">${PROFILE_TAGLINES[type]}</span>`;
  card.appendChild(hdr);

  // Top-3 emotion chips
  card.appendChild(buildEmotionDist(entries, 2025));

  // Mini heatmap
  card.appendChild(buildMiniHeatmap(entries, 2025));

  // Preview button
  const btn = document.createElement('button');
  btn.className   = 'btn-preview';
  btn.textContent = '↗ Preview';
  btn.addEventListener('click', () => enterPreview(type, entries, card));
  card.appendChild(btn);

  return card;
}

function buildEmotionDist(entries, year) {
  const yearVals = Object.entries(entries)
    .filter(([k]) => k.startsWith(String(year)))
    .map(([, v]) => v);

  const total  = yearVals.length || 1;
  const counts = Object.fromEntries(EMOTIONS.map(e => [e, 0]));
  yearVals.forEach(v => counts[v.emotion]++);

  const top3 = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const el = document.createElement('div');
  el.className = 'pc-dist';

  top3.forEach(([emotion, n]) => {
    const pct  = Math.round(n / total * 100);
    const chip = document.createElement('span');
    chip.className                = 'dist-chip';
    chip.style.background         = `color-mix(in srgb, ${COLORS[emotion]} 12%, white)`;
    chip.style.color              = COLORS[emotion];
    chip.style.borderColor        = `color-mix(in srgb, ${COLORS[emotion]} 28%, white)`;
    chip.textContent              = `${emotion} ${pct}%`;
    el.appendChild(chip);
  });

  return el;
}

function buildMiniHeatmap(entries, year) {
  const wrap      = document.createElement('div');
  wrap.className  = 'mini-heatmap';
  const grid      = document.createElement('div');
  grid.className  = 'mh-grid';

  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const gridStart = new Date(yearStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  for (let w = 0; w < 53; w++) {
    const col = document.createElement('div');
    col.className = 'mh-col';

    for (let d = 0; d < 7; d++) {
      const dt   = new Date(gridStart);
      dt.setDate(gridStart.getDate() + w * 7 + d);
      const cell = document.createElement('div');
      cell.className = 'mh-cell';

      const inYear = dt >= yearStart && dt <= yearEnd;
      if (!inYear) {
        cell.style.opacity = '0';
      } else {
        const entry = entries[toDateStr(dt)];
        if (entry) cell.style.background = cellColor(entry.emotion, entry.intensity);
      }
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }

  wrap.appendChild(grid);
  return wrap;
}

// ── Preview mode ──────────────────────────────────

function enterPreview(type, mockEntries, card) {
  if (previewActive) exitPreview();

  previewBackup = {
    entries:      { ...allEntries },
    year:         currentYear,
    selectedDate: selectedDate,
  };
  previewActive = true;
  previewCard   = card;

  // Swap in-memory state (storage is never touched)
  allEntries   = mockEntries;
  currentYear  = 2025;
  selectedDate = `2025-06-09`;

  rebuildYearView();
  updateYearNavButtons();
  updateDateHeader(selectedDate);
  loadDateIntoForm(selectedDate);

  // Highlight the active card
  card.classList.add('previewing');
  card.querySelector('.btn-preview').textContent = '✓ Previewing';

  // Disable log panel while previewing
  const saveBtn = document.getElementById('btn-save');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Exit preview to log';

  // Show banner
  document.getElementById('preview-type').textContent = `${type} — ${PROFILE_TAGLINES[type]}`;
  document.getElementById('preview-banner').classList.add('show');

  // Scroll up so the heatmap is visible
  document.querySelector('.year-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitPreview() {
  if (!previewActive || !previewBackup) return;

  allEntries   = previewBackup.entries;
  currentYear  = previewBackup.year;
  selectedDate = previewBackup.selectedDate;
  previewActive = false;

  rebuildYearView();
  updateYearNavButtons();
  updateDateHeader(selectedDate);
  loadDateIntoForm(selectedDate);

  // Reset card styling
  if (previewCard) {
    previewCard.classList.remove('previewing');
    previewCard.querySelector('.btn-preview').textContent = '↗ Preview';
    previewCard = null;
  }

  previewBackup = null;

  // Hide banner
  document.getElementById('preview-banner').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', init);
