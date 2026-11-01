# Integração da administração e livro de avenças

Atualizado em 1 de novembro de 2026. Alterações preparadas sobre `digo`, commit de origem `5c11d34b4cd9356bd3d9063569eeac546f4f6e0a`. Alterações guardadas na branch `codex/digo-integracao-segura`, [PR #8](https://github.com/Rodr1goVaZ/RoadMesh-App/pull/8). Não considerar esta preparação uma publicação em produção.

## Correções incluídas

- As faturas copiam apenas a identidade pública da empresa, através de `domain/company_documents.py`. Condições comerciais da RoadMesh e metadados internos ficam fora do documento.
- Desativar e arquivar exige motivo no servidor, incluindo o DELETE legado. Mudança de estado, revogação de sessões e auditoria são transacionais.
- Comparações da administração usam a data de criação das empresas em cada período, incluindo os períodos anteriores.
- Pagamentos e assistência passam a ter movimentos individuais com data, referência, descrição, ator e identificação de reenvio. Pagamentos incluem método. Estornos preservam o original e só podem ser feitos uma vez e pelo valor integral.
- A API rejeita pagamentos acima do valor em dívida, totais negativos, reversões de outra empresa/período e tentativas de substituir os totais de recebimentos/assistência já existentes.
- O formulário mensal permite configurar o valor faturado e as horas incluídas; os recebimentos e horas utilizados são calculados a partir dos movimentos. O histórico está no mesmo editor, tanto no dashboard como na ficha da empresa.

## Dados e migração 006

Para estas alterações completas passa a ser obrigatória `backend/sql/006_platform_service_ledger.sql`, aplicada depois do esquema 5. Acrescenta duas tabelas, sem eliminar nem substituir as existentes:

| Tabela | Finalidade |
|---|---|
| `roadmesh.platform_service_periods` | Identidade única empresa/período |
| `roadmesh.platform_service_movements` | Aberturas, ajustes de faturação, pagamentos, assistência e estornos |

As tabelas têm FKs, RLS, unicidade e controlo de valores. Os papéis públicos do Supabase continuam sem acesso. O papel opcional `roadmesh_runtime` recebe apenas SELECT/INSERT nas tabelas novas; não se concede esse papel a nenhum utilizador. Triggers impedem UPDATE/DELETE nas tabelas novas e em `admin_support_audit`.

`workshops.metadata.platform_service_months` mantém uma projeção dos totais para compatibilidade com os ecrãs existentes. As escritas da API atualizam movimentos, projeção e auditoria na mesma transação. A projeção não deve ser editada manualmente por SQL.

Os valores mensais anteriores não desaparecem. Na primeira escrita do mês, a API cria uma abertura única para cada total anterior. Recebimentos e assistência anteriores ficam identificados como saldos de abertura com data original desconhecida; não se inventam datas de pagamentos ou de serviços. Aberturas de recebimento/assistência podem ser estornadas explicitamente. Não há migração automática de uma suposta caixa de recebimentos a partir do mês de faturação.

Os valores de avenças continuam independentes da faturação das oficinas e não emitem documentos fiscais. Data do movimento e período da avença são campos distintos; a dashboard mantém a análise por período de faturação. Um relatório de caixa por data efetiva não faz parte deste ecrã.

## Publicação

1. Guardar e verificar um backup privado consistente do ambiente a migrar. Os scripts de backup/restauro suportam os esquemas 2, 3, 5 e 6 e recusam listas incompletas de tabelas.
2. Validar primeiro no projeto de testes confirmado. Não substituir a URI por uma base arbitrária nem fazer concessões adicionais de papéis para contornar um teste.
3. Aplicar a 006 uma única vez, como uma transação. O ficheiro exige explicitamente esquema 5 e termina com esquema 6. Não reaplicar 001–005 nem reaplicar 006 se a versão já é 6.
4. Confirmar 32 tabelas, RLS nas novas tabelas, restrições, contagens das tabelas antigas e acesso do administrador. Não divulgar snapshots ou credenciais no repositório.
5. Publicar a API compatível com 006 e depois o frontend. Manter as raízes Vercel `backend` e `frontend`, as credenciais e a configuração SMTP existentes.
6. Testar: empresa antiga, criação/edição, rascunho, logótipo, desativação/arquivo com motivo, emissão de documento, pagamento, reenvio do mesmo pagamento, assistência e estorno.

Não publicar esta API sobre uma base ainda no esquema 5: o arranque recusa a falta das tabelas novas. Não desativar esta verificação.

## Recuperação

O esquema é aditivo e os dados antigos ficam preservados. Não apagar tabelas nem desativar triggers como forma de rollback. Depois de existirem movimentos novos, uma versão que volte a editar os totais diretamente é incompatível com a consistência do livro; nesse caso, suspender escritas e recuperar uma versão compatível ou corrigir em frente. Um restauro completo deve usar um backup verificado e considerar os movimentos criados depois do backup.

## Evidência desta preparação

- Suite PostgreSQL descartável: 196 aprovados, 2 ignorados.
- Suite MongoDB descartável: 182 aprovados, 16 ignorados, incluindo os testes exclusivos PostgreSQL.
- Frontend: 46 testes, TypeScript, ESLint e exportação web aprovados.
- Um snapshot privado de produção com 30 tabelas e 545 registos foi restaurado localmente e comparado linha a linha. A 006 foi depois aplicada nessa cópia descartável, preservando as contagens existentes e produzindo 32 tabelas.
- Nenhum dado da produção foi alterado por esta verificação. O snapshot não inclui os bytes das fotografias guardadas no Storage.
- O resultado não certifica dispositivos físicos nem concorrência de múltiplos processos reais no Supabase. A validação remota usa exclusivamente o projeto de testes confirmado.

## Validação remota em 1 de novembro de 2026

O projeto de testes confirmado, `deozdqnodbmqehkytzms`, agora chama-se RoadMesh-Backup. Após terminar o arranque, foi criada uma cópia privada consistente de 30 tabelas/2527 registos, verificada por restauro local e comparação integral. A migração 006 foi aplicada nesse projeto e confirmou 32 tabelas. Não houve alteração da produção.

A suite remota foi autorizada especificamente no RoadMesh-Backup. O harness mantém a sessão técnica ativa também quando um processo fica temporariamente sem pedidos administrativos. Não altera os prazos da aplicação, não volta a fazer login para ocultar revogações e encerra a renovação no fim da suite. A execução final terminou com 194 testes aprovados, 3 ignorados e zero falhas (23 min 46 s). O teste que exige assumir `roadmesh_runtime` foi excluído, conforme a decisão anterior do proprietário; não houve concessão desse papel ao postgres. Não se concedeu o papel runtime ao postgres.

O ensaio local de transição confirmou a API anterior no esquema 5, a aplicação da 006 com a API antiga ativa, a leitura da empresa existente pela nova API e um pagamento novo; o dashboard anterior continuou acessível. A interface Safari foi exercitada com dados fictícios locais: criação do mês e pagamento individual de 25,50 €, refletido no histórico e no total recebido. Não equivale a teste em dispositivos móveis físicos.

O arranque Windows foi revisto no código; não foi executado neste Mac. O script Windows pressupõe um ambiente Python local já preparado em `.demo/venv`, Node.js e MongoDB disponíveis. Não se apresenta como um instalador independente para uma máquina Windows vazia.

## Conclusão da revisão para main

O código passou a validação local e a suite completa no Supabase real de testes. O PR não tem conflitos com a main na revisão efetuada. As compilações Vercel da API e do frontend passaram; isto comprova a compilação de preview e não a publicação em produção. Os ficheiros do commit de implementação foram comparados por hash com os testados e coincidem.

A integração fica condicionada à aplicação da migração 006 na produção, atualmente no esquema 5, com uma cópia recuperável atualizada. Manter o PR em rascunho até concluir esse passo. A main, a base de produção e a conta RaRo não foram migradas/publicadas por esta entrega.
