# Carbob: análise pública e proposta para a RoadMesh

Data da consulta: 8 de novembro de 2026. Documento de trabalho para discussão; não altera o catálogo atual nem constitui compromisso de implementação.

## 1. Conclusão

A oferta anunciada cobre uma operação de oficina de ponta a ponta: identificar viatura e cliente, receber e documentar o veículo, preparar orçamento, obter aprovação, executar a reparação, acompanhar peças e tempos, informar o cliente e fechar cobrança e faturação. O valor está nas ligações entre estas etapas, além dos ecrãs individuais.

A RoadMesh já possui bases para várias destas funções. O objetivo deve ser transformar essas bases em percursos completos e verificáveis e acrescentar as capacidades em falta. Os cinco módulos atuais são um ponto de partida; concentrar toda esta oferta dentro deles tornaria a seleção comercial pouco clara.

A divisão sugerida preserva as regras acordadas: módulos independentes, presets editáveis, preços por empresa e alterações de mensalidade apenas para a frente. Oficina, Stand e Detailer continuam a ser presets, sem determinar automaticamente permissões.

## 2. Cobertura e limites

Foram consultadas a página inicial, as páginas públicas de funcionalidades, as oito especialidades de oficina, preços, migração, comparação, empresa, contacto, demonstração, informação legal, blog e categorias. Encontraram-se cinco artigos publicados e três ligações antigas de artigos que devolvem uma página 404.

Na biblioteca Carros, foram abertos os índices das 57 marcas e inventariadas 847 ligações de fichas de modelos/versões. Três fichas foram revistas como amostra documentada: elétrico, híbrido e diesel. **As 847 fichas não foram integralmente analisadas.** O inventário identifica-as como ligações encontradas, sem as confundir com páginas lidas. A biblioteca é conteúdo editorial de aquisição de visitantes, e não demonstra uma funcionalidade equivalente dentro da aplicação.

O levantamento cobre as páginas públicas encontradas por navegação. Não certifica a inexistência de páginas não ligadas, nem inclui uma auditoria à aplicação autenticada, qualidade dos dados técnicos ou funcionamento real das integrações. Não foram criadas contas, enviados formulários ou pedidos comerciais. Algumas páginas foram obtidas através do índice de pesquisa; os preços foram também conferidos diretamente no navegador.

Classificação usada:
- **Anunciado:** a empresa descreve a capacidade numa página pública.
- **Observado:** foi possível verificar o conteúdo ou comportamento da página pública.
- **Em desenvolvimento:** a própria página apresenta essa limitação.
- **Não confirmado:** não há informação suficiente nas fontes consultadas.
- **Proposto:** decisão de produto sugerida para a RoadMesh, não uma alegação sobre a Carbob.

O inventário completo de URLs e respetiva cobertura fica em [paginas.json](analise-carbob/paginas.json). Os requisitos propostos ficam em [REQUISITOS.md](analise-carbob/REQUISITOS.md).

## 3. Catálogo funcional anunciado

Cada bloco abaixo resume a respetiva página. “Base existente” resulta de leitura dirigida do repositório RoadMesh, sem novo ensaio funcional nesta análise.

### Orçamentos

**Carbob — anunciado:** Identificação por matrícula/VIN, peças e mão de obra, dados técnicos, envio e aprovação digital, conversão para ordem de reparação.

**RoadMesh — base existente e diferença:** Já existem criação, estados, partilha e conversão de orçamentos. A partilha WhatsApp/email abre aplicações externas; isso não demonstra envio automático nem aprovação por ligação.

