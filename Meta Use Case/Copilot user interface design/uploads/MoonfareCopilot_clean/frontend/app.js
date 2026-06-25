"use strict";

// =================== STATE ===================
const state = {
  page: 1,
  // Default cohort matches Dr. Steffen Pauls's profile (53, €25M, DACH, Exec/Owner, Innovation & AI Alpha)
  cohort: { age:[], wealth:[], risk:[], region:[], prof:[], marital:[], kids:[] },   // no default locks → peers = whole platform until filtered
  perf: 'all',
  follow: 'peer',

  /* Page-1 toggles */
  stratView: 'you',          // 'you' | 'peer' | 'platform' | 'model'
  fillCompareAll: true,      // always show all 4 fill-rate rows

  /* Page-1 unified comparison (single selector replaces endowment/model split) */
  /* Values: 'peer' | 'platform' | 'model' | 'Harvard' | 'Yale' | 'Princeton' | 'Aggregate' */
  benchPick: 'peer',
  /* When a Z-chart bar is clicked, we focus the right pie on that strategy.
     null = full pie; otherwise = strategy name to highlight. */
  focusedStrategy: null,

  /* Region/Format/Sector page toggles */
  zCompare: 'peer',

  /* Strategy deep-dive */
  pickedStrategy: 'Large-Cap Buyout',

  profile: { targetPct: 35, risk: 'innovation_ai_alpha', horizon: '10y+' },

  /* Page 9 — selected funds for portfolio recomposition.
     Shape: [{ fund_id, name, capital_eur }] */
  selectedFunds: [],
  scenario: null,            // last /api/scenario response
  _modalFund: null,          // fund currently shown in the select-fund modal
  _modalCapital: 0,          // capital amount being chosen in the modal (€)
};

/* Charts registry */
const charts = {};
function destroyAll() { for (const k of Object.keys(charts)) { try { charts[k]?.destroy(); } catch(_){}; delete charts[k]; }}

/* DOM helpers */
function $(id) { return document.getElementById(id); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Tiny safe markdown post-pass — runs AFTER escapeHtml so injected HTML stays neutered.
// Handles: **bold**, *italic*, `code`, dash bullets at start of line, and gives the
// "Your next move:" line a distinct sales-CTA class so it pops in the chat bubble.
function renderChatMarkdown(s) {
  let html = escapeHtml(s);
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^\*])\*([^*\n]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');
  html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  // Convert sequences of `- ` lines into a <ul>. Process line-by-line.
  const lines = html.split('\n');
  const out = [];
  let listOpen = false;
  for (const line of lines) {
    const m = line.match(/^\s*[-•]\s+(.*)$/);
    if (m) {
      if (!listOpen) { out.push('<ul class="chat-list">'); listOpen = true; }
      out.push(`<li>${m[1]}</li>`);
    } else {
      if (listOpen) { out.push('</ul>'); listOpen = false; }
      // Highlight the sales CTA line.
      if (/^Your next move:/i.test(line.trim())) {
        out.push(`<div class="chat-cta">${line.trim()}</div>`);
      } else {
        out.push(line);
      }
    }
  }
  if (listOpen) out.push('</ul>');
  return out.join('\n').replace(/\n/g, '<br>');
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('show'), 1800); }

const COL = {
  ink: '#0E0E0E', blue: '#2C2DFE', blue2: '#5B5CFF', indigo: '#1417C2',
  mint: '#2D8F6F', cream: '#F4EFE2', warm: '#FAF6EC', line: '#E5E2DC',
  peer: '#7A6A55', platform: '#B5A98F', goldman: '#3E5A5C',
  treemap: ['#1417C2','#2C2DFE','#5B5CFF','#8C8DFF','#B7B8FF','#A8BFCB','#7AB89E','#2D8F6F','#1F6F4E'],
  series:  ['#2C2DFE','#5B5CFF','#1417C2','#8C8DFF','#3E5A5C','#2D8F6F','#7AB89E','#B5A98F','#7A6A55']
};

/* ===== SHARED CATEGORY COLOR MAPS =====
   Used by BOTH the pie/donut and the Z-chart on each page so the same category
   has the same color across the page. Hand-picked for high contrast (no two
   adjacent buckets are similar). Falls back to COL.series by index. */
const CAT_COLORS = {
  strategy: {
    'Large-Cap Buyout':         '#1417C2', // deep indigo
    'Mid-Cap Buyout':           '#2C2DFE', // brand blue
    'Small-Cap Buyout':         '#5B5CFF', // bright blue
    'Infrastructure':           '#2D8F6F', // forest green
    'Growth / Tech':            '#E8732C', // burnt orange (high contrast)
    'Private Credit':           '#7A6A55', // warm brown
    'Secondaries':              '#7AB89E', // sage
    'Direct & Co-Investments':  '#3E5A5C', // deep teal
    'AI':                       '#C8392F', // crimson
    'Hedge / Other':            '#B5A98F', // muted clay
  },
  region: {
    'US':       '#1417C2', 'North America': '#1417C2',
    'Europe':   '#2D8F6F',
    'Asia':     '#E8732C',
    'RoW':      '#7A6A55', 'Rest of World': '#7A6A55',
  },
  format: {
    'Primary':           '#1417C2',
    'Secondary':         '#2D8F6F',
    'Direct/Co-Invest':  '#E8732C',
    'Fund of Fund':      '#7A6A55',
    'Evergreen':         '#5B5CFF',
    'Semi-liquid':       '#5B5CFF', // back-compat for old key
  },
  sector: {
    'Tech':        '#1417C2',
    'AI':          '#C8392F',
    'Energy':      '#2D8F6F',
    'Industrials': '#7A6A55',
    'Consumer':    '#E8732C',
    'Financial':   '#3E5A5C',
    'Defense':     '#0E0E0E',
    'Healthcare':  '#7AB89E',
    'Other':       '#B5A98F',
  },
};

function colorsFor(category, labels) {
  const map = CAT_COLORS[category] || {};
  return labels.map((l, i) => map[l] || COL.series[i % COL.series.length]);
}

Chart.defaults.font.family = "Inter, system-ui, sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.color = '#1a1a1a';
Chart.defaults.borderColor = '#E5E2DC';
Chart.defaults.plugins.legend.position = 'right';
Chart.defaults.plugins.legend.labels.boxWidth = 14;
Chart.defaults.plugins.legend.labels.boxHeight = 14;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.legend.labels.font = { size: 13, weight: '500' };
// Larger tick + scale title fonts for all bar/Z-charts
Chart.defaults.scale.ticks.font = { size: 13 };
Chart.defaults.scale.title.font = { size: 13, weight: '600' };
Chart.defaults.plugins.tooltip.padding = 9;
Chart.defaults.plugins.tooltip.backgroundColor = '#0E0E0E';
Chart.defaults.plugins.tooltip.titleColor = '#fff';
Chart.defaults.plugins.tooltip.bodyColor = '#fff';

/* Inline-labels plugin:
   - Bars: try CENTRE first; if too short for the label, render just OUTSIDE the bar tip
     in dark text on the chart background (Ben's "if no middle, then end").
   - Pies/donuts: slice centroid. */
const InlineLabels = {
  id: 'inlineLabels',
  afterDatasetsDraw(chart, _a, pluginOpts) {
    const opts = chart.options.plugins?.inlineLabels || pluginOpts || {};
    if (!opts.enabled) return;
    const ctx = chart.ctx; ctx.save();
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;   // round halo joins so the white outline doesn't spike across glyphs like "%"
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      const isBar = meta.type === 'bar';
      const isPie = meta.type === 'doughnut' || meta.type === 'pie';
      const horiz = isBar && (meta.iScale?.axis === 'y' || chart.options.indexAxis === 'y');
      if (isPie) { drawPieLabels(chart, ctx, ds, meta, opts); return; }
      meta.data.forEach((el, idx) => {
        const v = ds.data[idx];
        if (v == null) return;
        // Chart.js stringifies function options during cloning, so the formatter is read from the
        // chart instance ($ilfmt), not from options.plugins (where it would be lost).
        const fmtFn = (typeof chart.$ilfmt === 'function') ? chart.$ilfmt
                    : (typeof opts.fmt === 'function' ? opts.fmt : (x => x));
        const text = fmtFn(v, idx, ds, chart);
        if (!text && text !== 0) return;
        if (text === '' ) return;
        const fontSize = opts.fontSize || 12;
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        const textW = ctx.measureText(text).width;
        let x, y, mode = 'inside';
        if (isBar) {
          if (horiz) {
            const span = Math.abs(el.x - el.base);
            if (span >= textW + 8) {
              x = (el.base + el.x) / 2; y = el.y;
            } else {
              const sign = el.x >= el.base ? 1 : -1;
              x = el.x + sign * (textW / 2 + 6);
              y = el.y;
              mode = 'outside';
            }
          } else {
            const span = Math.abs(el.base - el.y);
            if (span >= fontSize + 4) {
              x = el.x; y = (el.base + el.y) / 2;
            } else {
              const sign = el.y < el.base ? -1 : 1;
              x = el.x;
              y = el.y + sign * (fontSize / 2 + 4);
              mode = 'outside';
            }
          }
        } else {
          // doughnut/pie: label big slices INSIDE only. Small slices get no on-chart label and no
          // leader line (those ran off-screen) — the legend already lists every value + %.
          const c = el.getCenterPoint ? el.getCenterPoint() : (el.tooltipPosition ? el.tooltipPosition() : { x: el.x, y: el.y });
          x = c.x; y = c.y;
        }
        // color/outline can be a string, OR an object keyed by dataset label
        // (e.g. {Filled:'#fff', Remaining:'#0E0E0E'}). Chart.js's options-merge
        // would CALL any function during cloning, so we use plain objects to
        // express per-dataset overrides.
        const pick = (v) => {
          if (v == null) return undefined;
          if (typeof v === 'string') return v;
          if (typeof v === 'object') return v[ds.label] || v._default || undefined;
          return undefined;
        };
        ctx.fillStyle = mode === 'outside' ? (pick(opts.outsideColor) || '#0E0E0E') : (pick(opts.color) || '#fff');
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const outline = pick(opts.outline);
        if (mode === 'inside' && outline) {
          ctx.lineWidth = 3; ctx.strokeStyle = outline; ctx.strokeText(text, x, y);
        }
        ctx.fillText(text, x, y);
      });
    });
    ctx.restore();
  }
};
// Doughnut/pie labels: big slices get the % INSIDE; small slices get the % OUTSIDE on a leader
// line, de-collided vertically per side so no two labels overlap. Slice NAMES live in the legend.
function drawPieLabels(chart, ctx, ds, meta, opts) {
  const fs = opts.fontSize || 12;
  const total = ds.data.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0) || 1;
  const pts = meta.data.map((el, idx) => {
    const v = ds.data[idx];
    const p = el.getProps(['startAngle', 'endAngle', 'outerRadius', 'innerRadius', 'x', 'y'], true);
    return { v, idx, p, frac: (typeof v === 'number' ? v : 0) / total, mid: (p.startAngle + p.endAngle) / 2 };
  }).filter(it => typeof it.v === 'number' && it.v > 0.04);
  if (!pts.length) return;
  const cx = pts[0].p.x, cy = pts[0].p.y, R = pts[0].p.outerRadius;
  const pct = v => (+v).toFixed(1) + '%';
  ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
  // INSIDE labels for slices with enough arc to fit the text
  const outside = [];
  pts.forEach(it => {
    const arcLen = (it.p.endAngle - it.p.startAngle) * R;          // chord room at the rim
    if (it.frac >= 0.06 && arcLen >= fs + 8) {
      const rr = (it.p.innerRadius + it.p.outerRadius) / 2;
      const x = cx + Math.cos(it.mid) * rr, y = cy + Math.sin(it.mid) * rr;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(pct(it.v), x, y);
      ctx.fillStyle = '#fff'; ctx.fillText(pct(it.v), x, y);
    } else {
      outside.push(it);
    }
  });
  // OUTSIDE labels: leader line + text, stacked per side to avoid overlap
  const gap = fs + 4, labelGap = 16;
  ['right', 'left'].forEach(side => {
    const dir = side === 'right' ? 1 : -1;
    const arr = outside.filter(o => (Math.cos(o.mid) >= 0) === (side === 'right'))
      .map(o => ({ ...o, ay: cy + Math.sin(o.mid) * (R + 6) }))
      .sort((a, b) => a.ay - b.ay);
    // push down so neighbours are at least `gap` apart
    for (let i = 1; i < arr.length; i++) if (arr[i].ay < arr[i - 1].ay + gap) arr[i].ay = arr[i - 1].ay + gap;
    const labelX = cx + dir * (R + labelGap + 6);
    ctx.textAlign = side === 'right' ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    arr.forEach(o => {
      const sx = cx + Math.cos(o.mid) * R, sy = cy + Math.sin(o.mid) * R;        // on the arc
      const bx = cx + dir * (R + labelGap), by = o.ay;                            // elbow
      ctx.strokeStyle = '#B7B2A8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(bx, by); ctx.lineTo(labelX, by); ctx.stroke();
      ctx.fillStyle = '#0E0E0E'; ctx.fillText(pct(o.v), labelX + dir * 3, by);
    });
  });
}
Chart.register(InlineLabels);

