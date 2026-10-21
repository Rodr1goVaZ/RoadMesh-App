# RoadMesh

Aplicação móvel, web e tablet para oficinas automóveis. Expo/React Native no frontend, FastAPI e PostgreSQL/Supabase ou MongoDB no backend.

Para publicar na Vercel com Supabase, siga [SUPABASE.md](SUPABASE.md). Quando `DATABASE_URL` está preenchido, todos os registos da API usam as tabelas relacionais do esquema `roadmesh`. Sem essa variável, mantém-se o modo MongoDB. O ambiente `./dev.sh` continua isolado em MongoDB local.

## Estrutura

- `frontend/`: aplicação RoadMesh principal, com áreas de administração, oficina e cliente.
- `frontend/RoadMesh/`: projeto Expo de exemplo independente. Não pertence à app principal e está excluído do TypeScript e ESLint desta.
- `backend/`: API, controlo de acessos, fotografias e PDFs.
- `backend/tests/`: regressão da API e testes de concorrência/rollback.

## Demonstração pronta para testes

Neste Mac, execute `./dev.sh` ou abra `Iniciar-Testes.command`. A aplicação fica em **http://localhost:8765**, com contas de oficina, cliente e administração, dados fictícios e fotografias locais persistentes. O ambiente é separado da configuração e dos dados existentes.

Veja [TESTAR.md](TESTAR.md) para os acessos, percurso de teste e arranque no browser de um telemóvel.

## Arranque local

Requisitos: Python 3.12, Node.js 22.13+, Yarn 1 e PostgreSQL/Supabase (ver SUPABASE.md) ou MongoDB com **replica set** ou MongoDB Atlas. Um MongoDB standalone não suporta as transações usadas pelo stock e pelos documentos; a API verifica esta condição no arranque.

1. Se precisar de MongoDB local e tiver Docker, execute na raiz:

   ```bash
   docker compose up -d --wait
   ```

   O serviço inicializa um replica set de um membro, acessível apenas em `127.0.0.1:27017`. Este compose destina-se a desenvolvimento local; não configura autenticação ou TLS.

2. Crie a configuração local, apenas se os ficheiros ainda não existirem:

   ```bash
   cp -n backend/.env.example backend/.env
   cp -n frontend/.env.example frontend/.env
   ```

   Preencha `JWT_SECRET` com um segredo aleatório de pelo menos 32 caracteres e `BOOTSTRAP_ADMIN_PASSWORD` com uma palavra-passe de pelo menos 12 caracteres. Pode gerar valores com:

   ```bash
   python3.12 -c 'import secrets; print(secrets.token_urlsafe(48))'
   ```

   Configure `BOOTSTRAP_ADMIN_EMAIL`, `MONGO_URL` e `DB_NAME`. `EMERGENT_LLM_KEY` é necessário para fotografias no armazenamento gerido. Sem essa integração, os restantes módulos podem arrancar, mas carregar/obter fotografias falha com uma mensagem de indisponibilidade.

   No frontend, defina `EXPO_PUBLIC_BACKEND_URL=http://SEU_IP:8000`. Num telemóvel, use o IP local do computador. Em `CORS_ORIGINS`, indique as origens web autorizadas, separadas por vírgulas; por exemplo `http://localhost:8081,http://192.168.1.20:8081`.

