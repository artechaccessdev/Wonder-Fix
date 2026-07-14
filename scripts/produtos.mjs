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

/* images/fitas_adesivas-todo-tipo.jpg não é mais usada: o card do banner largo
   foi removido. A seção tem três produtos. */

/* ⚠ images/fita-adesiva-personalizada.jpg NÃO É USADA — de propósito.
   A foto é de OUTRA EMPRESA: exibe a marca "ADHESIVETAPE", o telefone
   (21) 2197-7000 e o site, na faixa de fita, no miolo do rolo e nas etiquetas.
   Todo recorte que mostra a fita mostra também o contato deles.
   Substituída por images/foto-fita-personalizada-2.png (card 03, acima). */

console.log("gerado em", OUT);
