# Recuperação de palavra-passe por email

No login, o utilizador pode mostrar/ocultar a palavra-passe. Com o email preenchido, «Esqueci-me da palavra-passe» pede o envio diretamente para esse endereço. Sem email preenchido, abre o formulário de recuperação. Só as contas ativas recebem o link, mas a resposta pública é igual para qualquer endereço.

O email contém um link de uso único, válido durante 20 minutos, para definir e confirmar uma nova palavra-passe de pelo menos 12 caracteres. Após a reposição é necessário entrar novamente e as sessões anteriores deixam de ser válidas. A palavra-passe antiga nunca é enviada por email. Um novo pedido substitui o link anterior.

## Ativar o envio na Vercel

O transporte SMTP já está implementado no backend. É necessário um serviço de envio com remetente autorizado; não foi contratado ou configurado um fornecedor nesta alteração. Os ficheiros privados locais consultados ainda não contêm estes valores. Esta aplicação usa contas próprias RoadMesh: configurar apenas os emails do Supabase Auth não ativa este transporte.

No projeto **roadmesh-api**, adicionar as variáveis em Environment Variables, no ambiente Production:

```dotenv
PASSWORD_RESET_URL=https://roadmesh-app-frontend.vercel.app/reset-password
SMTP_HOST=<servidor indicado pelo fornecedor>
SMTP_PORT=587
SMTP_USERNAME=<utilizador SMTP>
SMTP_PASSWORD=<credencial SMTP>
SMTP_FROM=RoadMesh <endereco-remetente-autorizado>
```

Usar a porta indicada pelo fornecedor: 587 ativa STARTTLS; 465 usa TLS desde o início. Configurar a verificação do remetente/domínio conforme o fornecedor. Guardar as credenciais apenas na Vercel ou num .env privado, nunca no Git.

Publicar o código de frontend e backend e voltar a fazer deploy do backend depois de guardar as variáveis. Para Preview/Staging usar remetente e base de testes próprios e uma PASSWORD_RESET_URL correspondente a esse frontend.

## Confirmar o funcionamento real

1. Usar uma conta de teste autorizada e escrever o seu email no login.
2. Clicar em «Esqueci-me da palavra-passe» e verificar a caixa de entrada e o spam.
3. Abrir o link no email, definir e confirmar uma palavra-passe com pelo menos 12 caracteres.
4. Entrar com a nova palavra-passe; confirmar que a anterior já não permite entrar e que o link usado não pode ser reutilizado.

Sem SMTP configurado, ou se o fornecedor recusar o envio, a mensagem genérica da interface não confirma entrega. Os logs do backend indicam password_recovery_delivery_unconfigured ou password_recovery_delivery_failed, sem expor endereços, links ou credenciais.

## Validação desta alteração

Sete testes backend aprovados: ligação SMTP simulada com TLS/STARTTLS, destinatário e URL, configuração inválida e integração PostgreSQL com expiração, uso único e invalidação de sessão. Nove testes frontend de API/sessão aprovados, incluindo recuperação independente de uma sessão expirada. O transporte simulado não comprova entrega num fornecedor real. Interface de mostrar/ocultar e pedido pelo email preenchido verificados na demonstração local. Não houve envio de emails reais nem alteração das contas de produção nesta implementação.
