// netlify/functions/executivos.js
// CRUD de executivos (mapeamento nome → região)
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };

  const sql = neon(process.env.DATABASE_URL);
  const { id } = event.queryStringParameters || {};

  try {
    // GET — listar todos ou buscar por nome
    if (event.httpMethod === 'GET') {
      const { search, sync } = event.queryStringParameters || {};

      // Sync automático: varre tabela leads e cria executivos faltando
      if (sync === 'true') {
        const novos = await sql`
          INSERT INTO executivos (nome, region_code, state_code, centro_custo)
          SELECT DISTINCT
            UPPER(TRIM(CONCAT(raw_data->>'nome_colaborador',' ',raw_data->>'sobrenome_colaborador'))),
            region_code,
            state_code,
            raw_data->>'centro_custo'
          FROM leads
          WHERE raw_data->>'nome_colaborador' IS NOT NULL
            AND TRIM(CONCAT(raw_data->>'nome_colaborador',' ',raw_data->>'sobrenome_colaborador')) <> ''
          ON CONFLICT (UPPER(TRIM(nome))) DO NOTHING
          RETURNING id
        `;
        return { statusCode:200, headers, body:JSON.stringify({ synced: novos.length }) };
      }

      if (search) {
        const rows = await sql`SELECT * FROM executivos WHERE nome ILIKE ${'%'+search+'%'} ORDER BY nome LIMIT 50`;
        return { statusCode:200, headers, body:JSON.stringify(rows) };
      }
      const rows = await sql`SELECT e.*, r.label AS region_label, r.color FROM executivos e LEFT JOIN regions r ON r.code = e.region_code ORDER BY e.nome`;
      return { statusCode:200, headers, body:JSON.stringify(rows) };
    }

    // POST — criar executivo
    if (event.httpMethod === 'POST') {
      const { nome, region_code, state_code, centro_custo } = JSON.parse(event.body || '{}');
      const [row] = await sql`
        INSERT INTO executivos (nome, region_code, state_code, centro_custo)
        VALUES (UPPER(TRIM(${nome})), ${region_code||null}, ${state_code||null}, ${centro_custo||null})
        ON CONFLICT (UPPER(TRIM(nome))) DO UPDATE SET region_code=${region_code||null}, state_code=${state_code||null}, centro_custo=${centro_custo||null}, updated_at=NOW()
        RETURNING *`;
      // Atualiza todos os leads desse executivo
      await sql`
        UPDATE leads SET region_code=${region_code||null}, state_code=${state_code||null}, updated_at=NOW()
        WHERE UPPER(TRIM(assigned_to)) = UPPER(TRIM(${nome}))
      `;
      return { statusCode:200, headers, body:JSON.stringify({ success:true, data:row }) };
    }

    // PATCH — atualizar
    if (event.httpMethod === 'PATCH' && id) {
      const { region_code, state_code, centro_custo } = JSON.parse(event.body || '{}');
      const [row] = await sql`
        UPDATE executivos SET region_code=${region_code||null}, state_code=${state_code||null}, centro_custo=${centro_custo||null}, updated_at=NOW()
        WHERE id=${parseInt(id)} RETURNING *`;
      // Propaga para leads
      await sql`
        UPDATE leads SET region_code=${region_code||null}, state_code=${state_code||null}, updated_at=NOW()
        WHERE UPPER(TRIM(assigned_to)) = UPPER(TRIM(${row.nome}))
      `;
      return { statusCode:200, headers, body:JSON.stringify({ success:true, data:row }) };
    }

    // DELETE
    if (event.httpMethod === 'DELETE' && id) {
      await sql`DELETE FROM executivos WHERE id=${parseInt(id)}`;
      return { statusCode:200, headers, body:JSON.stringify({ success:true }) };
    }

    return { statusCode:405, headers, body:JSON.stringify({error:'Method not allowed'}) };
  } catch(err) {
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) };
  }
};
