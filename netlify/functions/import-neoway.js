// netlify/functions/import-neoway.js
const { neon } = require('@neondatabase/serverless');

const STATE_TO_REGION = {
  GO:'GO', DF:'GO', MT:'GO', MS:'GO',
  PR:'SUL', SC:'SUL', RS:'SUL',
  AC:'NONE', AP:'NONE', AM:'NONE', PA:'NONE', RO:'NONE', RR:'NONE', TO:'NONE',
  AL:'NONE', BA:'NONE', CE:'NONE', MA:'NONE', PB:'NONE',
  PE:'NONE', PI:'NONE', RN:'NONE', SE:'NONE',
  SP:'SP', RJ:'RJ_ES', ES:'RJ_ES', MG:'MG',
};

const UF_NAMES = {
  'ACRE':'AC','ALAGOAS':'AL','AMAPÁ':'AP','AMAZONAS':'AM','BAHIA':'BA',
  'CEARÁ':'CE','DISTRITO FEDERAL':'DF','ESPÍRITO SANTO':'ES','GOIÁS':'GO',
  'MARANHÃO':'MA','MATO GROSSO':'MT','MATO GROSSO DO SUL':'MS',
  'MINAS GERAIS':'MG','PARÁ':'PA','PARAÍBA':'PB','PARANÁ':'PR',
  'PERNAMBUCO':'PE','PIAUÍ':'PI','RIO DE JANEIRO':'RJ',
  'RIO GRANDE DO NORTE':'RN','RIO GRANDE DO SUL':'RS','RONDÔNIA':'RO',
  'RORAIMA':'RR','SANTA CATARINA':'SC','SÃO PAULO':'SP','SERGIPE':'SE','TOCANTINS':'TO',
};

function normalizeUF(val) {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (s.length === 2 && STATE_TO_REGION[s]) return s;
  return UF_NAMES[s] || null;
}

function cleanCNPJ(v) {
  if (!v) return null;
  return String(v).replace(/\D/g, '').slice(0, 14) || null;
}

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers, body:'' };
  if (event.httpMethod !== 'POST') return { statusCode:405, headers, body:JSON.stringify({error:'Method not allowed'}) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode:400, headers, body:JSON.stringify({error:'JSON inválido'}) }; }

  const { rows, ufColumn, nameColumn, cnpjColumn, cityColumn, addressColumn } = body;
  if (!rows?.length) return { statusCode:400, headers, body:JSON.stringify({error:'Nenhuma linha enviada'}) };

  const sql = neon(process.env.DATABASE_URL);
  let inserted = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    try {
      // Detectar campos
      const ufRaw   = ufColumn      ? row[ufColumn]      : (row['UF']||row['uf']||row['Estado']||row['estado']);
      const nameRaw = nameColumn    ? row[nameColumn]    : (row['Razão Social']||row['razao_social']||row['Nome']||row['RAZÃO SOCIAL']||row['nome']);
      const cnpjRaw = cnpjColumn    ? row[cnpjColumn]    : (row['CNPJ']||row['cnpj']||row['CPF']||row['cpf']);
      const cityRaw = cityColumn    ? row[cityColumn]    : (row['Cidade']||row['cidade']||row['MUNICIPIO']||row['Municipio']);
      const addrRaw = addressColumn ? row[addressColumn] : (row['Endereço']||row['endereco']||row['Logradouro']||row['logradouro']);

      const stateCode  = normalizeUF(ufRaw);
      const regionCode = stateCode ? (STATE_TO_REGION[stateCode] || null) : null;
      const cnpj       = cleanCNPJ(cnpjRaw);
      const name       = nameRaw ? String(nameRaw).trim().slice(0, 200) : null;
      const city       = cityRaw ? String(cityRaw).trim().slice(0, 100) : null;
      const address    = addrRaw ? String(addrRaw).trim().slice(0, 500) : null;
      const externalId = cnpj ? `neoway_${cnpj}` : `neoway_${name || JSON.stringify(row).slice(0,40)}`;

      const result = await sql`
        INSERT INTO neoway_leads
          (external_id, raw_data, name, cnpj, state_code, region_code, city, address, created_at)
        VALUES
          (${externalId}, ${JSON.stringify(row)}, ${name}, ${cnpj},
           ${stateCode}, ${regionCode}, ${city}, ${address}, NOW())
        ON CONFLICT (external_id) DO UPDATE SET
          raw_data    = EXCLUDED.raw_data,
          name        = EXCLUDED.name,
          state_code  = EXCLUDED.state_code,
          region_code = EXCLUDED.region_code,
          city        = EXCLUDED.city,
          address     = EXCLUDED.address,
          updated_at  = NOW()
        RETURNING (xmax = 0) AS is_insert
      `;
      if (result[0]?.is_insert) inserted++; else updated++;
    } catch { skipped++; }
  }

  return { statusCode:200, headers, body:JSON.stringify({ success:true, inserted, updated, skipped, total:rows.length }) };
};
