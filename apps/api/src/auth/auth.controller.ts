import {
  Body,
  Controller,
  Get,
  Logger,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, type AuthedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  sendOtp(@Body() body: SendOtpDto, @Req() request: Request) {
    // Never trust a client-supplied IP for rate limiting.
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : undefined;
    const requestIp =
      forwardedIp || request.ip || request.socket.remoteAddress || null;
    const phoneTail = String(body.phone ?? '').replace(/\D/g, '').slice(-4);
    this.logger.log(
      `POST /auth/otp/send hit purpose=${body.purpose ?? 'unknown'} phoneTail=${phoneTail || 'n/a'}`,
    );
    return this.authService.sendOtp(body, requestIp);
  }

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthedRequest) {
    return this.authService.getProfile(request.authUser!.accessToken);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@Req() request: AuthedRequest, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(request.authUser!.accessToken, body);
  }
}
