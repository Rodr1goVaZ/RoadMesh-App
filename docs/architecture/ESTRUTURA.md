# Estrutura e reutilização da RoadMesh

Atualização: 26 de outubro de 2026. Reestruturação local, ainda sem commit ou publicação.

## Decisão de arquitetura

Uma aplicação modular no mesmo repositório: TypeScript/TSX no frontend e Python na API, conforme a opção confirmada. Não se reescreveu a API nem se criaram microserviços. JSON, SQL, YAML e alguns scripts JavaScript/CommonJS continuam necessários para configuração, migrações e ferramentas.

Organizar pastas reduz a complexidade de manutenção; o tamanho instalado também inclui dependências e ferramentas. Estes valores não são o tamanho do JavaScript enviado ao browser.

## Organização atual

```text
RoadMesh-App/
├── backend/
│   ├── server.py                  # Entrada ASGI e rotas de negócio existentes
│   ├── demo_server.py             # Entrada exclusiva da demonstração local
│   ├── roadmesh/
│   │   ├── api/schemas.py         # Modelos dos pedidos à API
│   │   ├── core/                 # Acessos, módulos, identificadores e diagnóstico
│   │   ├── domain/               # Dinheiro, identidade e regras comuns
│   │   ├── infrastructure/
│   │   │   ├── database/         # Repositório SQL, índices e transações
│   │   │   ├── documents/        # PDFs
│   │   │   └── media/            # Fotografias e autorização de leitura
│   │   └── modules/
│   │       ├── administration/   # Administração e suporte
│   │       ├── auth/             # Recuperação de acesso
│   │       ├── history/          # Histórico
│   │       ├── operations/       # Stock, encomendas e movimentos financeiros
│   │       ├── portal/           # Portal do cliente
│   │       └── stand/            # Inventário, contactos e vendas
│   ├── sql/                      # Migrações numeradas, sem mudanças de esquema aqui
│   ├── tests/                    # Testes e ambientes descartáveis
│   └── vercel.json
├── frontend/
│   ├── app/                      # Rotas existentes do Expo Router
│   ├── src/
│   │   ├── core/
│   │   │   ├── auth/             # Contexto, sessão, eventos e módulos
│   │   │   ├── http/             # Um único cliente HTTP
│   │   │   └── storage/          # Armazenamento nativo/web
│   │   ├── features/             # Funcionalidades com componentes específicos
│   │   │   ├── administration/
│   │   │   ├── appointments/
│   │   │   ├── auth/
│   │   │   ├── clients/
│   │   │   ├── finance/
│   │   │   ├── inspections/
│   │   │   ├── inventory/
│   │   │   ├── portal/
│   │   │   └── stand/
│   │   └── shared/
│   │       ├── hooks/
│   │       ├── layout/           # Cabeçalhos, páginas e painéis partilhados
│   │       ├── media/
│   │       ├── pickers/
│   │       ├── theme/
│   │       ├── ui/               # Botão, campo, mensagens e outros elementos
│   │       └── utils/
│   ├── assets/ e public/
│   ├── scripts/                  # Ferramentas e testes Node
│   ├── package.json e yarn.lock
│   └── vercel.json
├── scripts/                      # Demonstração, backups e validação operacional
├── docs/
│   ├── architecture/
│   ├── guides/                   # Supabase e testes
│   ├── reports/                  # Auditoria
│   ├── archive/                  # Requisitos e relatórios históricos
│   ├── design/                   # Referência visual
│   ├── evidencias/
│   └── documentos/               # Documentos Word anteriormente entregues
├── .demo/                        # Dados e ferramentas locais privados, fora do Git
├── README.md
├── dev.sh e Iniciar-Testes.command
└── compose.yaml
```

`backend/server.py` conserva as rotas legadas da oficina. A sua extração gradual pode continuar por funcionalidade; não foi introduzida uma abstração genérica para CRUD, nem alterada a lógica das transações para obter uma aparência de camadas puras.

## Como reutilizar código

