# Empresas: criação, edição e publicação

O Admin tem páginas separadas para criar (`/criar-empresa`), editar
(`/editar-empresa?id=…`), consultar (`/empresa?id=…`) e listar (`/empresas`).
Criação e edição partilham o formulário e as validações.

## Campos e etapas

| Etapa | Dados |
|---|---|
| Introdução | Módulos Oficina/Stand/ambos, nome comercial obrigatório, descrição opcional |
| Identificação | Denominação social, NIF/NIPC e tipo de entidade obrigatórios; titular ou pessoas da sociedade, início de atividade, website, horário e logótipo opcionais |
| Morada | País, distrito/região, concelho/município, código postal e morada obrigatórios |
| Faturação e assistência | Valor mensal, periodicidade, dia de pagamento e horas mensais incluídas obrigatórios; preço da hora extra e email de faturação opcionais |
| Contactos e acesso | Pelo menos um contacto (telemóvel ou telefone), email geral, nome e email de acesso do responsável obrigatórios |

As sugestões mensais são 200 € para Oficina, 150 € para Stand e 300 € para
Oficina + Stand. São editáveis; mudar os módulos preserva um preço negociado.
As horas de assistência não têm um valor obrigatório predefinido: zero é válido.
Em Portugal, NIF/NIPC tem nove algarismos e o código postal usa `0000-000`.
As datas são escritas em `DD/MM/AAAA` e enviadas à API em `AAAA-MM-DD`.
Um contacto fornecido tem de ser válido mesmo quando o outro também está preenchido.

## Persistência e compatibilidade

- A API `/api/admin/workshops` cria e edita empresas. Os modelos e validações
  estão em `backend/roadmesh/modules/administration/routes.py`.
- `company_profile_version: 2` ativa a validação completa dos dados da empresa;
  `billing_terms_version: 1` exige os dados contratuais de faturação.
  Clientes antigos da API continuam a poder enviar o formato anterior.
- No MongoDB, os campos adicionais ficam no documento `workshops`. No adaptador
  PostgreSQL/Supabase existente, ficam no JSONB `roadmesh.workshops.metadata`.
  Os rascunhos privados ficam nos metadados do próprio administrador em `users`.
- Os campos de identificação e os rascunhos não exigem novas colunas SQL quando o esquema atual do projeto
  já está instalado, incluindo as colunas `metadata` exigidas pelo adaptador.
  Num ambiente desatualizado, rever primeiro as migrações já existentes em
  `backend/sql` e o guia de base de dados do projeto; não executar SQL por suposição.
- O livro de pagamentos e assistência requer a migração 006 e as tabelas de períodos/movimentos. Os totais mensais projetados usam `platform_service_months`
  e `platform_service_revision`. São internos à administração e não representam
  a faturação das oficinas aos seus clientes. Ver [AVENCAS.md](AVENCAS.md).
- O logótipo usa o serviço de media existente. As credenciais criadas são
  apresentadas num pop-up e mantidas apenas em memória, sem URLs ou rascunhos.

Fazer commit/push publica o código, não copia a base MongoDB local para Supabase.
Antes de publicar a aplicação, validar o backend, autenticação, armazenamento e
variáveis privadas do ambiente de destino. Os testes locais MongoDB não provam
que um projeto Supabase remoto esteja configurado ou migrado.

## Limpeza local

`scripts/clean_local_data.py` está limitado a `roadmesh_demo`, no replica set
`roadmesh-demo`, em `127.0.0.1:27037`. Sem argumentos, apenas apresenta contagens.
Com `--apply`, copia os documentos BSON e a configuração para `.demo/backups/`,
limpa os registos e os rascunhos remotos e preserva o administrador local.
As fotografias são movidas para a mesma cópia. Os índices são mantidos.

A limpeza grava `seed_demo: false` em `.demo/config.json`: reiniciar mantém o
ambiente limpo. Para repor os exemplos intencionalmente, usar
`scripts/demo.py --seed-demo` através do Python do ambiente local. Não executar
esta limpeza em produção nem adaptar o endereço para uma base remota.

`.demo/`, `.env`, `ACESSOS-TESTES.md` e backups privados ficam fora do Git.
