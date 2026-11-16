import React, {useState} from 'react';
import site from './content.js';
import {BOOKED_SLOT, appointments, hhmm} from './data.js';
import {COEF, FEATURES, MAE, congestion, plan, report, simulate, stats, suggestions} from './engine.js';
import {ACROSS, SERVICES, STAGES, WHY} from './aws.js';
import {PROGRESS} from './forms.js';
import {Lanes} from './Lanes.jsx';
import Planner from './Planner.jsx';
import PilotForm from './PilotForm.jsx';
import ContactForm from './ContactForm.jsx';

export function Logo({size = 30}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#22252a" />
      <path d="M8 32V14l12-6 12 6v18" fill="none" stroke="#f6c90e" strokeWidth="3" strokeLinejoin="round" />
      <rect x="13" y="19" width="14" height="13" fill="#f6c90e" /><path d="M13 23h14M13 27h14" stroke="#22252a" strokeWidth="2" />
    </svg>
  );
}

const PLAN = plan(appointments);
const FIXED = simulate(appointments);
const SP = stats(PLAN); const SF = stats(FIXED);
const REP = report();
const min = (m) => `${Math.round(m)} min`;

function Header() {
  const [open, setOpen] = useState(false);
  const links = [['The problem', '/#slots'], ['Predictions', '/#predict'], ['Queues', '/#queues'], ['Reports', '/#reports'], ['Technology', '/#technology'], ['Pricing', '/#pricing'], ['Contact', '/#contact']];
  return (
    <header className="hd">
      <a href="/" className="brand" aria-label="DockThimble home"><Logo /><span>DOCKTHIMBLE</span></a>
      <nav id="nav" className={open ? 'nav open' : 'nav'} aria-label="Main">
        {links.map(([t, h]) => <a key={t} href={h} onClick={() => setOpen(false)}>{t}</a>)}
        <a className="nav-app" href="/app" onClick={() => setOpen(false)}>Open the dock planner</a>
      </nav>
      <a className="hd-cta" href="/app">Dock planner</a>
      <button className="menu" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hazard" aria-hidden="true" />
      <div className="hero-in">
        <div>
          <p className="kicker">Warehouse & loading-bay planning</p>
          <h1 id="hero-title">Make warehouse appointments more predictable.</h1>
          <p className="lede">{site.about}</p>
          <div className="ctas"><a className="btn" href="/app">Open the dock planner</a><a className="btn ghost" href="#pilot">Request a pilot</a></div>
        </div>
        <figure className="board">
          <div className="board-top"><p className="mono">Dock board · {appointments.length} vehicles · 6 doors · 3 teams</p><p className="mono amber">fictional day</p></div>
          <Lanes rows={PLAN} label="Tomorrow's dock plan with predicted turnaround times" />
          <dl className="board-stats">
            <div><dt>Average wait</dt><dd>{min(SP.avgWait)}<small>vs {min(SF.avgWait)} on one-hour slots</small></dd></div>
            <div><dt>Longest wait</dt><dd>{min(SP.maxWait)}<small>vs {min(SF.maxWait)}</small></dd></div>
            <div><dt>Waiting over 30 min</dt><dd>{SP.over30}<small>vs {SF.over30} vehicles</small></dd></div>
          </dl>
        </figure>
      </div>
    </section>
  );
}

function Slots() {
  const max = Math.max(...REP.byLoad.map((r) => r.avg)) * 1.15;
  return (
    <section className="sec" id="slots" aria-labelledby="slot-title">
      <div className="split">
        <div>
          <p className="kicker">The problem</p>
          <h2 id="slot-title">One-hour slots for jobs that take longer.</h2>
          <p className="intro">Most warehouses book every vehicle into the same slot length. A palletised trailer is out in under an hour; a floor-loaded container takes nearly ninety minutes. The slots look tidy on the booking sheet and fall apart in the yard.</p>
          <p className="callout"><b>{Math.round(REP.overShare * 100)}%</b> of past turnarounds at this fictional site ran over the one-hour slot.</p>
        </div>
        <div className="slotchart" data-dock>
          {REP.byLoad.map((r) => (
            <div key={r.k} className="sc-row"><span>{r.k}<small>{r.n} visits</small></span><div className="sc-bar"><i style={{width: `${(r.avg / max) * 100}%`}} /><em style={{left: `${(BOOKED_SLOT / max) * 100}%`}} /></div><b>{Math.round(r.avg)}′</b></div>
          ))}
          <p className="fine">Average minutes at the door by load type. The dashed line is the one-hour booked slot.</p>
        </div>
      </div>
    </section>
  );
}

