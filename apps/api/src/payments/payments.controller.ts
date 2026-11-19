import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments/cashfree')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('session')
  @UseGuards(AuthGuard)
  createSession(
    @Req() request: AuthedRequest,
    @Body() body: CreatePaymentSessionDto,
  ) {
    return this.paymentsService.createSession(request.authUser!.id, body.orderId);
  }

  @Post('verify')
  @UseGuards(AuthGuard)
  verifyPayment(
    @Req() request: AuthedRequest,
    @Body() body: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(request.authUser!.id, body.orderId);
  }

  @Get('status/:orderId')
  @UseGuards(AuthGuard)
  getStatus(
    @Req() request: AuthedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.getPaymentStatus(request.authUser!.id, orderId);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    return this.paymentsService.handleWebhook(
      signature,
      timestamp,
      request.rawBody,
    );
  }
}
