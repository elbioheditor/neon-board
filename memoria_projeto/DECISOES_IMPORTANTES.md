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

### 2.1. Sem Coluna Vertical de Horários na Aba Board (Removida em v1.5.1) e Seletor de Horário 24h via Portal (`TimeInput24h`)
- O usuário pediu para **remover completamente a coluna lateral de Horários** da aba **Board** (*"pode tirar esse novo negocio de horario pq ficou um lixo"*). O Board começa diretamente na pílula/coluna **Late** seguida de **Today**, **Tomorrow**, **This Week** e **Future**.
- Manter os títulos originais das listas em inglês (`Today`, `Tomorrow`, `This Week`, `Future`, `+ Add a card`) e `Late` no lugar de `Yesterday`.
- **Seletor de Horário (`TimeInput24h` no PC e `TimeInput24hMobile` no Mobile):**
  - Deve sempre permitir selecionar o **Horário Exato Atual (`⚡ Agora (HH:MM)`)** com 1 clique (tanto dentro do seletor de horário quanto pelo botão **`⚡ Agora`** ao lado dos campos de horário).
  - Deve exibir **todos os 60 minutos exatos (`:00` a `:59`)** além dos atalhos rápidos (`:00, :15, :30, :45`) tanto para o início quanto para o **fim da tarefa**.
  - **Regra de UI obrigatória:** O popover do `TimeInput24h` é renderizado via `createPortal(..., document.body)` com coordenadas `fixed`, `z-[9999]` e ajuste automático de borda (`left` e `top` limitados ao viewport) para que a coluna de **Minutos** do horário de **fim da tarefa** jamais fique cortada ou invisível na borda direita da coluna!

### 2.2. Coluna `"Late"` (Antiga `"Yesterday"`) e Animação de Slide Lateral
- A coluna de tarefas atrasadas chama-se **"Late"** (nunca `"Yesterday"`).
- Fica recolhida por padrão como uma pílula vertical compacta (`44px`) para que **Today** tenha destaque imediato.
- **Animação ao abrir:** Quando o usuário clica na pílula **Late**, o painel faz um **slide crescendo para o lado esquerdo** (`.animate-late-open-wrapper` + `.animate-late-open-inner`, ancorado à direita).
- **Animação ao fechar:** Quando o usuário clica em **Esconder**, o painel faz um **slide para o lado direito se fechando** (`.animate-late-close-wrapper` + `.animate-late-close-inner` por `330ms`) antes de voltar à pílula compacta.

### 2.3. Arrastar Tarefas de Múltiplos Dias em Bloco Contíguo
- Quando uma tarefa possui vários dias (ex.: um vídeo de 4 dias criado com `days_count`) e o usuário arrasta ou altera a data de uma parte para frente ou para trás, **todos os dias subsequentes do bloco acompanham juntos** a partir do novo dia escolhido (`shiftTaskAndGroupToDate` em `src/utils/timeUtils.ts`).

### 2.4. Sistema de Trabalho: Ordem das Abas na Dock Inferior (`Projetos | Board | Calendário | Dale`)
- Ordem das abas na dock inferior: **1º Projetos**, **2º Board** (à direita de Projetos e à esquerda de Calendário), **3º Calendário**, **4º Dale**.
- **Parar Cronômetro ao Fechar o App:** Sempre que o usuário fechar o aplicativo, todos os cronômetros em execução (`status === 'in_progress'`) devem ser pausados automaticamente no momento do fechamento (`pauseAllRunningTimers` no `beforeunload`/`pagehide` + reconciliação via `LAST_OPEN_HEARTBEAT_KEY` ao reabrir).
- Na aba **Projetos** (`src/components/ProjectsView.tsx`), o usuário cadastra projetos com:
  - **Título**
  - **Valor em Dólares (`USD $`)**
  - **Descrição opcional** e cor de destaque.
- **Atribuição de Horas da Tarefa ao Projeto (Portal Flutuante Livre):**
  - Nos cards do Kanban (`src/components/KanbanCard.tsx`), ao lado do botão **INICIAR**, há um ícone de projeto (`Briefcase`) que abre o menu **Vincular a Projeto**.
  - **Regra de UI obrigatória:** Esse menu é renderizado via `createPortal(..., document.body)` com coordenadas `fixed` e `z-[9999]` para **nunca ficar preso/cortado dentro da box do card ou da coluna**.
