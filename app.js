/* Salita — spoken Tagalog, a few minutes at a time. */
"use strict";

const NEW_PER_DAY = 5;
const WALK_MINUTES = 15;
const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64]; // days, indexed by box
const STORE_KEY = "salita.v1";

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");
const today = () => dateKey(new Date());
function dateKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function addDays(key, n) { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + n); return dateKey(d); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  slow: '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6zm-1 3v6l5 3 1-1.6-4-2.4V7z"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15zm6-3.5h-2a4 4 0 0 1-8 0H6a6 6 0 0 0 5 5.9V20H8v2h8v-2h-3v-2.6a6 6 0 0 0 5-5.9z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  me: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M6 5.5v13l9-6.5zM16 5h2.5v14H16z"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z"/></svg>',
  walk: '<svg viewBox="0 0 24 24"><circle cx="13" cy="4.5" r="2"/><path d="M10.5 8.5 8 10v4h2v-2.8l1-.6-1.5 7.4-3 3.5 1.6 1.3 3.3-3.8.6-2.8 2 2V22h2v-6.2l-2.2-2.3.6-3 1.1 1.5H19v-2h-2.6l-1.8-2.6a2 2 0 0 0-2.2-.8z"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 7.7 10.1l-1.9-.6A6 6 0 1 1 12 6c1.6 0 3.1.6 4.2 1.7L14 10h6V4l-2.3 2.3A8 8 0 0 0 12 4z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5 4.6 13a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6a4.8 4.8 0 0 1 6.8 6.8z"/></svg>',
};

/* ---------- State ---------- */
let DATA = { phrases: [] };
let JEL = new Set();        // phrase ids that have Jel's recording
let state = load();

function blankState() {
  return { cards: {}, custom: [], favs: [], days: {}, missions: {}, newToday: {}, startedOn: today(), lastBackup: null };
}
function load() {
  try { return Object.assign(blankState(), JSON.parse(localStorage.getItem(STORE_KEY)) || {}); }
  catch { return blankState(); }
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }
function logActivity(kind, amount = 1) {
  const d = state.days[today()] || (state.days[today()] = { learn: 0, review: 0, walkSec: 0 });
  d[kind] = (d[kind] || 0) + amount; save();
}

const allPhrases = () => DATA.phrases.concat(state.custom);
const byId = id => allPhrases().find(p => p.id === id);
const learnedIds = () => Object.keys(state.cards).filter(id => byId(id));
function dueIds() {
  const t = today();
  return learnedIds().filter(id => state.cards[id].due <= t)
    .sort((a, b) => state.cards[a].due.localeCompare(state.cards[b].due) || state.cards[a].box - state.cards[b].box);
}
function knownCount() { return learnedIds().filter(id => state.cards[id].box >= 3).length; }

/* Today's new phrases: the next unlearned ones in course order, fixed once chosen for the day. */
function todaysNew() {
  const t = today();
  if (state.newToday.date !== t) {
    const backlog = dueIds().length;
    const n = backlog > 40 ? 2 : backlog > 25 ? 3 : NEW_PER_DAY;
    const next = DATA.phrases.filter(p => !state.cards[p.id]).slice(0, n).map(p => p.id);
    state.newToday = { date: t, ids: next };
    save();
  }
  return state.newToday.ids.map(byId).filter(Boolean);
}
function learnedTodayCount() { return todaysNew().filter(p => state.cards[p.id]).length; }

function rate(id, grade) {
  const c = state.cards[id] || { box: 0, due: today(), seen: 0, lapses: 0 };
  if (grade === "again") { c.box = 1; c.lapses++; c.due = today(); }
  else if (grade === "got") { c.box = Math.min(c.box + 1, INTERVALS.length - 1); c.due = addDays(today(), INTERVALS[c.box]); }
  else { c.box = Math.min(c.box + 2, INTERVALS.length - 1); c.due = addDays(today(), INTERVALS[c.box]); }
  c.seen++; c.last = today();
  state.cards[id] = c; save();
}
function streak() {
  let n = 0, k = today();
  const active = key => { const d = state.days[key]; return d && (d.learn || d.review || d.walkSec >= 120); };
  if (!active(k)) k = addDays(k, -1);
  while (active(k)) { n++; k = addDays(k, -1); }
  return n;
}
function minutesThisWeek() {
  let s = 0;
  for (let i = 0; i < 7; i++) { const d = state.days[addDays(today(), -i)]; if (d) s += (d.walkSec || 0) + (d.learn || 0) * 60 + (d.review || 0) * 12; }
  return Math.round(s / 60);
}

