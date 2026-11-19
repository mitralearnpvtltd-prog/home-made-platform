import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';

@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard, OtpService],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule {}

