# RoadMesh — módulos Oficina e Stand

Implementação de 24/10/2026. Código desenvolvido na aplicação existente, na branch de trabalho, sem outro projeto, sistema de login ou novas dependências. Não foi aplicada qualquer migração na produção ou no Supabase de staging nesta etapa.

## Análise e solução adotada

| Área existente | Implementação encontrada | Evolução |
|---|---|---|
| Empresas | `workshops`, administração em `admin_routes.py` | Mantida a chave de empresa `workshop_id`; acrescentado `modules` |
| Autenticação | JWT, contas próprias `users`, login único em `access_control.py` | Mesmo login, token e sessão nos dois módulos |
| Permissões | Admin global, gerente, funcionário e cliente; suporte temporário | Contexto da empresa separado das dependências Oficina e Stand |
| Dados | PostgreSQL via repositório compatível com Motor, e MongoDB para testes locais | Migração SQL aditiva e índices equivalentes em MongoDB |
| Navegação | Expo Router, grupos admin/app/portal; cabeçalho e navegação comuns | Novo grupo `(stand)` e botão contextual de alternância |
| Componentes | AreaPage, Panel, Input, Button, SearchPicker, DashboardHero/Metrics | Reutilizados, sem substituir a interface da Oficina |

Uma empresa mantém um único registo em `workshops`. O nome técnico não foi alterado para evitar reescrever relações, histórico e permissões existentes. O papel técnico `workshop_staff` continua a identificar a equipa da empresa, inclusive numa empresa exclusivamente Stand.

## Configuração e navegação

Na criação ou edição de uma empresa pela administração estão disponíveis **Oficina**, **Stand** e **Oficina + Stand**. Apenas o administrador global pode configurar os módulos. As empresas existentes passam a Oficina por omissão. Uma edição feita por um cliente antigo da API que não envie o campo `modules` preserva a configuração existente.

| Configuração | Entrada da equipa | Alternância |
|---|---|---|
| Oficina | Início da Oficina | Não aparece |
| Stand | Painel do Stand | Não aparece |
| Oficina + Stand | Início da Oficina | Stand / Oficina, sem novo login |

A Oficina conserva Início, Serviço, Clientes, Stock e Mais. O Stand apresenta Início, Viaturas, Clientes, Vendas e Mais. O botão destacado fica junto da navegação inferior em mobile e na zona de navegação superior em tablet/desktop. O cabeçalho identifica explicitamente a área atual. O modo de suporte continua a mostrar o aviso e a ação de saída; entra no módulo adequado à empresa.

## Funcionalidades implementadas

- Painel do Stand: disponíveis, reservadas, vendidas, contactos em aberto, total de vendas e margem bruta para o responsável.
- Inventário: criação, pesquisa, consulta e edição de matrícula, marca, modelo, ano, VIN, quilometragem, combustível, descrição, preço de compra e preço anunciado. Estados disponível, reservado e retirado; vendido resulta do registo de venda.
- Clientes comuns: pesquisa, criação e edição através da API já existente. Um contacto comercial usa um cliente existente, uma viatura opcional, notas e estado novo/contactado/interessado/fechado. Os contactos podem ser atualizados.
- Vendas: escolha de viatura e comprador, valor, notas, revisão e confirmação. A operação é transacional e idempotente. Pedidos concorrentes não criam duas vendas para a mesma viatura.
- Histórico: vendas imutáveis com identificação e valores preservados, e auditoria de criação/alteração de viaturas e contactos.
- Integração: uma venda associa a viatura ao comprador nos registos comuns; a mesma viatura pode ser usada numa ordem de serviço quando a empresa também tem Oficina. Matrículas normalizadas e seleção de clientes existentes evitam duplicações.

Os valores são registos de gestão. A margem bruta é venda menos custo de compra e não inclui impostos, despesas ou comissões. Não foi acrescentada emissão fiscal específica do Stand, cobrança de pagamentos, devoluções ou integração contabilística externa.

## Permissões e isolamento

O backend valida sessão, empresa e módulo em cada pedido. Alterar diretamente URLs ou pedidos não ativa módulos. A desativação de um módulo bloqueia imediatamente a API mesmo com um token ainda válido; a configuração visível é atualizada ao carregar a sessão. O botão de alternância não altera credenciais nem cria outra sessão.

Os funcionários podem consultar o inventário e acompanhar contactos, mas não alterar preços/inventário, registar vendas, consultar custos de compra, totais financeiros ou histórico global do Stand. Estas restrições existem também na API. O responsável mantém essas operações. Contas de cliente não têm acesso à gestão Stand. A área de cliente existente continua associada à Oficina.

Todas as consultas e alterações usam `workshop_id`. As novas tabelas PostgreSQL têm chaves estrangeiras compostas que impedem ligar clientes ou viaturas de outra empresa. O esquema permanece privado, com RLS e sem acesso dos papéis públicos do Supabase. Não foi concedida ao utilizador `postgres` a capacidade de assumir `roadmesh_runtime`.

Uma proteção adicional foi mantida após a revisão automática: o acesso a cada módulo, incluindo suporte, exige empresa ativa. Uma empresa inativa pode ser gerida no painel administrativo, mas precisa de ser reativada antes da entrada no módulo.

## Base de dados e publicação

Migração: `backend/sql/005_company_modules_stand.sql`, após 001, 002 e 003. A migração 004 de papel runtime continua opcional. A migração 005:

