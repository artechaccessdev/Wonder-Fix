/* ═══════════════════════════════════════════════════════════════
   CONSENTIMENTO DE COOKIES — LGPD (Lei 13.709/2018) + Consent Mode v2
   ═══════════════════════════════════════════════════════════════

   O que este arquivo faz, em uma frase: nada que rastreie o visitante roda
   antes de ele dizer sim.

   Por que é assim e não um "OK" que só some da tela:

   1. Consent Mode v2. O Google exige, desde março/2024, que o site declare o
      estado do consentimento ANTES de o gtag carregar. Por isso o bloco de
      `default: denied` é a primeira coisa que este módulo executa — se ele
      rodasse depois do gtag, o Analytics já teria gravado o cookie sem
      permissão e a declaração viraria enfeite. Com o modo ativo, o Google
      ainda recebe pings sem cookie (modelagem de conversão) quando o visitante
      recusa: você não fica cego, e continua legal.

   2. O consentimento vai em COOKIE, não em localStorage. Cookie viaja para o
      servidor e vale no domínio inteiro (inclusive um futuro loja.wonderfix…),
      que é onde a decisão precisa valer. localStorage é preso à origem e ao
      navegador.

   3. Versão gravada junto (CONSENT_VERSION). No dia em que entrar uma
      categoria nova de cookie, sobe a versão: quem já respondeu é perguntado
      de novo, porque o "sim" dele foi dado para outra lista. Consentimento não
      se herda.

   ATENÇÃO · SEO: banner de cookie NÃO ranqueia. Isto aqui é conformidade legal
   e confiança — e é o que destrava medir tráfego de forma lícita. Não espere
   posição no Google por causa dele.                                          */

const COOKIE_NAME = "wf_consent";
const CONSENT_VERSION = 1;
const COOKIE_DAYS = 365;

/* As categorias. "necessarios" não é negociável e por isso nem tem interruptor:
   é o que faz o site funcionar (a própria memória desta escolha, entre outros).
   A LGPD dispensa consentimento para o legítimo interesse de operação — e
   fingir que ele é opcional, com um botão que não desliga nada, seria mentira. */
const CATEGORIES = ["analytics", "marketing"];

/* ── Cookie: ler e gravar ───────────────────────────────────── */
const readCookie = (name) =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.split("=")
    .slice(1)
    .join("=") ?? null;

function writeCookie(name, value, days) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  // SameSite=Lax: o cookie sobrevive à volta do usuário vindo do Google/WhatsApp,
  // e não vaza em requisição de terceiro. Secure só quando há HTTPS — em
  // localhost (http) o navegador descartaria o cookie silenciosamente.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax${secure}`;
}

/* Devolve o consentimento gravado, ou null se não existe / é de outra versão. */
function loadConsent() {
  const raw = readCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const saved = JSON.parse(decodeURIComponent(raw));
    if (saved.v !== CONSENT_VERSION) return null;
    return saved;
  } catch {
    return null; // cookie corrompido: trata como quem nunca respondeu
  }
}

/* ── Google Consent Mode v2 ─────────────────────────────────── */
window.dataLayer = window.dataLayer || [];
function gtag() {
  // Precisa ser `arguments` mesmo: o gtag.js lê o dataLayer esperando o objeto
  // arguments, não um array. Rest params (...args) quebram a leitura dele.
  window.dataLayer.push(arguments);
}

const granted = (ok) => (ok ? "granted" : "denied");

function pushConsent(state, mode) {
  gtag("consent", mode, {
    ad_storage:             granted(state.marketing),
    ad_user_data:           granted(state.marketing),
    ad_personalization:     granted(state.marketing),
    analytics_storage:      granted(state.analytics),
    personalization_storage: granted(state.analytics),
    functionality_storage:  "granted",
    security_storage:       "granted",
  });
}

/* Estado inicial: tudo negado até prova em contrário. Roda ANTES de qualquer
   tag — é a linha que separa "conforme" de "processado". */
