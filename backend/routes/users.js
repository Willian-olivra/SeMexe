const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Model de User
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

// Rota de Busca
router.get('/buscar', async (req, res) => {
    const termo = req.query.q;
    if (!termo || termo.length < 3) return res.json([]);

    try {
        // Busca com REGEX (insensitive case)
        const usuarios = await User.find({ 
            nome: { $regex: termo, $options: 'i' } 
        })
        .select('id nome email avatar')
        .limit(10);
        
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro na busca' });
    }
});

// Perfil Público
router.get('/:id', async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id).select('-senha'); // Exclui senha
        if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Registro
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha curta.' });

    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ error: 'Email já cadastrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            nome: name,
            email,
            senha: hashedPassword,
            avatar: 'fa-solid fa-user' // Valor padrão
        });

        await newUser.save();
        res.status(201).json({ message: 'Usuário cadastrado!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const isMatch = await bcrypt.compare(password, user.senha);
        if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login bem-sucedido!',
            token,
            user: { 
                id: user._id, 
                nome: user.nome, 
                email: user.email, 
                avatar: user.avatar 
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// Atualizar Perfil
router.put('/perfil', authMiddleware, async (req, res) => {
    const { nome, avatar } = req.body;
    try {
        await User.findByIdAndUpdate(req.user.id, { nome, avatar });
        res.json({ message: 'Perfil atualizado!', user: { nome, avatar } });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar.' });
    }
});

module.exports = router;