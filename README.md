# Wonder Fix — site institucional

Site de página única. Vite + GSAP + Lenis, sem framework.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera /dist para publicar
```

## O que ainda precisa de material real

O site está no ar com conteúdo provisório. Por ordem de impacto:

| O quê | Onde | Situação |
|---|---|---|
| Vídeo do hero | `public/video/hero.{webm,mp4}` | Clipe de banco (Mixkit). Trocar por filmagem da fábrica. |
| Números (22 anos, 850 clientes…) | `index.html` → `data-count` | **Inventados.** São a prova mais forte do site — precisam ser reais. |
| Foto da fita personalizada | card 03 em `index.html` | **Falta** — ver aviso abaixo. |
| Foto da caixa em alta resolução | `images/caixa personalizada.png` | Só 533x259. É a foto de destaque do site e a de pior resolução do lote. |
| WhatsApp, e-mail, endereço, CNPJ | `index.html` + `src/main.js` | Estão como `0000`. |
| Depoimento | `index.html` → `.quote` | Fictício. Sem um real, remova a seção. |

## ⚠ Foto que NÃO pode entrar no site

`images/fita-adesiva-personalizada.jpg` **é de outra empresa.** Exibe a marca
"ADHESIVETAPE", o telefone (21) 2197-7000 e o site adhesivetape.com.br — na faixa
de fita, no miolo do rolo e nas etiquetas. Qualquer recorte que mostre a fita
mostra também o contato deles.

Ela está fora do site de propósito, e o card 03 (Fita adesiva personalizada) segue
com placeholder até chegar uma foto própria — um rolo com a marca de um cliente
real da Wonder Fix, que é justamente o que o produto vende.

As fotos usadas são processadas por `node scripts/produtos.mjs` (recorte, resize,
WebP) e saem em `public/images/produtos/`.

## Performance — leia antes de mexer nas animações

O scroll travava a 34 FPS. Hoje roda a ~54. As regras abaixo são o motivo:

1. **Nada de camada `fixed` com opacidade cobrindo a tela.** O grão já foi isso
   e sozinho custava 8 FPS: o compositor refazia a camada inteira a cada frame,
   contra todo o conteúdo que se movia por baixo. Hoje o grão é `background-image`
   das seções (`--grain`) — pintado uma vez e cacheado.
2. **`filter` e `mix-blend-mode` sobre vídeo são proibidos.** A dessaturação e o
   tom azul estão **gravados no arquivo** via ffmpeg (ver comandos abaixo). Antes
   o navegador reprocessava o vídeo 25x por segundo.
3. **Nada de `blur` animado em scroll.** Profundidade se faz com `scale` e
   `opacity`, que rodam na GPU.
4. **Nada de `backdrop-filter`** na barra fixa: obriga a reamostrar tudo que passa
   por baixo dela.
5. **`will-change` só em elemento único.** Nas palavras do split ele criaria
   centenas de camadas na GPU. O GSAP já promove e libera sozinho.
6. Nunca criar tween dentro de um `onUpdate` de scroll — isso aloca dezenas de
   objetos por segundo. Use `gsap.ticker` + interpolação, como no marquee.

### Como medir

```bash
npm run build && npx vite preview --port 4173
node scripts/perf.mjs http://localhost:4173/      # FPS, frames longos, long tasks
node scripts/profile.mjs http://localhost:4173/   # quais funções consomem CPU
node scripts/check.mjs http://localhost:4173/     # erros de console e contadores
node scripts/responsivo.mjs http://localhost:4173/ # 9 larguras, de 320px a 1920px
```

### Responsividade

`scripts/responsivo.mjs` abre o site num Chrome real em nove larguras (320, 360,
390, 430, 600, 768, 1024, 1280, 1920) e reprova o que quebra de verdade: scroll
lateral, elemento estourando a borda, alvo de toque miúdo, texto abaixo de 12px e
imagem deformada. As sete primeiras rodam com toque emulado — é isso que faz as
regras `@media (pointer: coarse)` entrarem; sem emular o dedo, o teste mediria um
layout que nenhum celular recebe.

O piso de alvo clicável acompanha o apontador, como na WCAG 2.5.8: **44px no
dedo, 24px no mouse**. Rode o script depois de mexer em qualquer layout. Se
aparecer scroll lateral, a culpa é quase sempre de largura fixa em `px` ou de um
grid sem `minmax(0, …)`.

**Meça sempre o build de produção, nunca o dev server** — em dev o Vite serve o
GSAP como centenas de módulos separados e o resultado não vale nada. A variação
entre rodadas é alta: rode 2 ou 3 vezes e descarte a primeira.

## Logo

Os arquivos em `public/brand/` foram extraídos do JPEG de apresentação por
`scripts/logo.mjs` (remove o fundo branco e recorta). Rodar de novo:

```bash
node scripts/logo.mjs
```

Isso gera a logo completa, o monograma, o favicon e o card de compartilhamento
(`public/og.jpg` — é o preview que aparece ao mandar o link no WhatsApp).

**Ideal:** conseguir o arquivo vetorial da logo (`.svg`, `.ai`, `.eps`, `.pdf`)
com o designer. O PNG veio de um JPEG, então tem limite de resolução.

Regra de uso: a logo tem contorno navy e **some em fundo escuro**. Por isso, em
área escura ela sempre aparece dentro do "selo" (`.seal`) cor de papel.

## Trocar o vídeo do hero

Filme na horizontal, com o celular apoiado, de dia. Depois:

```bash
ffmpeg -i bruto.mp4 -t 10 -an -vf "fps=25,scale=1920:-2" -c:v libvpx-vp9 -crf 34 -b:v 0 public/video/hero.webm
ffmpeg -i bruto.mp4 -t 10 -an -vf "fps=25,scale=1920:-2" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart public/video/hero.mp4
ffmpeg -i bruto.mp4 -ss 2 -frames:v 1 public/images/hero-poster.webp
```

Sem áudio, sem legenda, sem corte rápido — é plano de fundo, não comercial.
O CSS dessatura e tinge o vídeo de azul automaticamente (`.hero__video`), então
não se preocupe com a cor do bruto.

## Formulário

Hoje monta uma mensagem de WhatsApp (`src/main.js`, final do arquivo). Quando
tiver um endpoint (Formspree, CRM, API), troque o handler do `submit`.

## Créditos do material provisório

- Vídeo do hero: [Mixkit](https://mixkit.co) — licença livre para uso comercial,
  sem exigência de atribuição. **Remover este item quando entrar o vídeo próprio.**