/* ---------- Audio ---------- */
const player = new Audio();
player.preload = "auto";
function audioUrl(p, lang = "tl") {
  if (lang === "en") return p.custom ? null : `audio/en/${p.id}.mp3`;
  if (p.custom) return null;
  return JEL.has(p.id) ? `audio/jel/${p.id}.mp3` : `audio/tl/${p.id}.mp3`;
}
async function play(p, { slow = false, lang = "tl" } = {}) {
  if (p.custom) {
    const blob = await idbGet("rec-" + p.id);
    if (!blob) { toast("No recording for this one yet"); return; }
    return playSrc(URL.createObjectURL(blob), slow);
  }
  return playSrc(audioUrl(p, lang), slow);
}
function playSrc(src, slow) {
  return new Promise(res => {
    player.pause();
    player.src = src;
    player.playbackRate = slow ? 0.7 : 1;
    player.preservesPitch = true; player.webkitPreservesPitch = true;
    player.onended = player.onerror = () => res();
    player.play().catch(() => res());
  });
}

/* Record yourself */
let rec = null;
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  const mr = new MediaRecorder(stream);
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); r(new Blob(chunks, { type: mr.mimeType || "audio/mp4" })); });
  mr.start();
  rec = { mr, done };
  return rec;
}
async function stopRecording() { if (!rec) return null; const r = rec; rec = null; r.mr.stop(); return r.done; }

/* ---------- IndexedDB (custom phrase recordings) ---------- */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("salita", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("blobs");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbPut(k, v) { const db = await idb(); return new Promise(r => { const tx = db.transaction("blobs", "readwrite"); tx.objectStore("blobs").put(v, k); tx.oncomplete = r; }); }
async function idbGet(k) { try { const db = await idb(); return await new Promise(r => { const q = db.transaction("blobs").objectStore("blobs").get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(null); }); } catch { return null; } }

/* ---------- UI helpers ---------- */
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
function setTab(tab) {
  document.querySelectorAll(".tabs button").forEach(b => b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
}
function go(tab, opts) {
  if (walk.building) return;
  location.hash = tab;
  setTab(tab);
  window.scrollTo(0, 0);
  (ROUTES[tab] || ROUTES.today)(opts);
}
document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => go(b.dataset.tab)));

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Magandang umaga" : h < 18 ? "Magandang hapon" : "Magandang gabi";
}

