-- ============================================================
--  Lead Distribution System — Schema Neon PostgreSQL
--  Execute este script no SQL Editor do console.neon.tech
-- ============================================================

-- Mapeamento de estado → região
CREATE TABLE IF NOT EXISTS regions (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20) NOT NULL UNIQUE,  -- ex: 'GO', 'SP', 'SUL'
  label       VARCHAR(50) NOT NULL,          -- ex: 'Goiás', 'São Paulo'
  states      TEXT[]      NOT NULL,          -- ex: ARRAY['GO']
  color       VARCHAR(7)  DEFAULT '#6366f1', -- hex para o frontend
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir regiões padrão
INSERT INTO regions (code, label, states, color) VALUES
  ('GO',    'Goiás',          ARRAY['GO'],                                    '#8b5cf6'),
  ('SUL',   'Sul',            ARRAY['PR', 'SC', 'RS'],                        '#0ea5e9'),
  ('NONE',  'Norte / Nordeste', ARRAY['AM','PA','AC','RO','RR','AP','TO',
                                      'MA','PI','CE','RN','PB','PE','AL',
                                      'SE','BA'],                             '#f97316'),
  ('SP',    'São Paulo',      ARRAY['SP'],                                    '#a855f7'),
  ('RJ_ES', 'RJ / ES',        ARRAY['RJ', 'ES'],                              '#eab308'),
  ('MG',    'Minas Gerais',   ARRAY['MG'],                                    '#22c55e')
ON CONFLICT (code) DO NOTHING;

-- Tabela principal de leads importados da Paytrack
CREATE TABLE IF NOT EXISTS leads (
  id              BIGSERIAL   PRIMARY KEY,
  external_id     VARCHAR(100) UNIQUE,           -- ID vindo da Paytrack
  raw_data        JSONB        NOT NULL,           -- payload completo da API
  state_code      VARCHAR(2),                      -- estado extraído (ex: 'SP')
  region_code     VARCHAR(20)  REFERENCES regions(code),
  status          VARCHAR(20)  DEFAULT 'novo'
                               CHECK (status IN ('novo','em_andamento','concluido','cancelado')),
  assigned_to     VARCHAR(100),                   -- responsável pela região
  notes           TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_region    ON leads(region_code);
CREATE INDEX IF NOT EXISTS idx_leads_state     ON leads(state_code);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_synced    ON leads(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_raw       ON leads USING GIN(raw_data);

-- Log de sincronizações com a Paytrack
CREATE TABLE IF NOT EXISTS sync_logs (
  id          BIGSERIAL   PRIMARY KEY,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  total_fetched INT DEFAULT 0,
  total_inserted INT DEFAULT 0,
  total_updated  INT DEFAULT 0,
  error_msg   TEXT,
  status      VARCHAR(20) DEFAULT 'running'
              CHECK (status IN ('running','success','error'))
);

-- View para dashboard: contagem por região
CREATE OR REPLACE VIEW v_leads_by_region AS
SELECT
  r.code,
  r.label,
  r.color,
  COUNT(l.id)                                    AS total,
  COUNT(l.id) FILTER (WHERE l.status = 'novo')   AS novos,
  COUNT(l.id) FILTER (WHERE l.status = 'em_andamento') AS em_andamento,
  COUNT(l.id) FILTER (WHERE l.status = 'concluido')    AS concluidos
FROM regions r
LEFT JOIN leads l ON l.region_code = r.code
GROUP BY r.code, r.label, r.color
ORDER BY total DESC;

-- View para dashboard: evolução diária
CREATE OR REPLACE VIEW v_leads_daily AS
SELECT
  DATE_TRUNC('day', synced_at) AS dia,
  region_code,
  COUNT(*) AS total
FROM leads
GROUP BY 1, 2
ORDER BY 1 DESC;
