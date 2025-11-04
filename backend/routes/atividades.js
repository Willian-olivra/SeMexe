const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { esporte } = req.query;
    let query = `SELECT a.*, u.nome as criador_nome FROM atividades a LEFT JOIN usuarios u ON a.id_usuario = u.id WHERE a.data_hora >= NOW()`;
    const params = [];
    if (esporte && esporte !== 'Todos') {
      query += ' AND a.esporte = ?';
      params.push(esporte);
    }
    query += ' ORDER BY a.data_hora ASC';
    const [rows] = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar atividades' });
  }
});

router.get('/minhas', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM atividades WHERE id_usuario = ? ORDER BY data_hora DESC', [req.userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar suas atividades' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { esporte, titulo, local, data_hora, vagas } = req.body;
  if (!esporte || !titulo || !local || !data_hora || !vagas)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  try {
    const [result] = await pool.query(
      'INSERT INTO atividades (esporte, titulo, local, data_hora, vagas, id_usuario) VALUES (?, ?, ?, ?, ?, ?)',
      [esporte, titulo, local, data_hora, vagas, req.userId]
    );
    res.status(201).json({ id: result.insertId, message: 'Atividade criada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar atividade' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { esporte, titulo, local, data_hora, vagas } = req.body;
  try {
    const [atividade] = await pool.query('SELECT * FROM atividades WHERE id = ? AND id_usuario = ?', [id, req.userId]);
    if (!atividade.length) return res.status(404).json({ error: 'Atividade não encontrada ou sem permissão' });
    await pool.query('UPDATE atividades SET esporte=?, titulo=?, local=?, data_hora=?, vagas=? WHERE id=?', [esporte, titulo, local, data_hora, vagas, id]);
    res.json({ message: 'Atividade atualizada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar atividade' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const [atividade] = await pool.query('SELECT * FROM atividades WHERE id = ? AND id_usuario = ?', [id, req.userId]);
    if (!atividade.length) return res.status(404).json({ error: 'Atividade não encontrada ou sem permissão' });
    await pool.query('DELETE FROM atividades WHERE id = ?', [id]);
    res.json({ message: 'Atividade deletada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar atividade' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM atividades WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Atividade não encontrada' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar atividade' });
  }
});

router.post('/:id/participar', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const atividadeId = req.params.id;
    const [exists] = await pool.query('SELECT * FROM participantes WHERE usuario_id = ? AND atividade_id = ?', [userId, atividadeId]);
    if (exists.length > 0) return res.status(400).json({ message: 'Você já está inscrito nesta atividade' });
    await pool.query('INSERT INTO participantes (usuario_id, atividade_id) VALUES (?, ?)', [userId, atividadeId]);
    res.json({ message: 'Inscrição confirmada!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao inscrever na atividade' });
  }
});

module.exports = router;
