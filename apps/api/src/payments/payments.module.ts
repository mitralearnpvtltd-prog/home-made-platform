import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashfreeClient } from './cashfree.client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CashfreeClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
