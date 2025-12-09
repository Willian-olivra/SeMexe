const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Fairplay = require('../models/Fairplay');
const User = require('../models/User');
const Activity = require('../models/Activity');

// POST /api/fairplay - Criar uma avaliação
router.post('/', auth, async (req, res) => {
    const { avaliadoId, atividadeId, compareceu, respeito, jogoLimpo, comentario } = req.body;
    const avaliadorId = req.user.id;

    try {
        if (avaliadorId === avaliadoId) {
            return res.status(400).json({ error: 'Você não pode se avaliar.' });
        }

        // 1. Verifica se a atividade existe e já passou
        const atividade = await Activity.findById(atividadeId);
        if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada.' });
        
        // Verifica se a data da atividade é anterior a "agora" (passado)
        if (new Date(atividade.data_hora) > new Date()) {
            return res.status(400).json({ error: 'Você só pode avaliar após o término da atividade.' });
        }

        // 2. Verifica se ambos participaram (segurança básica)
        const avaliadorParticipou = atividade.participantes.includes(avaliadorId) || atividade.criador.toString() === avaliadorId;
        const avaliadoParticipou = atividade.participantes.includes(avaliadoId) || atividade.criador.toString() === avaliadoId;

        if (!avaliadorParticipou || !avaliadoParticipou) {
            return res.status(400).json({ error: 'Ambos devem ter participado da atividade.' });
        }

        // 3. Salva a avaliação
        const novaAvaliacao = new Fairplay({
            avaliador: avaliadorId,
            avaliado: avaliadoId,
            atividade: atividadeId,
            compareceu,
            respeito,
            jogoLimpo,
            comentario
        });
        await novaAvaliacao.save();

        // 4. Recalcula a nota do usuário avaliado
        const usuarioAvaliado = await User.findById(avaliadoId);
        
        if (!compareceu) {
            // Se não compareceu, aumenta contador de faltas
            usuarioAvaliado.faltas += 1;
        } else {
            // Se compareceu, calcula média das notas (Respeito + Jogo Limpo) / 2
            const notaAtual = (respeito + jogoLimpo) / 2;
            
            // Fórmula da média ponderada cumulativa
            const totalPontosAntigo = usuarioAvaliado.fairplayNota * usuarioAvaliado.fairplayQtd;
            const novaQtd = usuarioAvaliado.fairplayQtd + 1;
            const novaMedia = (totalPontosAntigo + notaAtual) / novaQtd;

            usuarioAvaliado.fairplayNota = parseFloat(novaMedia.toFixed(2));
            usuarioAvaliado.fairplayQtd = novaQtd;
        }

        await usuarioAvaliado.save();

        res.status(201).json({ message: 'Avaliação enviada com sucesso!' });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Você já avaliou este usuário nesta atividade.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar avaliação.' });
    }
});
// Retorna os IDs dos usuários que EU já avaliei nesta atividade
router.get('/status/:atividadeId', auth, async (req, res) => {
    try {
        // Busca todas as avaliações que EU fiz nesta atividade
        const avaliacoes = await Fairplay.find({
            avaliador: req.user.id,
            atividade: req.params.atividadeId
        }).select('avaliado');

        // Retorna apenas um array com os IDs dos avaliados. Ex: ["ID_DO_JOAO", "ID_DA_MARIA"]
        const avaliadosIds = avaliacoes.map(a => a.avaliado.toString());
        res.json(avaliadosIds);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar status.' });
    }
});

module.exports = router;