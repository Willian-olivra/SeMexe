const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.userId = user.id;
        req.user = user;
        next();
    });
};

// Listar atividades de um usuário específico (Perfil Público)
router.get('/usuario/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const [rows] = await pool.query(`
            SELECT a.*, 
            (SELECT COUNT(*) FROM participantes p WHERE p.atividade_id = a.id) as participantes_count
            FROM atividades a
            WHERE a.id_usuario = ? 
            AND a.visibilidade = 'public'
            ORDER BY a.data_hora DESC
        `, [userId]);

        const atividades = rows.map(a => ({
            ...a,
            vagas_disponiveis: a.vagas - a.participantes_count,
            lotada: (a.vagas - a.participantes_count) <= 0
        }));

        res.json(atividades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar atividades do usuário' });
    }
});

// GET /api/atividades (Listar Todas)
router.get('/', async (req, res) => {
    try {
        const { esporte } = req.query;
        let userId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try { userId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; } catch (e) {}
        }

        let query = `
            SELECT a.*, u.nome as criador_nome,
            (SELECT COUNT(*) FROM participantes p WHERE p.atividade_id = a.id) as participantes_count
            FROM atividades a JOIN usuarios u ON a.id_usuario = u.id WHERE a.data_hora >= NOW()
        `;
        
        if (userId) {
            query += ` AND (a.visibilidade = 'public' OR a.id_usuario = ${userId} OR a.id_usuario IN (
                SELECT id_usuario_2 FROM amigos WHERE id_usuario_1 = ${userId} AND status = 'aceito' UNION
                SELECT id_usuario_1 FROM amigos WHERE id_usuario_2 = ${userId} AND status = 'aceito'
            ))`;
        } else {
            query += ` AND a.visibilidade = 'public'`;
        }

        const params = [];
        if (esporte && esporte !== 'Todos') { query += ' AND a.esporte = ?'; params.push(esporte); }
        query += ' GROUP BY a.id ORDER BY a.data_hora ASC';
        
        const [rows] = await pool.query(query, params);
        const atividades = rows.map(a => ({
            ...a, vagas_disponiveis: a.vagas - a.participantes_count, lotada: (a.vagas - a.participantes_count) <= 0
        }));
        res.json(atividades);
    } catch (error) { res.status(500).json({ error: 'Erro ao listar.' }); }
});

// GET /api/atividades/minhas
router.get('/minhas', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, (SELECT COUNT(*) FROM participantes p WHERE p.atividade_id = a.id) as participantes_count
            FROM atividades a WHERE a.id_usuario = ? ORDER BY a.data_hora DESC`, [req.userId]);
        
        const atividades = rows.map(a => ({ ...a, vagas_disponiveis: a.vagas - a.participantes_count }));
        res.json(atividades);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar.' }); }
});

// GET /api/atividades/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, u.nome as criador_nome, u.email as criador_email,
            (SELECT COUNT(*) FROM participantes p WHERE p.atividade_id = a.id) as participantes_count
            FROM atividades a JOIN usuarios u ON a.id_usuario = u.id WHERE a.id = ?`, [req.params.id]);
        
        if (!rows.length) return res.status(404).json({ error: 'Não encontrada' });
        const a = rows[0];
        res.json({ ...a, vagas_disponiveis: a.vagas - a.participantes_count, lotada: (a.vagas - a.participantes_count) <= 0 });
    } catch (error) { res.status(500).json({ error: 'Erro.' }); }
});

// POST /api/atividades (Criar)
router.post('/', authMiddleware, async (req, res) => {
    const { esporte, titulo, local, data_hora, vagas, visibilidade } = req.body;
    if (!esporte || !titulo || !local || !data_hora || !vagas) return res.status(400).json({ error: 'Preencha tudo.' });
    if (vagas < 2) return res.status(400).json({ error: 'Mínimo 2 vagas.' });
    if (new Date(data_hora) <= new Date()) return res.status(400).json({ error: 'Data futura exigida.' });

    try {
        const [result] = await pool.query(
            'INSERT INTO atividades (id_usuario, esporte, titulo, local, data_hora, vagas, visibilidade) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.userId, esporte, titulo, local, data_hora, vagas, visibilidade || 'public']
        );
        res.status(201).json({ id: result.insertId, message: 'Criada com sucesso!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao criar.' }); }
});

// PUT /api/atividades/:id (ROTA ATUALIZADA)
router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { esporte, titulo, local, data_hora, vagas, visibilidade } = req.body;
    try {
        const [check] = await pool.query('SELECT * FROM atividades WHERE id = ? AND id_usuario = ?', [id, req.userId]);
        if (!check.length) return res.status(404).json({ error: 'Não encontrada ou sem permissão.' });
        
        // Atualizado para incluir visibilidade
        await pool.query('UPDATE atividades SET esporte=?, titulo=?, local=?, data_hora=?, vagas=?, visibilidade=? WHERE id=?', 
            [esporte, titulo, local, data_hora, vagas, visibilidade, id]);
        res.json({ message: 'Atualizada!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao atualizar.' }); }
});

// DELETE /api/atividades/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [check] = await pool.query('SELECT * FROM atividades WHERE id = ? AND id_usuario = ?', [req.params.id, req.userId]);
        if (!check.length) return res.status(404).json({ error: 'Não encontrada ou sem permissão.' });
        
        await pool.query('DELETE FROM atividades WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deletada!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao deletar.' }); }
});

// POST /participar
router.post('/:id/participar', authMiddleware, async (req, res) => {
    const userId = req.userId;
    const atvId = req.params.id;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [a] = await conn.query('SELECT a.*, (SELECT COUNT(*) FROM participantes WHERE atividade_id=a.id) as p_count FROM atividades a WHERE id=?', [atvId]);
        if(!a.length) throw new Error('Não encontrada');
        if(a[0].id_usuario === userId) throw new Error('Você é o dono');
        if((a[0].vagas - a[0].p_count) <= 0) throw new Error('Lotada');
        
        const [exists] = await conn.query('SELECT * FROM participantes WHERE usuario_id=? AND atividade_id=?', [userId, atvId]);
        if(exists.length) throw new Error('Já inscrito');
        
        await conn.query('INSERT INTO participantes (usuario_id, atividade_id) VALUES (?, ?)', [userId, atvId]);
        await conn.commit();
        res.json({ message: 'Inscrito!' });
    } catch (e) { await conn.rollback(); res.status(400).json({ error: e.message }); }
    finally { conn.release(); }
});

// DELETE /sair
router.delete('/:id/sair', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM participantes WHERE usuario_id=? AND atividade_id=?', [req.userId, req.params.id]);
        res.json({ message: 'Saiu com sucesso.' });
    } catch (e) { res.status(500).json({ error: 'Erro ao sair.' }); }
});

// GET /participantes
router.get('/:id/participantes', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.nome, u.email 
             FROM participantes p JOIN usuarios u ON p.usuario_id = u.id 
             WHERE p.atividade_id = ? ORDER BY p.data_inscricao ASC`, [req.params.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

// GET /status
router.get('/:id/status', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM participantes WHERE usuario_id=? AND atividade_id=?', [req.userId, req.params.id]);
        res.json({ inscrito: rows.length > 0 });
    } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

module.exports = router;