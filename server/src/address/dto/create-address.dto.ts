import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateAddressDto {
  @IsUUID()
  @IsNotEmpty({ message: 'O userId é obrigatório.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'O FullName é obrigatório.' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'O endereço é obrigatório.' })
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty({ message: 'A cidade é obrigatório.' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'O estado/região é obrigatório.' })
  state: string;

  @IsString()
  @IsNotEmpty({ message: 'O código postal é obrigatório.' })
  zipCode: string;

  @IsString()
  @IsNotEmpty({ message: 'O país é obrigatório.' })
  country: string;
}