// Pilot-request and contact-form rules, and the HubSpot Forms API payloads (see docs/crm-plan.md).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ORG_TYPES = ["Third-party logistics provider", "Distribution centre", "Wholesaler", "Manufacturing warehouse", "Other"];
export const COMPANY_SIZES = ['1–10 employees', '11–50 employees', '51–200 employees', '201–1,000 employees', '1,000+ employees'];
export const USE_CASES = ["Pilot at one warehouse", "Realistic appointment lengths", "Reducing yard queues", "Handling late vehicles", "Turnaround reporting", "Other"];
export const TOPICS = ["Product question", "Pilot programme", "Data and imports", "Technical or security question", "Press or media", "Other"];

/** Where the company is today; the last entry is what comes next. [status, title, detail] */
export const PROGRESS = [["2026", "Company founded", "By Samuel Akinwale, to make dock appointments match how long loading really takes."], ["Done", "Planning method defined", "Duration model from your own turnarounds, door and team matching, queue warnings, planner approval."], ["Done", "Dock planner prototype", "Predictions, door plan, congestion, late-arrival suggestions and reports shown on a fictional warehouse."], ["Done", "AWS reference architecture", "Records intake, document reading, duration models, appointments and scheduling workflows designed."], ["Next", "First pilots", "One warehouse per pilot: appointments entered by your team and uploaded turnaround history."]];

export const blankPilot = () => ({name: '', email: '', company: '', size: '', kind: '', useCase: '', detail: '', message: '', consent: false, website: ''});
export const blankContact = () => ({name: '', email: '', company: '', topic: '', message: '', consent: false, website: ''});

export function validatePilot(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your name.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Please enter a valid work email.';
  if (!f.company.trim()) e.company = 'Please enter your company.';
  if (!COMPANY_SIZES.includes(f.size)) e.size = 'Choose a company size.';
  if (!ORG_TYPES.includes(f.kind)) e.kind = 'Choose the closest match.';
  if (!USE_CASES.includes(f.useCase)) e.useCase = 'Choose a use case.';
  if (f.message.length > 2000) e.message = 'Please keep it under 2,000 characters.';
  if (!f.consent) e.consent = 'Please confirm we may contact you.';
  return e;
}

export function validateContact(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your name.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Please enter a valid email.';
  if (!TOPICS.includes(f.topic)) e.topic = 'Choose a topic.';
  if (f.message.trim().length < 10) e.message = 'Please write a short message (10+ characters).';
  if (f.message.length > 2000) e.message = 'Please keep it under 2,000 characters.';
  if (!f.consent) e.consent = 'Please confirm we may reply.';
  return e;
}

const fields = (pairs) => pairs.filter(([, v]) => v).map(([name, value]) => ({objectTypeId: '0-1', name, value}));
const names = (n) => { const [first, ...rest] = n.trim().split(/\s+/); return [['firstname', first], ['lastname', rest.join(' ')]]; };

export const pilotPayload = (f, context) => ({fields: fields([...names(f.name), ['email', f.email.trim()], ['company', f.company.trim()], ['company_size', f.size], ['organisation_type', f.kind], ['primary_use_case', f.useCase], ["warehouse_detail", f.detail.trim()], ['enquiry_message', f.message.trim()]]), context,
  legalConsentOptions: {consent: {consentToProcess: true, text: 'DockThimble may contact me about this request.', communications: []}}});

export const contactPayload = (f, context) => ({fields: fields([...names(f.name), ['email', f.email.trim()], ['company', f.company.trim()], ['contact_topic', f.topic], ['enquiry_message', f.message.trim()]]), context,
  legalConsentOptions: {consent: {consentToProcess: true, text: 'DockThimble may reply to this message.', communications: []}}});

/** HubSpot ids from the build environment; the contact form has its own GUID. */
export function hubspot(kind, env = (typeof import.meta !== 'undefined' && import.meta.env) || {}) {
  const portal = env.VITE_HUBSPOT_PORTAL_ID;
  const form = kind === 'contact' ? env.VITE_HUBSPOT_CONTACT_FORM_GUID : env.VITE_HUBSPOT_FORM_GUID;
  return portal && form ? {portal, form} : null;
}

export async function send(hs, payload) {
  const res = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(hs.portal)}/${encodeURIComponent(hs.form)}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
  return res.ok;
}
