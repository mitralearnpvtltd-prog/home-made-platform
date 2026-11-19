/**
 * Verifies Nest-equivalent Cashfree createOrder using apps/api/.env
 * (absolute path + override), same API version and payload shape as CashfreeClient.
 * Safe output only — no App ID, secret, headers, or session IDs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';

function loadApiEnvFile() {
  const candidates = [
    join(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps', 'api', '.env'),
    resolve(process.cwd(), '..', '..', 'apps', 'api', '.env'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const parsed = parse(readFileSync(path));
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') process.env[key] = value;
    }
    return path;
  }
  return null;
}

const envFile = loadApiEnvFile();
const appId = (process.env.CASHFREE_APP_ID || '').trim();
const secret = (process.env.CASHFREE_SECRET_KEY || '').trim();
const cfEnv = (process.env.CASHFREE_ENV || 'SANDBOX').trim().toUpperCase();

console.log(
  JSON.stringify({
    envFile,
    env: cfEnv,
    hasAppId: Boolean(appId),
    appIdLen: appId.length,
    appIdStartsWithTEST: appId.startsWith('TEST'),
    hasSecret: Boolean(secret),
    secretLen: secret.length,
    secretStartsWithCfsk: secret.startsWith('cfsk_'),
  }),
);

if (!appId || !secret || cfEnv === 'PRODUCTION') {
  console.log(JSON.stringify({ ok: false, reason: 'missing_or_production' }));
  process.exit(1);
}

const orderId = `aahaa_nestpath_${Date.now()}`;
// Mirror Nest CashfreeClient: omit loopback return_url (Cashfree WAF 403).
const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': appId,
    'x-client-secret': secret,
    'x-api-version': '2025-01-01',
  },
  body: JSON.stringify({
    order_id: orderId,
    order_amount: 118,
    order_currency: 'INR',
    customer_details: {
      customer_id: 'user_verify',
      customer_phone: '9876543210',
      customer_name: 'Verify',
    },
    order_note: 'Aahaa order verify',
    order_tags: {
      aahaa_checkout: 'bus_food_delivery',
    },
  }),
});

const text = await response.text();
let payload = null;
try {
  payload = JSON.parse(text);
} catch {
  payload = { message: text.slice(0, 200) };
}

console.log(
  JSON.stringify({
    ok: response.ok,
    httpStatus: response.status,
    hasSession: Boolean(payload?.payment_session_id),
    orderStatus: payload?.order_status ?? null,
    code: payload?.code ?? null,
    message: String(payload?.message || '').slice(0, 200),
  }),
);

if (!response.ok) process.exit(1);
