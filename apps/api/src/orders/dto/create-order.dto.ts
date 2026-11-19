import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrderDto {
  /** Client-generated key; retries with the same key return the same order. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  collectorName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  collectorPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  collectionPoint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  kitchenNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pickupNote?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  pickupStopName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pickupTime?: string;

  /** Required snapshot of the passenger's From locality at checkout. */
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  journeyFrom!: string;

  /** Required snapshot of the passenger's To destination at checkout. */
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  journeyTo!: string;

  /** ISO date `YYYY-MM-DD` when known. */
  @IsOptional()
  @IsDateString()
  journeyDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  busNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  seatNumber?: string;

  /** Optional kitchen scope check against the active cart. */
  @IsOptional()
  @IsUUID('4')
  kitchenId?: string;
}
