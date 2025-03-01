import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductColorDto } from './create-product-color.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductColorDto)
  colors: CreateProductColorDto[];
}