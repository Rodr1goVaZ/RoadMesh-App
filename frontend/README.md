# RoadMesh — frontend

Aplicação Expo/React Native em TypeScript para web, telemóvel e tablet.

- `app/`: rotas e composição das páginas; URLs existentes preservados.
- `src/core/`: configuração, cliente HTTP, autenticação, sessões e armazenamento.
- `src/shared/`: componentes visuais, navegação, temas, hooks e funções comuns.
- `src/features/`: componentes e regras específicas de cada funcionalidade.
- `scripts/`: ferramentas e testes locais; os ficheiros `.cjs` são infraestrutura do Node.
- `assets/` e `public/`: imagens e recursos estáticos.

Instalar com `yarn install --frozen-lockfile`. Iniciar com `yarn web`, `yarn ios` ou `yarn android`.

Verificar com `yarn typecheck`, `yarn lint`, `yarn test` e `yarn expo export --platform web`.

Apenas `frontend/yarn.lock` gere as dependências desta aplicação. O projeto de exemplo independente foi arquivado fora da árvore ativa; não há um segundo frontend a instalar.

Regras de reutilização e estrutura completa: [arquitetura](../docs/architecture/ESTRUTURA.md). Configuração e operação: [README principal](../README.md).
