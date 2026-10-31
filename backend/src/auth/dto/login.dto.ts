import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identificador: string;

  @IsString()
  @IsNotEmpty()
  senha: string;
}
