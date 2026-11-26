# FamiLink Arcade

Aplicação web de emulação retrô e multiplayer, baseada no projeto enviado pelo usuário.

## Correção dos ZIPs

- Um arquivo `.zip` escolhido em detecção automática permanece como pacote Arcade; o app não extrai mais um `.sms` interno por engano.
- Para abrir um jogo de console compactado, selecione primeiro o console correspondente no seletor e o ZIP deverá conter uma única ROM compatível.
- Para Arcade, mantenha o pacote ZIP original e selecione Arcade (FBNeo ou outro núcleo compatível).
- Incluí testes para impedir que um ZIP Arcade volte a ser classificado silenciosamente como Master System.

## Site

O site é publicado pelo GitHub Pages e o bundle é compilado para navegadores a partir do Chrome 57. No Android 6, o funcionamento depende de um Android System WebView atualizado e de internet para carregar os núcleos e recursos externos.

## APK

O APK Android 6+ é um invólucro WebView do site, não uma reescrita de emulador Android nativo. O código do emulador continua sendo o app web. O APK dá acesso ao seletor de arquivos para importar ROMs/ZIPs e requer internet para abrir o site e baixar os núcleos.

## Desenvolvimento

```sh
bun install --frozen-lockfile
bun run test
bun run lint
bun run build
```
