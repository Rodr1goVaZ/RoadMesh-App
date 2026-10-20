# RoadMesh: Supabase e Vercel

## Estado da adaptação

A API seleciona PostgreSQL quando `DATABASE_URL` está preenchido. Usa as tabelas reais do esquema privado `roadmesh`; linhas de serviços, orçamentos e encomendas são guardadas nas tabelas de linhas. Não utiliza as tabelas antigas em `public` nem o Supabase Authentication. Mantém os perfis admin, workshop_staff e client, bcrypt, JWT, renovação e revogação de sessões.

Não foi feita uma ligação à instância Supabase do utilizador. Não são necessárias credenciais de produção para os testes locais. A publicação e os testes na Vercel ainda precisam de ser feitos.

## 1. Completar o SQL

No SQL Editor do Supabase:

- Se já criou as 22 tabelas com o ficheiro inicial: execute **apenas** `backend/sql/002_backend_compatibility.sql`, uma vez.
- Numa instalação nova: execute `001_initial.sql` e depois `002_backend_compatibility.sql`.

Não volte a executar o SQL inicial sobre o esquema existente. Ambos os ficheiros usam transações e falham se não encontrarem a estrutura esperada. Não apagam nem alteram `public`, `auth` ou dados antigos. O complemento ajusta números de OS, precisão de quantidades/preços, campos de fotografias, contadores e metadados extensíveis. Mantém 22 tabelas.

Pode confirmar a instalação com:

```sql
SELECT obj_description('roadmesh'::regnamespace, 'pg_namespace');
```

O resultado deverá indicar `RoadMesh PostgreSQL schema version 2; private server access`.

As tabelas têm RLS ativado e não dão permissões aos perfis de browser `anon` ou `authenticated`. **Não adicione `roadmesh` aos schemas expostos da Data API**. A interface comunica com a API FastAPI; nunca recebe a ligação PostgreSQL. A ligação `postgres` que o painel fornece é uma conta privilegiada: fica apenas no backend, e a API aplica os filtros de oficina/cliente. RLS sem políticas não isola utilizadores quando a ligação é feita pelo proprietário das tabelas. Uma conta SQL dedicada pode ser configurada antes de alargar a utilização para produção.

## 2. Configuração privada do backend

Copie os nomes de `backend/.env.example`, sem substituir ficheiros existentes. Defina no backend local ou nas variáveis de ambiente da API na Vercel:

| Nome | Valor |
| --- | --- |
| DATABASE_URL | URI completa de Connect → Transaction pooler; substituir a palavra-passe e acrescentar `sslmode=require` se ainda não existir |
| DATABASE_POOL_SIZE | `4` |
| JWT_SECRET | Segredo aleatório novo com pelo menos 32 caracteres |
| BOOTSTRAP_ADMIN_EMAIL | Email para o administrador online |
| BOOTSTRAP_ADMIN_PASSWORD | Palavra-passe temporária nova com pelo menos 12 caracteres |
| CORS_ORIGINS | Origem exata da interface, por exemplo `https://nome-real.vercel.app` |

O URI deve manter a porta e o utilizador completos apresentados pelo Supabase. Caracteres especiais na palavra-passe precisam de codificação de URL. Nunca coloque `DATABASE_URL`, palavras-passe ou `JWT_SECRET` no frontend, no GitHub ou numa captura partilhada. Não é necessário configurar `MONGO_URL` ou `DB_NAME` no modo PostgreSQL.

O código desativa prepared statements, usa nomes de esquema explícitos e configura opções apenas dentro de transações, para ser compatível com o transaction pooler. As ligações remotas requerem TLS. Cada processo tem um pool limitado. Nesta primeira versão, as escritas são serializadas por um advisory lock transacional da base de dados para preservar as regras de stock, numeração, conversões e emissão entre instâncias. É uma opção conservadora para testes; deve ser revista com testes de carga antes de utilização intensiva.

## 3. Fotografias

A base PostgreSQL guarda metadados e relações das fotografias, mas não os ficheiros. O modo local serve para testes no computador e não dá persistência na Vercel. O adaptador remoto existente continua disponível com `STORAGE_DRIVER=managed` e uma `EMERGENT_LLM_KEY` válida. Não foi validado com o fornecedor real.

