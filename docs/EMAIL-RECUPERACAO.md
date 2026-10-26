# Recuperação de palavra-passe por email

No login, o utilizador pode mostrar/ocultar a palavra-passe. Com o email preenchido, «Esqueci-me da palavra-passe» pede o envio diretamente para esse endereço. Sem email preenchido, abre o formulário de recuperação. Só as contas ativas recebem o link, mas a resposta pública é igual para qualquer endereço.

O email contém um link de uso único, válido durante 20 minutos, para definir e confirmar uma nova palavra-passe de pelo menos 12 caracteres. Após a reposição é necessário entrar novamente e as sessões anteriores deixam de ser válidas. A palavra-passe antiga nunca é enviada por email. Um novo pedido substitui o link anterior.

## Ativar o envio na Vercel

O SMTP foi configurado em produção em 26 de outubro de 2026, no projeto Vercel `roadmesh-api`. A palavra-passe foi introduzida pelo proprietário diretamente na Vercel como Secret e não foi copiada para o código ou para ficheiros locais. Esta aplicação usa contas próprias RoadMesh: configurar apenas os emails do Supabase Auth não ativa este transporte.

No projeto **roadmesh-api**, adicionar as variáveis em Environment Variables, no ambiente Production:

```dotenv
PASSWORD_RESET_URL=https://roadmesh-app-frontend.vercel.app/reset-password
SMTP_HOST=webdomain02.dnscpanel.com
SMTP_PORT=465
SMTP_USERNAME=geral@raro-solutions.pt
SMTP_PASSWORD=<palavra-passe da caixa, guardada apenas como Secret na Vercel>
SMTP_FROM=RoadMesh <geral@raro-solutions.pt>
```

Usar a porta indicada pelo fornecedor: 587 ativa STARTTLS; 465 usa TLS desde o início. Configurar a verificação do remetente/domínio conforme o fornecedor. Guardar as credenciais apenas na Vercel ou num .env privado, nunca no Git.

O nome `webdomain02.dnscpanel.com` foi confirmado por DNS, resposta SMTP e certificado TLS válido na porta 465. O alias `mail.raro-solutions.pt` não correspondia ao certificado apresentado; foi utilizado o nome canónico, mantendo a validação do certificado ativa. `SMTP_PASSWORD` é a credencial da caixa de correio, não a palavra-passe da conta RoadMesh.

Publicar o código de frontend e backend e voltar a fazer deploy do backend depois de guardar as variáveis. Para Preview/Staging usar remetente e base de testes próprios e uma PASSWORD_RESET_URL correspondente a esse frontend.

## Confirmar o funcionamento real

1. Usar uma conta de teste autorizada e escrever o seu email no login.
2. Clicar em «Esqueci-me da palavra-passe» e verificar a caixa de entrada e o spam.
3. Abrir o link no email, definir e confirmar uma palavra-passe com pelo menos 12 caracteres.
4. Entrar com a nova palavra-passe; confirmar que a anterior já não permite entrar e que o link usado não pode ser reutilizado.

Sem SMTP configurado, ou se o fornecedor recusar o envio, a mensagem genérica da interface não confirma entrega. Os logs do backend indicam password_recovery_delivery_unconfigured ou password_recovery_delivery_failed, sem expor endereços, links ou credenciais.

## Validação desta alteração

Na implementação original, sete testes backend aprovaram ligação SMTP simulada com TLS/STARTTLS, destinatário e URL, configuração inválida e integração PostgreSQL com expiração, uso único e invalidação de sessão. Os testes originais não comprovavam entrega real.

Em 26/10, a API foi republicada em produção com as seis variáveis SMTP/recuperação. Foi enviado, com autorização explícita, um único pedido de recuperação para `geral@raro-solutions.pt`. A API devolveu HTTP 200 e o registo de recuperação permaneceu válido após o pedido terminar; no fluxo implementado, uma falha SMTP remove esse registo. Isto confirma aceitação SMTP inferida a partir da conclusão do envio, mas não comprova chegada à caixa de entrada. O destinatário confirmou a chegada à caixa de entrada em 26/10/2026, concluindo a validação real da entrega. A palavra-passe RoadMesh não foi alterada e o link não foi aberto pelo agente.

Publicação: `E5WCdDjeCBGtejG72Rtc9pCjS64C`, código `ffbafa0acb403acd78600597e0517a01489c3dca`. Evidência sem credenciais ou tokens em [smtp-20261026.json](evidencias/smtp-20261026.json).
