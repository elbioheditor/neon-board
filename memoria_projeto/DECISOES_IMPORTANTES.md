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

### 2.1. Sem Coluna Vertical de Horários na Aba Board (Removida em v1.5.1)
- O usuário pediu para **remover completamente a coluna lateral de Horários** da aba **Board** (*"pode tirar esse novo negocio de horario pq ficou um lixo"*). O Board começa diretamente na pílula/coluna **Late** seguida de **Today**, **Tomorrow**, **This Week** e **Future**.
- Manter os títulos originais das listas em inglês (`Today`, `Tomorrow`, `This Week`, `Future`, `+ Add a card`) e `Late` no lugar de `Yesterday`.

### 2.2. Coluna `"Late"` (Antiga `"Yesterday"`) e Animação de Slide Lateral
- A coluna de tarefas atrasadas chama-se **"Late"** (nunca `"Yesterday"`).
- Fica recolhida por padrão como uma pílula vertical compacta (`44px`) para que **Today** tenha destaque imediato.
- **Animação ao abrir:** Quando o usuário clica na pílula **Late**, o painel faz um **slide crescendo para o lado esquerdo** (`.animate-late-open-wrapper` + `.animate-late-open-inner`, ancorado à direita).
- **Animação ao fechar:** Quando o usuário clica em **Esconder**, o painel faz um **slide para o lado direito se fechando** (`.animate-late-close-wrapper` + `.animate-late-close-inner` por `330ms`) antes de voltar à pílula compacta.

### 2.3. Arrastar Tarefas de Múltiplos Dias em Bloco Contíguo
- Quando uma tarefa possui vários dias (ex.: um vídeo de 4 dias criado com `days_count`) e o usuário arrasta ou altera a data de uma parte para frente ou para trás, **todos os dias subsequentes do bloco acompanham juntos** a partir do novo dia escolhido (`shiftTaskAndGroupToDate` em `src/utils/timeUtils.ts`).

### 2.4. Sistema de Trabalho: Aba `"Projetos"` (1ª Aba à Esquerda do Calendário na Dock Inferior)
- Ordem das abas na dock inferior: **1º Projetos** (à esquerda imediata do Calendário), **2º Calendário**, **3º Board**, **4º Dale**.
- Na aba **Projetos** (`src/components/ProjectsView.tsx`), o usuário cadastra projetos com:
  - **Título**
  - **Valor em Dólares (`USD $`)**
  - **Descrição opcional** e cor de destaque.
- **Atribuição de Horas da Tarefa ao Projeto (Portal Flutuante Livre):**
  - Nos cards do Kanban (`src/components/KanbanCard.tsx`), ao lado do botão **INICIAR**, há um ícone de projeto (`Briefcase`) que abre o menu **Vincular a Projeto**.
  - **Regra de UI obrigatória:** Esse menu é renderizado via `createPortal(..., document.body)` com coordenadas `fixed` e `z-[9999]` para **nunca ficar preso/cortado dentro da box do card ou da coluna**.
- **Adição e Ajuste Manual de Horas em Projetos (`+ Horas / Ajustar`):**
  - Todo projeto possui o botão **`+ Horas / Ajustar`** para que o usuário possa **+ Somar Horas** (caso tenha esquecido de ligar o cronômetro) ou **= Definir Total** (caso tenha cometido algum erro no cronômetro e queira fixar o total exato de horas do projeto).
- **Exclusão de Projetos APENAS Arrastando (Sem Clique Único):**
  - **Não existe botão de apagar projeto com 1 clique** nos cards de projetos ativos ou concluídos para evitar *missclick* e perda acidental de projeto. Para excluir um projeto, o usuário deve **arrastar o projeto até a zona "Lixeira"** na parte inferior da tela.
