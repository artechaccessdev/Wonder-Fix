/* Fotografa uma seção no desktop e no celular.
   Uso: node scripts/shot.mjs <url> <seletor>                            */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5174/";
const SEL = process.argv[3] || ".process";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });

for (const [nome, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto(URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3000));

  await page.evaluate((s) => document.querySelector(s).scrollIntoView(), SEL);
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: `scripts/_${nome}.png` });
  console.log(`scripts/_${nome}.png`);
  await page.close();
}
await browser.close();
