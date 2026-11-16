// Dock-planner rules. Turnaround minutes come from a linear model fitted to past turnarounds; appointments are
// matched to compatible doors and free teams; queues are simulated to warn about congestion; late arrivals and
// long waits produce rebooking suggestions that a planner accepts or ignores.
import {BOOKED_SLOT, DOORS, LOADS, SITE, hhmm, history as HISTORY} from './data.js';

export const can = (roles, roleId, perm) => !!roles.find((r) => r.id === roleId)?.can.includes(perm);
export const FEATURES = ['Base (dock, paperwork)', 'Per pallet', 'Extra per pallet, floor-loaded', 'Extra per pallet, mixed', 'Chilled handling', 'Document check', 'Per pallet, each crew member above 3'];
export const CREW = 3;
export const features = (r) => [1, r.pallets, r.load === 'floor' ? r.pallets : 0, r.load === 'mixed' ? r.pallets : 0, r.chilled ? 1 : 0, r.docs ? 1 : 0, ((r.crew ?? CREW) - 3) * r.pallets];

export function fit(records) {
  const k = FEATURES.length;
  const A = Array.from({length: k}, () => Array(k + 1).fill(0));
  for (const r of records) { const x = features(r); for (let i = 0; i < k; i += 1) { for (let j = 0; j < k; j += 1) A[i][j] += x[i] * x[j]; A[i][k] += x[i] * r.minutes; } }
  for (let c = 0; c < k; c += 1) {
    let p = c; for (let r = c + 1; r < k; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r += 1) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= k; j += 1) A[r][j] -= f * A[c][j]; }
  }
  return A.map((row, i) => row[k] / row[i]);
}

export const COEF = fit(HISTORY.slice(0, 260));
export const predict = (r, coef = COEF) => Math.max(15, features(r).reduce((s, x, i) => s + x * coef[i], 0));
export const MAE = HISTORY.slice(260).reduce((s, r) => s + Math.abs(predict(r) - r.minutes), 0) / 60;

/**
 * Plan the day: in arrival order, each vehicle gets the compatible door and team that can start it soonest.
 * `durationOf` lets the same planner run with booked one-hour slots for comparison.
 */
export function plan(appts, {durationOf = predict, teams = SITE.teams} = {}) {
  const doorFree = Object.fromEntries(DOORS.map((d) => [d.id, SITE.shift[0]]));
  const teamFree = Array(teams).fill(SITE.shift[0]);
  const rows = [...appts].map((a) => ({...a, arrive: a.time + (a.lateBy || 0)})).sort((a, b) => a.arrive - b.arrive || a.id.localeCompare(b.id));
  const out = [];
  for (const a of rows) {
    const dur = durationOf(a);
    const team = teamFree.indexOf(Math.min(...teamFree));
    const options = DOORS.filter((d) => d.type === (a.chilled ? 'chilled' : 'ambient')).map((d) => ({d, start: Math.max(a.arrive, doorFree[d.id], teamFree[team])}));
    const best = options.sort((x, y) => x.start - y.start)[0];
    const end = best.start + dur;
    doorFree[best.d.id] = end; teamFree[team] = end;
    out.push({...a, door: best.d.id, team: team + 1, start: best.start, end, dur, wait: best.start - a.arrive});
  }
  return out;
}

/** What actually happens if the day is planned on booked slots but vehicles take their real (predicted) time. */
export function simulate(appts, {planned = BOOKED_SLOT} = {}) {
  const booked = plan(appts, {durationOf: () => planned});
  const doorFree = {}; const teamFree = Array(SITE.teams).fill(SITE.shift[0]);
  return booked.sort((a, b) => a.start - b.start).map((b) => {
    const dur = predict(b);
    const team = teamFree.indexOf(Math.min(...teamFree));
    const start = Math.max(b.arrive, doorFree[b.door] ?? SITE.shift[0], teamFree[team]);
    doorFree[b.door] = start + dur; teamFree[team] = start + dur;
    return {...b, start, end: start + dur, dur, wait: start - b.arrive};
  });
}

export const stats = (rows) => ({avgWait: rows.reduce((s, r) => s + r.wait, 0) / rows.length, maxWait: Math.max(...rows.map((r) => r.wait)), over30: rows.filter((r) => r.wait > 30).length, lastOut: Math.max(...rows.map((r) => r.end))});

/** Vehicles waiting (arrived, not started) in each 30-minute window; warns where two or more queue. */
export function congestion(rows) {
  const out = [];
  for (let t = SITE.shift[0]; t < SITE.shift[1] + 120; t += 30) {
    const q = rows.filter((r) => r.arrive < t + 30 && r.start > t).length;
    out.push({t, q, warn: q >= 2});
  }
  return out;
}

