/**
 * Safe AquaSMS response probe — never prints API key, pepper, or OTP.
 * Sends a non-OTP diagnostic message shape using configured template with dummy digits.
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

function sanitize(text) {
  return String(text)
    .replace(/apikey[=:][^&\s"']+/gi, 'apikey=***')
    .replace(/\b\d{4,8}\b/g, '****')
    .slice(0, 400);
}

const env = loadEnv(resolve(process.cwd(), '.env'));
const username = (env.AQUASMS_USERNAME || '').trim();
const apiKey = (env.AQUASMS_API_KEY || '').trim();
const senderName = (env.AQUASMS_SENDER_NAME || '').trim();
const smsType = (env.AQUASMS_SMS_TYPE || 'TRANS').trim();
const peid = (env.AQUASMS_PEID || '').trim();
const templateId = (env.AQUASMS_TEMPLATE_ID || '').trim();
const messageTemplate = (env.AQUASMS_MESSAGE_TEMPLATE || '').trim();
const endpoint = (
  env.AQUASMS_ENDPOINT || 'https://login.aquasms.com/v2/sendSMS'
).trim();
const probeNumber = (process.argv[2] || '').replace(/\D/g, '').slice(-10);

console.log(
  JSON.stringify(
    {
      configured: Boolean(
        username && apiKey && senderName && peid && templateId && messageTemplate,
      ),
      endpointHost: (() => {
        try {
          return new URL(endpoint).host;
        } catch {
          return 'invalid_endpoint';
        }
      })(),
      hasUsername: Boolean(username),
      hasApiKey: Boolean(apiKey),
      senderNameLen: senderName.length,
      smsType,
      peidLen: peid.length,
      templateIdLen: templateId.length,
      messageTemplateLen: messageTemplate.length,
      messageHasOtpPlaceholder: messageTemplate.includes('{otp}'),
      probeNumberLen: probeNumber.length,
    },
    null,
    2,
  ),
);

if (!probeNumber || probeNumber.length !== 10) {
  console.log(
    JSON.stringify({
      skipSend: true,
      reason: 'Pass a 10-digit probe number: node scripts/probe-aquasms-response.mjs 9XXXXXXXXX',
    }),
  );
  process.exit(0);
}

const message = messageTemplate.includes('{otp}')
  ? messageTemplate.replaceAll('{otp}', '0000')
  : messageTemplate;

async function call(method) {
  const params = new URLSearchParams({
    username,
    message,
    sendername: senderName,
    smstype: smsType || 'TRANS',
    numbers: probeNumber,
    apikey: apiKey,
    peid,
    templateid: templateId,
  });

  const url =
    method === 'GET' ? `${endpoint}?${params.toString()}` : endpoint;
  const init =
    method === 'GET'
      ? { method: 'GET', headers: { Accept: 'application/json, text/plain, */*' } }
      : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json, text/plain, */*',
          },
          body: params.toString(),
        };

  const response = await fetch(url, init);
  const text = await response.text();
  return {
    method,
    httpStatus: response.status,
    bodySanitized: sanitize(text),
    bodyLen: text.length,
  };
}

for (const method of ['GET', 'POST']) {
  try {
    const result = await call(method);
    console.log(JSON.stringify({ step: 'provider_call', ...result }, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify({
        step: 'provider_call',
        method,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
  }
}
