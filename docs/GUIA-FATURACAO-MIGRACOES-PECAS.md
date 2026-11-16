# RoadMesh - guia prático de integrações e migrações

**Âmbito:** apenas faturação, migração de outros softwares e dados de peças/informação técnica para mecânicos.  
**Data:** 8 de novembro de 2026.  
**Estado:** plano para executar; nenhum acesso comercial foi obtido e nenhum fornecedor foi contactado.

## 1. Por onde começar e o que tens de fazer

Não precisas de saber programar os conectores. Precisas de descobrir que sistemas as empresas usam, obter autorização e condições de acesso e validar exemplos reais. Depois, o desenvolvimento transforma esses acessos em funções da RoadMesh.

**Integração** mantém dois sistemas a trabalhar em conjunto. Exemplo: a oficina trabalha na RoadMesh e emite o documento no programa de faturação que já utiliza.

**Migração** transfere informação para começar a trabalhar noutro sistema. Exemplo: trazer clientes, veículos e histórico de um software antigo para a RoadMesh.

**Licença de dados** permite utilizar informação de terceiros. Exemplo: consultar referências, aplicações de peças ou procedimentos técnicos dentro da RoadMesh.

**A ordem recomendada:**
1. Escolher uma oficina piloto e fazer o levantamento dos programas e fornecedores que utiliza.
2. Identificar o programa de faturação mais importante para esse piloto e pedir condições/documentação de integração.
3. Pedir uma exportação de teste do software atual e confirmar que informação contém.
4. Em paralelo, pedir propostas para identificação do veículo, dados de peças e informação técnica.
5. Implementar e validar primeiro um conector de faturação e uma migração concreta.
6. Ligar os dados automóveis e um fornecedor de peças, quando existirem licenças e acessos adequados.
7. Repetir o processo para outros programas e fornecedores. Não prometer integração ou migração universal antes desse levantamento.

**Folha inicial a preencher com cada empresa:**

| Informação | O que perguntar |
|---|---|
| Gestão atual | Nome do software, fornecedor, versão e se é instalado ou online |
| Faturação | Programa e plano contratado; pode ser diferente da gestão |
| Dados | Quantos clientes, veículos, produtos, documentos e imagens existem |
| Exportação | Que formatos consegue exportar e quem pode autorizar |
| Peças | Distribuidores, catálogos e dados técnicos usados pelos mecânicos |
| Mudança | O que quer manter, substituir ou consultar apenas como histórico |
| Responsáveis | Pessoa da empresa e contacto de suporte dos fornecedores |

Não é necessário começar por falar com todas as marcas. Primeiro, perceber que dados e marcas são realmente necessários para os mecânicos do piloto.

## 2. Integrar programas de faturação

### 2.1 Escolher o modelo certo

**Modelo inicial recomendado:** a RoadMesh trata da operação e envia os dados para o programa de faturação da própria empresa. Esse programa emite o documento e devolve identificação, estado e, quando disponível, PDF.

A empresa pode continuar a usar o seu programa atual. Se esse programa não disponibilizar a ligação necessária, temos de avaliar uma exportação/importação suportada, intervenção do fornecedor ou mudança para outro programa. Não existe um conector igual para qualquer software.

Antes de desenvolver, decidir onde cada informação é gerida:

| Informação | Regra inicial proposta |
|---|---|
| Trabalho e orçamento operacional | Geridos na RoadMesh |
| Documento fiscal emitido | Gerido no programa de faturação |
| Identificação fiscal e impostos | Confirmados com a empresa/contabilista e o fornecedor |
| Pagamentos | Definir um sistema de origem e como o outro recebe o resultado |
| Stock | Escolher quem controla quantidades; evitar dois descontos pelo mesmo consumo |
| Correções fiscais | Seguir o processo do emissor; não apagar apenas o registo local |

A proposta tem de ser adaptada a cada programa e à operação da empresa.

### 2.2 O que pedir ao fornecedor

Contactar comercial/parcerias e pedir encaminhamento técnico. Explicar que a RoadMesh vai ligar contas de várias empresas independentes.