// =================== API CLIENT ===================
async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : path;
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}
const API = {
  riskProfiles: () => api('/api/risk_profiles'),
  endowments:   () => api('/api/endowments'),
  you:          () => api('/api/portfolio/you'),
  platform:     () => api('/api/portfolio/platform'),
  topDecile:    () => api('/api/portfolio/top_decile'),
  cohort:       (filters) => api('/api/cohort', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(filters) }),
  funds:        (strategy) => api('/api/funds' + (strategy ? `?strategy=${encodeURIComponent(strategy)}`:'')),
  chat:         (q, ctx) => api('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question: q, context: ctx}) }),
  refresh:      () => api('/api/refresh', { method:'POST' }),
  trackRecords: () => api('/api/fund_track_records'),
  aiLookthrough:() => api('/api/synth/ai_lookthrough'),
  followerAlert:(g) => api('/api/synth/follower_alert?group=' + encodeURIComponent(g)),
  recommendations:() => api('/api/recommendations'),
  scenario:     (selected) => api('/api/scenario', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({selected}) }),
};
const logoUrl = (slug) => `/api/logo/${encodeURIComponent(slug || 'Fund')}`;
const heroUrl = (slug) => `/api/hero/${encodeURIComponent(slug || 'diversifier')}`;

// =================== APP CACHE ===================
const cache = { you: null, risk: null, endow: null, platform: null, top: null, cohort: null, openFunds: null };
// Bridge helpers so an OFF-SCREEN iframe instance can be driven by the parent for background PDF
// builds. Top-level const `cache`/`state` are NOT on window (lexical scope), so expose them here.
window.__pdfReady = () => !!(cache && cache.you);
window.__pdfApplyProfile = (p) => { try { Object.assign(state.profile, p); } catch(e){} };
async function bootstrap() {
  const [rp, e, y, p, t, c, f, ai] = await Promise.all([
    API.riskProfiles(), API.endowments(), API.you(), API.platform(), API.topDecile(),
    API.cohort(state.cohort), API.funds(), API.aiLookthrough()
  ]);
  cache.risk = rp.profiles;
  cache.endow = e.endowments;
  cache.you = y;
  // Drive the UI from the REAL logged-in investor (target % is modelled; risk class is assigned).
  if (y?.profile) {
    if (y.profile.target_pm_pct != null) state.profile.targetPct = y.profile.target_pm_pct;
    if (y.profile.risk_profile_id) state.profile.risk = y.profile.risk_profile_id;
    // Sync the hardcoded top-bar chips to the REAL bound investor (name stays masked).
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = v; };
    set('chip-prof', y.profile.profession);
    set('chip-age', y.profile.age);
    if (y.profile.wealth_eur != null) set('chip-wealth', '€' + Math.round(y.profile.wealth_eur/1e6) + 'M Investable');
    const tp = document.getElementById('targetPct'), tpv = document.getElementById('targetPctVal');
    if (tp && y.profile.target_pm_pct != null) tp.value = y.profile.target_pm_pct;
    if (tpv && y.profile.target_pm_pct != null) tpv.innerHTML = y.profile.target_pm_pct + '%<span style="font-weight:400;color:var(--mf-muted);font-size:10px;"> modelled</span>';
    // Default = NO filters (peer group = the whole platform). The user adds filters explicitly,
    // so each dimension partitions cleanly (e.g. the four age buckets sum to the platform total)
    // and nothing is silently pre-locked to the investor's profile.
    state.cohort = { age: [], wealth: [], risk: [], region: [], prof: [], marital: [], kids: [] };
  }
  cache.platform = p;
  cache.top = t;
  // Re-fetch the peer group aligned to the real investor's profile (set above); falls back to the
  // initial fetch if alignment produced nothing.
  cache.cohort = await API.cohort(state.cohort) || c;
  cache.openFunds = f.funds;
  cache.aiLook = ai;

  // Populate risk select with the 5 Private-Markets risk profiles from the Word doc
  const sel = $('risk');
  sel.innerHTML = cache.risk.map(r =>
    `<option value="${r.id}" ${r.id===state.profile.risk?'selected':''}>${escapeHtml(r.short_name)}</option>`
  ).join('');

  buildCohortPanel();
  buildPageNav();
  updateCohortBadge();
}

function updateCohortBadge() {
  const c = cache.cohort || { n: 0, total: 5500 };
  const sec = $('cohortInner');
  let m = sec.querySelector('#cohortMeta');
  if (!m) {
    m = document.createElement('div'); m.id = 'cohortMeta';
    m.className = 'txt-xs muted'; m.style.marginTop = '12px';
    m.style.paddingTop = '10px'; m.style.borderTop = '1px solid var(--mf-warm)';
    sec.appendChild(m);
  }
  const relaxNote = (c.relaxed_dims && c.relaxed_dims.length)
    ? ` <span class="muted">· relaxed: ${c.relaxed_dims.join(', ')}</span>`
    : '';
  m.innerHTML = `Peers: <b class="brand">n = ${c.n.toLocaleString()}</b> · of <b>${(c.total||5500).toLocaleString()}</b> total${relaxNote}`;
  $('blockOverlay').style.display = c.below_floor ? 'flex' : 'none';
}

// =================== COHORT PANEL ===================
function buildCohortPanel() {
  const html = `
    <details open class="section"><summary>Age bucket<span class="arrow">▾</span></summary>
      ${chips('age', ['20-35','35-50','50-65','65+'])}
    </details>
    <details class="section"><summary>Family situation <span class="txt-xs muted">(optional)</span><span class="arrow">▾</span></summary>
      ${chips('marital', ['Married','Single','Divorced','Widowed'])}
      <div style="height:6px"></div>
      ${chips('kids', ['None','Teen','Adult'])}
    </details>
    <details class="section"><summary>Wealth<span class="arrow">▾</span></summary>
      ${chips('wealth', ['1-5M','5-25M','25-100M','100M+'])}
    </details>
    <details class="section"><summary>Risk appetite <span class="txt-xs muted">(PM)</span><span class="arrow">▾</span></summary>
      ${cache.risk.map(r => `<button class="chip ${state.cohort.risk.includes(r.id)?'active':''}" data-grp="risk" data-val="${r.id}" onclick="toggleChip(this)" title="${escapeHtml(r.goal||'')}">${escapeHtml(r.short_name)}</button>`).join(' ')}
    </details>
    <details class="section"><summary>Region <span class="txt-xs muted">(multi)</span><span class="arrow">▾</span></summary>
      ${chips('region', ['All','DACH','UK','N-Europe','S-Europe','Middle East','US/CA','Asia','RoW'])}
    </details>
    <details class="section"><summary>Profession<span class="arrow">▾</span></summary>
      ${chips('prof', ['Consulting','Eng/Tech','Exec/Owner','Financial Services','Investor/PE','Legal','Medical','Family Office','Pro Services','Other'])}
    </details>
    <details class="section"><summary>Performance benchmark<span class="arrow">▾</span></summary>
      <div class="pill">
        <button class="${state.perf==='all'?'active':''}" data-perf="all" onclick="state.perf='all'; pillActive(this); if(state.page===6)softPerf()">Peers</button>
        <button class="${state.perf==='top10'?'active':''}" data-perf="top10" onclick="state.perf='top10'; pillActive(this); if(state.page===6)softPerf()">Top 10%</button>
      </div>
    </details>
    <details class="section"><summary>Follow<span class="arrow">▾</span></summary>
      <div class="pill">
        <button class="${state.follow==='peer'?'active':''}" onclick="setFollow('peer', this)">Peer avg</button>
        <button class="${state.follow==='all' ?'active':''}" onclick="setFollow('all',  this)">All</button>
        <button class="${state.follow==='top' ?'active':''}" onclick="setFollow('top',  this)">Top 10%</button>
      </div>
    </details>`;
  $('cohortInner').innerHTML = html;
}
function chips(grp, values) {
  return `<div class="flex wrap gap-1" style="margin-top: 6px;">${values.map(v =>
    `<button class="chip ${state.cohort[grp]?.includes(v)?'active':''}" data-grp="${grp}" data-val="${v}" onclick="toggleChip(this)">${escapeHtml(v)}</button>`
  ).join('')}</div>`;
}
const SINGLE_SELECT = new Set(['age', 'risk']);   // radio-style: one at a time
async function toggleChip(el) {
  const grp = el.dataset.grp, val = el.dataset.val;
  if (!state.cohort[grp]) state.cohort[grp] = [];
  if (SINGLE_SELECT.has(grp)) {
    // radio behaviour: clicking the active one clears it; otherwise it replaces the selection
    const wasActive = state.cohort[grp].includes(val);
    document.querySelectorAll(`.chip[data-grp="${grp}"]`).forEach(c => c.classList.remove('active'));
    state.cohort[grp] = wasActive ? [] : [val];
    if (!wasActive) el.classList.add('active');
  } else if (grp === 'region' && val === 'All') {
    document.querySelectorAll(`.chip[data-grp="region"]`).forEach(c => c.classList.remove('active'));
    el.classList.add('active');           // highlight the All chip itself (was missing)
    state.cohort.region = ['All'];
  } else {
    if (grp === 'region' && state.cohort.region.includes('All')) {
      state.cohort.region = [];
      document.querySelectorAll(`.chip[data-grp="region"]`).forEach(c => c.classList.remove('active'));
    }
    const i = state.cohort[grp].indexOf(val);
    if (i >= 0) { state.cohort[grp].splice(i,1); el.classList.remove('active'); }
    else        { state.cohort[grp].push(val);    el.classList.add('active'); }
  }
  cache.cohort = await API.cohort(state.cohort);
  updateCohortBadge(); softCohort();
}
async function loosenCohort() {
  for (const d of ['risk','prof','region','wealth','marital','kids','age']) {
    if ((state.cohort[d] || []).length > 1) { state.cohort[d].pop(); break; }
    if ((state.cohort[d] || []).length === 1) { state.cohort[d] = []; break; }
  }
  buildCohortPanel();
  cache.cohort = await API.cohort(state.cohort);
  updateCohortBadge(); softCohort();
}
function setPerf(p) {
  // Don't rebuild the whole sidebar (that collapses the user's expanded filter sections).
  // Just update the active button state in place + re-render the page that uses it.
  state.perf = p;
  document.querySelectorAll(`[data-perf]`).forEach(b => b.classList.toggle('active', b.dataset.perf === p));
  if (state.page === 6) softPerf(); else render();
}
function setFollow(f, btn) {
  state.follow = f;
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (state.page === 9) render();
}
function toggleCohort() {
  const p = $('cohortPanel'); p.classList.toggle('collapsed');
  $('collapseBtn').textContent = p.classList.contains('collapsed') ? '›' : '‹';
}

// =================== PAGES ===================
const PAGES = [
  { id: 1, label: '1 · Overview',           render: renderOverview },
  { id: 2, label: '2 · Region',             render: renderRegion },
  { id: 3, label: '3 · Format',             render: renderFormat },
  { id: 4, label: '4 · Strategy deep-dive', render: renderStrategy },
  { id: 5, label: '5 · Sector tree-map',    render: renderSector },
  { id: 6, label: '6 · Performance',        render: renderPerformance },
  { id: 7, label: '7 · Vintage',            render: renderVintage },
  { id: 8, label: '8 · Follower',           render: renderFollower },
  { id: 9, label: '9 · What\'s next',       render: renderWhatsNext }
];
function buildPageNav() {
  $('pageNav').innerHTML = PAGES.map(p =>
    `<button class="navbtn ${state.page===p.id?'active':''}" data-page="${p.id}" onclick="goPage(${p.id})">${escapeHtml(p.label)}</button>`
  ).join('');
}
function goPage(n) {
  state.page = n;
  document.querySelectorAll('.navbtn[data-page]').forEach(b => b.classList.toggle('active', +b.dataset.page === n));
  render();
}
function setTitle(eyebrow, title, sub) {
  $('pageEyebrow').textContent = eyebrow;
  $('pageTitle').textContent = title;
  $('pageSub').textContent = sub || '';
}
function gridClass(name) {
  const g = $('grid');
  g.className = 'grid ' + name;
  g.style.gridTemplateRows = '';   // clear any per-page inline override (e.g. sector page) so it doesn't leak
}
function render() {
  destroyAll();
  $('grid').innerHTML = '';
  // AI banner only on Page 1 (Overview)
  const aiBanner = document.getElementById('aiBanner');
  if (aiBanner) aiBanner.remove();
  PAGES.find(p => p.id === state.page)?.render();
}

function card(id, title, sub, desc, headerExtraHtml = '') {
  return `<div class="card" id="${id}">
    <div class="flex jc-b ai-c">
      <h3 class="h3">${escapeHtml(title)}</h3>
      <div class="flex ai-c gap-2">${headerExtraHtml}<div class="txt-xs muted">${escapeHtml(sub||'')}</div></div>
    </div>
    ${desc ? `<div class="card-sub">${escapeHtml(desc)}</div>` : ''}
    <div class="chartwrap"><canvas id="${id}_c"></canvas></div>
  </div>`;
}
function cardHtml(id, title, sub, desc, innerHtml, headerExtraHtml = '') {
  return `<div class="card" id="${id}">
    <div class="flex jc-b ai-c">
      <h3 class="h3">${escapeHtml(title)}</h3>
      <div class="flex ai-c gap-2">${headerExtraHtml}<div class="txt-xs muted">${escapeHtml(sub||'')}</div></div>
    </div>
    ${desc ? `<div class="card-sub">${escapeHtml(desc)}</div>` : ''}
    <div class="chartwrap" id="${id}_wrap">${innerHtml}</div>
  </div>`;
}

