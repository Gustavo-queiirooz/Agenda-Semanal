# Agenda Colaborativa — PRD

## Problem Statement
Aplicação web colaborativa para equipes escolares onde todos veem os compromissos uns dos outros, mas cada usuário só pode gerenciar (criar/editar/excluir) os próprios compromissos. Administradores gerenciam usuários, equipes e podem editar qualquer compromisso.

## Stack
- Backend: FastAPI + Motor (MongoDB) + PyJWT + bcrypt
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner + lucide-react
- Auth: Custom JWT (email/password), token no header Authorization Bearer, sessão persistida em localStorage

## User Personas
- **Administrador**: Gerencia usuários, equipes, edita/exclui qualquer compromisso.
- **Usuário Comum (professor/coordenador)**: Vê agenda da equipe, gerencia apenas os próprios compromissos.

## Implemented (2026-08-18)
- Autenticação JWT (`/api/auth/login`, `/api/auth/me`)
- CRUD Users (admin-only) + máscara de email para não-admins
- CRUD Teams (admin-only)
- CRUD Appointments com validação de propriedade no backend
- Endpoint `/api/appointments/conflicts` (avisa, não bloqueia)
- Seed idempotente: equipe "Equipe Escolar" + admin + 4 usuários (Gustavo, Benedito, João, Maria) + 6 compromissos demo
- Frontend: Login page (split-screen, Nunito+Figtree), Agenda semanal (Seg-Sex, 07-18h), sidebar de equipe com filtros/foco individual, modal de compromisso (view/edit/create), área admin com abas Usuários/Equipes
- Responsivo mobile (day view com seletor de dias, drawer sidebar)
- data-testid em todos elementos interativos
- Toasts pt-BR em todas operações
- Confirmação antes de excluir

## Backlog
- P1: Recorrência de compromissos (semanal, mensal)
- P1: Lembretes / notificações por email (Resend)
- P2: Categorias/tags de compromissos
- P2: Exportar agenda em ICS / PDF
- P2: Estatísticas admin (horas ocupadas por professor)
- P2: Modo escuro
- P2: Suporte a múltiplas equipes por usuário

## Test Credentials
See `/app/memory/test_credentials.md` — todas senhas: `senha123`
