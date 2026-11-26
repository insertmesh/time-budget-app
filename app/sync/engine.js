/* Time Budget – sync engine (step 04f_sync, 2026-11-24). Runs in the app frame (app/index.html), not in the timer.
   How it works:
   - The timer (timer.html) saves your taps in this browser (localStorage key sam10.timeBudget.v1) as before.
   - This engine copies them to the storage provider (now: a hidden file in YOUR Google Drive) and merges what other
     devices wrote there (merge.js). When the merge brings something new, it writes it back to localStorage; the timer
     notices (storage event) and redraws. Nothing ever needs a server of ours.
   - When it syncs: on open, ~2 s after every save, every 20 s while the app is visible, when the internet comes back.
   - Offline or signed out: taps keep saving on this device and catch up at the next sync.
   - Google's access key lasts ~1 hour. A new one needs a tap (browser rule for pop-ups): the "Resume" button in Sync,
     or (option) automatically at your next tap in the app.
   Own state (NOT synced, this device only): localStorage key sam10.timeBudget.sync.
   Backup: before the FIRST sync on a device, its data is copied to localStorage key sam10.timeBudget.backupBeforeSync. */
(function () {
  'use strict';
  const KEY = 'sam10.timeBudget.v1', RKEY = 'sam10.timeBudget.records', SKEY = 'sam10.timeBudget.sync', BKEY = 'sam10.timeBudget.backupBeforeSync';
  const POLL_MS = 20000, DEBOUNCE_MS = 2000, READY_WAIT_MS = 5000, AUTO_RETRY_MS = 10 * 60000;
  const DEMO = /[?&]syncdemo\b/.test(location.search);     // test mode: a fake "Drive" inside this browser (localStorage key tbDemoDrive)

  /* ---------- demo provider (tests only) ---------- */
  const demo = {
    id: 'demo', name: 'Demo drive (test)',
    auth: { configured: () => true, addScopes() {}, revoke() {}, async requestToken() { return { token: 'demo', expiresAt: Date.now() + 3600e3 }; } },
    async who() { return 'demo@example.test'; },
    _get() {                                              // localStorage tbDemoOffline = 1 → behaves like no internet
      if (localStorage.getItem('tbDemoOffline')) throw Object.assign(new Error('Failed to fetch (test: offline)'), { type: 'net' });
      try { return JSON.parse(localStorage.getItem('tbDemoDrive')); } catch (e) { return null; }
    },
    async find() { const f = demo._get(); return f ? { id: 'demo', rev: String(f.rev), others: [] } : null; },
    async rev() { const f = demo._get(); if (!f) throw Object.assign(new Error('missing'), { type: 'missing' }); return String(f.rev); },
    async read() { const f = demo._get(); return f ? f.data : null; },
    async create(t, data) { localStorage.setItem('tbDemoDrive', JSON.stringify({ rev: 1, data })); return { id: 'demo', rev: '1' }; },
    async write(t, id, data) { const f = demo._get() || { rev: 0 }; f.rev++; f.data = data; localStorage.setItem('tbDemoDrive', JSON.stringify(f)); return { rev: String(f.rev) }; }
  };

  /* ---------- this device's sync state ---------- */
  const blankState = () => ({ provider: DEMO ? 'demo' : 'gdrive', on: false, synced: false, fileId: null, rev: null, lastSync: 0,
    email: '', token: null, tokenExp: 0, autoResume: !(window.matchMedia && matchMedia('(pointer: coarse)').matches), lastError: '' });
  let st = blankState();
  try { st = Object.assign(blankState(), JSON.parse(localStorage.getItem(SKEY)) || {}); } catch (e) { /* keep blank */ }
  if (DEMO) st.provider = 'demo';
  else if (st.provider === 'demo') st = blankState();     // left over from a test: start clean
  const saveState = () => { try { localStorage.setItem(SKEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  const P = () => (st.provider === 'demo' ? demo : (window.TBProviders || {})[st.provider]);

  let lastRemote = null;                                  // what Drive held at the last sync (memory only)
  let status = 'off', busy = null, again = false, timer = null, lastAuto = 0, askFirst = null;
  const listeners = new Set();
  function setStatus(s, err) {
    status = s; if (err !== undefined) st.lastError = err || '';
    saveState(); listeners.forEach(f => { try { f(info()); } catch (e) { /* ignore */ } });
  }
  function info() {
    const p = P();
    return { status, on: st.on, provider: p ? p.name : st.provider, configured: !!(p && p.auth.configured()), email: st.email, lastSync: st.lastSync,
      error: st.lastError, autoResume: st.autoResume, tokenOk: tokenOk(), demo: DEMO, hasBackup: !!localStorage.getItem(BKEY) };
  }
  const tokenOk = () => !!st.token && Date.now() < st.tokenExp - 60000;

  // This device's data = the timer's key + the other screens' records key (app/data/store.js), as ONE object for merging.
  function readLocal() {
    let d = null, r = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* broken → treat as none */ }
    try { r = JSON.parse(localStorage.getItem(RKEY)); } catch (e) { /* idem */ }
    if (!d && !r) return null;
    d = d || { v: 2, entries: [] };
    if (r) d.records = r; else delete d.records;
    return d;
  }
  function writeLocal(m) {                                // split again; only rewrite a key that really changed
    const main = Object.assign({}, m), rec = main.records; delete main.records;
    let old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* none */ }
    if (!TBMerge.same(old, main)) localStorage.setItem(KEY, JSON.stringify(main));   // the timer reloads (storage event)
    let oldR = null; try { oldR = JSON.parse(localStorage.getItem(RKEY)); } catch (e) { /* none */ }
    if (rec && !TBMerge.same(oldR, rec)) localStorage.setItem(RKEY, JSON.stringify(rec));
  }
  const count = d => (d && Array.isArray(d.entries) ? d.entries.length : 0);

  /* ---------- sign-in ---------- */
  async function getToken(interactive, silent) {
    if (tokenOk()) return st.token;
    if (!interactive) return null;
    const p = P();
    const r = await p.auth.requestToken({ silent, hint: st.email || undefined });
    st.token = r.token; st.tokenExp = r.expiresAt; saveState();
    if (!st.email) st.email = await p.who(st.token);
    return st.token;
  }

  /* ---------- one sync round ---------- */
  async function syncOnce() {
    const p = P();
    if (!st.on || !p) return setStatus('off');
    if (!navigator.onLine && !DEMO) return setStatus('offline');
    const token = await getToken(false);
    if (!token) return setStatus('paused');
    setStatus('syncing');
    try {
      let remote = null, rev = null;
      if (!st.fileId) {
        const f = await p.find(token);
        if (f) {
          st.fileId = f.id; rev = f.rev; remote = await p.read(token, f.id);
          for (const other of f.others || []) remote = TBMerge.merge(remote, await p.read(token, other));   // two devices created a file at once
        }
      } else {
        try { rev = await p.rev(token, st.fileId); }
        catch (e) { if (e.type === 'missing') { st.fileId = null; st.rev = null; return syncOnce(); } throw e; }
        remote = rev === st.rev && lastRemote ? lastRemote : await p.read(token, st.fileId);   // unchanged on Drive → no download
      }
      let local = readLocal();
      if (!st.synced) {                                  // first sync on this device: keep a backup, maybe ask
        if (local && !localStorage.getItem(BKEY)) localStorage.setItem(BKEY, JSON.stringify({ at: Date.now(), data: local }));
        if (count(remote) && count(local) && askFirst) {
          const choice = await askFirst({ remote: count(remote), local: count(local) });
          if (choice === 'cancel') { st.on = false; st.fileId = null; return setStatus('off', ''); }
          if (choice === 'drive') local = null;
        }
      }
      if (local) local = readLocal();                     // re-read: the timer may have saved while we waited
      const merged = remote || local ? TBMerge.merge(local, remote) : null;
      if (merged && !local && !merged.records) merged.records = {};   // "Use Drive's data": this device's records go too (backup kept)
      if (merged && !TBMerge.same(merged, readLocal())) {
        writeLocal(merged);
        window.dispatchEvent(new CustomEvent('tb-sync-local'));
      }
      if (merged && (!remote || !TBMerge.same(merged, remote))) {   // Drive is missing something → upload
        const w = st.fileId ? await p.write(token, st.fileId, merged) : await p.create(token, merged);
        if (w.id) st.fileId = w.id; rev = w.rev; remote = merged;
      }
      lastRemote = remote;
      st.rev = rev; st.synced = true; st.lastSync = Date.now();
      setStatus('ok', '');
    } catch (e) {
      if (e.type === 'expired') { st.token = null; st.tokenExp = 0; return setStatus('paused'); }
      setStatus(navigator.onLine ? 'error' : 'offline', e.message || String(e));
    }
  }
  function sync() {                                      // never two rounds at once; a request during a round runs once after it
    if (busy) { again = true; return busy; }
    busy = syncOnce().catch(e => setStatus('error', e.message)).finally(() => { busy = null; if (again) { again = false; sync(); } });
    return busy;
  }
  function soon() { clearTimeout(timer); timer = setTimeout(sync, DEBOUNCE_MS); }

  /* ---------- the first sync after opening: the timer waits for it (max 5 s) so it does not act on old data ---------- */
  let readyDone;
  const ready = new Promise(r => { readyDone = r; });
  setTimeout(() => readyDone(), READY_WAIT_MS);

  /* ---------- public API (used by sync.html and timer.html) ---------- */
  const TBSync = {
    info, ready,
    onChange(f) { listeners.add(f); f(info()); return () => listeners.delete(f); },
    setAskFirst(f) { askFirst = f; },
    async connect() {                                     // call from a tap
      const p = P();
      if (!p || !p.auth.configured()) throw new Error('Sync is not set up in this version (no Google client ID yet).');
      setStatus('signing in');
      try { await getToken(true, false); }
      catch (e) { setStatus(st.on ? 'paused' : 'off', e.type === 'popup_closed' ? 'Sign-in window was closed.' : e.message); throw e; }
      st.on = true; saveState();
      return sync();
    },
    async resume() { try { await getToken(true, true); } catch (e) { setStatus('paused', e.message); throw e; } return sync(); },
    syncNow: () => sync(),
    disconnect() {
      const p = P(); if (p) p.auth.revoke(st.token);
      const keep = { autoResume: st.autoResume };
      st = Object.assign(blankState(), keep); lastRemote = null; saveState(); setStatus('off', '');
    },
    setAutoResume(v) { st.autoResume = !!v; saveState(); setStatus(status); },
    backup() { try { return JSON.parse(localStorage.getItem(BKEY)); } catch (e) { return null; } },
    _state: () => st                                      // for tests
  };
  window.TBSync = TBSync;

  /* ---------- triggers ---------- */
  window.addEventListener('storage', e => { if ((e.key === KEY || e.key === RKEY) && st.on) soon(); });   // a screen saved
  window.addEventListener('tb-data', () => st.on && soon());                     // TBData used inside this frame itself
  window.addEventListener('online', () => st.on && sync());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && st.on) sync(); });
  setInterval(() => { if (st.on && !document.hidden && tokenOk()) sync(); }, POLL_MS);
  function userTap() {                                     // option: get a new Google key at the next tap
    if (!st.on || tokenOk() || !st.autoResume || Date.now() - lastAuto < AUTO_RETRY_MS) return;
    lastAuto = Date.now();
    getToken(true, true).then(() => sync()).catch(() => setStatus('paused'));
  }
  window.addEventListener('message', e => { if (e.data && e.data.tbUserTap) userTap(); });
  document.addEventListener('click', userTap, true);

  if (st.on) sync().finally(() => readyDone()); else { setStatus('off'); readyDone(); }
})();