Perguntas:
1. Existe API, isto é, uma interface autorizada para outro software comunicar com o programa?
2. Está disponível na versão e no plano que esta empresa utiliza?
3. É necessário contrato de parceiro ou de produtor de software?
4. Cada empresa autoriza a sua ligação? Como revoga esse acesso?
5. Há documentação e ambiente de testes sem emissão real?
6. Que documentos e operações são suportados: clientes, artigos, faturas, recibos e notas de crédito?
7. Conseguimos obter o resultado e o PDF do documento?
8. Como saber se uma operação já foi concluída quando a resposta se perde?
9. Há avisos automáticos de alterações, ou temos de consultar o estado?
10. Quais são os custos, limites, suporte e condições de utilização por várias empresas?

**Pedir como resultado:** documentação, proposta comercial, lista de operações, acesso de testes e nome do contacto técnico.

Como candidatos de pesquisa, Moloni, Vendus e InvoiceXpress têm documentação pública de integração. Isso não confirma que todos os planos, versões ou documentos necessários ao nosso caso estejam incluídos. Confirmar as condições com cada fornecedor. [F1] [F2] [F3]

### 2.3 Como a ligação deve funcionar na prática

1. O responsável liga a conta de faturação da sua empresa à RoadMesh através do método suportado.
2. Associamos os identificadores dos clientes e artigos dos dois sistemas.
3. A oficina conclui/revê o trabalho e confirma destinatário, linhas, valores e impostos.
4. A RoadMesh prepara um pedido identificado de forma única.
5. O programa de faturação emite o documento.
6. A RoadMesh guarda a referência devolvida, o estado e a ligação/PDF permitido.
7. Se houver falha de comunicação, consultamos o resultado antes de tentar novamente.
8. Recibos, pagamentos e correções são sincronizados de acordo com a regra escolhida.

**Exemplo:** se a fatura foi emitida mas a Internet falhou antes da resposta, não se deve voltar a emitir automaticamente a mesma venda.

**Quem faz:** tu obténs as condições e validas o funcionamento; eu implemento a ligação; o fornecedor apoia a API; o contabilista valida o enquadramento fiscal e os casos de correção.

### 2.4 Testes antes de ligar uma empresa real

- Cliente novo e cliente já existente, sem duplicação.
- Peças, mão de obra, descontos, arredondamentos e impostos aplicáveis.
- Pedido repetido após falha de comunicação.
- Emissão recusada pelo programa, com mensagem compreensível.
- Documento corrigido através do processo adequado.
- Acesso revogado ou credencial expirada.
- Duas empresas ligadas, sem troca de documentos entre elas.
- Stock descontado uma única vez, se houver sincronização.
- Valores e documentos conferidos com a empresa/contabilista.

**Concluído quando:** os casos acordados funcionam no ambiente de testes, os resultados são conferidos e a empresa autoriza a ativação controlada. Ligar um programa certificado não transforma, por si só, toda a RoadMesh num programa certificado.

## 3. Migrar dados de softwares que as empresas já usam

### 3.1 Descobrir o que é possível trazer

Obter autorização da empresa para o âmbito da migração. Pedir ao suporte do software uma exportação documentada e uma amostra de teste, preferencialmente fictícia ou anonimizada.

| Grupo | Exemplos de dados e relações |
|---|---|
| Clientes | Identificação, contactos, dados fiscais e ID antigo |
| Veículos | Matrícula, VIN, características, proprietário e ID antigo |
| Produtos | Marca, referência, unidade, custo/preço e impostos |
| Stocks | Quantidades, reservas e movimentos que realmente possam ser exportados |
| Fornecedores | Identificação, contactos e referências comerciais |
| Trabalho | Orçamentos, ordens, linhas, estados, datas e relações |
| Histórico | Intervenções, quilómetros, observações e responsáveis |
| Financeiro | Documentos, saldos e pagamentos, conforme o âmbito aprovado |
| Anexos | Fotos, PDFs e ligação ao cliente/veículo/intervenção correta |
| Agenda | Pedidos e marcações ainda relevantes |

Não basta receber um Excel de clientes se a empresa quer também o histórico das viaturas e as fotografias.

### 3.2 Escolher a forma de extração

Usar a via que o fornecedor suporte e a empresa autorize:
1. Exportação completa em CSV, Excel, XML ou outro formato documentado.
2. API de consulta/exportação, se disponibilizar os dados necessários.
3. Extração de base de dados com apoio autorizado do fornecedor ou técnico da empresa.
4. Importação manual de um conjunto pequeno, quando não existir alternativa razoável.

Um backup proprietário pode não ser legível sem o programa ou documentação. Não prometer que conseguimos importar qualquer backup.

