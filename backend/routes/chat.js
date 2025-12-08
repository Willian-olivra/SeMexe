const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Seu middleware de autenticação (JWT)
const Mensagem = require('../models/Message');
const User = require('../models/User'); // Seu model de usuário

// 1. Rota para Buscar Histórico de Conversa
// GET /api/chat/historico/:amigoId
router.get('/historico/:amigoId', auth, async (req, res) => {
    try {
        const meuId = req.user.id;
        const amigoId = req.params.amigoId;

        // Busca mensagens onde (Eu mandei E ele recebeu) OU (Ele mandou E eu recebi)
        const mensagens = await Mensagem.find({
            $or: [
                { remetente: meuId, destinatario: amigoId },
                { remetente: amigoId, destinatario: meuId }
            ]
        })
        .sort({ data_envio: 1 }) // Ordena das mais antigas para as mais novas
        .populate('remetente', 'nome avatar'); // Traz o nome de quem mandou

        res.json(mensagens);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao carregar mensagens' });
    }
});

// 2. Rota para Salvar Mensagem (Via API)
// POST /api/chat/enviar
router.post('/enviar', auth, async (req, res) => {
    try {
        const { destinatarioId, texto } = req.body;

        if (!texto || !destinatarioId) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        // Cria a nova mensagem no Banco
        const novaMensagem = await Mensagem.create({
            remetente: req.user.id,
            destinatario: destinatarioId,
            texto: texto,
            data_envio: new Date()
        });

        // Retorna a mensagem salva para o frontend confirmar
        res.status(201).json(novaMensagem);

    } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

module.exports = router;