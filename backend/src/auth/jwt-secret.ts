export function obterSegredoJwt(): string {
  const segredo = process.env.JWT_SECRET;
  if (!segredo && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET precisa ser configurado em produção');
  }
  return segredo || 'chave-secreta-padrao-dev';
}
