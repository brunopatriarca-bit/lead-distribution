// netlify/functions/update-neoway-lead.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };
  if (event.httpMethod !== 'PATCH') return { statusCode:405, headers, body:JSON.stringify({error:'Method not allowed'}) };

  const { id } = event.queryStringParameters || {};
  if (!id) return { statusCode:400, headers, body:JSON.stringify({error:'ID obrigatório'}) };

  const body = JSON.parse(event.body || '{}');
  const { status, has_sale, address_confirmed, notes, assigned_to, address } = body;
  const sql = neon(process.env.DATABASE_URL);

  const [updated] = await sql`
    UPDATE neoway_leads SET
      status            = COALESCE(${status            ?? null}, status),
      has_sale          = CASE WHEN ${has_sale          ?? null} IS NOT NULL THEN ${has_sale          ?? null} ELSE has_sale END,
      address_confirmed = CASE WHEN ${address_confirmed ?? null} IS NOT NULL THEN ${address_confirmed ?? null} ELSE address_confirmed END,
      notes             = COALESCE(${notes             ?? null}, notes),
      assigned_to       = COALESCE(${assigned_to       ?? null}, assigned_to),
      address           = COALESCE(${address           ?? null}, address),
      visited_at        = CASE WHEN ${status ?? ''} IN ('visitado','vendido') AND visited_at IS NULL THEN NOW() ELSE visited_at END,
      updated_at        = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;
  if (!updated) return { statusCode:404, headers, body:JSON.stringify({error:'Lead não encontrado'}) };
  return { statusCode:200, headers, body:JSON.stringify({ success:true, data:updated }) };
};
