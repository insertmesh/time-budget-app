/* Time Budget – merge two copies of the data (step 04f_sync, 2026-11-24).
   Pure functions, no browser needed: used by the sync engine (engine.js) and by the automatic tests
   (time-budget\tests\merge.test.js, run: node --test "time-budget/tests").

   Data model v2 (timer.html), plus three OPTIONAL fields added by 04f (old copies without them still work):
     entry.u      = when this entry last changed (ms, real clock of the device that changed it)
     data.del     = { entryId: ms }  "deleted" marks, so a deletion on one device does not come back from the other
     data.meta    = { flow: ms, plan: ms, settings: ms }  when that part last changed

   Rules:
   1. Entries are matched by id. Same id on both sides → the copy with the later `u` wins
      (tie: the one that has an end, then the later end, then a fixed text order, so both devices pick the same).
   2. A deleted mark removes the entry if the mark is newer than (or as new as) the entry's last change.
   3. "A tap on any device = a switch": entries are sorted by start; an entry that still runs, or runs past the
      next entry's start, ends where the next one starts. So when two tiles run, the later tap wins.
      Real gaps (untapped time) stay gaps.
   4. Exact twins (same start, same tile, same detail; e.g. both devices ran the same automatic step) → one kept.
   5. flow / plan / settings: the side whose meta time is later wins as a whole (tie: the local side).
   The result is the same on every device, whichever side is "local". */
(function (root) {
  'use strict';

  function entryKey(e) { return JSON.stringify([e.u || 0, e.end == null ? 0 : 1, e.end || 0, JSON.stringify(e)]); }
  function newer(a, b) {             // which copy of the same entry wins?
    const ua = a.u || 0, ub = b.u || 0;
    if (ua !== ub) return ua > ub ? a : b;
    const ea = a.end != null, eb = b.end != null;
    if (ea !== eb) return ea ? a : b;
    if (ea && a.end !== b.end) return a.end > b.end ? a : b;
    return entryKey(a) >= entryKey(b) ? a : b;
  }
  const copy = x => (x == null ? x : JSON.parse(JSON.stringify(x)));

  function mergeEntries(la, lb, del) {
    const byId = new Map();
    for (const e of la.concat(lb)) {
      if (!e || e.id == null) continue;
      const have = byId.get(e.id);
      byId.set(e.id, have ? newer(have, e) : e);
    }
    let list = [...byId.values()].filter(e => !(del[e.id] != null && del[e.id] >= (e.u || 0))).map(copy);
    list.sort((x, y) => x.start - y.start || (String(x.id) < String(y.id) ? -1 : String(x.id) > String(y.id) ? 1 : 0));
    // rule 4: exact twins → keep the first (smallest id)
    list = list.filter((e, i) => {
      const p = list[i - 1];
      return !(p && p.start === e.start && p.tile === e.tile && (p.detail || null) === (e.detail || null));
    });
    // rule 3: later tap wins, real gaps stay
    for (let i = 0; i < list.length - 1; i++) {
      const e = list[i], next = list[i + 1];
      if (e.end == null || e.end > next.start) e.end = next.start;
    }
    return list;
  }

  function mergeDel(a, b) {
    const out = Object.assign({}, a || {});
    for (const k in (b || {})) out[k] = Math.max(out[k] || 0, b[k]);
    return out;
  }

  /* ---------- generic records (data core for all screens, see app\DATA_MODEL.md) ----------
     records = { <type>: { <id>: { id, u, ...fields } } }. A deleted record stays as { id, u, deleted: true } (tombstone).
     Same id on both sides → later u wins (tie: fixed text order). Types and ids only on one side are kept. */
  function newerRec(a, b) {
    const ua = a.u || 0, ub = b.u || 0;
    if (ua !== ub) return ua > ub ? a : b;
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  }
  function mergeRecords(a, b) {
    a = a || {}; b = b || {};
    const out = {};
    for (const type of [...new Set(Object.keys(a).concat(Object.keys(b)))].sort()) {
      const ta = a[type] || {}, tb = b[type] || {}, t = {};
      for (const id of [...new Set(Object.keys(ta).concat(Object.keys(tb)))].sort()) {
        t[id] = copy(ta[id] && tb[id] ? newerRec(ta[id], tb[id]) : ta[id] || tb[id]);
      }
      out[type] = t;
    }
    return out;
  }

  /* merge(local, remote) → new data object (inputs are not changed). Either side may be null. */
  function merge(local, remote) {
    if (!remote) return copy(local);
    if (!local) return copy(remote);
    const del = mergeDel(local.del, remote.del);
    const out = Object.assign({}, copy(remote), copy(local));     // unknown top-level fields: local wins
    out.v = 2;
    out.entries = mergeEntries(local.entries || [], remote.entries || [], del);
    out.del = del;
    const lm = local.meta || {}, rm = remote.meta || {}, meta = {};
    for (const part of ['flow', 'plan', 'settings']) {
      const useRemote = (rm[part] || 0) > (lm[part] || 0);
      const src = useRemote ? remote : local;
      if (src[part] !== undefined) out[part] = copy(src[part]);
      meta[part] = Math.max(lm[part] || 0, rm[part] || 0);
    }
    out.meta = meta;
    if (local.records || remote.records) out.records = mergeRecords(local.records, remote.records);
    return out;
  }

  /* Same content? (ignores key order inside entries only as far as JSON.stringify does: both sides come from the same code) */
  function canon(x) {                // JSON with sorted keys, so field order never counts as a change
    if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
    if (x && typeof x === 'object') return '{' + Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  function same(a, b) { return canon(a) === canon(b); }

  /* Stamp change times: compare `data` with the previously saved copy `prev`; every entry that is new or different
     gets u = t, every part (flow/plan/settings) that changed gets meta[part] = t. Changes `data` in place. */
  function stamp(data, prev, t) {
    const old = new Map(((prev && prev.entries) || []).map(e => [e.id, JSON.stringify(Object.assign({}, e, { u: 0 }))]));
    for (const e of data.entries || []) {
      if (old.get(e.id) !== JSON.stringify(Object.assign({}, e, { u: 0 }))) e.u = t;
    }
    data.meta = Object.assign({}, data.meta || {});
    for (const part of ['flow', 'plan', 'settings']) {
      if (!prev || JSON.stringify(prev[part]) !== JSON.stringify(data[part])) data.meta[part] = t;
    }
    return data;
  }

  const api = { merge, stamp, same, newer, mergeRecords, newerRec };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBMerge = api;
})(typeof self !== 'undefined' ? self : this);
