/* ═══════════════════════════════════════════════════════════════
   WONDER FIX — sistema de animação
   GSAP + ScrollTrigger + Lenis.

   Princípios de performance seguidos aqui:
   · só transform/opacity (compostos na GPU). Nada de top/left/width.
   · blur só no desktop e só num elemento — é a única propriedade cara.
   · gsap.matchMedia() separa desktop/mobile/reduced: no celular as
     animações caras nem são criadas, não é só "esconder".
   · will-change entra na hora da animação e sai depois (autoRemove).
   ═══════════════════════════════════════════════════════════════ */

import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: "power3.out", duration: 1 });
ScrollTrigger.config({ ignoreMobileResize: true });

const mm = gsap.matchMedia();
const DESK = "(min-width: 981px) and (prefers-reduced-motion: no-preference)";
const MOBI = "(max-width: 980px) and (prefers-reduced-motion: no-preference)";
const MOTION = "(prefers-reduced-motion: no-preference)";
const REDUCED = !window.matchMedia(MOTION).matches;

/* ─────────────────────────────────────────────────────────────
   SCROLL SUAVE
   A base de tudo: sem inércia no scroll, animação com scrub fica
   "dura". É o que mais separa um site premium de um comum.
   ───────────────────────────────────────────────────────────── */
let lenis = null;

if (!REDUCED) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.6 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -20 });
    else target.scrollIntoView();
  });
});

/* ─────────────────────────────────────────────────────────────
   SPLIT DE TEXTO
   Escrito à mão para não depender de plugin e para preservar o
   <em> (o itálico kraft). splitWords para títulos; splitChars só
   para textos curtos — caractere a caractere multiplica os nós do
   DOM, e num título longo isso custa caro no celular.
   ───────────────────────────────────────────────────────────── */
const HIDE = 145; // recuo da palavra: > 100% porque a máscara tem padding

function splitNodes(el, mode) {
  const piece = (txt) => {
    const mask = document.createElement("span");
    mask.className = "w-mask";
    const inner = document.createElement("span");
    inner.className = "w-in";
    inner.textContent = txt;
    mask.appendChild(inner);
    return mask;
  };

  const walk = (node) => {
    const out = [];
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        child.textContent.split(/(\s+)/).forEach((word) => {
          if (!word.trim()) return;
          if (mode === "chars") {
            const wrap = document.createElement("span");
            wrap.className = "w-word";
            [...word].forEach((c) => wrap.appendChild(piece(c)));
            out.push(wrap, document.createTextNode(" "));
          } else {
            out.push(piece(word), document.createTextNode(" "));
          }
        });
      } else if (child.nodeType === 1) {
        const clone = child.cloneNode(false); // preserva o <em>
        walk(child).forEach((n) => clone.appendChild(n));
        out.push(clone, document.createTextNode(" "));
      }
    });
    return out;
  };

  const nodes = walk(el);
  el.innerHTML = "";
  nodes.forEach((n) => el.appendChild(n));
  return el.querySelectorAll(".w-in");
}

const splitWords = (el) => splitNodes(el, "words");
const splitChars = (el) => splitNodes(el, "chars");

/* Revelação padrão de título: palavras subindo por baixo da máscara. */
function revealTitle(el, opts = {}) {
  const words = splitWords(el);
  gsap.set(words, { yPercent: HIDE });
  return gsap.to(words, {
    yPercent: 0,
    duration: 1.05,
    stagger: 0.035,
    ease: "power4.out",
    scrollTrigger: { trigger: el, start: "top 85%", ...opts },
  });
}

/* ─────────────────────────────────────────────────────────────
   BARRA DE PROGRESSO DO SCROLL
   ───────────────────────────────────────────────────────────── */
gsap.to("#progress", {
  scaleX: 1,
  ease: "none",
  scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
});

/* ─────────────────────────────────────────────────────────────
   HERO — entrada
   Uma única timeline orquestrando tudo. O vídeo abre por clip-path
   enquanto faz um zoom-out lento: dá sensação de câmera, não de
   slide entrando.
   ───────────────────────────────────────────────────────────── */
const preloader = document.getElementById("preloader");
const preCount = document.getElementById("preCount");
const preBar = document.getElementById("preBar");

