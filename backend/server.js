require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Necessário para o Chat
const { Server } = require('socket.io'); // Importa o Socket.io
const pool = require('./config/db'); // Importa conexão para salvar mensagens

const app = express();
const server = http.createServer(app); // Cria servidor HTTP
const io = new Server(server, { cors: { origin: "*" } }); // Cria servidor de Chat

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROTAS DA API ---
app.use('/api/users', require('./routes/users'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/atividades', require('./routes/atividades'));
app.use('/api/amigos', require('./routes/amigos'));
app.use('/api/chat', require('./routes/chat')); // <--- NOVA ROTA DE HISTÓRICO

// --- LÓGICA DO CHAT EM TEMPO REAL ---
io.on('connection', (socket) => {
    console.log('Um usuário conectou ao chat:', socket.id);

    // Quando o usuário entra, ele entra numa "sala" exclusiva com o ID dele
    socket.on('entrar_chat', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Usuário ${userId} entrou na sala user_${userId}`);
    });

    // Enviar Mensagem
    socket.on('enviar_mensagem', async (data) => {
        const { remetenteId, destinatarioId, texto } = data;

        // 1. Salvar no Banco
        try {
            await pool.query(
                'INSERT INTO mensagens (remetente_id, destinatario_id, mensagem) VALUES (?, ?, ?)',
                [remetenteId, destinatarioId, texto]
            );

            // 2. Enviar para quem recebe (Em tempo real)
            io.to(`user_${destinatarioId}`).emit('receber_mensagem', {
                remetenteId,
                texto,
                data_envio: new Date()
            });

            // 3. Enviar de volta para quem mandou (para aparecer na tela dele tbm)
            // (Opcional se o front já adicionar na tela, mas bom pra confirmar)
        } catch (error) {
            console.error('Erro ao salvar mensagem:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectou');
    });
});

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Fallback SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// IMPORTANTE: Agora usamos server.listen, não app.listen
server.listen(PORT, () => {
  console.log(`\nServidor rodando em http://localhost:${PORT}`);
});