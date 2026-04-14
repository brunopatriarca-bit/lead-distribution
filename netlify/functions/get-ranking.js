// netlify/functions/get-ranking.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };

  const { region, view } = event.queryStringParameters || {};
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Ranking por executivo
    if (view === 'ranking') {
      const where = region ? sql`WHERE l.region_code = ${region} AND l.assigned_to IS NOT NULL` : sql`WHERE l.assigned_to IS NOT NULL`;

      const rows = await sql`
        SELECT
          l.assigned_to                                    AS nome,
          l.region_code,
          e.state_code,
          r.color,
          r.label                                          AS region_label,
          COUNT(l.id)                                      AS visitas,
          ROUND(SUM(
            CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\.[0-9]+)?$'
            THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END
          )::NUMERIC, 1)                                   AS total_km,
          COUNT(DISTINCT DATE_TRUNC('day', l.synced_at))   AS dias_ativos,
          MAX(l.synced_at)                                 AS ultima_visita
        FROM leads l
        LEFT JOIN executivos e ON UPPER(TRIM(l.assigned_to)) = e.nome
        LEFT JOIN regions r    ON r.code = l.region_code
        WHERE l.assigned_to IS NOT NULL
          ${region ? sql`AND l.region_code = ${region}` : sql``}
        GROUP BY l.assigned_to, l.region_code, e.state_code, r.color, r.label
        ORDER BY visitas DESC, total_km DESC
      `;
      return { statusCode:200, headers, body:JSON.stringify(rows) };
    }

    // Pontos do mapa por região (para colorir por executivo)
    if (view === 'mappoints') {
      const rows = await sql`
        SELECT
          l.id,
          l.assigned_to,
          l.region_code,
          r.color                                AS region_color,
          (l.raw_data->>'latitude_fim')::FLOAT   AS lat,
          (l.raw_data->>'longitude_fim')::FLOAT  AS lon,
          l.raw_data->>'data_inicio'             AS data,
          l.raw_data->>'distancia'               AS distancia,
          l.raw_data->>'centro_custo'            AS centro_custo,
          l.raw_data->>'desc_servico'            AS desc_servico
        FROM leads l
        LEFT JOIN regions r ON r.code = l.region_code
        WHERE l.assigned_to IS NOT NULL
          ${region ? sql`AND l.region_code = ${region}` : sql``}
          AND l.raw_data->>'latitude_fim'  IS NOT NULL
          AND l.raw_data->>'longitude_fim' IS NOT NULL
          AND l.raw_data->>'latitude_fim'  != ''
          AND l.raw_data->>'longitude_fim' != ''
      `;
      return { statusCode:200, headers, body:JSON.stringify(rows.filter(r => r.lat && r.lon && r.lat !== 0 && r.lon !== 0)) };
    }

    // KPIs gerais por região
    const stats = await sql`
      SELECT
        l.region_code,
        r.label, r.color,
        COUNT(l.id)                                       AS visitas,
        COUNT(DISTINCT l.assigned_to)                     AS executivos,
        ROUND(SUM(
          CASE WHEN l.raw_data->>'distancia' ~ '^[0-9]+(\.[0-9]+)?$'
          THEN (l.raw_data->>'distancia')::FLOAT ELSE 0 END
        )::NUMERIC, 0)                                    AS total_km
      FROM leads l
      LEFT JOIN regions r ON r.code = l.region_code
      WHERE l.assigned_to IS NOT NULL AND l.region_code IS NOT NULL
      GROUP BY l.region_code, r.label, r.color
      ORDER BY visitas DESC
    `;
    return { statusCode:200, headers, body:JSON.stringify(stats) };

  } catch(err) {
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) };
  }
};
