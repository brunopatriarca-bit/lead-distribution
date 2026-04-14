// netlify/functions/get-leads.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const params = event.queryStringParameters || {};
  const { region, state, status, page = '1', limit = '50', search, view } = params;
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Dashboard view
    if (view === 'dashboard') {
      const stats   = await sql`SELECT * FROM v_leads_by_region`;
      const daily   = await sql`SELECT dia, region_code, total FROM v_leads_daily WHERE dia >= NOW() - INTERVAL '30 days' ORDER BY dia ASC`;
      const totRow  = await sql`SELECT COUNT(*) AS count FROM leads`;
      const lastSync= await sql`SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1`;
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ stats, daily, totalLeads: Number(totRow[0].count), lastSync: lastSync[0] || null }),
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query with only the filters provided — avoids sql.unsafe entirely
    let rows, totalRows;

    if (region && status && search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE region_code=${region} AND status=${status} AND raw_data::text ILIKE ${'%'+search+'%'}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE region_code=${region} AND status=${status} AND raw_data::text ILIKE ${'%'+search+'%'} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (region && status) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE region_code=${region} AND status=${status}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE region_code=${region} AND status=${status} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (region && search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE region_code=${region} AND raw_data::text ILIKE ${'%'+search+'%'}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE region_code=${region} AND raw_data::text ILIKE ${'%'+search+'%'} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (status && search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE status=${status} AND raw_data::text ILIKE ${'%'+search+'%'}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE status=${status} AND raw_data::text ILIKE ${'%'+search+'%'} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (region) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE region_code=${region}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE region_code=${region} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (status) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE status=${status}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE status=${status} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE raw_data::text ILIKE ${'%'+search+'%'}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE raw_data::text ILIKE ${'%'+search+'%'} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (state) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads WHERE state_code=${state.toUpperCase()}`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads WHERE state_code=${state.toUpperCase()} ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else {
      totalRows = await sql`SELECT COUNT(*) AS c FROM leads`;
      rows = await sql`SELECT id,external_id,state_code,region_code,status,assigned_to,notes,synced_at,raw_data FROM leads ORDER BY synced_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    }

    const total = Number(totalRows[0].c);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        data: rows,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/parseInt(limit)) },
      }),
    };
  } catch (err) {
    console.error('get-leads error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