/* ---------- Today ---------- */
function mission() {
  const t = today();
  const pool = todaysNew().length ? todaysNew() : learnedIds().map(byId);
  if (!pool.length) return null;
  let seed = 0; for (const ch of t) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  return pool[seed % pool.length];
}
function renderToday() {
  const newList = todaysNew();
  const learnedNow = learnedTodayCount();
  const due = dueIds().length;
  const d = state.days[today()] || {};
  const walked = (d.walkSec || 0) >= 300;
  const m = mission();
  const mDone = state.missions[today()];
  const courseDone = newList.length === 0 && DATA.phrases.every(p => state.cards[p.id]);

  let next;
  if (learnedNow < newList.length) next = { t: "Learn today's phrases", s: `${newList.length - learnedNow} new, about 10 minutes`, btn: "Start learning", tab: "learn" };
  else if (!walked) next = { t: "Ready for your walk", s: "15 minutes, screen off, earbuds in", btn: "Start Walk Mode", tab: "walk" };
  else if (due) next = { t: `${due} to review`, s: "A couple of minutes whenever you have them", btn: "Review now", tab: "review" };
  else next = { t: "All done for today", s: "Use your mission phrase this evening", btn: "Browse phrases", tab: "phrases" };

  view.innerHTML = `
    <div class="eyebrow">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
    <h1>${greeting()}, Nik</h1>
    <div class="hero">
      <div class="eyebrow" style="color:inherit;opacity:.8">Up next</div>
      <h2>${next.t}</h2><p>${next.s}</p>
      <button class="btn" data-go="${next.tab}">${next.btn}</button>
    </div>
    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${learnedIds().length}</b><span>phrases met</span></div>
      <div class="stat"><b>${minutesThisWeek()}</b><span>min this week</span></div>
    </div>
    <h2>Today's plan</h2>
    <div class="card">
      ${slot("learn", ICON.book, "Morning: learn", courseDone ? "Course complete. More weeks coming" : `${learnedNow} of ${newList.length} new phrases`, newList.length > 0 && learnedNow >= newList.length)}
      ${slot("walk", ICON.walk, "Walk: listen and repeat", walked ? "Done" : "15 minutes, hands-free", walked)}
      ${slot("review", ICON.cards, "Spare moments: review", due ? `${due} due` : "Nothing due", due === 0 && learnedIds().length > 0)}
    </div>
    ${m ? `<div class="mission">
      <div class="eyebrow" style="color:var(--mango)">Tonight's mission</div>
      <div class="tl">${esc(m.tl)}</div><div class="muted">${esc(m.en)}</div>
      <p class="small">Say this to her today. Notice her reaction.</p>
      <div class="row"><button class="btn secondary" data-play="${m.id}">${ICON.play.replace("<svg", '<svg width="20" height="20" fill="currentColor"')} Hear it</button>
      <button class="btn ${mDone ? "secondary" : "mango"}" id="mission-done">${mDone ? "Done ✓" : "I said it"}</button></div>
    </div>` : ""}
    <h2>Settings</h2>
    <div class="card soft small">
      <p style="margin-top:0">Progress is saved on this phone. Export a backup now and then.</p>
      <div class="row"><button class="btn ghost" id="export">Back up</button><button class="btn ghost" id="import">Restore</button></div>
      <p class="muted" style="margin-bottom:0">${JEL.size} of ${DATA.phrases.length} phrases use Jel's voice. The rest use a Filipino neural voice until she records them.</p>
    </div>`;
  function slot(tab, icon, t, s, done) {
    return `<button class="slot ${done ? "done" : ""}" data-go="${tab}"><span class="dot">${icon}</span><span class="t"><b>${t}</b><span>${s}</span></span><span class="check"></span></button>`;
  }
  view.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  view.querySelectorAll("[data-play]").forEach(b => b.onclick = () => play(byId(b.dataset.play)));
  const md = $("#mission-done");
  if (md) md.onclick = () => { state.missions[today()] = !state.missions[today()]; save(); renderToday(); };
  $("#export").onclick = exportBackup;
  $("#import").onclick = importBackup;
}

