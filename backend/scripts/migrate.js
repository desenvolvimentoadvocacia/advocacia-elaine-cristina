'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] aplicando ${file}...`);
    await pool.query(sql);
  }

  console.log('[migrate] concluído.');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] falhou', err);
  process.exit(1);
});
