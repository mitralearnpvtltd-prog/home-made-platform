import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class LoginDto {
  @Transform(trimString)
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'phone must be a 10-digit Indian mobile number',
  })
  phone!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\d{4}$/, { message: 'otp must be a 4-digit code' })
  otp!: string;
}
