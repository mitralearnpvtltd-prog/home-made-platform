import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AquaSmsConfig,
  AquaSmsDlrResult,
  AquaSmsDlrStatus,
  AquaSmsRecentSubmission,
  AquaSmsSendInput,
  AquaSmsSendResult,
} from './aquasms.types';

const DEFAULT_ENDPOINT = 'https://login.aquasms.com/v2/sendSMS';
/** Live probe: /getDLR returns dlr_status; /v2/getDLR returns MESSAGES NOT FOUND for the same msgid. */
const DEFAULT_DLR_ENDPOINT = 'https://login.aquasms.com/getDLR';
const RECENT_SUBMISSION_LIMIT = 50;

@Injectable()
export class AquaSmsService {
  private readonly logger = new Logger(AquaSmsService.name);
  private readonly recentSubmissions: AquaSmsRecentSubmission[] = [];

  constructor(private readonly configService: ConfigService) {
    const cfg = this.getConfig();
    if (cfg.configured) {
      const template = cfg.messageTemplate;
      this.logger.log(
        `AquaSMS config loaded host=${this.safeHost(cfg.endpoint)} senderLen=${cfg.senderName.length} templateIdLen=${cfg.templateId.length} templateLen=${template.length} templateStartsWithYour=${template.startsWith('Your ')} peidLen=${cfg.peid.length}`,
      );
    }
  }

  getConfig(): AquaSmsConfig {
    const aqua = this.configService.get<AquaSmsConfig>('aquasms');
    if (!aqua) {
      return {
        username: '',
        apiKey: '',
        senderName: '',
        smsType: 'TRANS',
        peid: '',
        templateId: '',
        messageTemplate: '',
        endpoint: DEFAULT_ENDPOINT,
        configured: false,
      };
    }
    return aqua;
  }

  isConfigured(): boolean {
    return this.getConfig().configured;
  }

  /**
   * Renders the approved DLT message template.
   * Template must contain `{otp}` exactly once (and no other invented vars).
   */
  renderOtpMessage(otp: string): string {
    const { messageTemplate } = this.getConfig();
    if (!messageTemplate.includes('{otp}')) {
      throw new ServiceUnavailableException(
        'AQUASMS_MESSAGE_TEMPLATE must include the {otp} placeholder matching your approved DLT template.',
      );
    }
    return messageTemplate.replaceAll('{otp}', otp);
  }