// =================== CHART BUILDERS ===================
// Shorten long bucket names for chart legends so they don't overflow / wrap to a 2nd line.
const _SHORT_LABEL = {
  "Direct & Co-Investments": "Direct & Co-Invest",
  "Large-Cap Buyout": "Large-Cap BO",
  "Mid-Cap Buyout": "Mid-Cap BO",
  "Small-Cap Buyout": "Small-Cap BO",
};
function shortLabel(l) { return _SHORT_LABEL[l] || l; }
function donut(canvasId, dataObj, opts = {}) {
  const labels = Object.keys(dataObj), values = Object.values(dataObj);
  const colors = opts.colors
    || (opts.category ? colorsFor(opts.category, labels)
                      : labels.map((_,i) => COL.series[i % COL.series.length]));
  const chart = new Chart($(canvasId), {
    type: 'doughnut',
    data: { labels, datasets: [{
      data: values, backgroundColor: colors,
      borderColor: '#fff', borderWidth: 2,
      offset: opts.focusedIndex != null ? labels.map((_, i) => i === opts.focusedIndex ? 14 : 0) : 0,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false, cutout: opts.cutout || '50%',
      // reserve horizontal room so the outside small-slice leader labels are not clipped
      layout: { padding: opts.tinyLegend ? 2 : { left: 46, right: 46, top: 6, bottom: 6 } },
      onClick: (_evt, els) => { if (els[0] && opts.onSliceClick) opts.onSliceClick(labels[els[0].index], els[0].index); },
      plugins: {
        legend: opts.tinyLegend
          ? { display: false }
          : { position: opts.legendPos || 'bottom',
              labels: { boxWidth: 12, padding: 10, font: { size: 12, weight: '500' },
                        generateLabels: (ch) => {
                          const data = ch.data;
                          return data.labels.map((l, i) => ({
                            text: `${shortLabel(l)} · ${(+data.datasets[0].data[i]).toFixed(1)}%`,
                            fillStyle: data.datasets[0].backgroundColor[i],
                            strokeStyle: data.datasets[0].backgroundColor[i],
                            index: i,
                          }));
                        } } },
        tooltip: { callbacks: { label: c => `${c.label}: ${(+c.parsed).toFixed(1)}%` } },
        inlineLabels: { enabled: true, color: '#0E0E0E', outline: 'rgba(255,255,255,0.92)',
          outsideColor: '#0E0E0E', fontSize: opts.tinyLegend ? 10 : 13,
          // Label only slices big enough to fit the number INSIDE. Small slices are covered by the
          // legend (which lists every value + %), so we don't draw colliding outside leader lines.
          fmt: v => (v == null || typeof v === 'object' || +v < 5) ? '' : (+v).toFixed(1) + '%' }
      }
    }
  });
  // attach the real formatter to the instance (Chart.js strips function options)
  chart.$ilfmt = v => (v == null || typeof v === 'object' || +v < 5) ? '' : (+v).toFixed(1) + '%';
  return chart;
}
function zChartHoriz(canvasId, labels, deltas, onClickItem, opts = {}) {
  // If a category map is supplied (e.g. category:'strategy'), bars use that
  // map's colors so the Z-chart matches the pie on the same page. Negative
  // bars are drawn in ink so positive/negative direction is still readable.
  // #fix colour-match: when a category map is supplied, BOTH signs use the category colour
  // so a slice's colour in the pie == its bar colour in the Z-chart (sign is shown by the
  // bar's side of the zero line + the +/- label, not by colour). Without a category, keep
  // blue/ink by sign.
  const catColors = opts.category ? colorsFor(opts.category, labels) : null;
  const bg = deltas.map((d, i) => {
    if (catColors) return catColors[i];
    return d >= 0 ? COL.blue : COL.ink;
  });
  const zfmt = v => (v == null || typeof v === 'object') ? '' : (Math.abs(v) >= 0.05 ? (v>=0?'+':'') + Number(v).toFixed(1) : '');
  const chart = new Chart($(canvasId), {
    type: 'bar',
    data: { labels, datasets: [{
      data: deltas.map(d => Math.round(d * 10) / 10),                   // 1dp default
      backgroundColor: bg,
      borderRadius: 4,
      barThickness: 'flex',
      maxBarThickness: 80,
      categoryPercentage: 1.0,
      barPercentage: 0.9
    }]},
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      onClick: (_evt, els) => { if (els[0] && onClickItem) onClickItem(labels[els[0].index]); },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => (c.parsed.x >= 0 ? '+' : '') + c.parsed.x.toFixed(1) + ' ppt' } },
        inlineLabels: { enabled: true, color: '#0E0E0E', outline: 'rgba(255,255,255,0.92)', fontSize: 14,
          outsideColor: '#0E0E0E',
          fmt: zfmt }
      },
      scales: {
        x: { suggestedMin: -25, suggestedMax: 25,
             grid: { color: ctx => ctx.tick.value === 0 ? '#0E0E0E' : '#E5E2DC' },
             ticks: { font: { size: 13 }, callback: v => (v >= 0 ? '+' : '') + v } },
        y: { grid: { display: false }, ticks: { font: { size: 14, weight: '500' } } }
      }
    }
  });
  chart.$ilfmt = zfmt;
  return chart;
}
function vBars(canvasId, labels, datasetsObjs, fmt) {
  const safeFmt = v => (v == null || typeof v === 'object') ? '' : fmt(v);
  const chart = new Chart($(canvasId), {
    type: 'bar',
    data: { labels, datasets: datasetsObjs.map(d => ({ ...d, borderRadius: 4, barThickness: 48, maxBarThickness: 64 })) },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: datasetsObjs.length > 1, position: 'top', labels: { boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + safeFmt(c.parsed.y) } },
        inlineLabels: { enabled: true, color: '#0E0E0E', outline: 'rgba(255,255,255,0.92)', fontSize: 13, fmt: v => safeFmt(v) }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });
  chart.$ilfmt = safeFmt;
  return chart;
}
function hBars(canvasId, labels, data, colors, fmt, maxHint) {
  const safeFmt = v => (v == null || typeof v === 'object') ? '' : fmt(v);
  const chart = new Chart($(canvasId), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 5, barThickness: 'flex', maxBarThickness: 46, categoryPercentage: 0.82, barPercentage: 0.9 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => safeFmt(c.parsed.x) } },
        inlineLabels: { enabled: true, color: '#0E0E0E', outline: 'rgba(255,255,255,0.92)', fontSize: 13, fmt: v => safeFmt(v) }
      },
      scales: { x: { beginAtZero: true, suggestedMax: maxHint, ticks: { callback: safeFmt } },
                y: { grid: { display: false } } }
    }
  });
  chart.$ilfmt = safeFmt;
  return chart;
}

// =================== PAGE 1 — OVERVIEW (new structure: 4 cards) ===================
function renderOverview() {
  setTitle('Page 1', 'Overall asset allocation',
    'PM allocation · Fill rate · Strategy mix (toggle: You / Peer / Platform / Model) · Benchmark comparison (Endowment or Moonfare Model).');
  gridClass('grid-2x2');

  const peer = cache.cohort?.peer_average || {};
  const youAlloc = cache.you?.allocation || {};

  // Top-left: PM allocation
  // Top-right: Fill rate (4 rows together)
  // Bottom-left: Strategy mix donut (You / Peer / Platform / Model toggle)
  // Bottom-right: Benchmark — TWO donuts (yours + selected) + Z-chart underneath, click Z-bar to swap second pie

  // Single master comparison selector — drives BOTH the right pie (bottom-left card)
  // AND the Z-chart (bottom-right card). Your portfolio (left pie) never changes.
  const benchSelector = `
    <select class="hairline r-sm bg-white txt-xs" style="padding:5px 8px;" onchange="updateOverviewBench(this.value)">
      <option value="peer"     ${state.benchPick==='peer'?'selected':''}>Peers</option>
      <option value="platform" ${state.benchPick==='platform'?'selected':''}>Platform avg</option>
      <option value="model"    ${state.benchPick==='model'?'selected':''}>Model (${escapeHtml(selectedModel().short_name)})</option>
      <option value="Harvard"   ${state.benchPick==='Harvard'?'selected':''}>Harvard endowment</option>
      <option value="Yale"      ${state.benchPick==='Yale'?'selected':''}>Yale endowment</option>
      <option value="Princeton" ${state.benchPick==='Princeton'?'selected':''}>Princeton endowment</option>
      <option value="Aggregate" ${state.benchPick==='Aggregate'?'selected':''}>H+Y+P aggregate</option>
    </select>`;

  // AI look-through banner — inject synchronously above the grid, only on Page 1.
  // (The setTimeout version was firing after navigation and stacking banners on other pages.)
  document.getElementById('aiBanner')?.remove();
  const aiLook = cache.aiLook || {};
  if (aiLook.economic_ai_pct != null) {
    const div = document.createElement('div');
    div.id = 'aiBanner';
    div.style.cssText = 'background: var(--mf-warm); border: 1px solid var(--mf-line); border-radius: 10px; padding: 10px 14px; margin: 0 24px 8px; display: flex; align-items: center; gap: 14px; font-size: 12px; flex-wrap: wrap;';
    const cov = aiLook.lookthrough_coverage_pct;
    div.innerHTML = `
      <span style="font-weight: 600; color: var(--mf-blue);">AI / IT look-through</span>
      <span><b>Dedicated AI sleeve:</b> ${aiLook.stated_ai_pct}%</span>
      <span style="color: var(--mf-muted);">·</span>
      <span style="background: var(--mf-blue); color: #fff; padding: 3px 10px; border-radius: 999px; font-weight: 600;">Economic IT/AI look-through ${aiLook.economic_ai_pct}%</span>
      <span style="color: var(--mf-muted);">Real GICS Information-Technology look-through (AI upper-bound proxy)${cov!=null?` · coverage ${cov}% of NAV`:''}.</span>`;
    const grid = $('grid');
    grid.parentNode.insertBefore(div, grid);
  }

  $('grid').innerHTML =
    card('ov1', 'Private Markets allocation', '% of investable wealth · actual',
      'ACTUAL share of investable wealth deployed in Private Markets (real commitment ÷ wealth; wealth is a modelled band). You / Peers / Platform are real-commitment-driven and move with your filters. "Model · target" is the Moonfare house-view target for your risk class — a modelled benchmark, not advice.') +
    card('ov2', 'Fill rate', `Your target: ${state.profile.targetPct}% · modelled`,
      'Deployment vs target. NOTE: the target % is a MODELLED assumption derived from profession/risk — it is not captured from the investor, so fill-rate is illustrative, not a measured peer figure.') +
    cardHtml('ov3', 'Strategy mix · You vs ' + benchSubtitle(), '',
      'Your portfolio is fixed on the left. The comparison on the right changes with the selector — the Z-chart on the right card reflects the same comparison.',
      `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; height: 100%; min-height: 0;">
        <div style="position:relative; display:flex; flex-direction:column; min-height: 0;">
          <div class="txt-xs muted" style="text-align:center; margin-bottom: 4px;">Your portfolio</div>
          <div style="position:relative; flex: 1; min-height: 0;"><canvas id="ov3_pie_you"></canvas></div>
        </div>
        <div style="position:relative; display:flex; flex-direction:column; min-height: 0;">
          <div class="txt-xs muted" id="ov3_bench_cap" style="text-align:center; margin-bottom: 4px;">${escapeHtml(benchSubtitle())}</div>
          <div style="position:relative; flex: 1; min-height: 0;"><canvas id="ov3_pie_bench"></canvas></div>
        </div>
      </div>`,
      benchSelector) +
    cardHtml('ov4', 'Strategy · over/under-weight vs ' + benchSubtitle(), '',
      'You minus the selected comparison, percentage points. Updates with the selector on the left.',
      `<div style="position:relative; height: 100%; min-height: 0;"><canvas id="ov4_z"></canvas></div>`);

  // PM allocation = ACTUAL deployed % of wealth (real commitment / modelled wealth) for You/Peer/
  // Platform — varies by cohort, responds to filters. Model bar = the house-view TARGET (reference).
  const MODEL_PM_TARGET = { income_resilience:10, balanced_compounding:15, equity_growth:20, innovation_ai_alpha:25, opportunistic_advanced:40 };
  const youActual  = cache.you?.profile?.pm_actual_pct ?? 0;
  const peerActual = peer.pm_allocation_pct ?? 0;
  const platActual = cache.platform?.pm_allocation_pct ?? 0;
  const modelTarget = MODEL_PM_TARGET[state.profile.risk] ?? (state.profile.targetPct || 15);
  const pmData = [youActual, peerActual, platActual, modelTarget];
  const pmMax = Math.max(5, Math.ceil(Math.max(...pmData) * 1.25));   // auto-scale so bars fill the card
  charts.ov1 = hBars('ov1_c',
    ['You · actual', 'Peers · actual', 'Platform · actual', 'Model · target'],
    pmData,
    [COL.blue, COL.peer, COL.platform, COL.goldman],
    v => (+v).toFixed(1) + '%', pmMax);

  // Fill rate.
  // Round the "Remaining" values explicitly — JS arithmetic on 100 - 72.8 produces
  // 27.200000000000003, which the chart-tooltip and inline-label code would faithfully
  // render. Pre-rounding kills that bleed at the data layer.
  const fillYou   = +(cache.you?.fill_rate_pct ?? 65).toFixed(1);
  const fillPeer  = +(peer.fill_rate_pct ?? 78).toFixed(1);
  const fillPlat  = +(cache.platform?.fill_rate_pct ?? 52).toFixed(1);
  // Model bar PROJECTS the fill rate you'd reach if you deployed to the Moonfare house-view target
  // for your risk class (modelTarget), measured against YOUR chosen target % (the slider). It is
  // 100% only when your target equals the model's; move the target slider and it re-projects.
  const fillModel = +Math.min(100, modelTarget / (state.profile.targetPct || modelTarget) * 100).toFixed(1);
  const remaining = v => +(100 - v).toFixed(1);
  charts.ov2 = new Chart($('ov2_c'), {
    type: 'bar',
    data: { labels: [`You (of ${state.profile.targetPct}% target)`, 'Peers', 'Platform average', 'Moonfare Model target'],
      datasets: [
        { label:'Filled',    data:[fillYou, fillPeer, fillPlat, fillModel],
          // per-row colour matches the Private Markets allocation chart (You/Peers/Platform/Model)
          backgroundColor: [COL.blue, COL.peer, COL.platform, COL.goldman], borderRadius: 4, barThickness: 26 },
        { label:'Remaining', data:[remaining(fillYou), remaining(fillPeer), remaining(fillPlat), remaining(fillModel)],
          backgroundColor: '#EEE8DC', borderRadius: 4, barThickness: 26 }
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.parsed.x.toFixed(1) + '%' } },
        // Per-dataset color: Filled bars (deep blue) get white text + dark outline; Remaining
        // bars (cream) get BLACK text — white-on-cream was unreadable.
        inlineLabels: { enabled: true,
          color:        { Filled: '#0E0E0E', Remaining: '#0E0E0E' },
          outline:      { Filled: 'rgba(255,255,255,0.92)', Remaining: 'rgba(255,255,255,0.92)' },
          outsideColor: '#0E0E0E', fontSize: 12,
          fmt: (v) => (v == null || typeof v === 'object') ? '' : (Math.abs(v) >= 1.5 ? (+v).toFixed(1) + '%' : '') }
      },
      scales: { x: { stacked: true, max: 100, ticks: { callback: v => v + '%' } },
                y: { stacked: true, grid: { display: false } } }
    }
  });
  charts.ov2.$ilfmt = (v) => (v == null || typeof v === 'object') ? '' : (Math.abs(v) >= 1.5 ? (+v).toFixed(1) + '%' : '');

  // Bottom-left card: TWO PIES side-by-side. Left = your portfolio (FIXED, never changes).
  // Right = the selected comparison (changes with the master selector above).
  const youStrat = youAlloc;
  const benchAlloc = currentBenchAllocation();
  // Page-1 strategy donuts use the shared CAT_COLORS.strategy palette so the
  // exact same color = same strategy across Page 1, Page 4, and Page 9 cards.
  charts.ov3_you   = donut('ov3_pie_you',   youStrat,   { cutout: '50%', category: 'strategy' });
  charts.ov3_bench = donut('ov3_pie_bench', benchAlloc, { cutout: '50%', category: 'strategy' });

  // Bottom-right card: standalone Z-chart, driven by the same comparison.
  const labels = Object.keys(youStrat);
  const deltas = labels.map(k => (youStrat[k]||0) - (benchAlloc[k]||0));
  charts.ov4_z = zChartHoriz('ov4_z', labels, deltas, null, { category: 'strategy' });
}

