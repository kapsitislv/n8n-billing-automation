// Workflow 1 · Code node "Select today's clients"
// Runs daily at 09:00 after "Read all clients" (Google Sheets).
//
// Decides who gets an invoice TODAY:
//   - First invoice: client has never been invoiced -> bill now, due on their next payment day.
//   - Regular cycle: today + 7 days is the client's payment day ("Diena").
//   - Short months: payment days 29-31 match the last day of a shorter month,
//     so a "31st" client is still invoiced in February.
//   - Never twice: if the stored due date already equals this cycle's due date, skip.
//
// All date maths is done on midnight-UTC dates built from "today in Riga",
// so the server's UTC clock and daylight saving can't shift a due date.

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit',
});
const [ty, tm, td] = fmt.format(new Date()).split('-').map(Number);
const today = new Date(Date.UTC(ty, tm - 1, td));

// Latvian date format used in the sheet: DD.MM.YYYY.
const lv = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}.`;
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

const target = new Date(today.getTime() + 7 * 864e5);
const tY = target.getUTCFullYear(), tM = target.getUTCMonth(), tD = target.getUTCDate();
const targetIsLastDay = tD === daysInMonth(tY, tM);
const targetDueStr = lv(target);

// Next occurrence of a client's payment day, clamped to the month's length.
function nextPaymentDay(day) {
  let y = ty, m = tm - 1;
  let cand = new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
  if (cand < today) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    cand = new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
  }
  return cand;
}

// A billing period runs from the due date to the day before the same date next month.
const periodOf = (due) => {
  const end = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, due.getUTCDate() - 1));
  return { periodNo: lv(due), periodLidz: lv(end) };
};

const out = [];
for (const item of $input.all()) {
  const r = item.json;
  const day = parseInt(String(r['Diena'] ?? '').trim(), 10); // client's payment day
  if (!day || day < 1 || day > 31) continue;

  const invoiced = String(r['Rēķina Nr.'] ?? '').trim() || String(r['Apmaksas termiņš'] ?? '').trim();
  let due;
  if (!invoiced) {
    due = nextPaymentDay(day); // first invoice
  } else {
    const matches = day === tD || (targetIsLastDay && day > daysInMonth(tY, tM));
    if (!matches) continue;
    if (String(r['Apmaksas termiņš'] ?? '').trim() === targetDueStr) continue; // already invoiced this cycle
    due = target;
  }

  const p = periodOf(due);
  out.push({ json: { ...r, dueStr: lv(due), periodNo: p.periodNo, periodLidz: p.periodLidz } });
}
return out;
