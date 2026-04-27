// netlify/functions/sync-leads.js
const { neon } = require('@neondatabase/serverless');

const PAYTRACK_URL   = process.env.PAYTRACK_BASE_URL;
const PAYTRACK_VIEW  = process.env.PAYTRACK_VIEW;
const PAYTRACK_DB    = process.env.PAYTRACK_DATABASE;
const PAYTRACK_LOGIN = process.env.PAYTRACK_LOGIN;
const PAYTRACK_SENHA = process.env.PAYTRACK_SENHA;

const STATE_TO_REGION = {
  GO:'GO', DF:'GO', MT:'GO', MS:'GO',
  PR:'SUL', SC:'SUL', RS:'SUL',
  AC:'NONE', AP:'NONE', AM:'NONE', PA:'NONE', RO:'NONE', RR:'NONE', TO:'NONE',
  AL:'NONE', BA:'NONE', CE:'NONE', MA:'NONE', PB:'NONE',
  PE:'NONE', PI:'NONE', RN:'NONE', SE:'NONE',
  SP:'SP', RJ:'RJ_ES', ES:'RJ_ES', MG:'MG',
};

const STATE_BOUNDS = [
  ['SP',-25.31,-19.78,-53.11,-44.16],['MG',-22.91,-14.24,-51.05,-39.85],
  ['RJ',-23.37,-20.76,-44.89,-40.96],['ES',-21.30,-17.87,-41.88,-39.69],
  ['PR',-26.72,-22.52,-54.62,-48.02],['SC',-29.35,-25.96,-53.84,-48.37],
  ['RS',-33.75,-27.08,-53.73,-49.69],['GO',-19.49,-12.40,-53.25,-45.93],
  ['DF',-16.05,-15.50,-48.28,-47.32],['MT',-18.04,-7.35,-61.63,-50.22],
  ['MS',-24.06,-17.16,-57.64,-50.92],['BA',-18.35,-8.54,-46.62,-37.34],
  ['SE',-11.57,-9.52,-38.24,-36.40],['AL',-10.50,-8.81,-38.24,-35.15],
  ['PE',-9.48,-7.42,-41.38,-34.86],['PB',-8.29,-6.02,-38.81,-34.79],
  ['RN',-6.99,-4.83,-38.58,-34.96],['CE',-7.85,-2.78,-41.40,-37.25],
  ['PI',-10.92,-2.75,-45.99,-40.35],['MA',-10.25,-1.02,-48.96,-41.84],
  ['TO',-13.46,-5.17,-50.74,-45.67],['PA',-9.85,2.59,-58.50,-46.02],
  ['AM',-9.81,2.25,-73.80,-56.10],['RO',-13.69,-7.97,-66.76,-59.76],
  ['AC',-11.14,-7.12,-73.99,-66.62],['RR',-5.27,5.27,-64.82,-58.89],
  ['AP',-1.24,4.44,-54.88,-49.88],
];

function coordsToState(lat, lon) {
  if (!lat||!lon||isNaN(lat)||isNaN(lon)) return null;
  for (const [uf,latMin,latMax,lonMin,lonMax] of STATE_BOUNDS) {
    if (lat>=latMin&&lat<=latMax&&lon>=lonMin&&lon<=lonMax) return uf;
  }
  return null;
}

function extractCoords(row) {
  let lat=null, lon=null;
  for (const f of ['latitude_inicio','lat','latitude','latitude_fim']) {
    const v=parseFloat(row[f]);
    if (row[f]!=null&&row[f]!==''&&!isNaN(v)&&v!==0) { lat=v; break; }
  }
  for (const f of ['longitude_inicio','lon','longitude','lng','longitude_fim']) {
    const v=parseFloat(row[f]);
    if (row[f]!=null&&row[f]!==''&&!isNaN(v)&&v!==0) { lon=v; break; }
  }
  return { lat, lon };
}

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function fetchPaytrack() {
  const url=`${PAYTRACK_URL}?view=${PAYTRACK_VIEW}&database=${PAYTRACK_DB}`;
  const credentials=Buffer.from(`${PAYTRACK_LOGIN}:${PAYTRACK_SENHA}`).toString('base64');
  const res=await fetch(url,{headers:{Authorization:`Basic ${credentials}`,Accept:'application/json'}});
  if (!res.ok) throw new Error(`Paytrack API error: ${res.status}`);
  const data=await res.json();
  return Array.isArray(data)?data:(data.data||data.rows||[]);
}

