# Lead Distribution — Guia de Deploy
## Paytrack · Neon · Cloudflare · Netlify

---

## PASSO 1 — Neon DB (banco de dados)

1. Acesse https://console.neon.tech e crie uma conta gratuita
2. Crie um projeto: **lead-distribution** → região **US East** ou **São Paulo**
3. Copie a **Connection String** (formato: `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`)
4. No painel Neon, abra o **SQL Editor** e execute o arquivo:
   ```
   database/schema.sql
   ```
   Isso cria todas as tabelas, índices e views necessárias.

---

## PASSO 2 — GitHub (repositório)

```bash
# Na sua máquina, dentro da pasta lead-distribution:
git init
git add .
git commit -m "feat: initial lead distribution system"

# Crie um repositório no GitHub e conecte:
git remote add origin https://github.com/SEU_USUARIO/lead-distribution.git
git branch -M main
git push -u origin main
```

---

## PASSO 3 — Netlify (deploy + functions)

1. Acesse https://app.netlify.com → **Add new site** → **Import from Git**
2. Selecione o repositório `lead-distribution`
3. Configurações de build (já estão no `netlify.toml`, mas confirme):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`

4. Vá em **Site settings → Environment variables** e adicione:

   | Variável               | Valor                                      |
   |------------------------|--------------------------------------------|
   | `DATABASE_URL`         | sua connection string do Neon              |
   | `PAYTRACK_BASE_URL`    | `https://data-provider.paytrack.com.br/data` |
   | `PAYTRACK_VIEW`        | `view_omnilink_despesas_quilometragem`      |
   | `PAYTRACK_DATABASE`    | `paytrack_omnilink`                        |
   | `PAYTRACK_LOGIN`       | `9ee57ca6637642b2b200f95c68c0ae5d`         |
   | `PAYTRACK_SENHA`       | `97d7e07874f343e1bbf7b2b61def0fee`         |
   | `VITE_API_URL`         | `/.netlify/functions`                      |

5. Clique em **Deploy site** — o Netlify vai buildar e publicar automaticamente.

---

## PASSO 4 — Cloudflare (DNS + CDN)

1. Acesse https://dash.cloudflare.com → **Add a site**
2. Digite seu domínio (ex: `leads.suaempresa.com.br`)
3. Selecione plano **Free**
4. Nos nameservers do seu registrador (Registro.br, GoDaddy, etc.), troque para os nameservers do Cloudflare
5. No painel Cloudflare → **DNS → Add record**:
   ```
   Type:  CNAME
   Name:  leads          (ou @ para domínio raiz)
   Value: SEU-SITE.netlify.app
   Proxy: ✅ (laranja — CDN ativo)
   TTL:   Auto
   ```
6. Em **SSL/TLS** → selecione **Full (strict)**
7. Em **Speed → Optimization** → ative **Auto Minify** e **Brotli**

---

## PASSO 5 — Domínio customizado no Netlify

1. No Netlify → **Domain settings → Add custom domain**
2. Digite: `leads.suaempresa.com.br`
3. O Netlify detecta o Cloudflare automaticamente
4. Ative **Force HTTPS**

---

## PASSO 6 — Sincronização automática (opcional)

Para sincronizar a Paytrack automaticamente a cada hora:

Crie o arquivo `netlify/functions/sync-scheduled.js`:

```javascript
const { handler } = require('./sync-leads');

// Netlify Scheduled Function — executa a cada 1 hora
exports.handler = async (event) => {
  return handler({ ...event, httpMethod: 'POST' });
};

// Configuração do schedule (adicione também no netlify.toml):
// [functions."sync-scheduled"]
//   schedule = "0 * * * *"
```

E no `netlify.toml` adicione:
```toml
[functions."sync-scheduled"]
  schedule = "0 * * * *"
```

---

## PASSO 7 — Teste local

```bash
# Instale as dependências
npm install

# Copie o arquivo de ambiente
cp .env.example .env
# Edite .env com suas credenciais reais

# Rode com Netlify CLI (recomendado — functions funcionam)
npm install -g netlify-cli
netlify dev

# Ou rode só o frontend (sem functions)
npm run dev
```

---

## Arquitetura de URLs

| Rota no app          | Netlify Function         | Descrição                      |
|----------------------|--------------------------|--------------------------------|
| `/`                  | —                        | Dashboard com KPIs             |
| `/leads`             | `get-leads`              | Tabela filtrada de leads       |
| `/regioes`           | —                        | Mapa de regiões e estados      |
| `/sync`              | `sync-leads`             | Dispara sync manual            |
| `GET /api/get-leads` | `get-leads.js`           | API: listar leads              |
| `PATCH /api/update-lead` | `update-lead.js`     | API: atualizar lead            |
| `POST /api/sync-leads`   | `sync-leads.js`      | API: sincronizar Paytrack      |

---

## Regiões configuradas

| Código  | Label           | Estados                                              |
|---------|-----------------|------------------------------------------------------|
| GO      | Goiás           | GO, DF, MT, MS                                       |
| SUL     | Sul             | PR, SC, RS                                           |
| NONE    | Norte/Nordeste  | AM, PA, AC, RO, RR, AP, TO, MA, PI, CE, RN, PB, PE, AL, SE, BA |
| SP      | São Paulo       | SP                                                   |
| RJ_ES   | RJ / ES         | RJ, ES                                               |
| MG      | Minas Gerais    | MG                                                   |

---

## Troubleshooting

**"Paytrack retorna array vazio"**
→ Verifique se o campo de estado (UF) existe no JSON retornado. Abra o Neon SQL Editor e rode:
```sql
SELECT raw_data FROM leads LIMIT 1;
```
Veja os campos disponíveis e ajuste a função `extractState()` em `sync-leads.js` com o nome correto do campo.

**"DATABASE_URL connection refused"**
→ Certifique-se de usar a connection string com `?sslmode=require` ao final.

**"Functions retornam 404"**
→ Confirme que o diretório `netlify/functions` está configurado no `netlify.toml` e que o build foi feito após as mudanças.