function benchSubtitle() {
  const bp = state.benchPick;
  if (bp === 'peer')     return 'Peer average';
  if (bp === 'platform') return 'Platform average';
  if (bp === 'model')    return `Model · ${selectedModel().short_name} (house view)`;
  return `${bp} endowment (illustrative · total-endowment, not PM sleeve)`;
}

function selectedModel() {
  return cache.risk.find(r => r.id === state.profile.risk) || cache.risk[1];
}
function currentStrategyMix() {
  if (state.stratView === 'you')      return cache.you?.allocation || {};
  if (state.stratView === 'peer')     return cache.cohort?.peer_average?.allocation || {};
  if (state.stratView === 'platform') return cache.platform?.allocation || {};
  if (state.stratView === 'model')    return selectedModel().allocation;
  return cache.you?.allocation || {};
}
function currentBenchAllocation() {
  const bp = state.benchPick;
  if (bp === 'peer')     return cache.cohort?.peer_average?.allocation || cache.platform?.allocation || {};
  if (bp === 'platform') return cache.platform?.allocation || {};
  if (bp === 'model')    return selectedModel().allocation;
  const e = cache.endow.find(x => x.name === bp);
  return e ? e.allocation : {};
}

// Change the comparison WITHOUT rebuilding the page — updates ONLY the peer/bench pie + the
// Z-chart (+ their titles). The user's own pie (ov3_you) is left untouched, so to the user it
// clearly doesn't "reload" — only the thing they're comparing against moves.
function updateOverviewBench(value) {
  state.benchPick = value;
  const benchAlloc = currentBenchAllocation();
  const keys = Object.keys(benchAlloc);
  if (charts.ov3_bench) {
    charts.ov3_bench.data.labels = keys;
    charts.ov3_bench.data.datasets[0].data = keys.map(k => benchAlloc[k]);
    charts.ov3_bench.data.datasets[0].backgroundColor = colorsFor('strategy', keys);
    charts.ov3_bench.update();
  }
  const youStrat = cache.you?.allocation || {};
  const zl = Object.keys(youStrat);
  if (charts.ov4_z) {
    charts.ov4_z.data.labels = zl;
    charts.ov4_z.data.datasets[0].data = zl.map(k => Math.round(((youStrat[k]||0) - (benchAlloc[k]||0)) * 10) / 10);
    charts.ov4_z.data.datasets[0].backgroundColor = colorsFor('strategy', zl);
    charts.ov4_z.update();
  }
  const sub = benchSubtitle();
  const ov3h = document.querySelector('#ov3 h3'); if (ov3h) ov3h.textContent = 'Strategy mix · You vs ' + sub;
  const ov4h = document.querySelector('#ov4 h3'); if (ov4h) ov4h.textContent = 'Strategy · over/under-weight vs ' + sub;
  const cap = document.getElementById('ov3_bench_cap');   // bench caption only — leaves "Your portfolio" intact
  if (cap) cap.textContent = sub;
}

// =================== SOFT UPDATES (no rebuild, no re-animation) ===================
// Toggles/filters route here. Charts are mutated in place with update('none') so unchanged
// charts (e.g. YOUR pie) stay visually identical — only data that actually changed moves.
function pillActive(btn){ const p = btn.closest('.pill'); if (p) p.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn)); }
function _setPie(ch, obj, cat){ if(!ch) return; const k=Object.keys(obj); ch.data.labels=k; ch.data.datasets[0].data=k.map(x=>obj[x]); ch.data.datasets[0].backgroundColor=colorsFor(cat,k); ch.update('none'); }
function _setZ(ch, labels, deltas, cat){ if(!ch) return; ch.data.labels=labels; ch.data.datasets[0].data=deltas.map(d=>Math.round(d*10)/10); ch.data.datasets[0].backgroundColor=(cat?colorsFor(cat,labels):ch.data.datasets[0].backgroundColor); ch.update('none'); }

function softRegion(){
  const yr=cache.you?.region_mix||{}, pr=cache.cohort?.peer_average?.region_mix||{}, pl=cache.platform?.region_mix||{};
  if (state.zCompare==='model') state.zCompare='peer';
  const view=state._regionView||'you';
  const pieData = view==='platform'?pl : view==='peer'?pr : yr;
  const cmp = state.zCompare==='platform'?pl:pr;
  _setPie(charts.rg1, pieData, 'region');
  const labels=Object.keys(yr); _setZ(charts.rg2, labels, labels.map(k=>(yr[k]||0)-(cmp[k]||0)), 'region');
}
function softFormat(){
  const rk=(o)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k==='Semi-liquid'?'Evergreen':k,v]));
  const yf=rk(cache.you?.format_mix||{}), pf=rk(cache.cohort?.peer_average?.format_mix||{}), plf=rk(cache.platform?.format_mix||{});
  if (state.zCompare==='model') state.zCompare='peer';
  const view=state._formatView||'you';
  const pieData = view==='platform'?plf : view==='peer'?pf : yf;
  const cmp = state.zCompare==='platform'?plf:pf;
  _setPie(charts.fm1, pieData, 'format');
  const labels=Object.keys(yf); _setZ(charts.fm2, labels, labels.map(k=>(yf[k]||0)-(cmp[k]||0)), 'format');
}
function softSector(){
  if (state.zCompare==='model') state.zCompare='peer';
  const youSec=cache.you?.sector_mix||{};
  const cmp = state.zCompare==='platform' ? (cache.platform?.sector_mix||{}) : (cache.cohort?.peer_average?.sector_mix||{});
  const cmpLabel = state.zCompare==='platform' ? 'Platform' : 'Peers';
  // only the peer tree-map (#sc2_tm) re-lays out; YOUR tree-map (#sc1_tm) is left alone
  layoutTreemap('sc2_tm', cmp, youSec, true);
  const h=document.querySelector('#sc2 h3'); if (h) h.textContent = `${cmpLabel} exposure tree-map`;
  const labels=Object.keys(youSec); _setZ(charts.sc3, labels, labels.map(k=>(youSec[k]||0)-(cmp[k]||0)), null);
}
function softStrategy(){
  // bench Peer/Platform toggle only swaps the right-hand funds table (HTML); the donut (your mix) stays
  if (window._renderStratFunds) window._renderStratFunds();
}
function softPerf(){
  const cohortSrc=state._perfCohort||'peer', tier=state.perf||'all';
  const benchLbl=(cohortSrc==='platform'?'Platform':'Peer')+(tier==='top10'?' top-10%':' avg');
  const ref = tier==='top10' ? (cache.top?.performance) : (cohortSrc==='platform'?cache.platform?.performance:cache.cohort?.peer_average?.performance);
  const youP=cache.you?.performance||{}, platP=cache.platform?.performance||{};
  [['pf1','DPI'],['pf2','MOIC'],['pf3','IRR']].forEach(([id,m])=>{
    const ch=charts[id]; if(!ch) return;
    ch.data.datasets[0].data=[youP[m], ref?.[m], platP[m]];
    ch.data.labels=['You', benchLbl, 'Platform']; ch.update('none');
  });
}
function softVintage(){
  const yv=cache.you?.vintage_mix||{}, pv=cache.cohort?.peer_average?.vintage_mix||{}, plv=cache.platform?.vintage_mix||{};
  const labels=Array.from(new Set([...Object.keys(yv),...Object.keys(pv),...Object.keys(plv)])).sort();
  const ch=charts.vt1; if(!ch) return;
  ch.data.labels=labels;
  ch.data.datasets[0].data=labels.map(k=>yv[k]||0);
  ch.data.datasets[1].data=labels.map(k=>pv[k]||0);
  ch.data.datasets[2].data=labels.map(k=>plv[k]||0);
  ch.update('none');
}
function softOverviewCohort(){
  // cohort changed → peer-dependent charts update; YOUR pie (ov3_you) and YOUR bars are left as-is.
  const peer=cache.cohort?.peer_average||{};
  const MODEL_PM={income_resilience:10,balanced_compounding:15,equity_growth:20,innovation_ai_alpha:25,opportunistic_advanced:40};
  if (charts.ov1){ const d=[cache.you?.profile?.pm_actual_pct??0, peer.pm_allocation_pct??0, cache.platform?.pm_allocation_pct??0, MODEL_PM[state.profile.risk]??(state.profile.targetPct||15)]; charts.ov1.data.datasets[0].data=d; charts.ov1.update('none'); }
  if (charts.ov2){ const r=v=>+(100-v).toFixed(1); const mt=MODEL_PM[state.profile.risk]??(state.profile.targetPct||15); const fm=+Math.min(100, mt/(state.profile.targetPct||mt)*100).toFixed(1); const fy=+(cache.you?.fill_rate_pct??0).toFixed(1), fp=+(peer.fill_rate_pct??0).toFixed(1), fpl=+(cache.platform?.fill_rate_pct??0).toFixed(1); charts.ov2.data.datasets[0].data=[fy,fp,fpl,fm]; charts.ov2.data.datasets[1].data=[r(fy),r(fp),r(fpl),r(fm)]; charts.ov2.update('none'); }
  if (state.benchPick==='peer'){ updateOverviewBench('peer'); }   // bench pie+z follow the peer cohort
  else { // z-chart still compares vs current bench; bench pie unchanged, but z uses you-bench (unchanged). no-op.
  }
}
// dispatch a cohort-filter change to the current page's soft updater (fallback: full render)
function softCohort(){
  const fn={1:softOverviewCohort,2:softRegion,3:softFormat,4:softStrategy,5:softSector,6:softPerf,7:softVintage}[state.page];
  if (fn) fn(); else render();
}
// the zCompare Peer/Platform toggle is shared markup across region/format/sector — dispatch by page
function softZ(){ ({2:softRegion,3:softFormat,5:softSector}[state.page]||render)(); }

// =================== PAGE 2 — REGION ===================
function renderRegion() {
  setTitle('Page 2', 'Regional distribution',
    'Pie + over/under-weight Z-Chart. Toggle the pie between Your portfolio and the Peers.');
  gridClass('grid-2x1');

  const regionView = state._regionView || 'you';
  state._regionView = regionView;
  const yourReg = cache.you?.region_mix || {};
  const peerReg = cache.cohort?.peer_average?.region_mix || {};
  const platReg = cache.platform?.region_mix || {};
  // Region/Format/Sector pages don't have a Model option — Moonfare model portfolios
  // only define a strategy mix, not region/format/sector splits. Auto-revert any
  // stale 'model' selection to 'peer' before computing the delta.
  if (state.zCompare === 'model') state.zCompare = 'peer';
  const pieData = regionView==='platform' ? platReg : (regionView==='you' ? yourReg : peerReg);
  const cmp = state.zCompare === 'platform' ? platReg : peerReg;

  const pieToggle = `<div class="pill">
    <button class="${regionView==='you'?'active':''}" onclick="state._regionView='you'; pillActive(this); softRegion()">You</button>
    <button class="${regionView==='peer'?'active':''}" onclick="state._regionView='peer'; pillActive(this); softRegion()">Peer</button>
    <button class="${regionView==='platform'?'active':''}" onclick="state._regionView='platform'; pillActive(this); softRegion()">Platform</button>
  </div>`;
  const zToggle = `<div class="pill">
    <button class="${state.zCompare==='peer'?'active':''}"     onclick="state.zCompare='peer'; pillActive(this); softZ()">Peer</button>
    <button class="${state.zCompare==='platform'?'active':''}" onclick="state.zCompare='platform'; pillActive(this); softZ()">Platform</button>
  </div>`;

  $('grid').innerHTML =
    card('rg1', 'Regional pie', '', 'Allocation split across US / Europe / Asia / Rest of World.', pieToggle) +
    card('rg2', 'Region · over/under-weight', '', 'You minus chosen peer group in percentage points.', zToggle);

  charts.rg1 = donut('rg1_c', pieData, { category: 'region', legendPos: 'right' });
  const labels = Object.keys(yourReg);
  const deltas = labels.map(k => (yourReg[k]||0) - (cmp[k]||0));
  charts.rg2 = zChartHoriz('rg2_c', labels, deltas, null, { category: 'region' });
}

