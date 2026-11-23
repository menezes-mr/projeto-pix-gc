#!/usr/bin/env bash
set -euo pipefail

api_url="${PIX_API_URL:-http://localhost:3333}"
valor="${1:-}"
valor="${valor/,/.}"
if [[ ! "$valor" =~ ^[0-9]+([.][0-9]{1,2})?$ ]] || ! awk -v v="$valor" 'BEGIN { exit !(v > 0) }'; then
  printf 'Informe um valor positivo, por exemplo: %s 100.00\n' "$0" >&2
  exit 1
fi

read -r -p 'CPF ou e-mail da conta que vai receber: ' identificador
read -r -s -p 'Senha: ' senha
printf '\n'
login_payload=$(printf '%s\n' "$senha" | jq -Rn --arg identificador "$identificador" '{identificador: $identificador, senha: input}')
unset senha
if ! login=$(printf '%s' "$login_payload" | curl --silent --show-error --fail-with-body -H 'Content-Type: application/json' --data-binary @- "$api_url/auth/login"); then
  printf 'Não foi possível entrar: %s\n' "$login" >&2
  exit 1
fi
unset login_payload
token=$(printf '%s' "$login" | jq -er '.access_token')
unset login

if ! chaves=$(curl --silent --show-error --fail-with-body -H "Authorization: Bearer $token" "$api_url/pix/chaves/minhas"); then
  printf 'Não foi possível consultar as chaves PIX: %s\n' "$chaves" >&2
  exit 1
fi
chave=$(printf '%s' "$chaves" | jq -r '[.[] | select(.status == "ATIVA")][0].valorChave // empty')
if [[ -z "$chave" ]]; then
  printf 'A conta não possui chave PIX ativa. Cadastre uma chave antes de simular.\n' >&2
  exit 1
fi

identificador_externo=$(python3 -c 'import uuid; print(uuid.uuid4())')
payload=$(jq -n --arg chave "$chave" --arg valor "$valor" --arg id "$identificador_externo" '{chavePixDestino: $chave, valor: ($valor | tonumber), transacaoExternaId: $id}')
if ! resposta=$(printf '%s' "$payload" | curl --silent --show-error --fail-with-body -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data-binary @- "$api_url/pix/recebimento"); then
  printf 'Não foi possível registrar o recebimento: %s\n' "$resposta" >&2
  exit 1
fi
printf 'Recebimento fictício registrado. Atualize o saldo e o extrato na aplicação.\n'
printf '%s\n' "$resposta" | jq '{transacaoId, valor, tipoOperacao, status, dataEfetivacao}'
