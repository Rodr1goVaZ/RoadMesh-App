# Continuação da publicação — RoadMesh

Atualizado em 20/10/2026. A produção permanece intacta.

## O que ficou validado nesta continuação

Foi usado o backup privado fornecido (22 tabelas, 406 registos) numa base descartável local:

1. Restauro integral, com comparação de linhas.
2. A migração 003, com os duplicados existentes, falhou e reverteu todas as alterações.
3. O cliente mais antigo tem uma viatura; o segundo não tem relações diretas nem referências em metadados de outros registos. Os dados pessoais são iguais; só diferem identificadores, datas e uma revisão técnica de referências.
4. Na cópia, foi conservado o primeiro e removido o segundo, com a linha completa preservada na auditoria. Não houve transferência de viatura, alteração de conta ou documento. Foi testado o rollback desta operação.
5. Aplicação de 003 e 004: 27 tabelas; contagens anteriores preservadas, exceto menos um cliente e mais uma entrada de auditoria.
6. Exportação privada das 27 tabelas; restauro novamente numa base vazia e comparação integral de todas as linhas.

[Evidência sem dados pessoais](evidencias/ensaio-migracao.json).

O SQL concreto de resolução está em `.demo/migration-review/resolver-cliente-revisao.sql`, privado e ignorado pelo Git. Recusa executar se os dados tiverem mudado, se aparecerem referências ao segundo cliente ou se não existir um administrador executor identificado. Não executar diretamente em produção sem revisão atual e aprovação. O backup original não foi alterado.

O novo snapshot local privado está em `.demo/migration-review/local-version3.json`. É resultado do ensaio, não um backup atual da produção. Não publicar, importar para o frontend nem enviar ao Git.

## Base Supabase separada — intervenção necessária do titular

O utilizador confirmou que ainda não existe base de testes. Não foi contratada uma funcionalidade paga nem criado novo projeto automaticamente. O formulário ficou preparado no Safari com nome `RoadMesh-Testes`, região Europe e Data API desativada (a aplicação consulta PostgreSQL pela API própria). A palavra-passe e a confirmação de criação ficam a cargo do titular, conforme a regra de segurança do controlo do navegador para novas credenciais.

1. Na organização Supabase atual, escolher **New project**.
2. Nome: `RoadMesh-Testes`; organização pretendida; região europeia próxima da produção.
3. O titular define e guarda a palavra-passe da nova base. Confirmar o plano/custo mostrado antes de criar. Não enviar a palavra-passe no chat.
4. Depois da criação, em **Connect**, copiar a URI da base de testes e guardar em `backend/.env.staging.local` como `STAGING_DATABASE_URL`. Este ficheiro fica ignorado pelo Git. Não reutilizar a URI de produção.
5. Avisar que a base está criada. Antes de escrever, confirmar o identificador do novo projeto, que difere do projeto de produção.

