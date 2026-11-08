// BR Code estático: Manual de Padrões para Iniciação do Pix, Banco Central.
function campo(id: string, valor: string): string {
  if (valor.length > 99) throw new Error("Campo PIX muito longo");
  return id + String(valor.length).padStart(2, "0") + valor;
}

function texto(valor: string, tamanho: number): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, tamanho);
}

export function gerarPayloadPix(
  chave: string,
  nome: string,
  cidade: string,
  valor?: string,
): string {
  if (!/^[\x20-\x7e]+$/.test(chave))
    throw new Error("Chave incompatível com o código PIX");
  const recebedor = texto(nome, 25);
  const municipio = texto(cidade, 15);
  if (!recebedor || !municipio)
    throw new Error("Informe o nome e a cidade do recebedor");
  const dados =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor ? campo("54", valor) : "") +
    campo("58", "BR") +
    campo("59", recebedor) +
    campo("60", municipio) +
    campo("62", campo("05", "***")) +
    "6304";
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(dados)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return dados + crc.toString(16).toUpperCase().padStart(4, "0");
}
