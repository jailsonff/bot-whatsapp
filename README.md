# WhatsApp Bot SaaS

Sistema de automação e gerenciamento de WhatsApp com interface web moderna.

## Funcionalidades

- ✅ Conexão com WhatsApp Web
- ✅ Gerenciamento de contatos
- ✅ Automação de respostas
- ✅ Fluxos de conversa
- ✅ Interface moderna e responsiva
- ✅ Relatórios e métricas

## Tecnologias

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express
- UI: Tailwind CSS + shadcn/ui
- Banco de dados: PostgreSQL + Drizzle ORM
- WebSocket para comunicação em tempo real

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/jailsonff/bot-whatsapp.git
cd bot-whatsapp
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Estrutura do Projeto

```
├── client/             # Frontend React
├── server/             # Backend Node.js
├── shared/             # Código compartilhado
└── whatsapp_auth/      # Arquivos de autenticação WhatsApp
```

## Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 