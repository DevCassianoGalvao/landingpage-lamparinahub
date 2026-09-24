/*
 * Rastreamento leve: UTMs + eventos personalizados do Meta Pixel.
 * Eventos: cta_click, form_start, form_error, form_submit_success,
 * thank_you_view, whatsapp_click, vsl_play. (PageView = lp_view, já disparado pelo Pixel.)
 * Nenhum dado pessoal é enviado ao Pixel nem colocado em URL.
 */
(function () {
  "use strict";

  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  var UTM_STORE = "lh_utm";

  function get(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function set(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) {}
  }
  function del(key) {
    try { window.sessionStorage.removeItem(key); } catch (e) {}
  }

  // guarda os parâmetros de campanha da URL para enviar junto com o cadastro
  function captureUTM() {
    try {
      var params = new URLSearchParams(window.location.search);
      var found = {};
      var any = false;
      UTM_KEYS.forEach(function (k) {
        var v = params.get(k);
        if (v) { found[k] = v.slice(0, 200); any = true; }
      });
      if (any) set(UTM_STORE, JSON.stringify(found));
    } catch (e) {}
  }

  function getUTM() {
    try { return JSON.parse(get(UTM_STORE) || "{}"); } catch (e) { return {}; }
  }

  function track(name, params) {
    try {
      if (typeof window.fbq === "function") window.fbq("trackCustom", name, params || {});
    } catch (e) {}
  }

  window.lhTrack = { track: track, getUTM: getUTM, get: get, set: set, del: del };
  captureUTM();
})();
