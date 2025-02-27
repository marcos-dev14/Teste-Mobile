import { IsArray, IsNumber, IsNotEmpty, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  addressId: string;

  @IsArray()
  @ValidateNested({ each: true }) 
  @Type(() => OrderItemDto) 
  items: OrderItemDto[];

  @IsNumber()
  @IsNotEmpty()
  totalItems: number;

  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;
}
