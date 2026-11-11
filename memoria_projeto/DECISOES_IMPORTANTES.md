# Memória de Longo Prazo — Decisões Mais Importantes do Projeto NEON

> **Regra de Armazenamento:** Esta pasta (`C:\Neon\memoria_projeto`) guarda a memória permanente das decisões de produto, design, arquitetura e fluxo de publicação do **Neon**.
> **Limite Rigoroso de Espaço:** Todo o projeto e sua pasta de memórias **JAMAIS devem ultrapassar 50 GB** (atualmente ocupa menos de 1 MB em texto puro). Nunca deixe arquivos instaladores `.exe` na pasta `C:\Neon\release`.

---

## 1. Regra de Ouro de Atualização e Deploy (SEMPRE EXECUTAR)
- **Sempre publicar as mudanças para o usuário ver imediatamente:**
  - O usuário utiliza o aplicativo **Neon Desktop instalado no Windows** (que busca atualizações automaticamente via `electron-updater` no GitHub Releases a cada 30 segundos) e a versão **Web/Mobile** sincronizada via GitHub (`elbioheditor/neon-board`).
  - Portanto, **TODA VEZ** que qualquer alteração de código, visual ou funcionalidade for pedida no Neon:
    1. Incrementar a versão em `C:\Neon\package.json` e o fallback em `C:\Neon\src\App.tsx`.
    2. Fazer `git add`, `git commit` e `git push origin main`.
    3. Executar `powershell -ExecutionPolicy Bypass -File C:\Neon\scripts\publish-release.ps1` para gerar o instalador NSIS, enviar `Neon-Setup-<versao>.exe`, `.blockmap` e `latest.yml` para o GitHub Releases, e apagar todos os binários locais da pasta `C:\Neon\release`.
    4. Registrar a decisão/mudança relevante neste arquivo (`C:\Neon\memoria_projeto\DECISOES_IMPORTANTES.md`).

---

## 2. Decisões de Interface, Fluxo e Funcionalidades do NEON

### 2.1. Coluna Vertical de Horários na Esquerda Máxima (`08:00` às `23:00`)
- Na aba **Board**, à esquerda máxima (antes de todas as listas), existe uma coluna vertical fixa chamada **Horários** começando às `08:00` até `23:00`, um horário embaixo do outro.
- Mostra indicador ao vivo na hora atual de Brasília e permite clicar em qualquer horário para abrir a criação rápida de tarefa já preenchida naquele horário.

### 2.2. Coluna `"Late"` (Antiga `"Yesterday"`) e Animação de Slide Lateral
- A coluna de tarefas atrasadas chama-se **"Late"** (nunca `"Yesterday"`).
- Fica recolhida por padrão como uma pílula vertical compacta (`44px`) para que **Today** tenha destaque imediato.
- **Animação ao abrir:** Quando o usuário clica na pílula **Late**, o painel faz um **slide crescendo para o lado esquerdo** (`.animate-late-open-wrapper` + `.animate-late-open-inner`, ancorado à direita).
- **Animação ao fechar:** Quando o usuário clica em **Esconder**, o painel faz um **slide para o lado direito se fechando** (`.animate-late-close-wrapper` + `.animate-late-close-inner` por `330ms`) antes de voltar à pílula compacta.

### 2.3. Arrastar Tarefas de Múltiplos Dias em Bloco Contíguo
- Quando uma tarefa possui vários dias (ex.: um vídeo de 4 dias criado com `days_count`) e o usuário arrasta ou altera a data de uma parte para frente ou para trás, **todos os dias subsequentes do bloco acompanham juntos** a partir do novo dia escolhido (`shiftTaskAndGroupToDate` em `src/utils/timeUtils.ts`).

### 2.4. Sistema de Trabalho: Aba `"Projetos"` (1ª Aba à Esquerda do Calendário)
- Ordem das abas principais no topo: **1º Board**, **2º Projetos** (à esquerda imediata do Calendário), **3º Calendário**, **4º Histórico Mensal**.
- Na aba **Projetos** (`src/components/ProjectsView.tsx`), o usuário cadastra projetos com:
  - **Título**
  - **Valor em Dólares (`USD $`)**
  - **Descrição opcional** e cor de destaque.
- **Atribuição de Horas da Tarefa ao Projeto:**
  - Nos cards do Kanban (`src/components/KanbanCard.tsx`), ao lado do botão **INICIAR**, há um ícone de projeto (`Briefcase`) que abre um menu rápido com animação spring para vincular a tarefa (ex.: *"editar"*) a um projeto ativo.
  - Todas as horas cronometradas nas tarefas vinculadas são somadas automaticamente ao projeto.
- **Conclusão Arrastando para Baixo:**
  - Quando o usuário termina um projeto na aba **Projetos**, ele pode **arrastar o card do projeto para a barra inferior da tela** (zona verde de conclusão, igual ao Board) para finalizar o projeto no mês.
- **Sistema Financeiro (`USD $` + Conversão `BRL R$`) e Hora Média:**
  - Exibe quanto o usuário **ganhou no mês** em **Dólares (`$`)** e o **valor convertido em Reais (`R$`)** (busca cotação USD/BRL automática + permite edição manual).
  - Calcula e exibe o **Valor da Hora Média do usuário (`$/h` e `R$/h`)** com base no valor dos projetos e nas horas trabalhadas.
  - No fim do mês (e na aba **Histórico Mensal**), exibe todos os projetos concluídos, horas contabilizadas em cada projeto e ganhos totais.

### 2.5. Personalização de Cores (Ao Lado da Versão)
- Ao lado do indicador de versão (`vX.Y.Z`) no cabeçalho superior direito, há um botão de configurações (`Settings`) que abre o painel **Personalização de Cores** (`src/components/ThemeSettingsModal.tsx`).
- Permite escolher livremente:
  1. **Cor Primária**
  2. **Cor Secundária**
  3. **Cor do Fundo**
- Além de presets rápidos e botão para restaurar o padrão Neon.

### 2.6. Identidade, Segurança de Sessão e Mobile
- **Identidade dinâmica:** `NEON` para Elbioh e `SHADOWJOKER` para Didi.
- **Isolamento de sessão:** Armazenamento local e nuvem isolados por `userId` no Supabase (`user_boards`), com opção de lembrar login por 60 dias.
- **Mobile (`C:\Neon\mobile`):** App React Native / Expo com ícone oficial do Neon, tela de login obrigatória e suporte a atualização OTA (`expo-updates`).
