'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP_USER/SMTP_PASS não configurados — notificação por e-mail desativada, lead só fica salvo no banco.');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function onlyDigits(str) {
  return (str || '').replace(/\D/g, '');
}

function waLink(whatsapp) {
  const digits = onlyDigits(whatsapp);
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

const SERVICOS_LABEL = {
  CONSENSUAL_SEM_FILHOS: 'Divórcio consensual, sem filhos',
  CONSENSUAL_FILHOS_MAIORES: 'Divórcio consensual, filhos maiores',
  CONSENSUAL_FILHOS_MENORES: 'Divórcio consensual, filhos menores/incapazes — checar requisitos',
  CONSENSUAL_COM_BENS: 'Divórcio consensual, com bens (acordo já feito)',
  CONSENSUAL_SEM_BENS: 'Divórcio consensual, sem bens',
  CONSENSUAL_COM_PARTILHA_PENDENTE: 'Divórcio consensual, bens sem acordo de partilha',
  SEM_CONSENSO: 'Sem consenso entre os cônjuges — análise específica necessária',
};

async function notifyNewLead(lead) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'smtp_not_configured' };

  const to = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
  const subject = `Novo lead [${lead.lead_classificacao}] — ${lead.nome} — ${SERVICOS_LABEL[lead.tipo_caso] || lead.tipo_caso}`;

  const html = `
    <h2>Novo lead — Analisador de Divórcio Extrajudicial</h2>
    <p><b>Classificação:</b> ${lead.lead_classificacao} (score interno: ${lead.lead_score})</p>
    <p><b>Nome:</b> ${lead.nome}</p>
    <p><b>WhatsApp:</b> <a href="${waLink(lead.whatsapp)}">${lead.whatsapp}</a></p>
    <p><b>E-mail:</b> ${lead.email || '—'}</p>
    <p><b>Cidade:</b> ${lead.cidade || '—'}</p>
    <p><b>Canal preferido:</b> ${lead.canal_preferido || '—'}</p>
    <hr>
    <p><b>Situação do casal:</b> ${lead.situacao_casal}</p>
    <p><b>Filhos:</b> ${lead.filhos || '—'}</p>
    <p><b>Bens:</b> ${lead.bens || '—'} ${lead.acordo_bens ? `(acordo: ${lead.acordo_bens})` : ''}</p>
    <p><b>Tipo de caso:</b> ${SERVICOS_LABEL[lead.tipo_caso] || lead.tipo_caso}</p>
    <hr>
    <p><b>Origem (GCLID):</b> ${lead.gclid || '—'}</p>
    <p><b>UTM:</b> ${lead.utm_source || '—'} / ${lead.utm_medium || '—'} / ${lead.utm_campaign || '—'}</p>
    <p style="margin-top:16px"><a href="${waLink(lead.whatsapp)}" style="background:#003375;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">Falar com ${lead.nome} no WhatsApp</a></p>
  `;

  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });

  return { sent: true };
}

module.exports = { notifyNewLead, waLink };
