# Se Mexe - Plataforma de Organização Esportiva

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/mongodb-atlas-green.svg)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)

> **Não jogue sozinho. Encontre sua atividade agora.**

O **Se Mexe** é uma plataforma web desenvolvida para resolver o caos da organização de esportes amadores. Chega de listas confusas no WhatsApp! Nossa aplicação centraliza a criação de partidas, controle de presença, comunicação em tempo real e avaliação de jogadores, tudo em uma interface moderna e responsiva.


## Funcionalidades

### Autenticação & Segurança
- **Login e Cadastro Seguro:** Senhas criptografadas (Bcrypt).
- **2FA (Dois Fatores):** Envio de código de verificação via E-mail.
- **Recuperação de Conta:** Fluxo completo de "Esqueci minha senha" com token temporário.

### Gestão de Atividades
- **CRUD Completo:** Criar, Editar, Visualizar e Excluir atividades.
- **Vagas:** Controle automático de limite de participantes.
- **Filtros:** Busca por esporte (Futebol, Vôlei, Basquete, etc.).
- **Visibilidade:** Opção de criar eventos Públicos ou Privados (apenas amigos).

### Comunicação & Social
- **Chat em Tempo Real:** Conversas instantâneas via Socket.io.
- **Salas de Atividade:** Chat temporário exclusivo para os confirmados no jogo.
- **Sistema de Amigos:** Enviar, aceitar e recusar solicitações de amizade.
- **Mensagens Diretas:** Contato privado entre usuários conectados.

### Gamificação & Utilitários
- **Fairplay:** Sistema de avaliação pós-jogo (Presença, Respeito, Jogo Limpo) que gera uma nota de reputação.
- **Meteorologia:** Integração com **Open-Meteo** para mostrar a previsão do tempo no local e hora do jogo.
- **Geolocalização:** Integração com **Nominatim (OSM)**.

---

## Tecnologias Utilizadas

### Frontend
- **HTML5 & CSS3**
- **Tailwind CSS:** Para estilização responsiva e tema Dark/Neon.
- **JavaScript (Vanilla):** Lógica de cliente e manipulação do DOM.
- **FontAwesome:** Ícones.

### Backend
- **Node.js**: Ambiente de execução.
- **Express.js**: Framework para API REST.
- **Socket.io**: Comunicação WebSocket (Real-time).
- **Nodemailer**: Envio de e-mails transacionais.

### Banco de Dados
- **MongoDB (Atlas):** Banco NoSQL hospedado na nuvem.
- **Mongoose**: ODM para modelagem de dados.

---

## Pré-requisitos

Antes de começar, você precisa ter instalado em sua máquina:
- [Node.js](https://nodejs.org/en/) (v14 ou superior)
- [Git](https://git-scm.com)
- Uma conta no [MongoDB Atlas](https://www.mongodb.com/atlas) (para obter a string de conexão).

---

## Instalação e Configuração

1. **Clone o repositório**
   ```bash
   git clone [https://github.com/SEU-USUARIO/se-mexe.git](https://github.com/SEU-USUARIO/se-mexe.git)
   cd se-mexe