O SAF-T (PT) é um ficheiro normalizado de um conjunto predefinido de registos com finalidade fiscal. Pode ajudar no âmbito respetivo, mas não deve ser tratado como backup completo da operação da oficina. Confirmar separadamente viaturas, ordens de trabalho, fotografias e outras relações. [F4]

### 3.3 Fazer um ensaio antes da mudança

1. **Inventariar:** contar registos e anexos e identificar períodos, estados e dados em falta.
2. **Guardar o original:** manter uma cópia protegida da extração recebida, sem a modificar.
3. **Mapear:** indicar a coluna de origem e o campo de destino de cada informação.
4. **Preservar relações:** guardar o ID antigo juntamente com a origem e a empresa; não usar só o nome do cliente.
5. **Normalizar com cuidado:** datas, separadores decimais, telefones, matrículas, unidades e códigos.
6. **Rever duplicados:** sinalizar suspeitas para decisão; não juntar automaticamente clientes apenas por terem o mesmo nome.
7. **Importar num ambiente de teste:** primeiro referências, depois registos que dependem delas e, por fim, anexos e relações.
8. **Classificar o histórico:** distinguir informação importada de documentos emitidos pela RoadMesh ou pelo novo programa.
9. **Repetir o ensaio:** a mesma origem não deve criar cópias adicionais dos mesmos registos.
10. **Produzir relatório:** importados, rejeitados, duplicados suspeitos, campos em falta e decisões pendentes.

**Exemplo de correspondência:** cliente antigo 142 pertence à empresa A e vem do software X. O veículo antigo 89 referencia esse cliente. Guardamos essa relação e o novo ID atribuído, mesmo que o nome do cliente seja igual ao de outro.

### 3.4 Validar com a empresa

Não conferir apenas o número de linhas importadas:
- Contagens por tipo de registo e período.
- Relações cliente/viatura e orçamento/OS/documento.
- Totais e saldos abrangidos pela mudança.
- Quantidades e unidades de stock.
- Histórico de várias viaturas, incluindo casos antigos e incompletos.
- Abertura de fotos e PDFs, não apenas existência do nome do ficheiro.
- Acentos, datas, referências e preços.
- Casos que foram recusados, em vez de os esconder.

Os documentos fiscais anteriores não devem ser simplesmente recriados como novas emissões. O tratamento do arquivo, saldos iniciais e continuidade fiscal deve ser acordado com a empresa, o fornecedor e o contabilista.

**Concluído quando:** existe uma validação documentada e as diferenças são corrigidas ou aceites explicitamente.

### 3.5 Fazer a passagem para a RoadMesh

1. Combinar uma data/hora e identificar quem pode autorizar a mudança.
2. Definir se o sistema antigo fica temporariamente sem alterações ou se haverá uma extração final das diferenças.
3. Tirar a cópia final e registar o ponto de corte.
4. Importar e conferir novamente os dados críticos.
5. Identificar a partir de que momento cada sistema é a origem oficial de novos registos.
6. Dar acesso à equipa e acompanhar os primeiros trabalhos.
7. Manter o arquivo antigo disponível nas condições acordadas.
8. Se a passagem falhar, aplicar o plano de recuperação definido previamente.

**Atenção ao recuo:** se já existirem operações novas na RoadMesh, não basta restaurar a cópia antiga. É necessário conciliar esses registos para não perder trabalho, stock ou pagamentos.

**Pedir ao fornecedor antes de cancelar:** forma e prazo de exportação, acesso posterior ao arquivo, custos, anexos e condições de conservação/consulta. Não cancelar primeiro e só depois descobrir que faltam dados.

## 4. Integrar peças OEM e informação para os mecânicos

### 4.1 São várias fontes de informação, não uma base única

| Necessidade | Informação a obter |
|---|---|
| Identificar a viatura | Matrícula/VIN, motor, variante e identificadores do fornecedor |
| Procurar uma peça | Fabricante, referência, descrição e aplicações |
| Referências de origem | Números OE/OEM e relações de substituição disponíveis |
| Confirmar a aplicação | Configuração do veículo, restrições e dados adicionais necessários |
| Consultar catálogos originais | Ilustrações e informação autorizada do fabricante |
| Trabalhar na reparação | Manutenção, tempos, procedimentos, binários, fluidos e esquemas abrangidos |
| Comprar material | Preço líquido, desconto, stock e prazo do distribuidor |
| Gerir a encomenda | Confirmação, entrega parcial, erro, devolução e garantia |

