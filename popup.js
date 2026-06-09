let selectedDate   = toDateStr(new Date());
let selectedEmotion = null;
let currentEntry   = null;

/* ── Init ── */
async function init() {
  // If opened as a tab from year.html, a date may be in the URL hash
  const hash = window.location.hash.slice(1);
  if (hash && /^\d{4}-\d{2}-\d{2}$/.test(hash)) {
    selectedDate = hash;
  }

  // Streak (always based on today, not the selected date)
  const entries = await Storage.getEntries();
  const streak  = computeStreak(entries);
  if (streak > 0) {
    const badge = document.getElementById('streak-badge');
    badge.textContent   = `🔥 ${streak}`;
    badge.style.display = 'inline-block';
  }

  // Date picker controls
  const dateInput  = document.getElementById('date-input');
  dateInput.max    = toDateStr(new Date());          // no future dates

  document.getElementById('date-chip').addEventListener('click', () => {
    dateInput.value = selectedDate;
    dateInput.showPicker();
  });

  dateInput.addEventListener('change', e => {
    if (e.target.value) loadDate(e.target.value);
  });

  document.getElementById('btn-reset-date').addEventListener('click', () => {
    loadDate(toDateStr(new Date()));
  });

  // Slider
  const slider = document.getElementById('intensity-input');
  slider.addEventListener('input', () => setSlider(+slider.value));
  setSlider(5);

  // Emotion chips
  document.querySelectorAll('.ec').forEach(ec =>
    ec.addEventListener('click', () => pickEmotion(ec.dataset.emotion))
  );

  // Action buttons
  document.getElementById('btn-save').addEventListener('click', save);
  document.getElementById('btn-edit').addEventListener('click', () => showForm(currentEntry));
  document.getElementById('btn-to-year').addEventListener('click',   openYear);
  document.getElementById('btn-to-year-2').addEventListener('click', openYear);

  // Load the initial date
  await loadDate(selectedDate);
}

/* ── Load a date — the central state update ── */
async function loadDate(dateStr) {
  selectedDate = dateStr;
  updateDateChip(dateStr);

  currentEntry = await Storage.getEntry(dateStr);
  currentEntry ? showDone(currentEntry) : showForm();
}

/* ── Date chip UI ── */
function updateDateChip(dateStr) {
  const date    = new Date(dateStr + 'T00:00:00');
  const isToday = dateStr === toDateStr(new Date());

  document.getElementById('date-chip').textContent = fmtShort(date);
  document.getElementById('date-chip').classList.toggle('past', !isToday);
  document.getElementById('today-marker').style.display  = isToday ? '' : 'none';
  document.getElementById('btn-reset-date').style.display = isToday ? 'none' : '';

  // Update form prompt text for the current date context
  const promptEl = document.getElementById('form-prompt');
  if (promptEl) {
    promptEl.textContent = isToday
      ? 'How are you feeling today?'
      : `How were you feeling on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}?`;
  }
}

/* ── Form view ── */
function showForm(prefill = null) {
  document.getElementById('view-form').style.display = 'block';
  document.getElementById('view-done').style.display = 'none';

  if (prefill) {
    pickEmotion(prefill.emotion);
    const slider = document.getElementById('intensity-input');
    slider.value = prefill.intensity;
    setSlider(prefill.intensity);
    document.getElementById('note-input').value    = prefill.note || '';
    document.getElementById('btn-save').textContent = 'Update';
  } else {
    pickEmotion(null);
    const slider = document.getElementById('intensity-input');
    slider.value = 5;
    setSlider(5);
    document.getElementById('note-input').value    = '';
    document.getElementById('btn-save').textContent = 'Log this day';
  }

  // Sync the prompt with the currently selected date
  updateDateChip(selectedDate);
}

/* ── Done view ── */
function showDone(entry) {
  document.getElementById('view-form').style.display = 'none';
  document.getElementById('view-done').style.display = 'block';

  const meta = EMOTION_META[entry.emotion];
  document.getElementById('done-emoji').textContent   = meta.emoji;
  document.getElementById('done-emotion').textContent = meta.label;
  document.getElementById('done-emotion').style.color = COLORS[entry.emotion];
  document.getElementById('done-int').textContent     = `intensity ${entry.intensity} / 10`;

  const noteEl = document.getElementById('done-note');
  noteEl.textContent   = entry.note ? `"${entry.note}"` : '';
  noteEl.style.display = entry.note ? 'block' : 'none';
}

/* ── Emotion picker ── */
function pickEmotion(name) {
  selectedEmotion = name;
  document.querySelectorAll('.ec').forEach(ec =>
    ec.classList.toggle('selected', ec.dataset.emotion === name)
  );

  const c = name ? COLORS[name] : 'var(--accent)';
  document.getElementById('sfill').style.background = c;
  document.getElementById('sthumb').style.boxShadow = `0 1px 5px rgba(0,0,0,0.18), 0 0 0 2px ${c}`;
  document.getElementById('int-val').style.color    = c;
  document.getElementById('btn-save').disabled      = !name;
}

/* ── Slider ── */
function setSlider(v) {
  const pct = ((v - 1) / 9) * 100;
  document.getElementById('sfill').style.width      = pct + '%';
  document.getElementById('sthumb').style.left      = pct + '%';
  document.getElementById('int-val').textContent    = v;
}

/* ── Save ── */
async function save() {
  if (!selectedEmotion) return;
  const intensity = +document.getElementById('intensity-input').value;
  const note      = document.getElementById('note-input').value.trim();

  const btn       = document.getElementById('btn-save');
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    currentEntry = await Storage.saveEntry(selectedDate, { emotion: selectedEmotion, intensity, note });
    showDone(currentEntry);
    toast('Logged ✓');
  } catch {
    btn.disabled    = false;
    btn.textContent = currentEntry ? 'Update' : 'Log this day';
    toast('Save failed — try again');
  }
}

/* ── Open year view ── */
function openYear() {
  chrome.tabs.create({ url: chrome.runtime.getURL('year.html') });
}

/* ── Toast ── */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

/* ── Helpers ── */
function fmtShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

document.addEventListener('DOMContentLoaded', init);
