const ICON_ATTRS = { 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };

// ── Clock ─────────────────────────────────────────────────────────────────────
function tick() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('date').textContent =
    now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
setInterval(tick, 1000);
tick();

// ── Weather ───────────────────────────────────────────────────────────────────
const WMO_LUCIDE = {
  0: 'sun',
  1: 'cloud-sun', 2: 'cloud-sun', 3: 'cloud',
  45: 'wind', 48: 'wind',
  51: 'cloud-drizzle', 53: 'cloud-drizzle', 55: 'cloud-rain',
  61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain',
  71: 'cloud-snow', 73: 'cloud-snow', 75: 'cloud-snow', 77: 'cloud-snow',
  80: 'cloud-drizzle', 81: 'cloud-rain', 82: 'cloud-rain',
  85: 'cloud-snow', 86: 'cloud-snow',
  95: 'cloud-lightning', 96: 'cloud-lightning', 99: 'cloud-lightning'
};

const WMO_DESC = {
  0: 'Klart', 1: 'Mestadels klart', 2: 'Delvis molnigt', 3: 'Mulet',
  45: 'Dimma', 48: 'Dimma',
  51: 'Lätt duggregn', 53: 'Duggregn', 55: 'Duggregn',
  61: 'Lätt regn', 63: 'Regn', 65: 'Kraftigt regn',
  71: 'Lätt snöfall', 73: 'Snöfall', 75: 'Kraftigt snöfall', 77: 'Snökorn',
  80: 'Regnskurar', 81: 'Regnskurar', 82: 'Kraftiga skurar',
  85: 'Snöbyar', 86: 'Kraftiga snöbyar',
  95: 'Åska', 96: 'Åska med hagel', 99: 'Åska med hagel'
};

function iconTag(code, cls) {
  const name = WMO_LUCIDE[code] || 'cloud';
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}

