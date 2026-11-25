/* Hà Giang 2026 — Mobile Travel Planner v5.0 Application Logic
 * 100% backward-compatible with localStorage key 'haGiangTrip2026-v1' & JSON schema v1.
 */
(() => {
  'use strict';

  const D = window.TRIP_DATA;
  const STORAGE_KEY = 'haGiangTrip2026-v1';
  const THEME_KEY = 'haGiangTrip2026-theme';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const money = (n) => Math.round(n).toLocaleString('vi-VN') + ' đ';
  const num = (n) => Math.max(0, Number(n) || 0);
  const esc = (x) =>
    String(x ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const vnDate = () => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date()).map((x) => [x.type, x.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  const currentDayIndex = () => {
    const today = vnDate();
    const idx = D.dates.indexOf(today);
    if (idx >= 0) return idx;
    return today > D.dates[D.dates.length - 1] ? D.dates.length - 1 : 0;
  };

  const mapLink = (q) =>
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q + ', Việt Nam');

  const directionsLink = (arr) =>
    'https://www.google.com/maps/dir/?api=1&origin=' +
    encodeURIComponent(arr[0] + ', Việt Nam') +
    '&destination=' +
    encodeURIComponent(arr[arr.length - 1] + ', Việt Nam') +
    '&waypoints=' +
    encodeURIComponent(arr.slice(1, -1).map((x) => x + ', Việt Nam').join('|')) +
    '&travelmode=driving';

  // --- SVG Icons ---
  const ICONS = {
    home: '<path d="m3 10.5 9-7 9 7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
    check: '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M9 4V2h6v4H9zm0 8 2 2 4.5-4.5M9 17h6"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-1 4h-5v4h5"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    route: '<circle cx="5" cy="5" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M7.2 5H16a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8.8"/>',
    ticket: '<path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 7v2.5m0 3v2m0 2.5V19"/>',
    note: '<path d="M13 4H5v16h14v-8M10 14l1-4 8-8 3 3-8 8z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2.2 2.2m9.6 9.6L19 19m0-14-2.2 2.2M7.2 16.8 5 19"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
  };

  const iconSvg = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.more}</svg>`;

  // --- State Management (v1 Schema Compatible) ---
  const freshState = () => ({
    v: 1,
    checks: {},
    events: {},
    places: {},
    plans: Object.fromEntries(D.budgets.map((b) => [b[0], b[2]])),
    expenses: [],
    custom: [],
    extraTasks: [],
    bookings: {},
    journals: {},
    note: ''
  });

  const isBlankExpense = (x) => !x.name && !num(x.amount) && !x.payer && !x.note;
  const isBlankCustom = (x) => !x.name && !x.note && !x.date && !x.time;

  function normalize(x) {
    if (!x || x.v !== 1) throw new Error('Phiên bản dữ liệu không hợp lệ');
    const z = freshState();
    for (const k of ['checks', 'events', 'places', 'bookings', 'journals']) {
      if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k])) z[k] = { ...x[k] };
    }
    for (const b of D.budgets) {
      if (x.plans && Object.prototype.hasOwnProperty.call(x.plans, b[0])) {
        z.plans[b[0]] = num(x.plans[b[0]]);
      }
    }
    if (Array.isArray(x.expenses)) {
      z.expenses = x.expenses
        .filter((a) => a && typeof a === 'object')
        .map((a) => ({
          id: String(a.id || uid()),
          date: String(a.date || ''),
          name: String(a.name || ''),
          cat: D.budgets.some((b) => b[0] === a.cat) ? a.cat : 'extra',
          amount: num(a.amount),
          payer: String(a.payer || ''),
          note: String(a.note || '')
        }))
        .filter((a) => !isBlankExpense(a));
    }
    if (Array.isArray(x.custom)) {
      z.custom = x.custom
        .filter((a) => a && typeof a === 'object')
        .map((a) => ({
          id: String(a.id || uid()),
          date: String(a.date || ''),
          time: String(a.time || ''),
          name: String(a.name || ''),
          note: String(a.note || ''),
          done: !!a.done
        }))
        .filter((a) => !isBlankCustom(a));
    }
    if (Array.isArray(x.extraTasks)) {
      z.extraTasks = x.extraTasks
        .filter((a) => a && typeof a === 'object' && String(a.name || '').trim())
        .map((a) => ({
          id: String(a.id || uid()),
          name: String(a.name || '').trim(),
          done: !!a.done
        }));
    }
    z.note = String(x.note || '');
    return z;
  }

  let state = freshState();
  let storageOK = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = normalize(JSON.parse(raw));
  } catch (e) {
    storageOK = false;
  }

  let activeDay = currentDayIndex();
  let placeFilter = 'all';
  let checkFilter = 'all';
  let openGroups = new Set([0]);
  let toastTimer = null;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOK = true;
    } catch (e) {
      storageOK = false;
    }
    $('#headerStatus').textContent = storageOK ? 'Đã lưu' : 'Chưa lưu';
    $('#statusDot').classList.toggle('bad', !storageOK);
    $('#saveStatus').textContent = storageOK ? ' · Đã lưu trên thiết bị' : ' · Không lưu được, hãy xuất JSON';
    $('#storageStatus').textContent = storageOK
      ? 'Lưu cục bộ đang hoạt động bình thường trên trình duyệt này.'
      : 'Trình duyệt chặn lưu cục bộ. Hãy xuất JSON sao lưu trước khi đóng.';
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // --- Theme Handling ---
  function getThemeChoice() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }

  function applyTheme(choice) {
    const valid = ['auto', 'light', 'dark'].includes(choice) ? choice : 'auto';
    try { localStorage.setItem(THEME_KEY, valid); } catch (e) {}
    const isDark =
      valid === 'dark' || (valid === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0c1412' : '#f3f6f4');
    $('#themeToggle').innerHTML = iconSvg(isDark ? 'sun' : 'moon');
    $$('[data-theme-choice]').forEach((b) => b.classList.toggle('active', b.dataset.themeChoice === valid));
  }

  // --- Global Image Fallback (CSP-clean, preserves date labels) ---
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const fb = img.dataset.fallback;
    if (fb && img.getAttribute('src') !== fb) {
      img.src = fb;
      const credit = img.parentElement?.querySelector('.photo-credit');
      if (credit) credit.textContent = 'Ảnh minh họa dự phòng';
    }
  }, true);

  function photoImg(p, alt, cls = '') {
    return `<img class="${cls}" src="${esc(p[0])}" data-fallback="${esc(p[1])}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }

  const coverCredit = (p) => (p[3] ? 'Ảnh tham khảo online' : p[2]);

  // --- Computations ---
  function totals() {
    const planned = D.budgets.reduce((s, b) => s + num(state.plans[b[0]]), 0);
    const actual = state.expenses.reduce((s, e) => s + num(e.amount), 0);
    return { planned, actual, remaining: planned - actual };
  }

  function spentByCat(cat) {
    return state.expenses.filter((x) => x.cat === cat).reduce((s, x) => s + num(x.amount), 0);
  }

  function checkStats() {
    const total = D.groups.reduce((s, g) => s + g[1].length, 0) + state.extraTasks.length;
    const done =
      D.groups.reduce((s, g, i) => s + g[1].filter((_, j) => state.checks[`${i}-${j}`]).length, 0) +
      state.extraTasks.filter((x) => x.done).length;
    return { total, done };
  }

  function eventStats() {
    const total = D.days.reduce((s, d) => s + d[5].length, 0);
    const done = D.days.reduce((s, d, i) => s + d[5].filter((_, j) => state.events[`${i}-${j}`]).length, 0);
    return { total, done };
  }

  // --- Navigation ---
  function initNav() {
    $('#nav').innerHTML = D.tabs
      .map(
        ([id, label, icon, isPrimary]) =>
          `<button type="button" data-tab="${id}" class="${isPrimary ? 'primary-tab' : 'secondary-tab'}">${iconSvg(icon)}<span>${label}</span></button>`
      )
      .join('');
    $$('[data-icon]').forEach((el) => {
      el.innerHTML = iconSvg(el.dataset.icon);
    });
  }

  function showTab(id) {
    if (!D.tabs.some((t) => t[0] === id)) id = 'overview';
    $$('.panel').forEach((p) => p.classList.toggle('active', p.id === id));
    $$('#nav button').forEach((b) => {
      const isCurrent = b.dataset.tab === id;
      const isSub = b.dataset.tab === 'more' && ['route', 'bookings', 'notes', 'settings'].includes(id);
      b.classList.toggle('active', isCurrent);
      b.classList.toggle('sub-active', isSub);
      b.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.dataset.page = id;
  }

  // --- Metrics & Smart Up Next ---
  function metricCard({ label, value, unit = '', sub = '', kind = 'planned', icon = '◈', pct = null }) {
    return `
      <div class="metric-card" data-kind="${kind}">
        <div class="metric-top">
          <span class="metric-icon" aria-hidden="true">${icon}</span>
          <span class="metric-label">${esc(label)}</span>
        </div>
        <div class="metric-val">${esc(value)}${unit ? ` <span class="unit">${esc(unit)}</span>` : ''}</div>
        ${sub ? `<div class="metric-sub">${esc(sub)}</div>` : ''}
        ${pct !== null ? `<div class="bar"><i style="width:${Math.min(100, Math.max(0, pct))}%"></i></div>` : ''}
      </div>
    `;
  }

  function renderMetrics() {
    const t = totals();
    const cs = checkStats();
    const es = eventStats();
    const checkPct = cs.total ? (cs.done / cs.total) * 100 : 0;
    const eventPct = es.total ? (es.done / es.total) * 100 : 0;
    const overallPct = Math.round(((cs.done + es.done) / (cs.total + es.total)) * 100);

    $('#heroProgressPill').textContent = `${overallPct}% hoàn thành`;

    $('#metrics').innerHTML = [
      metricCard({ label: 'Dự trù', value: Math.round(t.planned).toLocaleString('vi-VN'), unit: 'đ', sub: 'Cho 2 người', kind: 'planned', icon: '◈' }),
      metricCard({ label: 'Đã chi', value: Math.round(t.actual).toLocaleString('vi-VN'), unit: 'đ', sub: `${t.planned ? Math.round((t.actual / t.planned) * 100) : 0}% ngân sách`, kind: 'spent', icon: '₫' }),
      metricCard({ label: 'Chuẩn bị', value: `${cs.done}/${cs.total}`, sub: `${Math.round(checkPct)}% checklist`, kind: 'progress', icon: '✓', pct: checkPct }),
      metricCard({ label: 'Lịch trình', value: `${es.done}/${es.total}`, sub: `${Math.round(eventPct)}% hoạt động`, kind: 'progress', icon: '◷', pct: eventPct })
    ].join('');

    $('#budgetMetrics').innerHTML = [
      metricCard({ label: 'Dự trù', value: Math.round(t.planned).toLocaleString('vi-VN'), unit: 'đ', kind: 'planned', icon: '◈' }),
      metricCard({ label: 'Đã chi', value: Math.round(t.actual).toLocaleString('vi-VN'), unit: 'đ', kind: 'spent', icon: '₫' }),
      metricCard({ label: 'Còn lại', value: Math.round(t.remaining).toLocaleString('vi-VN'), unit: 'đ', kind: t.remaining < 0 ? 'over' : 'remaining', icon: '◎' }),
      metricCard({ label: 'Bình quân', value: Math.round(t.planned / 2).toLocaleString('vi-VN'), unit: 'đ', sub: 'Mỗi người', kind: 'planned', icon: '⇄' })
    ].join('');

    $('#checkProgress').textContent = `${cs.done}/${cs.total} (${Math.round(checkPct)}%)`;
    $('#checkBar').style.width = `${checkPct}%`;

    renderUpNext();
  }

  function renderUpNext() {
    const startIdx = currentDayIndex();
    let found = null;
    for (let offset = 0; offset < D.days.length; offset++) {
      const i = (startIdx + offset) % D.days.length;
      const d = D.days[i];
      for (let j = 0; j < d[5].length; j++) {
        if (!state.events[`${i}-${j}`]) {
          found = { dayIdx: i, day: d, ev: d[5][j] };
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      $('#upNext').innerHTML = `
        <div class="upnext-card">
          <div class="upnext-body">
            <div class="upnext-label">Hoàn thành chuyến đi</div>
            <div class="upnext-title">Tất cả 47 mốc hành trình đã được đánh dấu!</div>
            <div class="upnext-sub">Đừng quên xuất bản sao lưu JSON để lưu giữ kỷ niệm.</div>
          </div>
          <button type="button" class="btn tiny primary" data-tab="notes">Xem nhật ký</button>
        </div>`;
      return;
    }

    $('#upNext').innerHTML = `
      <div class="upnext-card">
        <div class="upnext-body">
          <div class="upnext-label">Mốc tiếp theo · ${esc(found.day[0])} (${esc(found.ev[0])})</div>
          <div class="upnext-title">${esc(found.ev[1])}</div>
          <div class="upnext-sub">${esc(found.ev[2])}</div>
        </div>
        <button type="button" class="btn tiny primary" data-day="${found.dayIdx}">Mở lịch ›</button>
      </div>`;
  }

  // --- Feature Cards & Overview ---
  function featureCard(i) {
    const p = D.placeData[i];
    const f = D.photoData[i];
    return `
      <button type="button" class="feature" data-photo="${i}" aria-label="Xem ảnh ${esc(p[1])}">
        ${photoImg(f, p[1])}
        <span class="feature-copy">
          <span class="feature-title">${esc(p[1])}</span>
          <span class="feature-meta">${esc(p[0])} · ${f[3] ? 'Ảnh tham khảo' : esc(f[2].replace('Ảnh ', ''))}</span>
        </span>
      </button>`;
  }

  function renderOverview() {
    const today = vnDate();
    const diff = Math.round((Date.parse(D.dates[0]) - Date.parse(today)) / 86400000);
    const countdownEl = $('#tripCountdown');
    if (diff > 0) {
      countdownEl.textContent = `⏳ Còn ${diff} ngày khởi hành`;
      countdownEl.classList.remove('live');
    } else if (today <= D.dates[D.dates.length - 1]) {
      countdownEl.textContent = `● Đang hành trình · Ngày ${currentDayIndex() + 1}/6`;
      countdownEl.classList.add('live');
    } else {
      countdownEl.textContent = '30/11 – 05/12/2026';
      countdownEl.classList.remove('live');
    }

    $('#featured').innerHTML = D.featuredIndices.map(featureCard).join('');

    $('#overviewDays').innerHTML = D.days
      .map((d, i) => {
        const done = d[5].filter((_, j) => state.events[`${i}-${j}`]).length;
        const total = d[5].length;
        const allDone = done === total;
        return `
          <div class="overview-day" data-day="${i}" role="button" tabindex="0" aria-label="Xem ngày ${d[0]}">
            ${photoImg(D.dayPhotos[i], d[2])}
            <div>
              <div class="overview-day-title">${esc(d[0])} · ${esc(d[1])}</div>
              <div class="overview-day-sub">${esc(d[2])}</div>
            </div>
            <div class="overview-day-right">
              <span class="mini-pill ${allDone ? 'done' : ''}">${done}/${total}</span>
              <span class="muted" style="font-size:18px">›</span>
            </div>
          </div>`;
      })
      .join('');

    renderUrgent();

    $('#weatherGrid').innerHTML = D.weather
      .map(
        (w) => `
        <div class="weather-card ${w.rain ? 'rain' : ''}">
          <div class="weather-top">
            <span class="weather-day">${esc(w.day)}</span>
            <span class="weather-area">${esc(w.area)}</span>
          </div>
          <div class="weather-temp"><span>${w.icon}</span><span>${esc(w.temp)}</span></div>
          <div class="weather-cond">${esc(w.cond)}</div>
          <div class="weather-gear">${esc(w.gear)}</div>
        </div>`
      )
      .join('');
  }

  function renderUrgent() {
    $('#urgent').innerHTML = D.groups[0][1]
      .slice(0, 5)
      .map((x, i) => {
        const checked = !!state.checks[`0-${i}`];
        return `
          <label class="check ${checked ? 'done' : ''}">
            <input type="checkbox" data-check="0-${i}" ${checked ? 'checked' : ''}>
            <span class="check-text">${esc(x[0])}<small>Hạn: ${esc(x[1])}</small></span>
          </label>`;
      })
      .join('');
  }

  // --- Schedule (Render only active day to avoid DOM bloat + support swipe) ---
  function renderDayTabs() {
    $('#dayTabs').innerHTML = D.days
      .map((d, i) => {
        const done = d[5].filter((_, j) => state.events[`${i}-${j}`]).length;
        const allDone = done === d[5].length;
        const [dd, mm] = d[0].split('/');
        return `
          <button type="button" class="day-btn ${i === activeDay ? 'active' : ''}" data-day="${i}">
            ${allDone ? '<span class="day-dot" title="Hoàn thành"></span>' : ''}
            <small>${D.dayShortLabels[i]}</small>
            <b>${dd}</b>
            <span>/${mm}</span>
          </button>`;
      })
      .join('');
    $('#prevDay').disabled = activeDay === 0;
    $('#nextDay').disabled = activeDay === D.days.length - 1;
  }

  function renderActiveDay() {
    const i = activeDay;
    const d = D.days[i];
    const done = d[5].filter((_, j) => state.events[`${i}-${j}`]).length;
    const total = d[5].length;
    const pct = total ? (done / total) * 100 : 0;

    const placeIndices = D.placeData
      .map((p, idx) => (p[0] === d[0] ? idx : -1))
      .filter((idx) => idx >= 0);

    const dayGalleryHtml = placeIndices.length
      ? `<div class="day-gallery">
           <h3>Điểm đến trong ngày (${placeIndices.length})</h3>
           <div class="photo-strip">${placeIndices.map(featureCard).join('')}</div>
         </div>`
      : '';

    const timelineHtml = d[5]
      .map((ev, j) => {
        const key = `${i}-${j}`;
        const isDone = !!state.events[key];
        const isLu = ev[3].startsWith('Lu');
        const ep = D.eventPhotos[i]?.[j];
        const photoHtml = ep
          ? `<button type="button" class="event-photo-btn" data-raw-photo="${esc(ep[0])}" data-raw-title="${esc(ep[1])}" aria-label="Phóng to ảnh ${esc(ep[1])}">
               <img class="event-photo" src="${esc(ep[0])}" alt="${esc(ep[1])}" loading="lazy" decoding="async">
               <div class="event-credit">Ảnh minh họa · Lu Travel · Chạm để phóng to</div>
             </button>`
          : '';
        return `
          <label class="event ${isDone ? 'done' : ''}" data-event-row="${key}">
            <div class="event-time">${esc(ev[0])}</div>
            <input type="checkbox" aria-label="${esc(ev[1])}" data-event="${key}" ${isDone ? 'checked' : ''}>
            <div class="event-content">
              <div class="event-title">${esc(ev[1])}<span class="event-tag ${isLu ? 'lu' : ''}">${esc(ev[3])}</span></div>
              <div class="small">${esc(ev[2])}</div>
              ${photoHtml}
            </div>
          </label>`;
      })
      .join('');

    $('#dayContent').innerHTML = `
      <article class="card dayblock" data-active-day="${i}">
        <div class="dayhead">
          <div class="day-cover">
            ${photoImg(D.dayPhotos[i], d[2])}
            <span class="photo-credit">${esc(coverCredit(D.dayPhotos[i]))}</span>
          </div>
          <div class="day-title">
            <div class="eyebrow">${esc(d[0])} · ${esc(d[1])}</div>
            <h2>${esc(d[2])}</h2>
            <p>${esc(d[4])}</p>
            <span class="pill">Nghỉ: ${esc(d[3])}</span>
          </div>
        </div>
        ${dayGalleryHtml}
        <div class="daily-progress">
          <span id="dailyProgText" class="tabular">${done}/${total} hoạt động</span>
          <div class="bar"><i id="dailyProgBar" style="width:${pct}%"></i></div>
        </div>
        <div class="timeline">${timelineHtml}</div>
        <label class="journal-label">
          Ghi chú ngày ${esc(d[0])}
          <textarea data-journal="${i}" placeholder="Thay đổi giờ, quán ngon, trải nghiệm…">${esc(state.journals[i] || '')}</textarea>
        </label>
      </article>`;
  }

  function pickDay(i, jumpToTab = true) {
    activeDay = Math.max(0, Math.min(D.days.length - 1, i));
    renderDayTabs();
    renderActiveDay();
    if (jumpToTab) showTab('schedule');
  }

  // --- Route & 22 Places ---
  function renderRouteStatic() {
    const coords = [
      [[65, 95], [235, 95], [405, 95], [575, 95], [575, 185], [405, 185], [235, 185], [65, 185]],
      [[65, 185], [65, 280], [235, 280], [405, 280], [575, 280], [575, 375]],
      [[575, 375], [405, 375], [235, 375], [65, 375], [65, 475], [235, 475], [405, 475]]
    ];

    let svg = '';
    coords.forEach((arr, i) => {
      svg += `<path class="road day${i + 1}" marker-end="url(#arrow${i + 1})" d="M${arr.map((p) => p.join(' ')).join(' L')}"/>`;
      arr.forEach(([x, y], j) => {
        if (i > 0 && j === 0) return;
        const anchor = x === 65 ? 'start' : x === 575 ? 'end' : 'middle';
        svg += `<circle class="node" cx="${x}" cy="${y}" r="7"/>`;
        svg += `<text x="${x}" y="${y - 16}" text-anchor="${anchor}">${esc(D.routes[i].pts[j])}</text>`;
      });
    });
    svg += '<text x="25" y="40" style="font-size:15px">01/12 · Xanh ngọc  •  02/12 · Cam  •  03/12 · Xanh lam</text>';
    $('#routeSvg').innerHTML = svg;

    $('#routeLinks').innerHTML = D.routes
      .map(
        (r) => `
        <div class="card">
          <div class="row spread" style="margin-bottom:6px">
            <h3 style="margin:0">${esc(r.title)}</h3>
            <span class="small">${esc(r.badge)}</span>
          </div>
          <ol class="route-steps">
            ${r.pts.map((pt, j) => `<li><span>${j + 1}</span><a href="${mapLink(r.maps[j])}" target="_blank" rel="noopener">${esc(pt)}</a></li>`).join('')}
          </ol>
          <a class="btn tiny" href="${directionsLink(r.maps)}" target="_blank" rel="noopener">Mở tuyến trên Google Maps ↗</a>
        </div>`
      )
      .join('');
  }

  function renderPlaceFilters() {
    const opts = [
      ['all', 'Tất cả'],
      ['unvisited', 'Chưa đến'],
      ['01/12', '01/12'],
      ['02/12', '02/12'],
      ['03/12', '03/12'],
      ['04/12', '04/12']
    ];
    $('#placeFilters').innerHTML = opts
      .map(([v, label]) => `<button type="button" class="chip ${placeFilter === v ? 'active' : ''}" data-filter="${v}">${label}</button>`)
      .join('');
  }

  function renderPlaces() {
    const visited = D.placeData.filter((_, i) => state.places[i]).length;
    $('#placeProgress').textContent = `${visited}/${D.placeData.length} đã đến`;
    const q = ($('#placeSearch').value || '').trim().toLocaleLowerCase('vi');

    const items = D.placeData
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => {
        if (placeFilter === 'unvisited' && state.places[i]) return false;
        if (placeFilter !== 'all' && placeFilter !== 'unvisited' && p[0] !== placeFilter) return false;
        if (q && !p.join(' ').toLocaleLowerCase('vi').includes(q)) return false;
        return true;
      });

    $('#places').innerHTML =
      items
        .map(({ p, i }) => {
          const isChecked = !!state.places[i];
          return `
            <article class="place ${isChecked ? 'checked' : ''}" data-place-card="${i}">
              <div class="place-media" data-photo="${i}" role="button" tabindex="0" aria-label="Xem ảnh ${esc(p[1])}">
                ${photoImg(D.photoData[i], p[1])}
                <span class="place-num">${i + 1}</span>
                <span class="photo-credit">${esc(coverCredit(D.photoData[i]))}</span>
              </div>
              <div class="place-body">
                <div class="place-info">
                  <div class="small">${esc(p[0])} · ${esc(p[2])}</div>
                  <h3>${esc(p[1])}</h3>
                  <p>${esc(p[3])}</p>
                  <a class="place-map-link" href="${mapLink(p[4])}" target="_blank" rel="noopener">Mở vị trí ↗</a>
                </div>
                <label class="visit-toggle">
                  <span>${isChecked ? 'Đã đến' : 'Check-in'}</span>
                  <input type="checkbox" aria-label="Đã check-in ${esc(p[1])}" data-place="${i}" ${isChecked ? 'checked' : ''}>
                </label>
              </div>
            </article>`;
        })
        .join('') || '<div class="card small">Không tìm thấy địa điểm phù hợp.</div>';
  }

  // --- Checklist ---
  function renderChecks() {
    const q = ($('#checkSearch').value || '').trim().toLocaleLowerCase('vi');

    const groupsHtml = D.groups
      .map((g, i) => {
        const doneCount = g[1].filter((_, j) => state.checks[`${i}-${j}`]).length;
        const pct = g[1].length ? (doneCount / g[1].length) * 100 : 0;

        const visibleItems = g[1]
          .map((item, j) => ({ item, j, checked: !!state.checks[`${i}-${j}`] }))
          .filter(({ item, checked }) => {
            if (checkFilter === 'todo' && checked) return false;
            if (checkFilter === 'done' && !checked) return false;
            if (q && !item.join(' ').toLocaleLowerCase('vi').includes(q)) return false;
            return true;
          });

        if ((q || checkFilter !== 'all') && visibleItems.length === 0) return '';

        const isOpen = !!q || checkFilter !== 'all' || openGroups.has(i);
        return `
          <details class="card checkgroup" data-group="${i}" ${isOpen ? 'open' : ''}>
            <summary>
              <h3>${esc(g[0])}</h3>
              <span class="small tabular" data-group-count="${i}">${doneCount}/${g[1].length}</span>
            </summary>
            <div class="bar"><i data-group-bar="${i}" style="width:${pct}%"></i></div>
            <div>
              ${visibleItems
                .map(
                  ({ item, j, checked }) => `
                  <label class="check ${checked ? 'done' : ''}">
                    <input type="checkbox" data-check="${i}-${j}" ${checked ? 'checked' : ''}>
                    <span class="check-text">${esc(item[0])}<small>${esc(item[1])}</small></span>
                  </label>`
                )
                .join('')}
            </div>
          </details>`;
      })
      .join('');

    const filteredExtra = state.extraTasks.filter((x) => {
      if (checkFilter === 'todo' && x.done) return false;
      if (checkFilter === 'done' && !x.done) return false;
      if (q && !x.name.toLocaleLowerCase('vi').includes(q)) return false;
      return true;
    });

    const extraHtml = `
      <div class="card" id="extraTasksCard">
        <h3>Việc tự bổ sung</h3>
        <div>
          ${
            filteredExtra
              .map(
                (x) => `
              <div class="row" style="border-bottom:1px solid var(--line);padding:4px 0">
                <label class="check ${x.done ? 'done' : ''}" style="flex:1;border:0;padding:6px 0">
                  <input type="checkbox" data-extra="${esc(x.id)}" ${x.done ? 'checked' : ''}>
                  <span class="check-text">${esc(x.name)}</span>
                </label>
                <button type="button" class="btn tiny danger" data-delete-task="${esc(x.id)}">Xóa</button>
              </div>`
              )
              .join('') || '<p class="small">Chưa có mục việc riêng nào.</p>'
          }
        </div>
        <form id="taskForm" class="row spaced">
          <input id="taskName" required placeholder="Nhập việc cần làm thêm…" style="flex:1">
          <button class="btn primary" type="submit">Thêm</button>
        </form>
      </div>`;

    $('#checkGroups').innerHTML = groupsHtml + extraHtml;

    $('#taskForm').onsubmit = (e) => {
      e.preventDefault();
      const input = $('#taskName');
      const name = input.value.trim();
      if (!name) return;
      state.extraTasks.push({ id: uid(), name, done: false });
      save();
      renderChecks();
      renderMetrics();
      toast('Đã thêm việc mới');
    };
  }

  // --- Budget & Expense Ledger ---
  function renderBudgetCards() {
    $('#budgetCards').innerHTML = D.budgets
      .map(([code, label]) => {
        const plan = num(state.plans[code]);
        const sp = spentByCat(code);
        const rem = plan - sp;
        const pct = plan ? Math.min(100, (sp / plan) * 100) : sp > 0 ? 100 : 0;
        const barCls = rem < 0 ? 'danger' : pct > 80 ? 'warn' : '';
        return `
          <div class="budget-row" data-budget-row="${code}">
            <div class="budget-row-head">
              <div class="budget-row-name">${esc(label)}</div>
              <div class="budget-input-wrap">
                <input type="number" inputmode="numeric" min="0" step="50000"
                  aria-label="Dự trù ${esc(label)}" data-plan="${code}" value="${plan}">
              </div>
            </div>
            <div class="bar ${barCls}" style="margin:0;height:6px"><i data-bbar="${code}" style="width:${pct}%"></i></div>
            <div class="budget-stats">
              <span>Đã chi: <span class="spent" data-bspent="${code}">${money(sp)}</span></span>
              <span>Còn lại: <span class="rem ${rem < 0 ? 'neg' : 'pos'}" data-brem="${code}">${money(rem)}</span></span>
            </div>
          </div>`;
      })
      .join('');

    const extrasTotal = D.extras.reduce((s, x) => s + x[1], 0);
    $('#extras').innerHTML =
      D.extras
        .map(([name, val]) => `<div class="extras-row"><span>${esc(name)}</span><span class="money">${money(val)}</span></div>`)
        .join('') +
      `<div class="extras-row"><span>Tổng ước tính phát sinh</span><span class="money">${money(extrasTotal)}</span></div>`;
  }

  function updateBudgetValues() {
    for (const [code] of D.budgets) {
      const plan = num(state.plans[code]);
      const sp = spentByCat(code);
      const rem = plan - sp;
      const pct = plan ? Math.min(100, (sp / plan) * 100) : sp > 0 ? 100 : 0;
      const spEl = $(`[data-bspent="${code}"]`);
      const remEl = $(`[data-brem="${code}"]`);
      const barEl = $(`[data-bbar="${code}"]`);
      if (spEl) spEl.textContent = money(sp);
      if (remEl) {
        remEl.textContent = money(rem);
        remEl.classList.toggle('neg', rem < 0);
        remEl.classList.toggle('pos', rem >= 0);
      }
      if (barEl) {
        barEl.style.width = `${pct}%`;
        const barWrap = barEl.parentElement;
        barWrap.classList.toggle('danger', rem < 0);
        barWrap.classList.toggle('warn', rem >= 0 && pct > 80);
      }
    }
    renderMetrics();
  }

  function renderExpenseList() {
    const catMap = Object.fromEntries(D.budgets.map((b) => [b[0], b[1]]));
    if (!state.expenses.length) {
      $('#expenseList').innerHTML =
        '<div class="small" style="padding:10px 0">Chưa có khoản chi thực tế nào. Bấm <b>+ Ghi chi tiêu</b> để lưu khoản vừa thanh toán.</div>';
      return;
    }

    const sorted = [...state.expenses].reverse();
    $('#expenseList').innerHTML = sorted
      .map(
        (e) => `
        <div class="expense-item">
          <div class="expense-main">
            <div class="expense-title">${esc(e.name || 'Khoản chi chưa đặt tên')}</div>
            <div class="expense-meta">
              <span class="pill" style="padding:2px 8px;font-size:11px">${esc(catMap[e.cat] || e.cat)}</span>
              ${e.date ? `<span>📅 ${esc(e.date)}</span>` : ''}
              ${e.payer ? `<span>👤 ${esc(e.payer)}</span>` : ''}
              ${e.note ? `<span>· ${esc(e.note)}</span>` : ''}
            </div>
          </div>
          <div class="expense-right">
            <div class="expense-amount">${money(num(e.amount))}</div>
            <div class="expense-actions">
              <button type="button" class="btn tiny" data-edit-exp="${esc(e.id)}">Sửa</button>
              <button type="button" class="btn tiny danger" data-del-exp="${esc(e.id)}">Xóa</button>
            </div>
          </div>
        </div>`
      )
      .join('');
  }

  function openExpenseModal(id = null) {
    const dialog = $('#expenseDialog');
    $('#expCat').innerHTML = D.budgets.map(([c, label]) => `<option value="${c}">${esc(label)}</option>`).join('');
    const existing = id ? state.expenses.find((x) => x.id === id) : null;

    $('#expenseModalTitle').textContent = existing ? 'Chỉnh sửa khoản chi' : 'Ghi chi tiêu mới';
    $('#expId').value = existing ? existing.id : '';
    $('#expName').value = existing ? existing.name : '';
    $('#expAmount').value = existing ? num(existing.amount) || '' : '';
    $('#expDate').value = existing ? existing.date || vnDate() : vnDate();
    $('#expCat').value = existing ? existing.cat : 'extra';
    $('#expPayer').value = existing ? existing.payer : '';
    $('#expNote').value = existing ? existing.note : '';
    $('#expDeleteBtn').hidden = !existing;

    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    setTimeout(() => $('#expName').focus(), 40);
  }

  // --- Bookings & Notes ---
  function renderBookings() {
    $('#included').innerHTML = D.included.map((x) => `<li><span>${esc(x)}</span></li>`).join('');
    $('#unconfirmed').innerHTML = D.unconfirmed.map((x) => `<li><span>${esc(x)}</span></li>`).join('');
    $('#bookingFields').innerHTML = D.bookingFields
      .map(
        ([k, label]) =>
          `<label>${esc(label)}<input data-booking="${k}" value="${esc(state.bookings[k] || '')}" placeholder="Chưa điền"></label>`
      )
      .join('');
  }

  function renderNotes() {
    $('#customList').innerHTML = state.custom.length
      ? state.custom
          .map(
            (c) => `
            <div class="custom-item ${c.done ? 'done' : ''}">
              <input type="checkbox" data-custom-done="${esc(c.id)}" aria-label="Hoàn thành ${esc(c.name)}" ${c.done ? 'checked' : ''}>
              <div>
                <div class="custom-name">${esc(c.name)}</div>
                <div class="custom-meta">${[c.date, c.time, c.note].filter(Boolean).map(esc).join(' · ') || 'Không có ghi chú'}</div>
              </div>
              <button type="button" class="btn tiny danger" data-del-custom="${esc(c.id)}">Xóa</button>
            </div>`
          )
          .join('')
      : '<p class="small" style="margin:0">Chưa có hoạt động tự bổ sung nào.</p>';

    $('#journals').innerHTML = D.days
      .map(
        (d, i) => `
        <label>
          ${esc(d[0])} · ${esc(d[1])}
          <textarea data-journal="${i}" placeholder="Nhật ký, cảm nhận, quán ăn ngon…">${esc(state.journals[i] || '')}</textarea>
        </label>`
      )
      .join('');
    $('#generalNote').value = state.note;
  }

  // --- Photo Lightbox ---
  function openPlacePhoto(i) {
    const p = D.placeData[i];
    const f = D.photoData[i];
    const d = $('#photoDialog');
    $('#photoModalImage').innerHTML = photoImg(f, p[1]);
    $('#photoModalTitle').textContent = p[1];
    $('#photoModalDetail').textContent = `${p[0]} · ${p[2]} · ${p[3]}`;
    $('#photoModalCredit').textContent = f[2] + (f[3] ? ' · cần mạng; nếu offline sẽ dùng ảnh dự phòng.' : '');
    const srcBtn = $('#photoModalSource');
    srcBtn.hidden = !f[3];
    srcBtn.href = f[3] || '#';
    const mapBtn = $('#photoModalMap');
    mapBtn.hidden = false;
    mapBtn.href = mapLink(p[4]);
    if (d.showModal) d.showModal();
    else d.setAttribute('open', '');
  }

  function openRawPhoto(src, title) {
    const d = $('#photoDialog');
    $('#photoModalImage').innerHTML = `<img src="${esc(src)}" alt="${esc(title)}">`;
    $('#photoModalTitle').textContent = title;
    $('#photoModalDetail').textContent = 'Ảnh minh họa trải nghiệm trong lịch trình.';
    $('#photoModalCredit').textContent = 'Nguồn: Lu Travel brochure';
    $('#photoModalSource').hidden = true;
    $('#photoModalMap').hidden = true;
    if (d.showModal) d.showModal();
    else d.setAttribute('open', '');
  }

  // --- CSV & JSON Export/Import ---
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function csvCell(v) {
    let s = String(v ?? '');
    if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  // --- Render All ---
  function renderAll() {
    renderOverview();
    renderDayTabs();
    renderActiveDay();
    renderPlaceFilters();
    renderPlaces();
    renderChecks();
    renderBudgetCards();
    renderExpenseList();
    renderBookings();
    renderNotes();
    renderMetrics();
    save();
  }

  // --- Event Listeners ---
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      showTab(tabBtn.dataset.tab);
      return;
    }

    const dayBtn = e.target.closest('[data-day]');
    if (dayBtn) {
      pickDay(Number(dayBtn.dataset.day), true);
      return;
    }

    const rawPhotoBtn = e.target.closest('[data-raw-photo]');
    if (rawPhotoBtn) {
      e.preventDefault();
      e.stopPropagation();
      openRawPhoto(rawPhotoBtn.dataset.rawPhoto, rawPhotoBtn.dataset.rawTitle);
      return;
    }

    const photoBtn = e.target.closest('[data-photo]');
    if (photoBtn) {
      openPlacePhoto(Number(photoBtn.dataset.photo));
      return;
    }

    const cfilterBtn = e.target.closest('[data-cfilter]');
    if (cfilterBtn) {
      checkFilter = cfilterBtn.dataset.cfilter;
      $$('[data-cfilter]').forEach((b) => b.classList.toggle('active', b.dataset.cfilter === checkFilter));
      renderChecks();
      return;
    }

    const quickAmt = e.target.closest('[data-quick-amt]');
    if (quickAmt) {
      const inp = $('#expAmount');
      inp.value = num(inp.value) + Number(quickAmt.dataset.quickAmt);
      return;
    }

    const themeBtn = e.target.closest('[data-theme-choice]');
    if (themeBtn) {
      applyTheme(themeBtn.dataset.themeChoice);
      toast('Đã đổi giao diện');
      return;
    }

    const editExp = e.target.closest('[data-edit-exp]');
    if (editExp) {
      openExpenseModal(editExp.dataset.editExp);
      return;
    }

    const delExp = e.target.closest('[data-del-exp]');
    if (delExp) {
      state.expenses = state.expenses.filter((x) => x.id !== delExp.dataset.delExp);
      save();
      renderExpenseList();
      updateBudgetValues();
      toast('Đã xóa khoản chi');
      return;
    }

    const delCustom = e.target.closest('[data-del-custom]');
    if (delCustom) {
      state.custom = state.custom.filter((x) => x.id !== delCustom.dataset.delCustom);
      save();
      renderNotes();
      toast('Đã xóa hoạt động');
      return;
    }

    const delTask = e.target.closest('[data-delete-task]');
    if (delTask) {
      state.extraTasks = state.extraTasks.filter((x) => x.id !== delTask.dataset.deleteTask);
      save();
      renderChecks();
      renderMetrics();
      toast('Đã xóa việc riêng');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!['Enter', ' '].includes(e.key)) return;
    const interactive = e.target.closest('[role="button"]');
    if (interactive) {
      e.preventDefault();
      interactive.click();
    }
  });

  // In-place updates on checkbox change (zero full-DOM flicker!)
  document.addEventListener('change', (e) => {
    const t = e.target;
    const d = t.dataset;

    if (d.check !== undefined) {
      state.checks[d.check] = t.checked;
      save();
      // Sync all checkboxes matching this key (both Urgent card & Checklist tab)
      $$(`[data-check="${d.check}"]`).forEach((cb) => {
        cb.checked = t.checked;
        cb.closest('label.check')?.classList.toggle('done', t.checked);
      });
      const gi = Number(d.check.split('-')[0]);
      const g = D.groups[gi];
      if (g) {
        const done = g[1].filter((_, j) => state.checks[`${gi}-${j}`]).length;
        const cntEl = $(`[data-group-count="${gi}"]`);
        const barEl = $(`[data-group-bar="${gi}"]`);
        if (cntEl) cntEl.textContent = `${done}/${g[1].length}`;
        if (barEl) barEl.style.width = `${(done / g[1].length) * 100}%`;
      }
      if (checkFilter !== 'all') renderChecks();
      renderMetrics();
      return;
    }

    if (d.event !== undefined) {
      state.events[d.event] = t.checked;
      t.closest('.event')?.classList.toggle('done', t.checked);
      const dayItems = D.days[activeDay][5];
      const done = dayItems.filter((_, j) => state.events[`${activeDay}-${j}`]).length;
      const progText = $('#dailyProgText');
      const progBar = $('#dailyProgBar');
      if (progText) progText.textContent = `${done}/${dayItems.length} hoạt động`;
      if (progBar) progBar.style.width = `${(done / dayItems.length) * 100}%`;
      save();
      renderDayTabs();
      renderOverview();
      renderMetrics();
      return;
    }

    if (d.place !== undefined) {
      const idx = Number(d.place);
      state.places[idx] = t.checked;
      const card = t.closest('.place');
      if (card) {
        card.classList.toggle('checked', t.checked);
        const span = card.querySelector('.visit-toggle span');
        if (span) span.textContent = t.checked ? 'Đã đến' : 'Check-in';
      }
      const visited = D.placeData.filter((_, i) => state.places[i]).length;
      $('#placeProgress').textContent = `${visited}/${D.placeData.length} đã đến`;
      save();
      if (placeFilter === 'unvisited' && t.checked) renderPlaces();
      return;
    }

    if (d.extra !== undefined) {
      const item = state.extraTasks.find((x) => x.id === d.extra);
      if (item) {
        item.done = t.checked;
        t.closest('label.check')?.classList.toggle('done', t.checked);
        save();
        if (checkFilter !== 'all') renderChecks();
        renderMetrics();
      }
      return;
    }

    if (d.customDone !== undefined) {
      const item = state.custom.find((x) => x.id === d.customDone);
      if (item) {
        item.done = t.checked;
        t.closest('.custom-item')?.classList.toggle('done', t.checked);
        save();
      }
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    const d = t.dataset;

    if (d.plan !== undefined) {
      state.plans[d.plan] = num(t.value);
      save();
      updateBudgetValues();
    } else if (d.booking !== undefined) {
      state.bookings[d.booking] = t.value;
      save();
    } else if (d.journal !== undefined) {
      state.journals[d.journal] = t.value;
      $$(`[data-journal="${d.journal}"]`).forEach((x) => {
        if (x !== t) x.value = t.value;
      });
      save();
    } else if (t.id === 'generalNote') {
      state.note = t.value;
      save();
    } else if (t.id === 'placeSearch') {
      renderPlaces();
    } else if (t.id === 'checkSearch') {
      renderChecks();
    }
  });

  document.addEventListener('toggle', (e) => {
    const el = e.target;
    if (el.matches('details[data-group]') && !$('#checkSearch').value && checkFilter === 'all') {
      const idx = Number(el.dataset.group);
      if (el.open) openGroups.add(idx);
      else openGroups.delete(idx);
    }
  }, true);

  // Swipe left/right on Schedule to switch days
  let touchStartX = 0;
  let touchStartY = 0;
  $('#dayContent').addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  $('#dayContent').addEventListener('touchend', (e) => {
    if (e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (e.target.closest('.photo-strip')) return; // Don't hijack horizontal photo carousel
      if (dx < 0 && activeDay < D.days.length - 1) pickDay(activeDay + 1, false);
      else if (dx > 0 && activeDay > 0) pickDay(activeDay - 1, false);
    }
  }, { passive: true });

  // Button Bindings
  $('#themeToggle').onclick = () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  };

  $('#prevDay').onclick = () => pickDay(activeDay - 1, false);
  $('#nextDay').onclick = () => pickDay(activeDay + 1, false);
  $('#todayDay').onclick = () => pickDay(currentDayIndex(), false);
  $('#jumpToday').onclick = () => pickDay(currentDayIndex(), true);

  $('#placeFilters').onclick = (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    placeFilter = b.dataset.filter;
    renderPlaceFilters();
    renderPlaces();
  };

  $('#addTaskBtn').onclick = () => {
    const input = $('#taskName');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  // Expense Modal
  $('#openAddExpense').onclick = () => openExpenseModal(null);
  $('#quickExpense').onclick = () => {
    showTab('budget');
    openExpenseModal(null);
  };
  $('#expenseClose').onclick = () => $('#expenseDialog').close();
  $('#expCancelBtn').onclick = () => $('#expenseDialog').close();
  $('#expenseDialog').onclick = (e) => { if (e.target === $('#expenseDialog')) $('#expenseDialog').close(); };

  $('#expenseForm').onsubmit = (e) => {
    e.preventDefault();
    const id = $('#expId').value;
    const payload = {
      id: id || uid(),
      date: $('#expDate').value,
      name: $('#expName').value.trim(),
      cat: $('#expCat').value,
      amount: num($('#expAmount').value),
      payer: $('#expPayer').value.trim(),
      note: $('#expNote').value.trim()
    };
    if (!payload.name) return;
    if (id) {
      const idx = state.expenses.findIndex((x) => x.id === id);
      if (idx >= 0) state.expenses[idx] = payload;
      toast('Đã cập nhật khoản chi');
    } else {
      state.expenses.push(payload);
      toast('Đã ghi khoản chi mới');
    }
    save();
    renderExpenseList();
    updateBudgetValues();
    $('#expenseDialog').close();
  };

  $('#expDeleteBtn').onclick = () => {
    const id = $('#expId').value;
    if (!id) return;
    state.expenses = state.expenses.filter((x) => x.id !== id);
    save();
    renderExpenseList();
    updateBudgetValues();
    $('#expenseDialog').close();
    toast('Đã xóa khoản chi');
  };

  // Custom Activity Modal
  $('#openAddCustom').onclick = () => {
    $('#cusName').value = '';
    $('#cusDate').value = vnDate();
    $('#cusTime').value = '';
    $('#cusNote').value = '';
    const d = $('#customDialog');
    if (d.showModal) d.showModal();
    else d.setAttribute('open', '');
    setTimeout(() => $('#cusName').focus(), 40);
  };
  $('#customClose').onclick = () => $('#customDialog').close();
  $('#customCancelBtn').onclick = () => $('#customDialog').close();
  $('#customDialog').onclick = (e) => { if (e.target === $('#customDialog')) $('#customDialog').close(); };

  $('#customForm').onsubmit = (e) => {
    e.preventDefault();
    const name = $('#cusName').value.trim();
    if (!name) return;
    state.custom.push({
      id: uid(),
      date: $('#cusDate').value,
      time: $('#cusTime').value,
      name,
      note: $('#cusNote').value.trim(),
      done: false
    });
    save();
    renderNotes();
    $('#customDialog').close();
    toast('Đã thêm hoạt động');
  };

  // Photo Dialog
  $('#photoClose').onclick = () => $('#photoDialog').close();
  $('#photoDialog').onclick = (e) => { if (e.target === $('#photoDialog')) $('#photoDialog').close(); };

  // Backup / Restore / CSV / Print / Reset
  $('#backup').onclick = () => {
    download('ha-giang-2026-backup.json', JSON.stringify(state, null, 2), 'application/json');
    toast('Đã tải xuống file sao lưu JSON');
  };
  $('#restore').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = normalize(JSON.parse(await file.text()));
      if (confirm('Thay toàn bộ dữ liệu hiện tại bằng bản sao lưu này?')) {
        state = parsed;
        renderAll();
        toast('Đã khôi phục dữ liệu thành công');
      }
    } catch (err) {
      toast('File JSON không hợp lệ.');
    } finally {
      e.target.value = '';
    }
  };
  $('#reset').onclick = () => {
    if (confirm('Xóa toàn bộ checklist, chi phí và ghi chú trên thiết bị này?')) {
      state = freshState();
      renderAll();
      toast('Đã khôi phục dữ liệu mẫu ban đầu');
    }
  };
  $('#print').onclick = () => window.print();

  $('#csv').onclick = () => {
    const catMap = Object.fromEntries(D.budgets.map((b) => [b[0], b[1]]));
    const rows = [
      ['Ngày', 'Nội dung', 'Nhóm', 'Số tiền VND', 'Người trả', 'Ghi chú'],
      ...state.expenses.map((x) => [x.date, x.name, catMap[x.cat] || x.cat, num(x.amount), x.payer, x.note])
    ];
    download(
      'ha-giang-chi-phi.csv',
      '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'),
      'text/csv;charset=utf-8'
    );
    toast('Đã xuất file CSV chi phí');
  };

  // Hash Navigation
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

  // System Dark Mode Listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemeChoice() === 'auto') applyTheme('auto');
  });

  // PWA Install & Service Worker
  let installPrompt = null;
  const installBtn = $('#installApp');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.onclick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    installPrompt = null;
    installBtn.hidden = true;
  };
  window.addEventListener('appinstalled', () => {
    installBtn.hidden = true;
    toast('Đã cài ứng dụng vào màn hình chính');
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Có phiên bản mới — tải lại trang để cập nhật');
            }
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        $('#pwaStatus').textContent = '✓ Đã sẵn sàng dùng offline trên điện thoại (lịch trình, checklist, chi tiêu & ảnh nội bộ).';
      })
      .catch(() => {
        $('#pwaStatus').textContent = 'Chưa kích hoạt được chế độ offline. Hãy tải lại khi có mạng.';
      });
  } else {
    $('#pwaStatus').textContent = 'Mở từ đường dẫn GitHub Pages (HTTPS) để kích hoạt cài ứng dụng và dùng offline.';
  }

  // --- Bootstrap ---
  initNav();
  applyTheme(getThemeChoice());
  renderRouteStatic();
  if (window.matchMedia('(max-width: 720px)').matches) {
    $('#mapDetail').open = false;
  }
  renderAll();
  showTab(location.hash.slice(1) || 'overview');
})();