- As páginas importam componentes de `features` e `shared`; novos campos ou botões comuns devem ser alterados nesses componentes.
- Oficina e Stand usam `features/clients/components/ClientFields.tsx` para os mesmos campos de cliente. Cada página mantém as suas ações e permissões de gravação.
- Email, matrícula/código de barras e números decimais usam `shared/utils/validation.ts`. A validação no browser é auxiliar: as permissões e os dados são verificados novamente pela API.
- Moeda e datas usam `shared/utils/format.ts`, com uma implementação comum para datas e sem recriar o formatador monetário em cada chamada.
- Todos os pedidos normais à API usam `core/http/api.ts`. Fotografias autenticadas mantêm o transporte especializado de binários, evitando tratá-las como respostas JSON.
- Sessões e contexto de autenticação têm uma única implementação em `core/auth/`. Componentes novos não devem guardar outra cópia do token.
- Os identificadores e os instantes UTC do backend são definidos em `roadmesh/core/identifiers.py`. Autenticação e rotas importam as mesmas funções, preservando os nomes antigos através de aliases quando necessário.
- As regras monetárias, de duplicados e de identificação da API são partilhadas em `roadmesh/domain/business_rules.py`. O cálculo visual no frontend não substitui o cálculo e a autorização do servidor.
- Os testes frontend usam `scripts/test-helpers.cjs` para carregar unidades TypeScript, sem repetir o mecanismo de transpilar e simular dependências em cada ficheiro.
- Só `scripts/demo_data.py` gera os dados de demonstração ativos. O seeder antigo sem chamadas foi retirado do servidor, bem como dois modelos de autenticação obsoletos.

Os imports da aplicação frontend usam `@/src/...`; os imports Python usam `roadmesh....`. Não se devem copiar funções de outra pasta para resolver um import.

## Peso, arquivo e proteção dos dados

O projeto Expo de exemplo completo, incluindo as suas dependências, foi movido para:

`/Users/rodrigovaz/Documents/RoadMesh/Arquivo-RoadMesh/2026-10-26/expo-example/`

O arquivo ocupa cerca de 558 MB. Está fora do projeto ativo e é recuperável: esta ação reduz a árvore de trabalho e as pesquisas/indexação, mas não liberta esse espaço no disco. O arquivo poderá ser apagado pelo proprietário mais tarde, se deixar de ser necessário.

A cópia do código anterior está em `Arquivo-RoadMesh/2026-10-26/source-backup/source-before.tar`, ao lado do arquivo do exemplo e fora da árvore ativa. A pasta principal passou de cerca de 1,7 GB para cerca de 1,1 GB; as ferramentas de testes e as dependências continuam a representar a maior parte do tamanho local.

Foram retiradas seis dependências diretas sem imports nem configuração de plugins: `date-fns`, `dayjs`, `react-native-dotenv`, `expo-blur`, `expo-haptics` e `expo-linear-gradient`. As dependências transitivas que o Expo ainda utiliza permanecem instaladas. O lockfile foi sincronizado sem atualizar as versões restantes.

O comando de template `reset-project`, que substituía pastas da aplicação por um exemplo vazio, foi retirado; a ferramenta foi arquivada fora do projeto. O README do frontend passou a descrever a aplicação real.

`node_modules`, ambientes Python, caches e `.demo` são locais. Fotografias, credenciais, dados e backups não foram apagados nem transferidos para o Git. Os novos `.vercelignore` do frontend e `.dockerignore` evitam incluir estes elementos em uploads/contextos de construção. A cache temporária descarregada para reinstalar as dependências foi removida após a instalação.

## Compatibilidade e publicação

As raízes Vercel continuam a ser `backend/` e `frontend/`. Mantêm-se `server:app`, as rotas `/api`, os URLs Expo, os iniciadores e os ficheiros privados `.env` nos mesmos locais. Os caminhos por omissão das fotografias locais e do logótipo nos PDFs continuam a apontar para `backend/`.

Esta alteração não requer SQL novo e não modificou produção nem a base de testes remota. Fazer commit de todas as mudanças e remoções no mesmo conjunto; publicar apenas parte dos ficheiros deixaria imports em falta. Depois de integrar a branch em `main`, publicar ambos os projetos Vercel e verificar login, painel, clientes, Stand e um PDF/fotografia.

## Verificações

Frontend: `yarn typecheck`, `yarn lint`, `yarn test` e `yarn expo export --platform web`.

Backend: `python tests/run_local.py` para MongoDB descartável; `python tests/run_postgres.py` para PostgreSQL descartável. São os mesmos runners anteriores. Usar `TMPDIR` dentro de uma pasta local permitida se o sistema restringir a pasta temporária padrão.

As evidências desta execução estão em `docs/evidencias/reestruturacao-20261026.json`. Os testes em PGlite comprovam regressão funcional local, sem substituir um ensaio de concorrência num PostgreSQL remoto real.
