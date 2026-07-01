#!/usr/bin/env node
// List and (optionally) revoke App Store Connect signing certificates.
//
// Why this exists: cloud/automatic signing (`xcodebuild -allowProvisioningUpdates`)
// on an ephemeral CI runner mints a BRAND-NEW signing certificate every run and
// never reuses it, so the Apple account fills up until archives fail with
// "maximum number of certificates". Run this to clear the leaked certs before
// switching to manual signing with one persisted certificate.
//
// No dependencies — Node 18+ (uses global fetch + built-in crypto for the ES256 JWT).
//
// Usage (needs the App Store Connect API .p8 you downloaded during setup):
//   ASC_KEY_ID=XXXXXXXXXX \
//   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
//   ASC_KEY_PATH=./AuthKey_XXXXXXXXXX.p8 \
//     node asc-certs.mjs list          # show every certificate on the account
//     node asc-certs.mjs revoke <id>…  # revoke specific ones (ids from `list`)
//     node asc-certs.mjs revoke-all    # revoke ALL of them
//
// Revoking a distribution certificate does NOT break already-uploaded TestFlight
// or App Store builds (Apple re-signs those) — it only stops NEW local signing,
// and you're about to create one fresh cert for manual signing anyway.
// CAUTION: if this Apple team signs OTHER apps too, `revoke-all` hits their certs
// as well. Use `list` first and revoke by id if you're unsure.

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH } = process.env;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_PATH) {
  console.error('Set ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_PATH (path to the .p8).');
  process.exit(1);
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function jwt() {
  const key = crypto.createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64url({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
  // ES256 for JOSE needs the raw R||S signature, not DER — hence ieee-p1363.
  const sig = crypto
    .sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function api(path, method = 'GET') {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt()}` },
  });
  if (method === 'DELETE') {
    if (res.status !== 204) throw new Error(`DELETE ${path} → ${res.status} ${await res.text()}`);
    return null;
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function listCerts() {
  const out = [];
  let path = '/v1/certificates?limit=200';
  while (path) {
    const page = await api(path);
    out.push(...page.data);
    const next = page.links?.next;
    path = next ? next.replace('https://api.appstoreconnect.apple.com', '') : null;
  }
  return out;
}

const [cmd = 'list', ...ids] = process.argv.slice(2);

if (cmd === 'list') {
  const certs = await listCerts();
  if (!certs.length) {
    console.log('No certificates on the account.');
  } else {
    for (const c of certs) {
      const a = c.attributes;
      console.log(`${c.id}\t${a.certificateType}\t${a.displayName}\t(expires ${a.expirationDate})`);
    }
    console.log(`\n${certs.length} certificate(s). Remove with: node asc-certs.mjs revoke-all   (or revoke <id>…)`);
  }
} else if (cmd === 'revoke') {
  if (!ids.length) { console.error('Pass one or more certificate ids (see `list`).'); process.exit(1); }
  for (const id of ids) { await api(`/v1/certificates/${id}`, 'DELETE'); console.log(`revoked ${id}`); }
} else if (cmd === 'revoke-all') {
  const certs = await listCerts();
  for (const c of certs) {
    await api(`/v1/certificates/${c.id}`, 'DELETE');
    console.log(`revoked ${c.id} (${c.attributes.certificateType})`);
  }
  console.log(`\nRevoked ${certs.length} certificate(s).`);
} else {
  console.error(`Unknown command: ${cmd}. Use list | revoke <id>… | revoke-all`);
  process.exit(1);
}
