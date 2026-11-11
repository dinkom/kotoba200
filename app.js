// Kotoba 200 — osobna aplikacija za japanski (romaji + hrvatski)
'use strict';

/* ---------- stanje ---------- */
const KEY = 'kotoba200';
const INT = [1, 2, 4, 8, 16, 32]; // dani do sljedećeg ponavljanja po kutiji
const DEF = { done: {}, srs: {}, xp: 0, streak: { last: null, n: 0 }, set: { slow: false, auto: true } };
let st;
try { st = Object.assign(structuredClone(DEF), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = structuredClone(DEF); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const TOTAL = DAYS.length;

// prijelaz sa stare podjele (30 dana) na lekcije
function migrate() {
  if (st.v === 2) return;
  const oldDone = st.done || {}, oldSrs = st.srs || {};
  const done = {}, srs = {};
  for (const id in oldSrs) if (MIGR[id]) srs[MIGR[id]] = oldSrs[id];
  const okL = n => { const ds = MIGR_DAYS[n] || []; return ds.length > 0 && ds.every(d => oldDone[d] != null); };
  const when = n => Math.max(...(MIGR_DAYS[n] || []).map(d => oldDone[d] || 0));
  for (const L of DAYS) {
    if (!L.c && okL(L.n)) done[L.n] = when(L.n);
    if (L.c) {
      const prev = DAYS[L.n - 2], nxt = DAYS[L.n];
      if (prev && okL(prev.n) && nxt && !nxt.c && okL(nxt.n)) done[L.n] = when(prev.n);
    }
  }
  st.done = done; st.srs = srs; st.v = 2; save();
}
migrate();
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);

let view = 'home', viewDay = null, S = null, dictQ = '';

/* ---------- pomoćno ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const toks = s => s[0].split(' ');
const formula = d => {
  if (d.c) return 'Ponavljanje i miješanje obrazaca';
  if (d.pats.length) return d.pats.map(p => p.f).join('  ·  ');
  for (let n = d.n - 1; n >= 1; n--) { const p = DAYS[n - 1].pats; if (p && p.length) return p[p.length - 1].f; }
  return '';
};
function romajiLine(s) {
  const end = /[?]$/.test(s[2]) ? '?' : /!$/.test(s[2]) ? '!' : '.';
  return cap(s[0]) + end;
}
function item(id) {
  const m = /^([ws])(\d+)_(\d+)$/.exec(id); if (!m) return null;
  const d = DAYS[+m[2] - 1]; if (!d) return null;
  const data = (m[1] === 'w' ? d.w : d.s)[+m[3]]; if (!data) return null;
  return { id, kind: m[1], day: +m[2], i: +m[3], data };
}
const nextDay = () => { for (const d of DAYS) if (!st.done[d.n]) return d.n; return null; };
const dueIds = () => Object.keys(st.srs).filter(id => st.srs[id].d <= today() && item(id));
const learnedWords = () => DAYS.filter(d => st.done[d.n]).flatMap(d => d.w.map((w, i) => ({ id: `w${d.n}_${i}`, w, day: d.n })));
function toast(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); }

const I = {
  spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

/* ---------- glas (izgovor) ---------- */
let jaVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
  jaVoice = vs.find(v => /google/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, rate) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP'; if (jaVoice) u.voice = jaVoice;
  u.rate = rate || (st.set.slow ? 0.6 : 0.9);
  speechSynthesis.speak(u);
}

