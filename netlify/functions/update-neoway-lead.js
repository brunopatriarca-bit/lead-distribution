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
  const numId = parseInt(id);

  try {
    // Fetch current record first
    const [current] = await sql`SELECT * FROM neoway_leads WHERE id = ${numId}`;
    if (!current) return { statusCode:404, headers, body:JSON.stringify({error:'Lead não encontrado'}) };

    // Merge values
    const newStatus           = status            ?? current.status;
    const newHasSale          = has_sale          !== undefined ? has_sale          : current.has_sale;
    const newAddressConfirmed = address_confirmed !== undefined ? address_confirmed : current.address_confirmed;
    const newNotes            = notes             !== undefined ? notes             : current.notes;
    const newAssignedTo       = assigned_to       !== undefined ? assigned_to       : current.assigned_to;
    const newAddress          = address           !== undefined ? address           : current.address;

    // visited_at
    const newVisitedAt = (newStatus === 'visitado' || newStatus === 'vendido') && !current.visited_at
      ? new Date().toISOString()
      : current.visited_at;

    // next_visit_date: visitado sem venda = +15d, vendido/novo = null
    let newNextVisit = current.next_visit_date;
    if (newStatus === 'vendido' || newStatus === 'novo') {
      newNextVisit = null;
    } else if (newStatus === 'visitado' && newHasSale !== true) {
      const d = new Date();
      d.setDate(d.getDate() + 15);
      newNextVisit = d.toISOString();
    }

    const [updated] = await sql`
      UPDATE neoway_leads SET
        status            = ${newStatus},
        has_sale          = ${newHasSale},
        address_confirmed = ${newAddressConfirmed},
        notes             = ${newNotes},
        assigned_to       = ${newAssignedTo},
        address           = ${newAddress},
        visited_at        = ${newVisitedAt},
        next_visit_date   = ${newNextVisit},
        updated_at        = NOW()
      WHERE id = ${numId}
      RETURNING *
    `;

    return { statusCode:200, headers, body:JSON.stringify({ success:true, data:updated }) };
  } catch(err) {
    console.error('update-neoway-lead error:', err);
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) };
  }
};