**Destino sugerido:** Orçamentos. [Fonte: Orçamentos](https://www.carbob.pt/funcionalidades/orcamentos).

### Ordens de reparação

**Carbob — anunciado:** Ficha operacional com trabalhos, peças, tempos, diagnóstico e histórico; ligação à agenda, cobrança e faturação.

**RoadMesh — base existente e diferença:** Existem ordens de serviço e relações com documentos. É preciso verificar o percurso completo por perfil e aprofundar responsáveis, tempos e histórico de alterações.

**Destino sugerido:** Ordens de serviço. [Fonte: Ordens de reparação](https://www.carbob.pt/funcionalidades/ordens-reparacao).

### Quadro de trabalho

**Carbob — anunciado:** Visão por estados, técnico e etiquetas, histórico da evolução, identificação de viaturas bloqueadas e informação de progresso.

**RoadMesh — base existente e diferença:** Existem estados das OS e resumos. Não foi validado um quadro com todas as capacidades anunciadas.

**Destino sugerido:** Ordens de serviço. [Fonte: Quadro de trabalho](https://www.carbob.pt/funcionalidades/estado-viaturas).

### Agenda

**Carbob — anunciado:** Calendário diário, semanal e mensal com ocupação dos técnicos e postos; articulação com ordens e lembretes.

**RoadMesh — base existente e diferença:** Há marcações no portal e na oficina. Pedidos de marcação não equivalem a reservas firmes por capacidade.

**Destino sugerido:** Agenda e capacidade. [Fonte: Agenda](https://www.carbob.pt/funcionalidades/agendamento).

### Stocks e encomendas

**Carbob — anunciado:** Movimentos, disponibilidade, mínimos, peças associadas a ordens, seguimento de encomendas e importação de documentos de fornecedores. Ligações diretas a distribuidores são indicadas como em desenvolvimento.

**RoadMesh — base existente e diferença:** Há produtos, fornecedores, encomendas e operações de receção. Falta validar reserva/consumo e integrações reais; não partir do zero.

**Destino sugerido:** Stocks e encomendas. [Fonte: Stocks e encomendas](https://www.carbob.pt/funcionalidades/gestao-encomenda-pecas).

### App para mecânicos

**Carbob — anunciado:** Consulta de trabalho e histórico no telemóvel/tablet, registo de tempos, fotografias e atualização da execução.

**RoadMesh — base existente e diferença:** A aplicação existente pode servir de base à interface técnica; não foi encontrado, na pesquisa dirigida, um sistema de picagem de tempos por tarefa.

**Destino sugerido:** Equipa técnica e tempos. [Fonte: App para mecânicos](https://www.carbob.pt/funcionalidades/app-mecanicos).

### Diagnóstico digital

**Carbob — anunciado:** Inspeção por componentes com fotografias, notas e recomendações, relatório e proposta de trabalhos adicionais para aprovação.

**RoadMesh — base existente e diferença:** Fotografias e danos existentes são uma base reutilizável, mas não demonstram uma inspeção técnica estruturada.

**Destino sugerido:** Inspeção e diagnóstico. [Fonte: Diagnóstico digital](https://www.carbob.pt/funcionalidades/inspecao-digital-viatura).

### Receção ativa

**Carbob — anunciado:** Registo inicial com fotografias/vídeos, data, quilómetros, combustível e observações, associado à viatura e à intervenção.

**RoadMesh — base existente e diferença:** Existem fotografias e registo de danos. Fechar uma receção identificável, relatório e regras de alteração ainda precisa de especificação e validação.

**Destino sugerido:** Receção de veículos. [Fonte: Receção ativa](https://www.carbob.pt/funcionalidades/rececao-ativa).

### Comunicação com clientes

**Carbob — anunciado:** Avisos de evolução, modelos com dados da viatura, envio por WhatsApp/SMS/email, histórico e acompanhamento de mensagens.

**RoadMesh — base existente e diferença:** Partilha manual e marcações já existem. Não encontrei nos caminhos pesquisados uma integração de mensagens transacionais equivalente à promessa pública.

**Destino sugerido:** Comunicações. [Fonte: Comunicação com clientes](https://www.carbob.pt/funcionalidades/comunicacao-clientes).

### Reservas online

**Carbob — anunciado:** Widget no site da oficina, escolha de serviço e horário disponível, sincronização com agenda e confirmações.

**RoadMesh — base existente e diferença:** Existe pedido de marcação no portal. Não é prova de widget público incorporável nem de disponibilidade em tempo real.

**Destino sugerido:** Reservas online. [Fonte: Reservas online](https://www.carbob.pt/funcionalidades/reservas-online).

### Pagamentos

**Carbob — anunciado:** Registo associado à intervenção, pagamentos parciais, conta corrente, exportação e ligações para cobrança remota com conciliação.

**RoadMesh — base existente e diferença:** Há movimentos financeiros e reconciliação interna. Isso não equivale a um processador de pagamentos integrado.

**Destino sugerido:** Pagamentos e conta corrente. [Fonte: Pagamentos](https://www.carbob.pt/funcionalidades/pagamentos).

### Integração com faturação

**Carbob — anunciado:** Transferência de peças, serviços, mão de obra e valores da ordem para software português de faturação certificado; fornecedores não identificados nesta página.

**RoadMesh — base existente e diferença:** Há documentos e PDF internos. Não considerar isto integração fiscal certificada nem anunciar certificação por existir uma página chamada Faturação.

**Destino sugerido:** Integração com faturação. [Fonte: Integração com faturação](https://www.carbob.pt/funcionalidades/integracao-faturacao).

### Relatórios

**Carbob — anunciado:** Receita, rentabilidade, conversão, tempos, produtividade e bloqueios, com exportações.

**RoadMesh — base existente e diferença:** Existem resumos administrativos, operacionais e financeiros. A equivalência exige métricas calculadas a partir de eventos e custos reais.

**Destino sugerido:** Relatórios. [Fonte: Relatórios](https://www.carbob.pt/funcionalidades/relatorios).

### Dados técnicos e integrações

**Carbob — anunciado:** TecDoc/TecRMI, referências de peças, tempos de reparação e identificação por matrícula/VIN. Distribuidores apresentados como trabalho em desenvolvimento.

**RoadMesh — base existente e diferença:** A pesquisa dirigida no backend e frontend não encontrou conectores TecDoc/TecRMI. A identificação manual de viaturas já existe.

**Destino sugerido:** Dados técnicos. [Fonte: Dados técnicos e integrações](https://www.carbob.pt/funcionalidades/integracoes).

## 4. Especialidades: o que muda realmente

As páginas por especialidade apresentam aplicações do mesmo conjunto funcional. Não são evidência de oito produtos independentes.

| Especialidade | Ênfase anunciada | Consequência para a RoadMesh |
|---|---|---|
| [Multimarca](https://www.carbob.pt/oficinas/mecanica-geral) | Fluxo completo de orçamento, reparação e entrega | Preset geral, combinando módulos |
| [Mecânica rápida](https://www.carbob.pt/oficinas/mecanica-rapida) | Serviços repetidos, modelos de orçamento e elevada rotação | Tempos-padrão e criação rápida |
| [Pneus](https://www.carbob.pt/oficinas/pneus) | Stock por medida/marca/tipo, montagem e campanhas sazonais | Atributos de produto e lembretes configuráveis |
| [Chapa e pintura](https://www.carbob.pt/oficinas/chapa-e-pintura) | Reparação por fases e evidências fotográficas | Estados e tarefas adaptáveis à operação |
| [Diagnóstico e eletrónica](https://www.carbob.pt/oficinas/diagnostico-eletronica) | Códigos de erro, notas e histórico técnico | Registo estruturado; não implica ligação ao equipamento OBD |
| [Vidro](https://www.carbob.pt/oficinas/vidro) | Tipo de intervenção, agenda e fotografias | Modelos de serviço; menção a ADAS não prova integração com máquinas |
| [Concessionários](https://www.carbob.pt/oficinas/concessionarios) | Organização do pós-venda | A página diz complementar o DMS; não prova gestão comercial de stand |
| [Redes e várias localizações](https://www.carbob.pt/oficinas/multi-localizacao) | Controlo por unidade, permissões e comparação de desempenho | Distinguir filial da mesma organização de empresas independentes |

Para Stand, ainda precisamos de especificação própria para compras, inventário de viaturas, oportunidades comerciais, reservas, vendas e pós-venda. A página de concessionários não basta para definir essas funções. Também não encontrei uma oferta pública explicitamente dedicada a Detailer; checklists, pacotes e fases desse preset terão de ser definidos por nós.

## 5. Preços e serviços comerciais

Valores apresentados no seletor público, sem IVA:

| Plano | Mensal | Valor mensal apresentado na opção anual |
|---|---:|---:|
| Starter | 79 € | 63 € |
| Pro | 189 € | 151 € |
| Premium | 249 € | 199 € |

A página anuncia utilizadores ilimitados. As quotas mensais de novas matrículas/SMS são 50/20, 100/50 e 200/200. O Pro acrescenta, entre outras funções, inventário, inspeção e tempos; o Premium inclui procedimentos, marketing, desempenho e satisfação. Há referências a manutenção programada e orçamentos diferidos sem detalhe operacional suficiente.

A oferta inclui migração, formação/suporte e teste anunciado de 30 dias. A contratação anual anuncia desconto de 20%; não confundir o equivalente mensal com um contrato mensal. Custos de reforços e certos serviços externos não ficam detalhados. [Fonte: preços](https://www.carbob.pt/precos).

Para a RoadMesh, manter o preço base mais módulos. Acrescentar consumos externos separadamente quando existirem: SMS, mensagens, consultas técnicas e comissões de pagamentos. Não atribuir preços a estes serviços antes de conhecer fornecedores, contratos e custos. Alterar módulos não deve reescrever documentos ou mensalidades anteriores.

A [migração](https://www.carbob.pt/migracao) é apresentada como serviço assistido: exportar, limpar/normalizar, importar e validar com a oficina, normalmente em dois a três dias úteis. Anunciam trabalho com CSV, Excel ou acesso à base de dados. Isto sugere uma frente de produto e operação para nós: importação com pré-visualização, identificação de duplicados, relatório de erros e reconciliação de totais.

A [demonstração](https://www.carbob.pt/demo) é solicitada por formulário e apresentada como sessão personalizada. A página esclarece que a compra de peças não é comercializada como produto independente. Na RoadMesh, a seleção independente de módulos pode oferecer uma alternativa comercial concreta.

## 6. Blog e biblioteca de conteúdos

O blog funciona como entrada comercial através de problemas da oficina, com ligações para funcionalidades e demonstração. Foram identificados cinco artigos publicados:

| Artigo | Tema analisado | Requisito ou orientação útil para nós |
|---|---|---|
| [Custo da hora](https://www.carbob.pt/blog/quanto-custa-a-hora-na-sua-oficina-saiba-como-calcular) | Diferença entre faturação, custo e margem | Custos reais de peças e horas por intervenção |
| [Capacidade das marcações](https://www.carbob.pt/blog/maracoes-na-oficina-quantas-cabem-realmente-no-dia) | Agenda por horas e recursos, folga e disponibilidade de peças | Capacidade real e confirmação de material |
| [Gestão da oficina](https://www.carbob.pt/blog/o-que-e-gestao-de-oficina-automovele-e-por-onde-comecar) | Continuidade entre receção, agenda, trabalho, peças e fecho | Cada espera com motivo e responsável |
| [Viaturas paradas](https://www.carbob.pt/blog/reduzir-carros-parados-na-oficina-guia-pratico) | Esperas por peças, aprovação e informação | Dias de permanência, tempo até resposta e alerta de levantamento |
| [Digitalização em 30 dias](https://www.carbob.pt/blog/software-de-gestao-ou-papel-digitalizar-a-sua-oficina-em-30-dias) | Adoção por etapas com a equipa | Entrada → OS → agenda → peças → indicadores |

Os artigos são orientações editoriais e comerciais. Não assumir que cada conselho corresponde a uma automação já implementada. Por exemplo, recomendar confirmação de peças antes de agendar não demonstra bloqueio automático da reserva por falta de material.

As categorias encontradas foram [Gestão da Oficina](https://www.carbob.pt/blog/categoria/gestao-da-oficina) e [Digitalização de Oficinas](https://www.carbob.pt/blog/categoria/digitalizacao-de-oficinas). A primeira mostra também o artigo da segunda categoria. Há repetição do artigo destacado.

A biblioteca [Carros](https://www.carbob.pt/carros) apresenta informação por marca/modelo/versão, especificações, problemas, mercado de usados e guias de compra. É uma estratégia de atração por pesquisas específicas. As fichas da amostra repetem um parágrafo genérico sobre condução e materiais de competição em veículos muito diferentes; por isso, volume de conteúdo não deve ser confundido com revisão técnica. Não foram validados preços de usados, impostos ou alegações mecânicas dessas fichas.

Para a RoadMesh, um site comercial com páginas por funcionalidade, por tipo de negócio, preços/configuração, demonstração, migração e conteúdos úteis faz sentido. Uma biblioteca de centenas de veículos só deve avançar com origem de dados, revisão e atualização definidas. Não é necessária para concluir o núcleo operacional.

## 7. Site institucional, aquisição e confiança

- **Página inicial:** organiza a proposta em tarefas da oficina e conduz para teste/demonstração. A mensagem liga rapidez do orçamento, visibilidade do trabalho e comunicação. [Início](https://www.carbob.pt/).
- **Índices:** páginas de funcionalidades e oficinas dão acesso às capacidades e aplicações por especialidade. Para nós, separar “o que faz” de “para quem serve” ajuda a explicar os módulos. [Funcionalidades](https://www.carbob.pt/funcionalidades), [oficinas](https://www.carbob.pt/oficinas).
- **Comparação:** posiciona a plataforma face a ERP, SaaS genérico e folhas de cálculo. É comparação comercial produzida pelo vendedor, sem demonstração independente de cada concorrente. [Alternativas](https://www.carbob.pt/alternativas).
- **Empresa:** apresenta equipa, experiência e proximidade às oficinas. Não foi feita verificação biográfica externa. [Sobre nós](https://www.carbob.pt/sobre-nos).
- **Contacto:** telefone, email, localização e formulário. Foi observado o formulário, sem envio. [Contacto](https://www.carbob.pt/contacto).
- **Demonstração e testemunhos:** reforçam a conversão, com exemplos e depoimentos publicados pelo fornecedor; não equivalem a estudos independentes de resultados. [Demo](https://www.carbob.pt/demo).
- **Termos e privacidade:** identificam a entidade e apresentam regras de tratamento de dados e utilização. Os termos publicados indicam aviso de 30 dias para preços e retenção de 30 dias após rescisão, com ressalvas. São condições publicadas, sem auditoria de conformidade ou teste da aplicação. [Legal](https://www.carbob.pt/legal).

Na nossa operação comercial, deve existir um percurso consistente: descobrir a função → perceber o benefício → escolher módulos → conhecer preço/limites → experimentar ou pedir demonstração → importar dados e começar.

## 8. Inconsistências e capacidades não confirmadas

| Ponto | Evidência pública | Como tratar no planeamento |
|---|---|---|
| Teste gratuito | Páginas gerais anunciam 30 dias; FAQs de algumas especialidades dizem 14 | Não assumir condição comercial uniforme |
| Faturação | Página inicial/comparação falam em faturação certificada; página específica descreve ligação a software externo | Não concluir que existe motor fiscal próprio ou certificação verificada |
| Distribuidores | Integrações e stocks dizem “em desenvolvimento”; outras páginas sugerem encomenda direta | Separar encomenda interna de integração com fornecedor |
| Migração | Texto geral simplifica a rapidez; página própria detalha dois a três dias úteis | Distinguir configuração inicial de migração completa |
| Duração da demo | Há referências distintas entre páginas; página própria indica sessão de uma hora, normalmente 30–45 minutos | Usar a condição específica e confirmar numa contratação |
| Blog | Três URLs ligadas pelos artigos devolvem 404 | Inventário conserva os endereços e o resultado observado |
| Biblioteca | Parágrafos genéricos repetidos na amostra | Exigir revisão editorial em conteúdo semelhante nosso |

Fontes para confronto: [início](https://www.carbob.pt/), [multimarca](https://www.carbob.pt/oficinas/mecanica-geral), [integrações](https://www.carbob.pt/funcionalidades/integracoes), [faturação](https://www.carbob.pt/funcionalidades/integracao-faturacao), [migração](https://www.carbob.pt/migracao), [demo](https://www.carbob.pt/demo).

Não ficaram confirmados nas páginas consultadas: API pública documentada e webhooks para terceiros; aplicação nativa publicada em lojas e funcionamento offline; fornecedores concretos de pagamentos/faturação e respetivas condições; assinatura e imutabilidade dos relatórios de receção; política operacional detalhada de backups/restauro e disponibilidade; CRM comercial de stand; funcionalidades específicas de detailer. Isto significa **falta de confirmação pública**, não ausência comprovada no produto.

Também não foi demonstrada leitura direta de códigos por equipamentos de diagnóstico, controlo de máquinas ADAS, integração com seguradoras ou uma fonte auditada para a avaliação de usados.

## 9. Catálogo proposto para discussão

| Módulo comercial | Âmbito | Relação com o catálogo atual |
|---|---|---|
| Base de dados | Clientes, viaturas, pesquisa, histórico e importação | Manter |
| Receção de veículos | Condição inicial, fotografias, danos e relatório | Manter e concluir |
| Orçamentos | Propostas, versões e aprovação | Possível separação de Ordens de serviço |
| Ordens de serviço | Tarefas, execução, materiais, estados e quadro | Manter e aprofundar |
| Stocks e encomendas | Produtos, fornecedores, quantidades e compras | Manter |
| Agenda e capacidade | Recursos, horários e marcações | Possível separação de Notificações |
| Inspeção e diagnóstico | Checklist técnica, evidências e recomendações | Novo âmbito explícito |
| Equipa técnica e tempos | Trabalho atribuído e horas reais | Novo âmbito explícito |
| Comunicações | Modelos, eventos, envios e lembretes | Aprofundar Notificações |
| Reservas online | Widget e marcação pública por disponibilidade | Separar da agenda interna |
| Pagamentos e conta corrente | Saldos, parciais, cobrança e conciliação | Separar capacidade financeira |
| Integração com faturação | Conector externo e sincronização | Escopo específico |
| Relatórios | Métricas operacionais e financeiras | Expandir bases existentes |
| Dados técnicos | Matrícula/VIN, peças, tempos e procedimentos licenciados | Conectores externos |
| Marketing e satisfação | Segmentação, campanhas e avaliação pós-serviço | Validar detalhe antes de construir |
| Multi-localização | Unidades, permissões e visão consolidada | Distinguir de isolamento entre empresas |

Esta tabela é uma proposta de organização, não exige criar dezasseis módulos já. Pode haver famílias visuais para simplificar o configurador, mantendo ativação e preços individuais.

Conta, autenticação, permissões, tema, isolamento entre empresas e auditoria essencial pertencem à plataforma comum. O portal é uma superfície que apresenta apenas funções autorizadas; não deve desbloquear módulos por si só.

A identificação mínima de cliente/viatura numa receção ou OS deve funcionar sem conceder acesso à gestão completa da Base de dados. Se Orçamentos estiver desativado, uma OS poderá continuar a ser criada diretamente. Se Comunicações estiver desativado, um relatório de receção continua disponível para download. Se Stocks estiver desativado, uma OS pode ter linhas de material sem movimentar inventário.

Desativar módulos deve preservar registos e referências. Falta decidir se o histórico fica consultável em modo de leitura e em que condições. Filhos/filiais da mesma empresa exigem regras diferentes de empresas independentes.

## 10. Sequência de desenvolvimento sugerida

1. **Fechar o núcleo operacional:** receção com evidências e relatório; fichas; orçamento com versões e aprovação; OS com estados e responsáveis; material associado.
2. **Organizar a execução:** agenda por capacidade, quadro de trabalho, inspeções e tempos da equipa. Só apresentar métricas quando os eventos de origem forem fiáveis.
3. **Automatizar relação e cobrança:** envios com registo e recuperação de falhas, reservas públicas, pagamentos e ligação à faturação. A seleção de fornecedores pode começar em paralelo.
4. **Expandir:** dados técnicos licenciados, redes, campanhas/satisfação e conteúdos comerciais.

Não é uma estimativa de prazo. Antes de comprometer datas, cada módulo precisa de critérios de aceitação, cenários de falha e dependências externas definidos.

## 11. Decisões para a próxima conversa

- Confirmar se Orçamentos e Agenda passam a módulos próprios ou continuam incluídos nas famílias atuais.
- Na receção, fechar fotos obrigatórias, combustível/quilómetros, checklist, assinatura e registo da entrega.
- Escolher os primeiros canais de comunicação e o fornecedor de faturação/pagamentos.
- Definir as funções comerciais específicas de Stand e os serviços/checklists de Detailer.
- Decidir o acesso ao histórico de módulos desativados e a regra comercial para consumos externos.

## 12. Base de comparação local

Leitura dirigida: catálogo em `frontend/src/core/auth/company-features.ts`; orçamentos, ordens, documentos e resumos em `backend/server.py`; operações de stock/financeiras em `backend/roadmesh/modules/operations/service.py`; marcações em `backend/roadmesh/modules/portal/routes.py`; partilha manual em `frontend/src/shared/utils/documents.ts`; especificações em `docs/PROPOSTA-MODULOS.md`.

“Existe base” não significa equivalência funcional testada. Não foram feitas alterações à aplicação, dados locais ou configuração de módulos por causa desta análise. Os documentos foram preparados localmente na branch `UI-empresarios-digo`, sem commit ou publicação.