O Supabase Storage ainda não está integrado. Criar um bucket não faz a aplicação passar a usá-lo. Na Vercel, o pedido completo tem um limite de 4,5 MB; até existir carregamento direto, use imagens com menos de 4 MB. Para testes completos online das fotografias, é necessário preparar e validar o armazenamento remoto.

## 4. Enviar as alterações e publicar

Depois de rever as alterações, na raiz do projeto:

```bash
git add -A -- . ':(exclude)frontend/RoadMesh'
git commit -m "Adicionar suporte PostgreSQL Supabase"
git push origin main
```

Crie dois projetos Vercel a partir do mesmo repositório:

1. API: Root Directory `backend`, Framework FastAPI. O repositório inclui `.python-version` com 3.12, `vercel.json` e exclusões de ficheiros privados. Configure as variáveis acima antes de publicar. Não use `dev.sh` nem `demo_server.py` na Vercel.
2. Teste a API em `https://DOMINIO-REAL-DA-API/api/`: deve responder `{"app":"RoadMesh","status":"ok"}`. Um erro de arranque que pede SQL indica que falta aplicar o complemento. Use os logs da Vercel para outros erros de ligação; não partilhe segredos.
3. Interface: Root Directory `frontend` (não `frontend/RoadMesh`), Framework Other, Node 22.x. O `frontend/vercel.json` configura a exportação Expo e as rotas. Defina `EXPO_NO_DOTENV=1` e `EXPO_PUBLIC_BACKEND_URL=https://DOMINIO-REAL-DA-API`, **sem `/api`**. Volte a publicar se mudar esta variável.
4. Atualize `CORS_ORIGINS` na API para o domínio real da interface e volte a publicar a API.
5. Use os domínios estáveis de produção. A proteção de deployment da API não pode exigir uma sessão Vercel aos pedidos públicos da interface; não coloque segredos de bypass no frontend.

Entre pela área de administração com `BOOTSTRAP_ADMIN_*`, altere a palavra-passe e crie uma oficina. As contas de teste locais e os dados em `.demo` não são transferidos automaticamente para o Supabase.

## 5. Verificação e limites

Verificação desta alteração: 64 testes aprovados com PostgreSQL incorporado (2 testes exclusivos de MongoDB omitidos), 59 testes aprovados em MongoDB real local (7 exclusivos de PostgreSQL omitidos), 6 testes de sessões da interface e exportação web Expo aprovada. Foram também verificados erros Python e espaços no diff. O ambiente bloqueou `shmget`, necessário ao servidor PostgreSQL nativo; não foi possível executar esse modo aqui. Nenhuma credencial ou ligação ao Supabase real foi usada.

O runner abaixo inicia uma base PostgreSQL nativa descartável e a API em portas/pastas isoladas; aplica ambos os SQL e executa os testes. Não lê a ligação Supabase do `.env` e elimina os dados de teste ao terminar. Requer os binários incluídos no pacote `pgserver`:

```bash
# Na raiz do projeto, com o ambiente Python ativado:
pip install -r backend/requirements-dev.txt pgserver==0.1.4
python backend/tests/run_postgres.py -q
```

Em ambientes que bloqueiam a memória partilhada necessária ao PostgreSQL nativo, existe uma alternativa com PostgreSQL incorporado (PGlite):

```bash
npm install --prefix /tmp/roadmesh-pglite @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
python backend/tests/run_postgres.py --pglite-runtime /tmp/roadmesh-pglite -q
```

O motor incorporado permite testar SQL, transações, permissões, rollback e pedidos da API, mas multiplexa as ligações; não substitui testes de concorrência entre processos num PostgreSQL/Supabase real. Dois testes específicos de injeção MongoDB são omitidos em PostgreSQL; existem equivalentes SQL de rollback e faturação.

Depois de publicar, confirme também na instância real: três perfis, isolamento entre oficinas, criação/edição de serviços, consumo de stock, receção única de encomendas, conversão única de orçamento, emissão/PDF e marcações. Fotografias precisam do armazenamento descrito acima. Dispositivos iOS/Android e desempenho com carga ainda precisam de validação.

Documentação: [Supabase: ligações PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel: FastAPI](https://vercel.com/docs/frameworks/backend/fastapi), [Expo: publicação web](https://docs.expo.dev/guides/publishing-websites/).
