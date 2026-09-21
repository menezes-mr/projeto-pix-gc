import { IsDateString, IsNotEmpty } from 'class-validator';

export class RelatorioTransacoesQueryDto {
  @IsNotEmpty()
  @IsDateString()
  dataInicio: string;

  @IsNotEmpty()
  @IsDateString()
  dataFim: string;
}