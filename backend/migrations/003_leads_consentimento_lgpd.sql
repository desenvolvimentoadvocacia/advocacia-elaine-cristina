-- Registro do consentimento LGPD dado no formulario do simulador.
-- consentimento_lgpd fica default false; a rota so grava true quando o
-- visitante marca ativamente o checkbox (nunca pre-marcado).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consentimento_lgpd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consentimento_em TIMESTAMPTZ;
