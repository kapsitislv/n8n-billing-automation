// Workflow 2.3 · Code node "Extract payment reference" — after an hourly Gmail trigger
//
// The second payment account isn't reachable through the Open Banking provider, so this
// workflow reads its "money received" notification emails instead. The Gmail
// trigger filters for that source's invoice prefix (AKFITLVW); this node pulls out the
// reference and amount. The next nodes look the client up by invoice number
// and mark the invoice as paid.

const body = $json.text || $json.snippet || '';
const subject = $json.subject || '';

// "Reference: AKFITLVW072601" or "Reference:\nAKFITLVW072601"
const referenceMatch = body.match(/Reference[:\s]+([^\n\r]+)/i);
const reference = referenceMatch ? referenceMatch[1].trim() : null;

const amountMatch = body.match(/Amount received[:\s]+([\d.,]+\s*EUR)/i);
const amount = amountMatch ? amountMatch[1].trim() : null;

const senderMatch = subject.match(/Money received from (.+)/i);
const senderName = senderMatch ? senderMatch[1].trim() : null;

if (!reference) {
  // Fail loudly: an unparseable payment email should be looked at by a person.
  throw new Error('No reference found in payment email: ' + body.substring(0, 200));
}

const isInvoiceRef = reference.toUpperCase().startsWith('AKFITLV');

return [{ json: { reference, amount, senderName, isInvoiceRef } }];
