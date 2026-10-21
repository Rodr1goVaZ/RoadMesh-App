# RoadMesh — relatório das alterações e validação

**Data:** 20 de outubro de 2026. **Branch:** `codex/roadmesh-auditoria-melhorias`. **Base:** `8a55d9d`.

Esta entrega contém alterações locais, testes e documentação. Não foi feito commit, push, deployment nem migração em produção. A versão publicada na Vercel continua a ser a anterior. A documentação de utilização, arquitetura, instalação, email, fotografias e publicação encontra-se em [PROJETO.md](PROJETO.md).

## 1. Resultado e limites

Foram implementados os módulos pedidos de permissões, configurações, fornecedores, margens, rascunhos/reposição, receção parcial, livro financeiro, seleção por modal, históricos anuais, navegação, recuperação e identidade RoadMesh. Os percursos principais passaram os testes automáticos e uma revisão no navegador com dados fictícios.

**A publicação ainda depende da revisão dos dois clientes duplicados sobre uma cópia atual da produção, da configuração de produção e dos testes físicos. A base Supabase separada e o armazenamento privado já foram validados em testes em 21/10.** Não se apresenta a aplicação como certificada fiscalmente, sem riscos de segurança ou validada em todos os iPhones. A recuperação por email foi implementada; por decisão do utilizador, o serviço SMTP fica por contratar/configurar e o procedimento está documentado.

## 2. Correspondência com o pedido

| Ponto da prompt | Alteração e evidência | Situação |
|---|---|---|
| 2.1 Fornecedores | Registo normalizado; catálogo filtrado no servidor por fornecedor e stock > 0; teste de associação e revisão no navegador | Implementado. O modelo atual tem um fornecedor por produto; não se inventou relação múltipla |
| 2.2 Voltar | Função comum com fallback, tabs com histórico, filtros de listas preservados em cache por sessão | Percurso Mais → Configurações → Voltar confirmado; Safari/PWA físicos ainda por testar |
| 2.3 Duplicados | Normalização e índices por entidade/oficina, mensagens 409, transações e chaves de repetição; preflight existente | Novos registos protegidos; plano dos dois clientes antigos abaixo |
| 3.1 Arquitetura | Regras em `business_rules`, operações, históricos, recuperação e logging separados; componentes comuns; imports revistos | Alteração incremental; `server.py` legado continua amplo, sem reescrita estética |
| 3.2 Vercel | Logs reais consultados; configuração de armazenamento sem chamada remota no arranque; logging por pedido | Causas observadas documentadas; melhoria em produção só poderá ser medida após publicação |
| 3.3 Segurança | Permissões no servidor, isolamento de oficina, validação monetária, idempotência, tokens de uso único, índices/FKs/RLS, papel SQL opcional e atualização de dependências | Testes aprovados; alertas residuais das ferramentas abaixo |
| 3.4 Desempenho | Históricos paginados, consultas filtradas, cache de 15 s, emissão/listagem sem consultas relacionais por fatura, import direto de ícones | Medições locais abaixo; sem comparação fiável de latência de produção |
| 4.1 Desktop/mobile | Largura de formulários limitada, métricas responsivas, estados de erro/ação, labels acessíveis e foco web visível | Revisão a 1280×900 e 393×852; não equivale a dispositivo físico |
| 4.2 iPhone | Safe areas nos cabeçalhos, tabs e formulários; `viewport-fit=cover`, altura dinâmica e inputs de 16 px | Implementado; Dynamic Island/Safari/instalação requerem teste físico |
| 4.3 Estado e Arquivo | Painel vermelho, títulos brancos e botões com contraste branco e estados distintos | Implementado na administração da oficina |
| 4.4 Nomenclatura | Textos visíveis e PDFs com Ordem de Serviço e Avaliação do Cliente | Pesquisa final sem os termos antigos visíveis; constantes/API internas preservadas |
| 5.1 Preço/hora | Página por oficina; consulta por colaborador e alteração/auditoria por responsável | Persistência e permissões testadas |
| 5.2 Horas | Quantidade de horas, descrição opcional, preço/IVA da oficina, snapshot na linha | Configuração posterior não altera linha/documento anterior; teste e percurso web |
| 6.1 Adicionar à encomenda | Rascunho persistente por fornecedor, linha consolidada, edição/remoção e validação explícita | Testado, incluindo quatro pedidos simultâneos |
| 6.2 Margem | Entrada percentual e preço automático sobre venda, cálculo decimal e arredondamento; alteração direta atualiza margem efetiva | Testes Python/API e Node; exemplo web custo 8 € / margem 25% → 10,67 € |
| 6.3 Stock mínimo | Propostas Por validar, necessidade única por produto, agrupamento por fornecedor e origem registada | Não há envio nem validação automática; testes de repetição/concorrência |
| 6.4 Receção | Identificação por código, confirmação de quantidade parcial, proteção contra excesso/código errado/repetição, histórico | API e navegador aprovados; leitores/câmara físicos por validar |
| 7.1 Eliminação | Colaborador só em Entrada; responsável nos restantes estados; documentos protegidos, snapshot e reposição de stock atómicos | Testes de funções, outra oficina e falha de auditoria |
| 7.2 Reabertura | Responsável validado pelo servidor, histórico de estado/ator/data, proteção de documentos | Testes de pedidos manipulados e estados |
| 8 Financeiro | Cobrança única por ordem, pendente/recebido separados, pagamentos parciais, créditos internos, estornos e reconciliação explícita | Não altera documento emitido nem saldo bancário; testes e exemplo web abaixo |
| 9 Seleção | Modal pesquisável de clientes e viaturas, viaturas limitadas ao cliente, seleção limpa ao mudar cliente | Relação validada no servidor; percurso web confirmado |
| 10 Históricos | Anos existentes, limites civis Lisboa, paginação no servidor para stock, pagamentos, receções, encomendas, ordens, documentos, orçamentos, fotos e danos | Página global e filtros das listas; detalhe do produto também paginado por ano |
| 11 Identidade | Logo local, favicon, manifest e ícones RoadMesh; HTML público de exportação single com PT e safe areas | Exportação inspecionada; instalação/ícones físicos por validar |
| 12 Login | Entrar + recuperação; registo público recusado no servidor; provisionamento autorizado preservado | Fluxo de token testado; entrega real pendente de SMTP conforme decisão do utilizador |
| 13 Permissões | Matriz explícita em PROJETO.md; verificações no backend, transações e auditoria | Testes diretos à API e entre oficinas |
| 14–16 Validação e entrega | Testes em dois motores, build/lint/tipagem, revisão web, backup recuperado e dois documentos | Resultados e condições de publicação abaixo |

