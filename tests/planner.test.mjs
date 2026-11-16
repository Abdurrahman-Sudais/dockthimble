import test from 'node:test';
import assert from 'node:assert/strict';
import site from '../src/content.js';
import {DOORS, appointments, people, roles} from '../src/data.js';
import {COEF, MAE, act, congestion, initial, plan, predict, report, simulate, stats, suggestions} from '../src/engine.js';

test('the duration model learns the real drivers and is accurate on unseen visits', () => {
  assert.ok(MAE < 6, `MAE ${MAE}`);
  assert.ok(COEF[2] > 1.5, 'floor-loaded pallets take much longer');
  assert.ok(COEF[6] < 0, 'a bigger crew is faster');
  const pal = predict({pallets: 26, load: 'palletised', chilled: false, docs: false});
  const flr = predict({pallets: 26, load: 'floor', chilled: false, docs: false});
  assert.ok(flr > pal * 1.8);
});

test('plans respect door types, never overlap a door, and beat one-hour slots', () => {
  const p = plan(appointments);
  for (const r of p) assert.equal(DOORS.find((d) => d.id === r.door).type, r.chilled ? 'chilled' : 'ambient');
  for (const d of DOORS) { const rs = p.filter((r) => r.door === d.id).sort((a, b) => a.start - b.start); for (let i = 1; i < rs.length; i += 1) assert.ok(rs[i].start >= rs[i - 1].end - 1e-9); }
  for (const r of p) assert.ok(r.start >= r.arrive);
  const sp = stats(p); const sf = stats(simulate(appointments));
  assert.ok(sp.avgWait < sf.avgWait / 2 && sp.maxWait < sf.maxWait);
});

test('late vehicles change the plan and long waits produce rebooking suggestions', () => {
  const late = plan(appointments.map((a) => (a.id === 'A-105' ? {...a, lateBy: 90} : a)));
  assert.equal(late.find((r) => r.id === 'A-105').arrive, appointments.find((a) => a.id === 'A-105').time + 90);
  const s = suggestions(plan(appointments));
  assert.ok(s.every((x) => x.to > x.from));
  assert.ok(congestion(simulate(appointments)).some((c) => c.warn));
  assert.ok(report().byLoad[0].k === 'Floor-loaded');
});

test('adding, late arrivals, rebooking and publishing follow the rules', () => {
  const ctx = (st) => ({roles, actor: people[st.role]});
  let st = initial(appointments, roles);
  assert.match(act(st, {type: 'add', carrier: 'X', pallets: 50, load: 'palletised', time: '10:00'}, ctx(st)).error, /Pallets/);
  st = act(st, {type: 'add', carrier: 'New Carrier', pallets: 12, load: 'mixed', time: '16:30'}, ctx(st)).state;
  assert.equal(st.appts.length, appointments.length + 1);
  st = act(st, {type: 'late', id: 'A-101', minutes: 45}, ctx(st)).state;
  assert.equal(st.appts.find((a) => a.id === 'A-101').lateBy, 45);
  const viewer = act(st, {type: 'role', role: 'viewer'}, ctx(st)).state;
  assert.equal(act(viewer, {type: 'late', id: 'A-101', minutes: 10}, ctx(viewer)).ok, false);
  const sup = act(st, {type: 'role', role: 'supervisor'}, ctx(st)).state;
  assert.match(act(sup, {type: 'approve', reason: 'All doors staffed today', summary: 'x'}, ctx(sup)).error, /planner/);
  assert.match(act(st, {type: 'approve', reason: 'ok', summary: 'x'}, ctx(st)).error, /note/);
  assert.ok(act(st, {type: 'approve', reason: 'Team 3 covers chilled doors', summary: 'x'}, ctx(st)).state.approved);
});

test('founder and contact', () => {
  assert.equal(site.team[0].name, 'Samuel Akinwale');
  assert.equal(site.email, 'samuel@dockthimble.site');
});

test('founding team: founder, co-founder and CTO', async () => {
  const {default: s} = await import('../src/content.js');
  const {strict: a} = await import('node:assert');
  a.deepEqual(s.team.map((p) => p.role), ['Founder', 'Co-founder', 'CTO']);
  for (const p of s.team) a.ok(p.bio.length > 60 && p.focus.length === 3 && p.initials.length === 2);
});
