import React from 'react';
import {DOORS, SITE, hhmm} from './data.js';

/** Dock doors as lanes across the shift: each vehicle a block, waiting time shown as a striped lead-in. */
export function Lanes({rows, end = SITE.shift[1] + 60, compact = false, label}) {
  const t0 = SITE.shift[0]; const span = Math.max(end, ...rows.map((r) => r.end)) - t0;
  const x = (m) => `${((m - t0) / span) * 100}%`;
  const w = (m) => `${(m / span) * 100}%`;
  const ticks = []; for (let t = t0; t <= t0 + span; t += 120) ticks.push(t);
  return (
    <div className={`lanes${compact ? ' compact' : ''}`} role="img" aria-label={label || `Dock plan: ${rows.length} vehicles across ${DOORS.length} doors`} data-dock>
      {DOORS.map((d) => (
        <div key={d.id} className={`lane ${d.type}`}>
          <span className="lane-id">{d.id}<small>{d.type === 'chilled' ? 'chilled' : ''}</small></span>
          <div className="lane-track">
            {rows.filter((r) => r.door === d.id).map((r, i) => (
              <React.Fragment key={r.id}>
                {r.wait > 1 && <span className="wait" style={{left: x(r.arrive), width: w(r.wait)}} title={`${r.id} waits ${Math.round(r.wait)} min`} />}
                <span className={`truck${r.wait > 30 ? ' late' : ''}`} style={{left: x(r.start), width: w(r.end - r.start), '--i': i}} title={`${r.id} ${r.carrier} · ${hhmm(r.start)}–${hhmm(r.end)}`}>{!compact && <b>{r.id.slice(2)}</b>}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
      <div className="lane-axis" aria-hidden="true"><span />{<div>{ticks.map((t) => <i key={t} style={{left: x(t)}}>{hhmm(t)}</i>)}</div>}</div>
    </div>
  );
}