exports.handler = async (event) => {
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
  if (!['GET','POST'].includes(event.httpMethod))
    return {statusCode:405,headers,body:JSON.stringify({error:'Method not allowed'})};

  const sql=neon(process.env.DATABASE_URL);
  let logId;

  try {
    const [log]=await sql`INSERT INTO sync_logs (status) VALUES ('running') RETURNING id`;
    logId=log.id;

    const rows=await fetchPaytrack();
    let inserted=0,updated=0,matched=0;

    // ── Carregar cadastro de executivos (FONTE PRIMÁRIA de região) ──
    const execMap = {};
    const execRows = await sql`SELECT nome, region_code, state_code FROM executivos WHERE region_code IS NOT NULL`;
    for (const e of execRows) {
      execMap[e.nome.toUpperCase().trim()] = { region_code: e.region_code, state_code: e.state_code };
    }

    // ── Carregar leads Neoway geocodificados para cruzamento ──
    const neowayLeads=await sql`SELECT id,name,cnpj,lat,lon FROM neoway_leads WHERE lat IS NOT NULL AND lon IS NOT NULL`;

    for (const row of rows) {
      const externalId=String(row.id??row.id_relatorio??row.codigo??JSON.stringify(row).slice(0,60));

      const nomeColab=[
        String(row.nome_colaborador||'').trim(),
        String(row.sobrenome_colaborador||'').trim(),
      ].filter(Boolean).join(' ')||null;

      // ── REGIÃO: prioridade = cadastro de executivos ──
      // Só usa coordenadas se o executivo NÃO estiver cadastrado
      let regionCode=null, stateCode=null;

      if (nomeColab) {
        const execKey=nomeColab.toUpperCase().trim();
        if (execMap[execKey]) {
          // ✅ Executivo cadastrado → usa região do cadastro
          regionCode=execMap[execKey].region_code;
          stateCode=execMap[execKey].state_code;
        }
      }

      // Fallback: coordenadas (apenas se não achou no cadastro)
      if (!regionCode) {
        const {lat,lon}=extractCoords(row);
        stateCode=coordsToState(lat,lon);
        regionCode=stateCode?(STATE_TO_REGION[stateCode]||null):null;
      }

      // ── CRUZAMENTO com Neoway pelo destino da visita ──
      const latFim=parseFloat(row.latitude_fim||'0');
      const lonFim=parseFloat(row.longitude_fim||'0');
      let destinationName=null;

      if (latFim&&lonFim&&!isNaN(latFim)&&latFim!==0) {
        for (const lead of neowayLeads) {
          if (haversine(latFim,lonFim,lead.lat,lead.lon)<=2) {
            destinationName=lead.name;
            matched++;
            break;
          }
        }
      }

      const result=await sql`
        INSERT INTO leads (external_id,raw_data,state_code,region_code,assigned_to,destination_name,synced_at)
        VALUES (${externalId},${JSON.stringify(row)},${stateCode},${regionCode},${nomeColab},${destinationName},NOW())
        ON CONFLICT (external_id) DO UPDATE SET
          raw_data         = EXCLUDED.raw_data,
          state_code       = EXCLUDED.state_code,
          region_code      = EXCLUDED.region_code,
          assigned_to      = EXCLUDED.assigned_to,
          destination_name = EXCLUDED.destination_name,
          synced_at        = NOW()
        RETURNING (xmax=0) AS is_insert
      `;
      if (result[0]?.is_insert) inserted++; else updated++;
    }

    await sql`UPDATE sync_logs SET finished_at=NOW(),total_fetched=${rows.length},total_inserted=${inserted},total_updated=${updated},status='success' WHERE id=${logId}`;

    return {statusCode:200,headers,body:JSON.stringify({success:true,fetched:rows.length,inserted,updated,matched})};

  } catch(err) {
    console.error('sync-leads error:',err);
    if (logId) {const s=neon(process.env.DATABASE_URL);await s`UPDATE sync_logs SET finished_at=NOW(),error_msg=${err.message},status='error' WHERE id=${logId}`.catch(()=>{});}
    return {statusCode:500,headers,body:JSON.stringify({success:false,error:err.message})};
  }
};