function bootHero() {
  const title = document.querySelector(".hero__title");
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  tl.from(".hero__media", {
    scale: 1.18,
    clipPath: "inset(18% 12% 18% 12%)",
    duration: 2,
    ease: "power3.out",
  }, 0);

  if (title) {
    const words = splitWords(title);
    gsap.set(words, { yPercent: HIDE });
    tl.to(words, { yPercent: 0, duration: 1.15, stagger: 0.04 }, 0.35);
  }

  tl.from(".hero .eyebrow", { y: 20, opacity: 0, duration: 0.8 }, 0.3)
    .from(".hero__foot", { y: 30, opacity: 0, duration: 0.9 }, "-=0.6")
    .from(".hero__foot", { clipPath: "inset(0 100% 0 0)", duration: 1.1 }, "<")
    .from(".nav", { y: -40, opacity: 0, duration: 0.8 }, "-=0.9")
    .from(".hero__scroll", { opacity: 0, y: 20, duration: 0.6 }, "-=0.5");

  return tl;
}

if (REDUCED) {
  preloader.style.display = "none";
  gsap.set(".hero__media, .hero__foot", { clearProps: "all" });
} else {
  const counter = { v: 0 };
  gsap.set(preloader, { clipPath: "inset(0 0 0% 0)" });

  gsap.timeline()
    .to(counter, {
      v: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => (preCount.textContent = Math.round(counter.v)),
    }, 0)
    .to(preBar, { width: "100%", duration: 1.5, ease: "power2.inOut" }, 0)
    .to(".preloader__inner", { y: -30, opacity: 0, duration: 0.6, ease: "power2.in" }, 1.5)
    .to(preloader, {
      clipPath: "inset(0 0 100% 0)",
      duration: 1,
      ease: "power4.inOut",
      onStart: bootHero,
      onComplete: () => (preloader.style.display = "none"),
    }, 1.7);
}

/* HERO — profundidade no scroll.
   O hero não sai empurrado: ele afunda (escala + opacidade) enquanto a
   próxima seção sobe por cima. É a "transição entre seções" pedida —
   feita com o que é barato na GPU. O blur é a única propriedade cara
   aqui, então fica restrito ao desktop e vai só até 5px.             */
mm.add(DESK, () => {
  // Sem blur animado. Blur num vídeo em tela cheia é a propriedade mais cara que
  // existe num scroll: o navegador redesenha o quadro inteiro a cada frame.
  // scale + opacity fazem o mesmo efeito de profundidade e rodam na GPU.
  gsap.to(".hero__media", {
    scale: 1.1,
    opacity: 0.5,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero__content", {
    y: 120,
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 40%", scrub: true },
  });
});

mm.add(MOBI, () => {
  // No celular, só o parallax do conteúdo. Sem blur, sem scale no vídeo.
  gsap.to(".hero__content", {
    y: 60,
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: true },
  });
});

/* ─────────────────────────────────────────────────────────────
   NAV
   ───────────────────────────────────────────────────────────── */
const nav = document.getElementById("nav");
const menu = document.getElementById("menu");
const burger = document.getElementById("burger");

ScrollTrigger.create({
  start: 80,
  onUpdate: (self) => nav.classList.toggle("is-stuck", self.scroll() > 80),
});

/* ─────────────────────────────────────────────────────────────
   WHATSAPP FLUTUANTE
   Entra depois do hero (no topo quem manda é o botão de orçamento) e sai de
   cena quando o formulário aparece — ali ele seria um segundo CTA competindo
   com o primeiro. Fora dessas duas pontas, é o atalho sempre à mão.
   ───────────────────────────────────────────────────────────── */
const wa = document.getElementById("wa");
if (wa) {
  wa.classList.add("is-hidden");   // começa fora: o hero não o mostra

  let passouHero = false;
  let noForm = false;
  const sync = () => wa.classList.toggle("is-hidden", !passouHero || noForm);

  // Posição de scroll crua, como o nav: um trigger preso ao .hero só reporta
  // progresso dentro da própria janela dele, e aqui o que importa é o "já saiu".
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      passouHero = self.scroll() > window.innerHeight * 0.7;
      sync();
    },
  });

  ScrollTrigger.create({
    trigger: "#orcamento",
    start: "top 75%",
    end: "bottom top",
    onToggle: (self) => {
      noForm = self.isActive;
      sync();
    },
  });
}

