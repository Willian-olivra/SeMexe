const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware
const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// GET /api/chat/historico/:amigoId
// Pega as mensagens entre EU e o AMIGO
router.get('/historico/:amigoId', autenticarToken, async (req, res) => {
    const meuId = req.user.id;
    const amigoId = req.params.amigoId;

    try {
        const [mensagens] = await pool.query(`
            SELECT * FROM mensagens 
            WHERE (remetente_id = ? AND destinatario_id = ?) 
               OR (remetente_id = ? AND destinatario_id = ?)
            ORDER BY data_envio ASC
        `, [meuId, amigoId, amigoId, meuId]);

        res.json(mensagens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
});

module.exports = router;