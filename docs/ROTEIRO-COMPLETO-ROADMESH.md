# RoadMesh - roteiro completo até ao lançamento
## Guia de execução para as áreas web, aplicações móveis e integrações

**Versão:** 1.0  
**Preparado em:** 8 de novembro de 2026  
**Estado:** plano de trabalho; não representa funcionalidades todas concluídas nem fornecedores contratados.  
**Regra atual:** desenvolvimento local na branch UI-empresarios-digo. Sem commits, publicação, adesões ou contratos sem instrução expressa.

## 1. Como começar sem ter de saber programar

O teu trabalho principal é decidir o funcionamento do negócio, experimentar os percursos e falar com clientes e fornecedores. O desenvolvimento pode ser feito comigo e com os profissionais necessários. Não precisas de aprender a programar antes de começar.

Para cada fase deste guia:
1. Lê o objetivo e faz as decisões indicadas na parte "Tu".
2. Dá-me essas decisões para transformar em páginas, regras e testes.
3. Experimenta com dados fictícios e aponta o que não corresponde à realidade.
4. Avança quando os critérios de conclusão estiverem cumpridos, e não apenas quando o ecrã parecer terminado.

Um problema encontrado volta à lista de trabalho. Uma função só fica concluída quando a pessoa certa consegue completar a tarefa, os dados ficam corretos e os restantes utilizadores não recebem acessos indevidos.

**Primeiras cinco ações, pela ordem:**
1. Escolher uma oficina, um stand e um detailer para ajudar a validar o funcionamento. Começar os primeiros testes com dados fictícios.
2. Definir exatamente o que cada perfil pode consultar e alterar.
3. Fechar a lista de páginas das três áreas: administrador, empresa e cliente final.
4. Validar o percurso principal de uma oficina: receção, orçamento, aprovação, trabalho, entrega e pagamento.
5. Preparar uma apresentação curta da RoadMesh e começar a pedir informação sobre dados de peças e faturação. A pesquisa comercial começa em paralelo; a contratação pode esperar pelas propostas e pelo orçamento.

Este guia propõe uma ordem e decisões iniciais. Não impõe uma data de lançamento nem um orçamento fictício.

## 2. O que existe e o que ainda não está terminado

O projeto já tem uma aplicação baseada em Expo/React Native, áreas de administração, empresa e cliente final, autenticação, temas e bases de vários módulos. Há configuração inicial de builds móveis. Isto permite reaproveitar trabalho entre web e telemóvel, mas não comprova que duas aplicações móveis estejam prontas.

O catálogo local tem 16 módulos selecionáveis na criação/edição de empresas, com preços individuais e presets editáveis. Existem percursos de clientes, viaturas, serviços, stocks, documentos e marcações; também bases de registo para os módulos mais recentes.

Continuam por fechar, entre outros: a receção completa por visita com fotografias, versões e aprovação remota de orçamentos, agenda por capacidade, quadro operacional, checklists técnicas completas, automações, reservas públicas e relatórios de gestão aprofundados. Há páginas preparatórias de fornecedores; não são integrações reais.

A parte de Stand tem implementação anterior de inventário, contactos e vendas. É necessário harmonizá-la com o novo modelo modular e confirmar que não fica escondida ou dependente do preset. Detailer precisa de definição funcional própria, e não apenas de mudar o nome de uma oficina.

Documentos de base:
- [Estado real dos produtos](ESTADO-PRODUTOS.md).
- [Requisitos funcionais levantados](analise-carbob/REQUISITOS.md).
- [Pendências externas, contactos e contratos](PENDENCIAS-EXTERNAS.md).

As verificações anteriores são uma base, não uma certificação de que alterações futuras, aplicações móveis ou integrações de produção já funcionam.

## 3. Mapa da ordem de execução

| Ordem | Frente principal | Resultado necessário para avançar |
|---|---|---|
| 0 | Escopo, perfis e piloto | Decisões de negócio e lista de percursos aprovadas |
| 1 | Linguagem visual comum | Componentes e estados consistentes nos dois temas |
| 2 | Área do administrador | Empresas, módulos, preços e acessos geridos de ponta a ponta |
| 3 | Área da empresa | Navegação e páginas adequadas às funções contratadas |
| 4 | Área do cliente final | Acesso apenas aos próprios veículos e serviços |
| 5 | Funcionalidades completas | Percurso real e dados coerentes entre os módulos |
| 6 | Aplicação das empresas | Trabalho no telemóvel/tablet testado em dispositivos |
| 7 | Aplicação dos clientes finais | Acompanhamento, decisões e marcações no telemóvel |
| 8 | Integrações reais | Fornecedores escolhidos, acordos e ligações validados |
| 9 | Operação e segurança | Recuperação, suporte e regras de dados ensaiados |
| 10 | Piloto e correções | Utilização real controlada e problemas críticos resolvidos |
| 11 | Publicação e lançamento | Aplicações e serviços aprovados para uso comercial |
| 12 | Operação contínua | Atualizações, custos, suporte e qualidade acompanhados |

**Há trabalhos em paralelo:** contactos/licenças, entidade comercial, domínios e preparação das contas das lojas devem começar cedo. Não esperar pelo fim das aplicações para descobrir que falta autorização para utilizar os dados. Uma integração pode ser validada antes da fase 8 se os respetivos percursos já estiverem estáveis.

As fases 2 a 4 fecham a experiência e o funcionamento básico das áreas. A fase 5 aprofunda os produtos e pode obrigar a ajustar páginas anteriores. Terminar as views não significa congelar para sempre a interface.

## 4. Fase 0 - decidir o funcionamento do negócio

**Objetivo:** evitar desenvolver páginas para regras ainda contraditórias.

