// ── Clock ─────────────────────────────────────────────────────────────────────
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');

function tick() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  dateEl.textContent = now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
setInterval(tick, 1000);
tick();

// ── Weather ───────────────────────────────────────────────────────────────────
const WMO = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'❄️', 77:'🌨️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  85:'🌨️', 86:'❄️',
  95:'⛈️', 96:'⛈️', 99:'⛈️'
};

function wmoIcon(code) { return WMO[code] ?? '🌡️'; }

async function loadWeather() {
  const LAT = 59.30;
  const LON = 18.07;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
    const { current_weather: cw, hourly, daily } = await (await fetch(url)).json();

    document.getElementById('wcurrent').textContent =
      `${wmoIcon(cw.weathercode)} ${Math.round(cw.temperature)}°C`;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const todaySlots = hourly.time.map((t, i) => ({
      t,
      h: parseInt(t.slice(11, 13), 10),
      temp: Math.round(hourly.temperature_2m[i]),
      code: hourly.weathercode[i],
      rain: hourly.precipitation_probability[i],
      day: t.slice(0, 10)
    })).filter(s => s.day === todayStr && s.h >= 6 && s.h <= 21 && s.h % 3 === 0);

    document.getElementById('wtoday-slots').innerHTML = todaySlots.map(s =>
      `<div class="wslot">
        <span class="wtime">${s.t.slice(11, 16)}</span>
        <span class="wicon">${wmoIcon(s.code)}</span>
        <span class="wtemp">${s.temp}°</span>
        <span class="wrain">${s.rain >= 20 ? s.rain + '%' : ''}</span>
      </div>`
    ).join('');

    document.getElementById('wweek').innerHTML = daily.time.slice(1).map((d, i) => {
      const idx = i + 1;
      const name = new Date(d + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'short' });
      return `<div class="wday-row">
        <span class="wday-name">${name}</span>
        <span class="wday-icon">${wmoIcon(daily.weathercode[idx])}</span>
        <span class="wday-range">${Math.round(daily.temperature_2m_min[idx])}°–${Math.round(daily.temperature_2m_max[idx])}°</span>
      </div>`;
    }).join('');
  } catch {
    document.getElementById('wcurrent').textContent = 'Kunde inte hämta väder';
  }
}

loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);

// ── Calendar ──────────────────────────────────────────────────────────────────
const calEl = document.getElementById('cal');
const calBase = calEl.dataset.src;
const calConfigured = calBase && !calBase.includes('BYTA_UT');

if (calConfigured) {
  const u = new URL(calBase);
  u.searchParams.set('mode', 'WEEK');
  calEl.src = u.toString();
}

document.querySelectorAll('.vbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!calConfigured) return;
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
let lists = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
const persist = () => localStorage.setItem(STORE_KEY, JSON.stringify(lists));

function renderLists() {
  const grid = document.getElementById('lists-grid');
  grid.innerHTML = '';
  lists.forEach(list => {
    const card = document.createElement('div');
    card.className = 'list-card';

    const header = document.createElement('div');
    header.className = 'lcard-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'lname';
    nameEl.textContent = list.name;
    nameEl.addEventListener('click', () =>
      showDialog('Byt namn', list.name, v => { list.name = v; persist(); renderLists(); })
    );

    const delBtn = document.createElement('button');
    delBtn.className = 'ldelete';
    delBtn.title = 'Ta bort lista';
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', () => {
      if (confirm(`Ta bort "${list.name}"?`)) {
        lists = lists.filter(l => l.id !== list.id);
        persist();
        renderLists();
      }
    });

    header.append(nameEl, delBtn);

    const itemsEl = document.createElement('div');
    itemsEl.className = 'litems';

    list.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'litem' + (item.done ? ' done' : '');

      const text = document.createElement('span');
      text.className = 'litem-text';
      text.textContent = item.text;
      text.addEventListener('click', () => { item.done = !item.done; persist(); renderLists(); });

      const rm = document.createElement('button');
      rm.className = 'litem-rm';
      rm.textContent = '✕';
      rm.addEventListener('click', e => {
        e.stopPropagation();
        list.items = list.items.filter(i => i.id !== item.id);
        persist();
        renderLists();
      });

      row.append(text, rm);
      itemsEl.appendChild(row);
    });

    const addRow = document.createElement('div');
    addRow.className = 'ladd-row';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'ladd-input';
    inp.placeholder = 'Lägg till…';

    const addBtn = document.createElement('button');
    addBtn.className = 'ladd-btn';
    addBtn.textContent = '+';

    const doAdd = () => {
      const v = inp.value.trim();
      if (!v) return;
      list.items.push({ id: uid(), text: v, done: false });
      persist();
      renderLists();
    };
    addBtn.addEventListener('click', doAdd);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    addRow.append(inp, addBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'lclear';
    clearBtn.textContent = 'Rensa avklarade';
    clearBtn.addEventListener('click', () => {
      list.items = list.items.filter(i => !i.done);
      persist();
      renderLists();
    });

    card.append(header, itemsEl, addRow, clearBtn);
    grid.appendChild(card);
  });
}

document.getElementById('new-list').addEventListener('click', () =>
  showDialog('Ny lista', '', name => {
    lists.push({ id: uid(), name, items: [] });
    persist();
    renderLists();
  })
);

renderLists();

// ── Dialog ────────────────────────────────────────────────────────────────────
let dlgCb = null;

function showDialog(title, def, cb) {
  document.getElementById('dlg-title').textContent = title;
  document.getElementById('dlg-input').value = def || '';
  dlgCb = cb;
  document.getElementById('dlg-overlay').hidden = false;
  requestAnimationFrame(() => document.getElementById('dlg-input').focus());
}

function closeDialog(ok) {
  if (ok && dlgCb) {
    const v = document.getElementById('dlg-input').value.trim();
    if (v) dlgCb(v);
  }
  document.getElementById('dlg-overlay').hidden = true;
  dlgCb = null;
}

document.getElementById('dlg-cancel').addEventListener('click', () => closeDialog(false));
document.getElementById('dlg-ok').addEventListener('click', () => closeDialog(true));
document.getElementById('dlg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') closeDialog(true);
  if (e.key === 'Escape') closeDialog(false);
});
