# Contexto do projeto

## Ideia futura: notificações PIX em tempo real

O usuário quer considerar a implementação de notificações em tempo real mais adiante. Esta é uma ideia registrada, não uma solicitação para implementá-la automaticamente.

- Aproveitar o backend NestJS existente e o evento `pix.efetivado` para avisar o recebedor somente após a confirmação da transação.
- Considerar WebSocket, por exemplo um gateway Socket.IO no mesmo backend, para substituir a consulta periódica ao extrato feita pelo cabeçalho.
- Autenticar as conexões e verificar o vínculo do usuário com a conta antes de associá-lo aos avisos; tratar bloqueio ou revogação de acesso.
- Ao receber o evento, exibir o aviso e atualizar o saldo e o extrato. Tratar reconexão e sincronização de dados perdidos enquanto a página estava desconectada.
- A conexão com a página aberta não substitui notificações push para navegador fechado. Se houver múltiplas instâncias do backend, avaliar como distribuir eventos entre elas.
- Implementar e testar apenas quando o usuário pedir; preservar os dados e as regras de acesso existentes.