**Tu:**
1. Indicas os três tipos de negócio iniciais e um exemplo real de cada um.
2. Listas as funções do administrador RoadMesh, do responsável da empresa, do funcionário e do cliente final.
3. Decides quais produtos entram na primeira versão comercial e quais ficam numa versão seguinte. O catálogo pode conter todos, sem os anunciar todos como prontos.
4. Definis como é atribuída uma conta: convite da empresa, registo aberto ou ambos.
5. Decides se um cliente final pode usar a mesma conta em várias oficinas. A proposta é uma identidade com relações separadas por empresa; exige trabalho específico no modelo atual.
6. Decides o que acontece quando um cliente muda de oficina ou um veículo muda de proprietário. Não dar automaticamente a uma pessoa todo o histórico de outra.
7. Definis o acesso a registos antigos quando um módulo é desativado: consulta, exportação e eventual reativação.

**Desenvolvimento comigo:** transformar estas decisões numa matriz de permissões e num mapa de percursos. Identificar as alterações necessárias ao modelo existente antes de multiplicar aplicações.

**Entregáveis:** lista de produtos da primeira versão; matriz perfil/ação; mapa de páginas; lista de decisões abertas; empresas piloto propostas.

**Concluído quando:** consegues explicar quem faz o quê e não há duas respostas diferentes para a mesma situação.

## 5. Fase 1 - terminar a visualização comum

**Objetivo:** uma aplicação com a mesma linguagem visual, sem buracos quando muda o perfil, o tamanho do ecrã ou os módulos.

**Como fazer:**
1. Rever cabeçalhos, navegação, conta, pop-ups, formulários, listas e páginas de detalhe.
2. Uniformizar tamanhos de texto, espaçamentos, botões, ícones, estados e mensagens.
3. Rever modo claro e escuro em cada tipo de componente, incluindo erro, aviso, seleção e desativação.
4. Definir regras para computador, tablet e telemóvel. Testar larguras reais e texto aumentado.
5. Prever carregamento, ausência de dados, erro de rede, acesso recusado e operação em curso.
6. Usar estados vazios com uma explicação e uma ação útil. Não usar números inventados para encher dashboards.
7. Confirmar que um módulo desativado desaparece da navegação e que os restantes ocupam o espaço disponível.
8. Garantir que cabeçalhos e botões fixos não tapam conteúdo ou teclado.
9. Testar teclado, foco, contraste e nomes acessíveis dos controlos.

**Tu:** aprovas exemplos de cada tipo de página nos dois temas e em dois tamanhos de ecrã.

**Desenvolvimento comigo:** corrigir componentes comuns primeiro e rever os ecrãs que os usam.

**Concluído quando:** os mesmos elementos não mudam de comportamento sem motivo e todas as páginas têm uma resposta útil para os estados principais.

## 6. Fase 2 - terminar a área do administrador

O administrador gere a relação da RoadMesh com as empresas. Não é o gestor do trabalho diário de todas as oficinas.

| Página ou percurso | O que deve permitir | Verificação de conclusão |
|---|---|---|
| Início | Resumo por mês/ano, recebimentos, assistência e empresas | Períodos e valores conferidos com os registos |
| Lista de empresas | Pesquisar e filtrar por estado | Filtros não omitem ou misturam empresas |
| Criar empresa | Identificação, contactos, módulos, preço e responsável | Criação completa, erros úteis e acesso inicial entregue |
| Editar empresa | Alterar dados e contrato futuro | Não alterar meses já faturados |
| Presets | Nome e combinação de módulos editáveis | Aplicar substitui a seleção; editar não reescreve contratos |
| Perfil da empresa | Dados, acessos, módulos, avenças e assistência | Só informação necessária e ações coerentes |
| Utilizadores | Convidar, retirar acesso e gerir responsável | Sessões antigas deixam de dar acesso quando aplicável |
| Mensalidades | Base, módulos e consumos, se existirem | Histórico preservado e data de efeito identificada |
| Estado da empresa | Desativação e processo de encerramento | Consequências claras e registos preservados conforme a regra |
| Suporte | Entrar num contexto de assistência autorizado | Acesso limitado, identificado e auditado |
| Conta RoadMesh | Perfil, palavra-passe e sessão | Recuperação e saída testadas |

**Como executar:**
1. Começar por uma empresa fictícia e um responsável fictício.
2. Criar a empresa com um único módulo; repetir com uma combinação pequena e com todos os módulos.
3. Editar base e preço de um módulo e conferir o total. Verificar períodos anteriores.
4. Trocar de preset e confirmar que não se acumulam seleções antigas.
5. Revogar um acesso e tentar usá-lo numa sessão que já estava aberta.
6. Desativar e reativar uma empresa de teste, de acordo com as ações efetivamente suportadas.
7. Rever separadamente o processo de encerramento definitivo; não o confundir com desativação temporária.

**Tu:** decides preços, condições comerciais, limites do suporte e regras de encerramento.

**Concluído quando:** consegues gerir uma empresa do início ao fim sem alterar diretamente a base de dados e sem precisar de conhecer termos de programação.

## 7. Fase 3 - terminar a área da empresa

A empresa precisa de ver apenas o que pode usar. O responsável pode ter acesso a custos e utilizadores que um funcionário não tem.

**Páginas a fechar:**
- Início adaptado aos módulos e ao perfil.
- Clientes e viaturas, com pesquisa e relações corretas.
- Receções e estado inicial por visita.
- Orçamentos e decisões do cliente.
- Ordens de serviço e quadro de trabalho.
- Agenda e disponibilidade.
- Stocks, fornecedores, encomendas e receções de material.
- Inspeções e recomendações.
- Trabalho da equipa e tempos.
- Comunicações e reservas.
- Documentos, pagamentos e relatórios, para quem tiver autorização.
- Unidade/localização, quando aplicável.
- Configurações e acessos da empresa.

**Como executar:**
1. Criar uma empresa de teste com um responsável e um funcionário.
2. Validar o percurso de receção até entrega primeiro com o responsável.
3. Repetir com o funcionário e confirmar o que deve ficar oculto ou bloqueado.
4. Desativar módulos individualmente e por combinações. Testar também acesso por URL guardado.
5. Ligar cada ação ao respetivo resultado: criar, consultar, editar, concluir e encontrar no histórico.
6. Decidir como a empresa cria uma referência mínima de cliente/veículo quando não contrata a gestão completa da Base de dados.
7. Rever referências entre produtos: uma OS não deve obrigar a comprar Stocks para registar uma peça manual; um relatório de receção não deve exigir Comunicações para ser descarregado.

