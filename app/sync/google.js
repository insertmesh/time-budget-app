/* Time Budget – Google sign-in + Google Drive storage (step 04f_sync, 2026-11-24).

   SIGN-IN (TBGoogleAuth): Google Identity Services "token model" for browser apps.
   - The client ID below is PUBLIC by design (Google: browser apps cannot keep a secret). There is NO client secret anywhere.
   - Each person signs in with their OWN Google account; the app only gets a short-lived access key (about 1 hour).
   - Scopes = what the app may do. Now only `drive.appdata` (= its own hidden folder in YOUR Drive; it cannot see your other files).
   - Later (step 05b_calendar): call TBGoogleAuth.addScopes(['https://www.googleapis.com/auth/calendar.events']) before asking for a token;
     Google then asks once more for the extra permission ("incremental authorization", include_granted_scopes).

   STORAGE (provider "gdrive"): one file `time-budget-data.json` in the hidden app-data folder (appDataFolder).
   Every provider has the same 4 functions, so Dropbox / OneDrive can be added later as their own file:
     find(token) → {id, rev} | null      read(token, id) → data      create(token, data) → {id, rev}      write(token, id, data) → {rev}
     rev(token, id) → rev  (a number that changes whenever the file changes) */
(function () {
  'use strict';
  // ↓↓↓ Samuel pastes his OAuth client ID here once (see projects\time_budget\GOOGLE_SETUP.md). Ends with .apps.googleusercontent.com
  const GOOGLE_CLIENT_ID = '715481685112-5vueobeft6qid48fk48dlph3q6lvso6h.apps.googleusercontent.com';   // Samuel's, 2026-11-24 (public by design)
  // ↑↑↑

  const BASE_SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];
  let extraScopes = [];
  let gisPromise = null, client = null, pending = null;

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { gisPromise = null; reject(new Error('Google sign-in could not load (offline?)')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  const TBGoogleAuth = {
    configured: () => !!GOOGLE_CLIENT_ID,
    scopes: () => BASE_SCOPES.concat(extraScopes),
    addScopes(list) { extraScopes = [...new Set(extraScopes.concat(list))]; },
    /* Opens Google's window. Must run right after a tap/click (browsers block pop-ups otherwise).
       opts.silent = true → prompt '' (Google shows nothing if you already agreed and are signed in; the window just flashes).
       Resolves {token, expiresAt, scope}; rejects with an Error whose .type is 'popup_failed_to_open' | 'popup_closed' | 'denied' | … */
    async requestToken(opts = {}) {
      if (!GOOGLE_CLIENT_ID) throw new Error('No Google client ID in this version of the app.');
      await loadGis();
      if (!client) {
        client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: TBGoogleAuth.scopes().join(' '),
          include_granted_scopes: true,
          callback: r => {
            const p = pending; pending = null; if (!p) return;
            if (r.error) { const e = new Error(r.error_description || r.error); e.type = r.error === 'access_denied' ? 'denied' : r.error; p.reject(e); }
            else if (!google.accounts.oauth2.hasGrantedAllScopes(r, ...BASE_SCOPES)) { const e = new Error('Drive permission was not ticked.'); e.type = 'denied'; p.reject(e); }
            else p.resolve({ token: r.access_token, expiresAt: Date.now() + (Number(r.expires_in) || 3600) * 1000, scope: r.scope });
          },
          error_callback: err => { const p = pending; pending = null; if (!p) return; const e = new Error(err.message || err.type); e.type = err.type; p.reject(e); }
        });
      }
      return new Promise((resolve, reject) => {
        if (pending) pending.reject(Object.assign(new Error('replaced'), { type: 'replaced' }));
        pending = { resolve, reject };
        const o = { scope: TBGoogleAuth.scopes().join(' '), prompt: opts.silent ? '' : (opts.prompt != null ? opts.prompt : '') };
        if (opts.hint) o.login_hint = opts.hint;
        client.requestAccessToken(o);
      });
    },
    revoke(token) { try { if (token && window.google && google.accounts) google.accounts.oauth2.revoke(token, () => {}); } catch (e) { /* ignore */ } }
  };

  /* ---------- Google Drive provider ---------- */
  const API = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
  const NAME = 'time-budget-data.json';
  async function call(token, url, init = {}) {
    const res = await fetch(url, Object.assign({}, init, { headers: Object.assign({ Authorization: 'Bearer ' + token }, init.headers || {}) }));
    if (!res.ok) {
      const e = new Error('Google Drive answered ' + res.status);
      e.status = res.status; e.type = res.status === 401 ? 'expired' : res.status === 404 ? 'missing' : 'drive';
      throw e;
    }
    return res;
  }
  const gdrive = {
    id: 'gdrive', name: 'Google Drive', auth: TBGoogleAuth,
    async who(token) {      // the signed-in account's e-mail (shown in the Sync screen, used as login_hint)
      try { const r = await call(token, 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)'); return (await r.json()).user.emailAddress || ''; }
      catch (e) { return ''; }
    },
    async find(token) {
      const q = encodeURIComponent(`name='${NAME}' and trashed=false`);
      const r = await call(token, `${API}?spaces=appDataFolder&q=${q}&orderBy=createdTime&pageSize=10&fields=files(id,version)`);
      const files = (await r.json()).files || [];
      return files.length ? { id: files[0].id, rev: String(files[0].version), others: files.slice(1).map(f => f.id) } : null;
    },
    async rev(token, id) { const r = await call(token, `${API}/${id}?fields=version`); return String((await r.json()).version); },
    async read(token, id) { const r = await call(token, `${API}/${id}?alt=media`); const txt = await r.text(); return txt ? JSON.parse(txt) : null; },
    async create(token, data) {
      const b = 'tb' + Math.random().toString(36).slice(2);
      const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: NAME, parents: ['appDataFolder'] })}\r\n` +
        `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${b}--`;
      const r = await call(token, `${UP}?uploadType=multipart&fields=id,version`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
      const j = await r.json(); return { id: j.id, rev: String(j.version) };
    },
    async write(token, id, data) {
      const r = await call(token, `${UP}/${id}?uploadType=media&fields=id,version`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json(); return { rev: String(j.version) };
    }
  };

  window.TBGoogleAuth = TBGoogleAuth;
  window.TBProviders = Object.assign(window.TBProviders || {}, { gdrive });
})();
