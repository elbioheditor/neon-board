# Histórico de Versões e Atualizações — NEON

## v1.5.7 (2026-11-23)
- **Função de Adicionar / Ajustar Horas e Minutos Diretamente nas Tarefas (`+ Tempo` / `+ Horas / Minutos`)**:
  - Caso o usuário tenha pausado e esquecido de despausar o cronômetro de uma tarefa, agora é possível adicionar (ou subtrair/definir) horas e minutos diretamente na tarefa — tanto pelo botão **`+ Tempo` / `+⏱`** no próprio card do Board (via popover flutuante em Portal) quanto pelo botão **`+ Horas / Minutos`** dentro do modal de detalhes da tarefa (PC e Mobile).
  - Inclui atalhos de 1 clique (**`+15m`**, **`+30m`**, **`+45m`**, **`+1h`**, **`+2h`**) e campos personalizados de **Horas (`h`)** e **Minutos (`min`)** para **`+ Somar Tempo`**, **`- Subtrair Tempo`** (ao digitar número negativo) ou **`= Definir Total`**, refletindo automaticamente também no projeto vinculado.

## v1.5.6 (2026-11-21)
- **Selecionar Horário Exato Atual (`⚡ Agora`) em Qualquer Tarefa**: adicionado botão **`⚡ Agora (HH:MM)`** dentro do seletor de horários e ao lado dos campos de horário (no Board, Calendário, Modal de Tarefa e Mobile) para preencher instantaneamente com a hora e minuto exatos atuais.
- **Correção da Visibilidade e Seleção dos Minutos no Fim da Tarefa (`TimeInput24h` via Portal + Todos os 60 Minutos `:00` a `:59`)**:
  - O seletor `TimeInput24h` agora é renderizado via `createPortal(..., document.body)` com posicionamento inteligente na tela (`fixed z-[9999]`), impedindo que a coluna de **Minutos** do campo de **fim da tarefa** seja cortada pela borda direita da coluna no Board/Calendário.
  - Adicionados **todos os 60 minutos (`:00` a `:59`)** + atalhos rápidos (`:00, :15, :30, :45`) para que qualquer minuto exato possa ser selecionado tanto no início quanto no fim da tarefa (PC e Mobile).
  - Ajuste inteligente em `syncEndTimeWithStart` e `clampEndTime` para preservar o minuto escolhido pelo usuário no horário final.

## v1.5.5 (2026-11-21)
- **Sistema de Forma de Pagamento por Projeto (`Wise -0.33%` e `PayPal -6.4%`)**:
  - Opção de marcar com 1 clique (tanto ao criar/editar projeto quanto diretamente nos cards de projetos ativos, concluídos e na aba **Dale**) por qual forma de pagamento o projeto foi ou vai ser pago: **`🟢 Wise (-0.33%)`** ou **`🔵 PayPal (-6.4%)`**.
  - Cálculo automático do **Valor Líquido** em Dólares (`$`) e Reais (`R$`) já descontando a taxa de `6.4%` do PayPal ou `0.33%` da Wise (exibindo também o valor `Bruto` e a taxa descontada nos cards, nos KPIs do mês, na Hora Média `$/h` e no `Graphs`).
- **Mudar Projetos de Local (Mais à Esquerda `◀` ou Mais à Direita `▶` + Arrastar e Soltar)**:
  - Botões **`◀` (Mover para a esquerda)** e **`▶` (Mover para a direita)** em cada card de projeto ativo ou concluído (no PC e no Mobile), além de suporte a arrastar um projeto sobre outro no PC para reordenar a posição livremente.