**OEM/OE** identifica, neste contexto, origem/fabricante e referências de peças. **Aftermarket** inclui peças de outros fabricantes para substituição. **VIN** é o número de identificação do veículo.

Uma referência não deve ser tratada isoladamente da marca/fabricante. Uma equivalência comercial também não dispensa confirmar a aplicação concreta. Perguntar ao fornecedor o que a identificação consegue confirmar e que decisões ainda cabem ao mecânico.

### 4.2 Quem contactar primeiro

**A. Fornecedor de dados multimarca.** A TecAlliance apresenta TecDoc para dados e identificação de peças/veículos. Pedir proposta para integrar a informação num software usado por várias empresas. A cobertura e licença concretas precisam de confirmação. [F5]

**B. Fornecedor de informação técnica.** O TecRMI disponibiliza serviços de tempos, manutenção e informação técnica. Pedir quais os conjuntos de dados de que precisamos e como são licenciados para os mecânicos. Isto é uma necessidade diferente do simples catálogo de peças. [F6]

**C. Catálogo autorizado de peças originais.** A LexCom apresenta o partslink24 para catálogos originais e encomendas a concessionários. Contactar parcerias para saber se existe a modalidade de integração pretendida. Uma conta de consulta não confirma autorização para incorporar os dados na RoadMesh. [F7]

**D. Marca/importador.** Se faltar informação específica, escolher marcas prioritárias e procurar Pós-venda, Peças, Operadores Independentes ou Parcerias Digitais. Pedir o canal oficial para produtores de software e saber se os dados são licenciados diretamente ou por parceiro.

**E. Distribuidor da oficina.** Contactar os fornecedores que o piloto já utiliza para preços, descontos, stock e encomendas. Um catálogo de referências não substitui esse acordo comercial.

### 4.3 O que pedir na proposta de dados

1. Cobertura de marcas, tipos de veículos e mercado português.
2. Identificação por matrícula/VIN e limitações conhecidas.
3. Referências, aplicações, ilustrações, substituições e dados técnicos disponíveis.
4. Identificadores que permitem relacionar veículo, peça e procedimento.
5. Direito de apresentar os dados dentro da RoadMesh e servir várias empresas.
6. Necessidade de licença por empresa, mecânico, utilizador ou consulta.
7. Regras para guardar dados, gerar documentos, imprimir e conservar histórico.
8. Atualizações, versões, referências substituídas e tratamento de informação desatualizada.
9. Custos de ativação, mínimos, mensalidades, consumo e compromisso contratual.
10. Ambiente de testes, exemplos, limites, suporte e procedimento de saída.

**Pedir como resultado:** proposta de utilização em software por subscrição, documentação, acesso de testes e confirmação escrita do âmbito. Não contratar apenas a versão de consulta individual sem confirmar estes pontos.

### 4.4 Como deve funcionar para o mecânico

1. Identificar a viatura e confirmar os dados devolvidos.
2. Escolher o sistema/componente e procurar a peça.
3. Comparar referência de origem e alternativas disponíveis.
4. Rever condições de aplicação e pedir os detalhes adicionais necessários.
5. Acrescentar a peça escolhida ao orçamento ou à OS, com origem e referência.
6. Consultar o distribuidor para preço efetivo, stock e prazo.
7. Encomendar com a conta autorizada da empresa e guardar a confirmação.
8. Receber o material e associá-lo ao trabalho certo.
9. Consultar procedimentos/tempos técnicos licenciados quando forem necessários.
10. Guardar a informação da operação sem substituir retroativamente os dados usados num trabalho já fechado.

O preço sugerido por um catálogo não é necessariamente o preço de compra da oficina. Também não se deve apresentar como disponível uma peça cujo stock do distribuidor ainda não foi consultado.

### 4.5 Como validar antes de oferecer o produto

Combinar com a oficina e o fornecedor uma amostra de veículos representativa:
- Diferentes marcas, anos, motores e versões.
- Um caso com matrícula conhecida e outro em que só existe VIN ou identificação manual.
- Peças que dependem de variantes/opções do veículo.
- Referência antiga substituída por outra.
- Caso sem correspondência ou com várias respostas.
- Material sem stock, encomenda parcial e devolução.
- Falha da consulta e limite de consumo atingido.
- Procedimento técnico indisponível no plano contratado.

O mecânico confirma se a resposta é utilizável; nós conferimos o comportamento do sistema e os custos. Um resultado sem correspondência deve permitir continuar manualmente, sem inventar uma peça compatível.

