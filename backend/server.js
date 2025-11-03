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

// --- ROTA DE TESTE/DEBUG ---
app.get('/api/test', async (req, res) => {
  const pool = require('./config/db');
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS result');
    const [tables] = await pool.query('SHOW TABLES');
    const [atividadesCount] = await pool.query('SELECT COUNT(*) as total FROM atividades');
    const [usuariosCount] = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    
    res.json({
      status: 'OK',
      database: 'Conectado',
      test_query: result[0].result,
      tables: tables.map(t => Object.values(t)[0]),
      atividades_count: atividadesCount[0].total,
      usuarios_count: usuariosCount[0].total,
      env_loaded: {
        DB_HOST: !!process.env.DB_HOST,
        DB_USER: !!process.env.DB_USER,
        DB_NAME: !!process.env.DB_NAME,
        JWT_SECRET: !!process.env.JWT_SECRET
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
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