# RoadMesh — estado da auditoria

Atualizado em 21 de outubro de 2026. Branch `codex/roadmesh-auditoria-melhorias`, sobre `8a55d9d`.

- [Documentação do projeto](docs/PROJETO.md).
- [Alterações e correspondência com a prompt](docs/ALTERACOES.md).
- [Migração, validação e próximos passos de publicação](docs/PUBLICAR.md).

## Validação concluída

- Testes locais iniciais: 89 aprovados em PostgreSQL incorporado e 80 em MongoDB, mais 10 Node; tipagem, lint e exportação web aprovados.
- Supabase real, projeto separado RoadMesh-Testes: migrações 001–004, 27 tabelas, TLS e pooler de sessão IPv4.
- Suite real: **97 aprovados, 2 exclusivos de MongoDB omitidos**. O teste de SET ROLE foi excluído conforme decisão explícita do titular; nenhuma membership foi concedida. Os privilégios declarados foram consultados apenas em leitura.
- Fotografias: bucket privado roadmesh-media, JPEG/10 MB; envio/leitura real aprovado; **3 testes adicionais da API aprovados**, incluindo isolamento entre oficinas.
- Snapshot consistente da base de testes: **27 tabelas, 1 358 registos**, restauro integral e comparação de todas as linhas/relações aprovados. Não inclui bytes externos do bucket.
- Guardas dos executores: **15 testes unitários aprovados**, para destino correto, recusa de produção no runner de staging, TLS e leitura no verificador de produção.

## Produção e limites

Após autorização do titular, a resolução do único cliente redundante e a migração 003 foram aplicadas atomicamente na produção, com novo backup sob bloqueio. Foram confirmadas 27 tabelas; o cliente removido ficou preservado na auditoria. Não foi concedida membership nem aplicada a migração opcional 004.

A conta admin existente foi mantida e a palavra-passe renovada. Login, alteração de palavra-passe, identificação, painel e lista de oficinas passaram na API publicada. As credenciais estão apenas num ficheiro privado local excluído do Git. O código novo da branch ainda não foi publicado por commit/push/deploy; a validação do acesso refere-se à aplicação já publicada.

A verificação funcional no PostgreSQL real não substitui carga representativa, teste do pooler de transações ou dispositivos físicos iPhone/leitores. SMTP fica documentado conforme decisão do utilizador de ainda não contratar serviço. Persistem dois alertas distintos das ferramentas Expo/Metro sem correção indicada na auditoria; runtime Python não apresentou vulnerabilidades conhecidas na consulta efetuada.

Ver detalhes e evidências em docs/. Credenciais, snapshots e logs privados permanecem fora do Git.
