import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do usuário é obrigatório.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'O email do usuário é obrigatório.' })
  @IsEmail({}, { message: 'O email é inválido.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha do usuário é obrigatória.' })
  password: string;
}