1. Acrescenta `workshops.modules` com validação das três combinações e omissão Oficina.
2. Cria `stand_inventory`, `stand_leads` e `stand_sales`, mantendo clientes, utilizadores e viaturas nas tabelas comuns.
3. Acrescenta unicidade de matrícula no inventário, uma venda por viatura e chave de idempotência por empresa.
4. Impede UPDATE/DELETE das vendas por trigger e mantém índices, RLS e privilégios privados.
5. Identifica o esquema como versão 5, com 30 tabelas. Não elimina nem funde registos anteriores.

**Não publicar o novo backend contra uma base ainda na versão 3.** A inicialização exige as novas tabelas e apresenta indicação da migração em falta.

Sequência de publicação:

1. Rever o código e guardar um backup atual e recuperável da base e dos ficheiros de media.
2. Validar a migração 005 na cópia Supabase de testes; nesta etapa só foi executada em PostgreSQL local descartável.
3. Com autorização para a produção, aplicar a mesma migração antes de publicar o novo backend. A migração aditiva deixa Oficina por omissão e não ativa Stand automaticamente em empresas reais.
4. Publicar backend e depois frontend a partir da mesma versão da branch. Confirmar login, módulos e permissões com contas autorizadas.
5. Ativar os módulos pretendidos na administração e confirmar os três cenários.

Os scripts de inventário/backup em leitura reconhecem os esquemas antigo e novo. O verificador de restauro foi adaptado para snapshots de versão 3 e 5. Restaurar uma versão antiga não equivale a desfazer uma atualização depois de existirem novas vendas; é necessária revisão dos dados criados entretanto.

## Validação

Resultados finais: PostgreSQL 126 aprovados / 2 excluídos; MongoDB 115 aprovados / 13 excluídos; Node 17 aprovados. TypeScript, ESLint e exportação web aprovados. Os resultados finais e as verificações visuais estão resumidos em `docs/evidencias/modulos-stand.json`. Os testes exercitam empresas Oficina, Stand e ambas, compatibilidade com pedidos antigos, revogação de módulo, isolamento, matrículas duplicadas, funcionários, idempotência, vendas simultâneas, associação a serviços, imutabilidade SQL e restauro integral de um snapshot de 30 tabelas.

Foi também executada a regressão da Oficina e do portal, TypeScript, ESLint, exportação web e testes Node de módulos/sessão/API/preços. O motor PGlite valida o contrato PostgreSQL, mas não certifica todos os comportamentos de concorrência de um servidor PostgreSQL/Supabase real; os dois testes de injeção de falhas MongoDB são excluídos da execução PostgreSQL e os 13 testes SQL são excluídos da execução MongoDB, com indicação do motivo.

Na demonstração local foram preparados exemplos fictícios Oficina, Stand e Oficina + Stand. Nenhum dado ou configuração da produção foi usado para estes exemplos. Os perfis fictícios e a base local não são contas da Vercel.

## Ficheiros criados

- `backend/company_modules.py`
- `backend/stand_routes.py`
- `backend/sql/005_company_modules_stand.sql`
- `backend/tests/test_company_stand.py`
- `frontend/src/company-modules.ts`
- `frontend/src/workspace/ModuleSwitch.tsx`
- `frontend/src/stand/StandScreens.tsx`
- `frontend/app/(stand)/_layout.tsx` e sete rotas `stand-inicio`, `stand-viaturas`, `stand-viatura`, `stand-clientes`, `stand-vendas`, `stand-historico`, `stand-mais`
- `frontend/scripts/modules.test.cjs`
- Este documento e `docs/evidencias/modulos-stand.json`

## Ficheiros modificados

- Backend: `access_control.py`, `admin_routes.py`, `server.py`, `postgres_database.py`, `database_integrity.py`.
- Testes: `backend/tests/run_postgres.py`, `backend/tests/test_postgres.py`.
- Frontend: `src/auth.tsx`, `src/components/RelationPicker.tsx`, `app/(app)/_layout.tsx`; administração `_layout.tsx`, `dashboard.tsx`, `workshops.tsx`, `workshop.tsx`, `workshop-form.tsx`.
- Operação: `scripts/backup_staging.py`, `scripts/check_production_readonly.py`, `scripts/run_staging.py`, `scripts/verify_staging_backup.py`.
- Documentação: `README.md`, `docs/PROJETO.md`, `docs/ALTERACOES.md`.

As alterações de ícones, limpeza `.emergent` e recuperação de palavra-passe anteriores foram preservadas; não pertencem à implementação deste módulo.

## Limites e pendências

- Migração, backup atual, ensaio remoto em Supabase e deployment de produção ainda não executados nesta etapa.
- Testes físicos em dispositivos e ensaio de concorrência num PostgreSQL remoto real não efetuados.
- Uma viatura já associada a outro cliente não muda de titular automaticamente através da venda; o pedido é bloqueado para preservar histórico e privacidade. A transferência de titularidade com histórico exige tratamento próprio, fora desta primeira versão.
- As listagens têm limite de 1.000 registos por pedido; o inventário dispõe de pesquisa e filtros. Paginação adicional de grandes históricos poderá ser acrescentada posteriormente. Os indicadores financeiros agregam todos os registos da empresa.
- Uma viatura vendida e o respetivo registo financeiro não são reabertos por edição do inventário. Devoluções e correções de vendas exigem um fluxo próprio futuro, preservando o histórico.