## 3. Decisões de implementação

### Permissões, stock e documentos

`workshops.manager_id` é a autoridade para o responsável. A compatibilidade com `is_manager` não permite contrariar uma designação existente. Alterações de catálogo, preços/hora, stock manual, validação/receção/cancelamento de encomendas, emissão e finanças exigem responsável. Suporte administrativo mantém contexto validado e ator real auditado.

Mudanças de ordem, stock e auditoria são atómicas. Os cálculos de quantidade fracionada usam Decimal para evitar resíduos (dez consumos de 0,1 deixam zero). Não se limita artificialmente a precisão dos dados antigos. O cálculo de dinheiro arredonda totais de linha e IVA aos cêntimos; preserva o preço original da linha.

Foi avaliada a eliminação lógica de ordens. Conservou-se a eliminação permitida anterior, agora com snapshot, permissões e proteção documental; não foi criado um novo estado de arquivo que alterasse os fluxos existentes. Ordens com documentos emitidos não podem ser apagadas nem reabertas pelas rotas operacionais. O arquivo de oficinas é lógico e mantém os dados.

### Livro financeiro

Não se grava um saldo editável. Cada cobrança, pagamento, crédito ou estorno é um movimento com valor, motivo, ator, data e referência. A mesma chave com dados iguais devolve o mesmo movimento; dados diferentes são recusados. Os pagamentos não podem exceder o pendente e os estornos não podem exceder a parcela reversível.

FT e FR da mesma ordem partilham uma cobrança. Emitir um documento não confirma pagamento. Documentos antigos exigem reconciliação explícita e não recebem pagamentos fictícios. Créditos e estornos operacionais não são documentos fiscais certificados. A soma por ordem evita compensar indevidamente dívida de um cliente com crédito de outro.

### Reposição, receção e cancelamento

A necessidade aberta é única por oficina/produto. A transação reutiliza o rascunho do fornecedor e evita linhas repetidas. A receção só soma a quantidade confirmada; a mesma chave não soma novamente. Cancelar uma encomenda parcial conserva receções/stock anteriores e encerra a necessidade aberta. Não é permitido mudar o fornecedor de um produto enquanto tiver encomendas abertas.

