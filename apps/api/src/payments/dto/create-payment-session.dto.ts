import { IsUUID } from 'class-validator';

export class CreatePaymentSessionDto {
  @IsUUID()
  orderId!: string;
}