/** Suggested changes: rebook vehicles that would wait more than 30 minutes to when a door is actually ready. */
export function suggestions(rows) {
  return rows.filter((r) => r.wait > 30).map((r) => ({id: `move-${r.id}`, appt: r.id, from: r.time, to: Math.round(r.start / 5) * 5 - (r.lateBy || 0), text: `Rebook ${r.carrier} (${r.id}) from ${hhmm(r.time)} to ${hhmm(Math.round(r.start / 5) * 5)} — door ${r.door} and a team are free then; otherwise it waits about ${Math.round(r.wait)} min.`}));
}

/** Turnaround history by load type and by carrier, against the one-hour booked slot. */
export function report(hist = HISTORY) {
  const group = (key, label) => Object.entries(hist.reduce((m, r) => { (m[key(r)] ||= []).push(r); return m; }, {})).map(([k, rs]) => ({k: label(k), n: rs.length, avg: rs.reduce((s, r) => s + r.minutes, 0) / rs.length, over: rs.filter((r) => r.minutes > BOOKED_SLOT).length / rs.length})).sort((a, b) => b.avg - a.avg);
  return {byLoad: group((r) => r.load, (k) => LOADS[k]), byCarrier: group((r) => r.carrier, (k) => k), byExtra: group((r) => (r.docs ? 'Document check' : r.chilled ? 'Chilled' : 'Standard'), (k) => k), overShare: hist.filter((r) => r.minutes > BOOKED_SLOT).length / hist.length};
}

export function initial(appts, roles) {
  return {appts: structuredClone(appts), log: [], approved: null, role: roles[0].id};
}

const now = () => new Date().toISOString();

export function act(state, a, {roles, actor}) {
  const fail = (error) => ({state, ok: false, error});
  if (a.type === 'role') return {state: {...state, role: a.role}, ok: true};
  const allow = (p) => can(roles, state.role, p);
  const log = (id, summary, patch) => ({ok: true, state: {...state, ...patch, approved: a.type === 'approve' ? patch.approved : null, log: [{at: now(), actor, role: state.role, id, summary}, ...state.log]}});
  const put = (id, patch) => state.appts.map((x) => (x.id === id ? {...x, ...patch} : x));
  switch (a.type) {
    case 'add': {
      if (!allow('add')) return fail('Viewers cannot add appointments.');
      const p = Number(a.pallets); const t = a.time ? a.time.split(':').reduce((h, m) => Number(h) * 60 + Number(m)) : NaN;
      if (!a.carrier?.trim()) return fail('Enter the carrier.');
      if (!(p >= 1 && p <= 40)) return fail('Pallets must be between 1 and 40.');
      if (!LOADS[a.load]) return fail('Choose how the load is packed.');
      if (!(t >= SITE.shift[0] && t <= SITE.shift[1] - 30)) return fail(`Arrival must be between ${hhmm(SITE.shift[0])} and ${hhmm(SITE.shift[1] - 30)}.`);
      const id = `A-${100 + state.appts.length + 1}`;
      return log(id, `Added ${id}: ${a.carrier.trim()}, ${p} pallets ${LOADS[a.load].toLowerCase()}, ${hhmm(t)}`, {appts: [...state.appts, {id, carrier: a.carrier.trim(), direction: a.direction || 'Inbound', pallets: p, load: a.load, chilled: !!a.chilled, docs: !!a.docs, time: t, lateBy: 0}]});
    }
    case 'late': {
      if (!allow('late')) return fail('Only the shift supervisor or planner records arrivals.');
      const x = state.appts.find((y) => y.id === a.id);
      if (!x) return fail('Appointment not found.');
      const m = Number(a.minutes);
      if (!(m >= 0 && m <= 240)) return fail('Enter how late the vehicle is, in minutes (0–240).');
      return log(x.id, m ? `${x.carrier} running ${m} min late` : `${x.carrier} back on time`, {appts: put(x.id, {lateBy: m})});
    }
    case 'accept': {
      if (!allow('plan')) return fail('Only the dock planner or manager changes bookings.');
      const s = a.suggestion;
      if (!s) return fail('That suggestion is no longer open.');
      return log(s.appt, `Rebooked ${s.appt} ${hhmm(s.from)} → ${hhmm(s.to)}`, {appts: put(s.appt, {time: s.to})});
    }
    case 'approve': {
      if (!allow('plan')) return fail('Only the dock planner or manager publishes the dock plan.');
      const why = (a.reason || '').trim();
      if (why.length < 8) return fail('Add a note for the dock team (at least 8 characters).');
      return log('plan', `Published dock plan (${a.summary}) — ${why}`, {approved: {by: actor, reason: why, summary: a.summary}});
    }
    default:
      return fail('Unknown action.');
  }
}
