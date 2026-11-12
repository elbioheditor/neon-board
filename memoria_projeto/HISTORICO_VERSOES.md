# Histórico de Versões e Atualizações — NEON

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