function closeMenu() {
  nav.classList.remove("is-open");
  menu.classList.remove("is-open");
  if (lenis) lenis.start();
}
burger.addEventListener("click", () => {
  const open = !menu.classList.contains("is-open");
  nav.classList.toggle("is-open", open);
  menu.classList.toggle("is-open", open);
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) {
    gsap.from(".menu a", {
      yPercent: 120,
      opacity: 0,
      duration: 0.7,
      stagger: 0.06,
      ease: "power3.out",
      delay: 0.15,
    });
  }
});

/* ─────────────────────────────────────────────────────────────
   TÍTULOS DE SEÇÃO
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.utils.toArray("[data-split]").forEach((el) => {
    if (el.closest(".hero") || el.closest(".quote")) return;
    revealTitle(el);
  });

  // Depoimento: aqui sim, letra por letra. É curto e é o clímax emocional.
  const quote = document.querySelector(".quote blockquote");
  if (quote) {
    const chars = splitChars(quote);
    gsap.set(chars, { yPercent: HIDE });
    gsap.to(chars, {
      yPercent: 0,
      duration: 0.8,
      stagger: 0.012,
      ease: "power4.out",
      scrollTrigger: { trigger: quote, start: "top 80%" },
    });
    gsap.from(".quote figcaption", {
      opacity: 0,
      x: -20,
      duration: 0.8,
      scrollTrigger: { trigger: quote, start: "top 60%" },
    });
  }

  // Eyebrows e leads: entrada discreta, sem roubar a cena do título.
  gsap.utils.toArray(".section__head .eyebrow, .about__head .eyebrow, .cta__lead, .cta__direct")
    .forEach((el) => {
      gsap.from(el, {
        y: 20,
        opacity: 0,
        duration: 0.9,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
});

/* ─────────────────────────────────────────────────────────────
   ESTATÍSTICAS — contador + entrada escalonada
   ───────────────────────────────────────────────────────────── */
const counters = gsap.utils.toArray("[data-count]");

/* toLocaleString() monta um formatador novo a cada chamada — e isto é chamado a
   cada frame da contagem. Instanciado uma vez só, sai de caro para grátis. */
const nf = new Intl.NumberFormat("pt-BR");
const fmt = (n) => nf.format(Math.round(n));

/* A contagem roda SEMPRE, inclusive com prefers-reduced-motion.
   Essa preferência existe para evitar movimento espacial (parallax, pin, zoom),
   que causa desconforto vestibular — um número trocando de valor não é isso.
   O que fica desligado no modo reduzido é a entrada deslizante dos blocos.

   start "top 85%": dispara quando a seção está entrando, ainda subindo — a
   contagem termina junto com ela chegando ao centro da tela.                */
counters.forEach((el, i) => {
  const obj = { v: 0 };
  gsap.to(obj, {
    v: parseFloat(el.dataset.count),
    duration: 2,
    delay: i * 0.1,          // um número atrás do outro, em cascata
    ease: "power2.out",
    onUpdate: () => (el.textContent = fmt(obj.v)),
    scrollTrigger: {
      trigger: ".stats",
      start: "top 85%",
      once: true,            // conta uma vez; não reinicia se rolar de volta
    },
  });
});

// A entrada deslizante dos blocos, essa sim, só com movimento liberado.
mm.add(MOTION, () => {
  gsap.from(".stat", {
    yPercent: 30,
    opacity: 0,
    duration: 1,
    stagger: 0.1,
    scrollTrigger: { trigger: ".stats", start: "top 85%" },
  });
});

