# Estado dos produtos locais

Atualizado em 2026-11-08. O catálogo foi expandido para 16 módulos. **O catálogo e as bases de registo não significam que todos os produtos estejam concluídos nem equivalentes à oferta analisada.** Esta tabela separa trabalho de programação pendente das dependências comerciais.

## Estrutura concluída nesta fase

- Criação e edição de empresas: seleção dos 16 módulos, preços individuais, base e total mensal.
- Presets continuam editáveis e substituem a seleção; atualizar um preset não altera contratos.
- Dashboard e catálogo de navegação filtrados pelos módulos ativos, sem cartões reservados a módulos desativados.
- Páginas separadas de listagem e formulário/detalhe para os novos registos.
- A API verifica os módulos, a empresa e as referências de viatura. Revisões evitam sobrescrever silenciosamente alterações concorrentes.
- Separação de Orçamentos, Agenda, Pagamentos e Faturação das famílias antigas.
- Empresas modulares anteriores conservam os acessos que estavam incluídos nos agrupamentos, com os módulos separados acrescentados a preço zero. O total contratado e períodos anteriores não mudam. A migração conserva um retrato da seleção e preços anteriores, e só ocorre uma vez.
- MongoDB local e migração PostgreSQL 008 preparados; nenhum serviço remoto foi atualizado.

## Capacidades e próximos passos

| Produto | Disponível localmente | Ainda por desenvolver ou concluir | Pendência externa |
|---|---|---|---|
| Base de dados | Fichas e relações cliente/viatura existentes | Importação guiada, revisão de duplicados e histórico de alterações | EXT-018 |
| Receção | Registos de visita com quilómetros, combustível, observações, finalização e partilha textual; páginas de fotografias/danos existentes | Associar fotografias e danos à visita concreta, checklist, relatório completo e decisão sobre assinatura/entrega | EXT-017 |
| Orçamentos | Linhas, totais, estados, partilha manual e conversão existentes; conversão exige OS ativa | Versões, aprovação remota e validade da ligação | EXT-009 a EXT-011 para envio automático |
| Ordens de serviço | Registos, materiais, estados e conclusão existentes | Quadro operacional completo, tarefas, responsáveis e histórico detalhado | Validação com pilotos, EXT-016 |
| Stocks | Produtos, fornecedores, movimentos e encomendas existentes | Completar reservas, consumo e importação de documentos de fornecedores | EXT-005 |
| Agenda | Pedidos e acompanhamento de marcações existentes, agora com ativação própria | Calendário por técnicos/postos, duração e capacidade real | EXT-016 |
| Inspeção | Registos por componente, resultado, gravidade e recomendação associados à viatura | Checklist com vários pontos, fotografias por ponto, relatório e proposta de trabalhos adicionais | EXT-016 |
| Equipa e tempos | Tarefas por viatura e cronómetro iniciar/parar, segundos guardados no servidor e uma tarefa em curso por técnico | Atribuição de trabalho, ligação validada à OS/tarefa, correções auditadas e análise de produtividade | EXT-016 |
| Comunicações | Registos de modelos/mensagens, destinatário, canal e estado de preparação | Fila, eventos, entrega/falhas e recuperação sem duplicação | EXT-009 a EXT-011 |
| Reservas online | Registo interno de pedidos e confirmação com controlo de sobreposição no mesmo recurso | Widget público, serviços/duração, cancelamento pelo cliente e ligação à agenda | Domínio e operação, EXT-013/EXT-015; não é bloqueado apenas por contratos |
| Pagamentos | Conta corrente e movimentos internos existentes | Conector, ligações, notificações do prestador e devoluções | EXT-007/EXT-008 |
| Faturação | Registos de preparação de fornecedor/conta e documentos internos anteriores | Conector de emissão e sincronização, erros e documentos de correção | EXT-006 |
| Relatórios | Contagens reais de registos dos módulos ativos e partilha do resumo | Períodos, conversão, permanência, custos, margens, produtividade e exportação detalhada | Não depende de contratar um serviço de relatórios |
| Dados técnicos | Referências manuais com origem, marca e observações | Conectores, pesquisas, compatibilidades e controlo de consumos | EXT-002 a EXT-004 |
| Marketing e satisfação | Rascunhos de campanhas, segmento, objetivo e conteúdo | Gestão efetiva de segmentos, preferências, envio e avaliações de satisfação | EXT-010 a EXT-012/EXT-020 |
| Multi-localização | Fichas de unidades, contactos, responsáveis e estado | Atribuição de utilizadores/registos às unidades, permissões e relatórios consolidados | EXT-016; não depende apenas de fornecedor |

Nenhum envio automático, cobrança remota, emissão fiscal externa ou consulta técnica licenciada é apresentado como concluído. Os registos preparatórios não substituem os conectores.

## Verificação realizada

- 58 testes frontend passaram.
- 123 testes API/percursos existentes passaram em MongoDB temporário, incluindo os 13 testes novos iniciais. A repetição final dos módulos passou 59 testes; um teste adicional de Pagamentos/Relatórios isolados também passou.
- No adaptador PostgreSQL com PGlite, 12 dos 13 testes novos passaram inicialmente; uma diferença de consulta de horários foi corrigida e o teste restante passou na repetição dirigida. PGlite não demonstra concorrência multiprocesso de PostgreSQL em produção.
- TypeScript e lint dos componentes alterados passaram.
- Revisão visual: 16 módulos na criação, seleção e cálculo 200 + 15,50 = 215,50; abertura das oito novas páginas complementares; tarefa criada e cronómetro guardado; formulário em 390 × 844 nos dois temas.
- Revisão visual numa empresa fictícia própria, sem alterar os registos de empresas de trabalho. A empresa fictícia foi desativada após a revisão.
- Imagens e dados técnicos de teste ficam na pasta privada ignorada `.demo/evidence`.

## Sequência imediata

1. Concluir a receção por visita com fotografias e relatório.
2. Versões e aprovação de orçamentos; continuidade para OS.
3. Quadro de trabalho, tarefas e agenda por capacidade.
4. Checklists e evidências de inspeção; tempos ligados às tarefas.
5. Reservas públicas, indicadores e campanhas/satisfação.
6. Ativar conectores quando fornecedores e condições estiverem escolhidos.

Referências: [74 requisitos](analise-carbob/REQUISITOS.md), [pesquisas e contratos externos](PENDENCIAS-EXTERNAS.md), [análise pública](ANALISE-CARBOB-2026-11-08.md).

