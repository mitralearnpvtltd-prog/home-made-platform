import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { WEEKDAYS } from '../applications.constants';
import {
  isValidAvailableDays,
  isValidWorkingHours,
  type AvailableDaysMode,
  type WorkingHoursMode,
} from '../delivery-application.validation';

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

@ValidatorConstraint({ name: 'isValidDeliveryAvailableDays', async: false })
class IsValidDeliveryAvailableDaysConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    const application = args.object as { availableDaysMode?: unknown };
    return isValidAvailableDays(application.availableDaysMode, value);
  }

  defaultMessage(): string {
    return 'Choose days that match the selected working-days option.';
  }
}

@ValidatorConstraint({ name: 'isValidDeliveryWorkingHours', async: false })
class IsValidDeliveryWorkingHoursConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    const application = args.object as {
      workingHoursMode?: unknown;
      availableFrom?: unknown;
    };
    return isValidWorkingHours(
      application.workingHoursMode,
      application.availableFrom,
      value,
    );
  }

  defaultMessage(): string {
    return 'Working hours must be within 6:00 PM–9:00 PM and end after they start.';
  }
}

@ValidatorConstraint({ name: 'isValidDeliveryVehicleFields', async: false })
class IsValidDeliveryVehicleFieldsConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value !== true && value !== false) return true;
    const application = args.object as {
      vehicleType?: unknown;
      vehicleRegistrationNumber?: unknown;
      otherVehicleDescription?: unknown;
    };
    const fields = [
      application.vehicleType,
      application.vehicleRegistrationNumber,
      application.otherVehicleDescription,
    ];
    const hasValue = (field: unknown) =>
      field !== undefined &&
      field !== null &&
      (typeof field !== 'string' || field.trim().length > 0);

    if (value === false) return !fields.some(hasValue);

    const registration = application.vehicleRegistrationNumber;
    const description = application.otherVehicleDescription;
    if (['bike', 'car', 'auto'].includes(String(application.vehicleType))) {
      return (
        typeof registration === 'string' &&
        registration.trim().length >= 4 &&
        registration.trim().length <= 20 &&
        !hasValue(description)
      );
    }
    if (application.vehicleType === 'other') {
      return (
        !hasValue(registration) &&
        typeof description === 'string' &&
        description.trim().length >= 2 &&
        description.trim().length <= 80
      );
    }
    return false;
  }

  defaultMessage(): string {
    return 'Provide only the vehicle details required for the selected vehicle type.';
  }
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

  @Transform(toBoolean)
  @IsBoolean()
  @Validate(IsValidDeliveryVehicleFieldsConstraint)
  ownsVehicle!: boolean;

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  // Accept the retired field from older clients, but new applications do not use it.
  canArrangeVehicle?: boolean;

  @Transform(toTrimmedString)
  @ValidateIf((application: { ownsVehicle?: boolean }) => application.ownsVehicle === true)
  @IsIn(['bike', 'car', 'auto', 'other'])
  vehicleType?: 'bike' | 'car' | 'auto' | 'other';

  @Transform(toTrimmedString)
  @ValidateIf(
    (application: {
      ownsVehicle?: boolean;
      vehicleType?: string;
    }) =>
      application.ownsVehicle === true &&
      ['bike', 'car', 'auto'].includes(application.vehicleType ?? ''),
  )
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  vehicleRegistrationNumber?: string;

  @Transform(toTrimmedString)
  @ValidateIf(
    (application: { ownsVehicle?: boolean; vehicleType?: string }) =>
      application.ownsVehicle === true && application.vehicleType === 'other',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  otherVehicleDescription?: string;

  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn([...WEEKDAYS], { each: true })
  @Validate(IsValidDeliveryAvailableDaysConstraint)
  availableDays!: string[];

  @Transform(toTrimmedString)
  @IsIn(['all_days', 'weekdays', 'weekends', 'choose_days'])
  availableDaysMode!: AvailableDaysMode;

  @Transform(toTrimmedString)
  @IsOptional()
  @IsIn(['full_time', 'part_time'])
  // Kept optional for older clients; new applications do not store a preference.
  workPreference?: 'full_time' | 'part_time';

  @Transform(toTrimmedString)
  @IsIn(['full_app', 'custom'])
  workingHoursMode!: WorkingHoursMode;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^(18|19|20):(00|30)$|^21:00$/)
  availableFrom!: string;

  @Transform(toTrimmedString)
  @IsString()
  @Matches(/^(18|19|20):(00|30)$|^21:00$/)
  @Validate(IsValidDeliveryWorkingHoursConstraint)
  availableUntil!: string;
}
