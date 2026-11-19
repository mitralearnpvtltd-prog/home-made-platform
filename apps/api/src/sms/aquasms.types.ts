export type AquaSmsConfig = {
  username: string;
  apiKey: string;
  senderName: string;
  smsType: string;
  peid: string;
  templateId: string;
  messageTemplate: string;
  endpoint: string;
  configured: boolean;
};

export type AquaSmsSendInput = {
  phone10: string;
  message: string;
};

export type AquaSmsSendResult = {
  ok: true;
  providerStatus: string;
  /** Provider message id from sendSMS — used for getDLR. Not an OTP. */
  messageId: string | null;
};

/**
 * Delivery classification derived only from explicit provider tokens.
 * HTTP 200 alone never implies delivered.
 */
export type AquaSmsDlrStatus =
  | 'delivered'
  | 'pending'
  | 'rejected'
  | 'failed'
  | 'invalid_msgid'
  | 'unknown';

export type AquaSmsDlrResult = {
  messageId: string;
  httpStatus: number;
  /** Coarse status mapped from provider text when recognizable. */
  deliveryStatus: AquaSmsDlrStatus;
  /** Sanitized provider body (no apikey / OTP-like digit runs). */
  providerBodySanitized: string;
  /** Raw status-ish fields copied from provider JSON when present. */
  providerHints: string[];
};

export type AquaSmsRecentSubmission = {
  messageId: string;
  phoneTail: string;
  submittedAt: string;
};
