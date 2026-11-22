# The shared sheet: `Klienti`

Every workflow reads and writes one Google Sheet tab. The workflows never call each other in the normal cycle; they communicate only through these columns. Column names are in Latvian because the business owners work in this sheet directly.

| Column | Meaning | Written by |
|---|---|---|
| `Klienta vārds` | Client name (current match key) | Onboarding, WF1 |
| `Klienta ID` | Stable client ID from onboarding (future match key) | Onboarding, WF1 |
| `Diena` | Client's personal payment day, 1–31 | Onboarding, WF1 |
| `Pakalpojums` | Service: Online Coaching, Treniņu Coaching, Fitnesa Konsultācija | Onboarding, WF1 |
| `Likme (EUR/mēn)` | Monthly rate in EUR | Onboarding, WF1 |
| `E-pasts` | Client email | Onboarding, WF1 |
| `Banka` | Payment route: `BANK_A` (Open Banking) or `BANK_B` (email notifications) | Onboarding, WF1 |
| `Statuss` | `ACTIVE`, `WAITING_PAYMENT` (first invoice), `ONE_OFF` | WF1, Coach Desk |
| `Periods no` / `Periods līdz` | Billing period start / end (DD.MM.YYYY.) | WF1 |
| `Rēķins nosūtīts` | Invoice sent: `Jā` / `Nē` | WF1 |
| `Rēķina Nr.` | Current invoice number | WF1 |
| `Apmaksas termiņš` | Due date of the current invoice (DD.MM.YYYY.) | WF1 |
| `Apmaksa saņemta` | Paid: `Jā` / `Nē` | WF1 (resets to `Nē`), WF2.1, WF2.3 |
| `Atgādinājums nosūtīts` | +1 reminder flag (date stamp) | WF3, cleared by WF1 |
| `Iekšējais brīdinājums` | +3 coach digest flag | WF3.1, cleared by WF1 |
| `Brīdināts pirms apturēšanas` | +5 warning flag | WF3.2, cleared by WF1 |
| `Apturēts` | +7 suspension flag | WF3.3, cleared by WF1 |

## Rules that keep it consistent

- **Each workflow maps only the columns it owns.** n8n's Google Sheets "update row" blanks any column that is mapped but empty, so a workflow that mapped every column would wipe other workflows' data.
- **Flags are date stamps, not booleans.** The date makes it easy to see when a stage fired, and an empty cell means "not yet this cycle".
- **WF1 is the only place a cycle is reset.** Sending the next invoice clears the four flags and sets `Apmaksa saņemta` back to `Nē` in one write.
