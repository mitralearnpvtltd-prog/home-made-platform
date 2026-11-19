import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegisterDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'fullName is required' })
  @MinLength(2, { message: 'fullName must be at least 2 characters' })
  @MaxLength(120, { message: 'fullName must be at most 120 characters' })
  fullName!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'phone must be a 10-digit Indian mobile number',
  })
  phone!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  /** AquaSMS OTP verified server-side before account creation. */
  @Transform(trimString)
  @IsString()
  @Matches(/^\d{4}$/, { message: 'otp must be a 4-digit code' })
  otp!: string;
}
