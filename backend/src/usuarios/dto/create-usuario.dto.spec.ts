import { validateSync } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

describe('validação de CPF no cadastro', () => {
  function errosDocumento(cpfCnpj: string) {
    const dto = new CreateUsuarioDto();
    dto.cpfCnpj = cpfCnpj;
    return validateSync(dto).filter((erro) => erro.property === 'cpfCnpj');
  }

  it('aceita CPF válido e mantém o tratamento de CNPJ', () => {
    expect(errosDocumento('52998224725')).toHaveLength(0);
    expect(errosDocumento('12345678000199')).toHaveLength(0);
  });

  it('rejeita dígitos incorretos e sequências repetidas', () => {
    expect(errosDocumento('52998224724')).not.toHaveLength(0);
    expect(errosDocumento('00000000000')).not.toHaveLength(0);
  });
});