async function loadWeather() {
  const LAT = 59.30, LON = 18.07;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current_weather=true` +
      `&hourly=temperature_2m,weathercode,precipitation_probability,precipitation,windspeed_10m,relativehumidity_2m` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
      `&forecast_days=7&timezone=auto`;

    const data = await (await fetch(url)).json();
    const { current_weather: cw, hourly, daily, utc_offset_seconds } = data;

    const localNow = new Date(Date.now() + utc_offset_seconds * 1000);
    const localHour = localNow.getUTCHours();
    const localDate = localNow.toISOString().slice(0, 10);
    const curHourStr = `${localDate}T${String(localHour).padStart(2, '0')}:00`;
    const curIdx = hourly.time.findIndex(t => t === curHourStr);

    document.getElementById('w-icon').innerHTML = iconTag(cw.weathercode, 'w-icon-svg');
    document.getElementById('w-temp').textContent = `${Math.round(cw.temperature)}°`;
    document.getElementById('w-cond').textContent = WMO_DESC[cw.weathercode] || 'Johanneshov';

    const pp = daily.precipitation_probability_max[0];
    const mm = daily.precipitation_sum[0];
    const wind = Math.round(cw.windspeed / 3.6 * 10) / 10;
    const hum = curIdx >= 0 ? hourly.relativehumidity_2m[curIdx] : null;

    document.getElementById('m-pp').textContent = pp != null ? `${pp}%` : '--';
    document.getElementById('m-mm').textContent = mm != null ? `${mm} mm` : '--';
    document.getElementById('m-wind').textContent = `${wind} m/s`;
    document.getElementById('m-hum').textContent = hum != null ? `${hum}%` : '--';

    const rainWarn = document.getElementById('rain-warn');
    rainWarn.hidden = !(pp != null && pp >= 50);

    document.getElementById('forecast').innerHTML = daily.time.slice(1).map((d, i) => {
      const idx = i + 1;
      const name = new Date(d + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'short' });
      return `<div class="fday">
        <span class="fday-name">${name}</span>
        <div class="fday-icon">${iconTag(daily.weathercode[idx], 'fday-icon-svg')}</div>
        <span class="fday-temps">${Math.round(daily.temperature_2m_min[idx])}°–${Math.round(daily.temperature_2m_max[idx])}°</span>
        <span class="fday-pp">${daily.precipitation_probability_max[idx] ?? '--'}%</span>
      </div>`;
    }).join('');

    lucide.createIcons({ attrs: ICON_ATTRS });
  } catch {
    document.getElementById('w-cond').textContent = 'Kunde inte hämta väder';
  }
}

loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);

// ── Calendar ──────────────────────────────────────────────────────────────────
const calEl = document.getElementById('cal');
const calBase = calEl.dataset.src;
const calOk = calBase && !calBase.includes('BYTA_UT');

if (calOk) {
  const u = new URL(calBase);
  u.searchParams.set('mode', 'WEEK');
  calEl.src = u.toString();
}

document.querySelectorAll('.vbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!calOk) return;
    document.querySelectorAll('.vbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const u = new URL(calBase);
    u.searchParams.set('mode', btn.dataset.mode);
    calEl.src = u.toString();
  });
});

// ── Lists ─────────────────────────────────────────────────────────────────────
const STORE_KEY = 'ipad_lists';
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let lists = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(lists));

function renderLists() {
  const inner = document.getElementById('lists-inner');
  inner.innerHTML = lists.map(list => `
    <div class="list-col" data-id="${list.id}">
      <div class="list-col-header">
        <span class="list-col-name" contenteditable="true">${esc(list.name)}</span>
        <button class="list-remove-btn" data-action="remove-list">×</button>
      </div>
      <div class="list-items">
        ${list.items.map(item => `
          <div class="todo-row${item.done ? ' done' : ''}" data-item-id="${item.id}">
            <button class="checkbox${item.done ? ' checked' : ''}" data-action="toggle">
              <svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg>
            </button>
            <span class="todo-text">${esc(item.text)}</span>
            <button class="todo-delete" data-action="delete-item">×</button>
          </div>
        `).join('')}
      </div>
      <div class="add-todo-row">
        <input type="text" class="add-todo-input" placeholder="Lägg till…">
        <button class="add-todo-btn" data-action="add-item">+</button>
      </div>
    </div>
  `).join('');

  inner.querySelectorAll('.list-col-name').forEach(el => {
    const listId = el.closest('.list-col').dataset.id;
    const list = lists.find(l => l.id === listId);
    el.addEventListener('blur', () => {
      const v = el.textContent.trim();
      if (v) { list.name = v; persist(); }
      else el.textContent = list.name;
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    });
  });
}

document.getElementById('lists-inner').addEventListener('click', e => {
  const col = e.target.closest('.list-col');
  if (!col) return;
  const list = lists.find(l => l.id === col.dataset.id);
  if (!list) return;
  const action = e.target.closest('[data-action]')?.dataset.action;

  if (action === 'remove-list') {
    lists = lists.filter(l => l.id !== list.id);
    persist(); renderLists();
  } else if (action === 'toggle') {
    const itemId = e.target.closest('.todo-row')?.dataset.itemId;
    const item = list.items.find(i => i.id === itemId);
    if (item) { item.done = !item.done; persist(); renderLists(); }
  } else if (action === 'delete-item') {
    const itemId = e.target.closest('.todo-row')?.dataset.itemId;
    list.items = list.items.filter(i => i.id !== itemId);
    persist(); renderLists();
  } else if (action === 'add-item') {
    const input = col.querySelector('.add-todo-input');
    const v = input.value.trim();
    if (v) { list.items.push({ id: uid(), text: v, done: false }); persist(); renderLists(); }
  }
});

document.getElementById('lists-inner').addEventListener('keydown', e => {
  if (e.target.matches('.add-todo-input') && e.key === 'Enter') {
    e.target.closest('.list-col')?.querySelector('[data-action="add-item"]')?.click();
  }
});

document.getElementById('new-list-btn').addEventListener('click', () => {
  const input = document.getElementById('new-list-input');
  const name = input.value.trim();
  if (!name) return;
  lists.push({ id: uid(), name, items: [] });
  persist(); renderLists();
  input.value = '';
});

document.getElementById('new-list-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('new-list-btn').click();
});

renderLists();
lucide.createIcons({ attrs: ICON_ATTRS });
