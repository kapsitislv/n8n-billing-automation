// Workflow 3.2 · Code node "Select +5 unpaid" — daily 09:20
//
// All four follow-up stages (+1, +3, +5, +7) share this shape:
//   read unpaid invoices -> check window + flag -> send email -> stamp today's date
// They differ only in the day window, the flag column and the recipient.
//
//   Stage  Window      Flag column                    Goes to
//   +1     days 1-2    Atgādinājums nosūtīts          client (friendly reminder)
//   +3     days 3-4    Iekšējais brīdinājums          coach (one digest)
//   +5     days 5-6    Brīdināts pirms apturēšanas    client (warning with suspension date)
//   +7     day 7+      Apturēts                       coach (suspension flag)
//
// Windows, not exact days: if the server is down on day 5, the warning still goes on day 6.
// Flags: once a stage has emailed a client it stamps a date; a re-run does nothing.
// Workflow 1 clears all four flags when it sends the next invoice (the per-client reset).

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' });
const [ty, tm, td] = fmt.format(new Date()).split('-').map(Number);
const today = new Date(Date.UTC(ty, tm - 1, td));

const lv = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}.`;
const todayStr = lv(today);
const parseLV = (s) => {
  const p = String(s ?? '').trim().split('.');
  return p.length >= 3 && p[0] && p[1] && p[2] ? new Date(Date.UTC(+p[2], +p[1] - 1, +p[0])) : null;
};

const out = [];
for (const { json: r } of $input.all()) {
  const due = parseLV(r['Apmaksas termiņš']);
  if (!due) continue; // no due date: legacy row, skip

  const daysPast = Math.round((today - due) / 864e5);
  if (daysPast < 5 || daysPast >= 7) continue; // this stage's window
  if (String(r['Brīdināts pirms apturēšanas'] || '').trim() !== '') continue; // already warned this cycle

  const fullName = String(r['Klienta vārds'] || '').trim();
  out.push({
    json: {
      name: fullName,
      fname: fullName.split(' ')[0] || fullName,
      email: String(r['E-pasts'] || '').trim(),
      invoice_no: String(r['Rēķina Nr.'] || '').trim(),
      amount: Number(r['Likme (EUR/mēn)'] || 0).toFixed(2).replace('.', ','),
      due_date: lv(due),
      suspend_date: lv(new Date(due.getTime() + 7 * 864e5)), // the terms promise this date in the warning
      days_past: daysPast,
      todayStr,
    },
  });
}
return out;

// The node that writes the flag AFTER the Gmail node must read from this node by name:
//   {{ $('Select +5 unpaid').item.json.todayStr }}
// A Gmail node replaces its items with the API response, so reading $json there
// would lose the client's name, the flag would never be written, and the warning
// would be sent again the next day. (Found and fixed in review before go-live.)
