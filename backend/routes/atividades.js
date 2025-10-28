const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM atividades ORDER BY data_hora DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { esporte, titulo, local, data_hora, vagas } = req.body;
  if (!esporte || !titulo || !local || !data_hora || !vagas)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

  const [result] = await pool.query(
    'INSERT INTO atividades (esporte, titulo, local, data_hora, vagas) VALUES (?, ?, ?, ?, ?)',
    [esporte, titulo, local, data_hora, vagas]
  );
  res.status(201).json({ id: result.insertId, message: 'Atividade criada' });
});

module.exports = router;
