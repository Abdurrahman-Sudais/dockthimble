import React, {useEffect, useState} from 'react';
import site from './content.js';
import {BOOKED_SLOT, LOADS, SITE, appointments, hhmm, people, roles} from './data.js';
import {COEF, FEATURES, MAE, act, can, congestion, features, initial, plan, predict, report, simulate, stats, suggestions} from './engine.js';
import {Lanes} from './Lanes.jsx';
import {Logo} from './App.jsx';

const KEY = 'dockthimble-planner-v1';
const min = (m) => `${Math.round(m)} min`;
const blank = {carrier: '', direction: 'Inbound', pallets: '', load: 'palletised', chilled: false, docs: false, time: '16:00'};

export default function Planner() {
  const [state, setState] = useState(() => initial(appointments, roles));
  const [tab, setTab] = useState('plan');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(blank);
  const [late, setLate] = useState({});
  const [note, setNote] = useState('');
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.appts) setState(s); } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  const actor = people[state.role];
  const allow = (p) => can(roles, state.role, p);
  const run = (a, after) => { const r = act(state, a, {roles, actor}); setMsg(r.ok ? '' : r.error); if (r.ok) { setState(r.state); after?.(); } };
  const rows = plan(state.appts);
  const fixed = simulate(state.appts);
  const sp = stats(rows); const sf = stats(fixed);
  const cong = congestion(rows);
  const sug = suggestions(rows);
  const rep = report();
  const summary = `${rows.length} vehicles · avg wait ${min(sp.avgWait)} · ${sp.over30} over 30 min · last out ${hhmm(sp.lastOut)}`;
  const exportCsv = () => { const r = [['appointment', 'carrier', 'direction', 'pallets', 'load', 'arrives', 'door', 'team', 'start', 'end', 'predicted min', 'wait min'], ...rows.map((x) => [x.id, x.carrier, x.direction, x.pallets, LOADS[x.load], hhmm(x.arrive), x.door, x.team, hhmm(x.start), hhmm(x.end), Math.round(x.dur), Math.round(x.wait)])].map((y) => y.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')); const url = URL.createObjectURL(new Blob([r.join('\n')], {type: 'text/csv'})); const a = document.createElement('a'); a.href = url; a.download = 'dockthimble-plan.csv'; a.click(); URL.revokeObjectURL(url); };
  const preview = form.pallets ? predict({...form, pallets: Number(form.pallets)}) : null;

  return (
    <div className="pl">
      <header className="pl-top">
        <a href="/" className="brand" aria-label="Back to the DockThimble website"><Logo size={26} /><span>DOCKTHIMBLE</span></a>
        <span className="mono">{SITE.name} · tomorrow {hhmm(SITE.shift[0])}–{hhmm(SITE.shift[1])} · 6 doors · {SITE.teams} teams</span>
        <label className="pl-role">Signed in as <select value={state.role} onChange={(e) => run({type: 'role', role: e.target.value})}>{roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
        <button className="btn ghost sm" onClick={() => { setState(initial(appointments, roles)); setMsg(''); }}>Reset</button>
      </header>
      <p className="pl-banner">Fictional warehouse. Durations are predictions for planners to confirm; DockThimble never contacts carriers.</p>
      <main className="pl-main">
        <div className="pl-head"><h1>{site.app.title}</h1>
          <div className="pl-tabs" role="group" aria-label="View">{[['plan', 'Dock plan'], ['appts', `Appointments (${state.appts.length})`], ['model', 'Duration model'], ['reports', 'Turnaround report']].map(([id, l]) => <button key={id} className={tab === id ? 'on' : ''} aria-pressed={tab === id} onClick={() => { setTab(id); setMsg(''); }}>{l}</button>)}</div></div>
        {msg && <p className="pl-err" role="alert">{msg}</p>}

        {tab === 'plan' && (
          <div className="pl-grid">
            <section className="pl-card pl-wide" aria-labelledby="dp-h">
              <h2 id="dp-h">Doors and times</h2>
              <Lanes rows={rows} />
              <dl className="kpis">
                <div><dt>Average wait</dt><dd>{min(sp.avgWait)}<small>{min(sf.avgWait)} on one-hour slots</small></dd></div>
                <div><dt>Longest wait</dt><dd className={sp.maxWait > 30 ? 'bad' : ''}>{min(sp.maxWait)}<small>{min(sf.maxWait)} on one-hour slots</small></dd></div>
                <div><dt>Over 30 min</dt><dd className={sp.over30 ? 'bad' : ''}>{sp.over30}<small>{sf.over30} on one-hour slots</small></dd></div>
                <div><dt>Last vehicle out</dt><dd>{hhmm(sp.lastOut)}<small>shift ends {hhmm(SITE.shift[1])}</small></dd></div>
              </dl>
              <div className="cong" aria-label="Vehicles waiting per half-hour">{cong.filter((c) => c.t < SITE.shift[1]).map((c) => <span key={c.t} className={c.warn ? 'warn' : c.q ? 'some' : ''} title={`${hhmm(c.t)}: ${c.q} waiting`}><i>{hhmm(c.t)}</i>{c.q || ''}</span>)}</div>
              <p className="fine">Half-hours with two or more vehicles waiting are marked red.</p>
            </section>
            <section className="pl-card" aria-labelledby="sg-h">
              <h2 id="sg-h">Suggested changes</h2>
              {!sug.length && <p className="empty">No vehicle waits more than 30 minutes. Nothing to change.</p>}
              <ul className="sug">{sug.map((s) => <li key={s.id}><p>{s.text}</p><button className="btn sm" disabled={!allow('plan')} onClick={() => run({type: 'accept', suggestion: s})}>Rebook</button></li>)}</ul>
              <h3>Late arrivals</h3>
              <ul className="latelist">{rows.filter((r) => r.lateBy > 0).map((r) => <li key={r.id}><b>{r.id}</b> {r.carrier} · {r.lateBy} min late · now starts {hhmm(r.start)} at {r.door}</li>)}{!rows.some((r) => r.lateBy) && <li className="fine">Record late vehicles under Appointments.</li>}</ul>
            </section>
            <aside className="pl-card" aria-label="Publish and log">
              <h2>Publish the plan</h2>
              {state.approved ? <p className="ok">Published by {state.approved.by}: {state.approved.summary} — “{state.approved.reason}”</p> : (<>
                <p className="mono">{summary}</p>
                <textarea rows="3" aria-label="Note for the dock team" placeholder="Note for the dock team (required)" value={note} onChange={(e) => setNote(e.target.value)} disabled={!allow('plan')} />
                <button className="btn" disabled={!allow('plan')} onClick={() => run({type: 'approve', reason: note, summary}, () => setNote(''))}>Publish plan</button>
                {!allow('plan') && <p className="fine">Only the dock planner or warehouse manager publishes.</p>}
              </>)}
              {allow('export') && <button className="btn ghost sm" onClick={exportCsv}>Export plan (CSV)</button>}
              <h3>Log</h3>
              <ul className="log">{state.log.slice(0, 8).map((l, i) => <li key={i}><time>{new Date(l.at).toLocaleTimeString()}</time> <b>{l.actor}</b> · {l.summary}</li>)}{!state.log.length && <li className="fine">Bookings, late arrivals and plans appear here.</li>}</ul>
            </aside>
          </div>
        )}

        {tab === 'appts' && (
          <div className="pl-grid two">
            <section className="pl-card" aria-labelledby="ap-h">
              <h2 id="ap-h">Tomorrow’s appointments</h2>
              <table className="tbl"><thead><tr><th scope="col">Ref</th><th scope="col">Carrier</th><th scope="col">Load</th><th scope="col">Booked</th><th scope="col">Predicted</th><th scope="col">Late by (min)</th></tr></thead>
                <tbody>{[...state.appts].sort((a, b) => a.time - b.time).map((a) => (
                  <tr key={a.id}><th scope="row">{a.id}</th><td>{a.carrier}<small>{a.direction}</small></td><td>{a.pallets} · {LOADS[a.load]}{a.chilled ? ' · chilled' : ''}{a.docs ? ' · docs' : ''}</td><td>{hhmm(a.time)}</td><td>{Math.round(predict(a))} min</td>
                    <td><span className="lt"><input aria-label={`Minutes late for ${a.id}`} type="number" min="0" max="240" value={late[a.id] ?? a.lateBy} onChange={(e) => setLate({...late, [a.id]: e.target.value})} disabled={!allow('late')} /><button className="btn ghost sm" disabled={!allow('late')} onClick={() => run({type: 'late', id: a.id, minutes: late[a.id] ?? a.lateBy})}>Set</button></span></td></tr>
                ))}</tbody></table>
            </section>
            <section className="pl-card" aria-labelledby="add-h">
              <h2 id="add-h">Add an appointment</h2>
              <div className="addf">
                <label>Carrier<input value={form.carrier} onChange={(e) => setForm({...form, carrier: e.target.value})} disabled={!allow('add')} /></label>
                <label>Direction<select value={form.direction} onChange={(e) => setForm({...form, direction: e.target.value})} disabled={!allow('add')}><option>Inbound</option><option>Outbound</option></select></label>
                <label>Pallets<input type="number" min="1" max="40" value={form.pallets} onChange={(e) => setForm({...form, pallets: e.target.value})} disabled={!allow('add')} /></label>
                <label>Packing<select value={form.load} onChange={(e) => setForm({...form, load: e.target.value})} disabled={!allow('add')}>{Object.entries(LOADS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label>Arrival<input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} disabled={!allow('add')} /></label>
                <label className="chk"><input type="checkbox" checked={form.chilled} onChange={(e) => setForm({...form, chilled: e.target.checked})} disabled={!allow('add')} /> Chilled</label>
                <label className="chk"><input type="checkbox" checked={form.docs} onChange={(e) => setForm({...form, docs: e.target.checked})} disabled={!allow('add')} /> Document check</label>
              </div>
              {preview && <p className="est">Predicted at the door: <b>{Math.round(preview)} min</b> ± {MAE.toFixed(1)} · booked slot today would be {BOOKED_SLOT} min</p>}
              <button className="btn" disabled={!allow('add')} onClick={() => run({type: 'add', ...form}, () => setForm(blank))}>Add appointment</button>
            </section>
          </div>
        )}

        {tab === 'model' && (
          <section className="pl-card" aria-labelledby="md-h">
            <h2 id="md-h">What the duration model learned</h2>
            <p className="fine">A linear model fitted to 260 past turnarounds, checked on 60 it never saw: typical error ±{MAE.toFixed(1)} minutes.</p>
            <ul className="coef">{FEATURES.map((f, i) => <li key={f}><span>{f}</span><b>{COEF[i] >= 0 ? '+' : ''}{COEF[i].toFixed(2)} min</b></li>)}</ul>
            <h3>Breakdown for each appointment</h3>
            <table className="tbl"><thead><tr><th scope="col">Ref</th>{FEATURES.map((f) => <th key={f} scope="col">{f.replace('Extra per pallet, ', '+ ').replace('Per pallet, each crew member above 3', 'Crew')}</th>)}<th scope="col">Total</th></tr></thead>
              <tbody>{state.appts.map((a) => { const x = features(a); return <tr key={a.id}><th scope="row">{a.id}</th>{x.map((v, i) => <td key={i}>{(v * COEF[i]).toFixed(0)}</td>)}<td><b>{Math.round(predict(a))}</b></td></tr>; })}</tbody></table>
          </section>
        )}

        {tab === 'reports' && (
          <section className="pl-card" aria-labelledby="rp-h">
            <h2 id="rp-h">Turnaround report</h2>
            <p className="fine">{Math.round(rep.overShare * 100)}% of 320 past visits ran over the one-hour booked slot.</p>
            <div className="reps">{[['By load type', rep.byLoad], ['By carrier', rep.byCarrier], ['By handling', rep.byExtra]].map(([t, rs]) => (
              <table key={t} className="tbl"><caption>{t}</caption><thead><tr><th scope="col" /><th scope="col">Visits</th><th scope="col">Avg min</th><th scope="col">Over slot</th></tr></thead>
                <tbody>{rs.map((r) => <tr key={r.k}><th scope="row">{r.k}</th><td>{r.n}</td><td>{Math.round(r.avg)}</td><td className={r.over > 0.5 ? 'bad' : ''}>{Math.round(r.over * 100)}%</td></tr>)}</tbody></table>
            ))}</div>
          </section>
        )}
      </main>
    </div>
  );
}