/* ─────────────────────────────────────────────────────────────
   EMPRESA
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.from(".about__text p", {
    y: 24,
    opacity: 0,
    duration: 1,
    stagger: 0.12,
    scrollTrigger: { trigger: ".about__text", start: "top 82%" },
  });

  // O selo entra junto do texto que ele assina.
  gsap.from(".about__sign", {
    y: 20,
    opacity: 0,
    duration: 1,
    scrollTrigger: { trigger: ".about__story", start: "top 78%" },
  });

  gsap.from(".about__pillars li", {
    y: 26,
    opacity: 0,
    duration: 0.9,
    stagger: 0.1,
    scrollTrigger: { trigger: ".about__pillars", start: "top 85%" },
  });
});

/* ─────────────────────────────────────────────────────────────
   PARALLAX GENÉRICO — [data-parallax]
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.utils.toArray("[data-parallax]").forEach((el) => {
    const amt = parseFloat(el.dataset.parallax) || 0.1;
    gsap.to(el, {
      yPercent: -amt * 100,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
});

/* ─────────────────────────────────────────────────────────────
   REVELAÇÃO DE MÍDIA — máscara + parallax interno
   O clip-path abre a moldura enquanto a imagem, por dentro, faz um
   zoom-out. Duas velocidades = profundidade. Fade-in simples é o que
   todo template faz; isto é o que estúdio faz.
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.utils.toArray(".card__media").forEach((el) => {
    const inner = el.querySelector(".ph, img");

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
    tl.from(el, { clipPath: "inset(100% 0% 0% 0%)", duration: 1.3, ease: "power4.out" })
      .from(inner, { scale: 1.3, duration: 1.6, ease: "power3.out" }, 0);

    // Deriva vertical lenta enquanto rola: a imagem "respira".
    gsap.to(inner, {
      yPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
});

/* ─────────────────────────────────────────────────────────────
   CARDS DE PRODUTO — entrada alternada (esquerda / direita)
   ───────────────────────────────────────────────────────────── */
mm.add(DESK, () => {
  // :not(.card--extra) — os 3 cards escondidos têm a própria entrada quando o
  // "Mais produtos" os revela. Deixá-los aqui criaria uma animação concorrente.
  gsap.utils.toArray(".card:not(.card--extra)").forEach((card, i) => {
    gsap.from(card, {
      xPercent: i % 2 === 0 ? -8 : 8,
      yPercent: 12,
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: { trigger: card, start: "top 86%" },
    });
  });
});

mm.add(MOBI, () => {
  // No celular não há espaço lateral: entrada vertical, mais curta.
  gsap.from(".card:not(.card--extra)", {
    y: 40,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    scrollTrigger: { trigger: ".products__grid", start: "top 85%" },
  });
});

/* Microinteração dos cards: inclinação sutil seguindo o cursor.
   quickTo é a via rápida do GSAP — não cria tween novo a cada evento. */
mm.add(DESK, () => {
  gsap.utils.toArray(".card").forEach((card) => {
    const rx = gsap.quickTo(card, "rotateX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(card, "rotateY", { duration: 0.6, ease: "power3" });

    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      rx(gsap.utils.mapRange(0, r.height, 4, -4, e.clientY - r.top));
      ry(gsap.utils.mapRange(0, r.width, -4, 4, e.clientX - r.left));
    });

    // Zoom da imagem no hover: timeline reversível.
    const media = card.querySelector(".card__media .ph, .card__media img");
    const hover = gsap.timeline({ paused: true })
      .to(media, { scale: 1.06, duration: 0.8, ease: "power3.out" }, 0);

    card.addEventListener("pointerenter", () => hover.play());
    card.addEventListener("pointerleave", () => {
      rx(0); ry(0);
      hover.reverse();
    });
  });
});

/* ─────────────────────────────────────────────────────────────
   MODAL DE PRODUTO — clicar num card abre a descrição ampliada
   O conteúdo longo vem de .card__detail (escondido dentro do card).
   Ao abrir, trava a rolagem da página (lenis.stop) e devolve o foco
   ao card quando fecha — quem usa teclado não fica perdido.
   ───────────────────────────────────────────────────────────── */
