const express = require('express');
const router = express.Router();
const Friendship = require('../models/Friendship'); // Model de Amizade
const User = require('../models/User'); // Model de Usuário
const authMiddleware = require('../middleware/auth'); // Seu middleware

// 1. Enviar Solicitação
router.post('/solicitar', authMiddleware, async (req, res) => {
    const { amigoId } = req.body;
    const meuId = req.user.id; // No Mongo isso geralmente é _id

    if (meuId === amigoId) {
        return res.status(400).json({ error: 'Você não pode adicionar a si mesmo.' });
    }

    try {
        // Verifica se já existe qualquer relação entre os dois
        const existe = await Friendship.findOne({
            $or: [
                { requester: meuId, recipient: amigoId },
                { requester: amigoId, recipient: meuId }
            ]
        });

        if (existe) {
            return res.status(400).json({ error: 'Solicitação já enviada ou vocês já são amigos.' });
        }

        const novaAmizade = new Friendship({
            requester: meuId,
            recipient: amigoId,
            status: 'pendente'
        });

        await novaAmizade.save();
        res.json({ message: 'Solicitação de amizade enviada!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar amigo.' });
    }
});

// 2. Verificar Status da Amizade
router.get('/check/:id', authMiddleware, async (req, res) => {
    const amigoId = req.params.id;
    const meuId = req.user.id;

    try {
        const relacao = await Friendship.findOne({
            $or: [
                { requester: meuId, recipient: amigoId },
                { requester: amigoId, recipient: meuId }
            ]
        });

        if (!relacao) {
            return res.json({ status: 'nenhum' });
        }

        let statusFinal = relacao.status;

        if (relacao.status === 'pendente') {
            // Verifica quem enviou para dizer se foi "enviado" ou "recebido"
            statusFinal = (relacao.requester.toString() === meuId) ? 'enviado' : 'recebido';
        }

        res.json({ status: statusFinal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar amizade.' });
    }
});

// 3. Listar Meus Amigos (Aceitos)
router.get('/', authMiddleware, async (req, res) => {
    const meuId = req.user.id;
    try {
        // Busca amizades aceitas onde sou requester OU recipient
        const amizades = await Friendship.find({
            $or: [{ requester: meuId }, { recipient: meuId }],
            status: 'aceito'
        }).populate('requester recipient', 'nome email avatar'); // Popula os dados dos usuários

        // Formata o array para retornar apenas o "outro" usuário
        const listaAmigos = amizades.map(a => {
            const ehRequester = a.requester._id.toString() === meuId;
            return ehRequester ? a.recipient : a.requester;
        });

        res.json(listaAmigos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar amigos.' });
    }
});

// 4. Listar Solicitações Pendentes (Recebidas)
router.get('/pendentes', authMiddleware, async (req, res) => {
    const meuId = req.user.id;
    try {
        // Busca onde SOU o RECIPIENT (quem recebeu) e status é pendente
        const pendentes = await Friendship.find({
            recipient: meuId,
            status: 'pendente'
        }).populate('requester', 'nome email avatar');

        // Retorna apenas os dados de quem enviou (requester)
        const lista = pendentes.map(p => p.requester);
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar solicitações.' });
    }
});

// 5. Responder Solicitação
router.post('/responder', authMiddleware, async (req, res) => {
    const { amigoId, acao } = req.body;
    const meuId = req.user.id;

    if (!['aceitar', 'recusar'].includes(acao)) return res.status(400).json({ error: 'Ação inválida.' });

    try {
        // Busca a solicitação específica onde EU sou o destinatário
        const solicitacao = await Friendship.findOne({
            requester: amigoId,
            recipient: meuId,
            status: 'pendente'
        });

        if (!solicitacao) return res.status(404).json({ error: 'Solicitação não encontrada.' });

        if (acao === 'aceitar') {
            solicitacao.status = 'aceito';
            await solicitacao.save();
            res.json({ message: 'Agora vocês são amigos!' });
        } else {
            await Friendship.findByIdAndDelete(solicitacao._id);
            res.json({ message: 'Solicitação recusada.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao responder solicitação.' });
    }
});

// 6. Excluir Amigo
router.delete('/:id', authMiddleware, async (req, res) => {
    const amigoId = req.params.id;
    const meuId = req.user.id;

    try {
        const resultado = await Friendship.findOneAndDelete({
            $or: [
                { requester: meuId, recipient: amigoId },
                { requester: amigoId, recipient: meuId }
            ]
        });

        if (resultado) {
            res.json({ message: 'Amigo removido com sucesso.' });
        } else {
            res.status(404).json({ error: 'Amizade não encontrada.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover amigo.' });
    }
});

module.exports = router;