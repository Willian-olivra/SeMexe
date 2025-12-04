const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth'); // Importante: ajusta o caminho se necessário

// Rota de Busca (para a barra de pesquisa)
router.get('/buscar', async (req, res) => {
    const termo = req.query.q;
    if (!termo || termo.length < 3) return res.json([]);

    try {
        const [usuarios] = await pool.query(
            'SELECT id, nome, email, avatar FROM usuarios WHERE nome LIKE ? LIMIT 10',
            [`%${termo}%`]
        );
        res.json(usuarios);
    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({ error: 'Erro interno na busca' });
    }
});

// Obter perfil público de um usuário por ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nome, email, avatar FROM usuarios WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Registro
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter min 6 caracteres.' });

    try {
        const [existing] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (existing.length > 0) return res.status(409).json({ error: 'Email já cadastrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Avatar padrão na criação
        const defaultAvatar = 'fa-solid fa-user';
        await pool.query("INSERT INTO usuarios (nome, email, senha, avatar) VALUES (?, ?, ?, ?)", [name, email, hashedPassword, defaultAvatar]);
        res.status(201).json({ message: 'Usuário cadastrado!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });

    try {
        const [users] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.senha);
        if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login bem-sucedido!',
            token,
            // Retorna o avatar junto com os dados do usuário
            user: { id: user.id, nome: user.nome, email: user.email, avatar: user.avatar || 'fa-solid fa-user' }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// NOVA ROTA: Atualizar Perfil (Nome e Avatar)
router.put('/perfil', authMiddleware, async (req, res) => {
    const { nome, avatar } = req.body;
    const userId = req.userId; // Vem do token (middleware)

    if (!nome || !avatar) {
        return res.status(400).json({ error: 'Nome e avatar são obrigatórios.' });
    }

    try {
        await pool.query(
            'UPDATE usuarios SET nome = ?, avatar = ? WHERE id = ?',
            [nome, avatar, userId]
        );

        res.json({ message: 'Perfil atualizado!', user: { nome, avatar } });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
    }
});

module.exports = router;