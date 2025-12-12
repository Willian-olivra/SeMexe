require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 
const connectDB = require('./config/db'); 
const jwt = require('jsonwebtoken'); // Necessário para decodificar o token no Socket

// Inicia conexão Mongo
connectDB();

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { 
    cors: { origin: "*" } 
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROTAS DA API ---
app.use('/api/users', require('./routes/users'));
// app.use('/api/feedback', require('./routes/feedback')); // Descomente se tiver
app.use('/api/atividades', require('./routes/atividades'));
app.use('/api/amigos', require('./routes/amigos'));
app.use('/api/chat', require('./routes/chat')); // Rota nova que criamos acima!
app.use('/api/fairplay', require('./routes/fairplay'));
// --- SOCKET.IO (Tempo Real) ---
io.on('connection', (socket) => {
    // Tenta pegar o token enviado pelo frontend na conexão
    const token = socket.handshake.auth.token;
    let userId = null;
    // O usuário entra na sala da atividade quando abre a página
    socket.on('entrar_sala_atividade', (atividadeId) => {
        const sala = `atividade_${atividadeId}`;
        socket.join(sala);
        console.log(`🔌 User entrou na sala: ${sala}`);
    });

    // O usuário sai da sala (opcional, mas bom para limpeza)
    socket.on('sair_sala_atividade', (atividadeId) => {
        const sala = `atividade_${atividadeId}`;
        socket.leave(sala);
    });

    // Recebe mensagem de grupo e retransmite para a sala
    socket.on('enviar_msg_atividade', (data) => {
        const { atividadeId, texto, remetente, data_envio } = data;
        const sala = `atividade_${atividadeId}`;

        // Envia para TODOS na sala (inclusive quem mandou)
        io.to(sala).emit('receber_msg_atividade', {
            atividadeId,
            texto,
            remetente, // Objeto com nome/avatar
            data_envio
        });
    });

    if (token) {
        try {
            // Decodifica o token para saber quem é o usuário
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.user.id; // Ajuste conforme estrutura do seu token
            
            // Entra na sala exclusiva dele (ex: "12345")
            socket.join(userId.toString());
            console.log(`User conectado no Socket: ${userId}`);
        } catch (e) {
            console.log('Token de socket inválido');
        }
    }

    // Fallback: Se o frontend emitir "entrar_chat" manualmente
    socket.on('entrar_chat', (id) => {
        socket.join(id.toString());
        console.log(`User entrou na sala manualmente: ${id}`);
    });

    // RECEBE O AVISO DE MENSAGEM DO FRONTEND E REPASSA
    socket.on('enviar_mensagem', (data) => {
        const { destinatarioId, texto, remetenteId } = data;
        
        console.log(`Mensagem de ${remetenteId} para ${destinatarioId}`);

        // Envia APENAS para o destinatário específico
        // O .to(id) manda para a sala que criamos no .join(userId)
        io.to(destinatarioId.toString()).emit('mensagem_recebida', {
            remetenteId: remetenteId,
            destinatarioId: destinatarioId,
            conteudo: texto,
            data_envio: new Date()
        });
    });
    socket.on('enviar_mensagem', (data) => {
        // ... (código existente do chat privado) ...
        const { destinatarioId, texto, remetenteId } = data;
        io.to(destinatarioId.toString()).emit('mensagem_recebida', {
            remetenteId: remetenteId,
            destinatarioId: destinatarioId,
            conteudo: texto,
            data_envio: new Date()
        });
    });

    // 1. Entrar na sala específica da atividade
    socket.on('entrar_sala_atividade', (atividadeId) => {
        const sala = `atividade_${atividadeId}`;
        socket.join(sala);
        // console.log(`User entrou na sala: ${sala}`);
    });

    // 2. Receber mensagem e espalhar para todos na sala
    socket.on('enviar_msg_atividade', (data) => {
        const { atividadeId, texto, remetente, data_envio } = data;
        const sala = `atividade_${atividadeId}`;

        // Envia para TODOS na sala da atividade (io.to)
        io.to(sala).emit('receber_msg_atividade', {
            atividadeId,
            texto,
            remetente, // O frontend manda o objeto { nome, avatar }
            data_envio: data_envio || new Date()
        });
    });

    socket.on('disconnect', () => {
        // console.log('User desconectou');
    });
});

// Arquivos estáticos (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Fallback SPA (qualquer rota que não seja API vai pro index.html)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

server.listen(PORT, () => {
  console.log(`\nServidor rodando em http://localhost:${PORT}`);
});