**Stand:** rever inventário de viaturas, custos autorizados, contactos comerciais, reservas, venda e pós-venda. Ligar o funcionamento anterior às capacidades atuais. Definir se Gestão de vendas de viaturas será um módulo autónomo antes de mudar o catálogo.

**Detailer:** definir pacotes, serviços, etapas, tempo previsto, fotografias antes/depois e consumíveis. Identificar o que é configuração dos módulos existentes e o que exige uma capacidade nova.

**Concluído quando:** os três tipos de empresa têm percursos compreensíveis e as funções não dependem de o preset ter um nome específico.

## 8. Fase 4 - terminar a área do cliente final

O cliente final é o cliente da oficina/stand/detailer. Não deve ver a administração RoadMesh, outros clientes ou notas internas da equipa.

| Página ou percurso | Conteúdo esperado |
|---|---|
| Entrada e recuperação | Convite/registo definido, login e recuperação |
| Início | Próxima marcação, serviço em curso e ações pendentes reais |
| Empresas associadas | Escolher a empresa, se adotarmos conta para várias empresas |
| Veículos | Apenas viaturas a que tem acesso |
| Detalhe do veículo | Dados e histórico autorizados, sem informação de terceiros |
| Orçamento | Versão, trabalhos, valores e decisão explícita |
| Acompanhamento | Estado do serviço e prazo comunicado pela empresa |
| Marcações | Pedido, confirmação, reagendamento e cancelamento |
| Documentos e pagamentos | Apenas documentos e cobranças da sua relação com a empresa |
| Conta e preferências | Contactos, palavra-passe, notificações e encerramento da conta |

**Como executar:**
1. Criar dois clientes de teste na mesma oficina e um noutra.
2. Confirmar que nenhum consegue abrir dados do outro alterando um endereço ou identificador.
3. Testar uma viatura com histórico e outra sem registos.
4. Testar convite expirado, orçamento substituído, marcação cancelada e documento indisponível.
5. Se houver várias empresas por conta, testar a mudança de contexto sem misturar históricos.
6. Decidir que fotografias e textos são partilhados. Notas internas não passam para o cliente por defeito.
7. Garantir que terminar sessão e voltar atrás no navegador não recupera conteúdo privado.

**Concluído quando:** um cliente consegue completar as suas tarefas sem ajuda e sem conhecer o funcionamento interno da empresa.

## 9. Fase 5 - concluir os produtos, por dependências

Não construir todos ao mesmo tempo. A ordem abaixo cria primeiro os dados que os produtos seguintes vão usar.

### 9.1 Núcleo: Base de dados, Receção, Orçamentos e OS

1. Fechar referências de cliente e viatura, pesquisa e duplicados.
2. Criar uma receção por visita: data, quem recebeu, quilómetros, combustível e pedido inicial.
3. Associar fotografias e danos a essa visita concreta; definir fotos mínimas e correções.
4. Gerar um relatório de receção completo e disponível para consulta/download.
5. Criar orçamento discriminado com peças, trabalho, validade e versão.
6. Guardar a versão enviada; alterações relevantes exigem nova decisão do cliente.
7. Implementar aprovação/recusa com identificação da decisão e ligação protegida.
8. Converter o aprovado numa única OS, sem duplicar peças ou trabalho.
9. Definir tarefas, responsáveis, estados, bloqueios, conclusão, entrega e reabertura.
10. Preservar o histórico de alterações relevantes.

**Teste de fecho:** receber uma viatura fictícia, documentá-la, obter aprovação de um orçamento, executar, concluir e entregar. Repetir com recusa e trabalho adicional.

### 9.2 Operação: Stocks, Agenda, Inspeção e Tempos

1. Stocks: distinguir físico, reservado e disponível; tratar entradas parciais, devoluções e ajustes.
2. Consumir material uma única vez, no momento acordado, e justificar correções.
3. Agenda: configurar técnicos/postos, horários, pausas, duração e indisponibilidades.
4. Impedir sobreposição real do mesmo recurso, incluindo reservas simultâneas.
5. Quadro: mostrar o estado, responsável, motivo de espera e próxima ação.
6. Inspeção: checklist com vários pontos, evidências e recomendações por componente.
7. Transformar recomendação em trabalho proposto, sujeito a aprovação.
8. Tempos: atribuição de tarefas, iniciar/parar, pausas, correções justificadas e ligação à OS.
9. Separar tempo efetivo de trabalho de dias de permanência da viatura.

**Teste de fecho:** peça recebida parcialmente; trabalho parado por falta de material; dois pedidos para a mesma vaga; técnico interrompido; recomendação recusada. Os resultados devem ficar coerentes em todas as páginas.

### 9.3 Relação: Comunicações e Reservas online

1. Definir eventos que geram mensagens e quem é o destinatário.
2. Preparar modelos e preferências por canal.
3. Implementar fila, entrega/falha, repetição controlada e prevenção de duplicados.
4. Cancelar lembretes de marcações canceladas ou reagendadas.
5. Construir reserva pública no site da empresa, com serviço e disponibilidade reais.
6. Proteger os formulários contra abuso e evitar recolher informação desnecessária.
7. Permitir confirmação/cancelamento através de ligações adequadas.
8. Quando o serviço externo estiver em falta, mostrar a indisponibilidade sem simular envio.

**Teste de fecho:** pedido fora de horas, duas pessoas a tentar a mesma vaga, falha de envio e reagendamento após o lembrete já estar preparado.

### 9.4 Fecho: Pagamentos, Faturação e Relatórios

1. Separar valor previsto, faturado, recebido e por receber.
2. Registar pagamentos parciais e devoluções com origem e referência.
3. Ligar o prestador de pagamentos e validar notificações repetidas ou atrasadas.
4. Ligar a OS ao fornecedor fiscal escolhido, sem emitir duas vezes.
5. Tratar falhas, correções e estado do documento.
6. Calcular indicadores a partir de eventos e custos reais.
7. Definir margem, receita, recebimento, conversão e produtividade com fórmulas aprovadas.
8. Exportar período e filtros, respeitando as permissões.

