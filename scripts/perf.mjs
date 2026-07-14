/* Mede a fluidez real do scroll: FPS médio, frames longos (jank) e as
   tarefas que travam a thread principal.
   Rodar com o dev server ligado:  node scripts/perf.mjs                */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5174/";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

/* Headless compõe por software: mede a CPU, não o que o usuário vê. Para medir
   fluidez de verdade é preciso um Chrome real, com GPU. */
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--window-size=1440,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);

await page.bringToFront(); // sem foco, o Chrome limita a taxa de quadros
await page.goto(URL, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3000)); // deixa o preloader terminar

/* Permite desligar suspeitos e comparar: node scripts/perf.mjs <url> grao|video|ambos */
const kill = process.argv[3];
const cssKill = {
  grao: "body::after { display: none !important }",
  graoparado: "body::after { animation: none !important; will-change: auto !important }",
  video: ".hero__video { display: none !important }",
  ambos: "body::after, .hero__video { display: none !important }",
}[kill];
if (cssKill) {
  await page.addStyleTag({ content: cssKill });
  console.log(`>> desligado: ${kill}`);
}

// Começa a gravar os frames e as tarefas longas.
await page.evaluate(() => {
  window.__frames = [];
  window.__long = [];
  let last = performance.now();
  const tick = (now) => {
    window.__frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))
  ).observe({ entryTypes: ["longtask"] });
});

/* Rola com a roda do mouse de verdade. Chamar window.scrollTo() brigaria com o
   Lenis (que sequestra o scroll) e produziria um jank que não existe na prática. */
await page.mouse.move(700, 450);
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < total; y += 120) {
  await page.mouse.wheel({ deltaY: 120 });
  await new Promise((r) => setTimeout(r, 16));
}
await new Promise((r) => setTimeout(r, 800));

const result = await page.evaluate(() => {
  const valid = window.__frames.slice(10); // os primeiros são sempre ruidosos
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const long = valid.filter((f) => f > 32).length; // acima disso o olho percebe
  return {
    fpsMedio: +(1000 / avg).toFixed(1),
    framesLongos: `${long} de ${valid.length} (${((long / valid.length) * 100).toFixed(1)}%)`,
    piorFrame: `${Math.max(...valid).toFixed(0)} ms`,
    longTasks: window.__long.length ? window.__long.join(", ") + " ms" : "nenhuma",
  };
});

console.table(result);
await browser.close();
