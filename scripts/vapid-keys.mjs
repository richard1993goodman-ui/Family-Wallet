// Prints a VAPID key pair for web push. Run once: node scripts/vapid-keys.mjs
// Then set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto:you@yourdomain) in the host's secrets.
// Keep the private key out of git and chat.
import { webcrypto as crypto } from "node:crypto";

const b64u = (b) => Buffer.from(b).toString("base64url");
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
console.log("VAPID_PUBLIC_KEY=" + b64u(await crypto.subtle.exportKey("raw", pair.publicKey)));
console.log("VAPID_PRIVATE_KEY=" + (await crypto.subtle.exportKey("jwk", pair.privateKey)).d);