const pmodal   = document.getElementById("productModal");
if (pmodal) {
  const pmImg   = document.getElementById("pmImg");
  const pmTitle = document.getElementById("pmTitle");
  const pmDesc  = document.getElementById("pmDesc");
  const pmClose = document.getElementById("pmClose");
  const pmBack  = document.getElementById("pmBack");
  const pmQuote = document.getElementById("pmQuote");
  let lastCard  = null;

  function openProduct(card) {
    const img    = card.querySelector(".card__media img");
    const title  = card.querySelector(".card__info h3");
    const detail = card.querySelector(".card__detail");

    pmImg.src   = img ? img.src : "";
    pmImg.alt   = img ? img.alt : "";
    pmTitle.textContent = title ? title.textContent : "";
    pmDesc.innerHTML    = detail ? detail.innerHTML : "";

    lastCard = card;
    pmodal.hidden = false;
    // Força um frame antes da classe, para a transição de opacidade rodar.
    requestAnimationFrame(() => pmodal.classList.add("is-open"));
    if (lenis) lenis.stop();
    pmClose.focus();
  }

  function closeProduct() {
    pmodal.classList.remove("is-open");
    if (lenis) lenis.start();
    // Espera a transição terminar antes de esconder de vez.
    setTimeout(() => { pmodal.hidden = true; }, 460);
    if (lastCard) lastCard.focus();
  }

  document.querySelectorAll(".products__grid .card").forEach((card) => {
    card.addEventListener("click", () => openProduct(card));
    // Enter/Espaço abrem também — o card é role="button".
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProduct(card);
      }
    });
  });

  pmClose.addEventListener("click", closeProduct);
  pmBack.addEventListener("click", closeProduct);
  // "Solicitar orçamento" leva ao formulário: fecha o modal antes de rolar.
  pmQuote.addEventListener("click", closeProduct);
  // Clicar no fundo borrado (fora do painel) fecha.
  pmodal.addEventListener("click", (e) => {
    if (e.target === pmodal) closeProduct();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pmodal.classList.contains("is-open")) closeProduct();
  });
}

/* ─────────────────────────────────────────────────────────────
   MAIS PRODUTOS — a grade abre com 3 e revela os outros 3 a pedido
   Evita a poluição de mostrar as seis linhas de uma vez. Os cards
   extras já existem no HTML (só com [hidden]); aqui a gente os mostra
   e anima a entrada. Clicar de novo recolhe.
   ───────────────────────────────────────────────────────────── */
