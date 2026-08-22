'use strict';

/**
 * Classificação do lead do Analisador de Divórcio Extrajudicial.
 * Regras definidas no briefing técnico do cliente (Elaine Cristina Advocacia).
 */

function computeTipoCaso({ situacao_casal, filhos, bens, acordo_bens }) {
  if (situacao_casal !== 'acordo' && situacao_casal !== 'acordo_pontos_pendentes') {
    return 'SEM_CONSENSO';
  }
  if (filhos === 'menores' || filhos === 'incapazes') {
    return 'CONSENSUAL_FILHOS_MENORES';
  }
  if (filhos === 'maiores') {
    return 'CONSENSUAL_FILHOS_MAIORES';
  }
  if (bens === 'sim') {
    if (acordo_bens === 'sim') return 'CONSENSUAL_COM_BENS';
    return 'CONSENSUAL_COM_PARTILHA_PENDENTE';
  }
  if (bens === 'nao') {
    return 'CONSENSUAL_SEM_BENS';
  }
  return 'CONSENSUAL_SEM_FILHOS';
}

function computeScore({ situacao_casal, filhos, bens, acordo_bens, canal_preferido }) {
  let score = 0;

  if (situacao_casal === 'acordo') score += 20;
  else if (situacao_casal === 'acordo_pontos_pendentes') score += 10;
  else if (situacao_casal === 'decidindo') score -= 5;
  else if (situacao_casal === 'conjuge_nao_concorda') score -= 5;

  if (situacao_casal === 'acordo' || situacao_casal === 'acordo_pontos_pendentes') {
    score += 20; // "quer iniciar procedimento" — inferido do consenso
  }

  if (bens === 'sim') score += 10;
  if (bens === 'sim' && acordo_bens === 'sim') score += 15;
  if (filhos && filhos !== 'nenhum') score += 5;
  if (canal_preferido === 'whatsapp') score += 15;

  return Math.max(0, Math.min(100, score));
}

function computeClassificacao(score, tipoCaso) {
  if (tipoCaso === 'SEM_CONSENSO') return 'D';
  if (tipoCaso === 'CONSENSUAL_FILHOS_MENORES') return 'C';
  if (score >= 70) return 'A';
  if (score >= 40) return 'B';
  return 'B';
}

/**
 * Retorna qual bloco de resultado exibir na LP (Resultado A/B/C/D — ver
 * 06_OUTPUTS/2026-08-21_advocacia-elaine-cristina-lp-google-ads/01-copy-lp-divorcio-extrajudicial.md, bloco 5).
 */
function computeResultadoLP(tipoCaso) {
  if (tipoCaso === 'SEM_CONSENSO') return 'D';
  if (tipoCaso === 'CONSENSUAL_FILHOS_MENORES') return 'C';
  if (tipoCaso === 'CONSENSUAL_COM_BENS' || tipoCaso === 'CONSENSUAL_COM_PARTILHA_PENDENTE') return 'B';
  return 'A';
}

function classifyLead(input) {
  const tipo_caso = computeTipoCaso(input);
  const lead_score = computeScore({ ...input });
  const lead_classificacao = computeClassificacao(lead_score, tipo_caso);
  const resultado_lp = computeResultadoLP(tipo_caso);
  return { tipo_caso, lead_score, lead_classificacao, resultado_lp };
}

module.exports = { classifyLead, computeTipoCaso, computeScore, computeClassificacao, computeResultadoLP };
