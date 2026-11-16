# Modos claro e escuro

A escolha fica no menu da conta, acima de Definições da conta. É uma preferência local deste dispositivo, partilhada pelas áreas de administração, oficina, stand e cliente. Mantém-se ao recarregar e terminar sessão. O valor inicial é claro quando ainda não existe uma escolha válida.

## Desenvolvimento

As paletas estão em frontend/src/shared/theme/palettes.ts. Distinguem superfícies, texto, contornos, ações com texto branco e cores de estado. O logótipo original conserva as suas cores, com fundo transparente nos dois modos.

Use useAppTheme() para valores em componentes e createThemedStyles() para estilos. Os estilos partilhados são hooks (useAreaStyles, useWorkspaceStyles, useDashboardStyles). Não guarde cores de apresentação em constantes fora do render, nem volte a usar StyleSheet.create em escopo de módulo: esses valores não acompanham a mudança de tema. As fotografias mantêm as suas cores originais.

ThemeProvider muda o contexto sem substituir ou remontar os ecrãs. A preferência usa a chave roadmesh:appearance, separada dos dados privados da sessão, com escritas ordenadas e recuperação perante falhas no armazenamento. A web lê a escolha antes da primeira renderização e sincroniza alterações entre separadores. Os controlos nativos, a barra de estado e os campos de palavra-passe também recebem o modo selecionado.

## Verificação local

- 58 testes de frontend, incluindo contraste de texto, ações e estados nas duas paletas; preferência inválida; armazenamento indisponível; escritas rápidas; falha de escrita; leitura nativa tardia; prevenção de novas cores fixas nos ecrãs.
- Verificação visual no navegador: administração, conta, criação de empresa/módulos e janela de presets, oficina/stock, stand, cliente/histórico e login. Computador 1280×900 e ecrã pequeno 390×844.
- Confirmada a conservação de um campo em edição durante a troca e da preferência após recarregar e terminar sessão. Nenhuma alteração ao nome da conta foi guardada.
- As verificações visuais foram feitas na versão web; não foi executado um simulador Android/iOS.

Capturas locais de comparação: .demo/evidence/tema-claro-conta.png e .demo/evidence/tema-escuro-conta.png. Captura móvel: .demo/evidence/tema-escuro-cliente-mobile.png.
