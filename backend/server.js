const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- 1. ROTAS DA API ---
// Os pedidos para /api/... são tratados primeiro.
app.use('/api/users', require('./routes/users'));
app.use('/api/feedback', require('./routes/feedback'));
// app.use('/api/atividades', require('./routes/atividades')); 

// --- 2. SERVIDOR DE FICHEIROS ESTÁTICOS ---
// Se não for um pedido de API, o Express procura um ficheiro
// correspondente na pasta '../public'.
// Ex: um pedido para /login.html vai servir o public/login.html
// Ex: um pedido para / (raiz) vai servir o public/index.html
app.use(express.static(path.join(__dirname, '../public')));

// --- 3. GESTÃO DE ERROS 404 (Página não encontrada) ---
// Estas rotas só são ativadas se nenhuma das opções acima (API ou Ficheiro)
// for encontrada.

// 3.1. Se for um pedido de API que não existe (ex: /api/pagina-teste)
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint da API não encontrado.' });
});

// 3.2. Se for qualquer outra página que não existe (ex: /pagina-inventada.html)
// Nós redirecionamos o utilizador de volta para a página inicial.
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// Inicia o servidor
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));