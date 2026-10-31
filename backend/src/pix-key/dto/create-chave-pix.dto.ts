import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateIf,
  IsEmail,
  IsOptional,
} from 'class-validator';

export enum TipoChavePix {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
}

export class CreateChavePixDto {
  @IsEnum(TipoChavePix, {
    message: 'O tipo da chave deve ser CPF, CNPJ, EMAIL ou TELEFONE',
  })
  @IsNotEmpty()
  tipoChave: TipoChavePix;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: CreateChavePixDto) => o.tipoChave === TipoChavePix.EMAIL)
  @IsEmail({}, { message: 'O valor da chave deve ser um email válido' })
  valorChave: string;

  @IsOptional()
  @IsUUID()
  contaId?: string;

  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
