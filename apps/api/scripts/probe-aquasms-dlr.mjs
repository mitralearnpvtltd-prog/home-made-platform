/**
 * Safe AquaSMS credit/DLR endpoint discovery — never prints API key.
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
    .slice(0, 400);
}

const env = loadEnv(resolve(process.cwd(), '.env'));
const username = (env.AQUASMS_USERNAME || '').trim();
const apiKey = (env.AQUASMS_API_KEY || '').trim();
const msgid = (process.argv[2] || '0').trim();
const base = 'https://login.aquasms.com';

const probes = [
  { path: '/v2/getSMSCredit', qs: { username, apikey: apiKey } },
  { path: '/getSMSCredit', qs: { username, apikey: apiKey } },
  { path: '/v2/getDLR', qs: { username, apikey: apiKey, msgid } },
  { path: '/getDLR', qs: { username, apikey: apiKey, msgid } },
  {
    path: '/v2/getDLRReport',
    qs: {
      username,
      apikey: apiKey,
      from: '20261118',
      to: '20261118',
      sendername: (env.AQUASMS_SENDER_NAME || '').trim(),
    },
  },
];

for (const probe of probes) {
  const params = new URLSearchParams(probe.qs);
  const url = `${base}${probe.path}?${params.toString()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
    });
    const text = await response.text();
    console.log(
      JSON.stringify({
        path: probe.path,
        httpStatus: response.status,
        bodySanitized: sanitize(text, apiKey),
        bodyLen: text.length,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        path: probe.path,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
  }
}
