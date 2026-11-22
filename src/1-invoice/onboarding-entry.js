// Workflow 1 · Code node "Onboarding: prepare"
// Second trigger on the same workflow: "Execute Workflow" (called as a sub-workflow).
//
// When a new client signs their contract, the onboarding system calls Workflow 1
// for the first invoice. This node builds a single sheet-shaped row so the
// existing invoice chain (numbering -> HTML -> PDF -> Drive -> sheet) runs
// unchanged. There is only ever one invoice generator.
//
// Inputs from the caller: client_id, full_name, email, package, price,
// start_date, is_first_invoice, bank.

const d = $input.first().json;

const PACKAGES = {
  coaching_full:     { name: 'Online Coaching',      price: 239 },
  coaching_workouts: { name: 'Treniņu Coaching',     price: 135 },
  consultation:      { name: 'Fitnesa Konsultācija', price: 89 },
};
const p = PACKAGES[d.package] || { name: d.package || 'Online Coaching', price: Number(d.price) || 0 };
const price = Number(d.price) || p.price;
const bank = (d.bank || 'BANK_A').toString().trim() || 'BANK_A';

const pad = (n) => String(n).padStart(2, '0');
const lv = (dt) => `${pad(dt.getUTCDate())}.${pad(dt.getUTCMonth() + 1)}.${dt.getUTCFullYear()}.`;

const raw = d.start_date ? new Date(d.start_date) : new Date();
const start = new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
const dueStr = lv(start);

let periodNo = '', periodLidz = '';
if (d.package !== 'consultation') {
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate() - 1));
  periodNo = lv(start);
  periodLidz = lv(end);
}

return [{
  json: {
    _onboarding: true, // later nodes use this to set status WAITING_PAYMENT and skip the default email
    client_id: d.client_id || '',
    'Klienta vārds': d.full_name || '',
    'E-pasts': d.email || '',
    'Banka': bank,
    'Pakalpojums': p.name,
    'Likme (EUR/mēn)': price,
    'Diena': start.getUTCDate(), // the start date becomes the client's monthly payment day
    'Periods no': periodNo,
    'Periods līdz': periodLidz,
    dueStr, periodNo, periodLidz,
    start_date: d.start_date || dueStr,
  },
}];
