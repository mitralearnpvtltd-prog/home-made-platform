import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const line = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('AQUASMS_MESSAGE_TEMPLATE='));
const v = (line ?? '').slice('AQUASMS_MESSAGE_TEMPLATE='.length).trim();
const rendered = v.replaceAll('{otp}', '9999');
console.log(
  JSON.stringify(
    {
      templateLen: v.length,
      startsWithYour: v.startsWith('Your '),
      renderedSafe: rendered.replace('9999', '****'),
      matchesDeliveredShape: /^Your OTP code for verification is : \d{4} CRTFUL$/.test(
        rendered,
      ),
    },
    null,
    2,
  ),
);
