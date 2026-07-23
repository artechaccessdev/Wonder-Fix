/* Extrai a logo do JPEG de apresentação e gera PNGs com fundo transparente.
   Rodar: node scripts/logo.mjs                                              */
import sharp from "sharp";
import { mkdirSync } from "fs";

const SRC = "images/logo 3 ampla.jpeg";
const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

const src = sharp(SRC);
const { width, height } = await src.metadata();
const { data } = await src.raw().toBuffer({ resolveWithObject: true });

// Fundo é branco: vira alpha 0. Rampa suave para não serrilhar a borda.
const rgba = Buffer.alloc(width * height * 4);
const rowInk = new Array(height).fill(0);

for (let i = 0, p = 0; i < width * height; i++, p += 3) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  let a = 0;
  if (lum < 225) a = 255;
  else if (lum < 248) a = Math.round(((248 - lum) / 23) * 255);

  const o = i * 4;
  rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a;
  if (a > 40) rowInk[Math.floor(i / width)]++;
}

// Segmenta em blocos horizontais (símbolo / wordmark / slogan) achando linhas vazias.
const segs = [];
let start = null;
for (let y = 0; y < height; y++) {
  const inked = rowInk[y] > 2;
  if (inked && start === null) start = y;
  if (!inked && start !== null) {
    if (y - start > 12) segs.push([start, y]);
    start = null;
  }
}
if (start !== null) segs.push([start, height]);
console.log("dimensões:", width, "x", height);
console.log("blocos verticais:", segs.map(([a, b]) => `${a}→${b}`).join("  "));

const raw = () => sharp(rgba, { raw: { width, height, channels: 4 } });

// sharp aplica trim ANTES de extract na mesma pipeline — por isso o recorte
// vai para um buffer e o trim acontece num segundo passe.
const cut = async (top, h, file) => {
  const buf = await raw().extract({ left: 0, top, width, height: h }).png().toBuffer();
  await sharp(buf).trim({ threshold: 1 }).png().toFile(`${OUT}/${file}`);
};

// 1 · Logo completa
await sharp(await raw().png().toBuffer()).trim({ threshold: 1 }).png()
  .toFile(`${OUT}/logo-full.png`);

// 2 · Símbolo com o arco "DESDE 2003" (blocos 1 ao 4)
await cut(segs[0][0], segs[3][1] - segs[0][0], "logo-mark.png");

// 3 · Só o monograma W/F em caixas — para o nav e o favicon
await cut(segs[3][0], segs[3][1] - segs[3][0], "logo-symbol.png");

// 3 · Favicon (símbolo sobre o navy da marca)
const sym = await sharp(`${OUT}/logo-symbol.png`)
  .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 239, g: 237, b: 231, alpha: 1 } },
})
  .composite([{ input: sym, gravity: "center" }])
  .png()
  .toFile(`${OUT}/favicon.png`);

/* 4 · Versões para fundo escuro.
   A logo é desenhada em navy — sobre o navy do site ela desaparece.

   Duas regras, e o que decide qual usar é a POSIÇÃO, não a cor:

   · No SÍMBOLO, o contorno escuro fica na cor original (preto/navy) e o azul
     da fita do "F" é clareado. O kraft das caixas fica intacto.

   · No WORDMARK e no SLOGAN, tudo vira papel, sem exceção.

   Foi tentado resolver só por cor e não fecha: o navy do "WONDER FIX" (b-r = 80)
   e o azul da fita se sobrepõem em qualquer limiar. Testando azul primeiro, o
   texto sai num azul-aço morto que some no fundo. Testando escuro primeiro, as
   sombras da fita do "F" viram papel e o azul da marca se despedaça. O que de
   fato separa os dois é onde cada um está na arte — e os blocos já foram
   segmentados acima. Daí a FAIXA DO SÍMBOLO.

   Tudo que está FORA dessa faixa é tipografia — o arco "DESDE 2003" com as
   estrelas em cima, o "WONDER FIX" e o slogan embaixo — e tipografia vira papel,
   sem exceção. (O arco já saiu navy escuro uma vez, invisível sobre o rodapé,
   justamente por ficar de fora da regra.) */
const PAPER = [239, 237, 231];

function recolorir(data, { width, height, channels }, simbolo = null) {
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o], g = data[o + 1], b = data[o + 2], a = data[o + 3];
    if (a < 10) continue;

    const y = Math.floor(i / width);
    const noSimbolo = !simbolo || (y >= simbolo[0] && y < simbolo[1]);

    const isBlue = b - r > 35;

    if (!noSimbolo) {
      // tipografia: contraste cheio, é o que se lê
      [data[o], data[o + 1], data[o + 2]] = PAPER;
    } else if (isBlue) {
      // azul → mais claro, para destacar do fundo navy
      data[o] = Math.min(255, Math.round(r * 1.15 + 40));
      data[o + 1] = Math.min(255, Math.round(g * 1.15 + 48));
      data[o + 2] = Math.min(255, Math.round(b * 1.05 + 42));
    }
  }
}

// Símbolo (nav, preloader): recorte já isolado, nenhuma linha vira papel por posição.
const symRaw = await sharp(`${OUT}/logo-symbol.png`).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });
recolorir(symRaw.data, symRaw.info);
await sharp(symRaw.data, {
  raw: { width: symRaw.info.width, height: symRaw.info.height, channels: symRaw.info.channels },
}).png().toFile(`${OUT}/logo-symbol-light.png`);

/* Logo completa (rodapé): parte do buffer ANTES do trim, porque é nele que os
   blocos foram medidos — cortar primeiro desloca as coordenadas.
   segs[3] é o monograma em caixas: a única faixa que mantém a cor. */
const cheia = Buffer.from(rgba);
recolorir(cheia, { width, height, channels: 4 }, segs[3]);
await sharp(cheia, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 1 })
  .png()
  .toFile(`${OUT}/logo-full-light.png`);

// 5 · Card de compartilhamento (WhatsApp / LinkedIn) — 1200x630
const ogLogo = await sharp(`${OUT}/logo-full.png`)
  .resize({ height: 380, fit: "inside" })
  .toBuffer();
const bar = await sharp({
  create: { width: 1200, height: 14, channels: 4, background: { r: 197, g: 138, b: 78, alpha: 1 } },
}).png().toBuffer();

await sharp({
  create: { width: 1200, height: 630, channels: 4, background: { r: 239, g: 237, b: 231, alpha: 1 } },
})
  .composite([
    { input: ogLogo, gravity: "center" },
    { input: bar, top: 616, left: 0 },
  ])
  .jpeg({ quality: 90 })
  .toFile("public/og.jpg");

console.log("gerado em", OUT, "+ public/og.jpg");
