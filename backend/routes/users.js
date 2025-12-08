// Arquivo: routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importamos o Modelo, não o DB direto

// Rota de Busca (para a barra de pesquisa)
router.get('/buscar', async (req, res) => {
    const termo = req.query.q;
    if (!termo || termo.length < 3) return res.json([]);

    try {
        // Busca usuários onde o nome contém o termo (regex 'i' = case insensitive)
        const usuarios = await User.find({ 
            nome: { $regex: termo, $options: 'i' } 
        }).select('id nome email').limit(10);
        
        res.json(usuarios);
    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({ error: 'Erro interno na busca' });
    }
});

// Perfil Público por ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('id nome email');
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Registro (Cadastro)
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body; // Atenção: no seu app mobile você usa 'name' ou 'nome'? Mantive 'name' como estava no seu código original
    
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter min 6 caracteres.' });

    try {
        // 1. Verifica se já existe
        if (await User.findOne({ email })) {
            return res.status(400).json({ error: 'Email já cadastrado.' });
        }

        // 2. Criptografa senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Cria usuário no MongoDB
        const user = await User.create({
            nome: name,
            email,
            senha: hashedPassword
        });

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', userId: user._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no cadastro.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });

    try {
        // 1. Busca usuário e pede a senha (+senha)
        const user = await User.findOne({ email }).select('+senha');
        
        if (!user) return res.status(400).json({ error: 'Credenciais inválidas.' });

        // 2. Compara senhas
        const isMatch = await bcrypt.compare(password, user.senha);
        if (!isMatch) return res.status(400).json({ error: 'Credenciais inválidas.' });

        // 3. Gera Token
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            process.env.JWT_SECRET || 'segredo_padrao', // Use .env em produção!
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login bem-sucedido!',
            token,
            user: { id: user._id, nome: user.nome, email: user.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no login.' });
    }
});

module.exports = router;