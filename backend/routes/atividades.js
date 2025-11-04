const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/atividades
 * Lista todas as atividades futuras com contagem de participantes
 */
router.get('/', async (req, res) => {
  try {
    const { esporte } = req.query;
    
    let query = `
      SELECT 
        a.*,
        u.nome as criador_nome,
        COUNT(p.id) as participantes_count,
        (a.vagas - COUNT(p.id)) as vagas_disponiveis
      FROM atividades a 
      LEFT JOIN usuarios u ON a.id_usuario = u.id
      LEFT JOIN participantes p ON a.id = p.atividade_id
      WHERE a.data_hora >= NOW()
    `;
    
    const params = [];
    
    if (esporte && esporte !== 'Todos') {
      query += ' AND a.esporte = ?';
      params.push(esporte);
    }
    
    query += ' GROUP BY a.id ORDER BY a.data_hora ASC';
    
    const [rows] = await pool.query(query, params);
    
    // Adiciona flag de lotação
    const atividades = rows.map(atividade => ({
      ...atividade,
      lotada: atividade.vagas_disponiveis <= 0
    }));
    
    res.status(200).json(atividades);
  } catch (error) {
    console.error('Erro ao listar atividades:', error);
    res.status(500).json({ error: 'Erro ao listar atividades' });
  }
});

/**
 * GET /api/atividades/minhas
 * Lista atividades criadas pelo usuário autenticado
 */
