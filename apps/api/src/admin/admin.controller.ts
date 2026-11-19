import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('session')
  session(@Req() request: AuthedRequest) {
    return this.adminService.getSession(
      request.authUser!.id,
      request.authUser!.accessToken,
    );
  }

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }
}
