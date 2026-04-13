# SAC - Sistema Administrativo CongregaÃ§Ã£o
## Regional Itapevi

O **SAC** (Sistema Administrativo CongregaÃ§Ã£o) Ã© uma plataforma moderna e intuitiva desenvolvida para facilitar a gestÃ£o administrativa da **Regional Itapevi**. O sistema oferece ferramentas robustas para controle de membros, ministÃ©rio, atendimentos e gestÃµes especÃ­ficas de diversos setores.

## ðŸš€ Funcionalidades Principais

- **AutenticaÃ§Ã£o Segura**: Gerenciamento de acesso via Supabase Auth.
- **Controle de Acessos (RBAC)**: Diferentes nÃ­veis de acesso para Administradores (Managers) e Membros de setores.
- **MÃ³dulos Setoriais**:
  - **D.A.R.P.E**: GestÃ£o de dados e relatÃ³rios especÃ­ficos.
  - **E.B.I**: Controle de atividades educacionais/infantis.
  - **G.E.M**: GestÃ£o de musicalizaÃ§Ã£o e mÃ©todos.
  - **D.E.P.A.C**: Controle de atendimentos, batismos e membros.
- **Interface Premium**: Layout baseado no Inspinia Admin Theme, responsivo e com notificaÃ§Ãµes elegantes via SweetAlert2.
- **PWA (Progressive Web App)**: InstalÃ¡vel em dispositivos mÃ³veis para acesso rÃ¡pido.

## ðŸ› ï¸ Tecnologias Utilizadas

- **Frontend**: AngularJS (v1.x)
- **EstilizaÃ§Ã£o**: Bootstrap 3 + CSS3 Customizado
- **Backend / Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Ãcones**: FontAwesome 4.7 & 6.0
- **NotificaÃ§Ãµes**: SweetAlert2
- **TraduÃ§Ãµes**: Angular Translate

## ðŸ“¦ Como Rodar o Projeto

1. **Clonar o repositÃ³rio:**
   ```bash
   git clone https://github.com/seu-usuario/seu-repositorio.git
   ```

2. **Rodar localmente:**
   Pode ser utilizado qualquer servidor estÃ¡tico. Exemplo com `http-server`:
   ```bash
   npx http-server .
   ```

3. **ConfiguraÃ§Ã£o do Supabase:**
   Certifique-se de que as chaves de API em `js/services/auth.service.js` e `js/config.js` estÃ£o configuradas corretamente para o seu ambiente.

## ðŸ“ LicenÃ§a

Este projeto Ã© de uso restrito da Regional Itapevi. Todos os direitos reservados.

---
Desenvolvido com â¤ï¸ para a Regional Itapevi.