/* ---------- Learn ---------- */
function renderLearn(opts = {}) {
  const list = opts.list || todaysNew().filter(p => !state.cards[p.id]);
  if (!list.length) {
    const nextUp = DATA.phrases.filter(p => !state.cards[p.id]).slice(0, NEW_PER_DAY);
    view.innerHTML = `<h1>Learn</h1>
      <div class="card center"><p><b>Today's ${todaysNew().length || ""} new phrases are done.</b></p>
      <p class="muted">Tomorrow's set unlocks overnight. Your walk will drill these.</p>
      <button class="btn" data-go="walk">Go to Walk Mode</button><div class="spacer"></div>
      ${nextUp.length ? `<button class="btn ghost" id="extra">Learn ${nextUp.length} more now</button>` : ""}</div>`;
    view.querySelector("[data-go]").onclick = () => go("walk");
    const ex = $("#extra");
    if (ex) ex.onclick = () => { state.newToday.ids.push(...nextUp.map(p => p.id)); save(); renderLearn(); };
    return;
  }
  let i = 0, myRec = null;
  const show = () => {
    const p = list[i];
    const total = list.length;
    view.innerHTML = `
      <div class="eyebrow">Week ${p.week || "–"} · ${esc(p.theme || "Your phrases")}</div>
      <h1>New phrase ${i + 1} of ${total}</h1>
      <div class="progress"><i style="width:${(i / total) * 100}%"></i></div>
      <div class="phrase-card">
        <div class="tl">${esc(p.tl)}${JEL.has(p.id) ? '<span class="badge jel">Jel</span>' : ""}</div>
        <p class="en">${esc(p.en)}</p>
        ${p.lit ? `<p class="lit">${esc(p.lit)}</p>` : ""}
        <div class="controls">
          <span class="lbl"><button class="icon-btn" id="pl" aria-label="Play">${ICON.play}</button>Listen</span>
          <span class="lbl"><button class="icon-btn" id="sl" aria-label="Play slowly">${ICON.slow}</button>Slow</span>
          <span class="lbl"><button class="icon-btn rec" id="rc" aria-label="Record yourself">${ICON.mic}</button><span id="rcl">Say it</span></span>
          <span class="lbl"><button class="icon-btn" id="me" aria-label="Play my recording" ${myRec ? "" : "disabled style=opacity:.35"}>${ICON.me}</button>Compare</span>
        </div>
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
      </div>
      <p class="small muted center">Listen, then say it out loud three times. Record once and compare.</p>
      <button class="btn" id="next">Got it${i + 1 < total ? ", next" : ", finish"}</button>`;
    $("#pl").onclick = () => play(p);
    $("#sl").onclick = () => play(p, { slow: true });
    $("#me").onclick = () => myRec && playSrc(URL.createObjectURL(myRec), false);
    $("#rc").onclick = async () => {
      const btn = $("#rc");
      if (rec) { myRec = await stopRecording(); btn.classList.remove("on"); btn.innerHTML = ICON.mic; $("#rcl").textContent = "Say it"; const me = $("#me"); me.disabled = false; me.style.opacity = 1; await playSrc(URL.createObjectURL(myRec)); await play(p); return; }
      try { await startRecording(); btn.classList.add("on"); btn.innerHTML = ICON.stop; $("#rcl").textContent = "Stop"; }
      catch { toast("Allow the microphone to record yourself"); }
    };
    $("#next").onclick = () => {
      if (!state.cards[p.id]) { state.cards[p.id] = { box: 1, due: addDays(today(), 1), seen: 1, lapses: 0, last: today() }; logActivity("learn"); if (walk.audio.paused) walk.date = null; }
      myRec = null; i++;
      if (i < total) show(); else { toast("Nice. These are in your walk now."); renderLearn(); }
    };
    setTimeout(() => play(p), 250);
  };
  show();
}

/* ---------- Review ---------- */
function renderReview() {
  const queue = dueIds();
  if (!queue.length) {
    const learned = learnedIds();
    view.innerHTML = `<h1>Review</h1><div class="card center">
      <p><b>Nothing due right now.</b></p><p class="muted">${learned.length ? "Phrases come back just before you'd forget them." : "Learn your first phrases and they'll show up here."}</p>
      ${learned.length ? `<button class="btn ghost" id="practise">Practise 10 anyway</button>` : `<button class="btn" data-go="learn">Start learning</button>`}</div>`;
    const pr = $("#practise");
    if (pr) pr.onclick = () => reviewSession(learned.sort(() => Math.random() - .5).slice(0, 10), true);
    const g = view.querySelector("[data-go]"); if (g) g.onclick = () => go("learn");
    return;
  }
  reviewSession(queue.slice(0, 20), false);
}
function reviewSession(queue, practice) {
  let i = 0, again = [];
  const total = queue.length;
  const show = () => {
    if (i >= queue.length) {
      if (again.length) { queue = queue.concat(again); again = []; }
      else { view.innerHTML = `<h1>Review</h1><div class="card center"><p><b>Session done.</b></p><p class="muted">${total} phrases reviewed.</p><button class="btn" data-go="today">Back to Today</button></div>`; view.querySelector("[data-go]").onclick = () => go("today"); return; }
    }
    const p = byId(queue[i]);
    const listenFirst = (p.id.charCodeAt(p.id.length - 1) + i) % 2 === 0 && !p.custom;
    view.innerHTML = `
      <div class="eyebrow">${practice ? "Practice" : "Review"} · ${Math.min(i + 1, total)} of ${total}</div>
      <div class="progress"><i style="width:${(Math.min(i, total) / total) * 100}%"></i></div>
      <div class="phrase-card">
        <p class="muted small" style="margin:0">${listenFirst ? "What does this mean?" : "How do you say this in Tagalog?"}</p>
        ${listenFirst
          ? `<div class="tl">${esc(p.tl)}</div><p class="en hidden-answer" id="ans">${esc(p.en)}</p>`
          : `<p class="en" style="font-size:24px;font-weight:600;margin-top:10px">${esc(p.en)}</p><div class="tl hidden-answer" id="ans">${esc(p.tl)}</div>`}
        <div class="controls"><button class="icon-btn" id="pl" aria-label="Play">${ICON.play}</button><button class="icon-btn" id="sl" aria-label="Slow">${ICON.slow}</button></div>
      </div>
      <div id="act"><button class="btn" id="reveal">Show answer</button></div>`;
    $("#pl").onclick = () => play(p);
    $("#sl").onclick = () => play(p, { slow: true });
    if (listenFirst) setTimeout(() => play(p), 200);
    $("#reveal").onclick = () => {
      $("#ans").classList.remove("hidden-answer");
      if (!listenFirst) play(p);
      const c = state.cards[p.id] || { box: 1 };
      const nxt = g => { const b = g === "got" ? Math.min(c.box + 1, 7) : Math.min(c.box + 2, 7); const d = INTERVALS[b]; return d === 1 ? "1 day" : d + " days"; };
      $("#act").innerHTML = `<div class="rate">
        <button class="again" data-g="again">Again<small>later today</small></button>
        <button class="got" data-g="got">Got it<small>${nxt("got")}</small></button>
        <button class="easy" data-g="easy">Easy<small>${nxt("easy")}</small></button></div>`;
      view.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
        const g = b.dataset.g;
        if (!practice || g === "again") rate(p.id, g);
        if (g === "again") again.push(p.id);
        logActivity("review"); i++; show();
      });
    };
  };
  show();
}