**Teste de fecho:** cobrança parcial, cobrança repetida, cliente que pagou mas a notificação chegou depois, emissão rejeitada e correção posterior. Não corrigir documentos fiscais apenas apagando linhas locais.

### 9.5 Expansão: Dados técnicos, Marketing, Satisfação e Rede

- Dados técnicos: consulta licenciada, identificação, referência e origem; correção manual e limites de consumo.
- Marketing: segmentos reais, preferências, revisão de conteúdo, envio e resultado.
- Satisfação: avaliação ligada à visita e acesso às respostas.
- Multi-localização: associar pessoas e registos a unidades e consolidar apenas o que cada perfil pode ver.

**Concluído quando:** os critérios específicos do produto estão cumpridos. Ter uma ficha de unidade ainda não conclui permissões e relatórios de uma rede.

## 10. Fase 6 - aplicação móvel para as empresas/equipas

**Proposta inicial:** RoadMesh Empresas, nome a confirmar. Uma aplicação para responsáveis, rececionistas e técnicos, com funções diferentes por perfil. Não é obrigatório começar por três aplicações profissionais separadas.

**O que aproveitar:** a base Expo/React Native e as regras comuns existentes. Manter o mesmo serviço central de dados para web e apps; não criar uma base independente em cada aplicação.

**Tu:**
1. Escolhes os primeiros equipamentos reais de teste: pelo menos um Android e um iPhone; acrescentar tablet se for usado na receção.
2. Indicas os trabalhos feitos junto à viatura e os feitos ao balcão.
3. Decides o que deve ser possível sem rede e o que deve esperar por ligação.
4. Confirma nome, ícone e entidade titular da aplicação.

**Desenvolvimento comigo:**
1. Separar o ponto de entrada e as permissões da app profissional.
2. Rever navegação com uma mão, alvos de toque, teclado e câmara.
3. Fechar receção/fotografia, consulta da OS, tarefas e cronómetro.
4. Preparar envio de imagens com progresso, recuperação e identificação de falhas.
5. Definir rascunhos locais e sincronização. Não aplicar movimentos de stock ou cobranças repetidas por causa de uma recuperação de rede.
6. Garantir que mudança de conta/saída não deixa dados de outro utilizador no dispositivo.
7. Preparar notificações e abertura da página certa ao tocar numa mensagem.
8. Produzir uma versão instalável de testes para cada plataforma.
9. Testar em dispositivos reais; uma janela web pequena não substitui esse ensaio.

O Expo documenta variantes e configurações para distinguir versões/identificadores. Isso é uma ferramenta de organização; a separação entre as duas apps e os seus públicos continua a precisar de implementação e teste. [S1]

**Concluído quando:** um técnico consegue consultar trabalho, registar evidências e tempos num telemóvel real e recuperar de uma falha de rede sem perder ou duplicar operações.

## 11. Fase 7 - aplicação móvel dos clientes finais

**Proposta inicial:** RoadMesh Clientes, nome a confirmar. Uma única app pode servir os clientes das várias empresas; essa relação deve ser resolvida antes na identidade e nas permissões.

**Tu:** validas as ações principais de um cliente, o processo de convite/adesão e que informações cada empresa pode partilhar.

**Desenvolvimento comigo:**
1. Usar a área de cliente como base, com navegação própria para telemóvel.
2. Implementar seleção de empresa quando aplicável e acesso aos próprios veículos.
3. Mostrar decisões pendentes, orçamento e versão, progresso e próxima marcação.
4. Ligar aprovação, pedido de marcação e documentos aos mesmos registos usados na web.
5. Integrar pagamento de serviços quando o fornecedor e a empresa estiverem preparados.
6. Definir preferências e notificações sem expor dados privados no ecrã bloqueado.
7. Testar a abertura de uma notificação para um orçamento já alterado ou uma sessão terminada.
8. Preparar recuperação de conta e processo de encerramento/eliminação adequado.

Para notificações push, será necessário configurar a entrega e gerir os dispositivos registados. O Expo tem documentação para o serviço e para notificações enviadas diretamente pelos canais das plataformas; escolher a via na implementação. Testar entrega em equipamentos reais e remover destinos que deixaram de estar válidos. [S2]

**Concluído quando:** um cliente recebe um convite, entra, encontra o seu veículo, toma uma decisão, pede uma marcação e consulta o resultado sem ver dados de outra pessoa.

## 12. Fase 8 - integrações: o que são e como avançar

Uma integração é uma ligação entre a RoadMesh e um serviço externo. Ter documentação pública não significa que já exista autorização de utilização comercial.

### 12.1 O procedimento para qualquer fornecedor

1. **Descrever a necessidade:** que tarefa queremos automatizar e em que aplicação.
2. **Escolher candidatos:** começar com dois ou três, sem contratar todos.
3. **Contactar o departamento certo:** comercial/parcerias para condições; equipa técnica para confirmar a ligação.
4. **Pedir proposta escrita:** âmbito, direitos, limites, preço, duração, suporte e saída.
5. **Pedir acesso de testes:** com dados fictícios e sem operações financeiras reais.
6. **Comparar e decidir:** custo total e adequação, não apenas o preço de entrada.
7. **Rever o acordo:** contabilista/jurídico quando envolver obrigações fiscais, pagamentos ou dados pessoais.
8. **Contratar apenas quando autorizado:** confirmar quem é titular da conta e quem paga.
9. **Entregar acesso técnico em privado:** nunca colar chaves ou palavras-passe neste documento.
10. **Implementar e ensaiar:** sucesso, falha, repetição, cancelamento e perda de acesso.
11. **Ativar num piloto controlado:** uma empresa primeiro e observação dos resultados.
12. **Expandir:** apenas depois de conferir dados, custos e suporte.

### 12.2 Mapa de integrações por destino