const moreBtn = document.getElementById("moreProducts");
if (moreBtn) {
  const extras = document.querySelectorAll(".card--extra");
  const label  = moreBtn.querySelector("span");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let shown = false;

  moreBtn.addEventListener("click", () => {
    shown = !shown;
    moreBtn.setAttribute("aria-expanded", String(shown));
    label.textContent = shown ? "Mostrar menos" : "Mais produtos";

    if (shown) {
      extras.forEach((c) => (c.hidden = false));
      if (!reduce) {
        gsap.from(extras, {
          y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out",
        });
      }
      ScrollTrigger.refresh();          // a página cresceu — recalibra os gatilhos
    } else {
      extras.forEach((c) => (c.hidden = true));
      ScrollTrigger.refresh();
      // Volta o olhar para o botão, que subiu junto com a grade recolhida.
      if (lenis) lenis.scrollTo(moreBtn, { offset: -160 });
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   PROCESSO — os quatro passos entram em cascata
   Aqui havia um pin com scroll horizontal. Foi removido: sequestrava
   a rolagem, escondia o quarto card e deixava os passos ilegíveis.
   Um ScrollTrigger comum, igual no desktop e no celular.
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.from(".step", {
    y: 40,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: "power3.out",
    scrollTrigger: { trigger: ".process__track", start: "top 85%" },
  });
});

/* ─────────────────────────────────────────────────────────────
   CAIXAS PERSONALIZADAS
   Mesmo grão da seção Empresa logo acima: parágrafos entrando em
   stagger, o selo (foto do produto) revelado em máscara + zoom-out
   interno — igual ao card de produto, não um fade genérico — e o
   trilho de quatro fechando com o mesmo filete kraft do about.
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.from(".boxes__text p", {
    y: 24,
    opacity: 0,
    duration: 1,
    stagger: 0.12,
    scrollTrigger: { trigger: ".boxes__text", start: "top 82%" },
  });

  gsap.utils.toArray(".boxes__frame, .boxes__proof").forEach((el) => {
    const inner = el.querySelector("img");
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%" } });
    tl.from(el, { clipPath: "inset(100% 0% 0% 0%)", duration: 1.2, ease: "power4.out" })
      .from(inner, { scale: 1.25, duration: 1.5, ease: "power3.out" }, 0);
  });

  gsap.from(".boxes__sign figcaption", {
    y: 16,
    opacity: 0,
    duration: 0.8,
    scrollTrigger: { trigger: ".boxes__sign", start: "top 78%" },
  });

  gsap.from(".boxes__pillars li", {
    y: 26,
    opacity: 0,
    duration: 0.9,
    stagger: 0.1,
    scrollTrigger: { trigger: ".boxes__pillars", start: "top 85%" },
  });

  gsap.from(".boxes__foot", {
    y: 30,
    opacity: 0,
    duration: 1,
    scrollTrigger: { trigger: ".boxes__foot", start: "top 88%" },
  });
});

/* ─────────────────────────────────────────────────────────────
   CTA + FORMULÁRIO
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.from(".field, .form .btn", {
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.08,
    scrollTrigger: { trigger: ".form", start: "top 85%" },
  });
});

/* ─────────────────────────────────────────────────────────────
   RODAPÉ
   A marca em outline gigante saiu, e com ela o deslize lateral: num rodapé
   centrado, algo entrando de lado quebra o eixo. A logo sobe no lugar.
   ───────────────────────────────────────────────────────────── */
mm.add(MOTION, () => {
  gsap.from(".footer__logo", {
    y: 24,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".footer", start: "top 88%" },
  });
  gsap.from(".footer__cols > div", {
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    scrollTrigger: { trigger: ".footer__cols", start: "top 90%" },
  });
});

/* ─────────────────────────────────────────────────────────────
   BOTÕES MAGNÉTICOS — o botão puxa levemente na direção do cursor
   ───────────────────────────────────────────────────────────── */
mm.add("(min-width: 981px) and (hover: hover) and (prefers-reduced-motion: no-preference)", () => {
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const xq = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const yq = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xq((e.clientX - (r.left + r.width / 2)) * 0.35);
      yq((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener("pointerleave", () =>
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .3)" }));
  });
});

/* ─────────────────────────────────────────────────────────────
   VÍDEO SOB DEMANDA — fora da viewport não baixa nem roda
   ───────────────────────────────────────────────────────────── */
document.querySelectorAll("video").forEach((v) => {
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        v.preload = "auto";
        v.play().catch(() => {}); // se o autoplay for bloqueado, o poster segura
      } else {
        v.pause();
      }
    },
    { threshold: 0.1 }
  ).observe(v);
});

/* ─────────────────────────────────────────────────────────────
   FORMULÁRIO
   ───────────────────────────────────────────────────────────── */
const form = document.getElementById("form");
const note = document.getElementById("formNote");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  note.className = "form__note";

  let ok = true;
  ["nome", "empresa", "email"].forEach((id) => {
    const input = document.getElementById(id);
    const valid =
      input.value.trim() &&
      (id !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value));
    input.parentElement.classList.toggle("is-error", !valid);
    if (!valid) ok = false;
  });

  if (!ok) {
    note.textContent = "Confira os campos destacados.";
    note.classList.add("err");
    gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, .3)" });
    return;
  }

  const d = new FormData(form);
  const texto = encodeURIComponent(
    `Orçamento Wonder Fix\n\nNome: ${d.get("nome")}\nEmpresa: ${d.get("empresa")}\n` +
      `E-mail: ${d.get("email")}\nTelefone: ${d.get("tel") || "-"}\n\n${d.get("msg") || ""}`
  );

  // TROCAR AQUI · número real do WhatsApp da fábrica
  window.open(`https://wa.me/5500000000000?text=${texto}`, "_blank");

  note.textContent = "Pedido montado — é só enviar no WhatsApp que abriu.";
  note.classList.add("ok");
  form.reset();
});

/* ───────────────────────────────────────────────────────────── */
document.getElementById("year").textContent = new Date().getFullYear();

// As fontes mudam a altura do texto: sem isso, os pins medem errado.
document.fonts.ready.then(() => ScrollTrigger.refresh());
