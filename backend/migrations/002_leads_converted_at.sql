-- Armazena o momento em que o lead foi marcado como cliente_fechado
-- Usado como conversionDateTime no upload de conversao offline para o Google Ads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
