// netlify/functions/fetch-cnpj.js
// Consulta CNPJ na BrasilAPI (Receita Federal) — gratuita, sem auth

const { neon } = require('@neondatabase/serverless');

function cleanCNPJ(v) {
  return String(v || '').replace(/\D/g, '');
}

async function fetchCNPJ(cnpj) {
  const clean = cleanCNPJ(cnpj).padStart(14, '0');
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'lead-distribution/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CNPJ ${cnpj}: ${res.status}`);
  return res.json();
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const { cnpj, id, save } = event.queryStringParameters || {};
  if (!cnpj) return { statusCode: 400, headers, body: JSON.stringify({ error: 'CNPJ obrigatório' }) };

  try {
    const data = await fetchCNPJ(cnpj);

    // Monta endereço completo
    const parts = [
      data.logradouro,
      data.numero && data.numero !== '0' ? `Nº ${data.numero}` : '',
      data.complemento || '',
      data.bairro || '',
      data.municipio || '',
      data.uf || '',
      data.cep ? `CEP ${data.cep}` : '',
    ].filter(Boolean);
    const fullAddress = parts.join(', ');

    const result = {
      razao_social:  data.razao_social  || '',
      nome_fantasia: data.nome_fantasia || '',
      situacao:      data.descricao_situacao_cadastral || '',
      cnpj:          data.cnpj          || cnpj,
      logradouro:    data.logradouro    || '',
      numero:        data.numero        || '',
      complemento:   data.complemento  || '',
      bairro:        data.bairro        || '',
      municipio:     data.municipio     || '',
      uf:            data.uf            || '',
      cep:           data.cep           || '',
      telefone:      data.ddd_telefone_1 || '',
      email:         data.email         || '',
      full_address:  fullAddress,
      porte:         data.porte         || '',
      natureza:      data.natureza_juridica || '',
      cnae:          data.cnae_fiscal_descricao || '',
    };

    // Se pediu para salvar no banco (id do neoway_lead fornecido)
    if (save === 'true' && id) {
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        UPDATE neoway_leads SET
          address    = ${fullAddress},
          city       = ${data.municipio || null},
          state_code = ${data.uf        || null},
          name       = COALESCE(NULLIF(name,''), ${data.razao_social || null}),
          updated_at = NOW()
        WHERE id = ${parseInt(id)}
      `;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: result }) };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