## 5. Pedidos que podes enviar aos fornecedores

### 5.1 Programa de faturação

Somos a RoadMesh, uma plataforma de gestão para empresas do setor automóvel. Pretendemos integrar a conta de faturação de uma empresa que utiliza o vosso software.

Precisamos de confirmar versão/plano compatível, modalidade de parceiro, documentação e acesso de testes, autorização por empresa, emissão e consulta de documentos, obtenção do PDF, pagamentos/correções suportados, prevenção de duplicação e custos.

Podem encaminhar-nos para o contacto comercial e técnico adequado?

### 5.2 Software de origem para migração

Com autorização da empresa utilizadora, queremos avaliar a migração de dados do vosso software para a RoadMesh.

Solicitamos informação sobre exportação de clientes, viaturas, produtos, fornecedores, stocks, trabalho/histórico, documentos e anexos. Precisamos dos formatos, descrição dos campos, identificadores/relações, limitações, custos e possibilidade de uma amostra de teste.

Queremos também confirmar como preservar o acesso ao arquivo após a mudança e como obter uma extração final sem perder alterações feitas durante o ensaio.

### 5.3 Dados de peças e informação técnica

Estamos a desenvolver a RoadMesh para várias empresas do setor automóvel, inicialmente em Portugal.

Pretendemos avaliar identificação de viaturas, referências/aplicações de peças e informação técnica para mecânicos. Precisamos de proposta para apresentar os dados dentro do nosso software, incluindo cobertura, direitos de utilização por várias empresas, licenças, documentação, testes, atualização, custos e suporte.

Podem indicar o contacto responsável por este tipo de integração?

Estes textos são modelos para adaptar e não foram enviados.

## 6. O que guardar e quem executa

Para cada fornecedor ou migração, manter uma ficha:
- Empresa piloto e produto/versão de origem.
- Contacto e data do pedido.
- Informação/dados que precisamos.
- Documentação e proposta recebidas.
- Preço, limite e direito de utilização confirmados.
- Responsável do nosso lado e do fornecedor.
- Acesso de testes obtido, sem guardar credenciais no documento.
- Testes, diferenças e decisões de validação.
- Data de ativação ou de passagem.
- Forma de recuperação, suporte e saída.

**Tu:** recolhes os nomes dos sistemas, obténs autorização da empresa, pedes propostas e decides com base nas respostas.  
**Eu:** ajudo a interpretar as propostas, preparo correspondências de dados, implemento importadores/conectores e faço verificações.  
**Fornecedor:** confirma acessos, formatos, direitos e limitações e apoia os testes.  
**Empresa piloto/mecânico:** confere dados e valida o uso real.  
**Contabilista:** valida os pontos fiscais da emissão e da mudança de sistema.

**Primeiro pedido concreto a fazer agora:** perguntar a uma oficina piloto qual é o software de gestão, qual o programa de faturação e quais os catálogos/distribuidores que os mecânicos utilizam. Com esses nomes e versões, já conseguimos preparar pedidos específicos em vez de tentar integrar tudo sem informação.

## 7. Fontes oficiais para começar

Consultadas em 8 de novembro de 2026. São vias de pesquisa; não existem contratos ou compatibilidades comerciais confirmados para a RoadMesh.

- **F1 - Moloni, API e modelo de ligação:** https://www.moloni.pt/dev/ e https://www.moloni.pt/dev/visao-geral
- **F2 - Vendus, integrações:** https://www.vendus.pt/integracoes/
- **F3 - InvoiceXpress, guias de API:** https://docs.invoicexpress.com/v2/guides
- **F4 - Autoridade Tributária, finalidade do SAF-T (PT):** https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Negocios/Faturacao/SAF_T_PT/SAF_T_PT_Versao_PT/Paginas/default.aspx
- **F5 - TecAlliance, dados TecDoc:** https://www.tecalliance.net/solutions/tecdoc
- **F6 - TecRMI, serviços técnicos:** https://tecrmi-services.tecalliance.net/docs/ServiceOverview.html
- **F7 - LexCom, catálogos e encomendas:** https://www.lex-com.net/home/en/what-we-do.html

Acompanhamento de propostas e contactos: [Pendências externas](PENDENCIAS-EXTERNAS.md). Este guia substitui o roteiro geral como leitura principal para estas três necessidades; o roteiro anterior mantém-se como referência do projeto inteiro.

