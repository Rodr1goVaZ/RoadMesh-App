# RoadMesh

Aplicação móvel/tablet para oficinas automóveis, com uma API FastAPI e uma app Expo/React Native.

## Estrutura

- `frontend/` — aplicação móvel, web e tablet com Expo Router.
- `backend/` — API FastAPI, MongoDB, autenticação e PDFs.
- `backend/tests/` — testes de regressão da API.

## Arranque local

São necessários Python 3.10+, Node.js 20+, Yarn 1 e uma instância MongoDB acessível.

1. Crie `backend/.env` a partir das chaves usadas pelo projeto: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` e `EMERGENT_LLM_KEY` (este último é necessário para fotos).
2. Crie `frontend/.env` com `EXPO_PUBLIC_BACKEND_URL=http://SEU_IP:8000`.
3. Instale e inicie a API:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

4. Noutro terminal, inicie a app:

   ```bash
   cd frontend
   yarn install
   yarn start
   ```

Para testar num telemóvel, `SEU_IP` tem de ser o IP local do computador, não `localhost`. Abra o QR code com Expo Go ou use um simulador através de `yarn ios` / `yarn android`.

## Regras já aplicadas

- As ordens de serviço descontam stock; edições recalculam a diferença e apagar uma OS repõe as peças.
- Converter um orçamento aceite em OS aplica os respetivos movimentos de stock e não permite conversão repetida.
- A receção de uma encomenda só pode acrescentar stock uma vez, mesmo com dois pedidos simultâneos.
- Números de OS, orçamentos e documentos usam contadores atómicos por oficina.
- Só se pode emitir um documento por tipo para uma OS concluída. PDFs continuam identificados como documentos internos, sem validade fiscal.
