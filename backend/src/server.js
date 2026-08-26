'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const leadsRouter = require('./routes/leads');
const eventosRouter = require('./routes/eventos');

const app = express();

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] aplicando ${file}...`);
    await pool.query(sql);
  }
}

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
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] API de leads — Elaine Cristina Advocacia rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[migrate] falhou, servidor não subiu', err);
    process.exit(1);
  });
