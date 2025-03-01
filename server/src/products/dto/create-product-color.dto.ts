import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class CreateProductColorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hex: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];
}