const express = require('express');
const router = express.Router();
const pool = require('../db'); // Sobe um nível para achar db.js
const bcrypt = require('bcryptjs'); // Importa o bcrypt

/**
 * @route   POST /api/users/register
 * @desc    Cadastra um novo usuário
 */
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        // 1. Verificar se o email já existe no banco
        const [existing] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (existing.length > 0) {
            // "Conflict" - O recurso (email) já existe
            return res.status(409).json({ error: 'Este email já está cadastrado.' });
        }

        // 2. Criptografar a senha (Hashing)
        const salt = await bcrypt.genSalt(10); // Gera um "tempero" para o hash
        const hashedPassword = await bcrypt.hash(password, salt); // Cria o hash seguro

        // 3. Salvar o novo usuário no banco com a senha criptografada
        const sql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
        await pool.query(sql, [name, email, hashedPassword]);

        // 201 = "Created"
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

/**
 * @route   POST /api/users/login
 * @desc    Autentica (faz login) um usuário
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

     if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        // 1. Tentar encontrar o usuário pelo email
        const [users] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (users.length === 0) {
            // Se não achar o email, envia erro "Unauthorized"
            // Nota: Usamos uma mensagem genérica por segurança
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const user = users[0];

        // 2. Comparar a senha enviada com a senha criptografada no banco
        const isMatch = await bcrypt.compare(password, user.senha);
        if (!isMatch) {
            // Se as senhas não baterem, envia o mesmo erro genérico
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // 3. Login bem-sucedido!
        // Enviamos os dados do usuário de volta (NUNCA envie a senha!)
        res.status(200).json({
            message: 'Login bem-sucedido!',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email
            }
        });

    } catch (error)
    {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;