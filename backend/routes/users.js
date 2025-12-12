const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

// --- BUSCA DE USUÁRIOS ---
router.get('/buscar', async (req, res) => {
    const termo = req.query.q;
    if (!termo || termo.length < 3) return res.json([]);
    try {
        const usuarios = await User.find({ 
            nome: { $regex: termo, $options: 'i' } 
        }).select('id nome email avatar').limit(10);
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Erro na busca' });
    }
});

// --- MEU PERFIL ---
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-senha -twoFactorCode');
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar perfil.' });
    }
});

// --- PERFIL PÚBLICO ---
router.get('/:id', async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id).select('-senha -twoFactorCode');
        if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// --- REGISTRO ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios.' });

    // Senha Forte
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: 'Senha fraca: use Maiúscula, Número e Símbolo.' });
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
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// --- LOGIN (PASSO 1: SENHA + ENVIO DE CÓDIGO) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const isMatch = await bcrypt.compare(password, user.senha);
        if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas.' });

        // --- GERA CÓDIGO 2FA ---
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos

        user.twoFactorCode = code;
        user.twoFactorExpires = Date.now() + 600000; // Valido por 10 min
        await user.save();

        const message = `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                <h1>Código de Verificação</h1>
                <p>Seu código para acessar o Se Mexe é:</p>
                <div style="background: #000; color: #00E5FF; font-size: 32px; letter-spacing: 5px; padding: 20px; border-radius: 10px; display: inline-block; margin: 10px 0;">
                    <b>${code}</b>
                </div>
                <p>Este código expira em 10 minutos.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Se Mexe - Código de Acesso',
                message
            });

            // Responde para o Frontend que precisa do código
            res.json({ 
                require2FA: true, 
                email: user.email,
                message: 'Código enviado para o e-mail!' 
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao enviar e-mail de código.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// --- LOGIN (PASSO 2: VALIDAR CÓDIGO) ---
router.post('/login/verify', async (req, res) => {
    const { email, code } = req.body;

    try {
        const user = await User.findOne({ 
            email, 
            twoFactorCode: code,
            twoFactorExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ error: 'Código inválido ou expirado.' });
        }

        // Limpa o código usado
        user.twoFactorCode = undefined;
        user.twoFactorExpires = undefined;
        await user.save();

        // Gera o Token JWT Final
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login aprovado!',
            token,
            user: { id: user._id, nome: user.nome, email: user.email, avatar: user.avatar }
        });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar código.' });
    }
});

router.put('/me', authMiddleware, async (req, res) => {
    // Adicione os novos campos na desestruturação
    const { nome, avatar, bio, cidade, instagram, esportes } = req.body;
    
    try {
        const updateData = { nome };
        
        // Só atualiza se o usuário enviou (para não apagar dados sem querer)
        if (avatar) updateData.avatar = avatar;
        if (bio !== undefined) updateData.bio = bio;
        if (cidade !== undefined) updateData.cidade = cidade;
        if (instagram !== undefined) updateData.instagram = instagram;
        if (esportes !== undefined) updateData.esportes = esportes;

        await User.findByIdAndUpdate(req.user.id, updateData);
        
        // Retorna o usuário atualizado
        const userAtualizado = await User.findById(req.user.id).select('-senha -twoFactorCode');
        res.json({ message: 'Perfil atualizado!', user: userAtualizado });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar.' });
    }
});

// --- ESQUECI MINHA SENHA ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'Email não encontrado.' });

        const resetToken = crypto.randomBytes(20).toString('hex');
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/redefinirSenha.html?token=${resetToken}`;

        const message = `
            <p>Clique no link para redefinir sua senha:</p>
            <a href="${resetUrl}">Redefinir Senha</a>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Se Mexe - Recuperar Senha',
            message
        });
        res.json({ message: 'Email enviado!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// --- REDEFINIR SENHA ---
router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: 'Token inválido.' });

        const { password } = req.body;
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Senha fraca.' });

        const salt = await bcrypt.genSalt(10);
        user.senha = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Senha alterada!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
});

module.exports = router;