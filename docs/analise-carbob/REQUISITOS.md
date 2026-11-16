# Requisitos derivados da análise Carbob

Data: 2026-11-08. Proposta para discussão, sem alteração do catálogo ou compromisso de prazo.

A descrição da Carbob é uma alegação pública. Os critérios abaixo são requisitos propostos para a RoadMesh e podem incluir decisões nossas que não estão demonstradas no site concorrente. P1: núcleo; P2: expansão operacional; P3: dependência externa a preparar antecipadamente. Estas prioridades não são estimativas de esforço.

## Orçamentos

Destino sugerido: **Orçamentos**. Prioridade: **P1**. [Fonte pública](https://www.carbob.pt/funcionalidades/orcamentos).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-001 | Linhas e totais | Peças, serviços, mão de obra, descontos e impostos com totais coerentes. |
| RM-002 | Versões e extras | Guardar a versão enviada e pedir nova aprovação quando os trabalhos mudarem. |
| RM-003 | Aprovação remota | Cliente aceita ou recusa uma versão através de ligação com validade e registo da decisão. |
| RM-004 | Conversão | Criar uma única OS a partir do orçamento aprovado sem duplicar linhas. |
| RM-005 | Seguimento | Distinguir rascunho, enviado, aprovado, recusado e expirado; medir conversão. |

## Ordens de reparação

Destino sugerido: **Ordens de serviço**. Prioridade: **P1**. [Fonte pública](https://www.carbob.pt/funcionalidades/ordens-reparacao).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-006 | Ficha de trabalho | Pedido do cliente, responsável, tarefas, materiais e observações numa OS. |
| RM-007 | Execução | Registar execução por tarefa e distinguir trabalho previsto de trabalho efetuado. |
| RM-008 | Rastreabilidade | Guardar autor, data e alterações importantes de cada intervenção. |
| RM-009 | Fecho | Rever tarefas, materiais e aprovações antes de concluir; definir reabertura controlada. |

## Quadro de trabalho

Destino sugerido: **Ordens de serviço**. Prioridade: **P1**. [Fonte pública](https://www.carbob.pt/funcionalidades/estado-viaturas).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-010 | Quadro operacional | Mostrar viaturas por estado com cliente, responsável e data prevista. |
| RM-011 | Bloqueios | Registar motivo da espera, responsável e próxima ação. |
| RM-012 | Idade do estado | Medir permanência em cada estado e destacar atrasos configuráveis. |
| RM-013 | Filtros | Pesquisar matrícula e filtrar por técnico, estado e prioridade. |

## Agenda

Destino sugerido: **Agenda e capacidade**. Prioridade: **P1**. [Fonte pública](https://www.carbob.pt/funcionalidades/agendamento).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-014 | Recursos | Configurar técnicos, postos, horários, pausas e indisponibilidades. |
| RM-015 | Capacidade | Considerar duração do serviço e impedir reservas incompatíveis no mesmo recurso. |
| RM-016 | Ciclo da marcação | Confirmar, reagendar, cancelar e registar falta sem perder histórico. |
| RM-017 | Entrada | Ligar a marcação à receção e à OS quando esses módulos estiverem ativos. |
| RM-018 | Vistas | Consultar dia, semana e mês e distinguir pedido pendente de horário confirmado. |

## Stocks e encomendas

Destino sugerido: **Stocks e encomendas**. Prioridade: **P1**. [Fonte pública](https://www.carbob.pt/funcionalidades/gestao-encomenda-pecas).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-019 | Movimentos | Entradas, saídas e ajustes com utilizador, motivo e documento de origem. |
| RM-020 | Reserva e consumo | Separar quantidade física, reservada e disponível; consumir uma única vez. |
| RM-021 | Encomendas | Receber parcialmente, identificar o destino e manter a quantidade pendente. |
| RM-022 | Reposição | Configurar mínimos e gerar propostas de compra sem duplicar encomendas. |
| RM-023 | Importação | Importar documento de fornecedor com revisão de referências, custos e duplicados. |

## App para mecânicos

Destino sugerido: **Equipa técnica e tempos**. Prioridade: **P2**. [Fonte pública](https://www.carbob.pt/funcionalidades/app-mecanicos).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-024 | Vista do técnico | Apresentar trabalho atribuído e contexto permitido sem acesso administrativo. |
| RM-025 | Cronómetro | Iniciar, pausar e terminar tempo por tarefa, evitando sobreposições indevidas. |
| RM-026 | Correções | Permitir correção justificada e auditada de tempos. |
| RM-027 | No posto de trabalho | Anexar imagens e notas e sinalizar trabalhos adicionais a partir do telemóvel. |

## Diagnóstico digital

Destino sugerido: **Inspeção e diagnóstico**. Prioridade: **P2**. [Fonte pública](https://www.carbob.pt/funcionalidades/inspecao-digital-viatura).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-028 | Checklist técnica | Definir componentes e resultados com observações e gravidade. |
| RM-029 | Evidências | Associar fotografias e anotações ao ponto inspecionado. |
| RM-030 | Trabalho recomendado | Transformar recomendação em proposta sujeita a aprovação quando Orçamentos estiver ativo. |
| RM-031 | Histórico técnico | Consultar inspeções anteriores e distinguir problema observado de reparação concluída. |

## Receção ativa

Destino sugerido: **Receção de veículos**. Prioridade: **P1**. [Fonte pública](https://www.carbob.pt/funcionalidades/rececao-ativa).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-032 | Entrada identificável | Guardar uma receção por visita com data, autor, matrícula, quilómetros e combustível. |
| RM-033 | Fotos e danos | Fotografar e localizar danos com observações ligadas à receção correta. |
| RM-034 | Finalização | Finalizar o levantamento e identificar correções posteriores sem apagar o original. |
| RM-035 | Relatório | Consultar e descarregar o relatório sem depender do módulo de notificações. |
| RM-036 | Entrega | Decidir checklist, assinatura e comparação de fotos na saída; estes são requisitos propostos, não funções confirmadas da Carbob. |

## Comunicação com clientes

Destino sugerido: **Comunicações**. Prioridade: **P2**. [Fonte pública](https://www.carbob.pt/funcionalidades/comunicacao-clientes).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-037 | Modelos | Configurar mensagens por evento com campos permitidos e pré-visualização. |
| RM-038 | Entrega fiável | Fila de envio, tentativas limitadas e prevenção de mensagens duplicadas. |
| RM-039 | Histórico | Guardar mensagem, canal e entrega/falha respeitando acessos e preferências. |
| RM-040 | Lembretes | Cancelar ou recalcular lembretes depois de reagendar ou cancelar. |
| RM-041 | Canais externos | Separar partilha manual de envio por fornecedor; registar consumos e custos. |

## Reservas online

Destino sugerido: **Reservas online**. Prioridade: **P2**. [Fonte pública](https://www.carbob.pt/funcionalidades/reservas-online).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-042 | Widget público | Disponibilizar formulário incorporável com serviços e duração configurados. |
| RM-043 | Disponibilidade | Confirmar atomicamente a vaga para impedir duas reservas simultâneas. |
| RM-044 | Gestão pelo cliente | Permitir confirmar ou cancelar através de ligação com validade. |
| RM-045 | Proteção do formulário | Limitar abuso e recolher apenas dados necessários à reserva. |

## Pagamentos

Destino sugerido: **Pagamentos e conta corrente**. Prioridade: **P2**. [Fonte pública](https://www.carbob.pt/funcionalidades/pagamentos).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-046 | Registo financeiro | Registar montante, método, data e associação ao documento. |
| RM-047 | Parciais e saldos | Calcular dívida e pagamentos parciais sem cobrar duas vezes. |
| RM-048 | Cobrança remota | Gerar ligação através de fornecedor contratado e processar notificações autenticadas. |
| RM-049 | Conciliação | Tratar repetição de notificações, falhas e reembolsos sem duplicar movimentos. |

## Integração com faturação

Destino sugerido: **Integração com faturação**. Prioridade: **P3**. [Fonte pública](https://www.carbob.pt/funcionalidades/integracao-faturacao).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-050 | Fornecedor | Escolher software externo e validar contrato, documentação e ambiente de testes. |
| RM-051 | Emissão idempotente | Enviar uma operação uma única vez e guardar a referência devolvida. |
| RM-052 | Revisão | Conferir destinatário, impostos e linhas antes da emissão. |
| RM-053 | Estados e correções | Sincronizar resultado, erros e documentos de correção; definir responsabilidades. |

## Relatórios

Destino sugerido: **Relatórios**. Prioridade: **P2**. [Fonte pública](https://www.carbob.pt/funcionalidades/relatorios).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-054 | Indicadores | Definir receita, recebimento, margem e conversão sem confundir grandezas. |
| RM-055 | Tempos e permanência | Separar duração efetiva do trabalho de dias da viatura nas instalações. |
| RM-056 | Rentabilidade | Comparar valor vendido com custo de materiais e horas reais por OS. |
| RM-057 | Exportações | Exportar apenas os dados autorizados e indicar período e filtros. |

## Dados técnicos e integrações

Destino sugerido: **Dados técnicos**. Prioridade: **P3**. [Fonte pública](https://www.carbob.pt/funcionalidades/integracoes).

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-058 | Matrícula e VIN | Consultar fornecedor licenciado e permitir correção manual da identificação. |
| RM-059 | Catálogo | Pesquisar referências e compatibilidade sem assumir que uma correspondência é infalível. |
| RM-060 | Tempos e procedimentos | Consultar dados licenciados e guardar origem e versão usada. |
| RM-061 | Quotas | Controlar consumo por empresa e distinguir consultas novas de repetidas. |
| RM-062 | Distribuidores | Validar disponibilidade comercial antes de prometer encomenda direta. |

## Requisitos transversais e comerciais

| ID | Capacidade | Critério proposto |
|---|---|---|
| RM-063 | Módulos independentes | Verificar ativação na interface e API; uma ligação a outro módulo não concede acesso ao mesmo. |
| RM-064 | Preço histórico | Alterações de base, módulos ou consumos não mudam períodos/documentos já fechados. |
| RM-065 | Preservação de registos | Desativar módulo preserva dados; definir acesso de leitura e recuperação. |
| RM-066 | Presets | Aplicar preset substitui a seleção; nome e composição são editáveis. |
| RM-067 | Dados isolados | Impedir consulta de empresa diferente, incluindo anexos, exportações e ligações públicas. |
| RM-068 | Migração | Pré-visualizar importação, tratar duplicados e conferir contagens antes de concluir. |
| RM-069 | Várias unidades | Definir acesso local/global e consolidar apenas unidades autorizadas. |
| RM-070 | Campanhas | Definir segmentos, preferências e limites antes de ativar envios comerciais. |
| RM-071 | Satisfação | Associar avaliação à visita e definir quem pode consultar e responder. |
| RM-072 | Conteúdo comercial | Explicar módulos, preços, limites, migração e demonstração com condições consistentes. |
| RM-073 | Stand e Detailer | Especificar percursos próprios; não deduzir gestão de vendas da página de pós-venda. |
| RM-074 | Critérios de conclusão | Ensaiar percurso por perfil, falhas, cancelamentos e recuperação antes de declarar uma função pronta. |

Total: 74 requisitos propostos. Para cada implementação, acrescentar responsável, esforço, dependências e evidência de aceitação. [Relatório de contexto](../ANALISE-CARBOB-2026-11-08.md).