| Integração | Onde aparece | Quem deve receber/autorizar |
|---|---|---|
| Email | Web e duas apps | Remetentes/domínios autorizados |
| SMS/WhatsApp | Avisos, lembretes e decisões | Empresa/número/remetente conforme modelo contratado |
| Push | Duas apps móveis | Utilizador e dispositivos corretos |
| Matrícula/VIN | Identificação na área da empresa | Conta/licença RoadMesh ou da empresa, conforme contrato |
| Catálogo de peças | Orçamento, OS e compra | Licença que permita o uso pretendido |
| Dados técnicos | Diagnóstico e planeamento | Utilizadores/empresas abrangidos pela licença |
| Distribuidores | Stocks e encomendas | Relação comercial de cada oficina |
| Faturação | Documentos da empresa | Conta fiscal da própria empresa |
| Pagamentos da reparação | Cliente paga à empresa | Comerciante e conta de liquidação da empresa |
| Subscrição RoadMesh | Empresa paga à RoadMesh | Conta comercial da RoadMesh |
| Armazenamento e cópias | Fotografias e dados de todas as áreas | Entidade RoadMesh, com contratos adequados |

Não é necessário contratar a mesma integração três vezes por existirem três interfaces. O servidor pode centralizar a ligação, mas o contrato pode exigir contas/licenças por empresa ou utilizador.

### 12.3 Email, SMS, WhatsApp e push

**Email:** escolher um serviço transacional, confirmar titular do domínio, verificar remetentes e pedir autorização adequada para envio. Fechar primeiro recuperação de acesso, convites e avisos operacionais. Campanhas comerciais são uma frente distinta.

**SMS:** pedir cobertura Portugal, regras do remetente, custo por segmento, comprovativos de entrega e possibilidade de respostas. Comparar consumos previstos e limites. Orientações de um fornecedor são um ponto de partida, não uma proposta já aceite. [S3]

**WhatsApp:** decidir se cada empresa usa o seu número. Pedir ao fornecedor o processo de adesão de múltiplas empresas, modelos de mensagens, custos, propriedade do número e saída. Abrir a app WhatsApp para partilhar um texto é diferente de enviar automaticamente pela plataforma. [S4]

**Push:** definir credenciais por app/plataforma, autorização do utilizador, associação ao dispositivo e destino da notificação. A mesma conta não deve receber avisos de uma empresa a que deixou de ter acesso. [S2]

**Entregável:** grelha de eventos, destinatários, canais, custos e regras de repetição; depois, prova de envio/entrega/falha nos testes.

### 12.4 Faturação e pagamentos

**Faturação:** começar por um fornecedor com integração documentada e oferta adequada a várias empresas. O Moloni é um candidato de pesquisa, não uma escolha feita; a documentação distingue desenvolvimento e acesso das contas dos clientes. Pedir condições de parceria, testes e planos necessários. Confirmar o programa/versão na consulta oficial e validar o modelo com contabilista. [S5] [S6]

**Pagamentos:** pedir proposta para dois fluxos diferentes: subscrição RoadMesh e serviços pagos às oficinas. A SIBS tem documentação para métodos e ligações de pagamento, mas o contrato concreto, as contas dos comerciantes e a elegibilidade têm de ser confirmados. [S7]

Perguntar: quem é o comerciante, quem recebe, documentação exigida, comissões, prazos de liquidação, recorrência, reembolsos, disputas e falhas. Não juntar o dinheiro de todas as oficinas numa conta RoadMesh por simples decisão de programação.

**Regra para as apps:** pagamento de uma reparação física e compra de uma subscrição digital não devem ser tratados como a mesma situação nas regras das lojas. Antes de vender módulos dentro de uma app, validar o modelo de distribuição e cobrança nas regras atuais de cada loja. Não presumir uma isenção geral para a RoadMesh. [S8]

## 13. Peças OEM e marcas: o caminho explicado

### 13.1 Separar as necessidades

| Informação | Para que serve | O que não resolve por si só |
|---|---|---|
| Matrícula/VIN e identificação | Saber que veículo/variante está em causa | Não garante a peça exata nem dados do proprietário |
| Referência OE/OEM | Identificar uma peça de origem | Não dá autorização para redistribuir catálogos |
| Aplicações e equivalências | Procurar peças compatíveis ou alternativas | Não demonstra stock nem desconto da oficina |
| Catálogo original/ilustrações | Escolher peças do fabricante com contexto | Não garante API/incorporação no nosso software |
| Informação de reparação | Tempos, manutenção, esquemas e procedimentos | Não substitui formação e responsabilidade técnica |
| Preço, stock e compra | Encomendar ao fornecedor real | Depende da relação comercial da oficina |

No contexto desta RoadMesh, OEM/OE refere-se à origem/fabricante e às referências. VIN identifica o veículo; matrícula/VRM pode alimentar um serviço de identificação. São peças de um processo, não uma única base universal.

### 13.2 Via A - fornecedor especializado de dados

**Quando faz sentido:** procurar cobertura de várias marcas e uma integração utilizável dentro do nosso produto.

A TecAlliance apresenta dados TecDoc e soluções de identificação. TecRMI disponibiliza serviços de informação técnica. São candidatos para uma conversa comercial sobre incorporação no SaaS, e não confirmação de cobertura/licença para a nossa utilização. [S9] [S10]

**Como fazer:**
1. Listar os dados pretendidos: referências, aplicações, imagens, identificação, tempos e procedimentos.
2. Preparar exemplos de veículos e trabalhos do piloto.
3. Apresentar a RoadMesh como software usado por várias empresas em Portugal.
4. Pedir reunião comercial/técnica e separar cada produto de dados na proposta.
5. Pedir demonstração da identificação e de uma procura de peça em casos acordados.
6. Confirmar por escrito cobertura, direitos de apresentação, conservação, documentos e utilização por várias empresas.
7. Pedir preços para cenários de utilização estimados; identificar mínimos e custos por consulta.
8. Só implementar contra o serviço depois de conhecer os identificadores, regras e acesso de testes.

**Concluído quando:** temos uma proposta que cobre o nosso uso real e os exemplos de teste funcionam. Não basta uma licença de consulta para uma oficina.

