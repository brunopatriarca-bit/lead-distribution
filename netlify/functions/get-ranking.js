// netlify/functions/get-ranking.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };

  const { region, view, month, year } = event.queryStringParameters || {};
  const sql = neon(process.env.DATABASE_URL);

  // Date range from month/year
  let dFrom = null, dTo = null;
  if (month && year) {
    const m = parseInt(month), y = parseInt(year);
    dFrom = `${y}-${String(m).padStart(2,'0')}-01`;
    dTo   = m===12 ? `${y+1}-01-01` : `${y}-${String(m+1).padStart(2,'0')}-01`;
  } else if (year) {
    dFrom = `${year}-01-01`;
    dTo   = `${parseInt(year)+1}-01-01`;
  }

  try {
    // ── Ranking ────────────────────────────────────────────
    if (view === 'ranking') {
      let rows;
      if (region && dFrom) {
        rows = await sql`
          SELECT l.assigned_to AS nome, l.region_code, e.state_code, r.color, r.label AS region_label,
            COUNT(l.id) AS visitas,
            ROUND(SUM(CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END)::NUMERIC,1) AS total_km,
            COUNT(DISTINCT DATE_TRUNC('day',(l.raw_data->>'data_inicio')::timestamptz)) AS dias_ativos
          FROM leads l
          LEFT JOIN executivos e ON UPPER(TRIM(l.assigned_to))=e.nome
          LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL AND l.region_code=${region}
            AND (l.raw_data->>'data_inicio')>=${dFrom} AND (l.raw_data->>'data_inicio')<${dTo}
          GROUP BY l.assigned_to,l.region_code,e.state_code,r.color,r.label
          ORDER BY visitas DESC, total_km DESC`;
      } else if (region) {
        rows = await sql`
          SELECT l.assigned_to AS nome, l.region_code, e.state_code, r.color, r.label AS region_label,
            COUNT(l.id) AS visitas,
            ROUND(SUM(CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END)::NUMERIC,1) AS total_km,
            COUNT(DISTINCT DATE_TRUNC('day',(l.raw_data->>'data_inicio')::timestamptz)) AS dias_ativos
          FROM leads l
          LEFT JOIN executivos e ON UPPER(TRIM(l.assigned_to))=e.nome
          LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL AND l.region_code=${region}
          GROUP BY l.assigned_to,l.region_code,e.state_code,r.color,r.label
          ORDER BY visitas DESC, total_km DESC`;
      } else if (dFrom) {
        rows = await sql`
          SELECT l.assigned_to AS nome, l.region_code, e.state_code, r.color, r.label AS region_label,
            COUNT(l.id) AS visitas,
            ROUND(SUM(CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END)::NUMERIC,1) AS total_km,
            COUNT(DISTINCT DATE_TRUNC('day',(l.raw_data->>'data_inicio')::timestamptz)) AS dias_ativos
          FROM leads l
          LEFT JOIN executivos e ON UPPER(TRIM(l.assigned_to))=e.nome
          LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL
            AND (l.raw_data->>'data_inicio')>=${dFrom} AND (l.raw_data->>'data_inicio')<${dTo}
          GROUP BY l.assigned_to,l.region_code,e.state_code,r.color,r.label
          ORDER BY visitas DESC, total_km DESC`;
      } else {
        rows = await sql`
          SELECT l.assigned_to AS nome, l.region_code, e.state_code, r.color, r.label AS region_label,
            COUNT(l.id) AS visitas,
            ROUND(SUM(CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END)::NUMERIC,1) AS total_km,
            COUNT(DISTINCT DATE_TRUNC('day',(l.raw_data->>'data_inicio')::timestamptz)) AS dias_ativos
          FROM leads l
          LEFT JOIN executivos e ON UPPER(TRIM(l.assigned_to))=e.nome
          LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL
          GROUP BY l.assigned_to,l.region_code,e.state_code,r.color,r.label
          ORDER BY visitas DESC, total_km DESC`;
      }
      return { statusCode:200, headers, body:JSON.stringify(rows) };
    }

    // ── Mapa de pontos ─────────────────────────────────────
    if (view === 'mappoints') {
      let rows;
      if (region && dFrom) {
        rows = await sql`
          SELECT l.id, l.assigned_to, l.region_code, r.color AS region_color,
            (l.raw_data->>'latitude_fim')::FLOAT AS lat, (l.raw_data->>'longitude_fim')::FLOAT AS lon,
            l.raw_data->>'data_inicio' AS data, l.raw_data->>'distancia' AS distancia,
            l.raw_data->>'centro_custo' AS centro_custo
          FROM leads l LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL AND l.region_code=${region}
            AND (l.raw_data->>'data_inicio')>=${dFrom} AND (l.raw_data->>'data_inicio')<${dTo}
            AND l.raw_data->>'latitude_fim' IS NOT NULL AND (l.raw_data->>'latitude_fim')!=''`;
      } else if (region) {
        rows = await sql`
          SELECT l.id, l.assigned_to, l.region_code, r.color AS region_color,
            (l.raw_data->>'latitude_fim')::FLOAT AS lat, (l.raw_data->>'longitude_fim')::FLOAT AS lon,
            l.raw_data->>'data_inicio' AS data, l.raw_data->>'distancia' AS distancia,
            l.raw_data->>'centro_custo' AS centro_custo
          FROM leads l LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL AND l.region_code=${region}
            AND l.raw_data->>'latitude_fim' IS NOT NULL AND (l.raw_data->>'latitude_fim')!=''`;
      } else if (dFrom) {
        rows = await sql`
          SELECT l.id, l.assigned_to, l.region_code, r.color AS region_color,
            (l.raw_data->>'latitude_fim')::FLOAT AS lat, (l.raw_data->>'longitude_fim')::FLOAT AS lon,
            l.raw_data->>'data_inicio' AS data, l.raw_data->>'distancia' AS distancia,
            l.raw_data->>'centro_custo' AS centro_custo
          FROM leads l LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL
            AND (l.raw_data->>'data_inicio')>=${dFrom} AND (l.raw_data->>'data_inicio')<${dTo}
            AND l.raw_data->>'latitude_fim' IS NOT NULL AND (l.raw_data->>'latitude_fim')!=''`;
      } else {
        rows = await sql`
          SELECT l.id, l.assigned_to, l.region_code, r.color AS region_color,
            (l.raw_data->>'latitude_fim')::FLOAT AS lat, (l.raw_data->>'longitude_fim')::FLOAT AS lon,
            l.raw_data->>'data_inicio' AS data, l.raw_data->>'distancia' AS distancia,
            l.raw_data->>'centro_custo' AS centro_custo
          FROM leads l LEFT JOIN regions r ON r.code=l.region_code
          WHERE l.assigned_to IS NOT NULL
            AND l.raw_data->>'latitude_fim' IS NOT NULL AND (l.raw_data->>'latitude_fim')!=''`;
      }
      return { statusCode:200, headers, body:JSON.stringify((rows||[]).filter(r=>r.lat&&r.lon&&r.lat!==0&&r.lon!==0)) };
    }

    // ── KPIs por região ────────────────────────────────────
    let stats;
    if (dFrom) {
      stats = await sql`
        SELECT l.region_code, r.label, r.color,
          COUNT(l.id) AS visitas, COUNT(DISTINCT l.assigned_to) AS executivos,
          ROUND(SUM(CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END)::NUMERIC,0) AS total_km
        FROM leads l LEFT JOIN regions r ON r.code=l.region_code
        WHERE l.assigned_to IS NOT NULL AND l.region_code IS NOT NULL
          AND (l.raw_data->>'data_inicio')>=${dFrom} AND (l.raw_data->>'data_inicio')<${dTo}
        GROUP BY l.region_code,r.label,r.color ORDER BY visitas DESC`;
    } else {
      stats = await sql`
        SELECT l.region_code, r.label, r.color,
          COUNT(l.id) AS visitas, COUNT(DISTINCT l.assigned_to) AS executivos,
          ROUND(SUM(CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END)::NUMERIC,0) AS total_km
        FROM leads l LEFT JOIN regions r ON r.code=l.region_code
        WHERE l.assigned_to IS NOT NULL AND l.region_code IS NOT NULL
        GROUP BY l.region_code,r.label,r.color ORDER BY visitas DESC`;
    }
    return { statusCode:200, headers, body:JSON.stringify(stats) };

  } catch(err) {
    console.error('get-ranking error:', err);
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) };
  }
};
