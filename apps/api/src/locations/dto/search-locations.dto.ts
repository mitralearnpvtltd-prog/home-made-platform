import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LOCATION_SEARCH_TYPES = [
  'from_locality',
  'to_destination',
] as const;

export type LocationSearchType = (typeof LOCATION_SEARCH_TYPES)[number];

function trimOptionalString({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null) {
    return value;
  }
  return typeof value === 'string' ? value.trim() : value;
}

export class SearchLocationsQueryDto {
  @IsIn(LOCATION_SEARCH_TYPES, {
    message: 'type must be either from_locality or to_destination',
  })
  type!: LocationSearchType;

  /** Optional name search. Empty/omitted returns active rows for the type (up to limit). */
  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(120, { message: 'q must be at most 120 characters' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  /** Catalogue fetches may need the full active set (From ~45, To ~100+). */
  @Max(200)
  limit?: number;
}
