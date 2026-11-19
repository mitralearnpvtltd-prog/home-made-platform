import {
  Controller,
  Get,
  Logger,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AquaSmsService } from './aquasms.service';
import { SmsDiagnosticGuard } from './sms-diagnostic.guard';

/**
 * Backend-only AquaSMS DLR diagnostics.
 * Requires header: x-aahaa-sms-diagnostic-key: <AQUASMS_DIAGNOSTIC_KEY>
 * Disabled (404) when AQUASMS_DIAGNOSTIC_KEY is unset.
 */
@Controller('sms/diagnostics')
@UseGuards(SmsDiagnosticGuard)
export class SmsDiagnosticController {
  private readonly logger = new Logger(SmsDiagnosticController.name);

  constructor(private readonly aquaSms: AquaSmsService) {}

  @Get('recent')
  listRecent() {
    this.logger.log('SMS diagnostic recent submissions requested');
    return {
      submissions: this.aquaSms.listRecentSubmissions(),
      note: 'messageId values are provider submission ids, not OTPs. deliveryStatus requires /sms/diagnostics/dlr/:msgid.',
    };
  }

  @Get('dlr/:msgid')
  async lookupDlr(@Param('msgid') msgid: string) {
    this.logger.log(`SMS diagnostic DLR requested msgid=${String(msgid ?? '').trim()}`);
    const report = await this.aquaSms.getDeliveryReport(msgid);
    return {
      messageId: report.messageId,
      httpStatus: report.httpStatus,
      deliveryStatus: report.deliveryStatus,
      providerHints: report.providerHints,
      providerBodySanitized: report.providerBodySanitized,
      note: 'deliveryStatus is derived from AquaSMS DLR text. HTTP 200 alone does not mean delivered.',
    };
  }
}
