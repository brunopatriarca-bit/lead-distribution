// netlify/functions/sync-leads.js
// Busca dados da Paytrack e salva no Neon DB

const { neon } = require('@neondatabase/serverless');

const PAYTRACK_URL   = process.env.PAYTRACK_BASE_URL;
const PAYTRACK_VIEW  = process.env.PAYTRACK_VIEW;
const PAYTRACK_DB    = process.env.PAYTRACK_DATABASE;
const PAYTRACK_LOGIN = process.env.PAYTRACK_LOGIN;
const PAYTRACK_SENHA = process.env.PAYTRACK_SENHA;

// Mapa de UF → código de região (deve bater com a tabela regions)
const STATE_TO_REGION = {
  GO: 'GO',
  PR: 'SUL', SC: 'SUL', RS: 'SUL',
  AM: 'NONE', PA: 'NONE', AC: 'NONE', RO: 'NONE',
  RR: 'NONE', AP: 'NONE', TO: 'NONE',
  MA: 'NONE', PI: 'NONE', CE: 'NONE', RN: 'NONE',
  PB: 'NONE', PE: 'NONE', AL: 'NONE', SE: 'NONE', BA: 'NONE',
  SP: 'SP',
  RJ: 'RJ_ES', ES: 'RJ_ES',
  MG: 'MG',
  DF: 'GO', MT: 'GO', MS: 'GO',  // Centro-Oeste junto com GO
};

/**
 * Tenta extrair a UF de um campo de texto ou objeto JSON
 * A Paytrack pode trazer o estado em campos como: uf, estado, state, cidade_uf
 */
function extractState(row) {
  const candidates = ['uf', 'estado', 'state', 'uf_destino', 'uf_origem', 'cidade_uf'];
  for (const key of candidates) {
    const val = row[key];
    if (val && typeof val === 'string' && val.length === 2) {
      return val.toUpperCase();
    }
    // formato "São Paulo - SP"
    if (val && typeof val === 'string' && val.includes(' - ')) {
      const parts = val.split(' - ');
      const uf = parts[parts.length - 1].trim().toUpperCase();
      if (uf.length === 2) return uf;
    }
  }
  return null;
}

async function fetchPaytrack() {
  const url = `${PAYTRACK_URL}?view=${PAYTRACK_VIEW}&database=${PAYTRACK_DB}`;
  const credentials = Buffer.from(`${PAYTRACK_LOGIN}:${PAYTRACK_SENHA}`).toString('base64');

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Paytrack API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // A API pode retornar array direto ou { data: [...] }
  return Array.isArray(data) ? data : (data.data || data.rows || []);
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Só aceitar GET/POST
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const sql = neon(process.env.DATABASE_URL);
  let logId;

  try {
    // Iniciar log de sync
    const [log] = await sql`
      INSERT INTO sync_logs (status)
      VALUES ('running')
      RETURNING id
    `;
    logId = log.id;

    // 1. Buscar dados da Paytrack
    const rows = await fetchPaytrack();
    let inserted = 0;
    let updated = 0;

    // 2. Para cada registro, determinar estado e região, e upsert no DB
    for (const row of rows) {
      const externalId = String(row.id || row.codigo || row.registro || JSON.stringify(row).slice(0, 40));
      const stateCode  = extractState(row);
      const regionCode = stateCode ? (STATE_TO_REGION[stateCode] || null) : null;

      const result = await sql`
        INSERT INTO leads (external_id, raw_data, state_code, region_code, synced_at)
        VALUES (${externalId}, ${JSON.stringify(row)}, ${stateCode}, ${regionCode}, NOW())
        ON CONFLICT (external_id)
        DO UPDATE SET
          raw_data    = EXCLUDED.raw_data,
          state_code  = EXCLUDED.state_code,
          region_code = EXCLUDED.region_code,
          synced_at   = NOW()
        RETURNING (xmax = 0) AS is_insert
      `;

      if (result[0]?.is_insert) inserted++;
      else updated++;
    }

    // 3. Finalizar log
    await sql`
      UPDATE sync_logs SET
        finished_at   = NOW(),
        total_fetched  = ${rows.length},
        total_inserted = ${inserted},
        total_updated  = ${updated},
        status         = 'success'
      WHERE id = ${logId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fetched: rows.length,
        inserted,
        updated,
        syncLogId: logId,
      }),
    };

  } catch (err) {
    console.error('sync-leads error:', err);

    if (logId) {
      const sql2 = neon(process.env.DATABASE_URL);
      await sql2`
        UPDATE sync_logs SET
          finished_at = NOW(),
          error_msg   = ${err.message},
          status      = 'error'
        WHERE id = ${logId}
      `.catch(() => {});
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