  async sendTransactionalSms(input: AquaSmsSendInput): Promise<AquaSmsSendResult> {
    const cfg = this.getConfig();
    if (!cfg.configured) {
      this.logger.error(
        'AquaSMS send blocked: provider env is incomplete (username/apiKey/sender/peid/template/message).',
      );
      throw new ServiceUnavailableException(
        'AquaSMS is not configured. Set AQUASMS_USERNAME, AQUASMS_API_KEY, AQUASMS_SENDER_NAME, AQUASMS_PEID, AQUASMS_TEMPLATE_ID, and AQUASMS_MESSAGE_TEMPLATE on the API.',
      );
    }

    const phone10 = input.phone10.replace(/\D/g, '').slice(-10);
    if (phone10.length !== 10) {
      throw new ServiceUnavailableException('Invalid mobile number for SMS delivery.');
    }

    const params = new URLSearchParams({
      username: cfg.username,
      message: input.message,
      sendername: cfg.senderName,
      smstype: cfg.smsType || 'TRANS',
      numbers: phone10,
      apikey: cfg.apiKey,
      peid: cfg.peid,
      templateid: cfg.templateId,
    });

    const method = (process.env.AQUASMS_HTTP_METHOD || 'GET').trim().toUpperCase() === 'POST'
      ? 'POST'
      : 'GET';

    this.logger.log(
      `AquaSMS request starting method=${method} host=${this.safeHost(cfg.endpoint)} phoneTail=${phone10.slice(-4)} senderLen=${cfg.senderName.length} templateIdLen=${cfg.templateId.length} messageLen=${input.message.length} messageStartsWithYour=${input.message.startsWith('Your ')}`,
    );

    let response: Response;
    try {
      if (method === 'GET') {
        const url = `${cfg.endpoint}?${params.toString()}`;
        response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json, text/plain, */*' },
        });
      } else {
        response = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json, text/plain, */*',
          },
          body: params.toString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `AquaSMS network error: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Unable to send SMS right now. Please try again shortly.',
      );
    }

    const rawText = (await response.text()).slice(0, 2000);
    const accepted = this.isProviderSuccess(response.status, rawText);
    if (!accepted) {
      this.logger.warn(
        `AquaSMS rejected SMS (http=${response.status}, body=${this.sanitizeBody(rawText)})`,
      );
      throw new ServiceUnavailableException(
        'Unable to send SMS right now. Please try again shortly.',
      );
    }

    const messageId = this.extractMessageId(rawText);
    if (messageId) {
      this.rememberSubmission(messageId, phone10.slice(-4));
    }

    // Log msgid separately: sanitizeBody masks short digit runs (OTP protection)
    // and would otherwise destroy numeric AquaSMS message ids.
    this.logger.log(
      `AquaSMS accepted SMS (http=${response.status}, msgid=${messageId ?? 'missing'}, submissionOnly=true, body=${this.sanitizeBody(rawText)})`,
    );
    return {
      ok: true,
      providerStatus: String(response.status),
      messageId,
    };
  }

  /**
   * Pull delivery report for a previously submitted msgid.
   * Evidence (18 Nov 2026, msgid 28148616 on this account):
   *   GET /getDLR?username=&apikey=&msgid= → [{"dlr_status":"UNDELIV"}]
   *   GET /v2/getDLR?... → {"error":"MESSAGES NOT FOUND","status":"ERROR"} (do not use)
   * HTTP 200 alone is never treated as delivered.
   */
  async getDeliveryReport(messageId: string): Promise<AquaSmsDlrResult> {
    const cfg = this.getConfig();
    const msgid = String(messageId ?? '').trim();
    if (!msgid) {
      throw new ServiceUnavailableException('msgid is required for AquaSMS DLR lookup.');
    }
    if (!cfg.configured) {
      throw new ServiceUnavailableException(
        'AquaSMS is not configured. Set AQUASMS_USERNAME and AQUASMS_API_KEY on the API.',
      );
    }

    const dlrEndpoint = this.resolveDlrEndpoint(cfg.endpoint);
    const params = new URLSearchParams({
      username: cfg.username,
      apikey: cfg.apiKey,
      msgid,
    });

    this.logger.log(
      `AquaSMS DLR lookup starting host=${this.safeHost(dlrEndpoint)} msgid=${msgid}`,
    );

    let response: Response;
    try {
      response = await fetch(`${dlrEndpoint}?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
      });
    } catch (error) {
      this.logger.error(
        `AquaSMS DLR network error: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Unable to reach AquaSMS delivery report right now.',
      );
    }

    const rawText = (await response.text()).slice(0, 4000);
    const deliveryStatus = this.classifyDlrStatus(response.status, rawText);
    const providerHints = this.extractProviderHints(rawText);
    const providerBodySanitized = this.sanitizeBody(rawText);

    this.logger.log(
      `AquaSMS DLR result msgid=${msgid} http=${response.status} deliveryStatus=${deliveryStatus} hints=${providerHints.join('|') || 'none'}`,
    );

    return {
      messageId: msgid,
      httpStatus: response.status,
      deliveryStatus,
      providerBodySanitized,
      providerHints,
    };
  }

  listRecentSubmissions(): AquaSmsRecentSubmission[] {
    return [...this.recentSubmissions];
  }

  /**
   * Fail-closed provider acceptance for sendSMS.
   * AquaSMS often returns HTTP 200 with a JSON array like:
   *   [{"msg":"invalid apikey","status":"error"}]
   * Those must never be treated as success.
   */
  isProviderSuccess(httpStatus: number, body: string): boolean {
    if (httpStatus < 200 || httpStatus >= 300) {
      return false;
    }

    const trimmed = body.trim();
    if (!trimmed) {
      return false;
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (rows.length === 0) {
        return false;
      }

      let anyExplicitSuccess = false;
      for (const row of rows) {
        if (!row || typeof row !== 'object') {
          return false;
        }
        const record = row as Record<string, unknown>;
        const status = String(record.status ?? record.Status ?? '').toLowerCase();
        const msg = String(
          record.msg ??
            record.Message ??
            record.message ??
            record.ErrorMessage ??
            record.errorMessage ??
            '',
        ).toLowerCase();
        const errorCode = String(
          record.ErrorCode ?? record.errorCode ?? record.code ?? '',
        ).toLowerCase();

        if (
          status === 'error' ||
          status === 'failed' ||
          status === 'fail' ||
          msg.includes('invalid') ||
          msg.includes('fail') ||
          msg.includes('error') ||
          msg.includes('reject')
        ) {
          return false;
        }

        if (
          status === 'success' ||
          status === 'ok' ||
          errorCode === '000' ||
          errorCode === '0' ||
          msg.includes('success') ||
          msg.includes('done') ||
          msg.includes('submitted')
        ) {
          anyExplicitSuccess = true;
          continue;
        }

        // Unknown object shape — do not assume success.
        return false;
      }

      return anyExplicitSuccess;
    } catch {
      const lower = trimmed.toLowerCase();
      if (
        lower.includes('fail') ||
        lower.includes('invalid') ||
        lower.includes('error') ||
        lower.includes('reject')
      ) {
        return false;
      }
      return (
        lower === 'ok' ||
        lower === 'success' ||
        lower.includes('success') ||
        lower.includes('submitted') ||
        lower.includes('done')
      );
    }
  }

  extractMessageId(body: string): string | null {
    const trimmed = body.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        if (!row || typeof row !== 'object') {
          continue;
        }
        const record = row as Record<string, unknown>;
        const candidate =
          record.msgid ??
          record.msgId ??
          record.messageId ??
          record.MessageId ??
          record.MESSAGEID;
        if (candidate === undefined || candidate === null) {
          continue;
        }
        const value = String(candidate).trim();
        if (value) {
          return value;
        }
      }
    } catch {
      const match = trimmed.match(/\bmsgid["']?\s*[:=]\s*["']?([A-Za-z0-9_-]+)/i);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Map AquaSMS DLR body to a coarse status without inventing delivery.
   * Observed:
   *   [{"dlr_status":"UNDELIV"}] → failed
   *   {"error":"INVALID MESSAGE ID","status":"ERROR"} → invalid_msgid
   *   {"error":"MESSAGES NOT FOUND","status":"ERROR"} → not found on this DLR API
   *   [{"responseCode":"INVALID MESSAGE ID"}] → invalid_msgid
   */
  classifyDlrStatus(httpStatus: number, body: string): AquaSmsDlrStatus {
    if (httpStatus < 200 || httpStatus >= 300) {
      return 'unknown';
    }

    const lower = body.toLowerCase();
    if (
      lower.includes('invalid message id') ||
      lower.includes('invalid msgid') ||
      lower.includes('invalid messageid')
    ) {
      return 'invalid_msgid';
    }

    // /v2/getDLR often returns this even when /getDLR has the record.
    if (lower.includes('messages not found') || lower.includes('message not found')) {
      return 'unknown';
    }

    // Prefer explicit delivery tokens only.
    if (
      /\bdelivrd\b/.test(lower) ||
      /\bdelivered\b/.test(lower) ||
      lower.includes('delivered to mobile') ||
      lower.includes('delivered to handset')
    ) {
      return 'delivered';
    }

    if (
      /\breject/.test(lower) ||
      lower.includes('blacklisted') ||
      lower.includes('dnd')
    ) {
      return 'rejected';
    }

    if (
      /\bfail/.test(lower) ||
      /\bundeliv/.test(lower) ||
      lower.includes('expired') ||
      lower.includes('absent subscriber') ||
      lower.includes('unidentified subscriber')
    ) {
      return 'failed';
    }

    if (
      lower.includes('pending') ||
      lower.includes('submitted') ||
      lower.includes('accept') ||
      lower.includes('enroute') ||
      lower.includes('in process') ||
      lower.includes('inprogress') ||
      lower.includes('queued')
    ) {
      return 'pending';
    }

    // Generic ERROR without a recognized delivery token — not delivery.
    if (lower.includes('"status":"error"') || lower.includes('"status": "error"')) {
      return 'unknown';
    }

    return 'unknown';
  }

  extractProviderHints(body: string): string[] {
    const hints: string[] = [];
    try {
      const parsed: unknown = JSON.parse(body.trim());
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        if (!row || typeof row !== 'object') {
          continue;
        }
        const record = row as Record<string, unknown>;
        for (const key of [
          'status',
          'Status',
          'error',
          'msg',
          'message',
          'responseCode',
          'dlr_status',
          'DLR',
          'dlr',
          'deliveryStatus',
        ]) {
          const value = record[key];
          if (value !== undefined && value !== null && String(value).trim()) {
            hints.push(`${key}=${String(value).trim().slice(0, 80)}`);
          }
        }
      }
    } catch {
      const snippet = body.trim().slice(0, 120);
      if (snippet) {
        hints.push(`raw=${snippet}`);
      }
    }
    return hints.slice(0, 12);
  }

  /**
   * Never log API keys, OTP digit runs, full phones, or full query strings.
   * Message ids are logged separately and must not rely on surviving this mask.
   */
  sanitizeBody(body: string): string {
    return body
      .replace(/apikey[=:][^&\s"']+/gi, 'apikey=***')
      .replace(/\b\d{4,8}\b/g, '****')
      .slice(0, 240);
  }

  private rememberSubmission(messageId: string, phoneTail: string): void {
    this.recentSubmissions.unshift({
      messageId,
      phoneTail,
      submittedAt: new Date().toISOString(),
    });
    if (this.recentSubmissions.length > RECENT_SUBMISSION_LIMIT) {
      this.recentSubmissions.length = RECENT_SUBMISSION_LIMIT;
    }
  }

  private resolveDlrEndpoint(sendEndpoint: string): string {
    try {
      const url = new URL(sendEndpoint);
      // Prefer non-v2 getDLR — verified against AquaSMS for this account.
      url.pathname = '/getDLR';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch {
      return DEFAULT_DLR_ENDPOINT;
    }
  }

  private safeHost(endpoint: string): string {
    try {
      return new URL(endpoint).host;
    } catch {
      return 'invalid_endpoint';
    }
  }
}

export {
  DEFAULT_ENDPOINT as AQUASMS_DEFAULT_ENDPOINT,
  DEFAULT_DLR_ENDPOINT as AQUASMS_DEFAULT_DLR_ENDPOINT,
};
