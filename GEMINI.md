# Regras Permanentes e Memória de Longo Prazo — Projeto NEON (`C:\Neon`)

## 1. Memória de Longo Prazo Obrigatória (`C:\Neon\memoria_projeto\`)
- Este projeto possui uma pasta de memória de longo prazo em `C:\Neon\memoria_projeto\`.
- **Antes de alterar fluxos ou funcionalidades existentes**, consulte `C:\Neon\memoria_projeto\DECISOES_IMPORTANTES.md` para respeitar todas as decisões já tomadas pelo usuário.
- **Sempre que uma nova decisão importante for tomada pelo usuário**, atualize imediatamente `C:\Neon\memoria_projeto\DECISOES_IMPORTANTES.md` e `C:\Neon\memoria_projeto\HISTORICO_VERSOES.md`.
- **Limite de 50 GB por Projeto:** A pasta de memória e o projeto como um todo **JAMAIS** podem ultrapassar **50 GB**. Mantenha as memórias em arquivos Markdown leves e sempre apague instaladores `.exe`, `.blockmap` e `win-unpacked` de `C:\Neon\release` após publicar uma atualização.

## 2. Regra Obrigatória de Entrega e Atualização Automática (SEMPRE PUBLICAR)
- O usuário utiliza o aplicativo **Neon instalado no PC** (que recebe atualizações via `electron-updater` pelo GitHub Releases) e a versão Web/Mobile conectada ao GitHub.
- **NUNCA** finalize uma tarefa de código/UI apenas rodando `npm run build` local sem publicar!
- **TODA VEZ** que você implementar ou modificar qualquer funcionalidade no Neon:
  1. Incremente a versão em `C:\Neon\package.json` e o fallback em `C:\Neon\src\App.tsx`.
  2. Faça `git add`, `git commit` e `git push origin main`.
  3. Execute `powershell -ExecutionPolicy Bypass -File C:\Neon\scripts\publish-release.ps1` para compilar, publicar a nova release no GitHub Releases (fazendo a atualização chegar automaticamente no app do usuário) e limpar os binários locais de `C:\Neon\release`.
