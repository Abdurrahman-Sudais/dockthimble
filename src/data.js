// Fictional warehouse data for the dock-planner prototype: one distribution centre, tomorrow's appointments
// and past turnaround records the duration model learns from. All names and numbers are invented.

export const SITE = {name: 'Ota distribution centre', shift: [360, 1080], teams: 3};
export const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m) % 60).padStart(2, '0')}`;
export const DOORS = [
  {id: 'D1', type: 'ambient'}, {id: 'D2', type: 'ambient'}, {id: 'D3', type: 'ambient'}, {id: 'D4', type: 'ambient'},
  {id: 'D5', type: 'chilled'}, {id: 'D6', type: 'chilled'},
];
export const LOADS = {palletised: 'Palletised', floor: 'Floor-loaded', mixed: 'Mixed'};
export const CARRIERS = ['Swift Haulage', 'Northbridge Freight', 'Coastline Logistics', 'Prime Movers', 'Kola Transport', 'Delta Reefer'];
export const BOOKED_SLOT = 60; // what the warehouse books today: one hour per vehicle, whatever it carries

// [id, carrier, direction, pallets, load, chilled, docs check, requested arrival (minutes after midnight)]
const A = (id, carrier, direction, pallets, load, chilled, docs, time) => ({id, carrier, direction, pallets, load, chilled, docs, time, lateBy: 0});
export const appointments = [
  A('A-101', 'Swift Haulage', 'Inbound', 26, 'palletised', false, false, 390),
  A('A-102', 'Coastline Logistics', 'Inbound', 22, 'floor', false, true, 420),
  A('A-103', 'Delta Reefer', 'Inbound', 18, 'palletised', true, false, 420),
  A('A-104', 'Northbridge Freight', 'Outbound', 12, 'mixed', false, false, 450),
  A('A-105', 'Prime Movers', 'Inbound', 30, 'floor', false, false, 480),
  A('A-106', 'Kola Transport', 'Outbound', 20, 'palletised', false, false, 480),
  A('A-107', 'Delta Reefer', 'Outbound', 14, 'palletised', true, false, 510),
  A('A-108', 'Swift Haulage', 'Inbound', 24, 'mixed', false, false, 540),
  A('A-109', 'Coastline Logistics', 'Inbound', 26, 'floor', false, true, 540),
  A('A-110', 'Northbridge Freight', 'Outbound', 16, 'palletised', false, false, 570),
  A('A-111', 'Delta Reefer', 'Inbound', 20, 'mixed', true, false, 600),
  A('A-112', 'Prime Movers', 'Outbound', 22, 'palletised', false, false, 660),
  A('A-113', 'Kola Transport', 'Inbound', 28, 'floor', false, false, 720),
  A('A-114', 'Swift Haulage', 'Outbound', 18, 'palletised', false, false, 780),
  A('A-115', 'Delta Reefer', 'Outbound', 16, 'palletised', true, false, 840),
  A('A-116', 'Northbridge Freight', 'Inbound', 24, 'mixed', false, true, 900),
];

/** True handling behaviour, used only to create the fictional history below (the model never sees it). */
const truth = (r) => 18 + r.pallets * (r.load === 'floor' ? 3.3 : r.load === 'mixed' ? 2.1 : 1.25) + (r.chilled ? 9 : 0) + (r.docs ? 16 : 0) - (r.crew - 3) * r.pallets * 0.35;

/** Past turnarounds: what each vehicle carried, the crew, the booked slot and the minutes it actually took at the door. */
export const history = (() => {
  let s = 97;
  const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const loads = ['palletised', 'palletised', 'floor', 'mixed'];
  const out = [];
  for (let i = 0; i < 320; i += 1) {
    const r = {carrier: CARRIERS[Math.floor(rnd() * CARRIERS.length)], pallets: 6 + Math.floor(rnd() * 28), load: loads[Math.floor(rnd() * 4)], chilled: rnd() < 0.25, docs: rnd() < 0.2, crew: 2 + Math.floor(rnd() * 3), hour: 6 + Math.floor(rnd() * 12)};
    r.minutes = Math.max(15, Math.round(truth(r) + (rnd() - 0.5) * 14));
    out.push(r);
  }
  return out;
})();

export const roles = [
  {id: 'planner', label: 'Dock Planner', can: ['plan', 'add', 'late']},
  {id: 'supervisor', label: 'Shift Supervisor', can: ['add', 'late']},
  {id: 'manager', label: 'Warehouse Manager', can: ['plan', 'add', 'late', 'export']},
  {id: 'viewer', label: 'Viewer', can: []},
];
export const people = {planner: 'Ruth Adeyemi', supervisor: 'Chinedu Obi', manager: 'Halima Yusuf', viewer: 'Guest'};