/* ---------- Walk Mode ---------- */
const walk = { audio: new Audio(), url: null, cues: [], building: false, date: null, mode: "auto" };
walk.audio.preload = "auto";
const RATE = 16000;
let actx = null;
const decoded = new Map();
async function decode(url) {
  if (decoded.has(url)) return decoded.get(url);
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  const buf = await fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); });
  const ab = await new Promise((res, rej) => actx.decodeAudioData(buf, res, rej));
  const src = ab.getChannelData(0), ratio = ab.sampleRate / RATE, n = Math.floor(src.length / ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * ratio, j = Math.floor(x), f = x - j; out[i] = src[j] * (1 - f) + (src[j + 1] || 0) * f; }
  decoded.set(url, out);
  return out;
}
function tone(freq, sec, vol = .25) {
  const n = Math.floor(sec * RATE), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const env = Math.min(1, i / 400, (n - i) / 2000); out[i] = Math.sin(2 * Math.PI * freq * i / RATE) * vol * env; }
  return out;
}
function encodeWav(parts) {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, len * 2, true);
  let o = 44;
  for (const p of parts) for (let i = 0; i < p.length; i++, o += 2) { const s = Math.max(-1, Math.min(1, p[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([buf], { type: "audio/wav" });
}
function walkPlan(mode) {
  const fresh = todaysNew().filter(p => !p.custom);
  const learned = learnedIds().map(byId).filter(p => p && !p.custom);
  const freshIds = new Set(fresh.map(p => p.id));
  const due = dueIds().map(byId).filter(p => p && !p.custom && !freshIds.has(p.id));
  const rest = learned.filter(p => !freshIds.has(p.id) && !due.includes(p))
    .sort((a, b) => (state.cards[a.id].last || "").localeCompare(state.cards[b.id].last || "") || state.cards[a.id].box - state.cards[b.id].box);
  const steps = [];
  if (mode !== "review" && fresh.length) {
    steps.push({ kind: "section", label: "Today's new phrases" });
    const rounds = learned.length > fresh.length ? 3 : 6;
    for (let round = 0; round < rounds; round++) {
      const order = round % 2 ? [...fresh].reverse() : fresh;
      order.forEach(p => steps.push({ kind: round % 3 === 2 ? "listen" : "speak", p }));
    }
  }
  const pool = due.concat(rest);
  if (pool.length) {
    steps.push({ kind: "section", label: "Review" });
    pool.forEach((p, k) => steps.push({ kind: k % 3 === 2 ? "listen" : "speak", p }));
    if (mode === "review" || fresh.length < 3) pool.forEach(p => steps.push({ kind: "speak", p })); // second lap if short
  }
  return steps;
}
async function buildWalk(mode) {
  const steps = walkPlan(mode);
  if (!steps.some(s => s.p)) return null;
  const parts = [], cues = [];
  let t = 0;
  const push = arr => { parts.push(arr); t += arr.length / RATE; };
  const gap = sec => push(new Float32Array(Math.floor(sec * RATE)));
  const limit = WALK_MINUTES * 60;
  push(tone(660, .18)); gap(.08); push(tone(880, .25)); gap(1);
  for (const s of steps) {
    if (t > limit) break;
    if (s.kind === "section") { cues.push({ t, label: s.label }); push(tone(523, .15, .18)); gap(.9); continue; }
    const tl = await decode(audioUrl(s.p, "tl"));
    const en = await decode(audioUrl(s.p, "en"));
    const tlSec = tl.length / RATE;
    cues.push({ t, p: s.p, kind: s.kind });
    if (s.kind === "speak") { // English prompt → you try → Tagalog twice with a gap to repeat
      push(en); gap(3.2); push(tl); gap(tlSec * 1.6 + 1.2); push(tl); gap(tlSec * 1.6 + 1.6);
    } else {                  // Tagalog → you translate in your head → English → Tagalog again
      push(tl); gap(3); push(en); gap(.8); push(tl); gap(tlSec * 1.6 + 1.6);
    }
  }
  gap(.4); push(tone(880, .18)); gap(.08); push(tone(660, .3)); gap(.6);
  return { blob: encodeWav(parts), cues, seconds: t };
}
function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }

let walkTimer = null;
function renderWalk() {
  const ready = walk.url && walk.date === today();
  const learned = learnedIds().length, fresh = todaysNew().length;
  view.innerHTML = `
    <h1>Walk Mode</h1>
    <p class="sub">Press play, lock your phone, put it in your pocket. Say every Tagalog phrase out loud.</p>
    <div class="seg" role="tablist">
      <button data-mode="auto" class="${walk.mode === "auto" ? "on" : ""}">Today's mix</button>
      <button data-mode="review" class="${walk.mode === "review" ? "on" : ""}">Review only</button>
    </div>
    <div class="card walk-player">
      <div class="now" id="now">${ready ? "" : `<div class="muted">${fresh || learned ? "Builds a 15-minute session from today's phrases and your reviews." : "Learn a few phrases first."}</div>`}</div>
      <button class="big-play" id="wp" aria-label="Play">${walk.audio.paused ? ICON.play : ICON.pause}</button>
      <div class="walk-row">
        <button class="icon-btn" id="wb" aria-label="Back 10 seconds">${ICON.replay}</button>
        <span class="time" id="wt">${ready ? fmt(walk.audio.currentTime) + " / " + fmt(walk.audio.duration || 0) : "0:00"}</span>
        <button class="icon-btn" id="ws" aria-label="Next phrase">${ICON.skip}</button>
      </div>
    </div>
    <div class="card soft small">
      <b>How it works</b>
      <p style="margin:6px 0 0">You hear the English, a pause to guess, then the Tagalog twice with room to repeat it. Some phrases go the other way: Tagalog first, you work out the meaning. Earbud buttons and the lock screen control it.</p>
    </div>`;
  view.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
    if (walk.mode === b.dataset.mode) return;
    walk.mode = b.dataset.mode; walk.audio.pause(); walk.url = null; renderWalk();
  });
  $("#wp").onclick = toggleWalk;
  $("#wb").onclick = () => { walk.audio.currentTime = Math.max(0, walk.audio.currentTime - 10); };
  $("#ws").onclick = () => { const c = walk.cues.find(c => c.p && c.t > walk.audio.currentTime + .5); if (c) walk.audio.currentTime = c.t; };
  updateWalkUI();
}
async function toggleWalk() {
  if (walk.building) return;
  if (!walk.url || walk.date !== today()) {
    walk.building = true;
    $("#now").innerHTML = `<div class="muted">Building your session…</div>`;
    try {
      const r = await buildWalk(walk.mode);
      if (!r) { walk.building = false; $("#now").innerHTML = `<div class="muted">Learn a few phrases first, then come back.</div>`; return; }
      if (walk.url) URL.revokeObjectURL(walk.url);
      walk.url = URL.createObjectURL(r.blob); walk.cues = r.cues; walk.date = today();
      walk.audio.src = walk.url;
    } catch (e) { walk.building = false; $("#now").innerHTML = `<div class="muted">Couldn't load audio. Check your connection once, then try again.</div>`; console.error(e); return; }
    walk.building = false;
  }
  if (walk.audio.paused) { walk.audio.play().catch(() => toast("Tap play again")); } else walk.audio.pause();
}
let lastTick = 0;
walk.audio.addEventListener("timeupdate", () => {
  const now = walk.audio.currentTime;
  if (!walk.audio.paused && now > lastTick && now - lastTick < 2) logActivity("walkSec", now - lastTick);
  lastTick = now;
  updateWalkUI();
});
walk.audio.addEventListener("seeked", () => { lastTick = walk.audio.currentTime; });
["play", "pause", "ended"].forEach(ev => walk.audio.addEventListener(ev, updateWalkUI));
walk.audio.addEventListener("ended", () => toast("Walk done. Salamat!"));
function updateWalkUI() {
  if ("mediaSession" in navigator && walk.url) {
    const cue = currentCue();
    navigator.mediaSession.metadata = new MediaMetadata({ title: cue && cue.p ? cue.p.tl : "Walk Mode", artist: cue && cue.p ? cue.p.en : "Salita", album: "Salita", artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
  }
  if (location.hash.slice(1) !== "walk") return;
  const wp = $("#wp"); if (!wp) return;
  wp.innerHTML = walk.audio.paused ? ICON.play : ICON.pause;
  $("#wt").textContent = walk.url ? fmt(walk.audio.currentTime) + " / " + fmt(walk.audio.duration || 0) : "0:00";
  const cue = currentCue();
  if (walk.url) $("#now").innerHTML = cue && cue.p ? `<div class="tl">${esc(cue.p.tl)}</div><div class="muted">${esc(cue.p.en)}</div>` : `<div class="muted">${cue ? esc(cue.label) : "Ready"}</div>`;
}
function currentCue() { let c = null; for (const x of walk.cues) { if (x.t <= walk.audio.currentTime + .05) c = x; else break; } return c; }
if ("mediaSession" in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", () => walk.audio.play());
  ms.setActionHandler("pause", () => walk.audio.pause());
  try { ms.setActionHandler("seekbackward", () => { walk.audio.currentTime = Math.max(0, walk.audio.currentTime - 10); }); } catch {}
  try { ms.setActionHandler("nexttrack", () => { const c = walk.cues.find(c => c.p && c.t > walk.audio.currentTime + .5); if (c) walk.audio.currentTime = c.t; }); } catch {}
  try { ms.setActionHandler("previoustrack", () => { const prev = walk.cues.filter(c => c.p && c.t < walk.audio.currentTime - 1.5); const c = prev[prev.length - 1]; walk.audio.currentTime = c ? c.t : 0; }); } catch {}
}

/* ---------- Phrasebook ---------- */
let pbQuery = "";
function renderPhrases() {
  const q = pbQuery.trim().toLowerCase();
  const match = p => !q || p.tl.toLowerCase().includes(q) || p.en.toLowerCase().includes(q);
  const groups = [];
  const favs = allPhrases().filter(p => state.favs.includes(p.id) && match(p));
  if (favs.length) groups.push(["Favourites", favs]);
  if (state.custom.length) groups.push(["Added by you", state.custom.filter(match)]);
  const weeks = [...new Set(DATA.phrases.map(p => p.week))];
  for (const w of weeks) { const ps = DATA.phrases.filter(p => p.week === w && match(p)); if (ps.length) groups.push([`Week ${w} · ${ps[0].theme}`, ps]); }
  view.innerHTML = `
    <h1>Phrasebook</h1>
    <input class="search" id="q" type="search" placeholder="Search Tagalog or English" value="${esc(pbQuery)}" autocomplete="off">
    <button class="btn ghost" id="add" style="margin:10px 0 4px">+ Add a phrase she taught you</button>
    ${groups.map(([title, ps]) => ps.length ? `<h2>${esc(title)}</h2><div class="list">${ps.map(item).join("")}</div>` : "").join("") || `<p class="muted center">No matches.</p>`}`;
  function item(p) {
    const met = !!state.cards[p.id];
    return `<div class="item ${met || p.custom ? "" : "locked"}">
      <button class="icon-btn" data-play="${p.id}" aria-label="Play">${ICON.play}</button>
      <div class="t"><b>${esc(p.tl)}${JEL.has(p.id) ? '<span class="badge jel">Jel</span>' : ""}</b><span>${esc(p.en)}</span></div>
      <button class="star ${state.favs.includes(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="Favourite">${ICON.star}</button></div>`;
  }
  const qi = $("#q");
  qi.oninput = () => { pbQuery = qi.value; const pos = qi.selectionStart; renderPhrases(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); };
  view.querySelectorAll("[data-play]").forEach(b => b.onclick = () => play(byId(b.dataset.play)));
  view.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => {
    const id = b.dataset.fav, i = state.favs.indexOf(id);
    i >= 0 ? state.favs.splice(i, 1) : state.favs.push(id); save(); renderPhrases();
  });
  $("#add").onclick = addPhraseSheet;
}
function addPhraseSheet() {
  let blob = null;
  const bg = document.createElement("div"); bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet">
    <h2 style="margin-top:0">Add a phrase</h2>
    <label class="field"><span>Tagalog</span><input id="ftl" autocomplete="off" autocapitalize="sentences"></label>
    <label class="field"><span>English</span><input id="fen" autocomplete="off"></label>
    <label class="field"><span>Note (optional)</span><input id="fno" autocomplete="off"></label>
    <div class="row" style="align-items:center"><button class="icon-btn rec" id="frec" aria-label="Record">${ICON.mic}</button>
      <span class="small muted" id="fst" style="flex:4">Record her saying it (optional)</span></div>
    <div class="spacer"></div>
    <div class="row"><button class="btn secondary" id="fcancel">Cancel</button><button class="btn" id="fsave">Save</button></div></div>`;
  document.body.append(bg);
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  $("#fcancel", bg).onclick = () => bg.remove();
  $("#frec", bg).onclick = async () => {
    const b = $("#frec", bg);
    if (rec) { blob = await stopRecording(); b.classList.remove("on"); b.innerHTML = ICON.mic; $("#fst", bg).textContent = "Recorded. Tap to redo"; playSrc(URL.createObjectURL(blob)); return; }
    try { await startRecording(); b.classList.add("on"); b.innerHTML = ICON.stop; $("#fst", bg).textContent = "Recording… tap to stop"; } catch { toast("Microphone not allowed"); }
  };
  $("#fsave", bg).onclick = async () => {
    const tl = $("#ftl", bg).value.trim(), en = $("#fen", bg).value.trim();
    if (!tl || !en) { toast("Fill in both Tagalog and English"); return; }
    const id = "c" + Date.now().toString(36);
    state.custom.push({ id, tl, en, note: $("#fno", bg).value.trim(), lit: "", custom: true, theme: "Your phrases" });
    state.cards[id] = { box: 1, due: addDays(today(), 1), seen: 1, lapses: 0, last: today() };
    save();
    if (blob) await idbPut("rec-" + id, blob);
    bg.remove(); toast("Added to your reviews"); renderPhrases();
  };
}

/* ---------- Backup ---------- */
async function exportBackup() {
  const json = JSON.stringify({ app: "salita", exported: new Date().toISOString(), state }, null, 1);
  const file = new File([json], `salita-backup-${today()}.json`, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "Salita backup" }); } catch {} }
  else { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
  state.lastBackup = today(); save();
}
function importBackup() {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json,.json";
  inp.onchange = async () => {
    try { const d = JSON.parse(await inp.files[0].text()); if (d.app !== "salita") throw 0; state = Object.assign(blankState(), d.state); save(); toast("Progress restored"); go("today"); }
    catch { toast("That file isn't a Salita backup"); }
  };
  inp.click();
}

/* ---------- Boot ---------- */
const ROUTES = { today: renderToday, learn: renderLearn, walk: renderWalk, review: renderReview, phrases: renderPhrases };
async function boot() {
  view.innerHTML = $("#tpl-loading").innerHTML;
  DATA = await fetch("phrases.json").then(r => r.json());
  try { const j = await fetch("audio/jel/manifest.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []); JEL = new Set(j); } catch {}
  if ("storage" in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  go(location.hash.slice(1) || "today");
}
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (ROUTES[t]) { setTab(t); } });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
boot();
