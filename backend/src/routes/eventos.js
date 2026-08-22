'use strict';

const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const EVENTOS_VALIDOS = new Set([
  'page_view', 'scroll_50', 'scroll_90', 'click_whatsapp', 'click_phone',
  'start_form', 'form_step_1', 'form_step_2', 'form_step_3', 'form_step_4',
]);

router.post('/', async (req, res) => {
  const { evento, session_id, gclid, detalhe } = req.body || {};

  if (!EVENTOS_VALIDOS.has(evento)) {
    return res.status(400).json({ error: 'evento_invalido' });
  }

  try {
    await pool.query(
      `INSERT INTO eventos (session_id, evento, gclid, detalhe) VALUES ($1,$2,$3,$4)`,
      [session_id || null, evento, gclid || null, detalhe ? JSON.stringify(detalhe) : null]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[eventos] erro ao salvar evento', err);
    return res.status(500).json({ error: 'erro_interno' });
  }
});

module.exports = router;
