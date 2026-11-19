import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SendOtpDto {
  @Transform(trimString)
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'phone must be a 10-digit Indian mobile number',
  })
  phone!: string;

  @Transform(trimString)
  @IsString()
  @IsIn(['login', 'register'], {
    message: 'purpose must be login or register',
  })
  purpose!: 'login' | 'register';

  @ValidateIf((dto: SendOtpDto) => dto.purpose === 'register')
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'fullName is required for registration OTP' })
  @MinLength(2, { message: 'fullName must be at least 2 characters' })
  @MaxLength(120, { message: 'fullName must be at most 120 characters' })
  fullName?: string;

  @ValidateIf((dto: SendOtpDto) => dto.purpose === 'register')
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email?: string;

}
