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

// --- SOCKET.IO (Tempo Real) ---
io.on('connection', (socket) => {
    // Tenta pegar o token enviado pelo frontend na conexão
    const token = socket.handshake.auth.token;
    let userId = null;

    if (token) {
        try {
            // Decodifica o token para saber quem é o usuário
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.user.id; // Ajuste conforme estrutura do seu token
            
            // Entra na sala exclusiva dele (ex: "12345")
            socket.join(userId.toString());
            console.log(`🔌 User conectado no Socket: ${userId}`);
        } catch (e) {
            console.log('Token de socket inválido');
        }
    }

    // Fallback: Se o frontend emitir "entrar_chat" manualmente
    socket.on('entrar_chat', (id) => {
        socket.join(id.toString());
        console.log(`🔌 User entrou na sala manualmente: ${id}`);
    });

    // RECEBE O AVISO DE MENSAGEM DO FRONTEND E REPASSA
    socket.on('enviar_mensagem', (data) => {
        const { destinatarioId, texto, remetenteId } = data;
        
        console.log(`📨 Mensagem de ${remetenteId} para ${destinatarioId}`);

        // Envia APENAS para o destinatário específico
        // O .to(id) manda para a sala que criamos no .join(userId)
        io.to(destinatarioId.toString()).emit('mensagem_recebida', {
            remetenteId: remetenteId,
            destinatarioId: destinatarioId,
            conteudo: texto,
            data_envio: new Date()
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
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
});