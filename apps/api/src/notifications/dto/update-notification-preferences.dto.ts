import { IsBoolean, ValidateIf } from 'class-validator';
import type { NotificationPreferences } from '../notifications.constants';

export class UpdateNotificationPreferencesDto
  implements Partial<NotificationPreferences>
{
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  order_updates?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  offers_promotions?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  nearby_home_cooks?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  general_updates?: boolean;
}
