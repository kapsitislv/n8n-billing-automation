// Workflow 2.1 · Code node "Match payments"
// Input: unpaid, invoiced BANK_A clients from the sheet.
// Looks for each client's invoice number inside the payment reference (case-insensitive).
// Matched clients flow on to a Google Sheets update that sets "Apmaksa saņemta" = "Jā" (paid).

const transactions = $('Fetch bank transactions').first().json.transactions;
const clients = $input.all();

const matched = [];
for (const { json: client } of clients) {
  const invoiceNr = client['Rēķina Nr.'];
  if (!invoiceNr) continue;

  const tx = transactions.find((t) =>
    t.remittance_information.some((ref) => ref.toUpperCase().includes(invoiceNr.toUpperCase()))
  );
  if (tx) {
    matched.push({
      ...client,
      matchedAmount: tx.transaction_amount.amount,
      matchedDate: tx.booking_date,
      matchedRef: tx.remittance_information[0],
    });
  }
}

// A Filter node after this one stops the run when nothing matched.
if (matched.length === 0) return [{ json: { matched: [], noMatches: true } }];
return matched.map((c) => ({ json: c }));
