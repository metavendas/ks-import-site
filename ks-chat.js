/* =========================================================================
   KS IMPORT · Atendimento do site — DOIS canais, cantos opostos (v3, 31/08/2026)

     ESQUERDA  = Assistente KS  (chat hibrido: IA responde -> especialista assume
                 pelo CRM -> ponte para o WhatsApp dentro do painel)
     DIREITA   = WhatsApp       (vai direto para o WhatsApp automatizado, com a
                 pagina de origem no texto; registra so o evento em site_eventos)

   Vale igual no desktop e no mobile (no mobile os dois viram so o icone).
   Um arquivo so: as 39 paginas ja apontam para /ks-chat.js.
   Historico: _bak-ks-chat-widget-completo-2026-08-31.js (so chat, a direita)
              _bak-ks-chat-so-whats-2026-08-31.js        (so whatsapp, a esquerda)
   ========================================================================= */

/* =========================================================================
   KS IMPORT · Chat de Atendimento do site  (v1 — 26/07/2026)
   Padrão validado na KM Interiores, adaptado ao B2B técnico da KS.
   Híbrido: a IA responde na hora → quando esquenta, o especialista assume
   pelo CRM (chat ao vivo) → e há a ponte "Continuar no WhatsApp".
   Self-contained: injeta CSS + DOM. Basta <script src="/ks-chat.js" defer></script>
   ========================================================================= */
