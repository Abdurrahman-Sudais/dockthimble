# Architecture

Status: **proposed**. The website and the prototype run entirely in the browser on fictional data. None of the AWS services below are deployed or connected.

## Today: browser-only prototype

- Vite + React, server-rendered to static HTML for every route (`scripts/prerender.mjs`).
- Fictional appointments and turnaround history live in `src/data.js`; the duration model, door planner, queue simulation, suggestions and reports are pure functions in `src/engine.js`, tested with `node --test`.
- Changes persist in `localStorage`; roles are switched in the UI, not authenticated.

## Why AWS

DockThimble’s work changes by the minute: appointments are booked, vehicles run late and doors free up early, while turnaround records and delivery documents pile up behind every visit. Designing on AWS lets record storage, document reading, duration models and scheduling workflows run as managed services, and keeps each warehouse’s data isolated as customers grow from one site to a network.

## Proposed production service

| Stage | Services | What happens |
|---|---|---|
| 1. Records intake | Amazon S3 | Turnaround histories, booking exports and scanned delivery documents land in per-warehouse storage. |
| 2. Read documents | Amazon Textract | Delivery notes and CMRs are read for pallet counts, load type and handling requirements, so appointments carry real details. |
| 3. Predict durations | Amazon SageMaker AI | A duration model trained on each site’s turnarounds estimates loading and unloading time, with its error on held-out records. |
| 4. Appointments | Amazon DynamoDB | Appointments, door types, teams, arrivals and planner decisions are stored per warehouse and day. |
| 5. Scheduling workflows | AWS Lambda | Lambda re-plans doors and teams when a booking changes or a vehicle is late, and raises congestion warnings. |
| Across every stage | AWS Lambda, Amazon CloudWatch, AWS KMS, Amazon SES | AWS Lambda runs planning and notification workflows; Amazon CloudWatch monitors imports, model calls and APIs; AWS KMS encrypts each warehouse’s records; Amazon SES sends published dock plans to the team |

### Services and their role

- **Amazon S3** — Stores turnaround histories, booking exports, delivery documents and exported reports, separated by customer and site.
- **Amazon Textract** — Reads delivery notes and transport documents for pallet counts, packing and handling requirements.
- **Amazon SageMaker AI** — Trains and hosts each warehouse’s duration model, and tracks its accuracy as new turnarounds arrive.
- **Amazon DynamoDB** — Holds appointments, doors, teams, arrival times, accepted changes and published plans.
- **AWS Lambda** — Runs the scheduling workflows: door and team matching, queue simulation, late-arrival re-planning.
- **Amazon API Gateway** — Exposes the appointment, planning and report endpoints, plus the website’s pilot-request intake.
- **Amazon Cognito** — Signs users in and separates planner, supervisor and manager roles.
- **Amazon SES** — Delivers published dock plans and pilot-request notifications.
- **Amazon CloudWatch** — Collects logs and metrics for imports, model calls and API latency.
- **AWS KMS** — Encrypts warehouse records at rest with customer-specific keys.

The same lists live in `src/aws.js` and are shown on the home page (`#technology`).

### Design rules

1. **Planners decide.** DockThimble suggests door plans and rebookings; a dock planner accepts them and publishes the day's plan.
2. **Estimates show their error.** Every duration comes from your own turnaround records, with the model's typical error on records it never saw.
3. **No carrier is contacted automatically.** Rebooking suggestions are for your team to agree with carriers.
4. **Isolated by customer.** Each warehouse's appointments and records sit in their own partition with role checks on every request.

## Website lead capture

The pilot and contact forms post to HubSpot (see `docs/crm-plan.md`). If a server-side intake is needed later, Amazon API Gateway + AWS Lambda can validate submissions and Amazon SES can notify the founder.