Em PostgreSQL o adaptador usa uma trava transacional conservadora nas escritas. Favorece consistência, mas serializa escritas entre oficinas; deve ser medida sob carga antes de otimizar para travas mais finas. MongoDB usa transações e índices únicos. Os testes de pedidos simultâneos aqui não substituem carga em PostgreSQL nativo e pooler real.

### Compatibilidade e organização

Não se alteraram nomes internos de endpoints/campos só por causa da nomenclatura visível. Não se removeu a integração managed da Emergent enquanto ainda pode ser necessária para fotografias antigas. Foi acrescentado Supabase Storage privado como alternativa. Não houve migração automática de ficheiros.

A exportação Expo `single` não utiliza `app/+html.tsx` como template final. Foi acrescentado `frontend/public/index.html`; verificou-se no HTML exportado `lang="pt-PT"`, `viewport-fit=cover`, manifest e política sem referrer. O manifest não promete funcionamento offline; não foi introduzido cache de dados privados num service worker.

## 4. Diagnóstico real da Vercel

Foi consultado o projeto `roadmesh-api` sem alterar configurações. A versão observada era `8a55d9d`, anterior às alterações locais. O painel de seis horas mostrava aproximadamente 1,1 mil pedidos e 0,8% de erros. Essa taxa não é atribuída a este trabalho, que ainda não foi publicado.

Na janela de logs da última hora estavam visíveis:

- Dois POST `/api/auth/refresh` com 401. Recusar uma sessão inválida/expirada pode ser correto; não se enfraqueceu a autenticação para reduzir a métrica.
- OPTIONS com 200 e avisos `Photo storage startup unavailable: HTTPError` no arranque.
- Não foram vistos 5xx nessa janela. O plano disponível não permitiu consultar a janela mais antiga pretendida; isto não prova ausência histórica de 5xx, timeouts ou outros erros.

O aviso confirma falha da chamada de armazenamento durante o arranque, mas não identifica o estado HTTP remoto nem permite afirmar uma causa como quota ou chave inválida. A nova inicialização valida configuração sem fazer uma chamada remota a cada cold start. Os pedidos de imagem continuam a validar erros efetivos. Logs estruturados usam rota sem parâmetros, estado, duração e identificador de pedido, sem corpo, query, tokens, emails ou exceção confidencial do fornecedor.

Depois da publicação, comparar a mesma janela e volume, separar 401/403 esperados de 5xx, e rever a rota e request ID. Esta entrega não demonstra redução de erros em produção.

## 5. Dependências e segurança residual

A auditoria Yarn inicial indicou 1 ocorrência crítica, 152 altas e 36 moderadas por caminho de dependências. Após atualização do lockfile e correções compatíveis: **0 críticas, 10 altas e 0 moderadas**. Contagens por caminhos não equivalem a vulnerabilidades distintas. As 10 ocorrências restantes representam **dois avisos distintos**, nas ferramentas Expo/Metro:

| Pacote | Risco comunicado | Situação e uso |
|---|---|---|
| `node-forge` | Validação RSA PKCS#1 v1.5 | [Aviso do fornecedor](https://github.com/advisories/GHSA-86w9-cpqp-85rv); sem versão corrigida indicada na auditoria; caminho CLI/certificados Expo |
| `braces` | Esgotamento de stack com padrões profundamente aninhados | [Aviso do fornecedor](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); sem versão corrigida indicada; caminho Metro/micromatch |

Não se removeu o compilador nem se aplicou um fork improvisado para esconder alertas. Estes pacotes pertencem ao processo de desenvolvimento/build, não a uma API financeira do browser. Ainda exigem acompanhamento e avaliação do ambiente de CI. Não alimentar essas ferramentas com projetos/padrões/certificados não confiáveis. Repetir a auditoria antes de publicar e atualizar o SDK quando existir uma combinação corrigida e validada.

Foram corrigidos, entre outros, shell-quote, PostCSS, js-yaml e decode-uri-component. A atualização das dependências permitidas também retirou da árvore ativa os caminhos antigos de image-size afetados. Não foi forçada uma mudança incompatível da sua API.

A auditoria Python inicial encontrou 26 avisos em PyMongo, Pillow e Starlette. Atualizaram-se FastAPI para 0.156.2, Starlette para 1.9.0, Motor para 3.7.1, PyMongo para 4.18.2 e Pillow para 13.0.0. A compatibilidade foi verificada com a suite completa e `pip check`. A auditoria final das dependências de runtime Python devolveu **“No known vulnerabilities found”**. Isto significa ausência de avisos conhecidos na consulta, não ausência garantida de vulnerabilidades.