(function () {
  if (window.__ksChatLoaded) return;
  window.__ksChatLoaded = true;

  var API = "https://vbolwaskiquchzbbuzol.supabase.co/functions/v1/ks-chat-site";
  var LEAD = "https://vbolwaskiquchzbbuzol.supabase.co/functions/v1/ks-site-lead";
  var KEY = "sb_publishable_L1sdAGREymDnp5-jJHy2kg_fTCSC_rn";
  var WA = "5511912220088";

  /* ---------- estado (sobrevive à navegação entre páginas) ---------- */
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var vkey = LS.get("ks_vkey");
  if (!vkey) { vkey = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); LS.set("ks_vkey", vkey); }
  var conversaId = LS.get("ks_conv") || "";
  var since = "";
  var poller = null;
  var enviando = false;

  /* ---------- CSS ---------- */
  var css = document.createElement("style");
  css.textContent = [
    "#ksc-fab{position:fixed;left:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:9px;background:linear-gradient(135deg,#0E3F73,#1C6FB5 60%,#2BA8E0);color:#fff;border:0;border-radius:999px;padding:13px 20px;font:600 15px/1 Inter,system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(14,63,115,.42)}",
    "#ksc-fab .hx{width:15px;height:17px;background:#fff;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}",
    "#ksc-fab .dot{width:9px;height:9px;border-radius:50%;background:#3DDC84;box-shadow:0 0 0 3px rgba(61,220,132,.28)}",
    "#ksc-panel{position:fixed;left:20px;bottom:84px;z-index:2147483001;width:372px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#F8FAFC;border:1px solid #D7DCE2;border-radius:16px;box-shadow:0 26px 64px rgba(21,24,29,.3);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,Arial,sans-serif}",
    "#ksc-panel.open{display:flex}",
    ".ksc-h{background:#2B2F36;color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px}",
    ".ksc-h .hx{width:15px;height:17px;background:linear-gradient(135deg,#2BA8E0,#1C6FB5);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);flex:0 0 auto}",
    ".ksc-h b{font:600 15px/1.2 Saira,Inter,Arial,sans-serif;display:block}",
    ".ksc-h small{display:block;font-size:11.5px;color:#9FB3C8;margin-top:2px}",
    ".ksc-x{margin-left:auto;cursor:pointer;font-size:21px;line-height:1;opacity:.85;background:none;border:0;color:#fff}",
    "#ksc-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px}",
    ".ksc-b{max-width:86%;padding:10px 13px;border-radius:12px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}",
    ".ksc-ia{background:#fff;border:1px solid #E1E7EE;align-self:flex-start;border-bottom-left-radius:3px;color:#2B2F36}",
    ".ksc-at{background:#EAF4FD;border:1px solid #BEDDF6;align-self:flex-start;border-bottom-left-radius:3px;color:#123A5F}",
    ".ksc-me{background:#1C6FB5;color:#fff;align-self:flex-end;border-bottom-right-radius:3px}",
    ".ksc-sy{align-self:center;font-size:11.5px;color:#64748B;background:#EEF2F6;padding:5px 11px;border-radius:999px}",
    ".ksc-who{font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;color:#64748B;margin:0 0 3px}",
    ".ksc-pre{padding:14px;background:#fff;border-bottom:1px solid #E1E7EE}",
    ".ksc-pre p{margin:0 0 10px;font-size:13px;line-height:1.5;color:#475569}",
    ".ksc-pre input{width:100%;box-sizing:border-box;border:1px solid #D7DCE2;border-radius:9px;padding:9px 11px;font:14px Inter,Arial,sans-serif;margin-bottom:7px;background:#F8FAFC}",
    ".ksc-f{border-top:1px solid #E1E7EE;background:#fff;padding:10px}",
    ".ksc-row{display:flex;gap:7px}",
    ".ksc-row textarea{flex:1;resize:none;height:42px;border:1px solid #D7DCE2;border-radius:9px;padding:11px 12px;font:14px/1.35 Inter,Arial,sans-serif;background:#F8FAFC}",
    ".ksc-send{background:#1C6FB5;color:#fff;border:0;border-radius:9px;width:46px;font-size:16px;cursor:pointer}",
    ".ksc-send:disabled{opacity:.5;cursor:default}",
    ".ksc-wa{display:block;margin-top:8px;text-align:center;background:#25D366;color:#fff;text-decoration:none;border:0;width:100%;padding:11px;border-radius:9px;font:600 14px Inter,Arial,sans-serif;cursor:pointer}",
    ".ksc-lgpd{margin:8px 2px 0;font-size:10.5px;color:#94A3B8;line-height:1.45}",
    "@media(max-width:560px){#ksc-fab span.t{display:none}#ksc-fab{padding:14px;left:14px;bottom:14px}#ksc-panel{right:8px;left:8px;width:auto;bottom:76px}}"
  ].join("");
  document.head.appendChild(css);

  /* ---------- DOM ---------- */
  var fab = document.createElement("button");
  fab.id = "ksc-fab";
  fab.setAttribute("aria-label", "Falar com o atendimento da KS Import");
  fab.innerHTML = '<span class="hx"></span><span class="t">Assistente KS</span><span class="dot"></span>';

  var panel = document.createElement("div");
  panel.id = "ksc-panel";
  panel.innerHTML =
    '<div class="ksc-h"><span class="hx"></span><span><b>Atendimento KS Import</b><small id="ksc-st">Resposta imediata · ferramental e fixadores</small></span><button class="ksc-x" aria-label="Fechar">&times;</button></div>' +
    '<div class="ksc-pre" id="ksc-pre">' +
      '<p>Fale com a KS. Respondemos agora e um especialista assume quando precisar de preço, prazo ou desenho.</p>' +
      '<input id="ksc-nome" placeholder="Seu nome" autocomplete="name">' +
      '<input id="ksc-emp" placeholder="Empresa" autocomplete="organization">' +
      '<input id="ksc-ct" placeholder="WhatsApp ou e-mail (para retorno)" autocomplete="email">' +
      '<input id="ksc-hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
    '</div>' +
    '<div id="ksc-msgs"></div>' +
    '<div class="ksc-f">' +
      '<div class="ksc-row"><textarea id="ksc-in" placeholder="Ex.: preciso de punção DIN 965 M6, 2.000 pç" rows="1"></textarea><button class="ksc-send" id="ksc-send" aria-label="Enviar">&#10148;</button></div>' +
      '<button class="ksc-wa" id="ksc-wa">Continuar no WhatsApp</button>' +
      '<p class="ksc-lgpd">Ao enviar, você concorda que a KS Import use seus dados para retornar o contato comercial (LGPD).</p>' +
    '</div>';

  document.addEventListener("DOMContentLoaded", mount);
  if (document.readyState !== "loading") mount();
  function mount() {
    if (document.getElementById("ksc-fab")) return;
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    fab.addEventListener("click", toggle);
    panel.querySelector(".ksc-x").addEventListener("click", toggle);
    document.getElementById("ksc-send").addEventListener("click", enviar);
    document.getElementById("ksc-wa").addEventListener("click", irWhats);
    document.getElementById("ksc-in").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
  }

  /* ---------- helpers ---------- */
  function bolha(autor, texto) {
    var box = document.getElementById("ksc-msgs");
    if (autor === "sistema") {
      var s = document.createElement("div"); s.className = "ksc-sy"; s.textContent = texto;
      box.appendChild(s); box.scrollTop = box.scrollHeight; return s;
    }
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;align-self:" + (autor === "cliente" ? "flex-end" : "flex-start") + ";max-width:88%";
    if (autor === "ia" || autor === "atendente") {
      var w = document.createElement("p"); w.className = "ksc-who";
      w.textContent = autor === "ia" ? "Assistente KS" : "Especialista KS";
      wrap.appendChild(w);
    }
    var d = document.createElement("div");
    d.className = "ksc-b " + (autor === "cliente" ? "ksc-me" : autor === "atendente" ? "ksc-at" : "ksc-ia");
    d.textContent = texto;
    wrap.appendChild(d); box.appendChild(wrap); box.scrollTop = box.scrollHeight;
    return d;
  }
  function status(t) { var e = document.getElementById("ksc-st"); if (e) e.textContent = t; }
  function pagina() { return (location.pathname + location.search).slice(0, 200); }

  function toggle() {
    var open = panel.classList.toggle("open");
    if (open) {
      if (!document.getElementById("ksc-msgs").childNodes.length && !conversaId) {
        bolha("ia", "Olá. Aqui é a KS Import — ferramental para fábricas de fixadores e fixadores para a indústria (KS/ANSI/DIN/JIS/ISO).\n\nMe diga o que você precisa: item, norma, medida e quantidade. Se preferir, já pode deixar seu contato acima.");
      }
      if (conversaId && !poller) iniciarPoll();
      document.getElementById("ksc-in").focus();
    }
  }

  /* ---------- envio ---------- */
  function enviar() {
    var inp = document.getElementById("ksc-in");
    var txt = (inp.value || "").trim();
    if (!txt || enviando) return;
    if (document.getElementById("ksc-hp").value) return; // honeypot
    inp.value = ""; enviando = true;
    document.getElementById("ksc-send").disabled = true;
    bolha("cliente", txt);
    var esperando = bolha("ia", "…");

    var corpo, acao;
    if (!conversaId) {
      acao = "start";
      corpo = {
        acao: "start", vkey: vkey, corpo: txt,
        nome: (document.getElementById("ksc-nome").value || "").trim(),
        empresa: (document.getElementById("ksc-emp").value || "").trim(),
        contato: (document.getElementById("ksc-ct").value || "").trim(),
        pagina: pagina(), origem: "site"
      };
    } else {
      acao = "send";
      corpo = { acao: "send", vkey: vkey, conversa_id: conversaId, corpo: txt };
    }

    fetch(API, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (acao === "start" && j.conversa_id) {
          conversaId = j.conversa_id; LS.set("ks_conv", conversaId);
          var pre = document.getElementById("ksc-pre"); if (pre) pre.style.display = "none";
          iniciarPoll();
        }
        if (j.resposta) { esperando.textContent = j.resposta; }
        else if (j.aguardando_humano) {
          var wrap = esperando.parentNode; if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
          status("Especialista KS está no atendimento");
        }
        else { esperando.textContent = "Recebido. Um especialista da KS responde por aqui."; }
        if (j.escalar) status("Especialista KS acionado — responde em instantes");
        since = new Date().toISOString();
      })
      .catch(function () { esperando.textContent = "Falha de conexão. Tente novamente ou use o botão do WhatsApp."; })
      .then(function () { enviando = false; document.getElementById("ksc-send").disabled = false; });
  }

  /* ---------- polling (mensagens do atendente humano no CRM) ---------- */
  function iniciarPoll() {
    if (poller || !conversaId) return;
    poller = setInterval(function () {
      if (document.hidden) return;
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify({ acao: "poll", vkey: vkey, conversa_id: conversaId, since: since }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.mensagens) return;
          j.mensagens.forEach(function (m) {
            if (m.autor === "cliente") return;
            bolha(m.autor === "atendente" ? "atendente" : m.autor === "sistema" ? "sistema" : "ia", m.corpo);
            since = m.created_at;
          });
          if (j.modo === "humano") status("Especialista KS no atendimento");
        })
        .catch(function () {});
    }, 5000);
  }

  /* ---------- ponte para o WhatsApp ---------- */
  function irWhats() {
    var pad = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Ola, KS Import! Vim pelo site e quero falar sobre ferramental / fixadores.");
    try {
      fetch(LEAD, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify({ tipo: "clique_whatsapp", origem: pagina(), ref: "chat" }) });
    } catch (e) {}
    if (!conversaId) { window.open(pad, "_blank", "noopener"); return; }
    var w = window.open("", "_blank");
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify({ acao: "whatsapp", vkey: vkey, conversa_id: conversaId }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (w) w.location.href = j.link || pad; })
      .catch(function () { if (w) w.location.href = pad; });
    bolha("sistema", "Conversa levada para o WhatsApp da KS.");
  }
})();

