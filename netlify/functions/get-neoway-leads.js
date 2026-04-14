// netlify/functions/get-neoway-leads.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };

  const { region, status, search, page='1', limit='50', view } = event.queryStringParameters || {};
  const sql = neon(process.env.DATABASE_URL);
  const offset = (parseInt(page)-1) * parseInt(limit);

  try {
    // Dashboard do gestor
    if (view === 'dashboard') {
      const stats  = await sql`SELECT * FROM v_manager_dashboard`;
      const daily  = await sql`SELECT dia, region_code, vendas, visitas FROM v_sales_daily WHERE dia >= NOW() - INTERVAL '30 days' ORDER BY dia ASC`;
      const totRow = await sql`SELECT COUNT(*) AS c FROM neoway_leads`;
      const kpis   = await sql`
        SELECT
          COUNT(*)                                    AS total,
          COUNT(*) FILTER (WHERE status='visitado' OR status='vendido') AS visitados,
          COUNT(*) FILTER (WHERE has_sale=true)       AS vendas,
          COUNT(*) FILTER (WHERE address_confirmed=false) AS end_invalido,
          COUNT(*) FILTER (WHERE address IS NULL OR address='') AS sem_endereco
        FROM neoway_leads
      `;
      return { statusCode:200, headers, body:JSON.stringify({ stats, daily, kpis:kpis[0], total:Number(totRow[0].c) }) };
    }

    // Listagem
    let rows, totalRows;

    if (region && status && search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE region_code=${region} AND status=${status} AND (name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'})`;
      rows = await sql`SELECT * FROM neoway_leads WHERE region_code=${region} AND status=${status} AND (name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'}) ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (region && status) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE region_code=${region} AND status=${status}`;
      rows = await sql`SELECT * FROM neoway_leads WHERE region_code=${region} AND status=${status} ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (region && search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE region_code=${region} AND (name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'})`;
      rows = await sql`SELECT * FROM neoway_leads WHERE region_code=${region} AND (name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'}) ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (status && search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE status=${status} AND (name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'})`;
      rows = await sql`SELECT * FROM neoway_leads WHERE status=${status} AND (name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'}) ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (region) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE region_code=${region}`;
      rows = await sql`SELECT * FROM neoway_leads WHERE region_code=${region} ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (status) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE status=${status}`;
      rows = await sql`SELECT * FROM neoway_leads WHERE status=${status} ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else if (search) {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'}`;
      rows = await sql`SELECT * FROM neoway_leads WHERE name ILIKE ${'%'+search+'%'} OR cnpj ILIKE ${'%'+search+'%'} ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    } else {
      totalRows = await sql`SELECT COUNT(*) AS c FROM neoway_leads`;
      rows = await sql`SELECT * FROM neoway_leads ORDER BY updated_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    }

    const total = Number(totalRows[0].c);
    return { statusCode:200, headers, body:JSON.stringify({ data:rows, pagination:{ total, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(total/parseInt(limit)) } }) };
  } catch(err) {
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) };
  }
};
