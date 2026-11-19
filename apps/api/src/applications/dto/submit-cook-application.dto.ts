import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  COOK_FOOD_CATEGORIES,
  COOK_FOOD_TYPES,
  WEEKDAYS,
} from '../applications.constants';

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

function toInt({ value }: { value: unknown }): unknown {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

export class SubmitCookApplicationDto {
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
  @MinLength(2)
  @MaxLength(120)
  kitchenName!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  kitchenAddress!: string;

  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Pincode must be a valid 6-digit Indian PIN.' })
  pincode!: string;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience!: number;

  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn([...COOK_FOOD_TYPES], { each: true })
  foodTypes!: string[];

  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn([...COOK_FOOD_CATEGORIES], { each: true })
  foodCategories!: string[];

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(2000)
  specialDishes?: string;

  @Transform(toTrimmedString)
  @IsIn(['vegetarian', 'non_vegetarian', 'both'])
  foodPreference!: 'vegetarian' | 'non_vegetarian' | 'both';

  @IsOptional()
  @Transform(toTrimmedString)
  @IsString()
  @MaxLength(40)
  fssaiRegistrationNumber?: string;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Kitchen opening time must be HH:MM (24-hour).',
  })
  kitchenOpeningTime!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Kitchen closing time must be HH:MM (24-hour).',
  })
  kitchenClosingTime!: string;

  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn([...WEEKDAYS], { each: true })
  availableDays!: string[];

  @Transform(toBoolean)
  @IsBoolean()
  termsAccepted!: boolean;
}
