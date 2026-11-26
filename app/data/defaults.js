/* Time Budget – starting data + small shared helpers for every real screen (step 04h_full_build, 2026-11-26).
   Load after store.js:   <script src="../data/store.js"></script><script src="../data/defaults.js"></script>   → window.TBDefaults

   TBDefaults.ensure(TBData)   writes the starting set ONCE per type when that type has no records at all (not even deleted ones):
       category (8 + stuck + sleep) · subcategory (own ids, deterministic) · goal (one per subcategory) · chain · template
     Seeded records get u = 1 (very old), so on sync ANY real change on another device wins over a fresh seed,
     and two devices that seed on their own write identical records (same ids) → no duplicates.
   TBDefaults.subId(cat, name)  the deterministic id of a starting subcategory ('a09_client_work').
   TBDefaults.CAT_ORDER, TINT    main category order + colours (= the timer's).
   TBDefaults.dayKey(ms)         the app's day 'YYYY-MM-DD' (day runs 04:00 → 04:00, like timer.html ldKey).
   TBDefaults.wk(goal)           a goal's minutes per week.
   TBDefaults.go(key, hash)      open another screen inside the app frame (Tap, Plans, Categories, Goals, …).
   Field lists: app\DATA_MODEL.md §4. Additive only. */
(function (root) {
  'use strict';
  const CAT_ORDER = ['a09', 'a08', 'a05', 'a06', 'a01', 'a02', 'a04', 'a03'];
  const TINT = { a09: '#7E9BB6', a08: '#4FA3A0', a05: '#C9A98A', a06: '#E0A25A', a01: '#C77FA3', a02: '#D88A72', a04: '#9C88CC', a03: '#E0B45F', sleep: '#5B5FA8', stuck: '#A7A09A' };
  const CAT_NAME = { a09: 'Work', a08: 'Commute', a05: 'Chores', a06: 'Food', a01: 'Family', a02: 'Friends', a04: 'Hobby', a03: 'Self Care', stuck: 'Stuck', sleep: 'Sleep' };

  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const subId = (cat, name) => cat + '_' + slug(name);

  // [name, type, unit, amount (min per unit), friction min, extra]  – amounts from Categories v3 (02b), all start as "keep" (base = amount)
  const SUBS = {
    a09: [['Client work', 'flex', 'week', 720, 10], ['Production', 'flex', 'week', 300, 15], ['Emails & calls', 'cap', 'week', 300], ['Problem solving', 'cap', 'week', 180],
      ['Bureaucracy', 'cap', 'week', 120], ['Car repairs', 'flex', 'month', 120]],
    a08: [['Picking up kids', 'fixed', 'week', 240], ['Drive to friends', 'cap', 'week', 180], ['Drive to family', 'flex', 'month', 240], ['Appointments', 'flex', 'week', 60]],
    a05: [['Cleaning, dishes', 'flex', 'day', 30], ['Laundry', 'flex', 'week', 180], ['Admin & paperwork', 'cap', 'week', 120], ['Shopping', 'flex', 'week', 180],
      ['Repairs', 'flex', 'month', 120, 20], ['Maintenance', 'flex', 'month', 120],
      ['Body care', 'flex', 'day', 60, 0, { isSelfCare: true, kids: [{ n: 'Hygiene', on: true, min: 25 }, { n: 'Health appointment', on: true, min: 6 }, { n: 'Toilet time', on: true, min: 45 }] }]],
    a06: [['Coffee / breakfast', 'flex', 'day', 20], ['Lunch break', 'flex', 'day', 30], ['Dinner', 'flex', 'day', 30], ['Cooking', 'flex', 'day', 30]],
    a01: [['Watching TV', 'flex', 'week', 240], ['Kids', 'flex', 'week', 300], ['Partner', 'flex', 'week', 180], ['Outing', 'flex', 'month', 480]],
    a02: [['Meeting', 'flex', 'week', 180], ['Call', 'flex', 'week', 60], ['Helping out', 'flex', 'month', 180], ['Party', 'cap', 'month', 360]],
    a04: [['Making music', 'flex', 'week', 120, 20], ['Synths', 'flex', 'week', 180, 20], ['Problem solving', 'cap', 'week', 120]],
    a03: [['TV', 'cap', 'week', 240], ['Games', 'cap', 'week', 180], ['Sofa', 'flex', 'week', 90], ['Walk', 'flex', 'week', 180],
      ['Calming down after a meltdown', 'flex', 'week', 30, 0, { note: 'only when it happens' }]]
  };
  const wk = g => g.unit === 'day' ? g.amt * 7 : g.unit === 'month' ? g.amt * 7 / 30.4 : g.amt;

  const CHAINS = [
    { id: 'chain_lunch_reset', name: 'Lunch reset', order: 0, steps: [{ c: 'a06', d: 'Lunch break' }, { c: 'a05', d: 'Cleaning, dishes' }, { c: 'a03', d: 'TV' }] },
    { id: 'chain_slow_weekend', name: 'Slow weekend morning', order: 1, steps: [{ c: 'a06', d: 'Coffee / breakfast' }, { c: 'a04', d: 'Making music' }, { c: 'a06', d: 'Lunch break' }] }
  ];

  // day templates = Plans v9 (02a) starting set; block = { k, d, dur, pin, ess?, focus? } (+ sub id)
  function templates() {
    const b = (k, d, dur, f = {}) => Object.assign({ k, d, sub: d ? subId(k, d) : null, dur, pin: null }, f);
    const ESS = () => [b('a06', 'Coffee / breakfast', 30, { ess: 1 }), b('a06', 'Lunch break', 45, { ess: 1 }), b('a05', 'Cleaning, dishes', 45, { ess: 1 }), b('a06', 'Dinner', 45, { ess: 1 })];
    const e = ESS();
    return {
      work: { kind: 'base', name: 'Workday', color: '#6E8CA8', icon: 'a09', wake: 420, bed: 1350, blocks: [e[0], b('a09', null, 270), e[1], e[2], b('a09', 'Client work', 180), b('a08', 'Picking up kids', 30, { pin: 840 }), e[3], b('a01', 'Watching TV', 90), b('a04', 'Making music', 60), b('a03', 'TV', 135)] },
      weekend: { kind: 'base', name: 'Weekend', color: '#B77393', icon: 'a01', wake: 480, bed: 1380, blocks: [b('a06', 'Coffee / breakfast', 45, { ess: 1 }), b('a01', 'Outing', 180), b('a06', 'Lunch break', 60, { ess: 1 }), b('a05', 'Cleaning, dishes', 45, { ess: 1 }), b('a05', 'Shopping', 45), b('a08', 'Drive to friends', 45), b('a02', 'Meeting', 150), b('a06', 'Dinner', 60, { ess: 1 }), b('a03', 'Games', 270)] },
      empty: { kind: 'starter', name: 'Empty', color: '#8F9A96', icon: null, wake: 420, bed: 1350, blocks: ESS() },
      hobby: { kind: 'theme', name: 'Hobby day', color: '#8A77BC', icon: 'a04', keepWork: false, wake: 420, bed: 1350, blocks: (x => [x[0], b('a04', 'Making music', 240, { focus: 1 }), x[1], b('a04', 'Synths', 120, { focus: 1 }), x[2], b('a02', 'Call', 60), x[3]])(ESS()) },
      chores: { kind: 'theme', name: 'Chores day', color: '#B08D6C', icon: 'a05', keepWork: false, wake: 420, bed: 1350, blocks: (x => [x[0], b('a05', 'Laundry', 120, { focus: 1 }), b('a05', 'Repairs', 120, { focus: 1 }), x[1], b('a05', 'Shopping', 90, { focus: 1 }), x[2], x[3]])(ESS()) },
      vacation: { kind: 'theme', name: 'Vacation', color: '#4FA3A0', icon: 'a01', keepWork: false, wake: 420, bed: 1350, blocks: (x => [x[0], b('a01', 'Outing', 300, { focus: 1 }), x[1], x[2], b('a02', 'Meeting', 120), x[3]])(ESS()) }
    };
  }

  function starting() {
    const out = { category: {}, subcategory: {}, goal: {}, chain: {}, template: {} };
    CAT_ORDER.forEach((c, i) => { out.category[c] = { id: c, name: CAT_NAME[c], order: i, colour: TINT[c] }; });
    out.category.stuck = { id: 'stuck', name: 'Stuck', order: 90, colour: TINT.stuck, locked: true };
    out.category.sleep = { id: 'sleep', name: 'Sleep', order: 91, colour: TINT.sleep, locked: true };
    CAT_ORDER.forEach(c => SUBS[c].forEach(([n, type, unit, amt, fr, extra], i) => {
      const id = subId(c, n), ex = extra || {};
      const sub = { id, cat: c, name: n, order: i };
      if (ex.isSelfCare) sub.isSelfCare = true;
      if (ex.kids) sub.kids = ex.kids;
      out.subcategory[id] = sub;
      const g = { id: 'g_' + id, cat: c, sub: id, type, unit, amt, fr: fr || 0, session: 0 };
      g.base = Math.round(wk(g));
      if (ex.note) g.note = ex.note;
      out.goal[g.id] = g;
    }));
    CHAINS.forEach(ch => { out.chain[ch.id] = JSON.parse(JSON.stringify(ch)); });
    const T = templates(); Object.keys(T).forEach(id => { out.template[id] = Object.assign({ id }, T[id]); });
    return out;
  }

  // seeds a type only when it has never had a record on this device; u = 1 so real edits always win in a merge
  function ensure(store, ls) {
    ls = ls || root.localStorage;
    let all; try { all = JSON.parse(ls.getItem(store.RKEY)) || {}; } catch (e) { all = {}; }
    const s = starting(); let wrote = false;
    Object.keys(s).forEach(type => {
      if (all[type] && Object.keys(all[type]).length) return;
      all[type] = {};
      Object.keys(s[type]).forEach(id => { all[type][id] = Object.assign({}, s[type][id], { u: 1 }); });
      wrote = true;
    });
    if (wrote) { ls.setItem(store.RKEY, JSON.stringify(all)); try { root.dispatchEvent(new root.CustomEvent('tb-data', { detail: 'records' })); } catch (e) { /* node */ } }
    return wrote;
  }

  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function dayKey(ms) { const d = new Date(ms == null ? Date.now() : ms); if (d.getHours() < 4) d.setDate(d.getDate() - 1); return isoOf(d); }
  function go(key, hash) { try { root.parent.postMessage({ tbPush: key, hash: hash || '' }, '*'); } catch (e) { /* not in the frame */ } }

  const api = { CAT_ORDER, TINT, CAT_NAME, SUBS, subId, slug, wk, starting, ensure, dayKey, isoOf, go };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBDefaults = api;
})(typeof self !== 'undefined' ? self : this);