// =================== PAGE 3 — FORMAT ===================
function renderFormat() {
  setTitle('Page 3', 'Investment format',
    'Pie of investment formats (Primary / Secondary / Direct & Co / Fund of Fund / Evergreen). Toggle the pie between You and the Peers.');
  gridClass('grid-2x1');

  if (state.zCompare === 'model') state.zCompare = 'peer';
  const formatView = state._formatView || 'you';
  state._formatView = formatView;
  const youFmt = cache.you?.format_mix || {};
  const peerFmt = cache.cohort?.peer_average?.format_mix || {};
  const platFmt = cache.platform?.format_mix || {};
  // Rename legacy "Semi-liquid" key to "Evergreen" at the read layer so the colour map hits.
  const rekey = (o) => Object.fromEntries(Object.entries(o).map(([k,v]) => [k === 'Semi-liquid' ? 'Evergreen' : k, v]));
  const youKeyed  = rekey(youFmt);
  const peerKeyed = rekey(peerFmt);
  const platKeyed = rekey(platFmt);
  const pieData = formatView === 'you' ? youKeyed : peerKeyed;
  const cmp = state.zCompare === 'platform' ? platKeyed : peerKeyed;

  const pieToggle = `<div class="pill">
    <button class="${formatView==='you'?'active':''}"  onclick="state._formatView='you'; pillActive(this); softFormat()">You</button>
    <button class="${formatView==='peer'?'active':''}" onclick="state._formatView='peer'; pillActive(this); softFormat()">Peer</button>
  </div>`;
  const zToggle = `<div class="pill">
    <button class="${state.zCompare==='peer'?'active':''}"     onclick="state.zCompare='peer'; pillActive(this); softZ()">Peer</button>
    <button class="${state.zCompare==='platform'?'active':''}" onclick="state.zCompare='platform'; pillActive(this); softZ()">Platform</button>
  </div>`;

  $('grid').innerHTML =
    card('fm1', 'Format split', '% of total Private-Markets exposure', 'Each slice = one format; slices sum to 100%.', pieToggle) +
    card('fm2', 'Format · over/under-weight', '', 'You minus chosen peer group, percentage points. Bar colors match the pie on the left.', zToggle);

  charts.fm1 = donut('fm1_c', pieData, { category: 'format' });
  const formats = Object.keys(youKeyed);
  const deltas = formats.map(k => (youKeyed[k]||0) - (cmp[k]||0));
  charts.fm2 = zChartHoriz('fm2_c', formats, deltas, null, { category: 'format' });
}

// =================== PAGE 4 — STRATEGY DEEP-DIVE ===================
function renderStrategy() {
  const strat = state.pickedStrategy;
  setTitle('Page 4', 'Strategy deep-dive',
    'Left: your overall strategy mix. Click any slice to drill into your funds in that strategy on the right — and compare against what peers or the platform hold in that same asset class.');
  gridClass('grid-2x1');

  const youAlloc = cache.you?.allocation || {};
  const benchSourceLabel = state._stratBench === 'platform' ? 'Platform' : 'Peers';
  const benchToggle = `<div class="pill">
    <button class="${state._stratBench!=='platform'?'active':''}" onclick="state._stratBench='peer'; pillActive(this); softStrategy()">Peer</button>
    <button class="${state._stratBench==='platform'?'active':''}" onclick="state._stratBench='platform'; pillActive(this); softStrategy()">Platform</button>
  </div>`;

  $('grid').innerHTML =
    card('st1', 'Your strategy mix', '',
      'Click a slice to drill into the funds you hold in that strategy. Colors match the page-1 strategy mix and the table on the right.') +
    cardHtml('st2', `${escapeHtml(strat)} · your funds vs ${benchSourceLabel.toLowerCase()}`,
      '', 'Left column: your real holdings, largest first. Right column: which funds your selected peer group holds most heavily in this same strategy.',
      `<div id="st2_panel" style="display:flex; flex-direction:column; height:100%; min-height:0;"></div>`, benchToggle);

  // Left pie — click any slice to set the picked strategy. Highlights the active one.
  const stratLabels = Object.keys(youAlloc);
  const focusedIdx = stratLabels.indexOf(strat);
  charts.st1 = donut('st1_c', youAlloc, {
    category: 'strategy',
    focusedIndex: focusedIdx >= 0 ? focusedIdx : null,
    cutout: '45%',
    onSliceClick: (label) => { state.pickedStrategy = label; render(); }
  });

  // Right panel: extracted so the Peer/Platform toggle (and cohort changes) re-render ONLY this
  // panel — the donut on the left (your mix) stays put.
  function renderStratFunds() {
    const strat = state.pickedStrategy;
    const yFunds = cache.you?.funds_by_strategy?.[strat] || {};
    const benchFundsSrc = state._stratBench === 'platform'
      ? (cache.platform?.weighted_funds_by_strategy || {})
      : (cache.cohort?.peer_average?.weighted_funds_by_strategy || {});
    const pFunds = benchFundsSrc[strat] || {};
    const universe = cache.openFunds || [];
    const resolveIssuerSlug = (fundName) => {
      const lc = (fundName || '').toLowerCase();
      const hit = universe.find(u => lc.includes((u.issuer || '').toLowerCase()) || lc.includes((u.name || '').toLowerCase().split(' ')[0]));
      return hit?.issuer_slug || (fundName || '').split(/\s+/)[0];
    };
    const sortedYou  = Object.entries(yFunds).sort((a,b) => b[1] - a[1]);
    const sortedPeer = Object.entries(pFunds).sort((a,b) => b[1] - a[1]);
    const rowHtml = (entries, emptyMsg) => entries.length
      ? entries.map(([name, pct]) => `<li class="fund-row">
          <img src="${logoUrl(resolveIssuerSlug(name))}" alt="" class="fund-row-logo">
          <span class="fund-row-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
          <span class="fund-row-bar"><span style="width:${Math.min(100, +pct)}%"></span></span>
          <span class="fund-row-pct">${(+pct).toFixed(1)}%</span>
        </li>`).join('')
      : `<li class="fund-row-empty">${escapeHtml(emptyMsg)}</li>`;
    const panel = document.getElementById('st2_panel'); if (!panel) return;
    panel.innerHTML = `
      <div class="strat-cols">
        <div class="strat-col">
          <div class="strat-col-head">YOUR HOLDINGS<span class="muted">${sortedYou.length} fund${sortedYou.length===1?'':'s'} · ${strat}</span></div>
          <ul class="fund-list">${rowHtml(sortedYou, 'You hold nothing in this strategy yet.')}</ul>
        </div>
        <div class="strat-col strat-col-peer">
          <div class="strat-col-head">${state._stratBench==='platform'?'PLATFORM':'PEER'} · TOP FUNDS<span class="muted">${sortedPeer.length} weighted</span></div>
          <ul class="fund-list">${rowHtml(sortedPeer, (state._stratBench==='platform'?'Platform':'Peer')+' holdings unavailable for this strategy.')}</ul>
        </div>
      </div>`;
  }
  window._renderStratFunds = renderStratFunds;
  renderStratFunds();
}

// =================== PAGE 5 — SECTOR TREE-MAP ===================
function renderSector() {
  setTitle('Page 5', 'Sector look-through',
    "Toggle drives BOTH tree-maps and the Z-chart. Left = YOUR sector mix; right = the selected peer group's sector mix; Z-chart = the delta.");
  gridClass('grid-2x2');
  // Tree-maps get a fixed, modest height (so they're not oversized); the Z-chart takes the rest.
  $('grid').style.gridTemplateRows = '320px 1fr';
  const zToggle = `<div class="pill">
    <button class="${state.zCompare==='peer'?'active':''}"     onclick="state.zCompare='peer'; pillActive(this); softZ()">Peer</button>
    <button class="${state.zCompare==='platform'?'active':''}" onclick="state.zCompare='platform'; pillActive(this); softZ()">Platform</button>
  </div>`;
  // No Model comparison for sector — fall back to peer if a stale Model selection sits in state.
  if (state.zCompare === 'model') state.zCompare = 'peer';
  const youSec = cache.you?.sector_mix || {};
  const cmpLabel = state.zCompare === 'platform' ? 'Platform' : 'Peers';
  const cmp = state.zCompare === 'platform'
    ? (cache.platform?.sector_mix || {})
    : (cache.cohort?.peer_average?.sector_mix || {});
  // Squarified tree-maps (gapless) — see _squarify/layoutTreemap below. Containers are filled
  // after the DOM exists so we can measure their pixel size.
  $('grid').innerHTML =
    cardHtml('sc1', 'Your exposure tree-map', '', 'Tile size = YOUR share of each sector. Always YOUR portfolio.',
             `<div id="sc1_tm" style="position:relative;width:100%;height:100%;"></div>`) +
    cardHtml('sc2', `${cmpLabel} exposure tree-map`, '', 'Tile size = the chosen peer group\'s share of each sector. Changes with the toggle.',
             `<div id="sc2_tm" style="position:relative;width:100%;height:100%;"></div>`, zToggle) +
    `<div class="card" id="sc3" style="grid-column: 1 / -1;">
      <div class="flex jc-b ai-c"><h3 class="h3">Sector · over/under-weight vs ${escapeHtml(cmpLabel)}</h3></div>
      <div class="card-sub">You minus the chosen peer group, percentage points.</div>
      <div class="chartwrap"><canvas id="sc3_c"></canvas></div>
    </div>`;
  layoutTreemap('sc1_tm', youSec, youSec, false);
  layoutTreemap('sc2_tm', cmp, youSec, true);
  const labels = Object.keys(youSec);
  const deltas = labels.map(k => (youSec[k] || 0) - (cmp[k] || 0));
  charts.sc3 = zChartHoriz('sc3_c', labels, deltas);
}

