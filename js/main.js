document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 0. HERO ANIMATIONS & TYPEWRITER
  if (!prefersReducedMotion) {
    const tw1 = document.querySelector(".typewriter-1");
    const tw2 = document.querySelector(".typewriter-2");
    const c1 = document.querySelector(".cursor-1");
    const c2 = document.querySelector(".cursor-2");
    
    if (tw1 && tw2) {
      const text1 = "Não falta cliente.";
      const text2 = "Falta processo.";
      
      // Initial state
      gsap.set([".logo", ".kicker-pill", ".hero-left p", ".trust-strip", ".hero-right"], { opacity: 0, y: 30 });
      gsap.set([".hero-left .btn-primary", ".sound-toggle"], { opacity: 0 }); // Deixa o botão na posição final
      
      function typeText(el, text, speed, onComplete) {
        let i = 0;
        let interval = setInterval(() => {
          el.innerHTML += text.charAt(i);
          i++;
          if (i >= text.length) {
            clearInterval(interval);
            if (onComplete) onComplete();
          }
        }, speed);
      }
      
      setTimeout(() => {
        // Fade in logo and kicker
        gsap.to(".logo", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" });
        gsap.to(".kicker-pill", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.1 });
        
        // Fade in hero image
        gsap.to(".hero-right", { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 0.3 });
        
        // Start typing
        setTimeout(() => {
          typeText(tw1, text1, 45, () => {
            if (c1) c1.style.display = "none";
            if (c2) c2.style.display = "inline-block";
            typeText(tw2, text2, 45, () => {
              // Fade in remaining elements
              gsap.to([".hero-left p", ".trust-strip"], {
                opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.15
              });
              gsap.to([".hero-left .btn-primary", ".sound-toggle"], {
                opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.15
              });
            });
          });
        }, 600);
      }, 100);
    }
  } else {
    // Fallback if reduced motion is preferred
    const tw1 = document.querySelector(".typewriter-1");
    const tw2 = document.querySelector(".typewriter-2");
    const c1 = document.querySelector(".cursor-1");
    const c2 = document.querySelector(".cursor-2");
    if(tw1) tw1.textContent = "Não falta cliente.";
    if(tw2) tw2.textContent = "Falta processo.";
    if(c1) c1.style.display = "none";
    if(c2) c2.style.display = "none";
  }

  // 1. (removed) scroll-driven theme crossfade — section themes are now fixed via CSS

  // 2. ENTRANCE ANIMATIONS FOR CARDS
  if (!prefersReducedMotion) {
    gsap.from(".diagnostic-card", {
      scrollTrigger: {
        trigger: ".cards-grid",
        start: "top 80%"
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out"
    });

    gsap.from(".deliverable-card", {
      scrollTrigger: {
        trigger: ".staircase-grid",
        start: "top 80%"
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out"
    });
  }

  // 3. READING PROGRESS BAR
  gsap.to(".read-progress", {
    width: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.1
    }
  });

  // 4. BUTTON GLOW MAGNETIC HOVER
  if (!isTouch) {
    const magneticBtns = document.querySelectorAll(".magnetic");
    magneticBtns.forEach(btn => {
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
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)"
        });
      });
    });
  }

  // 5. DIAGNOSTIC SPOTLIGHT
  const cards = document.querySelectorAll(".spotlight-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
    });
  });

  // 6. SCROLL CIRCLE DOWN ACTION
  const scrollCircles = document.querySelectorAll(".scroll-circle");
  scrollCircles.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const divider = btn.closest(".section-divider");
      let nextTarget = divider ? divider.nextElementSibling : null;
      if (nextTarget) {
        nextTarget.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // 7. SHOW WHATSAPP FAB AFTER SCROLLING PAST HERO
  const fab = document.querySelector(".whatsapp-fab");
  if (fab) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        fab.classList.add("visible");
      } else {
        fab.classList.remove("visible");
      }
    });
  }

  // 8. FORM LOGIC
  const formInputs = document.querySelectorAll(".input-group input, .input-group select");
  formInputs.forEach(input => {
    const updateInput = () => {
      if (input.tagName === "SELECT") {
        if (input.value) {
          input.parentElement.classList.add("has-value");
        } else {
          input.parentElement.classList.remove("has-value");
        }
      }
    };
    input.addEventListener("change", updateInput);
  });

  // 8b. FORM SUBMIT -> envia pro backend (enviar.php / Brevo)
  //     Se o PHP estiver em outro domínio, troque a URL abaixo pela completa,
  //     ex: "https://api.agencialamparina.com.br/enviar.php"
  const FORM_ENDPOINT = "enviar.php";
  const raioForm = document.getElementById("raio-x-form");
  const formStatus = raioForm ? raioForm.querySelector(".form-status") : null;
  if (raioForm) {
    raioForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!raioForm.checkValidity()) {
        raioForm.reportValidity();
        return;
      }
      const btn = raioForm.querySelector("button[type=submit]");
      const btnText = btn.querySelector(".btn-text");
      const originalText = btnText.textContent;
      btn.disabled = true;
      btnText.textContent = "Enviando...";
      if (formStatus) { formStatus.textContent = ""; formStatus.className = "form-status"; }

      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(raioForm) });
        let data = {};
        try { data = await res.json(); } catch (_) {}
        if (res.ok && data.ok) {
          if (formStatus) {
            formStatus.textContent = "Enviado! Redirecionando...";
            formStatus.classList.add("is-ok");
          }
          window.location.href = "obrigado.html";
          return;
        } else {
          throw new Error((data && data.error) || "Erro ao enviar.");
        }
      } catch (err) {
        if (formStatus) {
          formStatus.textContent = "Não deu pra enviar agora. Tente de novo ou fale com a gente no WhatsApp.";
          formStatus.classList.add("is-error");
        }
      } finally {
        btn.disabled = false;
        btnText.textContent = originalText;
      }
    });
  }

  // 9. HERO AMBIENT SOUND TOGGLE + LIVE WAVEFORM
  const soundToggle = document.querySelector(".sound-toggle");
  const heroAudio = document.getElementById("hero-audio");
  if (soundToggle && heroAudio) {
    heroAudio.volume = 0.35;
    const bars = Array.from(soundToggle.querySelectorAll(".sound-wave i"));
    const levels = new Array(bars.length).fill(0);
    let audioCtx, analyser, freqData, rafId;

    const setPlaying = (on) => {
      soundToggle.classList.toggle("playing", on);
      soundToggle.setAttribute("aria-pressed", String(on));
    };

    function initAnalyser() {
      if (analyser) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        audioCtx = new Ctx();
        const src = audioCtx.createMediaElementSource(heroAudio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        src.connect(analyser);
        analyser.connect(audioCtx.destination);
        freqData = new Uint8Array(analyser.frequencyBinCount);
        soundToggle.classList.add("reactive");
      } catch (e) {
        analyser = null;
      }
    }

    function draw() {
      if (!analyser) return;
      analyser.getByteFrequencyData(freqData);
      const usable = Math.floor(freqData.length * 0.7);
      for (let i = 0; i < bars.length; i++) {
        const idx = Math.floor(((i + 0.5) / bars.length) * usable);
        const target = freqData[idx] / 255;
        levels[i] += (target - levels[i]) * 0.4;
        bars[i].style.height = (3 + levels[i] * 17).toFixed(1) + "px";
      }
      rafId = requestAnimationFrame(draw);
    }
    function stopDraw() {
      cancelAnimationFrame(rafId);
      levels.fill(0);
      bars.forEach((b) => { b.style.height = ""; });
    }

    soundToggle.addEventListener("click", () => {
      if (heroAudio.paused) {
        initAnalyser();
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        heroAudio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else {
        heroAudio.pause();
        setPlaying(false);
      }
    });
    heroAudio.addEventListener("play", () => { setPlaying(true); if (analyser) draw(); });
    heroAudio.addEventListener("pause", () => { setPlaying(false); stopDraw(); });
  }

});
