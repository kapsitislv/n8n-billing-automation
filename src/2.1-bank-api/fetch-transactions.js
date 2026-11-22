// Workflow 2.1 · Code node "Fetch bank transactions" — daily 08:00
//
// Connects to the business bank account through Enable Banking, a licensed PSD2 Open Banking provider.
// Secrets are environment variables on the n8n server, never stored in the workflow:
//   N8N_ENABLE_BANKING_PRIVATE_KEY  base64-encoded RSA private key (PEM)
//   N8N_ENABLE_BANKING_APP_ID       application ID, used as the JWT key ID
//   N8N_ENABLE_BANKING_ACCOUNT_UID  the account to read
//
// Gotcha: the JWT issuer must be the literal string 'enablebanking.com'.
// The app ID goes in the `kid` header, not in `iss` (a wrong `iss` returns 401).

const crypto = require('crypto');
const privateKey = Buffer.from($env.N8N_ENABLE_BANKING_PRIVATE_KEY, 'base64').toString('utf8').trim();
const appId = $env.N8N_ENABLE_BANKING_APP_ID;
const accountUid = $env.N8N_ENABLE_BANKING_ACCOUNT_UID;

// Sign a short-lived RS256 JWT.
const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: appId })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600,
})).toString('base64url');
const signingInput = `${header}.${payload}`;
const signature = crypto
  .sign('sha256', Buffer.from(signingInput), { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING })
  .toString('base64url');
const jwt = `${signingInput}.${signature}`;

// Rolling 40-day window in Riga time. A window tied to the 1st of the month missed
// payments made on the 31st. 40 days = one billing cycle plus about a week of buffer
// for outages, expired bank consent and booking delays. Invoice numbers contain the
// month and year, so a longer window can't cause false matches.
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' });
const [ty, tm, td] = fmt.format(new Date()).split('-').map(Number);
const dateFrom = new Date(Date.UTC(ty, tm - 1, td) - 40 * 864e5).toISOString().slice(0, 10);

// Follow the API's pagination until every page is read (capped as a safety net).
// Note: in n8n Code nodes, this.helpers.request is the HTTP helper that works here.
const all = [];
let continuationKey = null;
let pages = 0;
do {
  let url = `https://api.enablebanking.com/accounts/${accountUid}/transactions?date_from=${dateFrom}`;
  if (continuationKey) url += `&continuation_key=${encodeURIComponent(continuationKey)}`;
  const response = await this.helpers.request({ method: 'GET', url, headers: { Authorization: `Bearer ${jwt}` } });
  const data = typeof response === 'string' ? JSON.parse(response) : response;
  all.push(...(data.transactions || []));
  continuationKey = data.continuation_key || null;
  pages++;
} while (continuationKey && pages < 20);

// Keep only booked, incoming payments that carry a reference.
const incoming = all.filter((t) =>
  t.credit_debit_indicator === 'CRDT' &&
  t.status === 'BOOK' &&
  t.remittance_information &&
  t.remittance_information.length > 0
);

return [{ json: { transactions: incoming, count: incoming.length, dateFrom, pages } }];
