// netlify/functions/reset-neoway-status.js
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' };
  if (event.httpMethod !== 'POST') return { statusCode:405, headers, body:JSON.stringify({error:'Method not allowed'}) };

  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`
    UPDATE neoway_leads
    SET status='novo', visit_id=NULL, visited_at=NULL, updated_at=NOW()
    RETURNING id
  `;
  return { statusCode:200, headers, body:JSON.stringify({ success:true, reset: result.length }) };
};
