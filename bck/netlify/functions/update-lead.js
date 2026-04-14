// netlify/functions/update-lead.js
// Atualiza status, responsável e observações de um lead

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { id } = event.queryStringParameters || {};
  if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID obrigatório' }) };

  const body = JSON.parse(event.body || '{}');
  const { status, assigned_to, notes, region_code } = body;

  const sql = neon(process.env.DATABASE_URL);

  const [updated] = await sql`
    UPDATE leads SET
      status      = COALESCE(${status      || null}, status),
      assigned_to = COALESCE(${assigned_to || null}, assigned_to),
      notes       = COALESCE(${notes       || null}, notes),
      region_code = COALESCE(${region_code || null}, region_code),
      updated_at  = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;

  if (!updated) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Lead não encontrado' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: updated }) };
};
