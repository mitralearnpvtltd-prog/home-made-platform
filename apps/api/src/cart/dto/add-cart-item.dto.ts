import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddCartItemDto {
  @IsUUID('4', { message: 'kitchenId must be a valid UUID' })
  kitchenId!: string;

  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
    message: 'dishCode must be a slug (letters, numbers, and hyphens)',
  })
  dishCode!: string;

  /** Absolute quantity to set after add semantics: omit to increment by 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}