/* ---------- prepoznavanje govora ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function listen(onDone) {
  if (!SR) { onDone(null, 'nosupport'); return; }
  try { speechSynthesis.cancel(); } catch (e) {}
  rec = new SR(); rec.lang = 'ja-JP'; rec.interimResults = false; rec.maxAlternatives = 5;
  let got = false;
  rec.onresult = e => { got = true; const r = e.results[0]; const alts = []; for (let i = 0; i < r.length; i++) alts.push(r[i].transcript); onDone(alts); };
  rec.onerror = e => { got = true; onDone(null, e.error); };
  rec.onend = () => { rec = null; if (!got) onDone([], 'nospeech'); };
  rec.start();
}
const normJa = s => s.replace(/[\s、。！？!?,.「」・ー〜~]/g, '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function lcs(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) { const cur = [0]; for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); prev = cur; }
  return prev[n];
}
function score(alts, data) {
  const vars = [normJa(data[1]), normJa(data[3])];
  let best = 0;
  for (const a of alts || []) { const x = normJa(a); for (const v of vars) { if (!x || !v) continue; best = Math.max(best, 2 * lcs(x, v) / (x.length + v.length)); } }
  return best;
}

/* ---------- SRS i napredak ---------- */
function grade(id, ok) {
  const t = today(), c = st.srs[id] || { b: 0, d: t };
  if (ok) { c.b = Math.min(c.b + 1, INT.length - 1); c.d = t + INT[c.b]; } else { c.b = 0; c.d = t + 1; }
  st.srs[id] = c;
}
function touchStreak() {
  const t = today(), s = st.streak;
  if (s.last === t) return;
  s.n = s.last === t - 1 ? s.n + 1 : 1; s.last = t;
}
const streakNow = () => (st.streak.last >= today() - 1 ? st.streak.n : 0);

/* ---------- sesije ---------- */
function startLesson(n, practice) {
  const d = DAYS[n - 1];
  const steps = [{ t: 'intro' }];
  d.w.forEach((w, i) => steps.push({ t: 'learn', id: `w${n}_${i}` }));
  shuffle(d.w.map((w, i) => i)).forEach(i => steps.push({ t: 'quiz', id: `w${n}_${i}` }));
  d.pats.forEach((p, k) => steps.push({ t: 'pattern', k }));
  (d.c ? shuffle(d.s.map((s, i) => i)) : d.s.map((s, i) => i)).forEach(i => steps.push({ t: toks(d.s[i]).length >= 2 ? 'build' : 'speak', id: `s${n}_${i}` }));
  shuffle(d.s.map((s, i) => i)).slice(0, 4).forEach(i => steps.push({ t: 'speak', id: `s${n}_${i}` }));
  S = { kind: 'lesson', day: n, practice: !!practice, steps, i: 0, ui: {}, ok: 0, total: 0, xp: 0, retried: {} };
  view = 'sess'; render(); afterRender();
}
function startReview() {
  const ids = shuffle(dueIds()).slice(0, 30);
  if (!ids.length) { toast('Nema ništa za ponavljanje'); return; }
  const steps = ids.map(id => {
    const it = item(id);
    if (it.kind === 'w') return { t: 'recall', id };
    const b = st.srs[id].b;
    return { t: (b % 2 === 0 && toks(it.data).length >= 2) ? 'build' : 'speak', id };
  });
  S = { kind: 'review', steps, i: 0, ui: {}, ok: 0, total: 0, xp: 0, retried: {}, graded: {} };
  view = 'sess'; render(); afterRender();
}
function result(ok) {
  const step = S.steps[S.i];
  if (step.id && !S.retried[S.i]) {
    S.total++; if (ok) { S.ok++; S.xp += 10; }
    if (S.kind === 'review' && !S.graded[step.id]) { grade(step.id, ok); S.graded[step.id] = 1; }
  }
  if (!ok && !S.retried[S.i]) { S.steps.push(Object.assign({}, step)); S.retried[S.steps.length - 1] = 1; }
}
function next() {
  S.i++; S.ui = {};
  if (S.i >= S.steps.length) return finish();
  render(); afterRender();
}
function finish() {
  st.xp += S.xp;
  if (S.kind === 'lesson' && !S.practice) {
    const d = DAYS[S.day - 1], t = today();
    st.done[S.day] = t;
    d.w.forEach((w, i) => { const id = `w${S.day}_${i}`; if (!st.srs[id]) st.srs[id] = { b: 0, d: t + 1 }; });
    d.s.forEach((s, i) => { const id = `s${S.day}_${i}`; if (!st.srs[id]) st.srs[id] = { b: 0, d: t + 1 }; });
  }
  touchStreak(); save();
  S.finished = true; render();
}
function quit() { if (rec) try { rec.abort(); } catch (e) {} S = null; view = 'home'; render(); }

function afterRender() {
  if (!S || S.finished) return;
  const step = S.steps[S.i];
  if (!st.set.auto) return;
  if (step.t === 'learn' || step.t === 'quiz') setTimeout(() => say(item(step.id).data[1]), 250);
}

