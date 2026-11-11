# Stage E5: do we need an e-signature provider? (options and costs, for your decision)

Prepared 11 Nov 2026. This compares options and costs. It is **not legal advice** and does not say that any signing method is or is not legally sufficient for a particular agreement: that is a question for your solicitor. Prices below were read from the providers' own pages or comparison articles on 11 Nov 2026 and change often, so confirm before buying. Where I could not verify something I say so.

## 1. What we have today

Typed-name signing inside the wallet, with the evidence added in Stage E:

- the signer's typed name, role and time, and a device key;
- the exact version signed, stored for ever, with a SHA-256 fingerprint on each signature (E1);
- signing refused if the wording on screen differs from what was issued (E1), and amendments kept as new versions (E3);
- an audit-log entry per signature (E3);
- a PDF record copy in the vault once both have signed (E4).

What it does **not** have: any check that the person typing is who they say they are beyond holding the code or logging in, a third party sealing the record, or a signing certificate from an independent provider.

## 2. The legal question, framed (not answered)

The Law Commission's published statement of the law on electronic execution says courts have accepted a typed name or an "I accept" click as a signature where there is an intention to authenticate the document, and that the evidential weight of a platform-captured signature with an audit trail is stronger than a bare typed name. Providers describe three standard levels: simple, advanced and qualified electronic signatures. **Questions for your solicitor:**

1. For a household employment agreement or written statement, is a simple electronic signature with our evidence enough, or do you want an advanced signature?
2. Does the answer differ for a self-employed services agreement, an au pair arrangement, or a future non-UK market?
3. Is a signed record copy from us acceptable, or do you want a provider's certificate of completion attached?

## 3. Options

**Option A: keep our signing and strengthen it (no provider).** Add, in order of value: (1) require a logged-in account or an emailed one-time code at the moment of signing, so each signature is tied to a verified email; (2) show the fingerprint and signer's verified email in the record copy; (3) email each signer their copy. Cost: build time only, no per-signature fees. Result: still a simple electronic signature, but with materially better evidence.

**Option B: a pay-per-signature provider through an API.** Embedded signing in our screens, a certificate of completion, webhooks when signed.

| Provider | API price found | Embedded signing | Notes |
|---|---|---|---|
| Zoho Sign | about $0.50 per envelope, credits bought in $50 blocks | Yes (included in the API rate) | No monthly plan; checked on a comparison article, not Zoho's own page |
| eSignatures.io | about $0.49 per contract | Not verified | Comparison article only |
| Signable (UK) | £319 a year for 600 envelopes, £759 for 1,800 | Not verified | UK-based; my own search did not reach their pricing or signature-level pages |
| Signeasy | $125 a month ($1,499 a year) for 1,000 requests a year | Yes | Provider's own comparison, so treat with care |
| Yousign (EU) | Free plan 2 requests a month; paid app plans from about €9 a month | Not verified | Its blog mentions UK advanced signatures; I could not find its API pricing |
| Dropbox Sign | API from $75 a month (50 requests, no embedded signing); embedded signing starts at the $250 a month Standard plan | Standard and up | Too costly at our volume |
| DocuSign | Developer plans $50 a month (40 envelopes, no embedded signing), $300, $480; advanced and qualified signatures and data residency on the custom "Enhanced" plan | Enhanced only | Too costly at our volume |

At today's size (44 households, perhaps 100 to 300 envelopes in a year) a monthly-plan provider costs more than the signatures are worth, so **pay-per-envelope or a small annual UK plan fits better**. Each agreement is one envelope with two signers.

**Option C: a qualified or advanced provider for certain document types only.** Use A for everything and add a provider only where your solicitor requires it (for example a future non-UK market). Cheapest path that keeps the door open.

## 4. How a provider would plug in

A small interface (`createRequest`, `onCompleted`), so we are never locked in: send the stored version's text to the provider, embed the signing page, and on its webhook store the provider's completion certificate in the vault, link its envelope id to our version row, and keep our own hash and audit entries. Our typed-name flow stays as the fallback. Estimated effort: 1 to 3 weeks depending on the provider, plus its sandbox and go-live checks.

## 5. Recommendation (a path, not a legal conclusion)

1. Do Option A now: it is cheap, improves evidence for every signature and needs no contract.
2. Put the three questions in section 2 to your solicitor.
3. If they want an advanced signature, I will take a short list of two (a UK provider and a pay-per-envelope one), test each in its sandbox against the interface above, and bring costs and evidence samples back for you.

## 6. Decisions needed

1. Approve Option A (verified email at signing, richer record copy, email copies to signers)?
2. Who is the solicitor for the three questions, and by when?
3. Is a monthly-plan provider ruled out on cost for now?
4. Any provider you already use or prefer, for example one an agency partner uses?

## E5 option A status (11 Nov)
Built and committed locally, **off until `SIGNING_VERIFICATION=on`**: an agreement signature can be tied to an email the signer proved they control, either the signed-in account's own address or a six-digit code emailed to the address they type (hashed, 10 minutes, five tries, five requests an hour per person). The record copy and the version history show "email verified", and each verified signer gets a generic "your signed agreement is saved" email (no wording, no link). New migration `20261111500000_signing_verification.sql` (a codes table and two columns on signatures) must be applied before switching it on. **Limits:** it proves control of an email address, not a person's identity, and it is still a simple electronic signature; the owner's agency signature is not code-checked (it is already behind a login with two-step); terms signing is unchanged.
