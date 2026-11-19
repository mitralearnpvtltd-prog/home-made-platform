import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trimString)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, { message: 'fullName must be at least 2 characters' })
  @MaxLength(120, { message: 'fullName must be at most 120 characters' })
  fullName?: string;

  @IsOptional()
  @Transform(trimString)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'phone must be a 10-digit Indian mobile number',
  })
  phone?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email?: string;
}
