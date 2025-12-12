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
const Activity = require('../models/Activity'); // Importe o Activity no topo

// 3. Buscar Histórico da Atividade
// GET /api/chat/atividade/:id
router.get('/atividade/:id', auth, async (req, res) => {
    try {
        const atividadeId = req.params.id;
        
        // Verifica se atividade existe para calcular expiração
        const atividade = await Activity.findById(atividadeId);
        if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

        // Calcula expiração (Data da atividade + 24h)
        const dataLimite = new Date(atividade.data_hora);
        dataLimite.setHours(dataLimite.getHours() + 24);
        
        const expirado = new Date() > dataLimite;

        const mensagens = await Mensagem.find({ atividade: atividadeId })
            .sort({ data_envio: 1 })
            .populate('remetente', 'nome avatar');

        res.json({ 
            mensagens, 
            expirado,
            data_limite: dataLimite 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar chat.' });
    }
});

// 4. Enviar Mensagem na Atividade
// POST /api/chat/atividade/enviar
router.post('/atividade/enviar', auth, async (req, res) => {
    try {
        const { atividadeId, texto } = req.body;

        const atividade = await Activity.findById(atividadeId);
        if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

        // --- VALIDAÇÃO DE 24 HORAS ---
        const dataLimite = new Date(atividade.data_hora);
        dataLimite.setHours(dataLimite.getHours() + 24);

        if (new Date() > dataLimite) {
            return res.status(403).json({ error: 'Chat encerrado (prazo de 24h expirou).' });
        }

        const novaMensagem = await Mensagem.create({
            remetente: req.user.id,
            atividade: atividadeId, // Salva o ID da atividade
            destinatario: null,     // É grupo, não tem destinatário único
            texto
        });

        // Popula para retornar bonito pro front
        await novaMensagem.populate('remetente', 'nome avatar');

        res.status(201).json(novaMensagem);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao enviar.' });
    }
});

router.post('/privada', auth, async (req, res) => {
    try {
        const { destinatarioId, texto } = req.body;

        if (!destinatarioId || !texto) {
            return res.status(400).json({ error: 'Dados incompletos.' });
        }

        // Verifica se destinatário existe
        const destinatario = await User.findById(destinatarioId);
        if (!destinatario) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const novaMensagem = await Mensagem.create({
            remetente: req.user.id,
            destinatario: destinatarioId,
            texto: texto,
            data_envio: new Date()
        });

        await novaMensagem.populate('remetente', 'nome avatar');

        res.status(201).json(novaMensagem);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
});

module.exports = router;