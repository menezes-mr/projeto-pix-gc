export enum StatusUsuario {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  BLOQUEADO = 'BLOQUEADO',
}

export enum StatusConta {
  ATIVA = 'ATIVA',
  INATIVA = 'INATIVA',
  BLOQUEADA = 'BLOQUEADA',
}

export enum StatusTransacao {
  PENDENTE = 'PENDENTE',
  EFETIVADA = 'EFETIVADA',
  FALHA = 'FALHA',
  CANCELADA = 'CANCELADA',
}

export enum PapelUsuarioConta {
  TITULAR = 'TITULAR',
  DEPENDENTE = 'DEPENDENTE',
}