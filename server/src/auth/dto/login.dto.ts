import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'O email do usuário é obrigatório.' })
  @IsEmail({}, { message: 'O email é inválido.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha do usuário é obrigatória.' })
  password: string;
}