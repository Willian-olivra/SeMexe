const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware de Autenticação
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

// 1. Enviar Solicitação
router.post('/solicitar', autenticarToken, async (req, res) => {
    const { amigoId } = req.body;
    const meuId = req.user.id;

    if (parseInt(meuId) === parseInt(amigoId)) {
        return res.status(400).json({ error: 'Você não pode adicionar a si mesmo.' });
    }

    try {
        const [existe] = await pool.query(
            `SELECT * FROM amigos 
             WHERE (id_usuario_1 = ? AND id_usuario_2 = ?) 
                OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
            [meuId, amigoId, amigoId, meuId]
        );

        if (existe.length > 0) {
            return res.status(400).json({ error: 'Solicitação já enviada ou vocês já são amigos.' });
        }

        await pool.query(
            'INSERT INTO amigos (id_usuario_1, id_usuario_2, status) VALUES (?, ?, ?)',
            [meuId, amigoId, 'pendente']
        );

        res.json({ message: 'Solicitação de amizade enviada!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar amigo.' });
    }
});

// 2. Verificar Status da Amizade
router.get('/check/:id', autenticarToken, async (req, res) => {
    const amigoId = req.params.id;
    const meuId = req.user.id;

    try {
        const [relacao] = await pool.query(
            `SELECT status, id_usuario_1 FROM amigos 
             WHERE (id_usuario_1 = ? AND id_usuario_2 = ?) 
                OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
            [meuId, amigoId, amigoId, meuId]
        );

        if (relacao.length === 0) {
            return res.json({ status: 'nenhum' });
        }

        const dados = relacao[0];
        let statusFinal = dados.status;

        if (dados.status === 'pendente') {
            statusFinal = (dados.id_usuario_1 === meuId) ? 'enviado' : 'recebido';
        }

        res.json({ status: statusFinal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar amizade.' });
    }
});

// 3. Listar Meus Amigos (Aceitos) - CORRIGIDO: Agora seleciona o avatar
router.get('/', autenticarToken, async (req, res) => {
    const meuId = req.user.id;
    try {
        const [amigos] = await pool.query(`
            SELECT u.id, u.nome, u.email, u.avatar 
            FROM usuarios u
            INNER JOIN amigos a ON (u.id = a.id_usuario_1 OR u.id = a.id_usuario_2)
            WHERE (a.id_usuario_1 = ? OR a.id_usuario_2 = ?)
            AND a.status = 'aceito'
            AND u.id != ?
        `, [meuId, meuId, meuId]);
        res.json(amigos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar amigos.' });
    }
});

// 4. Listar Solicitações Pendentes - CORRIGIDO: Agora seleciona o avatar
router.get('/pendentes', autenticarToken, async (req, res) => {
    const meuId = req.user.id;
    try {
        const [pendentes] = await pool.query(`
            SELECT u.id, u.nome, u.email, u.avatar
            FROM usuarios u
            INNER JOIN amigos a ON u.id = a.id_usuario_1
            WHERE a.id_usuario_2 = ? AND a.status = 'pendente'
        `, [meuId]);
        res.json(pendentes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar solicitações.' });
    }
});

// 5. Responder Solicitação
router.post('/responder', autenticarToken, async (req, res) => {
    const { amigoId, acao } = req.body;
    const meuId = req.user.id;

    if (!['aceitar', 'recusar'].includes(acao)) return res.status(400).json({ error: 'Ação inválida.' });

    try {
        if (acao === 'aceitar') {
            await pool.query(
                `UPDATE amigos SET status = 'aceito' WHERE id_usuario_1 = ? AND id_usuario_2 = ?`,
                [amigoId, meuId]
            );
            res.json({ message: 'Agora vocês são amigos!' });
        } else {
            await pool.query(
                `DELETE FROM amigos WHERE id_usuario_1 = ? AND id_usuario_2 = ?`,
                [amigoId, meuId]
            );
            res.json({ message: 'Solicitação recusada.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao responder solicitação.' });
    }
});

// 6. Excluir Amigo
router.delete('/:id', autenticarToken, async (req, res) => {
    const amigoId = req.params.id;
    const meuId = req.user.id;

    try {
        const [result] = await pool.query(
            `DELETE FROM amigos 
             WHERE (id_usuario_1 = ? AND id_usuario_2 = ?) 
                OR (id_usuario_1 = ? AND id_usuario_2 = ?)`,
            [meuId, amigoId, amigoId, meuId]
        );

        if (result.affectedRows > 0) {
            res.json({ message: 'Amigo removido com sucesso.' });
        } else {
            res.status(404).json({ error: 'Amizade não encontrada.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao remover amigo.' });
    }
});

module.exports = router;