'use strict';

const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const leadsRouter = require('./routes/leads');
const eventosRouter = require('./routes/eventos');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'ok' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'unreachable' });
  }
});

app.use('/api/leads', leadsRouter);
app.use('/api/eventos', eventosRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'nao_encontrado' });
});

app.use((err, req, res, next) => {
  console.error('[server] erro não tratado', err);
  res.status(500).json({ error: 'erro_interno' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] API de leads — Elaine Cristina Advocacia rodando na porta ${PORT}`);
});
