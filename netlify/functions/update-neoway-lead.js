// netlify/functions/update-neoway-lead.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type':'application/json',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'PATCH,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };
  if (event.httpMethod !== 'PATCH') return { statusCode:405, headers, body:JSON.stringify({error:'Method not allowed'}) };

  const { id } = event.queryStringParameters || {};
  if (!id) return { statusCode:400, headers, body:JSON.stringify({error:'ID obrigatório'}) };

  const body = JSON.parse(event.body || '{}');
  const { status, has_sale, address_confirmed, notes, assigned_to, address } = body;
  const sql = neon(process.env.DATABASE_URL);

  // Calcular next_visit_date baseado no status
  let nextVisitDate = undefined;
  if (status === 'visitado' && has_sale !== true) {
    // +15 dias sem venda
    const d = new Date();
    d.setDate(d.getDate() + 15);
    nextVisitDate = d.toISOString();
  } else if (status === 'vendido' || status === 'novo') {
    nextVisitDate = null;
  }

  // Montar campos dinamicamente para evitar problemas com CASE WHEN booleano
  const setClauses = [];
  const values = { id: parseInt(id) };

  if (status !== undefined)            { setClauses.push('status'); values.status = status; }
  if (has_sale !== undefined)          { setClauses.push('has_sale'); values.has_sale = has_sale; }
  if (address_confirmed !== undefined) { setClauses.push('address_confirmed'); values.address_confirmed = address_confirmed; }
  if (notes !== undefined)             { setClauses.push('notes'); values.notes = notes; }
  if (assigned_to !== undefined)       { setClauses.push('assigned_to'); values.assigned_to = assigned_to; }
  if (address !== undefined)           { setClauses.push('address'); values.address = address; }
  if (nextVisitDate !== undefined)     { setClauses.push('next_visit_date'); values.next_visit_date = nextVisitDate; }

  try {
    // Usar queries separadas para evitar problemas de tipo com template literals do Neon
    const [updated] = await sql`
      UPDATE neoway_leads SET
        status            = COALESCE(${status ?? null}, status),
        has_sale          = COALESCE(${has_sale          ?? null}::boolean, has_sale),
        address_confirmed = COALESCE(${address_confirmed ?? null}::boolean, address_confirmed),
        notes             = COALESCE(${notes      ?? null}, notes),
        assigned_to       = COALESCE(${assigned_to ?? null}, assigned_to),
        address           = COALESCE(${address    ?? null}, address),
        visited_at        = CASE
          WHEN ${status ?? ''} IN ('visitado','vendido') AND visited_at IS NULL
          THEN NOW()
          ELSE visited_at
        END,
        next_visit_date   = CASE
          WHEN ${status ?? ''} = 'vendido' THEN NULL
          WHEN ${status ?? ''} = 'novo'    THEN NULL
          WHEN ${status ?? ''} = 'visitado' AND ${has_sale ?? false} IS NOT TRUE
            THEN NOW() + INTERVAL '15 days'
          ELSE next_visit_date
        END,
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (!updated) return { statusCode:404, headers, body:JSON.stringify({error:'Lead não encontrado'}) };
    return { statusCode:200, headers, body:JSON.stringify({ success:true, data:updated }) };

  } catch(err) {
    console.error('update-neoway-lead error:', err);
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) };
  }
};
