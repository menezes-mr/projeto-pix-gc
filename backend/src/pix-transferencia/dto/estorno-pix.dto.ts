import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class EstornoPixDto {
  @IsUUID()
  @IsNotEmpty()
  transacaoIdOriginal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
