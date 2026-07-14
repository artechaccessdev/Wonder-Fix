/* Screenshot da página inteira + lista de elementos invisíveis.
   Uso: node scripts/full.mjs <url>                                        */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5174/";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));

await page.goto(URL, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3500));

// Rola tudo, para disparar os ScrollTriggers, e volta ao topo.
await page.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = 0; y < h; y += 300) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
});
await new Promise((r) => setTimeout(r, 1500));

// Quem ficou invisível DEPOIS de tudo ter passado pela tela?
const sumidos = await page.evaluate(() => {
  const alvos = ".hero__title, .stat, .card, .step, .sectors__list li, .about__text p, blockquote, .field";
  return [...document.querySelectorAll(alvos)]
    .filter((el) => {
      const s = getComputedStyle(el);
      return +s.opacity < 0.1 || s.visibility === "hidden" || s.display === "none";
    })
    .map((el) => `${el.className || el.tagName} → opacity ${getComputedStyle(el).opacity}`);
});

await page.screenshot({ path: "scripts/_full.png", fullPage: true });

console.log("erros:", errs.length ? errs : "nenhum");
console.log("elementos invisíveis:", sumidos.length ? sumidos : "nenhum");
await browser.close();
