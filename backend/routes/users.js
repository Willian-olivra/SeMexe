const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Nativo do Node.js
const authMiddleware = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

// REGEX PARA SENHA FORTE:
// Mínimo 6 chars, 1 maiúscula, 1 número e 1 símbolo especial
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

// Rota de Busca (Mantida igual)
router.get('/buscar', async (req, res) => {
    const termo = req.query.q;
    if (!termo || termo.length < 3) return res.json([]);
    try {
        const usuarios = await User.find({ 
            nome: { $regex: termo, $options: 'i' } 
        }).select('id nome email avatar').limit(10);
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro na busca' });
    }
});

// Perfil Público (Mantido igual)
router.get('/:id', async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id).select('-senha');
        if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// --- REGISTRO (ATUALIZADO COM SENHA FORTE) ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });

    // Validação de Senha Forte
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            error: 'Senha fraca! Use pelo menos: 1 maiúscula, 1 número e 1 símbolo (@$!%*?&).' 
        });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ error: 'Email já cadastrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            nome: name,
            email,
            senha: hashedPassword,
            avatar: 'fa-solid fa-user'
        });

        await newUser.save();
        res.status(201).json({ message: 'Usuário cadastrado!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// Login (Mantido igual)
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
            user: { id: user._id, nome: user.nome, email: user.email, avatar: user.avatar }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// Atualizar Perfil (Mantido igual)
router.put('/perfil', authMiddleware, async (req, res) => {
    const { nome, avatar } = req.body;
    try {
        await User.findByIdAndUpdate(req.user.id, { nome, avatar });
        res.json({ message: 'Perfil atualizado!', user: { nome, avatar } });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar.' });
    }
});

// --- NOVAS ROTAS: RECUPERAÇÃO DE SENHA ---

// 1. Esqueci a Senha
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'Email não encontrado.' });

        // Gera token
        const resetToken = crypto.randomBytes(20).toString('hex');
        
        // Hash do token para salvar no banco (segurança extra)
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Salva no banco (token + expiração de 1 hora)
        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        // Link que vai no email (aponta para o seu HTML)
        const resetUrl = `${process.env.FRONTEND_URL}/redefinirSenha.html?token=${resetToken}`;

        const message = `
            <h1>Recuperação de Senha</h1>
            <p>Você solicitou a troca de senha no Se Mexe.</p>
            <p>Clique no link abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" style="background:#00E5FF; color:black; padding:10px; border-radius:5px; text-decoration:none; font-weight:bold;">Redefinir Senha</a>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Se Mexe - Recuperação de Senha',
                message
            });
            res.json({ message: 'Email enviado!' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ error: 'Erro ao enviar email.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// 2. Redefinir Senha (Reset)
router.post('/reset-password/:token', async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() } // Verifica se não expirou
        });

        if (!user) return res.status(400).json({ error: 'Token inválido ou expirado.' });

        const { password } = req.body;
        
        // Valida força da senha de novo
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Senha fraca! Use maiúscula, número e símbolo.' });
        }

        // Criptografa nova senha
        const salt = await bcrypt.genSalt(10);
        user.senha = await bcrypt.hash(password, salt);

        // Limpa tokens
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
});

module.exports = router;