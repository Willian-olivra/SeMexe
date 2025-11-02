require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Log de requisições (útil para debug)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- ROTAS DA API ---
app.use('/api/users', require('./routes/users'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/atividades', require('./routes/atividades'));

// Tratamento de rotas de API não encontradas
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint da API não encontrado.' });
});

// --- SERVIDOR DE ARQUIVOS ESTÁTICOS ---
app.use(express.static(path.join(__dirname, '../public')));

// --- FALLBACK PARA SPA (Single Page Application) ---
// Qualquer rota não encontrada vai para o index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`\nServidor rodando em http://localhost:${PORT}`);
});