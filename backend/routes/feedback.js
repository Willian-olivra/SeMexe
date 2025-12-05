const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback'); // Importe seu Model

/**
 * @route   POST /api/feedback
 */
router.post('/', async (req, res) => {
    const { nome, email, mensagem } = req.body;

    if (!nome || !email || !mensagem) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        // Cria uma nova instância do modelo
        const novoFeedback = new Feedback({
            nome,
            email,
            mensagem
        });

        // Salva no MongoDB
        await novoFeedback.save();
        
        res.status(201).json({ message: 'Feedback recebido com sucesso!' });
    
    } catch (error) {
        console.error('Erro ao salvar feedback:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;