const express = require('express');
const router = express.Router();
// Sobe um nível (de 'routes' para 'backend') para encontrar o 'db.js'
const pool = require('../config/db'); 

/**
 * @route   POST /api/feedback
 * @desc    Salva um novo feedback no banco de dados
 */
router.post('/', async (req, res) => {
    // 1. Extrai os dados do corpo da requisição
    const { nome, email, mensagem } = req.body;

    // 2. Validação simples
    if (!nome || !email || !mensagem) {
        // Se algo faltar, envia uma resposta de erro "Bad Request"
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        // 3. Define a query SQL para inserir os dados
        const sql = "INSERT INTO feedback (nome, email, mensagem) VALUES (?, ?, ?)";
        
        // 4. Executa a query no banco de dados de forma segura (evita SQL Injection)
        await pool.query(sql, [nome, email, mensagem]);
        
        // 5. Envia uma resposta de sucesso
        res.status(201).json({ message: 'Feedback recebido com sucesso!' });
    
    } catch (error) {
        // 6. Se der erro no banco de dados, regista no console e envia erro 500
        console.error('Erro ao salvar feedback:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;