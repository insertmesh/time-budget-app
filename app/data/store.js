/* Time Budget – data core for ALL screens (step 04f_sync, 2026-11-24). Read app\DATA_MODEL.md first.

   Two places in this browser's localStorage:
     sam10.timeBudget.v1       = the tap timer's data (data model v2: entries = taps, plan, settings, flow). Owned by timer.html.
     sam10.timeBudget.records  = every other screen's data, as records: { <type>: { <id>: { id, u, ...fields } } }.
   The sync engine (app\sync\engine.js) puts both into one file in the user's Drive and merges other devices' changes back.

   Use from any screen page (same site):   <script src="<path>/app/data/store.js"></script>   → window.TBData
     TBData.list('category')                 → live records of a type (deleted ones left out), sorted by .order then .name
     TBData.get('category', 'a04')           → one record or null
     TBData.put('category', {name:'Hobby'})  → saves (new id if none), stamps u = now, returns the saved record
     TBData.patch('goal', id, {amount: 300}) → changes some fields
     TBData.remove('goal', id)               → deletes (keeps a tombstone so sync doesn't bring it back)
     TBData.setting('checkoutTime', '21:45') → a setting's value (or the default);  TBData.setSetting(key, value)
     TBData.entries()                        → the taps (read-only copy, sorted by start; the last one may still run: end = null)
     TBData.updateEntry(id, {approved:true}) → change a tap from another screen (check-in); the timer reloads by itself
     TBData.deleteEntry(id)                  → delete a tap (with a deleted mark)
     TBData.onChange(fn)                     → fn(where) whenever data changes here or arrives from another screen/device
   Every write is one read-modify-write of localStorage (safe between the app's screens). */
(function (root) {
  'use strict';
  const KEY = 'sam10.timeBudget.v1', RKEY = 'sam10.timeBudget.records';

  function createStore(ls, win) {
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const readJSON = k => { try { return JSON.parse(ls.getItem(k)); } catch (e) { return null; } };
    const readAll = () => readJSON(RKEY) || {};
    const listeners = new Set();
    function emit(where) { listeners.forEach(f => { try { f(where); } catch (e) { /* ignore */ } }); }
    function writeAll(all) { ls.setItem(RKEY, JSON.stringify(all)); if (win) win.dispatchEvent(new win.CustomEvent('tb-data', { detail: 'records' })); emit('records'); }
    const clone = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const byOrder = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.name || a.id).localeCompare(String(b.name || b.id));

    const api = {
      KEY, RKEY, uid,
      types: () => Object.keys(readAll()),
      list(type, opts = {}) {
        const t = readAll()[type] || {};
        return Object.values(t).filter(r => opts.withDeleted || !r.deleted).map(clone).sort(byOrder);
      },
      get(type, id) { const r = (readAll()[type] || {})[id]; return r && !r.deleted ? clone(r) : null; },
      put(type, rec) {
        if (!type || typeof type !== 'string') throw new Error('TBData.put: type missing');
        const all = readAll(), t = all[type] = all[type] || {};
        const id = rec.id != null ? String(rec.id) : uid();
        const saved = Object.assign({}, clone(rec), { id, u: Date.now() });
        delete saved.deleted;
        t[id] = saved; writeAll(all); return clone(saved);
      },
      patch(type, id, changes) {
        const all = readAll(), r = (all[type] || {})[id];
        if (!r || r.deleted) throw new Error(`TBData.patch: ${type}/${id} not found`);
        all[type][id] = Object.assign({}, r, clone(changes), { id, u: Date.now() });
        writeAll(all); return clone(all[type][id]);
      },
      remove(type, id) {
        const all = readAll(); all[type] = all[type] || {};
        all[type][id] = { id, u: Date.now(), deleted: true }; writeAll(all);
      },
      setting(key, def) { const r = api.get('setting', key); return r ? r.value : def; },
      setSetting(key, value) { return api.put('setting', { id: key, value }); },

      entries() { const d = readJSON(KEY); return d && Array.isArray(d.entries) ? clone(d.entries).sort((a, b) => a.start - b.start) : []; },
      updateEntry(id, changes) {
        const d = readJSON(KEY); const e = d && d.entries.find(x => x.id === id);
        if (!e) throw new Error('TBData.updateEntry: tap ' + id + ' not found');
        Object.assign(e, clone(changes), { id, u: Date.now() });
        ls.setItem(KEY, JSON.stringify(d)); emit('entries'); return clone(e);
      },
      deleteEntry(id) {
        const d = readJSON(KEY); if (!d) return;
        d.entries = d.entries.filter(x => x.id !== id);
        d.del = Object.assign({}, d.del || {}, { [id]: Date.now() });
        ls.setItem(KEY, JSON.stringify(d)); emit('entries');
      },
      onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
    if (win) win.addEventListener('storage', e => { if (e.key === RKEY) emit('records'); else if (e.key === KEY) emit('entries'); });
    return api;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createStore };
  else root.TBData = createStore(root.localStorage, root);
})(typeof self !== 'undefined' ? self : this);