router.get('/minhas', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        a.*,
        COUNT(p.id) as participantes_count,
        (a.vagas - COUNT(p.id)) as vagas_disponiveis
       FROM atividades a
       LEFT JOIN participantes p ON a.id = p.atividade_id
       WHERE a.id_usuario = ?
       GROUP BY a.id
       ORDER BY a.data_hora DESC`,
      [req.userId]
    );
    
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ error: 'Erro ao buscar suas atividades' });
  }
});

/**
 * GET /api/atividades/:id
 * Busca uma atividade específica com detalhes
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(
      `SELECT 
        a.*,
        u.nome as criador_nome,
        u.email as criador_email,
        COUNT(p.id) as participantes_count,
        (a.vagas - COUNT(p.id)) as vagas_disponiveis
       FROM atividades a
       LEFT JOIN usuarios u ON a.id_usuario = u.id
       LEFT JOIN participantes p ON a.id = p.atividade_id
       WHERE a.id = ?
       GROUP BY a.id`,
      [id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }
    
    const atividade = {
      ...rows[0],
      lotada: rows[0].vagas_disponiveis <= 0
    };
    
    res.json(atividade);
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    res.status(500).json({ error: 'Erro ao buscar atividade' });
  }
});

/**
 * POST /api/atividades
 * Cria uma nova atividade (requer autenticação)
 */
router.post('/', authMiddleware, async (req, res) => {
  const { esporte, titulo, local, data_hora, vagas } = req.body;
  
  // Validações
  if (!esporte || !titulo || !local || !data_hora || !vagas) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  if (vagas < 2) {
    return res.status(400).json({ error: 'O número de vagas deve ser no mínimo 2' });
  }
  
  // Verifica se a data é futura
  const dataAtividade = new Date(data_hora);
  if (dataAtividade <= new Date()) {
    return res.status(400).json({ error: 'A data e hora devem ser no futuro' });
  }
  
  try {
    const [result] = await pool.query(
      'INSERT INTO atividades (esporte, titulo, local, data_hora, vagas, id_usuario) VALUES (?, ?, ?, ?, ?, ?)',
      [esporte, titulo, local, data_hora, vagas, req.userId]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Atividade criada com sucesso!' 
    });
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    res.status(500).json({ error: 'Erro ao criar atividade' });
  }
});

/**
 * PUT /api/atividades/:id
 * Atualiza uma atividade (apenas o criador pode atualizar)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { esporte, titulo, local, data_hora, vagas } = req.body;
  
  // Validações
  if (!esporte || !titulo || !local || !data_hora || !vagas) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  if (vagas < 2) {
    return res.status(400).json({ error: 'O número de vagas deve ser no mínimo 2' });
  }
  
  try {
    // Verifica se a atividade existe e pertence ao usuário
    const [atividade] = await pool.query(
      'SELECT * FROM atividades WHERE id = ? AND id_usuario = ?',
      [id, req.userId]
    );
    
    if (!atividade.length) {
      return res.status(404).json({ error: 'Atividade não encontrada ou sem permissão' });
    }
    
    // Verifica se o novo número de vagas é suficiente
    const [participantes] = await pool.query(
      'SELECT COUNT(*) as total FROM participantes WHERE atividade_id = ?',
      [id]
    );
    
    if (vagas < participantes[0].total) {
      return res.status(400).json({ 
        error: `Não é possível reduzir as vagas para ${vagas}. Já existem ${participantes[0].total} participantes inscritos.` 
      });
    }
    
    await pool.query(
      'UPDATE atividades SET esporte=?, titulo=?, local=?, data_hora=?, vagas=? WHERE id=?',
      [esporte, titulo, local, data_hora, vagas, id]
    );
    
    res.json({ message: 'Atividade atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({ error: 'Erro ao atualizar atividade' });
  }
});

/**
 * DELETE /api/atividades/:id
 * Deleta uma atividade (apenas o criador pode deletar)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [atividade] = await pool.query(
      'SELECT * FROM atividades WHERE id = ? AND id_usuario = ?',
      [id, req.userId]
    );
    
    if (!atividade.length) {
      return res.status(404).json({ error: 'Atividade não encontrada ou sem permissão' });
    }
    
    // O CASCADE no banco deletará automaticamente os participantes
    await pool.query('DELETE FROM atividades WHERE id = ?', [id]);
    
    res.json({ message: 'Atividade deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar atividade:', error);
    res.status(500).json({ error: 'Erro ao deletar atividade' });
  }
});

/**
 * POST /api/atividades/:id/participar
 * Inscreve o usuário em uma atividade
 */
router.post('/:id/participar', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const atividadeId = req.params.id;
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Verifica se a atividade existe
    const [atividades] = await connection.query(
      `SELECT 
        a.*,
        COUNT(p.id) as participantes_count
       FROM atividades a
       LEFT JOIN participantes p ON a.id = p.atividade_id
       WHERE a.id = ?
       GROUP BY a.id`,
      [atividadeId]
    );
    
    if (!atividades.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }
    
    const atividade = atividades[0];
    
    // Verifica se a atividade já passou
    if (new Date(atividade.data_hora) <= new Date()) {
      await connection.rollback();
      return res.status(400).json({ error: 'Esta atividade já ocorreu' });
    }
    
    // Verifica se o usuário é o criador
    if (atividade.id_usuario === userId) {
      await connection.rollback();
      return res.status(400).json({ error: 'Você não pode participar da sua própria atividade' });
    }
    
    // Verifica se há vagas disponíveis
    const vagasDisponiveis = atividade.vagas - atividade.participantes_count;
    if (vagasDisponiveis <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Esta atividade está lotada' });
    }
    
    // Verifica se já está inscrito
    const [exists] = await connection.query(
      'SELECT * FROM participantes WHERE usuario_id = ? AND atividade_id = ?',
      [userId, atividadeId]
    );
    
    if (exists.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Você já está inscrito nesta atividade' });
    }
    
    // Inscreve o usuário
    await connection.query(
      'INSERT INTO participantes (usuario_id, atividade_id) VALUES (?, ?)',
      [userId, atividadeId]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Inscrição confirmada!',
      vagas_restantes: vagasDisponiveis - 1
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao inscrever na atividade:', error);
    res.status(500).json({ error: 'Erro ao inscrever na atividade' });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/atividades/:id/sair
 * Remove inscrição do usuário em uma atividade
 */
router.delete('/:id/sair', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const atividadeId = req.params.id;
  
  try {
    const [participante] = await pool.query(
      'SELECT * FROM participantes WHERE usuario_id = ? AND atividade_id = ?',
      [userId, atividadeId]
    );
    
    if (!participante.length) {
      return res.status(404).json({ error: 'Você não está inscrito nesta atividade' });
    }
    
    await pool.query(
      'DELETE FROM participantes WHERE usuario_id = ? AND atividade_id = ?',
      [userId, atividadeId]
    );
    
    res.json({ message: 'Inscrição cancelada com sucesso!' });
  } catch (error) {
    console.error('Erro ao cancelar inscrição:', error);
    res.status(500).json({ error: 'Erro ao cancelar inscrição' });
  }
});

/**
 * GET /api/atividades/:id/participantes
 * Lista participantes de uma atividade
 */
router.get('/:id/participantes', async (req, res) => {
  try {
    const [participantes] = await pool.query(
      `SELECT 
        u.id,
        u.nome,
        p.data_inscricao
       FROM participantes p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.atividade_id = ?
       ORDER BY p.data_inscricao ASC`,
      [req.params.id]
    );
    
    res.json(participantes);
  } catch (error) {
    console.error('Erro ao listar participantes:', error);
    res.status(500).json({ error: 'Erro ao listar participantes' });
  }
});

/**
 * GET /api/atividades/:id/status
 * Verifica status de inscrição do usuário na atividade
 */
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const [inscrito] = await pool.query(
      'SELECT * FROM participantes WHERE usuario_id = ? AND atividade_id = ?',
      [req.userId, req.params.id]
    );
    
    res.json({ inscrito: inscrito.length > 0 });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

module.exports = router;