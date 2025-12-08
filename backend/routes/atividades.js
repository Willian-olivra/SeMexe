const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Atividade = require('../models/Atividade');

// Middleware de Autenticação
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo_padrao');
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// GET /api/atividades (Listar Todas)
router.get('/', async (req, res) => {
    try {
        // Traz as atividades (mesmo as do passado para teste)
        const atividades = await Atividade.find() 
        .populate('id_usuario', 'nome email') 
        .sort({ data_hora: 1 });

        const resultado = atividades.map(atv => {
            // CORREÇÃO CRÍTICA: Verifica se o usuário existe antes de tentar ler o nome
            // Isso evita o crash do servidor se o usuário foi deletado
            const nomeCriador = atv.id_usuario ? atv.id_usuario.nome : 'Usuário Desconhecido';

            return {
                _id: atv._id,
                titulo: atv.titulo,
                esporte: atv.esporte,
                local: atv.local,
                data_hora: atv.data_hora,
                vagas: atv.vagas,
                vagas_disponiveis: atv.vagas - (atv.participantes ? atv.participantes.length : 0),    
                lotada: (atv.vagas - (atv.participantes ? atv.participantes.length : 0)) <= 0,
                criador: nomeCriador
            };
        });

        res.json(resultado);
    } catch (error) {
        console.error("ERRO AO LISTAR:", error); // Log detalhado
        res.status(500).json({ error: 'Erro ao listar atividades.' });
    }
});

// POST /api/atividades (Criar)
router.post('/', authMiddleware, async (req, res) => {
    console.log("--- CRIANDO ATIVIDADE ---");
    console.log("Dados:", req.body);
    
    const { esporte, titulo, local, data_hora, vagas } = req.body;
    
    // Validação básica
    if (!esporte || !titulo || !local || !data_hora || !vagas) 
        return res.status(400).json({ error: 'Preencha todos os campos.' });

    // Validação de formato de data
    const dataObj = new Date(data_hora);
    if (isNaN(dataObj.getTime())) {
        return res.status(400).json({ error: 'Data inválida.' });
    }

    // --- COMENTADO PARA EVITAR ERRO DE FUSO HORÁRIO EM DESENVOLVIMENTO ---
    // if (dataObj <= new Date()) {
    //    return res.status(400).json({ error: 'Data deve ser no futuro.' });
    // }
    // ---------------------------------------------------------------------

    try {
        const novaAtividade = await Atividade.create({
            id_usuario: req.userId,
            esporte,
            titulo,
            local,
            data_hora,
            vagas,
            participantes: [] 
        });

        console.log("Atividade Criada ID:", novaAtividade._id);
        res.status(201).json({ message: 'Atividade criada!', atividade: novaAtividade });
    } catch (error) {
        console.error("ERRO AO CRIAR:", error);
        res.status(500).json({ error: 'Erro ao criar atividade.' });
    }
});

module.exports = router;