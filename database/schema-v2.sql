-- ============================================================
--  Schema v2 — Neoway Leads + Manager Dashboard
--  Execute no SQL Editor do Neon
-- ============================================================

CREATE TABLE IF NOT EXISTS neoway_leads (
  id                BIGSERIAL    PRIMARY KEY,
  external_id       VARCHAR(100) UNIQUE,
  raw_data          JSONB        NOT NULL,
  name              VARCHAR(200),
  cnpj              VARCHAR(20),
  state_code        VARCHAR(2),
  region_code       VARCHAR(20)  REFERENCES regions(code),
  city              VARCHAR(100),
  address           TEXT,
  address_confirmed BOOLEAN      DEFAULT NULL,   -- gestor confirma endereço
  status            VARCHAR(20)  DEFAULT 'novo'
                    CHECK (status IN ('novo','visitado','vendido','sem_endereco','cancelado')),
  has_sale          BOOLEAN      DEFAULT NULL,   -- gestor marca venda
  visit_id          BIGINT       REFERENCES leads(id),  -- visita Paytrack vinculada
  visited_at        TIMESTAMPTZ,
  assigned_to       VARCHAR(100),
  notes             TEXT,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neoway_region  ON neoway_leads(region_code);
CREATE INDEX IF NOT EXISTS idx_neoway_state   ON neoway_leads(state_code);
CREATE INDEX IF NOT EXISTS idx_neoway_status  ON neoway_leads(status);
CREATE INDEX IF NOT EXISTS idx_neoway_cnpj    ON neoway_leads(cnpj);
CREATE INDEX IF NOT EXISTS idx_neoway_raw     ON neoway_leads USING GIN(raw_data);

-- Dashboard do gestor por região
CREATE OR REPLACE VIEW v_manager_dashboard AS
SELECT
  r.code, r.label, r.color,
  COUNT(nl.id)                                              AS total,
  COUNT(nl.id) FILTER (WHERE nl.status = 'novo')           AS novos,
  COUNT(nl.id) FILTER (WHERE nl.status = 'visitado')       AS visitados,
  COUNT(nl.id) FILTER (WHERE nl.status = 'vendido')        AS vendidos,
  COUNT(nl.id) FILTER (WHERE nl.status = 'sem_endereco')   AS sem_endereco,
  COUNT(nl.id) FILTER (WHERE nl.status = 'cancelado')      AS cancelados,
  COUNT(nl.id) FILTER (WHERE nl.has_sale = true)           AS com_venda,
  COUNT(nl.id) FILTER (WHERE nl.address_confirmed = true)  AS endereco_ok,
  COUNT(nl.id) FILTER (WHERE nl.address_confirmed = false) AS endereco_invalido
FROM regions r
LEFT JOIN neoway_leads nl ON nl.region_code = r.code
GROUP BY r.code, r.label, r.color
ORDER BY total DESC;

-- Evolução diária de vendas
CREATE OR REPLACE VIEW v_sales_daily AS
SELECT
  DATE_TRUNC('day', updated_at) AS dia,
  region_code,
  COUNT(*) FILTER (WHERE has_sale = true)  AS vendas,
  COUNT(*) FILTER (WHERE status = 'visitado' OR status = 'vendido') AS visitas
FROM neoway_leads
WHERE updated_at IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 DESC;