/* =========================================================================
   KS IMPORT · MODULO 2 de 2 — botao do WhatsApp automatizado (canto DIREITO)
   v3 — 31/08/2026 (convive com o Assistente KS, que fica no canto ESQUERDO)

   POR QUE ASSIM: o WhatsApp da KS ja responde sozinho pela IA (Z-API +
   ks-zapi-webhook). Um segundo canal dentro do site dividia o atendimento
   e criava empresa+contato+lead novos a cada abertura de conversa. Aqui o
   clique registra apenas o EVENTO em site_eventos (ks-site-lead) e leva o
   visitante para o WhatsApp com a pagina de origem no texto — o CRM nao
   ganha nenhuma linha duplicada.

   O widget completo de chat (IA + atendente ao vivo) esta preservado em
   _bak-ks-chat-widget-completo-2026-08-31.js — basta restaurar para voltar.
   Self-contained: injeta CSS + DOM. <script src="/ks-chat.js" defer></script>
   ========================================================================= */
(function () {
  if (window.__ksWhatsLoaded) return;
  window.__ksWhatsLoaded = true;

  var LEAD = "https://vbolwaskiquchzbbuzol.supabase.co/functions/v1/ks-site-lead";
  var KEY  = "sb_publishable_L1sdAGREymDnp5-jJHy2kg_fTCSC_rn";
  var WA   = "5511912220088";

  /* ---------- contexto da pagina (vai junto no texto do WhatsApp) ---------- */
  function pagina() { return (location.pathname + location.search).slice(0, 200); }
  function contexto() {
    /* 1) ORIGEM da pagina (mesma string que ja vai no lead do formulario) */
    try { if (typeof ORIGEM !== "undefined" && ORIGEM) return String(ORIGEM).slice(0, 80); } catch (e) {}
    /* 2) sem ORIGEM: usa o slug da URL. Na home nao manda contexto nenhum,
          para o texto nao virar a frase de marketing do H1. */
    try {
      var s = location.pathname.replace(/\.html?$/i, "").replace(/^\/+|\/+$/g, "");
      if (!s || s === "index") return "";
      s = s.split("/").pop().replace(/[-_]+/g, " ").trim();
      if (s) return s.charAt(0).toUpperCase() + s.slice(1, 60);
    } catch (e) {}
    return "";
  }


  /* ---------- CSS ---------- */
  var css = document.createElement("style");
  css.textContent = [
    "#ksw-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:9px;",
      "background:linear-gradient(135deg,#25D366,#1EBE5D 55%,#128C7E);color:#fff;border:0;border-radius:999px;",
      "padding:13px 20px 13px 16px;font:600 15px/1 Inter,system-ui,Arial,sans-serif;cursor:pointer;",
      "box-shadow:0 10px 30px rgba(18,140,126,.42);transition:transform .15s ease,box-shadow .15s ease}",
    "#ksw-fab:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(18,140,126,.5)}",
    "#ksw-fab:focus-visible{outline:3px solid #0E3F73;outline-offset:3px}",
    "#ksw-fab svg{width:22px;height:22px;flex:0 0 auto;fill:#fff}",
    "#ksw-tip{position:fixed;right:20px;bottom:82px;z-index:2147483000;max-width:262px;background:#fff;color:#2B2F36;",
      "border:1px solid #D7DCE2;border-radius:14px;padding:12px 34px 12px 14px;",
      "font:400 13.5px/1.45 Inter,system-ui,Arial,sans-serif;box-shadow:0 16px 40px rgba(21,24,29,.18);",
      "display:none;cursor:pointer}",
    "#ksw-tip b{display:block;font-weight:600;color:#0E3F73;margin-bottom:2px}",
    "#ksw-tipx{position:absolute;top:6px;right:8px;background:none;border:0;font-size:17px;line-height:1;",
      "color:#8A9199;cursor:pointer;padding:2px 4px}",
    "@media(max-width:560px){#ksw-fab span.t{display:none}#ksw-fab{padding:14px;right:14px;bottom:14px}",
      "#ksw-tip{right:14px;bottom:76px;max-width:min(262px,calc(100vw - 84px))}}",
    "@media(prefers-reduced-motion:reduce){#ksw-fab{transition:none}}"
  ].join("");
  document.head.appendChild(css);

  var ICONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z"/></svg>';

  /* ---------- DOM ---------- */
  var fab = document.createElement("button");
  fab.id = "ksw-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Atendimento online da KS Import pelo WhatsApp");
  fab.innerHTML = ICONE + '<span class="t">WhatsApp</span>';

  var tip = document.createElement("div");
  tip.id = "ksw-tip";
  tip.setAttribute("role", "note");
  tip.innerHTML = '<b>WhatsApp da KS Import</b>Prefere resolver por WhatsApp? Mande a norma e a medida — a KS responde em segundos.' +
                  '<button id="ksw-tipx" type="button" aria-label="Fechar aviso">&times;</button>';

  function montar() {
    document.body.appendChild(fab);
    document.body.appendChild(tip);
    var visto = false;
    try { visto = sessionStorage.getItem("ks_wa_tip") === "1"; } catch (e) {}
    if (!visto) {
      setTimeout(function () {
        /* se o visitante ja clicou no botao antes dos 4s, nao mostrar o balao */
        var jaFoi = false; try { jaFoi = sessionStorage.getItem("ks_wa_tip") === "1"; } catch (e) {}
        if (!jaFoi) tip.style.display = "block";
      }, 4000);
      setTimeout(function () { tip.style.display = "none"; }, 16000);
    }
  }
  if (document.body) montar();
  else document.addEventListener("DOMContentLoaded", montar);

  /* ---------- acao ---------- */
  function fecharTip() {
    tip.style.display = "none";
    try { sessionStorage.setItem("ks_wa_tip", "1"); } catch (e) {}
  }

  function irWhats(ref) {
    var ctx = contexto();
    var txt = "Olá, KS Import! Vim pelo site" + (ctx ? " (" + ctx + ")" : "") +
              " e quero falar sobre ferramental / fixadores.";
    var url = "https://wa.me/" + WA + "?text=" + encodeURIComponent(txt);
    /* registra so o EVENTO (site_eventos). Nao cria lead/empresa/contato. */
    try {
      fetch(LEAD, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY },
        body: JSON.stringify({ tipo: "clique_whatsapp", origem: pagina(), ref: ref })
      });
    } catch (e) {}
    fecharTip();
    window.open(url, "_blank", "noopener");
  }

  fab.addEventListener("click", function () { irWhats("fab_esquerda"); });
  tip.addEventListener("click", function (ev) {
    if (ev.target && ev.target.id === "ksw-tipx") { ev.stopPropagation(); fecharTip(); return; }
    irWhats("balao_esquerda");
  });
})();
