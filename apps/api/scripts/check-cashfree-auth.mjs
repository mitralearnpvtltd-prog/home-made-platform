import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(path) {
  const text = readFileSync(path, 'utf8');
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = loadEnv(resolve(process.cwd(), '.env'));
const appId = (env.CASHFREE_APP_ID || '').trim();
const secret = (env.CASHFREE_SECRET_KEY || '').trim();
const cfEnv = (env.CASHFREE_ENV || 'SANDBOX').trim().toUpperCase();

console.log(
  JSON.stringify({
    hasAppId: Boolean(appId),
    appIdLen: appId.length,
    appIdStartsWithTEST: appId.startsWith('TEST'),
    hasSecret: Boolean(secret),
    secretLen: secret.length,
    secretStartsWithCfsk: secret.startsWith('cfsk_'),
    env: cfEnv,
  }),
);

const base =
  cfEnv === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const orderId = `aahaa_authcheck_${Date.now()}`;
const response = await fetch(`${base}/orders`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': appId,
    'x-client-secret': secret,
    'x-api-version': '2025-01-01',
  },
  body: JSON.stringify({
    order_id: orderId,
    order_amount: 1.0,
    order_currency: 'INR',
    customer_details: {
      customer_id: 'auth_check_user',
      customer_phone: '9999999999',
      customer_name: 'Auth Check',
    },
  }),
});

const text = await response.text();
let message = '';
try {
  const json = JSON.parse(text);
  message = json.message || json.error || JSON.stringify(json).slice(0, 200);
} catch {
  message = text.slice(0, 200);
}

console.log(
  JSON.stringify({
    httpStatus: response.status,
    ok: response.ok,
    message,
  }),
);
