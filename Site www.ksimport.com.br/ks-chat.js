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
    "#ksc-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:9px;background:linear-gradient(135deg,#0E3F73,#1C6FB5 60%,#2BA8E0);color:#fff;border:0;border-radius:999px;padding:13px 20px;font:600 15px/1 Inter,system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(14,63,115,.42)}",
    "#ksc-fab .hx{width:15px;height:17px;background:#fff;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}",
    "#ksc-fab .dot{width:9px;height:9px;border-radius:50%;background:#3DDC84;box-shadow:0 0 0 3px rgba(61,220,132,.28)}",
    "#ksc-panel{position:fixed;right:20px;bottom:84px;z-index:2147483001;width:372px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#F8FAFC;border:1px solid #D7DCE2;border-radius:16px;box-shadow:0 26px 64px rgba(21,24,29,.3);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,Arial,sans-serif}",
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
    "@media(max-width:560px){#ksc-fab span.t{display:none}#ksc-fab{padding:14px;right:14px;bottom:14px}#ksc-panel{right:8px;left:8px;width:auto;bottom:76px}}"
  ].join("");
  document.head.appendChild(css);

  /* ---------- DOM ---------- */
  var fab = document.createElement("button");
  fab.id = "ksc-fab";
  fab.setAttribute("aria-label", "Falar com o atendimento da KS Import");
  fab.innerHTML = '<span class="hx"></span><span class="t">Atendimento KS</span><span class="dot"></span>';

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
