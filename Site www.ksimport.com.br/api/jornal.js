// Ponte do Jornal KS: a Vercel serve o HTML com o Content-Type certo.
// POR QUE ISSO EXISTE: o gateway das Edge Functions em *.supabase.co devolve
// "content-type: text/plain", "x-content-type-options: nosniff" e
// "content-security-policy: default-src 'none'; sandbox" — e um rewrite simples
// repassa esses cabecalhos, entao o navegador mostra o codigo em vez da pagina.
// Aqui a resposta e reemitida com text/html; charset=utf-8 e sem o CSP sandbox.
export default async function handler(req, res) {
  const BASE = 'https://vbolwaskiquchzbbuzol.supabase.co/functions/v1/ks-jornal';
  const i = req.url.indexOf('?');
  const qs = i >= 0 ? req.url.slice(i) : '';
  try {
    const r = await fetch(BASE + qs, {
      headers: {
        // repassa quem esta lendo, senao todo acesso vira o IP da Vercel
        'user-agent': req.headers['user-agent'] || '',
        'x-forwarded-for': req.headers['x-forwarded-for'] || '',
        'accept-language': req.headers['accept-language'] || ''
      }
    });
    const body = await r.text();
    const xml = qs.includes('sitemap');
    res.setHeader('Content-Type', xml ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400');
    res.setHeader('X-Robots-Tag', 'index, follow');
    return res.status(r.status).send(body);
  } catch (e) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(502).send('<!doctype html><meta charset="utf-8"><title>Jornal KS</title><p style="font:16px system-ui;padding:40px">O Jornal KS esta temporariamente indisponivel. Tente novamente em instantes.</p>');
  }
}