function Predict() {
  return (
    <section className="sec asphalt" id="predict" aria-labelledby="pr-title">
      <p className="kicker">Duration predictions</p>
      <h2 id="pr-title">How long this vehicle will really take.</h2>
      <p className="intro">DockThimble learns from your own turnaround records: pallet count, how the load is packed, chilled handling, document checks and crew size. Every estimate carries the model’s typical error on visits it never saw — ±{MAE.toFixed(1)} minutes here.</p>
      <ul className="drivers" data-dock>{FEATURES.map((f, i) => <li key={f}><span>{f}</span><b>{COEF[i] >= 0 ? '+' : ''}{COEF[i].toFixed(i === 0 || i >= 4 && i <= 5 ? 0 : 2)} min</b></li>)}</ul>
      <div className="examples" data-dock>{PLAN.filter((r) => ['A-101', 'A-105', 'A-102'].includes(r.id)).map((r) => (
        <article key={r.id}><p className="mono">{r.id} · {r.carrier}</p><b>{Math.round(r.dur)}<small> min</small></b><p>{r.pallets} pallets · {r.load === 'floor' ? 'floor-loaded' : r.load}{r.docs ? ' · document check' : ''}</p></article>
      ))}</div>
    </section>
  );
}

function Queues() {
  const cp = congestion(PLAN); const cf = congestion(FIXED);
  const top = Math.max(3, ...cf.map((c) => c.q));
  return (
    <section className="sec" id="queues" aria-labelledby="q-title">
      <p className="kicker">Appointment planning & congestion warnings</p>
      <h2 id="q-title">See the queue before the trucks do.</h2>
      <p className="intro">Each vehicle is matched to a compatible door and a free team. DockThimble then simulates the day and flags half-hours where two or more vehicles will be waiting — so bookings can move before the yard fills up.</p>
      <div className="queues" data-dock>
        {[['Booked in one-hour slots', cf], ['Planned with predicted durations', cp]].map(([t, c]) => (
          <div key={t} className="q-row"><p>{t}</p><div className="q-bars">{c.map((x) => <i key={x.t} className={x.warn ? 'warn' : ''} style={{height: `${(x.q / top) * 100}%`}} title={`${hhmm(x.t)}: ${x.q} waiting`} />)}</div></div>
        ))}
        <div className="q-axis"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span></div>
      </div>
      <p className="fine">Vehicles waiting per half-hour on the same fictional day. Red marks a congestion warning.</p>
    </section>
  );
}

function Adjust() {
  const late = plan(appointments.map((a) => (a.id === 'A-106' ? {...a, lateBy: 75} : a)));
  const sug = suggestions(late);
  return (
    <section className="sec" aria-labelledby="adj-title">
      <div className="split">
        <div>
          <p className="kicker">Schedule adjustments</p>
          <h2 id="adj-title">When a truck is late, re-plan in seconds.</h2>
          <p className="intro">The supervisor records a late arrival; DockThimble re-plans doors and teams around it and suggests which bookings to move. The planner decides what to agree with carriers.</p>
        </div>
        <div className="ticket" data-dock>
          <p className="mono">Kola Transport (A-106) · running 75 min late</p>
          {sug.length ? <ul>{sug.map((s) => <li key={s.id}>{s.text}</li>)}</ul> : <p>No other vehicle is affected: the plan absorbs the delay.</p>}
        </div>
      </div>
    </section>
  );
}

function Reports() {
  return (
    <section className="sec" id="reports" aria-labelledby="rep-title">
      <p className="kicker">Turnaround reporting</p>
      <h2 id="rep-title">Find the bottlenecks that keep coming back.</h2>
      <div className="reps" data-dock>
        {[['By carrier', REP.byCarrier], ['By handling', REP.byExtra]].map(([t, rows]) => (
          <table key={t}><caption>{t}</caption><thead><tr><th scope="col" /><th scope="col">Visits</th><th scope="col">Avg minutes</th><th scope="col">Over slot</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.k}><th scope="row">{r.k}</th><td>{r.n}</td><td>{Math.round(r.avg)}</td><td>{Math.round(r.over * 100)}%</td></tr>)}</tbody></table>
        ))}
      </div>
      <p className="fine">From 320 fictional past turnarounds.</p>
    </section>
  );
}

const STEPS = [['Load your history', 'Upload past turnaround records — arrival, start, finish, pallets, load type.'], ['Enter appointments', 'Add tomorrow’s bookings by hand or from your booking sheet.'], ['Plan the day', 'Durations are predicted; doors and teams are matched; queues are flagged.'], ['Adjust and publish', 'Accept rebooking suggestions, record late arrivals and publish the plan to the dock team.']];
const RULES = [['Planners decide', 'Suggestions are for the planner to accept; the published plan is theirs.'], ['Your records, your model', 'Durations learn from your own dock, not an industry average.'], ['Errors on show', 'Every estimate comes with its typical error.'], ['No automatic messages', 'DockThimble never contacts carriers on its own.']];