- **Adição, Subtração (`- Subtrair Horas`) e Ajuste Manual de Horas em Projetos (`+ Horas / Ajustar`) e Diretamente nas Tarefas (`+ Tempo` / `+ Horas / Minutos`):**
  - Todo projeto possui o botão **`+ Horas / Ajustar`** para que o usuário possa **+ Somar Horas**, **- Subtrair Horas** (basta digitar o sinal de menos `-` na frente do número e o botão `+ Somar Horas` muda automaticamente para **`- Subtrair Horas`**) ou **= Definir Total**.
  - **Adicionar / Ajustar Horas e Minutos nas Tarefas (`TaskCard`)**: caso o usuário tenha pausado uma tarefa e esquecido de despausar o cronômetro, ele pode adicionar (ou subtrair/definir) horas e minutos diretamente na tarefa — tanto pelo botão **`+ Tempo` / `+⏱`** no card do Board (via Portal flutuante `createPortal(..., document.body)`) quanto pelo botão **`+ Horas / Minutos`** dentro do Modal/Detalhes da Tarefa (com atalhos rápidos `+15m`, `+30m`, `+45m`, `+1h`, `+2h` e campos personalizados de horas e minutos). Se a tarefa estiver vinculada a um projeto, esse tempo também já soma automaticamente nas horas do projeto.
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
- **Edição Direta do Valor em Dólar (`$ USD`) de Qualquer Projeto (Ativo ou Concluído):**
  - O usuário pode alterar o valor (`amountUsd`) de qualquer projeto (tanto nos **Projetos Ativos** quanto nos **Projetos Concluídos no Mês** e na aba **Dale**) clicando diretamente no badge de valor **`$XX.XX ✏️`** ou em **`Mudar Valor ($)`**.
- **Conclusão Arrastando para Baixo:**
  - Quando o usuário termina um projeto na aba **Projetos**, ele pode **arrastar o card do projeto para a barra inferior da tela** (zona verde de conclusão, igual ao Board) para finalizar o projeto no mês.
- **Sistema Financeiro (`USD $` + Conversão `BRL R$`), Forma de Pagamento (`Wise 0.33%` vs `PayPal 6.4%`) e Hora Média:**
  - Todo projeto permite selecionar ou alternar com 1 clique por qual **Forma de Pagamento** foi ou será pago: **`🟢 Wise (-0.33%)`** ou **`🔵 PayPal (-6.4%)`** (`paymentMethod?: 'paypal' | 'wise'`).
  - O sistema desconta automaticamente a taxa escolhida (`6.4%` no PayPal ou `0.33%` na Wise) para mostrar o **Valor Líquido** em Dólares (`$`) e Reais (`R$`), além de exibir o valor `Bruto` e o percentual de taxa descontado (`-6.4%` / `-0.33%`).
  - Exibe quanto o usuário **ganhou líquido no mês** em **Dólares (`$`)** e o **valor convertido em Reais (`R$`)** (busca cotação USD/BRL automática + permite edição manual), mostrando também o total bruto e taxas descontadas.
  - Calcula e exibe o **Valor da Hora Média líquida do usuário (`$/h` e `R$/h`)** com base no valor líquido dos projetos e nas horas trabalhadas.
  - No fim do mês (e na aba **Dale** + **`Graphs`**), exibe todos os projetos concluídos, forma de pagamento, horas contabilizadas em cada projeto e ganhos líquidos totais.
- **Reordenação de Projetos Mais à Esquerda (`◀`) ou Mais à Direita (`▶`) e via Drag-and-Drop:**
  - O usuário pode mudar qualquer projeto (ativo ou concluído) de local, colocando-o **mais à esquerda (`◀`)** ou **mais à direita (`▶`)** através dos botões `◀` e `▶` no próprio card do projeto, ou arrastando e soltando um projeto sobre outro no PC (`handleMoveProject` atualizando `order`).

### 2.5. Personalização de Cores Aplicada em TODAS as Páginas (Ao Lado da Versão)
- Ao lado do indicador de versão (`vX.Y.Z`) no cabeçalho superior direito, há um botão de configurações (`Settings`) que abre o painel **Personalização de Cores** (`src/components/ThemeSettingsModal.tsx`).
- Permite escolher livremente **Cor Primária**, **Cor Secundária** e **Cor do Fundo**.
- **Regra Global de Cores:** As escalas `--color-purple-*`, `--color-fuchsia-*`, `--color-violet-*` seguem a **Cor Primária**; `--color-cyan-*` e `--color-pink-*` seguem a **Cor Secundária**; e todas as superfícies escuras (`#07050d`, `#0d091a`, `#120924`, `#0e091d`, etc.) e partículas (`NeonParticles`) seguem dinamicamente a **Cor do Fundo + Cor Primária/Secundária** em **todas as abas** (Projetos, Calendário, Board e Dale).

### 2.6. Identidade, Segurança de Sessão e Mobile
- **Identidade dinâmica:** `NEON` para Elbioh e `SHADOWJOKER` para Didi.
- **Isolamento de sessão:** Armazenamento local e nuvem isolados por `userId` no Supabase (`user_boards`), com opção de lembrar login por 60 dias.
- **Mobile (`C:\Neon\mobile`):** App React Native / Expo com ícone oficial do Neon, tela de login obrigatória, suporte a atualização OTA (`expo-updates` nos canais `preview` e `production`) e sincronizado com todas as funcionalidades do PC (`Projetos`, `Clientes` com `Brody`, `Late`, `Graphs`, edição de valor `$` com 1 toque, `+ Somar / - Subtrair Horas`, `Configurações de Cores & Tema` e ordem da barra inferior `Projetos | Board | Calendário | Dale`). Sempre que atualizar o mobile, publicar OTA via `npx.cmd eas-cli update --branch preview` e `--branch production`.
