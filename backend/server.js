require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 
const connectDB = require('./config/db'); 

// Importar o Modelo de Mensagem para o Chat
const Message = require('./models/Message'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } }); 

// CONECTAR AO MONGODB
connectDB();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROTAS DA API ---
// Esta rota já foi convertida para MongoDB, então deixamos ativa:
app.use('/api/users', require('./routes/users'));

// --- ATENÇÃO: COMENTE ESTAS ROTAS POR ENQUANTO ---
// Como elas ainda usam SQL, se deixarmos ativas, o servidor vai quebrar.
// Vamos converter uma por uma nos próximos passos.
// app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/atividades', require('./routes/atividades'));
// app.use('/api/amigos', require('./routes/amigos'));
// app.use('/api/chat', require('./routes/chat')); 

// --- LÓGICA DO CHAT EM TEMPO REAL ---
io.on('connection', (socket) => {
    console.log('Um usuário conectou ao chat:', socket.id);

    socket.on('entrar_chat', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Usuário ${userId} entrou na sala user_${userId}`);
    });

    // Enviar Mensagem
    socket.on('enviar_mensagem', async (data) => {
        const { remetenteId, destinatarioId, texto } = data;

        try {
            // 1. Salvar no Mongo (Usando o Modelo Message, não SQL)
            const novaMensagem = await Message.create({
                remetente_id: remetenteId,
                destinatario_id: destinatarioId,
                mensagem: texto
            });

            // 2. Enviar para quem recebe (Em tempo real)
            io.to(`user_${destinatarioId}`).emit('receber_mensagem', {
                remetenteId,
                texto,
                data_envio: novaMensagem.data_envio
            });

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

server.listen(PORT, () => {
  console.log(`\nServidor rodando em http://localhost:${PORT}`);
});