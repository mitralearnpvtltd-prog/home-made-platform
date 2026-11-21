import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { type ApplicationStatus } from './applications.constants';
import { ApplicationsService } from './applications.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { SubmitCookApplicationDto } from './dto/submit-cook-application.dto';
import { SubmitDeliveryPartnerApplicationDto } from './dto/submit-delivery-partner-application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('cook')
  submitCook(@Body() body: SubmitCookApplicationDto) {
    return this.applicationsService.submitCookApplication(body);
  }

  @Post('delivery-partner')
  submitDeliveryPartner(@Body() body: SubmitDeliveryPartnerApplicationDto) {
    return this.applicationsService.submitDeliveryPartnerApplication(body);
  }

  @Get('admin/cook')
  @UseGuards(AuthGuard, AdminGuard)
  listCook(@Query('status') status?: ApplicationStatus) {
    return this.applicationsService.listCookApplications(status);
  }

  @Get('admin/delivery-partner')
  @UseGuards(AuthGuard, AdminGuard)
  listDeliveryPartner(@Query('status') status?: ApplicationStatus) {
    return this.applicationsService.listDeliveryPartnerApplications(status);
  }

  @Get('admin/cook/:id')
  @UseGuards(AuthGuard, AdminGuard)
  getCook(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.getCookApplication(id);
  }

  @Get('admin/delivery-partner/:id')
  @UseGuards(AuthGuard, AdminGuard)
  getDeliveryPartner(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.getDeliveryPartnerApplication(id);
  }

  @Patch('admin/cook/:id')
  @UseGuards(AuthGuard, AdminGuard)
  reviewCook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewApplicationDto,
    @Req() req: AuthedRequest,
  ) {
    return this.applicationsService.reviewCookApplication(
      id,
      body,
      req.authUser!.id,
    );
  }

  @Patch('admin/delivery-partner/:id')
  @UseGuards(AuthGuard, AdminGuard)
  reviewDeliveryPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewApplicationDto,
    @Req() req: AuthedRequest,
  ) {
    return this.applicationsService.reviewDeliveryPartnerApplication(
      id,
      body,
      req.authUser!.id,
    );
  }
}
