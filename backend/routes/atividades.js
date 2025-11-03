const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

/**
 * @route   GET /api/atividades
 * @desc    Lista todas as atividades (pública)
 */
router.get('/', async (req, res) => {
  console.log('📥 GET /api/atividades - Listando atividades');
  try {
    const { esporte } = req.query;
    
    let query = `
      SELECT a.*, u.nome as criador_nome 
      FROM atividades a 
      LEFT JOIN usuarios u ON a.id_usuario = u.id 
      WHERE a.data_hora >= NOW()
    `;
    
    const params = [];
    
    if (esporte && esporte !== 'Todos') {
      query += ' AND a.esporte = ?';
      params.push(esporte);
    }
    
    query += ' ORDER BY a.data_hora ASC';
    
    const [rows] = await pool.query(query, params);
    console.log(`✅ Encontradas ${rows.length} atividades`);
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Erro ao buscar atividades:', error);
    return res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

/**
 * @route   GET /api/atividades/minhas
 * @desc    Lista atividades do usuário logado (protegida)
 */
router.get('/minhas', authMiddleware, async (req, res) => {
  console.log(`📥 GET /api/atividades/minhas - Usuário: ${req.userId}`);
  try {
    const [rows] = await pool.query(
      'SELECT * FROM atividades WHERE id_usuario = ? ORDER BY data_hora DESC',
      [req.userId]
    );
    console.log(`✅ Encontradas ${rows.length} atividades do usuário`);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ Erro ao buscar minhas atividades:', error);
    return res.status(500).json({ error: 'Erro ao buscar suas atividades' });
  }
});

/**
 * @route   POST /api/atividades
 * @desc    Cria nova atividade (protegida)
 */
router.post('/', authMiddleware, async (req, res) => {
  console.log('📥 POST /api/atividades - Criar atividade');
  console.log('👤 Usuário ID:', req.userId);
  console.log('📦 Body recebido:', req.body);
  
  const { esporte, titulo, local, data_hora, vagas } = req.body;
  
  if (!esporte || !titulo || !local || !data_hora || !vagas) {
    console.log('❌ Campos obrigatórios faltando');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  if (vagas < 2) {
    console.log('❌ Número de vagas inválido:', vagas);
    return res.status(400).json({ error: 'O número de vagas deve ser no mínimo 2' });
  }

  try {
    console.log('💾 Inserindo no banco...');
    const [result] = await pool.query(
      'INSERT INTO atividades (esporte, titulo, local, data_hora, vagas, id_usuario) VALUES (?, ?, ?, ?, ?, ?)',
      [esporte, titulo, local, data_hora, vagas, req.userId]
    );
    
    console.log('✅ Atividade criada com ID:', result.insertId);
    
    return res.status(201).json({ 
      id: result.insertId, 
      message: 'Atividade criada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao criar atividade:', error);
    return res.status(500).json({ error: 'Erro ao criar atividade: ' + error.message });
  }
});

/**
 * @route   PUT /api/atividades/:id
 * @desc    Atualiza uma atividade (protegida)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`📥 PUT /api/atividades/${id} - Atualizar atividade`);
  console.log('📦 Body:', req.body);
  
  const { esporte, titulo, local, data_hora, vagas } = req.body;

  try {
    // Verifica se a atividade existe e pertence ao usuário
    const [atividade] = await pool.query(
      'SELECT * FROM atividades WHERE id = ? AND id_usuario = ?',
      [id, req.userId]
    );

    if (atividade.length === 0) {
      console.log('❌ Atividade não encontrada ou sem permissão');
      return res.status(404).json({ error: 'Atividade não encontrada ou você não tem permissão' });
    }

    console.log('💾 Atualizando atividade...');
    await pool.query(
      'UPDATE atividades SET esporte = ?, titulo = ?, local = ?, data_hora = ?, vagas = ? WHERE id = ?',
      [esporte, titulo, local, data_hora, vagas, id]
    );

    console.log('✅ Atividade atualizada');
    return res.status(200).json({ message: 'Atividade atualizada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao atualizar atividade:', error);
    return res.status(500).json({ error: 'Erro ao atualizar atividade' });
  }
});

/**
 * @route   DELETE /api/atividades/:id
 * @desc    Deleta uma atividade (protegida)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`📥 DELETE /api/atividades/${id} - Deletar atividade`);

  try {
    const [atividade] = await pool.query(
      'SELECT * FROM atividades WHERE id = ? AND id_usuario = ?',
      [id, req.userId]
    );

    if (atividade.length === 0) {
      console.log('❌ Atividade não encontrada ou sem permissão');
      return res.status(404).json({ error: 'Atividade não encontrada ou você não tem permissão' });
    }

    console.log('🗑️ Deletando atividade...');
    await pool.query('DELETE FROM atividades WHERE id = ?', [id]);
    
    console.log('✅ Atividade deletada');
    return res.status(200).json({ message: 'Atividade deletada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao deletar atividade:', error);
    return res.status(500).json({ error: 'Erro ao deletar atividade' });
  }
});

module.exports = router;