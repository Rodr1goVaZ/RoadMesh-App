# Proposta de especificações dos módulos

Documento para discussão. Define a divisão funcional pretendida para a próxima fase; não significa que todas as funções abaixo já estejam implementadas.

## Regras comuns

- Login, conta, tema, gestão da empresa e permissões fazem parte da plataforma comum.
- Cada módulo é independente. Oficina, Stand e Detailer são presets editáveis, não condições de acesso às funcionalidades.
- Aplicar um preset substitui a seleção de módulos. Depois é possível personalizá-la manualmente.
- O dashboard, a navegação e as permissões da API devem acompanhar os módulos ativos.
- Mensalidade = base acordada + preços dos módulos ativos. Alterações só afetam o período seguinte aplicável; meses já registados mantêm os valores faturados.
- Desativar um módulo não apaga os seus registos. É preciso definir a consulta e a recuperação do histórico quando o módulo está inativo.
- Ligações entre módulos não podem ativar outro módulo implicitamente. A identificação mínima de um cliente/veículo numa receção ou ordem de serviço não dá acesso à gestão completa da base de dados.

## 1. Base de dados

**Objetivo:** gerir as fichas de clientes e viaturas.

- Clientes: identificação, contactos, observações e veículos associados.
- Viaturas: matrícula, marca/modelo, ano, combustível, quilometragem e relação com o cliente.
- Pesquisa, deteção de possíveis duplicados, edição e histórico das alterações.
- Histórico da ficha com ligações apenas às funcionalidades permitidas para aquela empresa/utilizador.

**A fechar:** campos obrigatórios, importação inicial e tratamento de mudança de proprietário.

## 2. Gestão de stocks

**Objetivo:** acompanhar produtos, fornecedores e quantidades.

- Produtos com referência, categoria, código de barras, custo e preço de venda.
- Entradas, saídas e ajustes identificados com motivo e utilizador.
- Fornecedores, encomendas e receção de material.
- Quantidades mínimas e alertas de reposição.
- Ligação opcional às ordens de serviço quando ambos os módulos estão ativos.

**A fechar:** política de stock negativo, reservas e momento de descontar material aplicado numa ordem de serviço.

## 3. Ordens de serviço

**Objetivo:** gerir o trabalho efetuado na viatura.

- Abertura com cliente/viatura, pedido inicial, diagnóstico e responsável pelo trabalho.
- Orçamento com peças, mão de obra e aprovação/recusa.
- Estados de execução, notas e anexos.
- Conclusão, entrega e documento de trabalho em PDF.
- Consumo de material e comunicações ligados aos respetivos módulos, quando ativos.

**A fechar:** estados finais do processo, forma de aprovação do orçamento e regras de alteração após conclusão. A emissão de documentos fiscais precisa de escopo próprio antes de ser incluída.

## 4. Receção de veículos

**Objetivo:** registar o estado da viatura à entrada, com fotografias que salvaguardem a empresa.

1. Identificar cliente e viatura e registar data/hora, quilometragem e observações.
2. Fotografar a viatura e associar danos com localização, tipo, gravidade e notas.
3. Rever e finalizar o registo de receção.
4. Gerar um relatório para consulta/download, com histórico das alterações posteriores à finalização.

**A fechar primeiro:** fotografias obrigatórias, checklist de entrada, assinatura do cliente e possibilidade de registar também fotografias na entrega. O envio automático do relatório pertence às notificações; o registo e o download devem funcionar sem esse módulo.

## 5. Notificações aos clientes

**Objetivo:** gerir marcações e comunicações com os clientes.

- Pedidos de marcação, confirmação, reagendamento e cancelamento.
- Mensagens manuais e modelos de comunicação.
- Avisos de eventos de receção/ordens de serviço, quando esses módulos também estão ativos.
- Histórico de envios e estados de entrega/falha, com controlo para evitar duplicados.
- Portal do cliente com o conteúdo autorizado para os módulos ativos da empresa.

**A fechar:** canais da primeira versão (aplicação/email/SMS/WhatsApp), eventos automáticos e regras de lembretes. Integrações e custos de canais externos precisam de decisão específica.

## Sequência sugerida para discussão

Começar pela receção de veículos, aproveitando as referências de cliente e viatura existentes. Fechar o percurso completo de entrada, fotografias, danos e relatório antes de avançar para integrações entre módulos.

Três decisões iniciais:

1. Qual o primeiro módulo a aprofundar?
2. Na receção, quais fotografias/checklist são obrigatórios e a assinatura entra já na primeira versão?
3. Nas notificações, quais os canais a suportar inicialmente?
