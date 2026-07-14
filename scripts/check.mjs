/* Abre o site num Chrome real, rola a página inteira e reporta:
   erros de console, preferência de movimento e o estado dos contadores.
   Rodar com o dev server ligado:  node scripts/check.mjs             */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5174/";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--window-size=1440,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Chrome headless reporta "reduce" por padrão. Para testar o site como um
// usuário comum o vê, é preciso emular explicitamente.
const motion = process.argv[3] === "reduce" ? "reduce" : "no-preference";
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: motion },
]);

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(URL, { waitUntil: "networkidle2" });

// Antes de rolar, os contadores têm que estar zerados (senão não há o que ver).
const antes = await page.evaluate(() =>
  [...document.querySelectorAll("[data-count]")].map((el) => el.textContent)
);

const prefersReduced = await page.evaluate(
  () => matchMedia("(prefers-reduced-motion: reduce)").matches
);

// Rola até a seção de números e observa a contagem acontecendo.
await page.evaluate(() => document.querySelector(".stats").scrollIntoView());
await new Promise((r) => setTimeout(r, 600));
const durante = await page.evaluate(() =>
  [...document.querySelectorAll("[data-count]")].map((el) => el.textContent)
);

// Rola o resto da página.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.5;
  for (let y = window.scrollY; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 220));
  }
});
await new Promise((r) => setTimeout(r, 1500));

const counters = await page.evaluate(() =>
  [...document.querySelectorAll("[data-count]")].map((el) => el.textContent)
);

console.log("contadores ANTES do scroll :", antes);
console.log("contadores NO MEIO da conta:", durante);

await page.screenshot({ path: "scripts/_shot.png", fullPage: false });

console.log("prefers-reduced-motion:", prefersReduced);
console.log("contadores:", counters);
console.log("erros de console:", errors.length ? errors : "nenhum");

await browser.close();
