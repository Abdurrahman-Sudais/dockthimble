# DockThimble

**Make warehouse appointments more predictable.**

DockThimble helps warehouses (third-party logistics providers, distribution centres, wholesalers and manufacturing warehouses) schedule vehicle arrivals around realistic loading and unloading times. A machine-learning model predicts appointment duration from shipment size, handling requirements, staffing and previous turnaround records. DockThimble then plans doors and teams, warns about queues, and suggests changes when vehicles arrive late. Dock planners decide.

> DockThimble is a proposed product. Pricing is illustrative and the prototype uses fictional data. Founder: **Samuel Akinwale**; co-founder **Funmilayo Bakare**; CTO **Ikenna Chukwuma**. Website: `dockthimble.site` · contact: `samuel@dockthimble.site`. LinkedIn availability for `dockthimble` / `dock-thimble` is unconfirmed, so no page is linked. Organisation types named on the site are prospective customers with no implied affiliation.

## Design

The look is the loading dock: concrete and asphalt, safety yellow, hazard stripes, door lanes and signage type. Big Shoulders Display is used for signage, Manrope for text and DM Mono for times.

- **Hero:** a dark dock board where trucks back into door lanes. Chilled doors are blue and long waits red. It compares waits under the plan with today's one-hour slots.
- **The problem:** one-hour slots against real turnaround times by load type.
- **Duration drivers:** what the model learned, on an asphalt band.
- **Queues:** queue charts with congestion warnings.
- **Late arrival:** a ticket showing a late truck and the suggested rebookings.
- **Turnaround reports:** by carrier and by handling.
- **Other sections:** steps, ground rules, sourced statistics (ATRI detention study, 2024), pricing, team, FAQ.
- **Technology:** "How we use Amazon Web Services" in five stages (S3, Textract, SageMaker AI, DynamoDB, Lambda), a row for the services that span every stage, and each service's role.
- **Progress and pilot:** "Where DockThimble is today" beside the pilot form, followed by a contact form with a topic picker.

## Dock planner (`/app`)

The planner covers one fictional warehouse with six doors (two chilled), three teams and sixteen appointments for tomorrow.

- **Duration model:** a linear model fitted in the browser to 260 past turnarounds. Its inputs are pallets, floor-loaded or mixed packing, chilled handling, document checks and crew size. It is checked on 60 held-out visits (typical error about ±4 minutes). The planner shows its coefficients and a per-appointment breakdown.
- **Door and team plan:** each vehicle gets the compatible door and team that can start it soonest. This is compared with the same day booked in one-hour slots (average wait about 6 vs 20 minutes).
- **Congestion warnings:** for half-hours with two or more vehicles waiting.
- **Rebooking suggestions:** for vehicles that would wait more than 30 minutes. The planner accepts them.
- **Appointments:** late arrivals are recorded by the Shift Supervisor. Appointments are entered by hand, with a live duration estimate.
- **Publishing:** the planner publishes the plan with a note for the dock team, and the Warehouse Manager can export it as CSV.
- **Turnaround report:** by load type, carrier and handling.
- **Roles:** Dock Planner, Shift Supervisor, Warehouse Manager and Viewer.

Every action is logged, and state persists in `localStorage`.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build   # Vite build, server render, static prerender of /, /app, /privacy, /terms and 404.html
npm test        # node --test: model accuracy, door rules, no overlaps, waits vs one-hour slots, late arrivals, roles, forms, AWS content
```

Docs: `docs/architecture.md` (proposed AWS architecture and design rules) and `docs/crm-plan.md` (HubSpot forms and properties). Until HubSpot is configured, the forms keep requests in the browser and open a pre-filled email. Set `VITE_HUBSPOT_PORTAL_ID`, `VITE_HUBSPOT_FORM_GUID` and `VITE_HUBSPOT_CONTACT_FORM_GUID` (see `.env.example`) and update the privacy notice first.