3. Instale e inicie a API:

   ```bash
   cd backend
   python3.12 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

4. Noutro terminal:

   ```bash
   cd frontend
   yarn install --frozen-lockfile
   yarn start
   ```

   Abra o QR code com Expo Go ou use `yarn ios`, `yarn android` ou `yarn web`.

## Contas e sessões

O registo público de oficinas está desativado. No primeiro arranque é criada a conta de administração indicada pelas variáveis `BOOTSTRAP_ADMIN_*`. Entre pela área de administração e altere a palavra-passe temporária.

A administração cria oficinas e contas da equipa. A oficina pode criar o acesso de um cliente na sua ficha. As credenciais temporárias são apresentadas uma vez e exigem alteração de palavra-passe. Não são criadas automaticamente oficinas ou fichas de demonstração no arranque.

Os tokens de acesso duram 15 minutos. A app renova-os enquanto está ativa e antes dos pedidos, com um limite absoluto de 12 horas por sessão. Uma sessão já expirada exige novo login. Sair invalida também os tokens anteriormente renovados da mesma sessão. Alterações de palavra-passe e desativação de utilizadores invalidam as sessões através da versão da conta.

## Integridade dos dados

- Criar, editar e eliminar OS grava o documento, o saldo e os movimentos de stock na mesma transação. Falhas revertem o conjunto; conflitos transitórios repetem a transação completa.
- Stock insuficiente devolve `409`; quantidades negativas, preços negativos e valores não finitos são rejeitados. Stock fracionado é permitido.
- Stock inicial e ajustes manuais ficam registados como movimentos. Editar dados de um produto sem indicar `stock` preserva o saldo.
- A receção de uma encomenda é atómica e repetível sem duplicar entradas. Se falhar, permanece pendente.
- Um orçamento aceite só pode ser convertido uma vez, mesmo com pedidos simultâneos ou após apagar a OS resultante. Orçamentos convertidos não podem mudar de estado.
- Índices únicos protegem contadores, números de documentos, conversões e emissão por tipo/OS.
- Uma OS com documentos emitidos não pode ser alterada ou apagada. A emissão e a edição/eliminação concorrentes são serializadas.
- Viaturas com histórico, fotografias, danos ou marcações não podem ser apagadas. Viaturas com OS, orçamentos ou marcações também não podem mudar de cliente.
- As listagens de clientes, OS e orçamentos usam consultas em lote para obter os dados associados. `/api/work-orders` aceita `skip` e `limit` (1–2000), mantendo uma lista JSON como resposta.
- A faturação contabiliza cada OS uma vez, mesmo quando existem fatura e fatura-recibo; o mês é o da primeira emissão. Estes valores são indicadores internos.
- O portal omite queixas, notas e mecânico internos do histórico de serviços.
- PDFs continuam identificados como **documentos internos, sem validade fiscal**.

As transações seguem o modelo de [transações MongoDB](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/crud/transactions/). Não se fazem chamadas a serviços externos dentro das transações.

## Atualizar uma instalação existente

Faça uma cópia de segurança antes de iniciar a versão atualizada. O arranque cria índices de integridade e associa conversões antigas às respetivas OS. Se existirem duplicados anteriores, a criação dos índices falha explicitamente: os registos devem ser reconciliados antes de voltar a arrancar. Não são eliminados registos automaticamente.

Os `.env` foram retirados do índice Git e ignorados, preservando as cópias locais. **Isto não remove versões antigas do histórico.** Credenciais e chaves que tenham sido partilhadas através do repositório precisam de rotação nos sistemas onde são usadas. A configuração local existente não foi substituída por valores de teste.

## Verificação

Frontend, a partir de `frontend/`:

```bash
yarn typecheck
yarn lint
yarn test:session
yarn expo export --platform web
```

Backend, a partir de `backend/`:

```bash
pip install -r requirements-dev.txt
python tests/run_local.py --mongod /caminho/para/mongod -q
```

Se `mongod` estiver no PATH, pode omitir `--mongod`. O runner cria um replica set e API temporários, credenciais aleatórias e uma pasta temporária para fotografias. Use `--storage managed` para verificar também o adaptador remoto com um serviço simulado. Executa os testes e termina os processos, eliminando os dados temporários. Não usa a base de dados, as contas ou o armazenamento definidos no `.env` local. O armazenamento externo real e os fluxos nativos de câmara/partilha precisam de validação com as respetivas integrações e dispositivos.

Para testar uma API de teste já preparada, configure `EXPO_PUBLIC_BACKEND_URL`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD` e `ROADMESH_TEST_ALLOW_WRITE=1`, e execute `pytest tests -q`. Essa API recebe os dados criados pelos testes; use uma instalação isolada. Os testes de injeção de falhas exigem ainda `ROADMESH_TEST_MONGO_URL` e `ROADMESH_TEST_DB_NAME` com prefixo `roadmesh_test_`.

## Documentação da auditoria

- [Documentação do projeto](docs/PROJETO.md)
- [Relatório de alterações, testes e condições de publicação](docs/ALTERACOES.md)

Estas alterações estão na branch de auditoria e requerem a migração do esquema versão 3 antes de publicar o novo backend.
