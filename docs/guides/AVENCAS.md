# Avenças e assistência RoadMesh

A dashboard Admin acompanha a faturação da RoadMesh às empresas e as horas de apoio prestadas a essas empresas. Estes valores são independentes das vendas, documentos, pagamentos e mão de obra registados pelas oficinas para os seus próprios clientes.

Na tabela **Avenças e horas por empresa**, selecione o mês e use **Registar** ou **Editar**. Indique o total faturado, o total recebido, as horas incluídas na avença e as horas de assistência utilizadas. A data limite e as notas são opcionais. Não se assume uma avença padrão de 10 horas: cada empresa e cada mês têm os seus valores.

Os registos são manuais e internos: não emitem documentos fiscais, não processam cobranças e não alteram as permissões da empresa. Não há transferência automática de horas entre meses nem cobrança automática de horas extra. As comparações usam o mês de referência do registo, incluindo os recebimentos associados a esse mês.

- **Pago:** faturação positiva e totalmente recebida.
- **Pendente:** falta receber parte do valor faturado.
- **Sem registo:** ainda não existe informação do mês; não significa falta de pagamento.
- **Sem cobrança:** existe um registo explícito com faturação zero.
- **Em atraso:** valor pendente e data limite anterior ao dia atual em Portugal continental.

Os gráficos comparam os meses do ano selecionado com o ano anterior. O resumo mensal compara com o mês anterior (incluindo dezembro do ano anterior em janeiro); o anual compara o ano completo com o anterior. A situação de pagamentos e a tabela apresentam sempre o mês indicado nos respetivos títulos.

As horas extra são calculadas por empresa e por mês, antes de somar: horas não utilizadas por outra empresa ou noutro mês não anulam um excesso.

Os registos ficam nos metadados privados de `workshops` (compatíveis com MongoDB e com o adaptador PostgreSQL existente), sem migração SQL. A API de gravação é exclusiva da administração, valida valores e impede alterações concorrentes de sobrescreverem um registo entretanto atualizado. Cada gravação fica na auditoria. Empresas arquivadas preservam os registos para consulta. Os valores comerciais internos são excluídos dos snapshots dos documentos das oficinas.
