import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import {
  ALLOWED_PROFILE_PHOTO_MIME,
  MAX_PROFILE_PHOTO_BYTES,
  type ApplicationStatus,
} from './applications.constants';
import { ApplicationsService } from './applications.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { SubmitCookApplicationDto } from './dto/submit-cook-application.dto';
import { SubmitDeliveryPartnerApplicationDto } from './dto/submit-delivery-partner-application.dto';

type MulterMemoryFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

function profilePhotoInterceptor() {
  return FileInterceptor('profilePhoto', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_PROFILE_PHOTO_BYTES },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_PROFILE_PHOTO_MIME.has(file.mimetype)) {
        callback(
          new BadRequestException('Profile photo must be JPEG, PNG, or WebP.') as unknown as Error,
          false,
        );
        return;
      }
      callback(null, true);
    },
  });
}

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('cook')
  @UseInterceptors(profilePhotoInterceptor())
  submitCook(
    @Body() body: SubmitCookApplicationDto,
    @UploadedFile() profilePhoto?: MulterMemoryFile,
  ) {
    return this.applicationsService.submitCookApplication(body, profilePhoto);
  }

  @Post('delivery-partner')
  @UseInterceptors(profilePhotoInterceptor())
  submitDeliveryPartner(
    @Body() body: SubmitDeliveryPartnerApplicationDto,
    @UploadedFile() profilePhoto?: MulterMemoryFile,
  ) {
    return this.applicationsService.submitDeliveryPartnerApplication(
      body,
      profilePhoto,
    );
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
