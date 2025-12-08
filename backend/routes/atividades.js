const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const Friendship = require('../models/Friendship');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken'); // Para decodificar token manualmente na rota pública

// Listar atividades de um usuário específico (Perfil Público)
router.get('/usuario/:id', async (req, res) => {
    try {
        const atividades = await Activity.find({
            criador: req.params.id,
            visibilidade: 'public'
        }).sort({ data_hora: -1 });

        // Mapeia para adicionar campos calculados
        const resposta = atividades.map(a => {
            const participantesCount = a.participantes ? a.participantes.length : 0;
            return {
                ...a.toObject(),
                participantes_count: participantesCount,
                vagas_disponiveis: a.vagas - participantesCount,
                lotada: (a.vagas - participantesCount) <= 0
            };
        });

        res.json(resposta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar atividades.' });
    }
});

// GET /api/atividades (Listar Todas com lógica de amigos)
router.get('/', async (req, res) => {
    try {
        const { esporte } = req.query;
        let userId = null;
        
        // Tenta pegar o ID se tiver token (sem forçar erro se não tiver)
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try { userId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; } catch (e) {}
        }

        let filtro = { data_hora: { $gte: new Date() } }; // Apenas datas futuras

        if (esporte && esporte !== 'Todos') {
            filtro.esporte = esporte;
        }

        if (userId) {
            // Lógica complexa de visibilidade:
            // 1. Achar IDs dos amigos
            const amizades = await Friendship.find({
                $or: [{ requester: userId }, { recipient: userId }],
                status: 'aceito'
            });
            
            const idsAmigos = amizades.map(a => 
                a.requester.toString() === userId ? a.recipient : a.requester
            );

            // 2. Query: (Públicas) OU (Minhas) OU (De amigos)
            filtro.$or = [
                { visibilidade: 'public' },
                { criador: userId },
                { criador: { $in: idsAmigos } }
            ];
        } else {
            // Se não logado, apenas públicas
            filtro.visibilidade = 'public';
        }

        const atividades = await Activity.find(filtro)
            .populate('criador', 'nome') // Popula nome do criador
            .sort({ data_hora: 1 });

        const resposta = atividades.map(a => {
            const pCount = a.participantes.length;
            return {
                ...a.toObject(),
                criador_nome: a.criador.nome, // Ajuste para bater com o front
                participantes_count: pCount,
                vagas_disponiveis: a.vagas - pCount,
                lotada: (a.vagas - pCount) <= 0
            };
        });

        res.json(resposta);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar.' });
    }
});

// GET /api/atividades/minhas
router.get('/minhas', authMiddleware, async (req, res) => {
    try {
        const atividades = await Activity.find({ criador: req.user.id })
            .sort({ data_hora: -1 });
        
        const resposta = atividades.map(a => ({
            ...a.toObject(),
            participantes_count: a.participantes.length,
            vagas_disponiveis: a.vagas - a.participantes.length
        }));
        res.json(resposta);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar.' }); }
});

// GET /api/atividades/:id
router.get('/:id', async (req, res) => {
    try {
        const atividade = await Activity.findById(req.params.id).populate('criador', 'nome email');
        
        if (!atividade) return res.status(404).json({ error: 'Não encontrada' });
        
        const pCount = atividade.participantes.length;
        res.json({
            ...atividade.toObject(),
            criador_nome: atividade.criador.nome,
            criador_email: atividade.criador.email,
            participantes_count: pCount,
            vagas_disponiveis: atividade.vagas - pCount,
            lotada: (atividade.vagas - pCount) <= 0
        });
    } catch (error) { res.status(500).json({ error: 'Erro.' }); }
});

// POST /api/atividades (Criar)
router.post('/', authMiddleware, async (req, res) => {
    const { esporte, titulo, local, data_hora, vagas, visibilidade } = req.body;
    // Validações básicas...
    if (!esporte || !titulo || !data_hora || !vagas) return res.status(400).json({ error: 'Preencha tudo.' });

    try {
        const novaAtividade = new Activity({
            criador: req.user.id,
            esporte,
            titulo,
            local,
            data_hora,
            vagas,
            visibilidade: visibilidade || 'public',
            participantes: [] // Começa vazio
        });

        const salva = await novaAtividade.save();
        // Mongo retorna _id, mas front pode esperar id. O json normal do mongoose manda _id.
        res.status(201).json({ id: salva._id, message: 'Criada com sucesso!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao criar.' }); }
});

// PUT e DELETE (Simplificados)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const atividade = await Activity.findOneAndUpdate(
            { _id: req.params.id, criador: req.user.id }, // Só o dono altera
            req.body,
            { new: true } // Retorna o novo
        );
        if (!atividade) return res.status(404).json({ error: 'Não encontrada ou sem permissão.' });
        res.json({ message: 'Atualizada!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao atualizar.' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletada = await Activity.findOneAndDelete({ _id: req.params.id, criador: req.user.id });
        if (!deletada) return res.status(404).json({ error: 'Erro ou sem permissão.' });
        res.json({ message: 'Deletada!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao deletar.' }); }
});

// POST /participar (Lógica do Array)
router.post('/:id/participar', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const atividade = await Activity.findById(req.params.id);
        if (!atividade) return res.status(404).json({ error: 'Não encontrada' });

        if (atividade.criador.toString() === userId) return res.status(400).json({ error: 'Você é o dono' });
        if (atividade.participantes.includes(userId)) return res.status(400).json({ error: 'Já inscrito' });
        if (atividade.participantes.length >= atividade.vagas) return res.status(400).json({ error: 'Lotada' });

        atividade.participantes.push(userId);
        await atividade.save();

        res.json({ message: 'Inscrito!' });
    } catch (e) { res.status(500).json({ error: 'Erro ao participar.' }); }
});

// DELETE /sair
router.delete('/:id/sair', authMiddleware, async (req, res) => {
    try {
        await Activity.findByIdAndUpdate(req.params.id, {
            $pull: { participantes: req.user.id } // $pull remove item do array
        });
        res.json({ message: 'Saiu com sucesso.' });
    } catch (e) { res.status(500).json({ error: 'Erro ao sair.' }); }
});

// GET /participantes (Populate)
router.get('/:id/participantes', async (req, res) => {
    try {
        const atividade = await Activity.findById(req.params.id).populate('participantes', 'id nome email avatar');
        if (!atividade) return res.status(404).json({ error: 'Não encontrada' });
        res.json(atividade.participantes);
    } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

// GET /status
router.get('/:id/status', authMiddleware, async (req, res) => {
    try {
        const atividade = await Activity.findById(req.params.id);
        const inscrito = atividade && atividade.participantes.includes(req.user.id);
        res.json({ inscrito });
    } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

module.exports = router;