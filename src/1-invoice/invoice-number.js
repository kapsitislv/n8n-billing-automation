// Workflow 1 · Code node "Invoice number and dates" (run once for each item)
//
// Invoice numbers: AKFITLV + MM + YY + two-digit counter, e.g. AKFITLV072601.
// Invoices paid through the second provider get a W (AKFITLVW072601), which tells
// reconciliation which payment source to look in. There is one counter per source, and both reset
// each month. The counter lives in n8n's workflow static data, so it survives
// between executions without a database.

const counter = $getWorkflowStaticData('global');
const bank = $json['Banka'];
const today = new Date();
const month = String(today.getMonth() + 1).padStart(2, '0');
const year = String(today.getFullYear()).slice(-2);
const prefix = `${month}${year}`;

if (counter.lastMonth !== month) {
  counter.lastMonth = month;
  counter.lastNrBankA = 0;
  counter.lastNrBankB = 0;
}

let invoiceNr;
if (bank === 'BANK_B') {
  counter.lastNrBankB += 1;
  invoiceNr = `AKFITLVW${prefix}${String(counter.lastNrBankB).padStart(2, '0')}`;
} else {
  counter.lastNrBankA += 1;
  invoiceNr = `AKFITLV${prefix}${String(counter.lastNrBankA).padStart(2, '0')}`;
}

const todayStr = `${String(today.getDate()).padStart(2, '0')}.${month}.${today.getFullYear()}.`;
const service = $json['Pakalpojums'] || 'Online Coaching';

// The billing period always comes from this cycle's calculated dates (set by the
// selection node). A one-off consultation shows the due date instead of a period.
const periodDisplay =
  service === 'Fitnesa Konsultācija' || !$json.periodNo
    ? $json.dueStr
    : `${$json.periodNo} – ${$json.periodLidz}`;

const amountFormatted = Number($json['Likme (EUR/mēn)'] || 0).toFixed(2).replace('.', ',') + ' EUR';

return { ...$json, invoiceNr, todayStr, periodDisplay, pakalpojums: service, likmeFormat: amountFormatted };
