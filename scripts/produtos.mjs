/* Prepara as fotos de produto: recorta, redimensiona e converte para WebP.
   Rodar: node scripts/produtos.mjs                                          */
import sharp from "sharp";
import { mkdirSync } from "fs";

const OUT = "public/images/produtos";
mkdirSync(OUT, { recursive: true });

const webp = (s, file, w, h) =>
  s.resize(w, h, { fit: "cover", kernel: "lanczos3" })
    .webp({ quality: 82 })
    .toFile(`${OUT}/${file}.webp`);

/* Os três primeiros cards são quadrados. Isto NÃO é capricho de layout: a foto
   da caixa tem 425x462 e é a melhor do lote (mostra a marca Wonder Fix impressa
   no produto real). Num card largo ela precisaria de fundo falso ou de um corte
   que decepa a caixa aberta e as mãos. Num quadrado de ~420px ela entra quase
   no tamanho nativo — nítida, inteira, sem remendo. */

/* 01 · Caixa personalizada — marca Wonder Fix impressa no papelão.
   O nome traz "-v2" para furar o cache do navegador: o arquivo antigo, com um
   fundo desfocado que foi descartado, ficava preso no cache com o nome antigo. */
await webp(sharp("images/caixa-personalizada2.png"), "caixa-v2", 900, 900);

/* 02 · Fita de sinalização — zebrada, demarcação de piso e área de risco.
   NÃO é fita VOID / anti-violação. */
await webp(sharp("images/fita-adesiva-de-segurança.jpg"), "sinalizacao", 900, 900);

/* 03 · Fita adesiva personalizada — o rolo traz a marca WONDER FIX, e é por isso
   que esta entra onde a antiga foi barrada (ver aviso abaixo).

   O corte não é estético, é obrigatório: o original tem 712x637 e carrega um selo
   "AI" no canto superior esquerdo, nos primeiros ~40px. Extraindo o quadrado de
   637 a partir de x=75 (712 - 637), o selo sai junto com a margem — e a caixa, o
   rolo e as mãos continuam inteiros no quadro. Mexer nesses números sem olhar a
   imagem traz o selo de volta para dentro do site. */
await webp(
  sharp("images/foto-fita-personalizada-2.png")
    .extract({ left: 75, top: 0, width: 637, height: 637 }),
  "fita-personalizada",
  900, 900,
);

/* ── Cards 04-06 · vindos do catálogo do site antigo (adhesivetape.com.br) ──
   Estes três nascem em 4:3 (1200x900), a proporção do quadro no layout novo —
   entram sem corte. Os três de cima seguem quadrados e o object-fit: cover do
   CSS apara o excedente; foi o combinado para não estragar fotos pequenas.
   Nenhuma das três mostra marca ou telefone (ver o aviso lá embaixo).          */

/* 04 · Fita gomada — rolo de papel kraft, foto de estúdio 1303x1413. */
await webp(sharp("images/_old-fita-gomada.jpg"), "fita-gomada", 1200, 900);

/* 05 · Fitilhos — rolo grande + rolo na rede, foto de estúdio 2326x1632. */
await webp(sharp("images/_old-fitilhos.jpg"), "fitilhos", 1200, 900);

/* ⚠ 06 · Plástico bolha — FOTO PROVISÓRIA. O original tem só 474x517: é imagem
   de banco, não do produto deles, e sobe para 1200x900 por interpolação — em
   tela retina o rolo sai macio. Funciona por ora; trocar assim que a fábrica
   mandar uma foto real. É a única das seis abaixo do padrão.

   Aqui o rolo é COMPOSTO sobre uma tela branca em vez de preencher o quadro como
   as outras cinco. O original é retrato; recortado em 4:3 virava um close das
   bolhas — textura, não produto. E "contain" puro também não bastava: o CSS do
   card pede 116% de altura para o parallax e reenquadra a imagem, comendo as
   bordas. A folga branca em volta é o que o reenquadramento consome sem tocar no
   rolo. O branco casa com o fundo da própria foto. */
const bolha = await sharp("images/_old-plastico-bolha.jpg")
  .resize({ height: 620, kernel: "lanczos3" })
  .toBuffer();
await sharp({
  create: { width: 1200, height: 900, channels: 3, background: "#ffffff" },
})
  .composite([{ input: bolha, gravity: "center" }])
  .webp({ quality: 82 })
  .toFile(`${OUT}/plastico-bolha.webp`);

/* ── Cards 07-08 · fotos enviadas pelo cliente (jul/2026) ─────────────────────
   As duas já nascem em 4:3 (~1450x1085), a proporção do quadro do card: entram
   sem corte, o resize só reduz para 1200x900. */

/* 07 · Fita crepe — três rolos em larguras diferentes, foto de estúdio. */
await webp(sharp("images/fita-crepe.jpg"), "fita-crepe", 1200, 900);

/* 08 · Fita adesiva marrom — o rolo marrom e o transparente lado a lado.
   ATENÇÃO ao histórico: a versão original desta foto trazia a marca "sticky tape"
   e o telefone (21) 2197-7000 estampados na etiqueta do miolo dos dois rolos — o
   mesmo contato de terceiro que barrou images/fita-adesiva-personalizada.jpg.
   O cliente reeditou a imagem e removeu as etiquetas; os miolos agora estão
   limpos. Se um dia esta foto for trocada, confira o miolo dos rolos antes. */
await webp(sharp("images/fita-adesiva-marrom.png"), "fita-marrom", 1200, 900);

/* images/fitas_adesivas-todo-tipo.jpg não é mais usada: o card do banner largo
   foi removido. */

/* ⚠ images/fita-adesiva-personalizada.jpg NÃO É USADA — de propósito.
   A foto é de OUTRA EMPRESA: exibe a marca "ADHESIVETAPE", o telefone
   (21) 2197-7000 e o site, na faixa de fita, no miolo do rolo e nas etiquetas.
   Todo recorte que mostra a fita mostra também o contato deles.
   Substituída por images/foto-fita-personalizada-2.png (card 03, acima). */

console.log("gerado em", OUT);
