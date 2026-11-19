/**
 * Safe today's DLR report — never prints API key; masks OTP digit runs and full mobiles.
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
    .replace(/\b\d{10}\b/g, '**********')
    .replace(/\b\d{4,8}\b/g, '****')
    .slice(0, 1200);
}

const env = loadEnv(resolve(process.cwd(), '.env'));
const username = (env.AQUASMS_USERNAME || '').trim();
const apiKey = (env.AQUASMS_API_KEY || '').trim();
const senderName = (env.AQUASMS_SENDER_NAME || '').trim();
const template = (env.AQUASMS_MESSAGE_TEMPLATE || '').trim();
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const date = `${yyyy}-${mm}-${dd}`;

console.log(
  JSON.stringify(
    {
      senderName,
      templatePreview: template.replace(/\{otp\}/g, '{otp}'),
      templateLen: template.length,
      reportDate: date,
    },
    null,
    2,
  ),
);

const url = `https://login.aquasms.com/getDLRReport?${new URLSearchParams({
  username,
  apikey: apiKey,
  from: date,
  to: date,
  sendername: senderName,
})}`;

const response = await fetch(url, {
  method: 'GET',
  headers: { Accept: 'application/json, text/plain, */*' },
});
const text = await response.text();
console.log(
  JSON.stringify(
    {
      httpStatus: response.status,
      bodySanitized: sanitize(text, apiKey),
    },
    null,
    2,
  ),
);
