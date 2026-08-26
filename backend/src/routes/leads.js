'use strict';

const express = require('express');
const { pool } = require('../db');
const { classifyLead } = require('../scoring');
const { notifyNewLead } = require('../email');
const { uploadOfflineConversion } = require('../googleads');

const router = express.Router();

const SITUACAO_VALIDAS = ['acordo', 'acordo_pontos_pendentes', 'conjuge_nao_concorda', 'decidindo'];
const FILHOS_VALIDOS = ['nenhum', 'maiores', 'menores', 'incapazes'];
const BENS_VALIDOS = ['nao', 'sim', 'incerto'];
const ACORDO_BENS_VALIDOS = ['sim', 'pendente', 'sem_acordo'];
const CANAL_VALIDOS = ['whatsapp', 'ligacao', 'email'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

router.post('/', async (req, res) => {
  const body = req.body || {};

  const nome = isNonEmptyString(body.nome) ? body.nome.trim().slice(0, 200) : null;
  const whatsapp = isNonEmptyString(body.whatsapp) ? body.whatsapp.trim().slice(0, 40) : null;
  const situacao_casal = SITUACAO_VALIDAS.includes(body.situacao_casal) ? body.situacao_casal : null;

  if (!nome || !whatsapp || !situacao_casal) {
    return res.status(400).json({
      error: 'campos_obrigatorios_faltando',
      detalhe: 'nome, whatsapp e situacao_casal são obrigatórios',
    });
  }

  if (body.consentimento_lgpd !== true) {
    return res.status(400).json({
      error: 'consentimento_obrigatorio',
      detalhe: 'É necessário aceitar a Política de Privacidade para enviar o formulário',
    });
  }

  const filhos = FILHOS_VALIDOS.includes(body.filhos) ? body.filhos : null;
  const bens = BENS_VALIDOS.includes(body.bens) ? body.bens : null;
  const acordo_bens = ACORDO_BENS_VALIDOS.includes(body.acordo_bens) ? body.acordo_bens : null;
  const canal_preferido = CANAL_VALIDOS.includes(body.canal_preferido) ? body.canal_preferido : null;
  const email = isNonEmptyString(body.email) ? body.email.trim().slice(0, 200) : null;
  const cidade = isNonEmptyString(body.cidade) ? body.cidade.trim().slice(0, 120) : null;

  const gclid = isNonEmptyString(body.gclid) ? body.gclid.trim().slice(0, 200) : null;
  const utm_source = isNonEmptyString(body.utm_source) ? body.utm_source.trim().slice(0, 100) : null;
  const utm_medium = isNonEmptyString(body.utm_medium) ? body.utm_medium.trim().slice(0, 100) : null;
  const utm_campaign = isNonEmptyString(body.utm_campaign) ? body.utm_campaign.trim().slice(0, 150) : null;
  const utm_term = isNonEmptyString(body.utm_term) ? body.utm_term.trim().slice(0, 150) : null;
  const utm_content = isNonEmptyString(body.utm_content) ? body.utm_content.trim().slice(0, 150) : null;
  const landing_page = isNonEmptyString(body.landing_page) ? body.landing_page.trim().slice(0, 300) : null;

  const { tipo_caso, lead_score, lead_classificacao, resultado_lp } = classifyLead({
    situacao_casal, filhos, bens, acordo_bens, canal_preferido,
  });

  try {
    const result = await pool.query(
      `INSERT INTO leads (
        gclid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page,
        nome, whatsapp, email, cidade,
        situacao_casal, filhos, bens, acordo_bens,
        tipo_caso, lead_score, lead_classificacao, canal_preferido,
        consentimento_lgpd, consentimento_em
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now())
      RETURNING id, created_at`,
      [
        gclid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page,
        nome, whatsapp, email, cidade,
        situacao_casal, filhos, bens, acordo_bens,
        tipo_caso, lead_score, lead_classificacao, canal_preferido,
        true,
      ]
    );

    const lead = {
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
      nome, whatsapp, email, cidade,
      situacao_casal, filhos, bens, acordo_bens,
      tipo_caso, lead_score, lead_classificacao, canal_preferido,
      gclid, utm_source, utm_medium, utm_campaign,
    };

    notifyNewLead(lead)
      .then((r) => {
        if (r.sent) {
          pool.query('UPDATE leads SET notificado_em = now() WHERE id = $1', [lead.id]).catch(() => {});
        }
      })
      .catch((err) => console.error('[leads] falha ao notificar por e-mail', err));

    return res.status(201).json({
      ok: true,
      id: lead.id,
      resultado_lp,
    });
  } catch (err) {
    console.error('[leads] erro ao salvar lead', err);
    return res.status(500).json({ error: 'erro_interno' });
  }
});

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'id_invalido' });

  const STATUS_VALIDOS = ['novo', 'qualificado', 'consulta_agendada', 'cliente_fechado', 'fora_de_escopo'];
  const { status } = req.body || {};

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ error: 'status_invalido' });
  }

  try {
    let result;
    if (status === 'cliente_fechado') {
      result = await pool.query(
        `UPDATE leads SET status = $1, converted_at = now() WHERE id = $2 RETURNING id, status, gclid, converted_at`,
        [status, id]
      );
    } else {
      result = await pool.query(
        `UPDATE leads SET status = $1 WHERE id = $2 RETURNING id, status, gclid, converted_at`,
        [status, id]
      );
    }

    if (result.rows.length === 0) return res.status(404).json({ error: 'lead_nao_encontrado' });

    const lead = result.rows[0];

    if (status === 'cliente_fechado' && lead.gclid) {
      uploadOfflineConversion(lead.gclid, lead.converted_at).catch((err) => {
        console.error('[leads] falha ao enviar conversao offline', err);
      });
    }

    return res.json({ ok: true, lead });
  } catch (err) {
    console.error('[leads] erro ao atualizar status', err);
    return res.status(500).json({ error: 'erro_interno' });
  }
});

module.exports = router;