/* ---------- prikaz sesije ---------- */
function sessView() {
  if (S.finished) {
    const pct = S.total ? Math.round(100 * S.ok / S.total) : 100;
    const title = S.kind === 'review' ? 'Ponavljanje gotovo' : `Lekcija ${S.day} gotova`;
    return `<div class="stage" style="justify-content:center;text-align:center">
      <div class="done-big">お疲れ</div>
      <div class="note" style="margin:6px 0 18px">otsukare — dobro odrađeno</div>
      <div class="mid">${title}</div>
      <div class="row" style="margin:18px 0">
        <div class="card" style="margin:0"><div class="mid">${pct}%</div><div class="note">točno</div></div>
        <div class="card" style="margin:0"><div class="mid">+${S.xp}</div><div class="note">XP</div></div>
        <div class="card" style="margin:0"><div class="mid">${streakNow()}</div><div class="note">dana zaredom</div></div>
      </div>
      <div class="spacer"></div>
      <div class="acts"><button class="btn red" data-a="quit">Natrag</button></div></div>`;
  }
  const step = S.steps[S.i], u = S.ui;
  const prog = Math.round(100 * S.i / S.steps.length);
  let body = '';
  const d = S.day ? DAYS[S.day - 1] : null;
  const it = step.id ? item(step.id) : null;
  const D = it && it.data;

  if (step.t === 'intro') {
    body = `<div class="lbl">Lekcija ${d.n} od ${TOTAL}</div><div class="big">${esc(d.t)}</div>
      <div class="pat">${esc(formula(d))}</div>
      <p class="note">${d.c ? 'Nema novih riječi. Slažeš i izgovaraš rečenice koje miješaju obrasce iz prethodnih lekcija.'
        : `${d.w.length} novih riječi${d.pats.length ? (d.pats.length > 1 ? ' i dva obrasca' : ' i jedan obrazac') : ''}. Riječi prvo upoznaš, onda od njih slažeš rečenice i izgovaraš ih naglas.`}</p>
      <div class="spacer"></div><div class="acts"><button class="btn red" data-a="next">Kreni</button></div>`;
  }
  else if (step.t === 'learn') {
    body = `<div class="lbl">Nova riječ</div><div class="big">${esc(D[0])}</div><div class="hr">${esc(D[2])}</div>
      ${icons(true)}${speakFb()}
      <div class="spacer"></div><div class="acts"><button class="btn" data-a="nextok">Dalje</button></div>`;
  }
  else if (step.t === 'quiz') {
    if (!u.opts) {
      const pool = d.w.filter(w => w[2] !== D[2]).map(w => w[2]);
      const extra = shuffle(DAYS.flatMap(x => x.w).map(w => w[2]).filter(h => h !== D[2] && !pool.includes(h)));
      u.opts = shuffle([D[2], ...shuffle(pool).concat(extra).slice(0, 3)]);
    }
    body = `<div class="lbl">Što znači?</div><div class="big">${esc(D[0])}</div>
      <div class="icons"><button class="ic" data-a="say">${I.spk}</button></div>
      <div>${u.opts.map((o, k) => {
        let c = ''; if (u.choice != null) { if (o === D[2]) c = 'ok'; else if (k === u.choice) c = 'bad'; }
        return `<button class="opt ${c}" data-a="pick" data-k="${k}" ${u.choice != null ? 'disabled' : ''}>${esc(o)}</button>`;
      }).join('')}</div>
      <div class="spacer"></div>${u.choice != null ? '<div class="acts"><button class="btn" data-a="next">Dalje</button></div>' : ''}`;
  }
  else if (step.t === 'pattern') {
    const P = d.pats[step.k];
    body = `<div class="lbl">Obrazac · ${esc(P.t)}</div><div class="pat">${esc(P.f)}</div>
      <p style="font-size:17px">${esc(P.e)}</p>
      <div>${d.s.map((s, k) => [s, k]).slice(step.k * 3, step.k * 3 + 3).map(([s, k]) => exRow(s, `s${d.n}_${k}`)).join('')}</div>
      <div class="spacer"></div><div class="acts"><button class="btn red" data-a="next">${d.s.length ? 'Dalje' : 'Završi'}</button></div>`;
  }
  else if (step.t === 'build') {
    if (!u.tiles) {
      const tk = toks(D), low = tk.map(x => x.toLowerCase());
      const maxDay = S.day || Math.max(1, ...Object.keys(st.done).map(Number));
      const pool = [...new Set(DAYS.slice(0, maxDay).flatMap(x => x.s.flatMap(s => toks(s))))].filter(x => !low.includes(x.toLowerCase()));
      u.tiles = shuffle(tk.concat(shuffle(pool).slice(0, Math.min(3, Math.max(2, 7 - tk.length)))));
      u.picked = [];
    }
    const ans = u.picked.map(k => u.tiles[k]);
    body = `<div class="lbl">Složi rečenicu</div><div class="mid">${esc(D[2])}</div>
      <div class="slots">${u.picked.map((k, p) => `<button class="tile" data-a="unpick" data-p="${p}" ${u.checked ? 'disabled' : ''}>${esc(u.tiles[k])}</button>`).join('')}</div>
      <div class="tiles">${u.tiles.map((t, k) => `<button class="tile ${u.picked.includes(k) ? 'used' : ''}" data-a="tap" data-k="${k}" ${u.checked ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
      ${u.checked ? `<div class="fb ${u.ok ? 'ok' : 'bad'}"><b>${u.ok ? 'Točno!' : 'Ne baš. Točno je:'}</b><div class="ans">${esc(romajiLine(D))}</div></div>
        <div class="icons"><button class="ic" data-a="say">${I.spk}</button></div>` : ''}
      <div class="spacer"></div><div class="acts">${u.checked ? '<button class="btn" data-a="next">Dalje</button>' : `<button class="btn red" data-a="check" ${ans.length ? '' : 'disabled'}>Provjeri</button>`}</div>`;
  }
  else if (step.t === 'speak') {
    const done = u.ok || u.revealed;
    body = `<div class="lbl">Reci na japanskom</div><div class="mid">${esc(D[2])}</div>
      ${done ? `<div class="fb ${u.ok ? 'ok' : 'bad'}"><b>${u.ok ? (u.score >= 0.8 ? 'Odlično!' : 'Prihvaćeno!') : 'Odgovor:'}</b><div class="ans">${esc(romajiLine(D))}</div></div>
        <div class="icons"><button class="ic" data-a="say">${I.spk}</button></div>` : ''}
      ${!done ? `<div class="icons" style="justify-content:center;margin:28px 0"><button class="ic ${u.rec ? 'rec' : ''}" style="width:84px;height:84px" data-a="mic">${I.mic}</button></div>
        <p class="note" style="text-align:center">${u.rec ? 'Slušam…' : SR ? 'Dodirni mikrofon i izgovori rečenicu' : 'Mikrofon nije podržan. Reci naglas pa otkrij odgovor.'}</p>${speakMsg()}` : ''}
      <div class="spacer"></div><div class="acts">
      ${u.ok ? '<button class="btn" data-a="next">Dalje</button>'
        : u.revealed ? '<div class="grade"><button class="btn ghost" data-a="self" data-v="0">Nisam znao</button><button class="btn" data-a="self" data-v="1">Znao sam</button></div>'
        : '<button class="btn ghost" data-a="reveal">Pokaži odgovor</button>'}</div>`;
  }
  else if (step.t === 'recall') {
    body = `<div class="lbl">Kako se kaže?</div><div class="mid">${esc(D[2])}</div>
      ${u.revealed ? `<div class="big" style="margin-top:18px">${esc(D[0])}</div>${icons(true)}${speakFb()}` : ''}
      <div class="spacer"></div><div class="acts">
      ${u.revealed ? '<div class="grade"><button class="btn ghost" data-a="self" data-v="0">Nisam znao</button><button class="btn" data-a="self" data-v="1">Znao sam</button></div>'
        : '<button class="btn red" data-a="reveal">Pokaži</button>'}</div>`;
  }
  return `<div class="sess-top"><button class="x" data-a="quit" aria-label="Zatvori">×</button><div class="bar"><i style="width:${prog}%"></i></div></div>
    <div class="stage">${body}</div>`;
}
function icons(withMic) {
  const u = S.ui;
  return `<div class="icons"><button class="ic" data-a="say">${I.spk}</button>${withMic && SR ? `<button class="ic ${u.rec ? 'rec' : ''}" data-a="mic">${I.mic}</button>` : ''}</div>`;
}
function speakFb() {
  const u = S.ui; if (u.rec) return '<p class="note">Slušam…</p>';
  if (u.score == null) return '';
  return u.score >= 0.55 ? `<div class="fb ok"><b>${u.score >= 0.8 ? 'Odlično izgovoreno!' : 'Dobro, prepoznato.'}</b></div>` : speakMsg();
}
function speakMsg() {
  const u = S.ui;
  if (u.err === 'not-allowed' || u.err === 'service-not-allowed') return '<div class="fb bad"><b>Mikrofon je blokiran.</b>Dopusti ga u postavkama preglednika.</div>';
  if (u.err === 'nospeech' || u.err === 'no-speech') return '<div class="fb bad"><b>Nisam ništa čuo.</b>Pokušaj ponovno, malo glasnije.</div>';
  if (u.err && u.err !== 'nosupport') return `<div class="fb bad"><b>Greška mikrofona</b>${esc(u.err)}</div>`;
  if (u.score != null && u.score < 0.55) return `<div class="fb bad"><b>Još ne. Pokušaj ponovno.</b>${u.heard ? `<div class="heard">Čuo sam: ${esc(u.heard)}</div>` : ''}</div>`;
  return '';
}
function exRow(s, id) {
  return `<div class="ex"><div class="t"><div class="r">${esc(romajiLine(s))}</div><div class="h">${esc(s[2])}</div></div><button class="mini" data-a="sayid" data-id="${id}">${I.spk}</button></div>`;
}

/* ---------- glavni ekrani ---------- */
function homeView() {
  const nd = nextDay(), due = dueIds().length, lw = learnedWords().length, total = DAYS.reduce((a, d) => a + d.w.length, 0);
  let html = `<div class="top"><div class="brand"><div class="sun">言</div>Kotoba 200</div>
    <div class="stats"><span class="chip">🔥 ${streakNow()}</span><span class="chip">${st.xp} XP</span></div></div>`;
  if (due) html += `<div class="card hero"><div class="k">Ponavljanje</div><h2>${due} ${due === 1 ? 'stavka čeka' : due < 5 ? 'stavke čekaju' : 'stavki čeka'}</h2>
    <div class="f">Najprije ponovi, onda nova lekcija.</div><button class="btn red" data-a="review">Ponovi sada</button></div>`;
  if (nd) {
    const d = DAYS[nd - 1];
    html += `<div class="card hero"><div class="k">Lekcija ${nd} / ${TOTAL}${d.c ? ' · kombiniranje' : ''}</div><h2>${esc(d.t)}</h2><div class="f">${esc(formula(d))}</div>
      <button class="btn ${due ? '' : 'red'}" data-a="lesson" data-n="${nd}">Započni lekciju</button></div>`;
  } else {
    html += `<div class="card hero"><div class="k">Sve lekcije</div><h2>Gotovo! すごい!</h2><div class="f">Nastavi s ponavljanjem svaki dan da riječi ostanu.</div></div>`;
  }
  html += `<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>Naučene riječi</b><span class="note">${lw} / ${total}</span></div>
    <div class="bar"><i style="width:${100 * lw / total}%"></i></div></div>
    <div class="sec">${TOTAL} lekcija</div><div class="days">${DAYS.map(d => {
      const c = st.done[d.n] != null ? 'done' : d.n === nd ? 'cur' : 'lock';
      return `<button class="day ${c} ${d.c ? 'combo' : ''}" data-a="day" data-n="${d.n}">${d.c ? '✦' : d.n}</button>`;
    }).join('')}</div>`;
  return html;
}
function dayView() {
  const d = DAYS[viewDay - 1], ok = st.done[d.n] != null || d.n === nextDay();
  return `<div class="top"><button class="x" data-a="home" aria-label="Natrag">‹</button><div class="brand" style="font-size:19px">${d.n}. ${esc(d.t)}</div></div>
    ${d.c ? '<p class="note">Lekcija kombiniranja: rečenice koje miješaju obrasce iz prethodnih lekcija.</p>' : ''}
    ${d.pats.map(p => `<div class="pat">${esc(p.f)}</div><p>${esc(p.e)}</p>`).join('')}
    ${d.w.length ? '<div class="sec">Riječi</div>' : ''}<div class="card" style="padding:4px 16px;${d.w.length ? '' : 'display:none'}">${d.w.map((w, i) => `<div class="ex"><div class="t"><div class="r">${esc(w[0])}</div><div class="h">${esc(w[2])}</div></div><button class="mini" data-a="sayid" data-id="w${d.n}_${i}">${I.spk}</button></div>`).join('')}</div>
    <div class="sec">Rečenice</div><div class="card" style="padding:4px 16px">${d.s.map((s, i) => exRow(s, `s${d.n}_${i}`)).join('')}</div>
    ${ok ? `<button class="btn red" data-a="lesson" data-n="${d.n}" data-p="${st.done[d.n] != null ? 1 : 0}">${st.done[d.n] != null ? 'Ponovi lekciju' : 'Započni lekciju'}</button>` : '<p class="note">Ova lekcija se otključava kad završiš prethodne.</p>'}`;
}
function dictView() {
  const q = dictQ.trim().toLowerCase();
  const all = learnedWords();
  const list = all.filter(x => !q || x.w[0].toLowerCase().includes(q) || x.w[2].toLowerCase().includes(q));
  return `<div class="top"><div class="brand">Rječnik</div><div class="stats"><span class="chip">${all.length} riječi</span></div></div>
    <input class="search" id="q" placeholder="Traži (romaji ili hrvatski)" value="${esc(dictQ)}">
    ${all.length ? `<div class="card" style="padding:4px 16px">${list.map(x => `<div class="ex"><div class="t"><div class="r">${esc(x.w[0])}</div><div class="h">${esc(x.w[2])} · lekcija ${x.day}</div></div><button class="mini" data-a="sayid" data-id="${x.id}">${I.spk}</button></div>`).join('') || '<p class="note">Nema rezultata.</p>'}</div>`
      : '<p class="note">Ovdje će se skupljati riječi iz završenih lekcija.</p>'}`;
}
function setView() {
  const seg = (k, a, b) => `<div class="seg"><button class="${!st.set[k] ? 'on' : ''}" data-a="set" data-k="${k}" data-v="0">${a}</button><button class="${st.set[k] ? 'on' : ''}" data-a="set" data-k="${k}" data-v="1">${b}</button></div>`;
  return `<div class="top"><div class="brand">Postavke</div></div>
    <div class="card">
      <div class="set"><div><b>Brzina izgovora</b></div>${seg('slow', 'Normalno', 'Sporo')}</div>
      <div class="set"><div><b>Automatski izgovor</b><div class="note">Riječ se izgovori čim se pojavi</div></div>
        <div class="seg"><button class="${st.set.auto ? 'on' : ''}" data-a="set" data-k="auto" data-v="1">Da</button><button class="${!st.set.auto ? 'on' : ''}" data-a="set" data-k="auto" data-v="0">Ne</button></div></div>
      <div class="set"><div><b>Japanski glas</b><div class="note">${jaVoice ? esc(jaVoice.name) : 'Nije pronađen. Instaliraj japanski u postavkama pretvaranja teksta u govor.'}</div></div><button class="btn small ghost" data-a="test">Probaj</button></div>
      <div class="set"><div><b>Mikrofon</b><div class="note">${SR ? 'Prepoznavanje govora je dostupno' : 'Nije podržano u ovom pregledniku (koristi Chrome)'}</div></div></div>
    </div>
    <div class="sec">Napredak</div>
    <div class="card">
      <p class="note" style="margin-top:0">Napredak se sprema samo na ovom uređaju. Za prijenos kopiraj kod i zalijepi ga na drugom uređaju.</p>
      <div class="row"><button class="btn small ghost" data-a="export">Kopiraj kod</button><button class="btn small ghost" data-a="import">Uvezi kod</button></div>
      <textarea id="io" placeholder="Ovdje zalijepi kod za uvoz" style="margin-top:10px"></textarea>
      <button class="btn small ghost" style="margin-top:12px;color:var(--red)" data-a="reset">Obriši sav napredak</button>
    </div>`;
}
function nav() {
  const b = (v, ic, t) => `<button class="${view === v || (v === 'home' && view === 'day') ? 'on' : ''}" data-a="go" data-v="${v}">${ic}${t}</button>`;
  return `<nav class="nav"><div>${b('home', I.home, 'Početna')}${b('dict', I.book, 'Rječnik')}${b('set', I.gear, 'Postavke')}</div></nav>`;
}
function render() {
  const app = $('#app');
  if (view === 'sess' && S) { app.innerHTML = sessView(); return; }
  app.innerHTML = (view === 'dict' ? dictView() : view === 'set' ? setView() : view === 'day' ? dayView() : homeView()) + nav();
  if (view === 'dict') { const q = $('#q'); q.oninput = () => { dictQ = q.value; const pos = q.selectionStart; render(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); }; }
}

/* ---------- događaji ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a;
  const step = S && !S.finished ? S.steps[S.i] : null, u = S && S.ui;
  const D = step && step.id ? item(step.id).data : null;
  switch (a) {
    case 'go': view = el.dataset.v; window.scrollTo(0, 0); render(); break;
    case 'home': view = 'home'; render(); break;
    case 'day': {
      const n = +el.dataset.n, nd = nextDay();
      if (st.done[n] == null && n !== nd) { toast(`Prvo završi lekciju ${nd}`); break; }
      viewDay = n; view = 'day'; window.scrollTo(0, 0); render(); break;
    }
    case 'lesson': startLesson(+el.dataset.n, el.dataset.p === '1'); break;
    case 'review': startReview(); break;
    case 'quit': quit(); break;
    case 'next': next(); break;
    case 'nextok': if (step.t === 'learn' && u.score == null) {} next(); break;
    case 'say': if (D) say(D[1]); break;
    case 'sayid': { const it = item(el.dataset.id); if (it) say(it.data[1]); break; }
    case 'pick': {
      u.choice = +el.dataset.k; const ok = u.opts[u.choice] === D[2];
      result(ok); render(); if (ok) say(D[1]); break;
    }
    case 'tap': u.picked.push(+el.dataset.k); render(); break;
    case 'unpick': u.picked.splice(+el.dataset.p, 1); render(); break;
    case 'check': {
      const ans = u.picked.map(k => u.tiles[k].toLowerCase()).join(' ');
      u.ok = ans === D[0].toLowerCase(); u.checked = true; result(u.ok); render(); say(D[1]); break;
    }
    case 'mic': {
      if (rec) { try { rec.stop(); } catch (x) {} break; }
      if (!SR) { u.err = 'nosupport'; render(); break; }
      u.rec = true; u.err = null; render();
      listen((alts, err) => {
        if (!S || S.steps[S.i] !== step) return;
        u.rec = false;
        if (err && !(alts && alts.length)) { u.err = err; u.score = null; render(); return; }
        u.score = score(alts, D); u.heard = alts && alts[0];
        if (step.t === 'speak' && u.score >= 0.55) { u.ok = true; result(true); say(D[1]); }
        render();
      });
      break;
    }
    case 'reveal': u.revealed = true; if (rec) try { rec.abort(); } catch (x) {} render(); say(D[1]); break;
    case 'self': result(el.dataset.v === '1'); next(); break;
    case 'set': st.set[el.dataset.k] = el.dataset.v === '1'; save(); render(); break;
    case 'test': say('こんにちは。日本語を勉強しています。'); break;
    case 'export': {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
      $('#io').value = code;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Kod kopiran'), () => toast('Kod je u polju ispod'));
      break;
    }
    case 'import': {
      try { const o = JSON.parse(decodeURIComponent(escape(atob($('#io').value.trim())))); if (!o.srs) throw 0; st = Object.assign(structuredClone(DEF), o); save(); render(); toast('Napredak uvezen'); }
      catch (x) { toast('Kod nije ispravan'); }
      break;
    }
    case 'reset': if (confirm('Obrisati sav napredak? Ovo se ne može poništiti.')) { st = structuredClone(DEF); save(); render(); toast('Obrisano'); } break;
  }
});

render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});