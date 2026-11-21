import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '../notifications.constants';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateNotificationDto {
  @IsIn(NOTIFICATION_CATEGORIES)
  category!: NotificationCategory;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  iconType?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2048)
  actionUrl?: string;

  @IsOptional()
  @Type(() => Object)
  @IsObject()
  metadata?: Record<string, unknown>;
}