function Steps() {
  return (
    <section className="sec" aria-labelledby="how-title">
      <p className="kicker">How it works</p>
      <h2 id="how-title">From a booking sheet to a dock plan.</h2>
      <ol className="steps">{STEPS.map(([t, d], i) => <li key={t} data-dock><span>{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
      <h3 className="sub">Ground rules</h3>
      <div className="rules">{RULES.map(([t, d]) => <article key={t} data-dock><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>
  );
}

function Stats() {
  return (
    <section className="sec" aria-labelledby="stats-title">
      <p className="kicker">Why it matters</p>
      <h2 id="stats-title">Waiting at the dock is expensive for everyone.</h2>
      <div className="stats">{site.stats.map((s) => <article key={s.value} data-dock><b>{s.value}</b><p>{s.label}</p><a href={s.url} target="_blank" rel="noopener noreferrer">{s.source}</a></article>)}</div>
    </section>
  );
}

const WHO = [['Third-party logistics providers', 'Many clients, many carriers, one set of doors.'], ['Distribution centres', 'High daily volumes where a bad morning ripples all day.'], ['Wholesalers', 'Mixed loads and floor-loaded containers that never fit a standard slot.'], ['Manufacturing warehouses', 'Inbound materials and outbound orders competing for the same bays.']];

function Who() {
  return (
    <section className="sec" aria-labelledby="who-title">
      <p className="kicker">Who it’s for</p>
      <h2 id="who-title">For the people who run the dock.</h2>
      <div className="who">{WHO.map(([t, d]) => <article key={t} data-dock><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>
  );
}

const PLANS = [['Single site', '$290', 'per warehouse / month', ['Up to 8 doors', 'Duration predictions', 'Door plan and queue warnings', 'Late-arrival suggestions'], false], ['Network', '$240', 'per warehouse / month, 3+ sites', ['Everything in Single site', 'Turnaround reporting across sites', 'Roles and audit log', 'Booking-sheet import'], true], ['Enterprise', 'Custom', '', ['Large networks', 'WMS or yard-system integration on request', 'Single sign-on', 'Agreed data-handling terms'], false]];

function Pricing() {
  return (
    <section className="sec" id="pricing" aria-labelledby="pricing-title">
      <p className="kicker">Pricing</p>
      <h2 id="pricing-title">Priced by warehouse.</h2>
      <p className="intro">Illustrative pricing for a proposed product, to be agreed with pilot customers.</p>
      <div className="plans">{PLANS.map(([n, p, per, items, hl]) => <article key={n} className={hl ? 'plan hl' : 'plan'} data-dock><h3>{n}</h3><p className="price">{p}<small>{per}</small></p><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul><a className={hl ? 'btn' : 'btn ghost'} href="#pilot">{n === 'Enterprise' ? 'Contact us' : 'Request a pilot'}</a></article>)}</div>
    </section>
  );
}

function Technology() {
  return (
    <section className="sec" id="technology" aria-labelledby="tech-title">
      <p className="kicker">Technology</p>
      <h2 id="tech-title">How we use Amazon Web Services.</h2>
      <p className="intro">{WHY}</p>
      <ol className="stages">{STAGES.map(([t, svcs, d], i) => <li key={t} data-dock><span className="mono">Stage {i + 1}</span><h3>{t}</h3><p className="svcs">{svcs.map((s) => <span key={s}>{s}</span>)}</p><p>{d}</p></li>)}</ol>
      <div className="across" data-dock><p className="mono">Across every stage</p><ul>{ACROSS.map(([a, b]) => <li key={a}><b>{a}</b> {b}</li>)}</ul></div>
      <h3 className="sub">Services and their role in DockThimble</h3>
      <dl className="svc">{SERVICES.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
      <p className="fine">Proposed, not deployed. This website and the dock planner run in your browser on fictional data.</p>
    </section>
  );
}

function Team() {
  return (
    <section className="sec" id="team" aria-labelledby="team-title">
      <p className="kicker">Team</p>
      <h2 id="team-title">The founder behind DockThimble.</h2>
      <div className="team">{site.team.map((p) => <article key={p.name} data-dock><span className="av" aria-hidden="true">{p.initials}</span><div><h3>{p.name}</h3><p className="role">{p.role}</p><p>{p.bio}</p><ul className="tags">{p.focus.map((f) => <li key={f}>{f}</li>)}</ul></div></article>)}</div>
    </section>
  );
}

function Pilot() {
  return (
    <section className="sec" id="pilot" aria-labelledby="pilot-title">
      <p className="kicker">Progress & pilot programme</p>
      <h2 id="pilot-title">Bring one warehouse and its turnaround history.</h2>
      <div className="pilot">
        <div>
          <p className="intro">DockThimble is in its building stage and opening its first pilots. A pilot covers one warehouse: you upload past turnaround records, your team enters appointments, and we compare predicted and actual times every day.</p>
          <h3 className="sub">Where DockThimble is today</h3>
          <ol className="progress">{PROGRESS.map(([st, t, d]) => <li key={t} className={st === 'Next' ? 'next' : ''}><span className="mono">{st}</span><b>{t}</b><p>{d}</p></li>)}</ol>
        </div>
        <div className="card-form"><PilotForm /></div>
      </div>
    </section>
  );
}

const FAQ = [['What data do we need?', 'A few months of past turnarounds — arrival, start and finish times, pallets and load type — plus your doors and team sizes.'], ['Does it replace our booking system?', 'No. The first version takes appointments entered by your team. Integrations come later, on request.'], ['Will it message carriers?', 'No. It suggests rebookings; your team agrees them with carriers.'], ['Is DockThimble live?', 'Not yet. It is a proposed product; the dock planner is a prototype running in your browser on fictional data.']];

function Faq() {
  return (
    <section className="sec" aria-labelledby="faq-title">
      <p className="kicker">FAQ</p>
      <h2 id="faq-title">Frequently asked questions.</h2>
      <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>
  );
}

function Contact() {
  return (
    <section className="sec" id="contact" aria-labelledby="contact-title">
      <div className="pilot">
        <div>
          <p className="kicker">Contact</p>
          <h2 id="contact-title">Talk to the DockThimble team.</h2>
          <p className="intro">Questions about the product, the pilot programme, data imports or how warehouse records are handled. Messages go directly to the founder.</p>
          <p className="contact-line"><span className="mono">Email</span><a href={`mailto:${site.email}`}>{site.email}</a></p>
        </div>
        <div className="card-form"><ContactForm /></div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ft">
      <div className="hazard" aria-hidden="true" />
      <a href="/" className="brand light" aria-label="DockThimble home"><Logo /><span>DOCKTHIMBLE</span></a>
      <p>{site.tagline}</p>
      <nav aria-label="Footer"><a href="/app">Dock planner</a><a href="/#technology">Technology (AWS)</a><a href="/#pricing">Pricing</a><a href="/#contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href={`mailto:${site.email}`}>{site.email}</a></nav>
      <p className="fine">© 2026 DockThimble. Founded by {site.team[0].name}. A proposed product: pricing is illustrative and the dock planner uses fictional data.</p>
    </footer>
  );
}

function Home() {
  return (<><Hero /><Slots /><Predict /><Queues /><Adjust /><Reports /><Steps /><Stats /><Who /><Pricing /><Technology /><Team /><Pilot /><Faq /><Contact /></>);
}

const LEGAL = {
  privacy: ['Privacy notice', [
    ['This website', 'DockThimble is a proposed product. This website and the dock planner run in your browser on fictional data.'],
    ['Dock planner', 'Your changes are kept in your browser’s local storage (key dockthimble-planner-v1) and never leave your device. “Reset” clears them.'],
    ['Forms', `Until a form service is connected, the pilot and contact forms open a pre-filled email to ${site.email}; nothing is sent until you send it. This notice will be updated before any customer-relationship service is connected.`],
    ['Cookies & analytics', 'None.'],
  ]],
  terms: ['Terms of use', [
    ['A proposed product', 'Nothing here is an offer of service. Pricing is illustrative.'],
    ['Demonstration only', 'The dock planner uses fictional data and must not be used to run a real warehouse.'],
    ['Planners decide', 'DockThimble suggests; dock planners publish every plan.'],
    ['No affiliation', 'Organisation types named are prospective customers; no affiliation is implied.'],
  ]],
};

function Legal({kind}) {
  const [title, items] = LEGAL[kind];
  return <section className="sec legal"><p className="kicker">Review draft</p><h1>{title}</h1>{items.map(([t, d]) => <div key={t}><h2>{t}</h2><p>{d}</p></div>)}</section>;
}

function NotFound() {
  return <section className="sec legal"><p className="kicker">404</p><h1>No bay for this page.</h1><p>We couldn’t find it.</p><p><a className="btn" href="/">Back to DockThimble</a></p></section>;
}

export default function App({path = '/'}) {
  if (path.startsWith('/app')) return <Planner />;
  const page = path === '/' ? <Home /> : path === '/privacy' ? <Legal kind="privacy" /> : path === '/terms' ? <Legal kind="terms" /> : <NotFound />;
  return (<><a className="skip" href="#main">Skip to content</a><Header /><main id="main">{page}</main><Footer /></>);
}
