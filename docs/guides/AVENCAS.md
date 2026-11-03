# Avenças e assistência RoadMesh

A dashboard Admin acompanha a faturação da RoadMesh às empresas e as horas de apoio prestadas a essas empresas. Estes valores são independentes das vendas, documentos, pagamentos e mão de obra das oficinas para os seus clientes.

## Utilização

1. Na tabela **Avenças e horas por empresa**, selecione o mês e use **Registar** ou **Editar**.
2. Configure o valor faturado, as horas incluídas e, opcionalmente, a data limite e notas. Guarde primeiro estas condições. Uma alteração posterior da faturação ou das horas incluídas exige uma justificação nas notas.
3. Abra novamente o editor e use o **Histórico de pagamentos e assistência** para acrescentar cada movimento. Indique valor/horas, data efetiva, referência e descrição; pagamentos exigem também o método. Os totais de recebimentos e horas utilizadas são calculados pelo histórico.
4. Para corrigir um pagamento ou assistência, use **Estornar este movimento** e indique data, referência e motivo. O estorno é integral, só pode ocorrer uma vez e preserva o original. Depois pode registar o movimento correto.

O mesmo editor é utilizado no dashboard e na ficha da empresa. Os dados contratuais não criam cobranças automaticamente. Não há valor obrigatório predefinido para horas de assistência; zero é válido.

## Interpretação

- **Pago:** faturação positiva e totalmente recebida.
- **Pendente:** falta receber parte do valor faturado.
- **Sem registo:** ainda não existe informação do mês; não significa falta de pagamento.
- **Sem cobrança:** existe um registo explícito com faturação zero.
- **Em atraso:** valor pendente e data limite anterior ao dia atual em Portugal continental.

Os gráficos comparam os meses do ano selecionado com o ano anterior. As empresas elegíveis são calculadas usando as datas de criação e de arquivo em cada período. O resumo mensal compara com o mês anterior; o anual compara o ano completo com o anterior. Horas extra são calculadas por empresa/mês antes de somar: horas não utilizadas não anulam um excesso de outra empresa ou de outro mês.

A data de entrada do dinheiro pode diferir do mês da avença. O histórico mostra a data efetiva do movimento; os gráficos existentes continuam a analisar a avença pelo mês de faturação. Não são um extrato de caixa por data de recebimento.

Os registos são internos: não emitem documentos fiscais, não processam cobranças, não alteram permissões nem cobram horas extra automaticamente.

## Preservação e publicação

Esta versão requer a migração **006** em PostgreSQL. Os períodos e movimentos têm tabelas próprias, e os metadados mensais da empresa mantêm uma projeção para os ecrãs existentes. API, projeção e auditoria são atualizadas na mesma transação. Reenvios identificados não duplicam pagamentos; operações que excedam a dívida ou produzam totais negativos são rejeitadas.

Os totais anteriores ficam preservados como saldos de abertura com data original desconhecida. Não são transformados em pagamentos com datas inventadas. A primeira alteração importa os saldos anteriores apenas uma vez. Aberturas de recebimentos/assistência também podem ser estornadas explicitamente.

A API é exclusiva da administração. Empresas arquivadas preservam o histórico para consulta. No PostgreSQL, triggers impedem alterações ou eliminações dos movimentos, períodos e auditoria; no MongoDB, a aplicação expõe apenas inserção/estorno e não equivale a uma proteção contra o proprietário alterar diretamente a base. Faturas das oficinas só copiam a identidade pública da empresa.

Ver [INTEGRAR-DIGO.md](INTEGRAR-DIGO.md) para migração, validação e publicação.