Motor foi mantido para compatibilidade; o fornecedor recomenda evolução para PyMongo Async. A migração de driver fica como manutenção futura, não é uma reescrita necessária para estas regras. Referências: [notas FastAPI](https://fastapi.tiangolo.com/release-notes/) e [compatibilidade Motor/PyMongo](https://motor.readthedocs.io/en/stable/requirements.html).

Evidências sem dados pessoais: [dependências JavaScript](evidencias/dependencias.json) e [dependências Python](evidencias/dependencias-python.json). `.env` foi retirado do controlo de versões anteriormente, mas isso não elimina segredos de commits antigos; eventuais credenciais que tenham sido publicadas exigem rotação privada, sem reescrever o histórico nesta entrega.

## 6. Backup, migrações e duplicados

Antes da implementação foi criada a branch e validada a recuperação do CSV fornecido numa base local vazia: **22 tabelas, 406 registos, comparação integral, zero referências externas em media**. A cópia privada em `.demo/backups/` está ignorada e com permissões restritas. O backup cobre o esquema RoadMesh versão 2; não cobre todo o Supabase, auth, configurações ou ficheiros externos.

A migração 003 acrescenta cinco tabelas e passa o esquema para versão 3 (27 tabelas), normalização, índices, FKs, estados de encomenda e proteção imutável de movimentos/receções. A 004 opcional cria um grupo SQL sem login, com privilégios reduzidos; atribuição a um login privado não foi feita em produção. O backend novo exige versão 3.

### Plano dos dois clientes duplicados

O preflight de leitura encontrou um grupo de dois clientes, na mesma oficina, com NIF normalizado e conjunto completo de dados iguais. Não foram alterados nem fundidos. A migração para se existirem conflitos.

1. Tirar backup atual imediatamente antes da intervenção e restaurar em staging.
2. Executar `003_preflight.sql` em privado para identificar o par. Não publicar os IDs, NIF ou contactos.
3. Levantar viaturas, marcações, ordens, orçamentos, documentos, utilizadores do portal e extensões associados a cada cliente; comparar com o estado atual, pois o CSV pode estar desatualizado.
4. O responsável confirma se é uma pessoa única ou dois registos legítimos com identificador errado. No segundo caso, corrigir o identificador com prova; no primeiro, escolher o registo canónico.
5. Preparar uma transação específica com mapa anterior/novo, atualização de todas as referências pertinentes e auditoria. Preservar snapshots/documentos emitidos e dados de acesso; não fundir contas por email automaticamente.
6. Apresentar a alteração concreta e as contagens antes/depois para aprovação. Só então executar; validar relações e testar os acessos em staging.
7. Repetir preflight, aplicar 003 e regressões, e só depois planear produção. Gerar backup novo completo de 27 tabelas e testar restauro.

O utilitário `scripts/check_business_migration.py` apresenta contagens sem dados pessoais. Não se fornece um DELETE genérico nem se resolve o conflito por adivinhação.

## 7. Testes executados

Resultados finais de 20/10/2026, com contas fictícias e bases descartáveis:

| Verificação | Resultado |
|---|---|
| PostgreSQL incorporado, migrações 001–004 e regressões | **89 aprovados, 2 omitidos** |
| MongoDB local real com transações | **80 aprovados, 11 omitidos** |
| Node: sessão e margem | **10 aprovados** |
| TypeScript | Aprovado |
| ESLint completo | Aprovado |
| Ruff: erros/imports Python (`E9,F`) | Aprovado |
| `pip check` | Sem incompatibilidades |
| Auditoria runtime Python | Sem vulnerabilidades conhecidas detetadas |
| Exportação web Expo | Aprovada; HTML e manifest inspecionados |
| `git diff --check` | Aprovado |

As omissões são casos específicos do outro motor, não falhas ignoradas. Os testes cobrem pedidos adulterados, outra oficina, preços, relações cliente/viatura, unicidade, rollback de auditoria/stock, precisão fracionada, snapshots de horas, limites financeiros, pagamento/repetição simultâneos, reposição/rascunho simultâneos, receções parciais, cancelamento parcial, expiração/uso único da recuperação e revogação de sessões. O papel SQL dedicado foi testado contra reescrita de movimentos e auditoria.

Houve uma falha intermédia do novo teste de cancelamento: enviava uma atualização incompleta de produto e recebia corretamente 422 antes da regra de encomendas. Corrigiu-se o payload do teste para exercer a regra real; passou nos dois motores. Não se alterou a API para aceitar dados incompletos só para passar o teste.

### Limitação do servidor PostgreSQL incorporado

O PostgreSQL nativo não conseguiu arrancar neste ambiente devido à restrição de memória partilhada; não existe daemon Docker utilizável. O PGlite/socket apresentou corrupção de recuperação do protocolo após erros SQL provocados nos testes, reproduzida isoladamente com divisão por zero/rollback. O runner incorporado passou a usar ClientCursor, protegido por uma flag exclusiva de testes. **A produção mantém parâmetros no servidor e o seu pool habitual.** Não se substituiu SQL de produção por interpolação manual.

A suite incorporada aprovou relações, migrações, operações e pedidos simultâneos da API. A repetição funcional em Supabase/PostgreSQL 17 com pooler de sessão foi concluída em 21/10, incluindo pedidos paralelos. Falta teste de carga representativo e do pooler de transações; PGlite por si só não demonstra o mesmo comportamento do servidor real.

### Percursos revistos no navegador

- Login público só com Entrar e recuperação; sessão fictícia de responsável.
- Configuração de 35 €/hora, persistência e retorno ao menu anterior.
- Catálogo do fornecedor com um produto próprio em stock.
- Margem 25% sobre custo de 8 € → 10,67 €, sem guardar a alteração de demonstração.
- Produto adicionado a rascunho existente; validação explícita; leitura de código identifica produto antes de permitir receção.
- Uma unidade recebida de duas: estado parcial, uma em falta, histórico persistido.
- Seleção por modal do cliente e sua viatura; duas horas com descrição vazia; total 86,10 €.
- Conclusão com histórico; emissão interna; 86,10 € pendentes e zero recebidos; pagamento fictício de 20 € → **66,10 € pendentes e 20 € recebidos**.
- Filtro anual mostra só anos com registos; seleção de 2026 mantém os movimentos desse ano.
- Revisão desktop e viewport móvel; não houve utilização de câmara, leitor físico ou transação financeira externa.

Evidências visuais em `docs/evidencias/`, apenas com dados fictícios. Os percursos foram executados numa instância local isolada; os testes automáticos posteriores incluem as versões finais das dependências.

## 8. Desempenho medido

Quinze amostras por rota, API local aquecida, MongoDB e oficina pequena fictícia:

| Rota | Mediana | p95 |
|---|---:|---:|
| Ordens, limite 50 | 1,90 ms | 2,02 ms |
| Produtos | 1,34 ms | 1,40 ms |
| Resumo financeiro | 1,53 ms | 1,72 ms |

[Evidência JSON](evidencias/desempenho-local.json). São tempos locais anteriores à atualização final das bibliotecas, não latência percebida na Internet, cold starts ou teste de escala. Não foi conservado um baseline comparável; não se inventa uma percentagem de melhoria. A exportação final mostrou bundle web de cerca de 1,5 MB. Os imports de ícones foram limitados ao conjunto utilizado; as relações históricas da listagem de documentos passaram de consultas por documento para consultas em lote.

## 9. Condições ainda pendentes para publicação

1. **Dados/migração:** decisão sobre os dois clientes, backup atual, restauro em staging, migração 003 e login SQL dedicado se adotado. Produção preservada até lá.
2. **Carga e infraestrutura:** a suite funcional em PostgreSQL real/pooler de sessão passou em 21/10. Falta carga representativa e validar a configuração final da produção; não confundir testes concorrentes de quatro pedidos com um teste de escala.
3. **Fotografias em produção:** o bucket e o transporte real foram validados no projeto separado em 21/10. Configurar e verificar o fornecedor/bucket da produção antes de publicar; as credenciais de testes não devem ser reutilizadas.
4. **Email:** configurar SMTP e validar entrega real, expiração, uso único e revogação. Procedimento documentado conforme pedido; sem fornecedor, não existe entrega operacional.
5. **Dispositivos:** iPhone com Dynamic Island, Safari, instalação no ecrã principal, ícones, teclado, safe areas, leitor USB/Bluetooth e compatibilidade de câmara. A câmara web é progressiva e não suporta todos os navegadores.
6. **Dependências de ferramentas:** reavaliar os dois alertas altos sem correção publicada e o isolamento do CI antes de release.
7. **Publicação e observação:** rever o conjunto, guardar commit, publicar migração/backend/frontend na ordem documentada e medir logs reais. Não atribuir à branch local alterações na taxa da Vercel.

Não há autorização inferida para apagar duplicados, alterar contas reais ou executar migrações destrutivas. A preparação local está entregue para revisão e testes; estas condições impedem declarar a versão publicada e integralmente validada em produção.

## Continuação: ensaio sobre o backup real

O ensaio local de resolução do cliente sem relações, migração para 27 tabelas, rollback e restauro integral do backup versão 3 passou. A produção não foi alterada. Ver [procedimento e estado atual](PUBLICAR.md). Ainda falta a base Supabase de testes, que o utilizador confirmou não existir.

## Validação adicional — 21 de outubro de 2026

O RoadMesh-Testes foi criado e validado com PostgreSQL 17 real, ligação TLS pelo pooler de sessão IPv4. As migrações 001–004 passaram numa base inicialmente sem esquema RoadMesh; estão confirmadas 27 tabelas. A suite remota terminou com **97 testes aprovados e 2 exclusivos de MongoDB omitidos**, em 14 min 23 s. O teste de `SET ROLE roadmesh_runtime` foi excluído explicitamente após o titular recusar a concessão de membership; não foi concedida essa permissão. A primeira tentativa parou com 31 aprovados e essa falha de preparação, sem falha da API. Consultas de leitura confirmaram os privilégios declarados do papel, sem substituir o teste real de sessão.

O bucket privado `roadmesh-media` foi criado por autorização específica: JPEG, 10 MB, sem políticas públicas. O driver enviou e leu uma imagem fictícia de 633 bytes; o conteúdo foi comparado e o acesso pela rota pública foi recusado. A chave ficou exclusivamente no ficheiro privado de staging do backend; não foi adicionada ao Git ou impressa.

Foi exportado um snapshot consistente da base de testes com 27 tabelas e 1 358 registos. O restauro local numa base vazia comparou integralmente todas as linhas e verificou relações. Este backup é da base de testes, não da produção, e não inclui bytes das fotografias do bucket. Os ficheiros locais temporários usados pela suite genérica não fazem parte desse backup; os respetivos dados fictícios não devem ser considerados uma demonstração persistente de fotografias.

[Evidência Supabase](evidencias/validacao-supabase.json), [restauro](evidencias/restauro-staging.json), [privilégios](evidencias/permissoes-staging.json) e [imagem privada](evidencias/storage-staging-roundtrip.json). A suite genérica usou armazenamento local; o teste de transporte posterior usou Supabase Storage real. O relatório de testes adicionais da API de imagens é guardado separadamente quando terminar.

Estas verificações substituem a pendência de concorrência funcional em PostgreSQL incorporado por testes numa base real com pedidos paralelos; não constituem benchmark de carga, validação do pooler de transações, teste físico de iPhone/leitor ou migração da produção. A resolução dos clientes duplicados permanece ensaiada apenas numa cópia local e requer revisão atual antes da publicação.

### Fotografias pela API — concluído em 21/10

Passaram **3 testes adicionais** com PostgreSQL e Supabase Storage reais: upload/download autenticado, recusa de leitura por outra oficina e ficheiros inválidos/demasiado grandes. Foram usados dados e imagens fictícios. A chave service_role existente foi copiada pelo utilizador diretamente para o ficheiro privado do backend e não foi impressa nem guardada num ficheiro temporário. A produção não foi alterada.


## Conclusão do acesso admin — 21/10/2026

Após autorização explícita do titular, o backup atual de produção (22 tabelas / 407 registos) foi restaurado e comparado integralmente. A resolução do duplicado e a migração foram ensaiadas nessa cópia, incluindo rollback e restauro das 27 tabelas. Em seguida foram aplicadas atomicamente na produção, com backup adicional sob bloqueio e preservação integral do cliente redundante na auditoria. Não houve concessão de papel.

Foi preservada a conta admin existente; a palavra-passe foi renovada e guardada exclusivamente num ficheiro privado local. A API publicada passou login, alteração de palavra-passe, identidade, dashboard e lista de oficinas. Sessões de teste encerradas. Ver `PUBLICAR.md`, `evidencias/migracao-producao.json` e `evidencias/acesso-admin.json`. Isto não representa deploy do código novo: a branch de auditoria continua por publicar.