const stored = loadConsent();
pushConsent(stored ?? { analytics: false, marketing: false }, "default");
if (stored) pushConsent(stored, "update");

/* ── Aplicar a escolha ──────────────────────────────────────── */
function applyConsent(state, { persist = true } = {}) {
  if (persist) {
    writeCookie(
      COOKIE_NAME,
      JSON.stringify({ v: CONSENT_VERSION, ...state, ts: Date.now() }),
      COOKIE_DAYS
    );
  }

  pushConsent(state, "update");
  window.dataLayer.push({ event: "wf_consent_update", ...state });

  // Quem quiser reagir (carregar um mapa, um chat, um pixel) escuta este evento
  // em vez de mexer aqui dentro.
  document.dispatchEvent(new CustomEvent("wf:consent", { detail: state }));

  if (state.analytics) loadAnalytics();
}

/* Só entra na página depois do "sim" — é este carregamento tardio que faz o
   consentimento valer alguma coisa. Enquanto o ID não for preenchido, a função
   não faz nada, e é de propósito: o site vai ao ar sem tag e sem quebrar. */
let analyticsLoaded = false;
const GA_ID = ""; // TROCAR AQUI · ex.: "G-XXXXXXXXXX" (Google Analytics 4)

function loadAnalytics() {
  if (analyticsLoaded || !GA_ID) return;
  analyticsLoaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true });
}

/* ── Interface ──────────────────────────────────────────────── */
const banner  = document.getElementById("cookieBanner");
const painel  = document.getElementById("cookiePrefs");
const toggles = () =>
  CATEGORIES.map((c) => document.getElementById("ck-" + c)).filter(Boolean);

const openBanner  = () => banner?.classList.add("is-open");
const closeBanner = () => banner?.classList.remove("is-open");

function openPrefs() {
  const state = loadConsent() ?? { analytics: false, marketing: false };
  toggles().forEach((t) => (t.checked = !!state[t.dataset.cat]));
  painel?.classList.add("is-open");
  // Foco no primeiro interruptor: quem navega por teclado cai dentro do painel,
  // não continua preso atrás dele na página.
  toggles()[0]?.focus();
}
const closePrefs = () => painel?.classList.remove("is-open");

/* Decidir e fechar tudo — o caminho único de saída, para não existir jeito de
   fechar o banner sem gravar uma decisão. */
function decide(state) {
  applyConsent(state);
  closePrefs();
  closeBanner();
}

const ALL  = { analytics: true,  marketing: true  };
const NONE = { analytics: false, marketing: false };

document.getElementById("ckAceitar")?.addEventListener("click", () => decide(ALL));
document.getElementById("ckRecusar")?.addEventListener("click", () => decide(NONE));
document.getElementById("ckPrefs")?.addEventListener("click", openPrefs);
document.getElementById("ckFechaPrefs")?.addEventListener("click", closePrefs);
document.getElementById("ckAceitarTudo")?.addEventListener("click", () => decide(ALL));

document.getElementById("ckSalvar")?.addEventListener("click", () => {
  const state = { ...NONE };
  toggles().forEach((t) => (state[t.dataset.cat] = t.checked));
  decide(state);
});

// O link do rodapé. A LGPD dá o direito de mudar de ideia — sem isso, o "sim"
// de hoje seria definitivo, e o direito viraria letra morta.
document.querySelectorAll("[data-cookie-prefs]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    openPrefs();
  })
);

// Esc fecha o painel — mas nunca o banner: sair sem responder não é resposta.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && painel?.classList.contains("is-open")) closePrefs();
});

/* Já respondeu: reaplica (o cookie pode ter vindo de outra visita) e some.
   Nunca respondeu: o banner espera o preloader terminar. Aparecer por cima da
   animação de entrada seria a primeira coisa que o visitante vê no site. */
if (stored) {
  applyConsent(stored, { persist: false });
} else {
  window.addEventListener("load", () => setTimeout(openBanner, 1200));
}
