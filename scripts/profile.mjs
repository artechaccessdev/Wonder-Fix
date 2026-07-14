/* Perfila a CPU durante o scroll e lista as funções que mais consomem tempo.
   Rodar:  node scripts/profile.mjs                                         */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5174/";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--window-size=1440,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.goto(URL, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 3000));

const client = await page.target().createCDPSession();
await client.send("Profiler.enable");
await client.send("Profiler.setSamplingInterval", { interval: 100 });
await client.send("Profiler.start");

await page.mouse.move(700, 450);
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < total; y += 120) {
  await page.mouse.wheel({ deltaY: 120 });
  await new Promise((r) => setTimeout(r, 16));
}

const { profile } = await client.send("Profiler.stop");

// Soma o tempo em que cada função estava no topo da pilha (selfTime).
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;

profile.samples.forEach((id, i) => {
  const node = byId.get(id);
  if (!node) return;
  const f = node.callFrame;
  const nome = `${f.functionName || "(anônima)"}  ${f.url.split("/").pop()}:${f.lineNumber + 1}`;
  self.set(nome, (self.get(nome) || 0) + (dt[i] || 0));
});

const totalUs = [...self.values()].reduce((a, b) => a + b, 0);
const top = [...self.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([nome, us]) => ({
    função: nome,
    ms: +(us / 1000).toFixed(1),
    "%": +((us / totalUs) * 100).toFixed(1),
  }));

console.table(top);
await browser.close();
