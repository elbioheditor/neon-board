# ⚡ NEON — Routine & Kanban Board (Elbioh & Didi)

Aplicativo desktop (`.exe`) e Web App (pronto para Vercel) inspirado no Trello, com identidade visual Dark Neon (**Roxo & Azul Ciano**) e foco em rotina diária por horários e relatório de fechamento mensal.

---

## 🚀 Como Abrir o Aplicativo (.exe)

1. **Executável Direto**:
   - Na pasta `c:\Neon\release\win-unpacked\Neon.exe` (ou `c:\Neon\release\Neon.exe` / atalho na Área de Trabalho).
   - Basta dar dois cliques em **`Neon.exe`** para abrir o app na janela nativa Dark Neon.

---

## ✨ Funcionalidades Principais

1. **Dois Boards Dedicados (`Elbioh's Board` & `Didi's Board`)**:
   - Alterne instantaneamente pelo topo da janela ou pelo botão **`Switch boards`** na barra inferior.
   - O **Elbioh's Board** já vem pré-carregado com suas tarefas do print do Trello.

2. **Organização Diária por Horários (`09:00 - 11:00`, etc.)**:
   - Cada card possui horário de início e fim.
   - Em qualquer coluna (como *Today*), clique no botão **`Horário`** no topo da coluna para ordenar todas as tarefas do dia em ordem cronológica.
   - Na barra inferior, acesse a aba **`Planner (Horários)`** para ver seu dia dividido em **Manhã**, **Tarde** e **Noite**.

3. **Status (`⚡ Em Progresso`) & Finalização de Tarefas**:
   - Clique em **`Iniciar`** no card para deixá-lo **`⚡ EM PROGRESSO`** (com brilho Neon Ciano/Roxo).
   - Ao clicar no círculo de check (`✓`) ao lado do título ou em **"Finalizar Tarefa"**, a tarefa **sai automaticamente do NeonBoard ativo** e vai direto para o histórico do mês.

4. **Fechamento do Mês (`🏆 Fim do Mês`)**:
   - Na barra inferior, clique em **`Fim do Mês`** para ver todas as tarefas concluídas naquele mês, separadas por dia, com estatísticas e botão para exportar relatório `.txt` ou restaurar tarefas.

5. **Uso Compartilhado Online (Você no seu PC + Didi no PC dele)**:
   - **Sincronização em Tempo Real**: Clique no botão **`Sync / Backup`** no canto superior direito e conecte um projeto gratuito do [Supabase](https://supabase.com) (o SQL já está pronto dentro do app para copiar com 1 clique).
   - **Subir na Vercel**: O projeto já possui `vercel.json` configurado. Basta subir a pasta `c:\Neon` na Vercel para acessar pelo navegador ou domínio próprio.
