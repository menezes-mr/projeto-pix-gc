import { IsEnum, IsNotEmpty, IsString, IsUUID, ValidateIf, IsEmail } from 'class-validator';

export enum TipoChavePix {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
}

export class CreateChavePixDto {
  @IsEnum(TipoChavePix, { message: 'O tipo da chave deve ser CPF, CNPJ, EMAIL ou TELEFONE' })
  @IsNotEmpty()
  tipoChave: TipoChavePix;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.tipoChave === TipoChavePix.EMAIL)
  @IsEmail({}, { message: 'O valor da chave deve ser um email válido' })
  valorChave: string;

  @IsUUID()
  @IsNotEmpty()
  contaId: string;

  @IsUUID()
  @IsNotEmpty()
  usuarioId: string;
}
