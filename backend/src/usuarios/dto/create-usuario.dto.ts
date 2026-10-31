import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nomeCompleto!: string;

  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @IsString({ message: 'O CPF/CNPJ deve conter apenas números' })
  @IsNotEmpty({ message: 'O CPF/CNPJ é obrigatório' })
  @Matches(/^(\d{11}|\d{14})$/, {
    message:
      'O CPF deve ter 11 dígitos ou o CNPJ deve ter 14 dígitos (apenas números)',
  })
  cpfCnpj!: string;

  @IsString({ message: 'O telefone deve ser uma string' })
  @Matches(/^\d{10,11}$/, {
    message:
      'O telefone deve conter apenas números (DDD + número, entre 10 e 11 dígitos)',
  })
  @IsOptional()
  telefone?: string | null;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula',
  })
  @Matches(/\d/, {
    message: 'A senha deve conter pelo menos um número',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'A senha deve conter pelo menos um caractere especial',
  })
  senha!: string;

  @IsBoolean()
  @IsOptional()
  receberSms?: boolean;

  @IsBoolean()
  @IsOptional()
  receberEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  receberPush?: boolean;
}
