# Pendências externas da RoadMesh
Documento vivo de pesquisa, contactos, acordos e operação fora da programação.

Para os passos concretos de faturação, migração de outros softwares e dados de peças/informação técnica, consultar o [guia prático focado](GUIA-FATURACAO-MIGRACOES-PECAS.md).

Para a ordem global do desenvolvimento, das três áreas web e das duas aplicações móveis, consultar o [roteiro completo da RoadMesh](ROTEIRO-COMPLETO-ROADMESH.md).

Última atualização: 8 de novembro de 2026. Responsável global: por atribuir. Âmbito: projeto inteiro.

## Como usar

Este ficheiro é o registo central dos assuntos que não se resolvem apenas com código ou configurações. Deve ser atualizado quando surgir uma dependência, houver uma resposta de fornecedor, se tomar uma decisão ou se concluir um passo.

Estados permitidos: **Por pesquisar → Em pesquisa → A contactar → Contactado → A aguardar resposta → Em comparação → A decidir → Em contratação → A validar → Concluído**. Usar **Bloqueado** com motivo e próxima ação; usar **Não necessário** quando houver decisão fundamentada.

Todos os itens abaixo começam **Por pesquisar**: ainda não houve contactos, pedidos comerciais, criação de contas ou contratos. Há apenas pesquisa preliminar de fontes públicas nos temas assinalados. P1 = preparar antes de um piloto comercial/lançamento; P2 = necessário à respetiva função; P3 = expansão a confirmar. Os responsáveis individuais, prazos e orçamentos continuam por atribuir.

Um item só fica Concluído com evidência e critérios cumpridos. Encontrar um site ou ter documentação de uma API não significa ter licença, contrato ou autorização de produção. Guardar aqui referências e decisões; documentos privados ficam numa pasta restrita da empresa e este registo recebe apenas a referência. Não guardar credenciais, chaves, identificação pessoal ou contratos confidenciais no repositório.

## Primeiro: os nomes dos dados automóveis

- **OEM/OE:** neste contexto, referências de origem e fabricante. Não são o nome de uma única base de dados que se possa obter livremente.
- **VIN:** número de identificação do veículo.
- **Matrícula / VRM:** identificação de registo usada numa consulta de viatura.
- **TecDoc:** uma via comercial para dados e aplicações de peças.
- **TecRMI:** uma via comercial para informação técnica de reparação e manutenção.
- **Preço de catálogo, preço de compra e stock do distribuidor são dados diferentes.** Ter um catálogo não assegura descontos negociados, disponibilidade nem possibilidade de encomendar.