### 13.3 Via B - catálogo autorizado de peças originais

**Quando faz sentido:** a oficina precisa de consultar catálogos originais e encomendar através de redes autorizadas.

A LexCom apresenta o partslink24 como portal de catálogos originais e encomenda a concessionários. Isto confirma uma via de consulta/comércio; **não confirma uma API pública nem o direito de copiar esses dados para a RoadMesh**. [S11] [S12]

**Como fazer:**
1. Procurar contacto comercial ou de parcerias do serviço.
2. Explicar se queremos apenas encaminhar uma oficina para o portal ou trocar dados entre sistemas.
3. Perguntar se existe modalidade de integração para produtores de software.
4. Confirmar marcas e territórios, contas por oficina e utilização de referências/ilustrações.
5. Pedir a separação entre o preço de consultar o catálogo e o direito de integração.
6. Caso não exista a integração pretendida, avaliar uma ligação autorizada ao portal ou outra fonte. Não tratar uma assinatura de utilizador como licença de redistribuição.

### 13.4 Via C - contacto direto com marca/importador

**Quando faz sentido:** há uma marca prioritária, dados específicos que o agregador não fornece ou intenção de parceria própria.

**Como fazer, passo a passo:**
1. Escolher uma ou duas marcas prioritárias com base no trabalho das oficinas piloto.
2. Encontrar o site oficial da marca/importador para Portugal e o canal profissional.
3. Pedir encaminhamento para Pós-venda, Peças, Aftermarket, Operadores Independentes ou Parcerias Digitais.
4. Explicar que somos produtor de software, e não apenas uma oficina que quer uma conta de consulta.
5. Perguntar se os dados são licenciados diretamente ou por um operador autorizado.
6. Pedir informação sobre catálogos, identificação por VIN, referências, ilustrações, atualizações e direitos de utilização.
7. Confirmar se há API, outra interface suportada ou apenas portal de consulta.
8. Pedir condições de integração, testes e autorização por empresa/utilizador.
9. Se houver distribuidor tecnológico, solicitar a referência oficial desse parceiro.
10. Registar a resposta, o interlocutor e a próxima ação. Um concessionário pode ajudar a encaminhar, mas pode não ter autoridade para licenciar dados da marca.

Nem todas as marcas oferecem os mesmos canais ou condições. Não podemos prometer antecipadamente integração com todas as marcas. Esta via precisa de validação individual.

### 13.5 Via D - distribuidor que fornece a oficina

Esta via é para preço de compra, desconto, disponibilidade, encomenda e devolução. Pode complementar qualquer uma das anteriores.

1. Pedir às oficinas piloto os fornecedores com que trabalham.
2. Escolher dois com interesse real no piloto.
3. Pedir ao contacto comercial encaminhamento para integração de software.
4. Confirmar se os preços são específicos de cada oficina.
5. Definir autorização da oficina, envio e confirmação de encomenda, entrega parcial, erro, devolução e garantia.
6. Testar primeiro com uma conta e operações combinadas com o fornecedor.
7. Conferir o que foi pedido com o que chegou e foi faturado.

**Importante:** uma referência correta de peça não confirma que o distribuidor a tem, que serve a configuração exata ou que a oficina tem o mesmo desconto de outra.

### 13.6 Pedido inicial que podes adaptar

Assunto: Pedido de informação sobre integração de dados/serviços na RoadMesh

Estamos a desenvolver a RoadMesh, uma plataforma de gestão para empresas do setor automóvel, com área web e aplicações para equipas e clientes finais. O mercado inicial previsto é Portugal.

Pretendemos perceber as condições para utilizar os vossos dados/serviços dentro de um software usado por várias empresas. Precisamos de confirmar o âmbito disponível, cobertura de marcas e território, modalidades de integração, direitos de utilização, contas/licenças por empresa, ambiente de testes, preços e suporte.

Podem indicar o contacto de parcerias ou comercial/técnico adequado para esta avaliação? Temos disponibilidade para apresentar os percursos pretendidos e estimativas de utilização, ainda sem dados de clientes reais.

Este texto é um rascunho para utilização futura. Não foi enviado.

## 14. Fase 9 - preparar operação, segurança e responsabilidade

**Objetivo:** poder servir clientes sem depender da memória de uma pessoa ou de um único computador.

**Trabalho técnico comigo:**
1. Separar desenvolvimento, testes e produção; evitar dados fictícios misturados com dados de clientes.
2. Testar isolamento entre empresas, perfis e clientes em todas as operações, anexos e exportações.
3. Rever sessões, revogação de acessos, recuperação e saída.
4. Ensaiar cópias e recuperação tanto da base de dados como das fotografias.
5. Definir o que acontece se um fornecedor externo estiver indisponível.
6. Preparar acompanhamento de falhas, custos e operações pendentes.
7. Ensaiar atualizações e possibilidade de recuar uma versão.
8. Rever desempenho com volumes representativos de imagens e registos.
9. Rever acessibilidade e compatibilidade dos equipamentos do piloto.

**Tu e profissionais externos:**
1. Confirmar a entidade que vende e assina contratos.
2. Aprovar preço, faturação, condições do serviço e assistência.
3. Rever privacidade, relações com fornecedores, retenção e encerramento.
4. Definir responsável por incidentes e canal de suporte.
5. Confirmar titularidade de domínio, marca, contas e materiais.
6. Definir a responsabilidade sobre receções, fotografias e informação técnica, com apoio adequado.

O registo de atividades e os contratos com prestadores devem refletir os dados e responsabilidades reais. A CNPD disponibiliza orientações e modelos para apoiar esse levantamento; levar o mapa concreto ao profissional que fizer a revisão. [S13]

**Concluído quando:** há responsáveis, procedimentos e provas de recuperação; não apenas cópias que nunca foram restauradas.

## 15. Fase 10 - piloto antes de lançar

**Proposta:** começar por uma oficina; incluir Stand e Detailer quando os respetivos percursos estiverem preparados. O número e duração do piloto devem ser acordados, não inventados como prazo garantido.

