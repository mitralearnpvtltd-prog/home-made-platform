import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() request: AuthedRequest) {
    return this.notificationsService.list(request.authUser!.id);
  }

  @Get('unread-count')
  unreadCount(@Req() request: AuthedRequest) {
    return this.notificationsService.getUnreadCount(request.authUser!.id);
  }

  @Get('preferences')
  getPreferences(@Req() request: AuthedRequest) {
    return this.notificationsService.getPreferences(request.authUser!.id);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() request: AuthedRequest,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(
      request.authUser!.id,
      body,
    );
  }

  @Patch('read-all')
  markAllRead(@Req() request: AuthedRequest) {
    return this.notificationsService.markAllRead(request.authUser!.id);
  }

  @Patch(':notificationId/read')
  markRead(
    @Req() request: AuthedRequest,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.markRead(
      request.authUser!.id,
      notificationId,
    );
  }

  @Patch(':notificationId/dismiss')
  dismiss(
    @Req() request: AuthedRequest,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.dismiss(
      request.authUser!.id,
      notificationId,
    );
  }
}
