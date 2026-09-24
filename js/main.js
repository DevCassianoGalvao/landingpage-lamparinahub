document.addEventListener("DOMContentLoaded", () => {
  const T = window.lhTrack || { track() {}, getUTM: () => ({}), set() {}, get: () => null };
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // 1. ENTRANCE ANIMATIONS FOR CARDS (o conteúdo de texto da hero NÃO depende de animação)
  if (hasGsap && !prefersReducedMotion) {
    gsap.from(".diagnostic-card", {
      scrollTrigger: { trigger: ".cards-grid", start: "top 85%" },
      y: 40, opacity: 0, duration: 0.8, stagger: 0.15, ease: "power2.out"
    });
    gsap.from(".deliverable-card", {
      scrollTrigger: { trigger: ".steps-grid", start: "top 85%" },
      y: 40, opacity: 0, duration: 0.8, stagger: 0.15, ease: "power2.out"
    });
  }

  // 2. READING PROGRESS BAR
  const progress = document.querySelector(".read-progress");
  if (progress) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + "%";
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  // 3. BUTTON MAGNETIC HOVER
  if (hasGsap && !isTouch) {
    document.querySelectorAll(".magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        gsap.to(btn, {
          x: (x - rect.width / 2) * 0.2,
          y: (y - rect.height / 2) * 0.2,
          duration: 0.3,
          ease: "power2.out"
        });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
      });
    });
  }

  // 4. CARD SPOTLIGHT
  document.querySelectorAll(".spotlight-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });

  // 5. SCROLL CIRCLE (divisor da hero)
  document.querySelectorAll(".scroll-circle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const divider = btn.closest(".section-divider");
      const next = divider ? divider.nextElementSibling : null;
      if (next) next.scrollIntoView({ behavior: "smooth" });
    });
  });

  // 6. VÍDEOS (VSL e depoimentos): o player só carrega depois do clique (poster leve, espaço reservado)
  document.querySelectorAll(".vsl, .proof-video").forEach((box) => {
    const facade = box.querySelector(".vsl-facade, .proof-facade");
    const id = box.dataset.videoId;
    if (!facade || !id) return;
    facade.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&color=white`;
      iframe.title = box.dataset.title || "Vídeo: Entenda o que vamos analisar na sua sessão";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.frameBorder = "0";
      box.replaceChild(iframe, facade);
      T.track(box.classList.contains("vsl") ? "vsl_play" : "proof_play", { video_id: id });
    });
  });

  // 7. RASTREAMENTO DE CLIQUES (posição do CTA / WhatsApp)
  document.querySelectorAll("[data-cta]").forEach((el) => {
    if (el.tagName === "BUTTON") return; // o botão de envio é medido no fluxo do formulário
    el.addEventListener("click", () => T.track("cta_click", { position: el.dataset.cta }));
  });
  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.addEventListener("click", () => T.track("whatsapp_click", { position: el.dataset.wa }));
  });

  // 8. FORMULÁRIO
  const form = document.getElementById("lead-form");
  if (!form) return;

  // Se o PHP estiver em outro domínio, troque pela URL completa,
  // ex: "https://api.seudominio.com.br/enviar.php"
  const FORM_ENDPOINT = "enviar.php";

  const statusEl = form.querySelector(".form-status");
  const submitBtn = form.querySelector("button[type=submit]");
  const btnText = submitBtn.querySelector(".btn-text");
  const originalLabel = btnText.textContent;
  let started = false;
  let submitting = false;

  const setStatus = (msg, kind) => {
    statusEl.textContent = msg || "";
    statusEl.className = "form-status" + (kind ? " is-" + kind : "");
  };

  // máscara do WhatsApp: (93) 99999-9999
  const phone = form.querySelector("#whatsapp");
  const maskPhone = (value) => {
    let d = value.replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    d = d.slice(0, 11);
    if (!d.length) return "";
    if (d.length <= 2) return "(" + d;
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  };
  phone.addEventListener("input", () => { phone.value = maskPhone(phone.value); });

  // selects: cor de placeholder enquanto nada foi escolhido
  form.querySelectorAll("select").forEach((sel) => {
    const sync = () => sel.classList.toggle("is-placeholder", !sel.value);
    sel.addEventListener("change", sync);
    sync();
  });

  // validação
  const rules = {
    nome: (v) => v.trim().length >= 2 || "Informe seu nome.",
    whatsapp: (v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 10 || d.length === 11 || "Informe um WhatsApp com DDD válido.";
    },
    empresa: (v) => v.trim().length >= 2 || "Informe o nome da empresa.",
    faturamento: (v) => v !== "" || "Selecione o faturamento mensal aproximado."
  };

  const fieldOf = (name) => form.elements[name] && form.elements[name].closest(".field");
  const showError = (name, msg) => {
    const box = fieldOf(name);
    if (!box) return;
    box.classList.add("has-error");
    box.querySelector(".error-msg").textContent = msg;
    form.elements[name].setAttribute("aria-invalid", "true");
  };
  const clearError = (name) => {
    const box = fieldOf(name);
    if (!box) return;
    box.classList.remove("has-error");
    box.querySelector(".error-msg").textContent = "";
    form.elements[name].removeAttribute("aria-invalid");
  };

  Object.keys(rules).forEach((name) => {
    const el = form.elements[name];
    const ev = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => clearError(name));
    el.addEventListener("blur", () => {
      if (el.value === "") return; // não acusa erro em campo intocado (o envio valida tudo)
      const r = rules[name](el.value);
      if (r !== true) showError(name, r);
    });
  });

  const validate = () => {
    const invalid = [];
    Object.keys(rules).forEach((name) => {
      const r = rules[name](form.elements[name].value);
      if (r === true) {
        clearError(name);
      } else {
        showError(name, r);
        invalid.push(name);
      }
    });
    return invalid;
  };

  form.addEventListener("focusin", () => {
    if (started) return;
    started = true;
    T.track("form_start");
  });

  const uid = () => {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "lead-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return; // impede envio duplicado

    const invalid = validate();
    if (invalid.length) {
      setStatus("Confira os campos destacados.", "error");
      form.elements[invalid[0]].focus();
      T.track("form_error", { type: "validation", fields: invalid.join(",") });
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    btnText.textContent = "Enviando...";
    setStatus("");

    const eventId = uid();
    const data = new FormData(form);
    data.append("event_id", eventId);
    data.append("referrer", document.referrer || "");
    const utm = T.getUTM();
    Object.keys(utm).forEach((k) => data.append(k, utm[k]));

    try {
      const res = await fetch(FORM_ENDPOINT, { method: "POST", body: data });
      let out = {};
      try { out = await res.json(); } catch (_) {}

      if (res.ok && out.ok) {
        // sucesso confirmado pelo servidor: marca o lead (o evento é disparado uma única vez na página de obrigado)
        T.set("lh_lead", JSON.stringify({ id: eventId, ts: Date.now() }));
        window.location.href = "obrigado.html";
        return; // botão segue desabilitado durante o redirecionamento
      }

      // o servidor também valida: mostra o motivo nos campos que ele recusou
      if (out && Array.isArray(out.campos)) {
        out.campos.forEach((name) => {
          if (rules[name]) showError(name, rules[name](""));
        });
      }
      throw new Error((out && out.error) || "Erro ao enviar.");
    } catch (err) {
      setStatus("Não foi possível enviar sua solicitação. Seus dados continuam preenchidos: tente novamente ou fale com a equipe no WhatsApp.", "error");
      T.track("form_error", { type: "submit" });
      btnText.textContent = "Tentar novamente";
      submitBtn.disabled = false;
      submitting = false;
    }
  });
  // (rótulo original só é restaurado se o usuário editar após um erro)
  form.addEventListener("input", () => {
    if (!submitting && btnText.textContent !== originalLabel) btnText.textContent = originalLabel;
  });
});