A documentação oficial prevê [ambientes separados](https://supabase.com/docs/guides/deployment/managing-environments) e [branches isoladas](https://supabase.com/docs/guides/deployment/branching). Branching e restauro para novo projeto têm condições próprias; não ativar opções pagas sem rever o custo. Uma branch sem dados não substitui o ensaio com cópia restaurada.

Para começar testes funcionais na nova base vazia, aplicar 001, 002, 003 e opcionalmente 004 e criar apenas contas fictícias. Para validar a migração dos dados reais, é necessária uma cópia atual privada e a resolução revista; não confundir os dois testes. Não enviar emails a clientes reais nem reutilizar credenciais/SMTP de produção no ambiente de testes.

## Ordem restante

- Confirmar resolução do cliente redundante sobre o estado atual e novo backup.
- Validar PostgreSQL/pooler reais na base de testes e a migração sobre cópia atual.
- Configurar e testar bucket privado e isolamento das fotografias.
- Recuperação por email: procedimento documentado em PROJETO.md, conforme decisão de ainda não contratar serviço.
- Efetuar os testes num iPhone/Safari/PWA e com leitor físico; não podem ser certificados por uma emulação no computador.
- Rever os dois alertas das ferramentas Expo/Metro; não existe correção indicada na auditoria efetuada.
- Só então publicar migração/backend/frontend na ordem de PROJETO.md e rever os logs.

Não foi feito commit/push que dispare deployment automático, nem alteração de ambiente na Vercel nesta continuação.

## 21/10/2026 — projeto de testes criado

O utilizador criou `RoadMesh-Testes`, identificado no painel como projeto separado de produção. Na verificação estava em `Coming up…`, com Connect e SQL Editor indisponíveis. O ficheiro privado `backend/.env.staging.local` foi criado com permissões 600; falta a palavra-passe e a URI do painel. O utilizador pediu ajuda para o preencher. A palavra-passe pode ser colocada separadamente em `STAGING_DATABASE_PASSWORD`; o verificador substitui o placeholder com codificação URI, sem imprimir o segredo.

`scripts/check_staging_connection.py` só aceita o projeto de testes confirmado, força TLS e transações apenas de leitura, e recusa a produção. Ainda não houve ligação ou migração remota. Não confundir projeto criado com base pronta ou esquema instalado.

## 21/10/2026 — ligação e esquema reais

A ligação direta não resolveu nesta rede. Foi copiada do painel a ligação Session pooler (porta 5432), mantendo a palavra-passe apenas no ficheiro privado. A ligação TLS foi confirmada; o verificador executa explicitamente `SET TRANSACTION READ ONLY`, pois a opção de sessão enviada na conexão não foi aplicada pelo pooler.

A base inicialmente tinha zero tabelas RoadMesh. As migrações 001–004 foram aplicadas numa transação e foram confirmadas 27 tabelas. Não foi alterado o projeto de produção. A suite de regressão está a ser executada contra o PostgreSQL real, através de uma API local, com dados fictícios. O armazenamento dessa suite continua local; não certifica ainda o Supabase Storage.

Para repetir: `python scripts/check_staging_connection.py` apenas lê; `python scripts/run_staging.py --run-tests` cria dados de teste na base confirmada. `--initialize-empty` recusa substituir um esquema existente. Os testes SQL só aceitam este projeto remoto quando a flag explícita de staging está definida pelo runner. Credenciais fictícias de teste ficam privadas em `.demo/`, nunca no relatório.

### Decisão sobre permissões no staging

Na primeira suite remota passaram 31 testes e foram omitidos 2 antes de a execução parar por uma falha de preparação: `postgres` não tinha autorização para `SET ROLE roadmesh_runtime`. A revisão automática bloqueou a proposta de conceder esse acesso e o utilizador **não autorizou a concessão**. Não foi concedida membership nem assumido o papel por outro meio.

A consulta de leitura do catálogo confirmou que o utilizador continua sem SET ROLE e que `roadmesh_runtime` tem SELECT/INSERT, mas não UPDATE/DELETE em `financial_movements`, `order_receipts` e `admin_support_audit`. Isto verifica a configuração declarada, não substitui uma sessão real sob esse papel. A repetição usa a opção explícita `--without-role-switch`, reportando o teste de mudança de papel como não selecionado. Não se apresenta a suite remota como validação integral desse papel.

### Fotografias — autorização e configuração no staging

O utilizador autorizou especificamente a criação de `roadmesh-media` no RoadMesh-Testes e o uso da chave de servidor existente, apenas no ficheiro privado do backend, para uma imagem fictícia. O bucket foi criado; consulta de leitura confirmou `public=false`, limite de 10485760 bytes e MIME `image/jpeg`. Nenhuma permissão pública foi adicionada. O teste de envio/leitura real será registado separadamente quando terminar. A produção permanece sem alterações.

## Resultado da validação remota

97 testes aprovados, 2 omitidos por serem exclusivos de MongoDB; o teste de SET ROLE foi excluído conforme decisão do titular. Não houve concessão de membership. O pooler de sessão TLS e o esquema de 27 tabelas ficaram validados. O backup privado `.demo/backups/staging-20261021T080540Z/snapshot.json` contém 1 358 registos e foi restaurado e comparado integralmente numa base local vazia. A imagem privada real passou o teste de transporte; testes adicionais da API estão a terminar.

A produção permanece intacta. Antes de publicar: backup atualizado da produção, revisão/aprovação concreta da resolução do cliente redundante, migração nessa cópia atual e plano de publicação. A configuração validada aqui pertence exclusivamente ao projeto RoadMesh-Testes. Não copiar a URI/chave de testes para o ambiente de produção.

### Fotografias pela API — concluído em 21/10

Passaram **3 testes adicionais** com PostgreSQL e Supabase Storage reais: upload/download autenticado, recusa de leitura por outra oficina e ficheiros inválidos/demasiado grandes. Foram usados dados e imagens fictícios. A chave service_role existente foi copiada pelo utilizador diretamente para o ficheiro privado do backend e não foi impressa nem guardada num ficheiro temporário. A produção não foi alterada.

## Próximo passo preparado: backup atual da produção

Foi criado o ficheiro privado `backend/.env.production.local`, com `PRODUCTION_DATABASE_URL` vazio e identificador esperado do projeto original. A aplicação não carrega esse ficheiro automaticamente. O titular deverá copiar a URI existente do backend de produção na Vercel, sem a enviar no chat.

`scripts/check_production_readonly.py` recusa outro projeto e força uma transação REPEATABLE READ / READ ONLY. A opção `--backup` guarda um snapshot consistente em `.demo/backups/`, sem migrações nem alterações remotas. Não foi executado contra produção porque falta a ligação. As guardas dos dois executores passaram 15 testes unitários. A resolução concreta do duplicado só deve ser aprovada depois de rever esse backup atual.


## 21/10/2026 — backup atual da produção e ensaio concluídos

O titular guardou a URI privada. A produção foi consultada numa transação REPEATABLE READ / READ ONLY. O snapshot privado `.demo/backups/production-readonly-20261021T082517Z/snapshot.json` contém **22 tabelas e 407 registos**, acompanhado de SHA-256. Não foram alterados dados remotos. Este snapshot cobre o esquema RoadMesh; não é um backup global de outros esquemas/configurações Supabase.

A cópia atual foi restaurada e comparada integralmente numa base local vazia. Continua a haver um grupo de dois clientes com o mesmo NIF e identidade na mesma oficina; não foram encontrados conflitos de matrícula, VIN, referência ou código de barras. O ensaio da resolução conserva o cliente com relações e arquiva a linha redundante completa na auditoria antes de a remover apenas na cópia local. Foram verificados rollback, bloqueio atómico da migração perante duplicados e preservação das contagens de todas as outras tabelas originais. A migração local chegou às 27 tabelas e o snapshot resultante também foi restaurado e comparado.

Evidência pública sem dados pessoais: `docs/evidencias/ensaio-producao-atual.json`. O plano específico com os identificadores e impressões completas dos registos está apenas em `.demo/migration-review/production-20261021T082517Z/`; aborta se os clientes tiverem mudado ou surgirem referências ao redundante. **A execução dessa remoção na produção continua pendente de aprovação explícita.** Nenhuma migração, concessão de papel, commit, push ou publicação foi executada neste passo.


## 21/10/2026 — autorização e aplicação na produção

O titular esclareceu que os dados são de testes e autorizou a continuação, dando prioridade ao acesso admin. Foi feito outro backup consistente sob bloqueio antes das escritas. A resolução específica do único cliente redundante e a migração 003 foram aplicadas na mesma transação SERIALIZABLE; a linha removida ficou integralmente na auditoria. Foram confirmadas 27 tabelas e as contagens das tabelas originais, incluindo as alterações esperadas de cliente/auditoria. A migração opcional 004 não foi aplicada; nenhuma membership nem acesso SET ROLE foi concedido. Evidência: `evidencias/migracao-producao.json`.

### Conta de administrador pronta

Foi mantida a conta existente `geral@raro-solutions.pt`, sem criar outra conta nem ampliar permissões. A palavra-passe foi renovada, as sessões anteriores invalidadas e a alteração de palavra-passe foi validada pela API publicada. A credencial final está apenas no ficheiro privado `.demo/ACESSO-ADMIN.txt`, com permissões 600 e excluído do Git. Não foi copiada para documentação, logs ou chat.

Na API publicada `https://roadmesh-api.vercel.app/api`, passaram login admin, alteração de palavra-passe, identificação, dashboard e consulta de oficinas. As sessões criadas para esses testes terminaram. Página de acesso: `https://roadmesh-app-frontend.vercel.app/admin-login`. Evidência sem segredos: `evidencias/acesso-admin.json`.

A base está na versão 3 e a conta admin está utilizável na aplicação já publicada. **O código novo da branch de auditoria ainda não teve commit/push/deploy**; o acesso validado não significa que as novas funcionalidades da branch já estejam publicadas. SMTP, testes em dispositivos físicos e configuração de media da produção continuam sujeitos aos limites documentados. O bucket validado continua a pertencer exclusivamente ao RoadMesh-Testes.
