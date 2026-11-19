import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WEEKDAYS } from '../applications.constants';

function toTrimmedString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function parseJsonArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return parsed;
    } catch {
      return trimmed.split(',').map((part) => part.trim()).filter(Boolean);
    }
  }
  return value;
}

function toBoolean({ value }: { value: unknown }): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

export class SubmitDeliveryPartnerApplicationDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian number.',
  })
  mobileNumber!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  currentAddress!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Pincode must be a valid 6-digit Indian PIN.' })
  pincode!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  vehicleRegistrationNumber!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  drivingLicenseNumber!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  preferredDeliveryArea!: string;

  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn([...WEEKDAYS], { each: true })
  availableDays!: string[];

  @Transform(toTrimmedString)
  @IsIn(['full_time', 'part_time'])
  workPreference!: 'full_time' | 'part_time';

  @Transform(toBoolean)
  @IsBoolean()
  termsAccepted!: boolean;
}
