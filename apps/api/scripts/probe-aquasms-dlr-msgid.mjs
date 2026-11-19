/**
 * Probe DLR variants for one msgid — never prints API key.
 * Usage: node scripts/probe-aquasms-dlr-msgid.mjs <msgid>
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
    .slice(0, 500);
}

const env = loadEnv(resolve(process.cwd(), '.env'));
const username = (env.AQUASMS_USERNAME || '').trim();
const apiKey = (env.AQUASMS_API_KEY || '').trim();
const senderName = (env.AQUASMS_SENDER_NAME || '').trim();
const msgid = String(process.argv[2] || '').trim();
const base = 'https://login.aquasms.com';

if (!msgid) {
  console.log(JSON.stringify({ error: 'Pass msgid' }));
  process.exit(1);
}

const probes = [
  {
    name: 'v2_getDLR_msgid',
    method: 'GET',
    url: `${base}/v2/getDLR?${new URLSearchParams({ username, apikey: apiKey, msgid })}`,
  },
  {
    name: 'v2_getDLR_messageid',
    method: 'GET',
    url: `${base}/v2/getDLR?${new URLSearchParams({ username, apikey: apiKey, messageid: msgid })}`,
  },
  {
    name: 'v2_getDLR_msgId',
    method: 'GET',
    url: `${base}/v2/getDLR?${new URLSearchParams({ username, apikey: apiKey, msgId: msgid })}`,
  },
  {
    name: 'getDLR_msgid',
    method: 'GET',
    url: `${base}/getDLR?${new URLSearchParams({ username, apikey: apiKey, msgid })}`,
  },
  {
    name: 'getDLR_messageid',
    method: 'GET',
    url: `${base}/getDLR?${new URLSearchParams({ username, apikey: apiKey, messageid: msgid })}`,
  },
  {
    name: 'v2_getDLR_POST_form',
    method: 'POST',
    url: `${base}/v2/getDLR`,
    body: new URLSearchParams({ username, apikey: apiKey, msgid }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  },
  {
    name: 'getDLRReport_yyyy-mm-dd',
    method: 'GET',
    url: `${base}/getDLRReport?${new URLSearchParams({
      username,
      apikey: apiKey,
      from: '2026-11-18',
      to: '2026-11-18',
      sendername: senderName,
    })}`,
  },
  {
    name: 'getDLRReport_compact',
    method: 'GET',
    url: `${base}/getDLRReport?${new URLSearchParams({
      username,
      apikey: apiKey,
      from: '20261118',
      to: '20261118',
      sendername: senderName,
    })}`,
  },
  {
    name: 'v2_getDLRReport_yyyy-mm-dd',
    method: 'GET',
    url: `${base}/v2/getDLRReport?${new URLSearchParams({
      username,
      apikey: apiKey,
      from: '2026-11-18',
      to: '2026-11-18',
      sendername: senderName,
    })}`,
  },
  {
    name: 'getSMSCredit',
    method: 'GET',
    url: `${base}/getSMSCredit?${new URLSearchParams({ username, apikey: apiKey })}`,
  },
];

for (const probe of probes) {
  try {
    const init = {
      method: probe.method,
      headers: {
        Accept: 'application/json, text/plain, */*',
        ...(probe.headers || {}),
      },
    };
    if (probe.body) init.body = probe.body;
    const response = await fetch(probe.url, init);
    const text = await response.text();
    console.log(
      JSON.stringify({
        name: probe.name,
        httpStatus: response.status,
        bodySanitized: sanitize(text, apiKey),
        bodyLen: text.length,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        name: probe.name,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
  }
}
