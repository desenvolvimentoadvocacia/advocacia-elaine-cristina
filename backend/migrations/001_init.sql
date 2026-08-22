CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Origem / rastreamento
  gclid TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  landing_page TEXT,

  -- Dados de contato
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  cidade TEXT,

  -- Respostas do simulador (Analisador de Divórcio Extrajudicial)
  situacao_casal TEXT NOT NULL,     -- 'acordo' | 'acordo_pontos_pendentes' | 'conjuge_nao_concorda' | 'decidindo'
  filhos TEXT,                      -- 'nenhum' | 'maiores' | 'menores' | 'incapazes'
  bens TEXT,                        -- 'nao' | 'sim' | 'incerto'
  acordo_bens TEXT,                 -- 'sim' | 'pendente' | 'sem_acordo' | null

  -- Classificação automática (ver backend/src/scoring.js)
  tipo_caso TEXT NOT NULL,          -- CONSENSUAL_SEM_FILHOS | CONSENSUAL_FILHOS_MAIORES | CONSENSUAL_FILHOS_MENORES |
                                     -- CONSENSUAL_COM_BENS | CONSENSUAL_SEM_BENS | CONSENSUAL_COM_PARTILHA_PENDENTE | SEM_CONSENSO
  lead_score INTEGER NOT NULL DEFAULT 0,
  lead_classificacao TEXT NOT NULL, -- 'A' | 'B' | 'C' | 'D'

  -- Operação
  canal_preferido TEXT,             -- 'whatsapp' | 'ligacao' | 'email'
  status TEXT NOT NULL DEFAULT 'novo', -- 'novo' | 'qualificado' | 'consulta_agendada' | 'cliente_fechado' | 'fora_de_escopo'
  notificado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_classificacao ON leads (lead_classificacao);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);

-- Eventos de microconversão (page_view, scroll_50, click_whatsapp etc.) — opcional,
-- útil para auditoria própria além do GA4. Não obrigatório para o MVP.
CREATE TABLE IF NOT EXISTS eventos (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  evento TEXT NOT NULL,
  gclid TEXT,
  detalhe JSONB
);

CREATE INDEX IF NOT EXISTS idx_eventos_created_at ON eventos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_evento ON eventos (evento);
