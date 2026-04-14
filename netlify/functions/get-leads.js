// netlify/functions/get-leads.js
// Retorna leads filtrados por região, estado e status

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const {
    region,
    state,
    status,
    page = '1',
    limit = '50',
    search,
  } = params;

  const sql = neon(process.env.DATABASE_URL);
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Dashboard: contagem por região
    if (params.view === 'dashboard') {
      const stats = await sql`SELECT * FROM v_leads_by_region`;
      const daily = await sql`
        SELECT dia, region_code, total FROM v_leads_daily
        WHERE dia >= NOW() - INTERVAL '30 days'
        ORDER BY dia ASC
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM leads`;
      const [lastSync] = await sql`
        SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ stats, daily, totalLeads: Number(count), lastSync }),
      };
    }

    // Listagem paginada com filtros
    const conditions = [];
    const bindings   = [];
    let i = 1;

    if (region) { conditions.push(`region_code = $${i++}`); bindings.push(region); }
    if (state)  { conditions.push(`state_code  = $${i++}`); bindings.push(state.toUpperCase()); }
    if (status) { conditions.push(`status      = $${i++}`); bindings.push(status); }
    if (search) {
      conditions.push(`(raw_data::text ILIKE $${i++} OR assigned_to ILIKE $${i-1})`);
      bindings.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ total }] = await sql.unsafe(
      `SELECT COUNT(*) AS total FROM leads ${where}`,
      bindings
    );

    const rows = await sql.unsafe(
      `SELECT id, external_id, state_code, region_code, status, assigned_to, notes, synced_at,
              raw_data
       FROM leads ${where}
       ORDER BY synced_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...bindings, parseInt(limit), offset]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: rows,
        pagination: {
          total: Number(total),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(Number(total) / parseInt(limit)),
        },
      }),
    };

  } catch (err) {
    console.error('get-leads error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
