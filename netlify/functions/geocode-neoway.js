// netlify/functions/geocode-neoway.js
// Geocodifica endereços da Neoway via OpenStreetMap Nominatim (gratuito)
// e faz match de proximidade com visitas da Paytrack

const { neon } = require('@neondatabase/serverless');

async function geocodeAddress(address, city, state) {
  const query = [address, city, state, 'Brasil'].filter(Boolean).join(', ');
  const url   = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
  const res   = await fetch(url, {
    headers: { 'User-Agent': 'lead-distribution/1.0 (admin@omnilink.com.br)', 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(6000),
  });
  const data = await res.json();
  if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  // Fallback: só cidade + estado
  if (city) {
    const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent([city,state,'Brasil'].join(', '))}&format=json&limit=1&countrycodes=br`;
    const res2 = await fetch(url2, { headers: { 'User-Agent': 'lead-distribution/1.0', 'Accept-Language':'pt-BR' }, signal: AbortSignal.timeout(5000) });
    const d2   = await res2.json();
    if (d2?.length > 0) return { lat: parseFloat(d2[0].lat), lon: parseFloat(d2[0].lon) };
  }
  return null;
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };

  const { action, radius_km = '2', limit = '20' } = event.queryStringParameters || {};
  const sql = neon(process.env.DATABASE_URL);

  try {
    // ── GEOCODE: geocodifica leads sem coordenadas ──────────
    if (action === 'geocode') {
      const leads = await sql`
        SELECT id, name, address, city, state_code
        FROM neoway_leads
        WHERE lat IS NULL AND (address IS NOT NULL OR city IS NOT NULL)
        LIMIT ${parseInt(limit)}
      `;

      let done = 0, failed = 0;
      for (const lead of leads) {
        try {
          await new Promise(r => setTimeout(r, 1100)); // Nominatim: max 1 req/s
          const coords = await geocodeAddress(lead.address, lead.city, lead.state_code);
          if (coords) {
            await sql`UPDATE neoway_leads SET lat=${coords.lat}, lon=${coords.lon}, updated_at=NOW() WHERE id=${lead.id}`;
            done++;
          } else { failed++; }
        } catch { failed++; }
      }

      const remaining = await sql`SELECT COUNT(*) AS c FROM neoway_leads WHERE lat IS NULL AND (address IS NOT NULL OR city IS NOT NULL)`;
      return { statusCode:200, headers, body:JSON.stringify({ geocoded: done, failed, remaining: Number(remaining[0].c) }) };
    }

    // ── MATCH: cruza visitas Paytrack com leads Neoway por proximidade ──
    if (action === 'match') {
      const km = parseFloat(radius_km);
      // Busca leads com coordenadas ainda não visitados
      const nLeads = await sql`SELECT id, lat, lon, cnpj FROM neoway_leads WHERE lat IS NOT NULL AND status = 'novo'`;
      // Busca visitas com coordenadas
      const visits = await sql`
        SELECT id, assigned_to, synced_at,
          (raw_data->>'latitude_fim')::FLOAT  AS lat,
          (raw_data->>'longitude_fim')::FLOAT AS lon
        FROM leads
        WHERE raw_data->>'latitude_fim'  IS NOT NULL
          AND raw_data->>'latitude_fim'  != ''
          AND (raw_data->>'latitude_fim')::FLOAT != 0
      `;

      let matched = 0;
      for (const lead of nLeads) {
        for (const visit of visits) {
          if (!visit.lat || !visit.lon) continue;
          const dist = haversine(lead.lat, lead.lon, visit.lat, visit.lon);
          if (dist <= km) {
            await sql`
              UPDATE neoway_leads SET
                status     = 'visitado',
                visit_id   = ${visit.id},
                visited_at = ${visit.synced_at},
                updated_at = NOW()
              WHERE id = ${lead.id} AND status = 'novo'
            `;
            matched++;
            break; // primeira visita próxima já basta
          }
        }
      }

      return { statusCode:200, headers, body:JSON.stringify({ matched, radius_km: km }) };
    }

    // ── STATUS: quantos geocodificados / pendentes ──────────
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE lat IS NOT NULL)  AS geocodificados,
        COUNT(*) FILTER (WHERE lat IS NULL)      AS pendentes,
        COUNT(*) FILTER (WHERE status='visitado' OR status='vendido') AS visitados,
        COUNT(*) AS total
      FROM neoway_leads
    `;
    return { statusCode:200, headers, body:JSON.stringify(stats[0]) };

  } catch(err) {
    console.error('geocode-neoway error:', err);
    return { statusCode:500, headers, body:JSON.stringify({ error: err.message }) };
  }
};
