/* Journey (07) build logic, step 04h: turn the Journey result into real records + undo it exactly.
   Fields: mockup\07_journey\JOURNEY_DATA.md (wins) + app\DATA_MODEL.md §4. Pure functions on a TBData-like store; tests: tests\journey.test.js

   apply(store, plan, now) → { applied, undo }
     plan = { mode: 'add'|'replace',
              templates: { work: built|null, weekend: built|null },   built = { name, wake, bed, blocks:[{k, d, dur, pin, ess?, fill?, buffer?}] }
              goals: { catId: hoursPerWeek } | null,
              subs: [[catId, name]],                                    only the ticked new subcategories
              trips: [{ name, days:[0..6 Mon..Sun], len, start }] }      trips WITH a start time → calendar dates for the next 4 weeks
   undo(store, undoList)  restores every record exactly as it was before (deletes the ones Journey created). */
(function (root) {
  'use strict';
  const TPL_LOOK = { work: { id: 'journey_work', color: '#6E8CA8', icon: 'a09' }, weekend: { id: 'journey_weekend', color: '#B77393', icon: 'a01' } };
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const wk = g => g.unit === 'day' ? g.amt * 7 : g.unit === 'month' ? g.amt * 7 / 30.4 : g.amt;
  const r5 = m => Math.max(0, Math.round(m / 5) * 5);

  function apply(store, plan, now) {
    now = now || Date.now();
    const undo = [], seen = new Set();
    const keep = (type, id) => { const k = type + '/' + id; if (seen.has(k)) return; seen.add(k); undo.push({ type, id, before: store.get(type, id) }); };
    const write = (type, rec) => { keep(type, rec.id); return store.put(type, rec); };
    const applied = { at: now, mode: plan.mode, templateIds: [], goalIds: [], subcategoryIds: [], dateIds: [], planDone: true };

    // 1. new subcategories first, so template blocks can point to them
    const subs = store.list('subcategory');
    (plan.subs || []).forEach(([cat, name], i) => {
      if (subs.some(s => s.cat === cat && s.name.toLowerCase() === name.toLowerCase())) return;
      const rec = write('subcategory', { id: 's_j' + now.toString(36) + i, cat, name, order: 50 + i });
      subs.push(rec); applied.subcategoryIds.push(rec.id);
    });
    const subId = (k, d) => { const s = d && subs.find(x => x.cat === k && x.name === d); return s ? s.id : null; };

    // 2. templates: add = two new "Journey" templates · replace = new blocks/wake/bed for Workday + Weekend
    ['work', 'weekend'].forEach(kind => {
      const b = plan.templates && plan.templates[kind]; if (!b) return;
      const blocks = b.blocks.map(x => { const o = { k: x.k, d: x.d || null, sub: subId(x.k, x.d), dur: x.dur, pin: x.pin == null ? null : x.pin };
        ['ess', 'focus', 'fill', 'buffer'].forEach(f => { if (x[f]) o[f] = 1; }); return o; });
      let rec;
      if (plan.mode === 'replace') rec = Object.assign({}, store.get('template', kind) || { id: kind, kind: 'base', name: kind === 'work' ? 'Workday' : 'Weekend', color: TPL_LOOK[kind].color, icon: TPL_LOOK[kind].icon },
        { wake: b.wake, bed: b.bed, blocks });
      else rec = { id: TPL_LOOK[kind].id, kind: 'base', name: b.name, color: TPL_LOOK[kind].color, icon: TPL_LOOK[kind].icon, wake: b.wake, bed: b.bed, blocks };
      write('template', rec); applied.templateIds.push(rec.id);
    });

    // 3. weekly goals per category: a category goal is the sum of its subcategory goals (Decision 2026-11-16),
    //    so the subcategory goals are scaled to the new total; amount AND "normal" follow (Journey sets the starting point)
    if (plan.goals) {
      const goals = store.list('goal');
      Object.keys(plan.goals).forEach(cat => {
        const target = Math.max(0, plan.goals[cat] * 60), mine = goals.filter(g => g.cat === cat && g.sub);
        const sum = mine.reduce((s, g) => s + wk(g), 0);
        if (mine.length && sum > 0) mine.forEach(g => {
          const f = target / sum, amt = r5(g.amt * f), rec = Object.assign({}, g, { amt });
          rec.base = Math.round(wk(rec)); write('goal', rec); applied.goalIds.push(g.id);
        });
        else if (mine.length) { const g = mine[0]; write('goal', Object.assign({}, g, { unit: 'week', amt: r5(target), base: r5(target) })); applied.goalIds.push(g.id); }
        else { const id = 'g_' + cat, old = store.get('goal', id) || { id, cat, sub: null, type: 'flex', fr: 0, session: 0 };
          write('goal', Object.assign({}, old, { unit: 'week', amt: r5(target), base: r5(target) })); applied.goalIds.push(id); }
      });
    }

    // 4. trips with a start time → plain fixed calendar dates, next 4 weeks (from tomorrow)
    let n = 0;
    (plan.trips || []).filter(t => t.start != null && String(t.name || '').trim() && t.days && t.days.length).forEach(t => {
      for (let i = 1; i <= 28; i++) {
        const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i);
        if (t.days.indexOf((d.getDay() + 6) % 7) < 0) continue;
        const rec = write('calendar_date', { id: 'cd_j' + now.toString(36) + '_' + (n++), date: iso(d), k: 'a08', d: String(t.name).trim(), start: t.start, dur: t.len, approved: true, sourceId: null, source: 'journey' });
        applied.dateIds.push(rec.id);
      }
    });
    return { applied, undo };
  }

  function undo(store, list) {
    (list || []).slice().reverse().forEach(x => { if (x.before) { const b = Object.assign({}, x.before); delete b.u; store.put(x.type, b); } else store.remove(x.type, x.id); });
  }

  const api = { apply, undo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBJourney = api;
})(typeof self !== 'undefined' ? self : this);
