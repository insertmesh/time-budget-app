/* Settings screen logic (04h): backup export / import. Pure functions, tested in tests\settings.test.js.
   A backup = both data keys of this browser: the taps (sam10.timeBudget.v1) and all other records (sam10.timeBudget.records).
   Sync state and device-only keys (sam10.timeBudget.sync, .local.*) are never exported. */
(function (root) {
  'use strict';
  const KEY = 'sam10.timeBudget.v1', RKEY = 'sam10.timeBudget.records';
  const parse = s => { try { return JSON.parse(s); } catch (e) { return null; } };

  function makeBackup(ls, now) {
    return { app: 'time-budget', kind: 'backup', version: 1, at: new Date(now || Date.now()).toISOString(), taps: parse(ls.getItem(KEY)), records: parse(ls.getItem(RKEY)) || {} };
  }
  function count(recs) { let n = 0; Object.keys(recs || {}).forEach(t => Object.values(recs[t] || {}).forEach(r => { if (!r.deleted) n++; })); return n; }
  function readBackup(text) {
    const d = parse(text);
    if (!d || d.app !== 'time-budget' || d.kind !== 'backup') return { ok: false, error: 'This is not a Time Budget backup file.' };
    if (d.taps != null && (typeof d.taps !== 'object' || !Array.isArray(d.taps.entries))) return { ok: false, error: 'The taps in this file look broken; nothing was changed.' };
    if (typeof d.records !== 'object' || Array.isArray(d.records)) return { ok: false, error: 'The records in this file look broken; nothing was changed.' };
    return { ok: true, data: d, taps: d.taps ? d.taps.entries.length : 0, records: count(d.records), at: String(d.at || '').slice(0, 16).replace('T', ' ') };
  }
  function applyBackup(ls, d) {
    if (d.taps) ls.setItem(KEY, JSON.stringify(d.taps)); else ls.removeItem(KEY);
    ls.setItem(RKEY, JSON.stringify(d.records || {}));
  }
  const api = { makeBackup, readBackup, applyBackup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBSettingsLogic = api;
})(typeof self !== 'undefined' ? self : this);