// ---- squarified treemap (gapless tiling, good aspect ratios) ----
function _squarify(items, W, H) {
  items = items.filter(d => d.value > 0).slice().sort((a, b) => b.value - a.value);
  const sum = items.reduce((s, d) => s + d.value, 0) || 1;
  const sc = items.map(d => ({ ...d, area: d.value / sum * (W * H) }));
  const rects = []; let X = 0, Y = 0, w = W, h = H;
  const worst = (row, side) => { const s = row.reduce((a, r) => a + r.area, 0); const mx = Math.max(...row.map(r => r.area)), mn = Math.min(...row.map(r => r.area)); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
  const place = (row) => {
    const s = row.reduce((a, r) => a + r.area, 0);
    if (w >= h) { const cw = s / h; let cy = Y; row.forEach(r => { const rh = r.area / cw; rects.push({ ...r, x: X, y: cy, w: cw, h: rh }); cy += rh; }); X += cw; w -= cw; }
    else { const rh = s / w; let cx = X; row.forEach(r => { const rw = r.area / rh; rects.push({ ...r, x: cx, y: Y, w: rw, h: rh }); cx += rw; }); Y += rh; h -= rh; }
  };
  let row = [], i = 0;
  while (i < sc.length) {
    const side = (w >= h) ? h : w;
    if (!row.length) { row = [sc[i]]; i++; continue; }
    if (worst(row, side) >= worst(row.concat(sc[i]), side)) { row.push(sc[i]); i++; }
    else { place(row); row = []; }
  }
  if (row.length) place(row);
  return rects;
}
function layoutTreemap(elId, mix, youSec, showDelta) {
  const el = document.getElementById(elId); if (!el) return;
  const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
  const entries = Object.entries(mix).filter(([, v]) => +v > 0.1).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { el.innerHTML = '<div class="txt-xs muted" style="padding:12px;">No sector look-through coverage for this portfolio.</div>'; return; }
  // Layout area is floored to a minimum so even tiny sectors (e.g. Energy, Defense) get a tile
  // big enough to read the name + %. The TRUE % is always what's displayed (trueVal), not the floor.
  const totalV = entries.reduce((s, [, v]) => s + +v, 0) || 1;
  const floorV = totalV * 0.05;
  const items = entries.map(([k, v], i) => ({ key: k, value: Math.max(+v, floorV), trueVal: +v, color: COL.treemap[i % COL.treemap.length] }));
  const rects = _squarify(items, W, H);
  const pad = 3;
  el.innerHTML = rects.map(r => {
    const big = (r.w * r.h) > (W * H * 0.12);
    const tiny = r.h < 30 || r.w < 56;
    const delta = showDelta ? Math.round(((youSec[r.key] || 0) - (mix[r.key] || 0)) * 10) / 10 : null;
    const dPill = delta != null && !tiny ? `<span style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;${delta>=0?'background:#E8F5E9;color:#2D6A4F;':'background:#FDE2D9;color:#B23A1F;'}">${delta>=0?'+':''}${delta.toFixed(1)} ppt</span>` : '';
    return `<div style="position:absolute;left:${r.x+pad}px;top:${r.y+pad}px;width:${Math.max(0,r.w-2*pad)}px;height:${Math.max(0,r.h-2*pad)}px;background:${r.color};color:#fff;border-radius:8px;padding:${tiny?4:9}px;overflow:hidden;">
      <div style="font-weight:600;font-size:${tiny?9.5:13}px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.key)}</div>
      <div style="font-family:'Source Serif Pro',Georgia,serif;font-weight:600;font-size:${big?22:tiny?11:16}px;margin-top:${tiny?1:2}px;">${r.trueVal.toFixed(1)}%</div>
      ${dPill}
    </div>`;
  }).join('');
}

// =================== PAGE 6 — PERFORMANCE (VERTICAL BARS) ===================
function renderPerformance() {
  // Two independent toggles drive what the big number compares against:
  // (1) Cohort source: peer group vs ALL platform investors
  // (2) Performance tier: cohort/platform AVERAGE vs cohort/platform TOP 10%
  const cohortSrc = state._perfCohort || 'peer';   // 'peer' | 'platform'
  state._perfCohort = cohortSrc;
  const tier      = state.perf || 'all';            // 'all' | 'top10'
  const benchLbl  = (cohortSrc === 'platform' ? 'Platform' : 'Peer') + (tier === 'top10' ? ' top-10%' : ' avg');
  const peerRef   = tier === 'top10'
    ? (cohortSrc === 'platform' ? cache.top?.performance : cache.top?.performance)   // top-decile is platform-wide today
    : (cohortSrc === 'platform' ? cache.platform?.performance : cache.cohort?.peer_average?.performance);
  setTitle('Page 6', 'Performance benchmark',
    `Big number on top, You vs ${benchLbl} vs Platform underneath. Toggle the peer group and tier above.`);
  gridClass('grid-3x1');

  // Inject a sub-toolbar with the two toggles (cohort source + tier) above the cards
  const toolbar = `<div style="grid-column: 1 / -1; display:flex; gap:14px; align-items:center; padding:0 0 8px;">
    <div class="pill"><button class="${cohortSrc==='peer'?'active':''}" onclick="state._perfCohort='peer'; pillActive(this); softPerf()">Peers</button><button class="${cohortSrc==='platform'?'active':''}" onclick="state._perfCohort='platform'; pillActive(this); softPerf()">Platform avg</button></div>
    <div class="pill"><button class="${tier==='all'?'active':''}" onclick="state.perf='all'; pillActive(this); softPerf()">Average</button><button class="${tier==='top10'?'active':''}" onclick="state.perf='top10'; pillActive(this); softPerf()">Top 10%</button></div>
  </div>`;

  const youP  = cache.you?.performance || {};
  const platP = cache.platform?.performance || {};

  $('grid').innerHTML = toolbar + ['DPI', 'MOIC', 'IRR'].map((m, i) => {
    const fmt = m === 'IRR' ? (v => v != null ? Number(v).toFixed(1) + '%' : '—')
             : m === 'MOIC' ? (v => v != null ? Number(v).toFixed(2) + 'x' : '—')
             : (v => v != null ? Number(v).toFixed(2) : '—');
    const sub = m === 'DPI' ? 'Distributions / paid-in (cash returned)'
              : m === 'MOIC' ? 'Total value / money invested'
              : 'Annualised internal rate of return';
    const youVal  = youP[m];
    const peerVal = peerRef?.[m];
    const platVal = platP[m];
    const pctOfTop = (youVal != null && peerVal) ? Math.round(youVal / peerVal * 100) : null;
    // #4: IRR/MOIC on young, GP-marked, unrealised vintages is J-curve noise, not skill.
    // Suppress the "% of cohort" ranking badge for IRR when the peer group isn't vintage-mature.
    const matureShare = cache.cohort?.peer_average?.performance?.irr_mature_share;
    const youMature   = cache.you?.performance?.irr_mature;
    const tooEarly = (m === 'IRR') && ((youMature === false) || (matureShare != null && matureShare < 0.5));
    const showBadge = pctOfTop != null && !tooEarly;
    return `<div class="card" id="pf${i+1}" style="display:flex; flex-direction:column;">
      <div class="flex jc-b ai-c"><h3 class="h3">${m}</h3><div class="txt-xs muted">${escapeHtml(sub)}</div></div>
      <div style="display:flex; align-items:baseline; gap:12px; margin-top:8px;">
        <div style="font-family:'Source Serif Pro',Georgia,serif; font-size:46px; line-height:1; color: var(--mf-blue); font-weight:600;">${fmt(youVal)}</div>
        ${showBadge ? `<div style="background:#FAE7D9; color:#C75A1F; padding:5px 12px; border-radius:999px; font-size:12px; font-weight:600;">${pctOfTop}% of ${benchLbl}</div>` : ''}
      </div>
      ${tooEarly ? `<div class="txt-xs" style="margin-top:6px; color:#9a6a1f; background:#FBF1E2; border-radius:6px; padding:5px 8px;">⚠ Too early to rank — most funds are &lt;4yr vintage; IRR is J-curve-distorted and GP-marked. Use DPI (realised) for comparison.</div>` : ''}
      <div class="chartwrap" style="flex:1 1 auto; min-height:170px; display:flex; align-items:center; margin-top:10px;"><canvas id="pf${i+1}_c"></canvas></div>
      <div class="card-sub" style="margin-top:6px;">You vs ${benchLbl} vs Platform · GP-marked, unrealised</div>
    </div>`;
  }).join('');

  function metric(canvas, m, fmt) {
    const yv = youP[m], pv = peerRef?.[m], plv = platP[m];
    return vBars(canvas, ['You', benchLbl, 'Platform'], [{
      label: m,
      data: [yv, pv, plv],
      backgroundColor: [COL.blue, COL.peer, COL.platform]
    }], fmt);
  }
  charts.pf1 = metric('pf1_c', 'DPI',  v => v != null ? Number(v).toFixed(2) : '');
  charts.pf2 = metric('pf2_c', 'MOIC', v => v != null ? Number(v).toFixed(2) + 'x' : '');
  charts.pf3 = metric('pf3_c', 'IRR',  v => v != null ? Number(v).toFixed(1) + '%' : '');
}

// =================== PAGE 7 — VINTAGE ===================
function renderVintage() {
  setTitle('Page 7', 'Vintage distribution',
    'Share of commitments by vintage year — You vs Peers vs Platform average. Compare your pacing against both.');
  gridClass('grid-1x1');
  const youV  = cache.you?.vintage_mix || {};
  const peerV = cache.cohort?.peer_average?.vintage_mix || {};
  const platV = cache.platform?.vintage_mix || {};
  // Union all vintage labels (your set may differ from peer/platform)
  const labelSet = new Set([...Object.keys(youV), ...Object.keys(peerV), ...Object.keys(platV)]);
  const labels = Array.from(labelSet).sort();
  $('grid').innerHTML = card('vt1', 'Vintage % per year — You vs Peer vs Platform', '',
    'Triplet per vintage: your share, peer average, platform-wide average. Reveals whether your pacing leads or lags.');
  charts.vt1 = vBars('vt1_c', labels, [
    { label: 'You',      data: labels.map(k => youV[k]  || 0), backgroundColor: COL.blue },
    { label: 'Peer',     data: labels.map(k => peerV[k] || 0), backgroundColor: COL.peer },
    { label: 'Platform', data: labels.map(k => platV[k] || 0), backgroundColor: COL.platform }
  ], v => (+v).toFixed(1) + '%');
}

// =================== PAGE 8 — FOLLOWER (IPHONE) ===================
async function renderFollower() {
  setTitle('Page 8', 'Follower function',
    'The Moonfare push notification fires the moment a peer in your peer group commits to a fund that closes one of your model gaps. Lock screen + home screen — exactly as it lands on the user\'s phone.');
  gridClass('grid-1x1');
  const group = state.follow==='peer' ? 'Peer average' : state.follow==='all' ? 'All investors' : 'Top 10%';

  // Fetch the live gap-driven alert text — we use this in the side panel even
  // though the notification text is baked into the iPhone PNGs (it ties the
  // visual to the underlying engine).
  let alert = { headline: 'Moonfare peer alert', body: 'Loading…' };
  try { alert = await API.followerAlert(group) || alert; } catch (_) {}

  $('grid').innerHTML = cardHtml('fl1', 'Live follower alert · ' + group, '',
    '', `
    <div class="follower-wrap">
      <figure class="follower-phone">
        <div class="phone-shot">
          <img src="/static/assets/iphone_lock_empty.png" alt="iPhone lock screen">
          <div class="notif-overlay lock">
            <div class="h"><span class="ic">M</span>Moonfare<span class="t">now</span></div>
            <div class="t2">${escapeHtml((alert.headline || 'Peer alert').replace(/^moonfare\s*[·:\-]?\s*/i, ''))}</div>
            <div class="b">${escapeHtml(alert.body || '')}</div>
          </div>
        </div>
        <figcaption>Lock screen</figcaption>
      </figure>
      <figure class="follower-phone">
        <div class="phone-shot">
          <img src="/static/assets/iphone_home_empty.png" alt="iPhone home screen">
          <div class="notif-overlay home">
            <div class="h"><span class="ic">M</span>Moonfare<span class="t">now</span></div>
            <div class="t2">${escapeHtml((alert.headline || 'Peer alert').replace(/^moonfare\s*[·:\-]?\s*/i, ''))}</div>
            <div class="b">${escapeHtml(alert.body || '')}</div>
          </div>
        </div>
        <figcaption>Home screen banner</figcaption>
      </figure>
      <aside class="follower-side">
        <div class="follower-eyebrow">HOW IT WORKS</div>
        <div class="follower-title">Peer-triggered, gap-targeted</div>
        <p class="follower-copy">When investors in your assigned peer group commit capital to a fund that closes one of your model gaps, the push fires within minutes — not at the end of a quarterly review.</p>
        <div class="follower-eyebrow">CURRENT TRIGGER</div>
        <div class="follower-trigger">
          <div class="follower-trigger-h">${escapeHtml(alert.headline || 'Peer alert')}</div>
          <div class="follower-trigger-b">${escapeHtml(alert.body || '')}</div>
        </div>
        <div class="follower-eyebrow">FOLLOW GROUP</div>
        <div class="follower-copy">${escapeHtml(group)} — change in the peer group panel → Follow.</div>
      </aside>
    </div>`);
}

// =================== PAGE 9 — WHAT'S NEXT (FUND CARDS) ===================
function renderWhatsNext() {
  setTitle('Page 9', 'Investment opportunities',
    "Live Moonfare opportunities, ranked by how well each one closes the gap between your current allocation and your assigned model portfolio.");
  gridClass('grid-1x1');

  // Single full-bleed card with a two-column layout: feed on the left, sticky portfolio
  // summary on the right. The recommendation feed comes from /api/recommendations and is
  // re-ranked any time the user's profile / cohort changes (which mutates `cache.you`).
  $('grid').innerHTML = cardHtml('wn1', 'Investment opportunities', '',
    "Ranked by fit to your gap vs your assigned model portfolio. Pick capital with the slider — your portfolio composition recomputes live.",
    `<div class="opps-wrap">
       <div class="opps-feed" id="oppsFeed">Loading recommendations…</div>
       <div class="opps-side" id="oppsSide"></div>
     </div>`);

  // Render the sticky right rail first (it works even before recs return)
  renderOppsSidebar();

  // Then the feed. We fetch fresh on every render() so it reacts to profile changes.
  API.recommendations().then(d => {
    const recs = d.recommendations || [];
    const feed = document.getElementById('oppsFeed');
    if (!feed) return;
    if (!recs.length) { feed.innerHTML = '<div class="muted txt-sm">No open funds in the universe.</div>'; return; }
    feed.innerHTML = oppToolbarHtml() + recs.map(r => oppCardHtml(r)).join('');
  }).catch(e => {
    const feed = document.getElementById('oppsFeed');
    if (feed) feed.innerHTML = `<div class="muted txt-sm">Recommendations unavailable: ${escapeHtml(e.message)}</div>`;
  });
}

// ----- Page 9 helpers -----

function oppToolbarHtml() {
  const total = state.selectedFunds.reduce((a, f) => a + (+f.capital_eur || 0), 0);
  const count = state.selectedFunds.length;
  return `<div class="opps-toolbar">
    <div class="muted txt-xs">${count ? `${count} fund${count===1?'':'s'} selected · €${total.toLocaleString()}` : 'Pick funds below to recompose your portfolio'}</div>
    ${count ? `<button class="opp-btn ghost" onclick="clearSelected()">Clear selection</button>` : ''}
  </div>`;
}

function oppCardHtml(r) {
  const fitOk = (r.fit_gap_ppt || 0) > 0;
  const catLabel = ({featured:'Featured', semi_liquid:'Evergreen', waitlist:'Waitlist', open:'Open'}[r.category] || 'Open');
  const catClass = r.category === 'semi_liquid' ? 'semi' : (r.category || 'open');
  const minEur = r.min_investment_eur || (r.stats || []).map(s => s.l && s.l.toLowerCase().includes('min') ? s.v : null).find(Boolean) || '€25,000';
  const minEurNum = typeof minEur === 'number' ? minEur : 100000;
  const isSelected = state.selectedFunds.some(f => f.fund_id === r.id);
  const statsHtml = (r.stats || []).slice(0, 3).map(s => `<span class="opp-tag"><b>${escapeHtml(s.v)}</b> · ${escapeHtml(s.l)}</span>`).join('');
  return `<div class="opp-card" data-id="${escapeHtml(r.id)}">
    <div class="opp-hero" style="background-image: url('${heroUrl(r.hero_slug || 'diversifier')}');">
      <div class="opp-badges">
        <span class="opp-badge ${catClass}">${catLabel}</span>
        ${r.is_new ? '<span class="opp-badge new">New</span>' : ''}
        ${fitOk ? `<span class="opp-badge fit">Closes ${(+r.fit_gap_ppt).toFixed(1)} ppt gap</span>` : ''}
      </div>
      <img class="opp-logo" src="${logoUrl(r.issuer_slug || r.issuer)}" alt="${escapeHtml(r.issuer || '')}" onerror="this.style.opacity=0.35">
    </div>
    <div class="opp-meta">
      <div class="opp-issuer">${escapeHtml(r.issuer || '')} · ${escapeHtml(r.strategy || '')}</div>
      <div class="opp-title">${escapeHtml(r.name || '')}</div>
      <div class="opp-desc">${escapeHtml(r.description || r.headline || '')}</div>
      <div class="opp-tags">
        <span class="opp-tag">${escapeHtml(r.region || 'Global')}</span>
        ${(r.tags || []).slice(0, 3).map(t => `<span class="opp-tag">${escapeHtml(t)}</span>`).join('')}
        ${statsHtml}
      </div>
      <div class="opp-foot">
        <div class="opp-min">Min. <b>${typeof minEur === 'number' ? '€' + minEur.toLocaleString() : escapeHtml(String(minEur))}</b></div>
        <div class="opp-actions">
          ${isSelected
            ? `<button class="opp-btn selected" onclick="openFundModal('${escapeHtml(r.id)}')">Adjust €</button>
               <button class="opp-btn ghost" onclick="removeSelected('${escapeHtml(r.id)}')">Remove</button>`
            : `<button class="opp-btn" onclick="openFundModal('${escapeHtml(r.id)}')">Select fund</button>`}
        </div>
      </div>
    </div>
  </div>`;
}

function renderOppsSidebar() {
  const side = document.getElementById('oppsSide');
  if (!side) return;
  const sel = state.selectedFunds;
  const total = sel.reduce((a, f) => a + (+f.capital_eur || 0), 0);
  side.innerHTML = `
    <div class="opps-summary">
      <h4>Your selection</h4>
      ${sel.length
        ? `<ul class="opps-selected-list">${sel.map(f => `
            <li>
              <span class="n" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
              <span class="e">€${(+f.capital_eur).toLocaleString()}</span>
              <button class="rm" onclick="removeSelected('${escapeHtml(f.fund_id)}')" title="Remove">×</button>
            </li>`).join('')}</ul>
           <div class="row"><span class="l">Total commitment</span><span class="v">€${total.toLocaleString()}</span></div>`
        : '<div class="muted txt-xs" style="padding: 12px 0;">No funds selected yet. Pick from the feed →</div>'}
    </div>
    <div class="opps-summary" id="oppsScenario">
      <h4>Portfolio impact</h4>
      ${sel.length ? '<div class="muted txt-xs">Computing…</div>' : '<div class="muted txt-xs">Select a fund to see how your composition changes.</div>'}
    </div>`;

  if (sel.length) {
    API.scenario(sel.map(f => ({fund_id: f.fund_id, capital_eur: +f.capital_eur}))).then(s => {
      state.scenario = s;
      renderScenarioPanel(s);
    }).catch(e => {
      document.getElementById('oppsScenario').innerHTML = `<h4>Portfolio impact</h4><div class="muted txt-xs">Scenario unavailable: ${escapeHtml(e.message)}</div>`;
    });
  } else {
    state.scenario = null;
  }
}

function renderScenarioPanel(s) {
  const panel = document.getElementById('oppsScenario');
  if (!panel) return;
  const dTgt = (s.after.pm_target_pct - s.before.pm_target_pct);
  const sign = dTgt > 0 ? '+' : '';
  // Build per-strategy delta rows for the strategies that actually changed.
  const rows = Object.keys(s.after.allocation_pct).filter(k => Math.abs((s.after.allocation_pct[k]||0) - (s.before.allocation_pct[k]||0)) > 0.05);
  panel.innerHTML = `
    <h4>Portfolio impact</h4>
    <div class="row"><span class="l">PM target</span><span class="v">${s.before.pm_target_pct}% → ${s.after.pm_target_pct}% <span class="${dTgt>=0?'up':'down'}" style="font-size:11px;">(${sign}${dTgt.toFixed(1)} ppt)</span></span></div>
    <div class="row"><span class="l">PM capital</span><span class="v">€${(s.before.pm_eur).toLocaleString()} → €${(s.after.pm_eur).toLocaleString()}</span></div>
    <div class="opps-pies">
      <div class="pie-wrap"><div class="pie-label">Before</div><canvas id="ppieBefore"></canvas></div>
      <div class="pie-wrap"><div class="pie-label">After</div><canvas id="ppieAfter"></canvas></div>
    </div>
    ${rows.length ? `<div style="margin-top: 12px;">
      ${rows.map(k => {
        const b = s.before.allocation_pct[k] || 0;
        const a = s.after.allocation_pct[k] || 0;
        const d = +(a - b).toFixed(1);
        return `<div class="row"><span class="l">${escapeHtml(k)}</span><span class="v">${b.toFixed(1)}% → ${a.toFixed(1)}% <span class="${d>=0?'up':'down'}" style="font-size:11px;">(${d>0?'+':''}${d} ppt)</span></span></div>`;
      }).join('')}
    </div>` : ''}`;

  // Render the two small donuts. Skip if the canvases didn't mount (unmounted page).
  const before = s.before.allocation_pct;
  const after  = s.after.allocation_pct;
  setTimeout(() => {
    try { charts.ppieBefore?.destroy(); charts.ppieAfter?.destroy(); } catch(_) {}
    if (document.getElementById('ppieBefore')) charts.ppieBefore = donut('ppieBefore', before, { cutout: '50%', tinyLegend: true });
    if (document.getElementById('ppieAfter'))  charts.ppieAfter  = donut('ppieAfter',  after,  { cutout: '50%', tinyLegend: true });
  }, 0);
}

// ----- Fund-select modal -----
function openFundModal(fundId) {
  const fund = (cache.openFunds || []).find(f => f.id === fundId);
  if (!fund) return;
  const existing = state.selectedFunds.find(f => f.fund_id === fundId);
  const min = fund.min_investment_eur || 25000;
  // Recommended default: 5% of user's PM target, rounded to nearest min increment,
  // clamped to [min, 10×min].
  const you = cache.you || {};
  const pmCapital = (you.profile?.wealth_eur || 10_000_000) * (you.profile?.target_pm_pct || 20) / 100;
  const recDefault = Math.max(min, Math.min(min * 10, Math.round(pmCapital * 0.05 / min) * min));
  state._modalFund = fund;
  state._modalCapital = existing ? +existing.capital_eur : recDefault;
  drawFundModal();
  document.getElementById('fundModal').classList.add('open');
}

function drawFundModal() {
  const f = state._modalFund; if (!f) return;
  const min = f.min_investment_eur || 25000;
  const max = Math.max(min * 20, 2_000_000);
  const step = min;
  const cap = state._modalCapital;
  const wealth = cache.you?.profile?.wealth_eur || 10_000_000;
  const asPct = (cap / wealth * 100).toFixed(2);
  const overlay = document.getElementById('fundModal');
  overlay.innerHTML = `
    <div class="modal-card" onclick="event.stopPropagation()">
      <div class="modal-head">
        <div class="h">${escapeHtml(f.name)}</div>
        <div class="sub">${escapeHtml(f.issuer || '')} · ${escapeHtml(f.strategy || '')} · Min. €${min.toLocaleString()}</div>
      </div>
      <div class="modal-body">
        <div class="capital-row">
          <span class="lbl">Capital commitment</span>
          <span class="val" id="modalCapVal">€${cap.toLocaleString()}</span>
        </div>
        <input type="range" class="capital-slider" id="modalCapSlider"
               min="${min}" max="${max}" step="${step}" value="${cap}"
               oninput="onModalCapChange(this.value)">
        <div class="capital-marks">
          <span>€${min.toLocaleString()}</span>
          <span class="muted">${asPct}% of your wealth</span>
          <span>€${max.toLocaleString()}</span>
        </div>
        <div class="modal-quick">
          <button onclick="setModalCap(${min})">Min</button>
          <button onclick="setModalCap(${min * 2})">2× min</button>
          <button onclick="setModalCap(${min * 5})">5× min</button>
          <button onclick="setModalCap(${Math.round(wealth * 0.01)})">1% wealth</button>
          <button onclick="setModalCap(${Math.round(wealth * 0.05)})">5% wealth</button>
        </div>
      </div>
      <div class="modal-foot">
        <button class="secondary" onclick="closeFundModal()">Cancel</button>
        <button class="primary" onclick="confirmFundSelection()">Add to portfolio</button>
      </div>
    </div>`;
}

function onModalCapChange(v) {
  state._modalCapital = +v;
  const valEl = document.getElementById('modalCapVal');
  if (valEl) valEl.textContent = '€' + (+v).toLocaleString();
}

function setModalCap(v) {
  const slider = document.getElementById('modalCapSlider');
  if (!slider) return;
  const min = +slider.min, max = +slider.max;
  v = Math.max(min, Math.min(max, +v));
  slider.value = v;
  onModalCapChange(v);
}

function closeFundModal() {
  document.getElementById('fundModal').classList.remove('open');
  state._modalFund = null;
}

function confirmFundSelection() {
  const f = state._modalFund; if (!f) return;
  const cap = state._modalCapital;
  const existing = state.selectedFunds.find(x => x.fund_id === f.id);
  if (existing) existing.capital_eur = cap;
  else state.selectedFunds.push({ fund_id: f.id, name: f.name, capital_eur: cap });
  closeFundModal();
  toast(existing ? 'Updated commitment.' : 'Added to your portfolio.');
  if (state.page === 9) render();
}

function removeSelected(fundId) {
  state.selectedFunds = state.selectedFunds.filter(f => f.fund_id !== fundId);
  toast('Removed from selection.');
  if (state.page === 9) render();
}

function clearSelected() {
  state.selectedFunds = [];
  state.scenario = null;
  if (state.page === 9) render();
}

function fundHero(f, label, bg) {
  return `<div class="mf-hero" style="background: ${bg};">
    ${f.is_new ? '<span class="mf-badge-new">● New</span>' : ''}
    ${label ? `<span class="mf-badge-semi">⚡ ${escapeHtml(label)}</span>` : ''}
    <div class="mf-hero-logo">${escapeHtml(f.issuer || 'Moonfare')}</div>
  </div>`;
}

function fundStatsBlock(f) {
  const stats = f.stats || [];
  return `<div class="mf-stats">${stats.map((s, i) => `
    <div class="mf-stat">
      <div class="mf-stat-v">${escapeHtml(s.v)}</div>
      <div class="mf-stat-l">${escapeHtml(s.l)}<sup>${i + 1}</sup></div>
    </div>`).join('')}</div>`;
}

function renderFeaturedCard(f) {
  const seed = (f.seed_portfolio || []).slice(0, 6);
  const seedSvg = `<div class="mf-seed">
    <div class="mf-seed-eyebrow">SEED PORTFOLIO</div>
    <div class="mf-seed-grid">${seed.map(name => `<div class="mf-seed-cell">${escapeHtml(name)}</div>`).join('')}</div>
  </div>`;
  return `<div class="mf-featured-wrap">
    <div class="mf-featured-headline">${escapeHtml(f.headline || '')}</div>
    <div class="mf-featured-desc">${escapeHtml(f.description || '')}</div>
    <div class="mf-card mf-card-featured">
      ${fundHero(f, '', 'linear-gradient(140deg, #1a1a1a, #2a2a2a)')}
      <div class="mf-meta">
        <div class="mf-eyebrow">${escapeHtml(f.name)} SCSp investing in</div>
        <div class="mf-title">${escapeHtml(f.issuer)} ${escapeHtml(f.strategy)}</div>
        <div class="mf-desc">${escapeHtml(f.description || '')}</div>
        <div class="mf-tags">
          <span class="mf-tag">🌐 ${escapeHtml(f.region || '')}</span>
          <span class="mf-tag">💼 ${escapeHtml(f.strategy)}</span>
          ${(f.tags || []).map(t => `<span class="mf-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="mf-stats">
          <div class="mf-stat"><div class="mf-stat-v">${escapeHtml(f.target_fund_size || '—')}</div><div class="mf-stat-l">Target Fund Size<sup>1</sup></div></div>
          <div class="mf-stat"><div class="mf-stat-v">${escapeHtml(f.target_net_moic || '—')}</div><div class="mf-stat-l">Target Net MOIC<sup>2</sup></div></div>
          <div class="mf-stat"><div class="mf-stat-v">${escapeHtml(f.expected_initial_close || '—')}</div><div class="mf-stat-l">Expected Initial Close<sup>3</sup></div></div>
          <div class="mf-stat"><div class="mf-stat-v">€${(f.min_investment_eur || 0).toLocaleString()}</div><div class="mf-stat-l">Min. investment</div></div>
        </div>
      </div>
      ${seedSvg}
    </div>
  </div>`;
}

function renderOpenCard(f) {
  const heroBg = f.category === 'semi_liquid'
    ? 'linear-gradient(140deg, #4a6b3a, #2d4a2a)'
    : 'linear-gradient(140deg, #6d5b3e, #3a3025)';
  const badge = f.category === 'semi_liquid' ? 'Evergreen' : '';
  return `<div class="mf-card">
    ${fundHero(f, badge, heroBg)}
    <div class="mf-meta">
      <div class="mf-eyebrow">Access Feeder ${(f.id || '').toUpperCase().slice(0,4)} SCSp investing in</div>
      <div class="mf-title">${escapeHtml(f.name)}</div>
      <div class="mf-desc">${escapeHtml(f.description || '')}</div>
      <div class="mf-tags">
        <span class="mf-tag">🌐 ${escapeHtml(f.region || '')}</span>
        <span class="mf-tag">💼 ${escapeHtml(f.strategy)}</span>
        ${(f.tags || []).map(t => `<span class="mf-tag">${escapeHtml(t)}</span>`).join('')}
      </div>
      ${fundStatsBlock(f)}
    </div>
  </div>`;
}

function renderWaitlistCard(f) {
  const heroBg = 'linear-gradient(140deg, #2a3a2a, #1a2a1a)';
  return `<div class="mf-card mf-card-waitlist">
    ${fundHero(f, '', heroBg)}
    <div class="mf-meta">
      <div class="mf-eyebrow">Access Feeder ${(f.id || '').toUpperCase().slice(0,4)} SCSp investing in</div>
      <div class="mf-title">${escapeHtml(f.name)}</div>
      <div class="mf-desc">${escapeHtml(f.description || '')}</div>
      <div class="mf-tags">
        <span class="mf-tag">🌐 ${escapeHtml(f.region || '')}</span>
        <span class="mf-tag">💼 ${escapeHtml(f.strategy)}</span>
        ${(f.tags || []).map(t => `<span class="mf-tag">${escapeHtml(t)}</span>`).join('')}
      </div>
      <div style="display:flex; align-items:flex-end; gap: 14px;">
        ${fundStatsBlock(f)}
        <button class="mf-waitlist-btn">🔔 Join the Waitlist</button>
      </div>
    </div>
  </div>`;
}

// =================== CHAT ===================
async function askAlpha(question) {
  if (!question || !question.trim()) return;
  const body = $('chatBody');
  document.getElementById('chatIntro')?.remove();   // drop the empty-state once a conversation starts
  body.insertAdjacentHTML('beforeend', `<div class="row-you"><span class="bub bub-you">${escapeHtml(question)}</span></div>`);
  body.insertAdjacentHTML('beforeend', `<div id="_typing" class="chat-typing">Alpha is thinking<span class="dots"></span><span class="secs" id="_typingSecs">0s</span></div>`);
  body.scrollTop = body.scrollHeight;
  const _t0 = Date.now();
  const _heartbeat = setInterval(() => {
    const el = document.getElementById('_typingSecs');
    if (!el) { clearInterval(_heartbeat); return; }
    const s = Math.round((Date.now() - _t0) / 1000);
    el.textContent = s + 's';
  }, 500);
  // Snapshot the live UI state so Claude can adapt its answer to what the user
  // is currently looking at (page, cohort, selected funds, scenario response).
  const liveCtx = {
    page: state.page,
    cohort: state.cohort,
    perf: state.perf,
    follow: state.follow,
    benchPick: state.benchPick,
    pickedStrategy: state.pickedStrategy,
    profile: state.profile,
    selectedFunds: state.selectedFunds,
    scenario: state.scenario,
  };
  try {
    const r = await API.chat(question, liveCtx);
    clearInterval(_heartbeat);
    $('_typing')?.remove();
    const ok = r.ok;
    const answer = r.answer || '(no answer)';
    const tookS = Math.round((Date.now() - _t0) / 1000);
    body.insertAdjacentHTML('beforeend', `<div class="row-alpha"><span class="bub bub-alpha"><span class="who">Alpha${ok?'':' · error'} · ${tookS}s</span>${renderChatMarkdown(answer)}</span></div>`);
  } catch (e) {
    clearInterval(_heartbeat);
    $('_typing')?.remove();
    body.insertAdjacentHTML('beforeend', `<div class="row-alpha"><span class="bub bub-alpha"><span class="who">Alpha · error</span>Connection failed: ${escapeHtml(e.message)}</span></div>`);
  }
  body.scrollTop = body.scrollHeight;
}
function toggleChat() { $('chatPane').classList.toggle('collapsed'); }

// =================== SHELL ===================
async function enterApp() {
  $('welcome').style.opacity = '0';
  setTimeout(() => $('welcome').remove(), 250);
  await bootstrap();
  render();
}
function onProfileChange() {
  state.profile.targetPct = +$('targetPct').value;
  state.profile.risk      = $('risk').value;
  state.profile.horizon   = $('horizon').value;
  $('targetPctVal').innerHTML = state.profile.targetPct + '%<span style="font-weight:400;color:var(--mf-muted);font-size:10px;"> modelled</span>';
  render();
}
async function rotateInvestor() {
  toast('Rotating to another real investor…');
  const res = await api('/api/rotate_investor', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
  await bootstrap();
  render();
  if (res && res.ok) {
    toast(`Now investor ${res.investor_id} · ${res.profession} · ${res.region} · ${res.n_strategies} strategies · MOIC ${res.moic ?? '—'}`);
  } else {
    toast('Rotate failed: ' + (res && res.error || 'unknown'));
  }
}
function replayNotif(fig) {
  const o = fig.querySelector('.notif-overlay'); if (!o) return;
  o.classList.remove('show'); void o.offsetWidth;          // reset, force reflow
  setTimeout(() => o.classList.add('show'), 40);           // slide back in (slow transition)
}
const _sleep = ms => new Promise(r => setTimeout(r, ms));
function _loadImg(src){ return new Promise(res=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; }); }
async function _recolorLogoIcon(rgb){
  const img = await _loadImg('/static/assets/logos/moonfare.png'); if(!img) return null;
  const c=document.createElement('canvas'); c.width=img.naturalWidth||32; c.height=img.naturalHeight||32;
  const x=c.getContext('2d'); x.drawImage(img,0,0);
  try{ const d=x.getImageData(0,0,c.width,c.height);
    for(let i=0;i<d.data.length;i+=4){ if(d.data[i+3]>10){ d.data[i]=rgb[0]; d.data[i+1]=rgb[1]; d.data[i+2]=rgb[2]; } }
    x.putImageData(d,0,0); return {url:c.toDataURL('image/png'), w:c.width, h:c.height};
  }catch(e){ return null; }
}
async function _recolorLogo(rgb){
  const img = await _loadImg('/static/moonfare_logo.png'); if(!img) return null;
  const c=document.createElement('canvas'); c.width=img.naturalWidth||img.width; c.height=img.naturalHeight||img.height;
  const x=c.getContext('2d'); x.drawImage(img,0,0);
  try{ const d=x.getImageData(0,0,c.width,c.height);
    for(let i=0;i<d.data.length;i+=4){ if(d.data[i+3]>10){ d.data[i]=rgb[0]; d.data[i+1]=rgb[1]; d.data[i+2]=rgb[2]; } }
    x.putImageData(d,0,0); return {url:c.toDataURL('image/png'), w:c.width, h:c.height};
  }catch(e){ return null; }
}
async function exportPDF() {
  if (!window.jspdf || !window.html2canvas) { toast('PDF libraries still loading — try again in a second.'); return; }
  toast('Building report in the background…');
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4', compress:true });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const BLUE = [44,45,254];   // #2C2DFE
    const name = cache.you?.profile?.display_name || 'Investor';

    let blurbs = {}, summary = '';
    try { const r = await api('/api/report_blurbs'); blurbs = r.blurbs||{}; summary = r.summary||''; } catch(e){}

    // transparent-bg logos generated from the real wordmark: white for the blue cover, dark for white pages
    const darkLogo  = await _loadImg('/static/moonfare_logo_dark.png');
    const whiteLogo = await _loadImg('/static/moonfare_logo_white.png');
    const headerLogo = (pageW=W) => { const lg = darkLogo; if(lg){ const h=15, w=h*(lg.width/lg.height); try{ doc.addImage(lg,'PNG',pageW-44-w,24,w,h);}catch(e){} } };

    // ----- Page 1: blue cover (white Moonfare wordmark, investor name) -----
    doc.setFillColor(...BLUE); doc.rect(0,0,W,H,'F');
    if (whiteLogo){ const lw=230, lh=lw*(whiteLogo.height/whiteLogo.width); doc.addImage(whiteLogo,'PNG',(W-lw)/2, H/2-70-lh, lw, lh); }
    else { doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(46); doc.text('Moonfare', W/2, H/2-60, {align:'center'}); }
    doc.setTextColor(214,216,255); doc.setFont('helvetica','normal'); doc.setFontSize(11);
    doc.text('ALPHA · PRIVATE MARKETS PORTFOLIO REVIEW', W/2, H/2-20, {align:'center'});
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(24);
    doc.text(name, W/2, H/2+24, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(207,208,255);
    doc.text(new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}), W/2, H/2+48, {align:'center'});

    // ----- Page 2: Table of contents + executive summary -----
    doc.addPage(); headerLogo();
    doc.setTextColor(17,17,17); doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.text('Contents', 48, 84);
    doc.setFont('helvetica','normal'); doc.setFontSize(12); doc.setTextColor(40,40,40);
    PAGES.forEach((p,i)=> doc.text(`${i+1}.   ${p.label.replace(/^\d+\s·\s/,'')}`, 56, 124 + i*22));
    if (summary){ const y0 = 124 + PAGES.length*22 + 28;
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(17,17,17); doc.text('Executive summary', 48, y0);
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(60,60,60);
      doc.text(doc.splitTextToSize(summary, W-96), 48, y0+18); }

    // ----- render every dashboard page OFF-SCREEN in a hidden iframe so the visible app is never
    //       disturbed (no tab-flipping). The iframe is a second app instance bound to the SAME
    //       investor; we drive its goPage() and capture its #grid, then throw it away. -----
    const KEYS = ['overview','region','format','strategy','sector','performance','vintage','follower','opportunities'];
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden','true');
    ifr.style.cssText = 'position:fixed; left:-100000px; top:0; width:1600px; height:1040px; border:0; opacity:0; pointer-events:none;';
    document.body.appendChild(ifr);
    try {
      await new Promise((res) => { ifr.onload = () => res(); ifr.src = '/static/index.html'; setTimeout(res, 9000); });
      const iw = ifr.contentWindow, idoc = ifr.contentDocument;
      // boot the off-screen instance and wait for its data to load (cache/state are lexical, so we
      // drive it through window.* functions + the __pdf* bridge helpers, not iw.cache directly)
      if (typeof iw.enterApp === 'function') iw.enterApp();
      for (let k=0;k<200;k++){ if (typeof iw.__pdfReady === 'function' && iw.__pdfReady()) break; await _sleep(100); }
      if (!(typeof iw.__pdfReady === 'function' && iw.__pdfReady())) throw new Error('off-screen report instance did not load data');
      // mirror the user's current profile so the report matches what they're looking at
      try {
        iw.__pdfApplyProfile(JSON.parse(JSON.stringify(state.profile)));
        const tp = idoc.getElementById('targetPct'); if (tp) tp.value = state.profile.targetPct;
        const rk = idoc.getElementById('risk');      if (rk) rk.value = state.profile.risk;
        const hz = idoc.getElementById('horizon');   if (hz) hz.value = state.profile.horizon;
      } catch(e){}
      // instant (no-animation) renders for clean captures + hide side panels so charts get full width
      try { iw.Chart.defaults.animation = false; iw.Chart.defaults.animations = {}; } catch(e){}
      try { idoc.getElementById('cohortPanel').style.display='none'; idoc.getElementById('chatPane').style.display='none'; } catch(e){}
      const igrid = idoc.getElementById('grid');

      for (let i=0;i<PAGES.length;i++){
        iw.goPage(PAGES[i].id);
        await _sleep(380);                            // DOM + chart paint (animation disabled)
        // Swap every live <canvas> for a pixel-perfect snapshot so html2canvas never re-runs Chart.js.
        const shot = await html2canvas(igrid, {scale:2, backgroundColor:'#ffffff', logging:false, useCORS:true,
          onclone: (cdoc) => {
            igrid.querySelectorAll('canvas').forEach(lc => {
              try {
                const cc = lc.id ? cdoc.getElementById(lc.id) : null; if (!cc) return;
                const w = lc.clientWidth || lc.width, h = lc.clientHeight || lc.height;
                const img = cdoc.createElement('img');
                img.src = lc.toDataURL('image/png');
                img.style.cssText = cc.style.cssText; img.style.display = 'block';
                img.style.width = w + 'px'; img.style.height = h + 'px';
                cc.parentNode.replaceChild(img, cc);
              } catch (e) {}
            });
          }});
        // Graph pages are LANDSCAPE (wide) so the dashboard charts get full width.
        doc.addPage('a4','landscape');
        const LW = doc.internal.pageSize.getWidth(), LH = doc.internal.pageSize.getHeight();
        headerLogo(LW);
        doc.setTextColor(17,17,17); doc.setFont('helvetica','bold'); doc.setFontSize(15);
        doc.text(`${i+1}. ${PAGES[i].label.replace(/^\d+\s·\s/,'')}`, 48, 60);
        const blurb = blurbs[KEYS[i]] || '';
        const blurbLines = blurb ? doc.splitTextToSize(blurb, LW-96) : [];
        const blurbH = blurbLines.length ? blurbLines.length*12 + 20 : 0;
        const maxW = LW-96, maxH = LH - 88 - blurbH - 30;
        let iwd = maxW, ih = iwd*(shot.height/shot.width);
        if (ih > maxH){ ih = maxH; iwd = ih*(shot.width/shot.height); }
        doc.addImage(shot.toDataURL('image/png'), 'PNG', (LW-iwd)/2, 76, iwd, ih, '', 'FAST');
        if (blurb){ const by = 76+ih+20;
          doc.setFont('helvetica','italic'); doc.setFontSize(9.5); doc.setTextColor(60,60,60);
          doc.text(blurbLines, 48, by); }
        toast(`Building report… ${i+1}/${PAGES.length}`);
      }
    } finally {
      ifr.remove();
    }
    if (window.__pdfdump) { try { await fetch('/api/_pdfdump', {method:'POST', headers:{'Content-Type':'text/plain'}, body: doc.output('datauristring')}); } catch(e){} }
    doc.save(`Moonfare_Alpha_Review_${name.replace(/[^a-z0-9]+/gi,'_')}.pdf`);
    toast('PDF downloaded.');
  } catch (e) {
    console.error('PDF build failed', e); toast('PDF build failed: ' + e.message);
  }
}
async function refreshDB() {
  toast('Refreshing database from data/ files…');
  await API.refresh();
  await bootstrap();
  render();
  toast('Database refreshed.');
}

window.addEventListener('resize', () => { if (!document.getElementById('welcome')) render(); });
