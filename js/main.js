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
      gsap.set(".hero-left .btn-primary", { opacity: 0 }); // Deixa o botão na posição final
      
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
              gsap.to(".hero-left .btn-primary", {
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

});
