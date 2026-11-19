/**
 * Backend-only AquaSMS DLR checker.
 * Usage: node scripts/check-aquasms-dlr.mjs <msgid>
 * Never prints API keys or OTP values.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = value;
  }
  return out;
}

function sanitize(text, apiKey) {
  return String(text)
    .replace(/apikey[=:][^&\s"']+/gi, 'apikey=***')
    .replaceAll(apiKey, '***')
    .replace(/\b\d{4,8}\b/g, '****')
    .slice(0, 800);
}

function classify(httpStatus, body) {
  if (httpStatus < 200 || httpStatus >= 300) return 'unknown';
  const lower = body.toLowerCase();
  if (
    lower.includes('invalid message id') ||
    lower.includes('invalid msgid') ||
    lower.includes('invalid messageid')
  ) {
    return 'invalid_msgid';
  }
  if (
    /\bdelivrd\b/.test(lower) ||
    /\bdelivered\b/.test(lower) ||
    lower.includes('delivered to mobile') ||
    lower.includes('delivered to handset')
  ) {
    return 'delivered';
  }
  if (/\breject/.test(lower) || lower.includes('blacklisted') || lower.includes('dnd')) {
    return 'rejected';
  }
  if (
    /\bfail/.test(lower) ||
    /\bundeliv/.test(lower) ||
    lower.includes('expired') ||
    lower.includes('absent subscriber')
  ) {
    return 'failed';
  }
  if (
    lower.includes('pending') ||
    lower.includes('submitted') ||
    lower.includes('accept') ||
    lower.includes('enroute') ||
    lower.includes('queued')
  ) {
    return 'pending';
  }
  return 'unknown';
}

const env = loadEnv(resolve(process.cwd(), '.env'));
const username = (env.AQUASMS_USERNAME || '').trim();
const apiKey = (env.AQUASMS_API_KEY || '').trim();
const msgid = String(process.argv[2] || '').trim();

if (!msgid) {
  console.log(
    JSON.stringify({
      error: 'Pass msgid: node scripts/check-aquasms-dlr.mjs <msgid>',
    }),
  );
  process.exit(1);
}

if (!username || !apiKey) {
  console.log(JSON.stringify({ error: 'AQUASMS_USERNAME / AQUASMS_API_KEY missing in .env' }));
  process.exit(1);
}

// Prefer /getDLR (non-v2). /v2/getDLR returns MESSAGES NOT FOUND for valid msgids on this account.
const url = `https://login.aquasms.com/getDLR?${new URLSearchParams({
  username,
  apikey: apiKey,
  msgid,
}).toString()}`;

const response = await fetch(url, {
  method: 'GET',
  headers: { Accept: 'application/json, text/plain, */*' },
});
const text = await response.text();

console.log(
  JSON.stringify(
    {
      messageId: msgid,
      httpStatus: response.status,
      deliveryStatus: classify(response.status, text),
      providerBodySanitized: sanitize(text, apiKey),
      note: 'HTTP 200 alone does not mean delivered.',
    },
    null,
    2,
  ),
);