**Como fazer:**
1. Escolher responsável de cada lado e definir o que será testado.
2. Começar por dados fictícios. Usar dados reais apenas com condições e acessos preparados.
3. Registar exemplos completos, sem depender só de demonstrações guiadas.
4. Acompanhar receção, orçamento, aprovação, peças, execução, entrega e cobrança.
5. Pedir ao funcionário e ao cliente final para realizar as tarefas sem instruções passo a passo.
6. Registar problema, gravidade, reprodução, responsável e estado da correção.
7. Testar novamente o que foi corrigido e os percursos que pode afetar.
8. Medir tempo de tarefa, erros, operações pendentes e necessidade de ajuda.
9. Definir quais problemas impedem lançamento e quais melhorias podem esperar.

**Bloqueiam o lançamento:** acesso a dados de outra pessoa, perda de dados, cobrança/emissão duplicada, aprovação ambígua ou percurso essencial sem saída.

**Concluído quando:** os percursos combinados funcionam, os problemas críticos estão resolvidos e a empresa piloto confirma que consegue trabalhar com o produto.

## 16. Fase 11 - publicar as duas aplicações e os serviços

### 16.1 Preparar contas e titularidade cedo

As contas devem pertencer à entidade adequada da RoadMesh, com acessos da equipa devidamente atribuídos. Evitar que a continuidade do negócio dependa de uma conta pessoal de um prestador.

A Apple descreve requisitos de inscrição de organizações, incluindo entidade legal, autoridade para contratar e número D-U-N-S, conforme o caso. O Google Play também publica informação exigida por tipo de conta. Confirmar o processo atual e reunir documentação antes de pagar ou submeter. [S14] [S15]

Não confundir a verificação da entidade com a aprovação das aplicações: são passos diferentes.

### 16.2 Preparar cada app para avaliação

1. Aprovar nome, descrição, categoria, ícone e imagens da app.
2. Reservar identificadores próprios da app profissional e da app cliente; rever os identificadores provisórios existentes no projeto.
3. Preparar política de privacidade, contacto de suporte e páginas públicas necessárias.
4. Declarar os dados efetivamente recolhidos, inclusive pelos fornecedores usados.
5. Pedir apenas permissões necessárias e explicar o motivo.
6. Preparar processo de encerramento da conta, conforme o funcionamento e as regras aplicáveis. Quando a app permite criação de conta, as lojas têm requisitos específicos para eliminação/pedido de eliminação; validar os percursos e as páginas exigidas em cada uma. [S16] [S17]
7. Criar acessos de demonstração com dados fictícios para a revisão, se necessários.
8. Validar compras/subscrições e pagamentos segundo o modelo escolhido.
9. Fazer testes internos e distribuição de teste em cada plataforma.
10. Corrigir observações e submeter a versão final apenas quando autorizado.

No Google Play, contas pessoais novas abrangidas pela regra publicada têm exigências de teste fechado; a documentação consultada indica pelo menos 12 participantes durante 14 dias consecutivos para o caso descrito. Não aplicar esta condição automaticamente a todas as contas de organização nem tratá-la como prazo total de aprovação. Reconfirmar ao preparar a conta. [S18]

### 16.3 Publicar o serviço central

As apps precisam de um serviço acessível e preparado para produção. Um endereço localhost de desenvolvimento não serve aos clientes instalados nos seus telemóveis.

Antes da publicação: domínio e ligação segura, alojamento, base de dados e fotografias de produção, cópias, alertas, fornecedores aprovados, plano de recuperação e suporte. Migrar dados apenas depois de ensaio e validação.

**Concluído quando:** as apps aprovadas comunicam com o ambiente correto, os percursos reais foram ensaiados e existe quem responda a um problema.

## 17. Fase 12 - acompanhar depois de lançar

1. Rever falhas e operações pendentes regularmente.
2. Conferir custos de mensagens, consultas, pagamentos e armazenamento por empresa.
3. Confirmar que os módulos vendidos correspondem às capacidades entregues.
4. Rever feedback e indicadores de utilização, sem inventar resultados.
5. Testar atualizações antes de as publicar.
6. Rever licenças, contratos, versões suportadas e regras das lojas.
7. Ensaiar recuperação e saída de fornecedores periodicamente.
8. Manter documentação de suporte e formação.
9. Atualizar a lista de pendências e o estado de cada produto.

Alterações de preço e de módulos devem ter efeito futuro segundo o acordo; não reescrever mensalidades ou documentos já fechados. Definir explicitamente consumos e eventual proporcionalidade antes de os cobrar.

## 18. Quem faz o quê

| Trabalho | Tu | Desenvolvimento comigo | Profissional/fornecedor |
|---|---|---|---|
| Escolha de produtos e prioridades | Decide e valida | Organiza dependências e traduz em requisitos | Empresas piloto ajudam a validar |
| Visualização e percursos | Experimenta e aprova | Implementa e verifica | Especialista de acessibilidade, se contratado |
| Regras e dados | Explica a operação | Implementa, testa e documenta | Técnicos do setor validam contexto |
| Apps móveis | Decide público e experimenta | Adapta, prepara builds e ensaia | Apple/Google avaliam publicação |
| Dados OEM/técnicos | Apresenta o negócio e decide proposta | Define necessidades e implementa ligação | Titular dos dados licencia e suporta |
| Faturação/pagamentos | Escolhe modelo e autoriza contratação | Integra e testa | Prestador e contabilista validam âmbito |
| Contratos e privacidade | Fornece informação e aprova | Prepara inventário técnico e aplica decisões | Jurídico revê condições |
| Suporte e operação | Define responsável e compromisso | Prepara ferramentas e procedimentos | Prestadores contratados asseguram o seu âmbito |

Posso ajudar a preparar contactos, comparar propostas e explicar respostas. Não posso garantir que um fornecedor concede acesso, que uma marca aceita parceria ou que uma loja aprova uma app. Nenhuma dessas adesões ou contactos é efetuada por este guia.

## 19. Como acompanhar o trabalho ao longo do tempo

