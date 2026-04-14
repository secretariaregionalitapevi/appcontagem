# Sistema de Segurança e Auditoria Profissional - REG-IT (Inspinia)

Este documento descreve a arquitetura de segurança, auditoria e controle de acesso implementada no projeto **SISTEMA REG-IT**.

## 1. Níveis de Acesso (Roles)

O sistema utiliza os seguintes níveis de acesso, definidos na tabela `public.access_levels`:

| ID | Nome | Descrição | Permissões de UI |
|---|---|---|---|
| 1 | **MASTER** | Acesso total ao sistema, todas as regionais e módulos. | Visualiza todos os menus, exporta e exclui dados. |
| 2 | **ADMIN** | Administrador Regional. Acesso total ao seu setor. | Visualiza menus do seu setor, exporta e exclui dados do setor. |
| 3 | **COORDINATOR** | Coordenador. Acesso a funcionalidades de gestão. | Visualiza menus do seu setor, exporta dados. |
| 4 | **INSTRUCTOR** | Instrutor. Lançamentos e cadastros. | Visualiza menus do seu setor, lança lições, **não** apaga dados. |
| 5 | **MUSICIAN** | Músico. Acesso básico. | Leitura básica no seu setor. |
| 6 | **CANDIDATE** | Candidato / Inscrição. | Acesso restrito apenas ao perfil próprio (default para novos usuários). |

## 2. Controle por Setor (Sectors)

Além do nível de acesso, cada usuário (exceto MASTER) está vinculado a um **Setor** (ex: EBI, Musicalizacao, Darpe, Música). 
- No menu lateral (`navigation.html`), o usuário só visualiza os módulos correspondentes ao seu setor.
- O setor `MASTER` ignora estas restrições e visualiza todos os módulos.

## 3. Fluxo de Novos Usuários ("Inscrição")

1. **Cadastro:** Novos usuários que se registram via `AuthService` são automaticamente atribuídos ao setor **"Inscrição"** com `status = 'pending'` e `role_id = 6`.
2. **Notificação:** Administradores e Masters recebem um alerta no **ícone do sino** (Top Navbar) informando o número de usuários aguardando liberação.
3. **Aprovação:** Um Master ou Admin deve editar o perfil do usuário, alterando o setor e o nível de acesso para que ele possa utilizar o sistema.

## 4. Sistema de Auditoria (Audit Logs)

Todas as ações críticas são gravadas na tabela `public.audit_logs`:
- **Login/Logout:** Rastreamento de acessos.
- **Registro:** Novos cadastros.
- **Lançamentos:** (A ser expandido para cada módulo).

### Retenção de Dados
O sistema possui uma política de retenção de **90 dias**. Registros mais antigos que 90 dias são removidos automaticamente via trigger/função no banco de dados (`public.clean_audit_logs`).

## 5. Restrições de Funcionalidades

- **Exportação (Excel/PDF):** Restrito a usuários com `role_id <= 3` (Master, Admin, Coordenador).
- **Exclusão de Registros:** Restrito a usuários com `role_id <= 3`. Instrutores podem cadastrar e editar, mas não apagar.
- **Configurações do Sistema:** Restrito a Master e Admin.

---
*Documentação gerada automaticamente em 31/03/2026 para o projeto Inspinia.*