- **Sistema de Clientes Obrigatório por Projeto (`clientName`):**
  - Todo projeto **obrigatoriamente** pertence a um cliente (`clientName: string`). Não é possível criar um projeto sem informar/selecionar um cliente.
  - A aba **Projetos** conta com um gerenciador de **Clientes** e pílulas de seleção rápida no formulário de criação/edição.
  - **Regra dos Projetos Existentes (`Brody`):** Os dois projetos já criados pelo usuário (e qualquer projeto anterior sem cliente definido) recebem automaticamente o cliente **`Brody`** (`normalizeProjectsWithDefaultClient`).
- **Opção `"Graphs"` na Aba Dale (Ao Lado Esquerdo do Mês Escolhido):**
  - Na aba **Dale** (`src/components/MonthlyHistoryView.tsx`), imediatamente à esquerda do seletor de mês escolhido, há o botão **`Graphs`**.
  - Ao abrir **`Graphs`**, é exibido um **gráfico de barras anual** mostrando os ganhos de cada mês do ano selecionado (`Jan` a `Dez`), acompanhado de seletor de ano e resumo anual.
  - **Tooltip Rico ao Passar o Mouse (`onMouseEnter` via `createPortal`):** Ao posicionar o mouse sobre qualquer mês no gráfico de barras, aparece um card flutuante detalhado com:
    1. Ganhos daquele mês em Dólar (`$`) e convertido em Reais (`R$`).
    2. Hora média de ganhos (`$/h` e `R$/h`) e total de horas trabalhadas no mês.
    3. Quais **clientes** foram atendidos naquele mês (ex.: `Brody`, quantidade de projetos e valor por cliente).
    4. Lista dos **projetos feitos** naquele mês com título, cliente, tempo e valor.
- **Conclusão Arrastando para Baixo:**
  - Quando o usuário termina um projeto na aba **Projetos**, ele pode **arrastar o card do projeto para a barra inferior da tela** (zona verde de conclusão, igual ao Board) para finalizar o projeto no mês.
- **Sistema Financeiro (`USD $` + Conversão `BRL R$`) e Hora Média:**
  - Exibe quanto o usuário **ganhou no mês** em **Dólares (`$`)** e o **valor convertido em Reais (`R$`)** (busca cotação USD/BRL automática + permite edição manual).
  - Calcula e exibe o **Valor da Hora Média do usuário (`$/h` e `R$/h`)** com base no valor dos projetos e nas horas trabalhadas.
  - No fim do mês (e na aba **Dale**), exibe todos os projetos concluídos, horas contabilizadas em cada projeto e ganhos totais.

### 2.5. Personalização de Cores Aplicada em TODAS as Páginas (Ao Lado da Versão)
- Ao lado do indicador de versão (`vX.Y.Z`) no cabeçalho superior direito, há um botão de configurações (`Settings`) que abre o painel **Personalização de Cores** (`src/components/ThemeSettingsModal.tsx`).
- Permite escolher livremente **Cor Primária**, **Cor Secundária** e **Cor do Fundo**.
- **Regra Global de Cores:** As escalas `--color-purple-*`, `--color-fuchsia-*`, `--color-violet-*` seguem a **Cor Primária**; `--color-cyan-*` e `--color-pink-*` seguem a **Cor Secundária**; e todas as superfícies escuras (`#07050d`, `#0d091a`, `#120924`, `#0e091d`, etc.) e partículas (`NeonParticles`) seguem dinamicamente a **Cor do Fundo + Cor Primária/Secundária** em **todas as abas** (Projetos, Calendário, Board e Dale).

### 2.6. Identidade, Segurança de Sessão e Mobile
- **Identidade dinâmica:** `NEON` para Elbioh e `SHADOWJOKER` para Didi.
- **Isolamento de sessão:** Armazenamento local e nuvem isolados por `userId` no Supabase (`user_boards`), com opção de lembrar login por 60 dias.
- **Mobile (`C:\Neon\mobile`):** App React Native / Expo com ícone oficial do Neon, tela de login obrigatória e suporte a atualização OTA (`expo-updates`).
