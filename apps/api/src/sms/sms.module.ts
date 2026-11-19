import { Module } from '@nestjs/common';
import { AquaSmsService } from './aquasms.service';
import { SmsDiagnosticController } from './sms-diagnostic.controller';
import { SmsDiagnosticGuard } from './sms-diagnostic.guard';

@Module({
  controllers: [SmsDiagnosticController],
  providers: [AquaSmsService, SmsDiagnosticGuard],
  exports: [AquaSmsService],
})
export class SmsModule {}