A TecAlliance apresenta soluções para dados de peças, pesquisa por veículo e serviços de identificação VIN/VRM; apresenta também serviços técnicos TecRMI. Devemos pedir proposta para incorporar estes serviços num SaaS utilizado por várias oficinas. Uma assinatura para um utilizador consultar um catálogo não deve ser tomada como autorização para o redistribuir. [TecDoc](https://www.tecalliance.net/solutions/tecdoc), [soluções de catálogo e identificação](https://www.tecalliance.net/products?family=tecdoc&solution=catalogue-ecommerce), [serviços TecRMI](https://tecrmi-services.tecalliance.net/docs/ServiceOverview.html).

O diretório internacional da TecAlliance identifica a TIPS 4Y como canal português para TecDoc/TecRMI. É uma porta de entrada a confirmar para a nossa utilização concreta; não houve contacto e o site local não foi obtido nesta consulta. [Diretório TecAlliance](https://www.tecallianceamericas.com/tecalliance-global/).

## Painel de acompanhamento

| ID | Prioridade | Assunto | Estado | Próximo passo |
|---|---|---|---|---|
| EXT-001 | P1 | Entidade comercial e responsáveis | Por pesquisar | Ver ficha EXT-001 |
| EXT-002 | P1 | Catálogo de peças e referências OEM | Por pesquisar | Ver ficha EXT-002 |
| EXT-003 | P1 | Identificação por matrícula e VIN | Por pesquisar | Ver ficha EXT-003 |
| EXT-004 | P2 | Informação técnica de reparação | Por pesquisar | Ver ficha EXT-004 |
| EXT-005 | P2 | Compra real de peças | Por pesquisar | Ver ficha EXT-005 |
| EXT-006 | P1 | Faturação das oficinas | Por pesquisar | Ver ficha EXT-006 |
| EXT-007 | P1 | Cobrança das subscrições RoadMesh | Por pesquisar | Ver ficha EXT-007 |
| EXT-008 | P2 | Pagamentos dos clientes às oficinas | Por pesquisar | Ver ficha EXT-008 |
| EXT-009 | P1 | Email operacional | Por pesquisar | Ver ficha EXT-009 |
| EXT-010 | P2 | SMS | Por pesquisar | Ver ficha EXT-010 |
| EXT-011 | P2 | WhatsApp das oficinas | Por pesquisar | Ver ficha EXT-011 |
| EXT-012 | P1 | Proteção de dados e contratos | Por pesquisar | Ver ficha EXT-012 |
| EXT-013 | P1 | Alojamento, base de dados e fotografias | Por pesquisar | Ver ficha EXT-013 |
| EXT-014 | P1 | Cópias e recuperação | Por pesquisar | Ver ficha EXT-014 |
| EXT-015 | P1 | Domínios, marca e ativos | Por pesquisar | Ver ficha EXT-015 |
| EXT-016 | P1 | Oficinas piloto e validação no terreno | Por pesquisar | Ver ficha EXT-016 |
| EXT-017 | P2 | Política de receção e evidências | Por pesquisar | Ver ficha EXT-017 |
| EXT-018 | P2 | Migração de clientes | Por pesquisar | Ver ficha EXT-018 |
| EXT-019 | P2 | Assistência e compromisso comercial | Por pesquisar | Ver ficha EXT-019 |
| EXT-020 | P2 | Marketing e conteúdos | Por pesquisar | Ver ficha EXT-020 |
| EXT-021 | P3 | Equipamentos e serviços de diagnóstico | Por pesquisar | Ver ficha EXT-021 |
| EXT-022 | P2 | Seguro e responsabilidade de serviço | Por pesquisar | Ver ficha EXT-022 |
| EXT-023 | P2 | Saída, cancelamento e exportação | Por pesquisar | Ver ficha EXT-023 |
| EXT-024 | P3 | Publicação em lojas de aplicações | Por pesquisar | Ver ficha EXT-024 |

## Fichas de trabalho

### EXT-001 — Entidade comercial e responsáveis

- **Objetivo:** Constituição/atividade, faturação da RoadMesh e quem pode assinar contratos.
- **Quem procurar:** Contabilista e apoio jurídico.
- **Como avançar:** Reunir identificação da atividade, serviços vendidos e modelo de subscrição; validar entidade contratante e responsabilidades.
- **Concluído quando:** Identificação comercial definida, responsáveis e documentação necessários confirmados.
- **Nota / ponto a confirmar:** Nenhum contacto ou contratação efetuado.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-002 — Catálogo de peças e referências OEM

- **Objetivo:** Dados de artigos, aplicações e equivalências.
- **Quem procurar:** TecAlliance / canal comercial português.
- **Como avançar:** Pedir proposta para integrar dados no nosso SaaS, não apenas uma licença de consulta para uma oficina. Comparar API, catálogo incorporado e dados distribuídos.
- **Concluído quando:** Proposta escrita com direito de utilização por várias empresas, âmbito, preços e limites.
- **Nota / ponto a confirmar:** Confirmar cobertura Portugal, marcas, imagens, referências OE/OEM, aplicações e atualização.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-003 — Identificação por matrícula e VIN

- **Objetivo:** Transformar matrícula/VIN numa identificação técnica fiável.
- **Quem procurar:** TecAlliance Vehicle Identification Service ou agregador licenciado.
- **Como avançar:** Pedir amostra de matrículas portuguesas e veículos autorizados para ensaio; confirmar que dados são devolvidos e como se relacionam com o catálogo.
- **Concluído quando:** Cobertura demonstrada, fonte e direito de uso confirmados; preço por consulta e regras de repetição definidos.
- **Nota / ponto a confirmar:** Não pressupor acesso a dados pessoais do proprietário; identificar veículo não é consultar titularidade.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-004 — Informação técnica de reparação

- **Objetivo:** Tempos, manutenção, diagramas e procedimentos.
- **Quem procurar:** TecRMI e fornecedores equivalentes de informação técnica.
- **Como avançar:** Solicitar demonstração e proposta para incorporação na RoadMesh; pedir condições separadas para tempos, manutenção e diagramas.
- **Concluído quando:** Documentação, acesso de testes e licença para o âmbito realmente utilizado.
- **Nota / ponto a confirmar:** Um preço de licença de utilizador final não prova permissão de revenda/incorporação.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-005 — Compra real de peças

- **Objetivo:** Disponibilidade, preço líquido, descontos e encomendas.
- **Quem procurar:** Distribuidores com que as oficinas já trabalham.
- **Como avançar:** Escolher um ou dois parceiros iniciais; pedir contacto de integração/parcerias e processo de autorização por oficina.
- **Concluído quando:** Acordo de parceria e regras para preços, encomendas, receções parciais, devoluções e garantia.
- **Nota / ponto a confirmar:** TecDoc não substitui o contrato comercial com cada distribuidor.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-006 — Faturação das oficinas

- **Objetivo:** Emissão através de fornecedor externo.
- **Quem procurar:** Moloni como candidato inicial; comparar outros fornecedores com API.
- **Como avançar:** Confirmar programa/versão na lista oficial e pedir condições de parceria, contas por oficina e ambiente de testes.
- **Concluído quando:** Fornecedor escolhido; proposta aceite quando autorizada; contas e condições de utilização confirmadas.
- **Nota / ponto a confirmar:** Nenhuma certificação própria da RoadMesh é presumida.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-007 — Cobrança das subscrições RoadMesh

- **Objetivo:** Receber a mensalidade paga pelas empresas.
- **Quem procurar:** Banco/PSP e contabilista.
- **Como avançar:** Separar avenças RoadMesh dos pagamentos das reparações; pedir proposta para pagamentos recorrentes, falhas e cancelamentos.
- **Concluído quando:** Contrato e circuito de faturação, recebimento, reconciliação e incumprimento definidos.
- **Nota / ponto a confirmar:** Base e módulos variáveis exigem confirmar como comunicar alterações futuras ao cliente.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-008 — Pagamentos dos clientes às oficinas

- **Objetivo:** MB WAY, cartões e ligações de pagamento.
- **Quem procurar:** SIBS ou outro prestador de pagamentos com oferta adequada.
- **Como avançar:** Apresentar modelo SaaS com oficinas independentes; perguntar se cada oficina precisa de contrato/conta e quem recebe o dinheiro.
- **Concluído quando:** Modelo de comerciantes aprovado, métodos suportados, comissões, liquidação, estornos e testes confirmados.
- **Nota / ponto a confirmar:** Não assumir que a conta de pagamentos RoadMesh pode cobrar por todas as oficinas.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-009 — Email operacional

- **Objetivo:** Recuperação de palavra-passe, acessos, orçamentos e avisos.
- **Quem procurar:** Serviço de email transacional.
- **Como avançar:** Escolher serviço, titular do domínio e remetentes; confirmar limites, reputação e suporte a várias empresas.
- **Concluído quando:** Domínio/remetente aprovados e conta com autorização de envio adequada.
- **Nota / ponto a confirmar:** A saída do ambiente de testes pode exigir validação do serviço; não é apenas criar uma chave.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-010 — SMS

- **Objetivo:** Avisos e lembretes.
- **Quem procurar:** Operador/agregador SMS; Twilio é um candidato a comparar.
- **Como avançar:** Pedir condições para Portugal, identidade de remetente, mensagens longas, entrega e eventuais respostas.
- **Concluído quando:** Tabela de custos e regras de remetente confirmadas; conta e ensaios aprovados.
- **Nota / ponto a confirmar:** Comparar custo por segmento, não só preço apresentado por mensagem.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-011 — WhatsApp das oficinas

- **Objetivo:** Avisos transacionais e aprovações.
- **Quem procurar:** WhatsApp Business Platform, diretamente ou por parceiro.
- **Como avançar:** Definir quem é titular do número e da conta de cada oficina; pedir processo de integração de várias empresas e aprovação de modelos.
- **Concluído quando:** Contas/números e modelos aprovados; custos e processo de adesão/desligamento definidos.
- **Nota / ponto a confirmar:** Abrir uma conversa no WhatsApp não é uma integração de envio automático.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-012 — Proteção de dados e contratos

- **Objetivo:** Relação RoadMesh/oficina/fornecedores e dados dos clientes finais.
- **Quem procurar:** Apoio jurídico com experiência em SaaS e proteção de dados.
- **Como avançar:** Mapear quem trata que dados e com que finalidade; rever contrato de serviço, subcontratação, fornecedores, retenção e incidentes.
- **Concluído quando:** Documentos revistos para o modelo real e responsabilidades atribuídas.
- **Nota / ponto a confirmar:** Não decidir por suposição que basta consentimento para qualquer tratamento.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-013 — Alojamento, base de dados e fotografias

- **Objetivo:** Serviços de produção e continuidade.
- **Quem procurar:** Fornecedores de infraestrutura a selecionar.
- **Como avançar:** Pedir região, subcontratantes, custos de base/armazenamento/tráfego, suporte e condições de saída.
- **Concluído quando:** Serviços escolhidos, custos previstos, titularidade de contas e condições contratuais conhecidos.
- **Nota / ponto a confirmar:** Não contratar serviços nem publicar o projeto durante este trabalho local.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-014 — Cópias e recuperação

- **Objetivo:** Continuidade do negócio se houver perda/erro.
- **Quem procurar:** Fornecedor de infraestrutura e responsável de operação.
- **Como avançar:** Definir perda máxima aceitável e tempo de recuperação; pedir custos e cobertura de cópias e restauro.
- **Concluído quando:** Política acordada, responsável e procedimento de recuperação ensaiado.
- **Nota / ponto a confirmar:** Cópia da base de dados não implica cópia das fotografias.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-015 — Domínios, marca e ativos

- **Objetivo:** Titularidade e utilização de RoadMesh, logótipo e materiais.
- **Quem procurar:** Registador, INPI e apoio de marcas quando necessário.
- **Como avançar:** Inventariar domínios e ativos existentes; pesquisar disponibilidade/conflitos antes de investir na divulgação.
- **Concluído quando:** Titularidade e permissões documentadas; decisões de proteção da marca registadas.
- **Nota / ponto a confirmar:** Sem pressupor prioridade de uma marca/ideia pela data de uma conversa.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-016 — Oficinas piloto e validação no terreno

- **Objetivo:** Confirmar os percursos reais.
- **Quem procurar:** Oficinas, stands e detailers disponíveis para piloto.
- **Como avançar:** Selecionar perfis diferentes e observar receção, aprovação, stock e entrega; acordar âmbito e uso de dados fictícios/anonimizados.
- **Concluído quando:** Critérios de sucesso, responsáveis e autorização de piloto definidos.
- **Nota / ponto a confirmar:** Dados técnicos e procedimentos de segurança devem ser revistos por profissionais do setor.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-017 — Política de receção e evidências

- **Objetivo:** Fotografias, danos, assinatura e entrega.
- **Quem procurar:** Oficinas piloto e apoio jurídico.
- **Como avançar:** Validar fotos mínimas, correções, conservação, acesso e eventual assinatura; confirmar limites do que o relatório comprova.
- **Concluído quando:** Procedimento operacional aprovado e termos de utilização do relatório definidos.
- **Nota / ponto a confirmar:** Não apresentar fotografias ou assinatura simples como garantia jurídica automática.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-018 — Migração de clientes

- **Objetivo:** Trazer dados de sistemas anteriores.
- **Quem procurar:** Cliente e fornecedor do sistema anterior.
- **Como avançar:** Pedir formatos e direitos de exportação, tipos de documento e amostra fictícia; definir limpeza e validação.
- **Concluído quando:** Formato e âmbito aprovados; autorização e critérios de conferência definidos.
- **Nota / ponto a confirmar:** Nunca pedir palavras-passe de outro sistema para guardar neste documento.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-019 — Assistência e compromisso comercial

- **Objetivo:** Horários, prioridades e resposta a incidentes.
- **Quem procurar:** Responsável de suporte e prestadores.
- **Como avançar:** Definir canais e quem responde, limites de suporte incluído, escalamento e disponibilidade realmente sustentável.
- **Concluído quando:** Condições de suporte e procedimento de incidentes acordados.
- **Nota / ponto a confirmar:** Não prometer 24/7 sem equipa e contrato que o suportem.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-020 — Marketing e conteúdos

- **Objetivo:** Campanhas, testemunhos e informação técnica publicada.
- **Quem procurar:** Clientes piloto, especialistas e revisão editorial.
- **Como avançar:** Definir consentimentos/autorização de uso de testemunhos e imagens; escolher temas e responsável pela atualização.
- **Concluído quando:** Origem e direitos de conteúdos confirmados e processo de revisão definido.
- **Nota / ponto a confirmar:** Uma biblioteca de veículos deve ter fontes e revisão, não apenas volume.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-021 — Equipamentos e serviços de diagnóstico

- **Objetivo:** OBD, ADAS ou outros equipamentos, se vierem a fazer parte do produto.
- **Quem procurar:** Fabricantes e técnicos qualificados.
- **Como avançar:** Confirmar se queremos apenas registar resultados ou comunicar com equipamentos; pedir documentação e termos específicos só para o segundo caso.
- **Concluído quando:** Âmbito escolhido e, se aplicável, acordo com fabricante e validação profissional.
- **Nota / ponto a confirmar:** Registar um código de erro ou uma calibração não equivale a executar diagnóstico/calibração.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-022 — Seguro e responsabilidade de serviço

- **Objetivo:** Incidentes, falhas de serviço e limites de responsabilidade.
- **Quem procurar:** Mediador/seguradora e apoio jurídico.
- **Como avançar:** Descrever o serviço, tipos de dados e responsabilidades; pedir avaliação da cobertura adequada ao negócio.
- **Concluído quando:** Decisão documentada sobre coberturas e exclusões.
- **Nota / ponto a confirmar:** Tema para avaliação comercial, sem presumir obrigatoriedade de uma apólice específica.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-023 — Saída, cancelamento e exportação

- **Objetivo:** Fim de contrato e portabilidade dos registos.
- **Quem procurar:** Jurídico, operação e clientes piloto.
- **Como avançar:** Definir aviso, acesso após cancelamento, exportação, prazo de retenção e eliminação com as exceções aplicáveis.
- **Concluído quando:** Procedimento e condições aprovados, coerentes com os contratos dos fornecedores.
- **Nota / ponto a confirmar:** Desativação de módulo, rescisão do serviço e eliminação definitiva são situações diferentes.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.

### EXT-024 — Publicação em lojas de aplicações

- **Objetivo:** Contas e distribuição, se lançarmos aplicações nativas.
- **Quem procurar:** Apple/Google e titular da entidade.
- **Como avançar:** Decidir primeiro se a versão web responde ao lançamento; se não, levantar contas, custos e requisitos oficiais atuais.
- **Concluído quando:** Decisão de canal e contas de organização quando necessárias.
- **Nota / ponto a confirmar:** Ainda não foi feita pesquisa de contratação nesta frente; não há decisão de publicação.
- **Responsável:** por atribuir. **Estado:** Por pesquisar. **Próxima revisão:** por definir.
- **Propostas, custos, prazo e referência do acordo:** ainda não obtidos.


## Caminhos de contacto já pesquisados

### Peças, matrícula e informação técnica — EXT-002 a EXT-005

Primeiro contacto sugerido: departamento comercial/parcerias da TecAlliance ou canal português confirmado. Apresentar a RoadMesh como software para várias empresas e pedir uma sessão conjunta comercial/técnica. Pedir separação entre catálogo de peças, identificação do veículo, informação técnica e transações com distribuidores.

Perguntas a colocar:
1. A licença permite mostrar os dados dentro da RoadMesh e cobrar pelo módulo a várias oficinas?
2. O contrato é por empresa, utilizador, consulta, volume ou combinação?
3. Há mínimos, custo de ativação, compromisso anual e ambiente de testes?
4. Qual a cobertura efetiva de matrículas portuguesas, marcas, veículos comerciais e variantes?
5. Existem limitações de imagens, referências, cache, documentos gerados e conservação após terminar o contrato?
6. Como se relaciona o identificador da viatura com as peças e tempos técnicos?
7. De que distribuidor vêm preço, stock e prazo? Se não vierem deste serviço, que contratos adicionais serão necessários?
8. Que suporte, atualização, limites de utilização e procedimento de falha estão incluídos?

Não foi encontrado um orçamento público adequado ao nosso caso; custo e elegibilidade ficam por confirmar.

### Faturação — EXT-006

Como primeiro candidato de pesquisa, o Moloni tem documentação pública de API, processo de developer e referência a sandbox. A documentação distingue a conta de desenvolvimento das contas ativas dos clientes e indica que o acesso à API depende do plano. É uma possibilidade a comparar, sem fornecedor escolhido. [Introdução Moloni](https://www.moloni.pt/dev/), [modelo de ligação de contas](https://www.moloni.pt/dev/visao-geral).

Passos comerciais: apresentar o SaaS, pedir condições de parceria e esclarecer se cada oficina contrata diretamente. Confirmar licenciamento, documentos suportados, custos por conta, limites, suporte e procedimento de correção/saída. Confirmar programa e versão na lista oficial e rever o modelo com contabilista antes de anunciar emissão fiscal. [Consulta oficial de programas certificados](https://www.gov.pt/servicos/consultar-o-programa-de-faturacao-certificado).

Há uma decisão separada, ainda aberta: integrar um produto de faturação existente ou desenvolver um produto fiscal próprio. A primeira é o caminho inicial proposto; a segunda exige levantamento específico e não está autorizada ou resolvida por existir um PDF na aplicação.

### Pagamentos — EXT-007 e EXT-008

A SIBS publica documentação de pagamentos, MB WAY, ligações de pagamento e adesão de comerciantes. Esta documentação permite iniciar a conversa, mas não define o contrato nem a elegibilidade da RoadMesh. [Documentação SIBS](https://www.docs.pay.sibs.com/).

Pedir proposta descrevendo dois fluxos distintos:
- Empresas pagam a subscrição à RoadMesh.
- Proprietários de veículos pagam reparações diretamente à respetiva oficina.

Perguntar quem contrata, quem é o comerciante, para que conta é liquidado o valor, documentação exigida, comissões, mínimos, recorrência, devoluções, disputas e testes. Não assumir que “aceitar MB WAY” resolve contas de várias empresas. Preferir a discussão de um modelo em que o prestador processa os pagamentos e a oficina recebe segundo o respetivo contrato; validar qualquer modelo alternativo com prestador e apoio especializado.

### Email, SMS e WhatsApp — EXT-009 a EXT-011

Para email, Amazon SES é um exemplo com verificação de identidades e restrições no ambiente de testes; existem alternativas a comparar. Pedir condições de envio operacional, limites e responsabilidade por mensagens das oficinas. [Verificação e ambiente de testes SES](https://docs.aws.amazon.com/en_en/ses/latest/dg/sending-authorization-identity-owner-tasks-verification.html).

Para SMS, comparar propostas com cobertura portuguesa e confirmar identificação do remetente, comprimento/segmentação e entrega. A Twilio publica orientações próprias para Portugal, que são um ponto de pesquisa e não uma proposta contratual nossa. [SMS em Portugal](https://www.twilio.com/en-us/guidelines/pt/sms).

Para WhatsApp, usar a oferta Business Platform diretamente ou através de parceiro e confirmar adesão de cada oficina, propriedade dos números, modelos, mensagens iniciadas pela empresa e custos. O procedimento deve permitir que uma oficina saia sem perder indevidamente o seu número. [WhatsApp Business Platform](https://whatsappbusiness.com/products/business-platform/), [guia de adesão através de parceiro](https://whatsappbusiness.com/wp-content/uploads/2026/04/Onboarding-to-the-WhatsApp-Business-Platform.pdf).

Não existem contas aprovadas, preços contratados ou envios automáticos autorizados neste momento.

### Proteção de dados — EXT-012

O trabalho a contratar é uma revisão do modelo real: dados dos utilizadores RoadMesh, dados tratados por conta das oficinas, fotografias, prestadores e finalidade de mensagens. A CNPD disponibiliza informação e modelos para registos de tratamento e aborda contratos com subcontratantes. Levar ao apoio jurídico um mapa dos dados e fornecedores em vez de apenas pedir um texto genérico de privacidade. [Registo de atividades](https://www.cnpd.pt/organizacoes/outras-obrigacoes/registo-de-atividades-de-tratamento/), [orientação sobre subcontratação](https://www.cnpd.pt/umbraco/surface/cnpdDecision/download/121958).

Termos de serviço, condições de subscrição, privacidade, receção de veículos e marketing precisam de revisão própria para a operação que escolhermos. Este registo organiza as tarefas e não substitui essa revisão.

## Antes de pedir propostas: preparar uma apresentação curta

Preparar uma página com:
- O que é a RoadMesh e a entidade que irá contratar.
- Portugal como mercado inicial, se essa decisão se mantiver.
- Oficinas, stands e detailers como empresas independentes.
- Função concreta pretendida e dados que precisamos de consultar/enviar.
- Número de empresas piloto e previsões de utilização, marcadas como estimativas.
- Modelo comercial: preço base e módulos por empresa.
- Pedido de proposta para testes e produção, direitos de utilização, mínimos, duração, suporte e saída.

Não é preciso revelar código, dados de clientes ou credenciais para pedir uma primeira proposta.

## Como comparar propostas

| Tema | O que registar |
|---|---|
| Direito de uso | Consulta interna, incorporação, revenda e utilização por várias empresas |
| Âmbito | Dados/métodos/canais incluídos e excluídos |
| Preço | Ativação, mínimo, mensalidade, consumo, extras e impostos quando aplicável |
| Escala | Custo estimado para 5, 25 e 100 empresas, usando hipóteses explícitas |
| Testes | Acesso de demonstração, dados fictícios, limites e aprovação para produção |
| Operação | Suporte, incidentes, horários, disponibilidade e atualização |
| Dados | Origem, direitos, localização, retenção e subcontratantes |
| Saída | Prazo, exportação, portabilidade, eliminação e continuidade para os clientes |
| Decisão | Responsável, alternativa escolhida e motivo |

Não escolher apenas pelo menor preço de entrada. Não preencher custos desconhecidos com zero.

## Ordem prática para começar

1. Atribuir responsáveis e preparar a apresentação curta.
2. Pedir informação comercial de catálogo/identificação/dados técnicos e faturação. Podemos desenvolver os percursos locais em paralelo.
3. Selecionar oficinas piloto e levantar distribuidores reais.
4. Tratar domínio/email e desenho dos contratos/dados antes de um piloto com dados reais.
5. Pedir propostas separadas para mensalidades RoadMesh e pagamentos às oficinas.
6. Acrescentar SMS/WhatsApp e restantes serviços à medida que o produto estiver pronto para os utilizar.

A pesquisa e preparação não autorizam contactos em nome do utilizador, adesões, pagamentos ou assinatura de contratos. Esses passos serão feitos quando forem explicitamente pedidos.

## Modelo para acrescentar uma pendência

- **ID / título:**
- **Data de abertura / última atualização:**
- **Área / módulos afetados:**
- **Problema ou necessidade:**
- **Estado / prioridade / responsável:**
- **Quem contactar e fonte oficial:**
- **O que já sabemos / o que falta confirmar:**
- **Próxima ação concreta:**
- **Custos e condições obtidos:**
- **Dependências:**
- **Concluído quando:**
- **Decisão / evidência / próxima revisão:**

## Histórico de decisões e contactos

| Data | Item | Registo | Próxima ação |
|---|---|---|---|
| 2026-11-08 | Geral | O utilizador confirmou que ainda não existem fornecedores/contratos para as ligações externas. Criado este registo; pesquisa preliminar pública, sem contactos. | Atribuir responsáveis e preparar pedidos de proposta |
| 2026-11-08 | Geral | Continuar desenvolvimento e ensaios locais; não apresentar ligações externas como operacionais. | Atualizar cada ficha quando houver informação nova |

Documentos relacionados: [análise Carbob](ANALISE-CARBOB-2026-11-08.md), [requisitos funcionais](analise-carbob/REQUISITOS.md) e [proposta inicial de módulos](PROPOSTA-MODULOS.md).

