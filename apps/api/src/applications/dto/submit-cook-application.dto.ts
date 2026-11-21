import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { WEEKDAYS } from '../applications.constants';
import {
  isValidAvailabilitySchedule,
  type AvailabilityByDay,
} from '../availability-schedule';

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

function parseTrimmedStringArray({ value }: { value: unknown }): unknown {
  const parsed = parseJsonArray({ value });
  return Array.isArray(parsed)
    ? parsed.map((item) => (typeof item === 'string' ? item.trim() : item))
    : parsed;
}

@ValidatorConstraint({ name: 'isValidAvailabilityByDay', async: false })
class IsValidAvailabilityByDayConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    const application = args.object as {
      availableDays?: unknown;
      availabilityMode?: unknown;
    };
    return isValidAvailabilitySchedule(
      application.availableDays,
      application.availabilityMode,
      value,
    );
  }

  defaultMessage(): string {
    return 'Provide valid availability times for every selected day.';
  }
}

export class SubmitCookApplicationDto {
  @Transform(toTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    if (!/^[+\d\s().-]+$/.test(value)) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits;
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
  @MaxLength(80)
  city!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Pincode must be a valid 6-digit Indian PIN.' })
  pincode!: string;

  @Transform(toTrimmedString)
  @IsIn(['vegetarian', 'non_vegetarian', 'both'])
  foodPreference!: 'vegetarian' | 'non_vegetarian' | 'both';

  @Transform(parseTrimmedStringArray)
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one food reference.' })
  @ArrayMaxSize(30)
  @ArrayUnique(
    (dish: unknown) =>
      typeof dish === 'string' ? dish.toLocaleLowerCase() : dish,
    { message: 'Food references must not contain duplicates.' },
  )
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  foodReferences!: string[];

  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn([...WEEKDAYS], { each: true })
  availableDays!: string[];

  @Transform(toTrimmedString)
  @IsIn(['shared'])
  availabilityMode!: 'shared';

  @Validate(IsValidAvailabilityByDayConstraint)
  availabilityByDay!: AvailabilityByDay;
}
