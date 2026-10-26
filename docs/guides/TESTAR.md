# RoadMesh — começar os testes

A demonstração local está em **http://localhost:8765**.

Para iniciar ou voltar a abrir, faça duplo clique em `Iniciar-Testes.command`, ou execute na pasta do projeto:

```bash
./dev.sh
```

Mantenha esse terminal aberto. `Ctrl+C` para parar. No primeiro arranque noutro computador são necessários Python 3.12, Node.js 20+ e acesso à Internet para preparar dependências. Neste Mac, as dependências já estão preparadas em `.demo/`.

## Contas de demonstração

A palavra-passe é **`RoadMeshTeste2026!`** nas três contas:

| Área | Email | Como entrar |
|---|---|---|
| Oficina | `oficina@roadmesh-demo.pt` | Ecrã inicial |
| Cliente | `cliente@roadmesh-demo.pt` | Botão «Sou cliente de uma oficina» |
| Administração | `admin@roadmesh-demo.pt` | Botão «Administrador RoadMesh» |

Estas contas são apenas do ambiente local de demonstração. Ao voltar a iniciar o demo, as palavras-passe destas três contas são restauradas para o valor acima. As alterações às fichas, stock, serviços e fotografias são mantidas.

## Percurso sugerido

1. **Oficina:** confirme que o dashboard abre e mostra clientes e serviços fictícios. Pesquise a matrícula `AA-12-BB`.
2. **Clientes e viaturas:** abra João Silva (Demonstração), consulte contactos, viatura, histórico e danos. Experimente criar outro cliente e uma viatura associada.
3. **Nova OS com stock:** escolha um cliente e a sua viatura. Mude uma linha para «Peça», selecione um produto de stock e indique a quantidade. Guarde e confirme que o stock foi descontado. Uma «Peça avulsa» não movimenta stock. Valores como `42,50` são aceites.
4. **Orçamentos:** crie um orçamento ou use o exemplo existente. Marque-o como enviado, depois aceite e converta em OS. Uma segunda conversão deve ser impedida. A seleção de um produto no orçamento só desconta stock na conversão.
5. **Encomendas:** no Stock, abra Encomendas. Rececione uma encomenda pendente e confirme que a quantidade aumenta uma única vez. Também pode criar uma encomenda nova para repetir o teste.
6. **Fotografias e danos:** abra o BMW `AA-12-BB`. Existe uma ilustração identificada como demonstração. Carregue um JPEG/PNG/WebP e experimente registar um dano. As imagens são guardadas localmente e continuam disponíveis depois de reiniciar o demo.
7. **Documentos:** abra uma OS concluída e emita uma fatura interna; exporte o PDF em Mais → Faturação. Uma OS já documentada não deve poder ser alterada ou apagada. Estes PDFs não têm validade fiscal.
8. **Cliente:** termine a sessão, entre pela área de cliente e consulte o BMW, fotografias, danos e marcações. Crie uma marcação futura. Depois, na oficina, confirme-a ou proponha outra data.
9. **Administração:** termine a sessão, entre pela administração e abra a oficina de demonstração. Consulte os utilizadores e experimente o modo de suporte.

O envio de emails e mensagens WhatsApp abre a aplicação externa e é concluído por si. Os contactos da demonstração são fictícios; para testar um envio real, use um contacto de teste seu.

## Dados e arranque

- Base MongoDB exclusiva: `roadmesh_demo`, num replica set local em `127.0.0.1:27037`.
- Ficheiros, fotografias e logs: `.demo/`, ignorada pelo Git.
- Configuração existente em `backend/.env` e `frontend/.env`: preservada; não é usada neste modo.
- Não é necessária uma chave de armazenamento externo: o demo usa armazenamento local privado, com as mesmas verificações de acesso da API.
- Se uma porta estiver ocupada, o arranque indica o problema e não termina serviços existentes. Para mudar apenas a porta web: `./dev.sh --port 8766`.
- Para abrir no browser de um telemóvel da mesma rede: pare o demo e execute `./dev.sh --lan`; use o endereço de rede apresentado no terminal. Este modo permite acesso à demonstração pela rede local.

O percurso validado é a versão web. Câmara nativa, Expo Go e partilha nativa de iOS/Android são testes separados.

## Testes automáticos

Na raiz do projeto, usando o ambiente já preparado:

```bash
.demo/venv/bin/python backend/tests/run_local.py --mongod "$PWD/.demo/mongodb/bin/mongod" -q
cd frontend
node --test scripts/session.test.cjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
```

O runner cria outra base temporária e elimina-a no fim. Os dados da demonstração não são alterados pelos testes automáticos. O armazenamento local é testado por omissão; `--storage managed` verifica também o adaptador remoto através de um serviço simulado, sem usar contas externas.
