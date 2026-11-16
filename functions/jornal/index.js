// Ponte do Jornal KS no Cloudflare Pages (substitui api/jornal.js da Vercel, migrado em 16/11/2026).
// POR QUE EXISTE: o gateway das Edge Functions do Supabase devolve text/plain + CSP sandbox;
// aqui a resposta e reemitida como text/html (ou XML no sitemap) para o navegador renderizar.
// Geolocalizacao vem do proprio Cloudflare (request.cf), sem servico de terceiro.
const BASE = 'https://vbolwaskiquchzbbuzol.supabase.co/functions/v1/ks-jornal';
const g = v => String(v || '').slice(0, 80);

async function proxyJornal(request, extraQs) {
  const u = new URL(request.url);
  let qs = u.search;
  if (extraQs) qs = qs ? qs + '&' + extraQs : '?' + extraQs;
  const cf = request.cf || {};
  const h = request.headers;
  try {
    const r = await fetch(BASE + qs, {
      headers: {
        'user-agent': h.get('user-agent') || '',
        'x-forwarded-for': h.get('cf-connecting-ip') || h.get('x-forwarded-for') || '',
        'accept-language': h.get('accept-language') || '',
        'x-geo-cidade': g(cf.city),
        'x-geo-uf': g(cf.regionCode),
        'x-geo-pais': g(cf.country)
      }
    });
    const body = await r.text();
    const xml = qs.includes('sitemap');
    return new Response(body, {
      status: r.status,
      headers: {
        'Content-Type': xml ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8',
        // HTML sem cache: cada leitura precisa chegar a Edge para ser contada. Sitemap em cache.
        'Cache-Control': xml ? 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400'
                             : 'public, max-age=0, s-maxage=0, must-revalidate',
        'X-Robots-Tag': 'index, follow'
      }
    });
  } catch (e) {
    return new Response('<!doctype html><meta charset="utf-8"><title>Jornal KS</title><p style="font:16px system-ui;padding:40px">O Jornal KS esta temporariamente indisponivel. Tente novamente em instantes.</p>',
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
export const onRequestGet = ({ request }) => proxyJornal(request);
