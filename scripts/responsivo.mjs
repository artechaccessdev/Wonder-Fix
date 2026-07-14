/* AUDITORIA DE RESPONSIVIDADE
   Abre o site num Chrome real em várias larguras e reporta, por viewport:
     · overflow horizontal da página (o "scroll lateral" que ninguém quer)
     · elementos que estouram a borda direita da tela
     · alvos de toque abaixo de 44x44 (mínimo da WCAG 2.5.8)
     · texto abaixo de 12px
     · imagens deformadas (proporção do arquivo ≠ proporção renderizada)
   Uso: node scripts/responsivo.mjs [url]                                    */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5174/";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

/* As larguras que importam de verdade. 320 é o piso real (iPhone SE 1ª ger. /
   Galaxy Fold fechado); 768 é o limite do tablet retrato; 1024 é o ponto onde
   o menu volta a ser horizontal; 1920 é o desktop cheio. */
/* O 4º campo é o dedo. Sem emular toque, o Chrome reporta pointer:fine e as
   regras @media (pointer: coarse) do site nunca entram — o teste passaria a
   medir um layout que nenhum celular de verdade recebe. */
const VIEWPORTS = [
  ["320  · Fold fechado",   320,  680, true],
  ["360  · Android comum",  360,  740, true],
  ["390  · iPhone 14",      390,  844, true],
  ["430  · iPhone Pro Max", 430,  932, true],
  ["600  · phablet",        600,  900, true],
  ["768  · iPad retrato",   768, 1024, true],
  ["1024 · iPad paisagem", 1024,  768, true],
  ["1280 · notebook",      1280,  800, false],
  ["1920 · desktop cheio", 1920, 1080, false],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
});

let totalProblemas = 0;

for (const [nome, w, h, toque] of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: w,
    height: h,
    deviceScaleFactor: 1,
    hasTouch: toque,
    isMobile: toque,
  });
  /* pointer/hover não são emuláveis pelo emulateMediaFeatures do puppeteer.
     Quem os vira é o hasTouch/isMobile do setViewport acima — o Chrome deriva
     pointer:coarse da presença de toque. O relatório confirma o que o site
     realmente enxergou, em vez de assumir. */
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(URL, { waitUntil: "networkidle2" });

  // O preloader some sozinho; as animações de entrada precisam terminar antes
  // de medir, senão um elemento ainda deslocado pelo GSAP conta como overflow.
  await new Promise((r) => setTimeout(r, 3500));

  // Rola a página inteira para disparar todo ScrollTrigger e assentar o layout.
  await page.evaluate(async () => {
    const passo = window.innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 160));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1200));

  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = {
      vw,
      coarse: matchMedia("(pointer: coarse)").matches,
      scrollW: document.documentElement.scrollWidth,
      estouram: [],
      toqueMiudo: [],
      textoMiudo: [],
      deformadas: [],
    };

    const nomeDe = (el) => {
      const cls = (el.className || "").toString().trim().split(/\s+/)[0];
      return el.tagName.toLowerCase() + (cls ? "." + cls : "");
    };

    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;

      const b = el.getBoundingClientRect();
      if (!b.width && !b.height) continue;

      // ── estouro horizontal ──
      // Position fixed fora da tela é intencional (menu fechado por clip-path,
      // botão do WhatsApp escondido); só interessa o que empurra o documento.
      if (cs.position !== "fixed" && b.right > vw + 1) {
        out.estouram.push({ el: nomeDe(el), right: Math.round(b.right), sobra: Math.round(b.right - vw) });
      }

      // ── alvo de toque ──
      // A régua muda com o apontador, como na própria WCAG: 44x44 é o mínimo
      // para dedo (2.5.8 AAA / guia móvel); com mouse, que é preciso, o piso
      // é 24x24 (2.5.8 AA). Cobrar 44px de um link de texto no desktop seria
      // inventar defeito e engordar o layout à toa.
      const min = out.coarse ? 44 : 24;
      const clicavel =
        el.matches("a, button, input, textarea, select, [role=button]") &&
        !el.closest(".preloader");
      if (clicavel && (b.width < min || b.height < min) && b.width > 0) {
        out.toqueMiudo.push({
          el: nomeDe(el),
          w: Math.round(b.width),
          h: Math.round(b.height),
          min,
        });
      }

      // ── tamanho de texto ──
      // Só folhas de texto: um contêiner herda font-size mas não pinta letra.
      const temTextoDireto = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 1
      );
      if (temTextoDireto) {
        const fs = parseFloat(cs.fontSize);
        if (fs < 12) out.textoMiudo.push({ el: nomeDe(el), px: +fs.toFixed(1) });
      }

      // ── imagem deformada ──
      if (el.tagName === "IMG" && el.naturalWidth && cs.objectFit !== "cover") {
        const pNat = el.naturalWidth / el.naturalHeight;
        const pRend = b.width / b.height;
        if (Math.abs(pNat - pRend) / pNat > 0.06) {
          out.deformadas.push({
            el: nomeDe(el),
            natural: pNat.toFixed(2),
            renderizada: pRend.toFixed(2),
          });
        }
      }
    }
    return out;
  });

  const overflow = r.scrollW > r.vw + 1;
  const problemas =
    (overflow ? 1 : 0) +
    r.estouram.length +
    r.toqueMiudo.length +
    r.textoMiudo.length +
    r.deformadas.length;
  totalProblemas += problemas;

  console.log(
    `\n${problemas ? "✗" : "✓"} ${nome}  (${w}x${h})  ${r.coarse ? "[toque]" : "[mouse]"}`
  );
  if (overflow) console.log(`   SCROLL LATERAL: documento tem ${r.scrollW}px numa tela de ${r.vw}px`);
  const lista = (rot, arr) => {
    if (!arr.length) return;
    const vistos = new Map();
    for (const i of arr) if (!vistos.has(i.el)) vistos.set(i.el, i);
    console.log(`   ${rot}:`);
    for (const i of [...vistos.values()].slice(0, 8)) {
      const { el, ...resto } = i;
      console.log(`      ${el.padEnd(26)} ${JSON.stringify(resto)}`);
    }
    if (vistos.size > 8) console.log(`      … +${vistos.size - 8} outros`);
  };
  lista("estouram a direita", r.estouram);
  lista("alvo de toque < 44px", r.toqueMiudo);
  lista("texto < 12px", r.textoMiudo);
  lista("imagem deformada", r.deformadas);

  await page.close();
}

console.log(
  totalProblemas
    ? `\n──────────\n${totalProblemas} problema(s) no total.`
    : `\n──────────\nNenhum problema nas ${VIEWPORTS.length} larguras.`
);

await browser.close();
