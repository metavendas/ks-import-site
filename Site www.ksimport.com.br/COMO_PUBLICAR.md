# Publicar o site da KS na Vercel (GitHub + Vercel)
*Pasta pronta: `index.html` (site) + `vercel.json` (headers de segurança). Siga 3 etapas.
Governança: IA propõe → Edson aprova. Você executa o login; eu acompanho/verifico.*

## Etapa 1 — Criar o repositório no GitHub (5 min)
1. Acesse github.com → **New repository**.
2. Nome: `ks-import-site` · visibilidade **Private** · marque **Add a README** → **Create**.
3. No repositório → botão **Add file → Upload files**.
4. Arraste os 2 arquivos desta pasta: **`index.html`** e **`vercel.json`**.
5. **Commit changes**.

> Sem conta GitHub? Crie em github.com (grátis). Me avise se quiser que eu te guie pelo navegador.

## Etapa 2 — Importar na Vercel (3 min)
1. Acesse vercel.com → entre **com o GitHub** (Continue with GitHub).
2. **Add New… → Project** → **Import** o repositório `ks-import-site`.
3. Framework Preset: **Other** (é site estático, sem build). **Deploy**.
4. Em ~30s a Vercel dá uma URL `*.vercel.app` — o site no ar.

## Etapa 3 — Apontar o domínio ksimport.com.br (10 min)
1. No projeto Vercel → **Settings → Domains** → adicionar `ksimport.com.br` e `www.ksimport.com.br`.
2. A Vercel mostra os registros DNS. Recomendado: usar **Cloudflare** como DNS:
   - registro.br → alterar servidores DNS para os do Cloudflare.
   - No Cloudflare → adicionar os registros que a Vercel pediu (A/CNAME), proxy ON.
3. Aguardar propagação (minutos a algumas horas). SSL é automático.

## Depois (eu cuido)
- A cada atualização do site, basta novo **Upload files** no GitHub → a Vercel **republica sozinha**.
- Migro a versão temporária (Supabase) para a Vercel e desativo a provisória.
- Ligo o formulário de cotação do site ao CRM.

**Me avise quando o repositório existir** (ou se quiser que eu conduza pelo navegador com a extensão Claude in Chrome) — eu verifico o deploy pelo conector da Vercel.