## v1.5.4 (2026-11-19)
- **Parar cronômetro automaticamente ao fechar o app**: qualquer tarefa cronometrando é pausada automaticamente ao fechar o Neon (salvando o tempo exato até o fechamento e evitando contagem com o app fechado).
- **Subtrair horas em projetos com sinal negativo (`- Subtrair Horas`)**: ao digitar um número negativo (ex.: `-1`h ou `-30`min) no ajuste de horas do projeto, o botão **`+ Somar Horas`** vira automaticamente **`- Subtrair Horas`** e diminui as horas do projeto.
- **Nova ordem das abas na dock inferior**: **`Projetos` | `Board` | `Calendário` | `Dale`** (Board posicionado à direita de Projetos e à esquerda de Calendário).
- **Atualização completa do Neon Mobile (`C:\Neon\mobile` v1.5.4)**: sincronização e otimização mobile de todas as novidades do PC (`Projetos`, `Clientes` obrigatórios com `Brody`, edição direta de valor `$XX.XX ✏️`, `+ Somar / - Subtrair Horas`, vínculo de tarefa a projeto via modal flutuante, coluna `Late`, aba `Dale` com `Graphs` anual interativo por toque, `Configurações de Cores & Tema` e pausa automática de cronômetro ao fechar/sair do app), publicada via OTA (`eas update`).

## v1.5.3 (2026-11-18)
- **Edição rápida e direta do valor (`$ USD`) de qualquer projeto**: agora basta clicar diretamente no badge do valor em dólar (`$XX.XX ✏️`) ou no botão **`Mudar Valor ($)`** em qualquer projeto (seja ativo, concluído na aba Projetos ou concluído na aba Dale) para alterar o valor na hora, recalculando automaticamente a conversão em Reais (`R$`), os ganhos do mês, a hora média (`$/h`) e o gráfico anual (`Graphs`).

## v1.5.2 (2026-11-11)
- **Botão e Visão `"Graphs"` na aba Dale (à esquerda do mês escolhido)**: gráfico de barras anual mostrando os ganhos de cada mês (`Jan` a `Dez`), com tooltip rico ao passar o mouse exibindo os projetos feitos no mês, valor da hora média de ganhos (`$/h` e `R$/h`), horas trabalhadas e quais clientes foram atendidos naquele mês.
- **Sistema de Clientes Obrigatório em Projetos**: opção de cadastrar/selecionar clientes para cada projeto (obrigatório ao criar projeto), e atribuição automática dos projetos já realizados pelo usuário ao cliente **`Brody`**.

## v1.5.1 (2026-11-11)
- **Remoção da coluna `"Horários"`** na aba Board a pedido do usuário.
- **Aplicação completa das Cores do Tema em todas as páginas** (incluindo Calendário, superfícies escuras `#0d091a`/`#120924`, gradientes `pink-*` e partículas `NeonParticles`).
- **Opção de Adicionar / Corrigir Horas Manualmente em um Projeto (`+ Horas / Ajustar`)**: permite somar horas (`+ Somar Horas`) ou definir o tempo total exato (`= Definir Total`) caso o usuário não tenha cronometrado ou queira corrigir um erro.
- **Correção do Menu `"Vincular a Projeto"` nos Cards (`createPortal`)**: agora flutua livremente via Portal sobre toda a interface sem ficar preso/cortado dentro da box da tarefa ou da coluna.
- **Remoção da exclusão de projeto com 1 clique**: projetos agora só podem ser apagados arrastando para a Lixeira na parte inferior da tela, evitando *missclick*.

## v1.5.0 (2026-11-11)
- **Coluna de Horários (`08:00` às `23:00`)** fixa na extrema esquerda do Board.
- **Movimentação em Bloco Contíguo** para tarefas de múltiplos dias (`shiftTaskAndGroupToDate`).
- **Renomeação de `"Yesterday"` para `"Late"`** com animação de slide crescendo para a esquerda ao abrir e slide para a direita ao fechar.
- **Painel de Personalização de Cores** (Cor Primária, Cor Secundária e Cor do Fundo) ao lado do badge da versão.
- **Nova Aba `"Projetos"`** (à esquerda do Calendário) com atribuição de horas de tarefas (botão ao lado de `INICIAR`), conclusão arrastando para a parte inferior da tela, sistema financeiro em Dólares (`USD $`) + convertido em Reais (`BRL R$`) e cálculo do **Valor da Hora Média (`$/h` e `R$/h`)**.
- **Polimento geral de animações** em cards, gavetas inline, popovers, modais e barra inferior de conclusão.
- **Criação do Sistema de Memória de Longo Prazo (`C:\Neon\memoria_projeto`)** com limite máximo de 50 GB por projeto.
