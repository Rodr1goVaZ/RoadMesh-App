# Módulos independentes e presets

Desenvolvimento local na branch `UI-empresarios-digo`. Sem commit, push, deploy ou alterações em bases online.

## Catálogo inicial

| Identificador | Módulo | Conteúdo |
|---|---|---|
| `customer_database` | Base de dados | Gestão das fichas de clientes e viaturas |
| `inventory` | Gestão de stocks | Produtos, fornecedores, encomendas e movimentos |
| `service_orders` | Ordens de serviço | Serviços, orçamentos e documentos internos |
| `vehicle_reception` | Receção de veículos | Fotografias e registo de danos na entrada da viatura |
| `customer_notifications` | Notificações aos clientes | Marcações, acompanhamento e comunicações existentes |

Os módulos são selecionados e tarifados individualmente. Não pertencem a um tipo de empresa. Uma empresa pode ter qualquer combinação, incluindo nenhum módulo; neste caso mantém a conta e um painel sem funcionalidades comerciais ativas.

Os outros fluxos podem ler as referências a clientes/viaturas necessárias ao seu funcionamento. Criar, editar ou apagar essas fichas exige Base de dados. Ler uma ficha não revela fotografias ou serviços de módulos desativados. As regras são verificadas na API, além dos menus e páginas.

## Presets

Oficina, Stand e Detailer são exemplos iniciais, guardados na tabela/coleção `module_presets`. A engrenagem permite mudar o nome e os módulos. Também é possível criar presets. Selecionar vários presets faz a união dos módulos; a seleção manual continua disponível.

Os presets não são permissões nem contratos: editar um preset não muda empresas existentes, preços negociados ou a seleção já feita no formulário. As revisões impedem sobrepor uma edição concorrente sem atualizar a lista. Só a administração global pode gerir presets.

## Preços e histórico

`monthly_fee = base_monthly_fee + soma(module_prices[m] para os enabled_modules)`.

O servidor calcula o total com cêntimos exatos e valida os preços. Os preços negociados ficam na própria empresa; os preços iniciais dos novos módulos são zero até a administração os preencher. Desativar um módulo retira-o do total sem eliminar os seus dados nem o preço guardado.

Alterar uma empresa regista a configuração anterior e a nova na auditoria. Não altera `platform_service_months` nem os movimentos de faturação/pagamentos. Os formulários de novos registos presentes/futuros sugerem a mensalidade acordada; os registos existentes conservam os seus valores. Não há cobrança bancária, emissão fiscal ou rateio diário automático.

## Sessão e compatibilidade

Novas configurações usam `subscription_version=1`, `enabled_modules`, `module_prices` e `base_monthly_fee`. O workspace comum passa a mostrar apenas os módulos ativos. A configuração é atualizada a cada 15 segundos e ao regressar à aplicação; a API aplica alterações imediatamente.

As instalações antigas sem esta versão continuam a usar os acessos Oficina/Stand existentes até serem editadas e guardadas com a nova seleção. Os dados existentes não são eliminados. O novo catálogo não associa automaticamente um preset a uma área Stand separada.

## Base de dados e validação local

MongoDB cria os presets iniciais no arranque. PostgreSQL precisa da migração aditiva `007_module_presets.sql`, depois de 001–006 (004 conforme o papel usado). O inventário passa de 32 para 33 tabelas; backup/restauro e os testes descartáveis reconhecem o esquema 7. A migração não foi aplicada em bases online.

Os testes cobrem as 32 combinações, limites de preços, cálculo autoritativo, preservação de meses anteriores, presets e revisões, referências entre módulos, portal e revogação de acesso com a mesma sessão. PostgreSQL foi validado em PGlite local; os testes específicos de MongoDB mantêm as exclusões declaradas pelo runner.