Usar três documentos com funções diferentes:
- **Este roteiro:** ordem geral e critérios de passagem entre fases.
- **ESTADO-PRODUTOS:** o que está implementado e o que falta programar/testar.
- **PENDENCIAS-EXTERNAS:** pesquisas, contactos, propostas, contratos e operação.

Para cada tarefa, registar:
- ID e descrição concreta.
- Produto/área afetada.
- Estado: por decidir, pronto para começar, em curso, em validação, bloqueado ou concluído.
- Responsável.
- Dependências.
- Próxima ação.
- Evidência de conclusão.
- Data da última revisão.
- Custo/prazo apenas quando houver estimativa ou proposta identificada.

**Exemplo:** "Integrar peças" é demasiado vago. Dividir em "definir dados necessários", "pedir proposta de licença SaaS", "obter testes", "validar identificação", "implementar procura", "controlar consumo" e "testar com a oficina".

**Custos a orçamentar:** entidade/apoio profissional, contas das lojas, construção/distribuição das apps, alojamento, base de dados, fotografias/cópias, email, SMS, WhatsApp, pagamentos, dados técnicos/peças, domínio, suporte e piloto. Separar custo inicial, mensal, por utilização e por empresa. Não considerar um valor desconhecido como zero.

## 20. Checklist de lançamento

### Produto e visualização
- [ ] Três áreas web completas para os percursos combinados.
- [ ] Modo claro/escuro, computador, tablet e telemóvel revistos.
- [ ] Módulos ativos/inativos e perfis diferentes ensaiados.
- [ ] Base de dados, receção, orçamento, OS e entrega ligados.
- [ ] Estados de erro, ausência de dados e recuperação previstos.
- [ ] Stand e Detailer validados no seu âmbito próprio.

### Aplicações
- [ ] App profissional testada em Android e iPhone reais.
- [ ] App cliente testada em Android e iPhone reais.
- [ ] Identidade, notificações, ligações e saída de sessão corretas.
- [ ] Rede fraca, carregamento de imagens e recuperação ensaiados.
- [ ] Contas e requisitos de publicação preparados.

### Integrações e operação
- [ ] Fornecedores e direitos de uso confirmados por escrito.
- [ ] Testes e produção separados.
- [ ] Dados de peças, técnicos e comerciais corretamente distinguidos.
- [ ] Cobranças das oficinas separadas da subscrição RoadMesh.
- [ ] Mensagens, pagamentos e documentos sem duplicações.
- [ ] Cópias de dados e fotografias restauradas com sucesso.
- [ ] Contratos, privacidade, suporte e encerramento revistos.
- [ ] Piloto concluído e problemas críticos resolvidos.
- [ ] Publicação expressamente autorizada.

## 21. Fontes oficiais e referências

Pesquisa consultada em 8 de novembro de 2026. Produtos, condições e regras das lojas podem mudar; confirmar novamente antes de contratar ou submeter. As fontes comprovam os caminhos públicos descritos, não a elegibilidade comercial da RoadMesh.

- **S1 - Expo, variantes de aplicações:** https://docs.expo.dev/build-reference/variants/
- **S2 - Expo, notificações:** https://docs.expo.dev/push-notifications/push-notifications-setup/ e https://docs.expo.dev/push-notifications/sending-notifications/
- **S3 - Twilio, orientações SMS Portugal:** https://www.twilio.com/en-us/guidelines/pt/sms
- **S4 - WhatsApp Business Platform:** https://whatsappbusiness.com/products/business-platform/
- **S5 - Moloni, documentação para desenvolvimento:** https://www.moloni.pt/dev/
- **S6 - Consulta oficial de programas certificados:** https://www.gov.pt/servicos/consultar-o-programa-de-faturacao-certificado
- **S7 - SIBS, documentação:** https://www.docs.pay.sibs.com/
- **S8 - Apple, regras de revisão e cobrança:** https://developer.apple.com/app-store/review/guidelines/ ; Google Play, política de pagamentos: https://support.google.com/googleplay/android-developer/answer/9858738
- **S9 - TecAlliance, TecDoc:** https://www.tecalliance.net/solutions/tecdoc
- **S10 - TecRMI, serviços:** https://tecrmi-services.tecalliance.net/docs/ServiceOverview.html
- **S11 - LexCom, oferta de catálogos:** https://www.lex-com.net/home/en/what-we-do.html
- **S12 - partslink24, contacto:** https://www.partslink24.com/partslink24/contact-extern.action?changeLang=en
- **S13 - CNPD, registo de atividades:** https://www.cnpd.pt/organizacoes/outras-obrigacoes/registo-de-atividades-de-tratamento/
- **S14 - Apple, inscrição de organizações:** https://developer.apple.com/help/account/membership/program-enrollment/
- **S15 - Google Play, informação para criar conta:** https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
- **S16 - Apple, eliminação de conta:** https://developer.apple.com/support/offering-account-deletion-in-your-app/
- **S17 - Google Play, eliminação de conta:** https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- **S18 - Google Play, testes de novas contas pessoais:** https://support.google.com/googleplay/android-developer/answer/14151465?hl=en

## 22. Decisões ainda abertas

Não é necessário resolver tudo já. A ordem para as próximas decisões é:
1. Produtos que fazem parte da primeira versão vendável.
2. Empresas piloto e pessoas que validam os percursos.
3. Perfis e acesso por pessoa, incluindo cliente de várias empresas.
4. Campos, fotografias e aprovação no percurso principal.
5. Nomes e público das duas apps; dispositivos iniciais de teste.
6. Fornecedores de dados de peças/identificação/técnicos e faturação.
7. Modelo de cobrança, canais de mensagens e política de consumos.
8. Entidade titular, contratos, contas das lojas e operação.
9. Data de lançamento apenas depois de conhecer o estado real e as dependências.

**Ponto de partida recomendado:** fechar a matriz de perfis e o mapa de páginas, aprovar a visualização das três áreas e concluir um percurso completo de receção até entrega. Começar simultaneamente os pedidos de informação de dados automóveis e faturação.

