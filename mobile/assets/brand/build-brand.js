/**
 * Gera os SVGs-fonte e os PNGs da marca Vesti a partir de uma única geometria.
 *
 * Uso (dependências só de build, não entram no app):
 *   npm install --no-save @resvg/resvg-js@2.6.2 opentype.js@1.3.4
 *   node assets/brand/build-brand.js
 *
 * O wordmark é convertido em curvas (Fraunces SemiBold), então os SVGs não dependem de fonte instalada.
 */
const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')
const opentype = require('opentype.js')

const ROOT = path.resolve(__dirname, '..', '..')
const BRAND = path.join(ROOT, 'assets', 'brand')
const IMAGES = path.join(ROOT, 'assets', 'images')
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf')

// Paleta da marca (espelhada em src/ui/theme/tokens.ts → brand).
const C = {
  ink: '#1A1714',
  inkDeep: '#141210',
  cream: '#F6F3EE',
  creamDark: '#F3EEE7',
  clay: '#A84B29',
  clayBright: '#C8643C',
  clayLight: '#E58A63',
}

// Símbolo: fita dobrada em "V". Frente (braço esquerdo) e verso (braço direito, sobreposto na dobra).
const SYMBOL = { width: 440, height: 432 }
const FRONT = '0,0 120,0 280,432 160,432'
const BACK = '440,0 320,0 160,432 280,432'

function symbol({ front, back, fold = true, id = 's' }) {
  // Sombra suave que o verso projeta sobre a frente, perpendicular à borda interna do braço direito.
  const shadow = fold
    ? `<defs>
    <clipPath id="${id}-front"><polygon points="${FRONT}"/></clipPath>
    <linearGradient id="${id}-fold" gradientUnits="userSpaceOnUse" x1="240" y1="216" x2="166" y2="189">
      <stop offset="0" stop-color="${C.ink}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${C.ink}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#${id}-front)"><rect x="-40" y="-40" width="400" height="520" fill="url(#${id}-fold)"/></g>`
    : ''
  return `<polygon points="${FRONT}" fill="${front}"/>
  ${shadow}
  <polygon points="${BACK}" fill="${back}"/>`
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n  ${body}\n</svg>\n`

/** Símbolo centralizado num quadrado, ocupando `ratio` da largura (fundo opcional). */
function square(size, ratio, colors, background) {
  const scale = (size * ratio) / SYMBOL.width
  const x = (size - SYMBOL.width * scale) / 2
  // Centro óptico: o "V" pesa no topo, então desce ~1% em relação ao centro geométrico.
  const y = (size - SYMBOL.height * scale) / 2 + size * 0.01
  const bg = background ? `<rect width="${size}" height="${size}" fill="${background}"/>\n  ` : ''
  return svg(size, size, `${bg}<g transform="translate(${x} ${y}) scale(${scale})">\n  ${symbol(colors)}\n  </g>`)
}

// Wordmark em curvas. Altura do símbolo = altura de maiúscula da Fraunces; base alinhada à linha de base.
const font = opentype.loadSync(FONT)
const FONT_SIZE = 200
const wordPath = font.getPath('vesti', 0, 0, FONT_SIZE, { letterSpacing: -0.02 })
const wordBox = wordPath.getBoundingBox()
const capHeight = (font.tables.os2.sCapHeight / font.unitsPerEm) * FONT_SIZE
const symbolScale = capHeight / SYMBOL.height
const symbolWidth = SYMBOL.width * symbolScale
const GAP = 34

function wordmarkSvg(fill) {
  const pad = 8
  const w = Math.ceil(wordBox.x2 - wordBox.x1 + pad * 2)
  const h = Math.ceil(-wordBox.y1 + wordBox.y2 + pad * 2)
  const d = wordPath.toPathData(2)
  return { w, h, body: `<path transform="translate(${pad - wordBox.x1} ${pad - wordBox.y1})" d="${d}" fill="${fill}"/>` }
}

function lockupSvg(colors, textFill) {
  const pad = 24
  const top = Math.min(wordBox.y1, -capHeight)
  const h = Math.ceil(-top + wordBox.y2 + pad * 2)
  const textX = symbolWidth + GAP
  const w = Math.ceil(textX + wordBox.x2 + pad * 2)
  const baseline = pad - top
  const d = wordPath.toPathData(2)
  return svg(
    w,
    h,
    `<g transform="translate(${pad} ${baseline - capHeight}) scale(${symbolScale})">\n  ${symbol({ ...colors, id: 'l' })}\n  </g>
  <path transform="translate(${pad + textX} ${baseline})" d="${d}" fill="${textFill}"/>`,
  )
}

const light = { front: C.ink, back: C.clay, fold: false }
const dark = { front: C.creamDark, back: C.clayLight }
const icon = { front: C.cream, back: C.clayBright }

const sources = {
  'vesti-symbol.svg': svg(SYMBOL.width, SYMBOL.height, symbol(light)),
  'vesti-symbol-dark.svg': svg(SYMBOL.width, SYMBOL.height, symbol({ ...dark, id: 'd' })),
  'vesti-app-icon.svg': square(1024, 0.43, icon, C.ink),
  'vesti-logo.svg': lockupSvg(light, C.ink),
  'vesti-logo-dark.svg': lockupSvg(dark, C.creamDark),
}
const wm = wordmarkSvg(C.ink)
const wmDark = wordmarkSvg(C.creamDark)
sources['vesti-wordmark.svg'] = svg(wm.w, wm.h, wm.body)
sources['vesti-wordmark-dark.svg'] = svg(wmDark.w, wmDark.h, wmDark.body)

for (const [name, content] of Object.entries(sources)) fs.writeFileSync(path.join(BRAND, name), content)

function png(svgText, file, width) {
  const out = new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng()
  fs.writeFileSync(file, out)
}

// Ícones e splash (Expo).
png(sources['vesti-app-icon.svg'], path.join(IMAGES, 'icon.png'), 1024)
// Foreground adaptativo: símbolo menor, dentro do círculo seguro de 66 dp (fundo vem do app.json).
png(square(1024, 0.34, icon), path.join(IMAGES, 'adaptive-icon.png'), 1024)
png(square(1024, 0.43, icon, C.ink), path.join(IMAGES, 'favicon.png'), 196)
// Splash nativa: quadrado exibido com `imageWidth` dp (app.json). O símbolo ocupa SPLASH_RATIO dele,
// e a splash animada começa exatamente desse tamanho para a troca nativa → JS ser imperceptível.
const SPLASH_IMAGE_WIDTH = 96
const SPLASH_RATIO = 2 / 3
png(square(1024, SPLASH_RATIO, light), path.join(IMAGES, 'splash-icon.png'), 1024)
png(square(1024, SPLASH_RATIO, { ...dark, id: 'sd' }), path.join(IMAGES, 'splash-icon-dark.png'), 1024)

// Camadas da splash animada e do cabeçalho (exibidas em dp; exportadas em 3x).
png(sources['vesti-symbol.svg'], path.join(IMAGES, 'brand-symbol.png'), 440)
png(sources['vesti-symbol-dark.svg'], path.join(IMAGES, 'brand-symbol-dark.png'), 440)
png(sources['vesti-wordmark.svg'], path.join(IMAGES, 'brand-wordmark.png'), wm.w * 2)
png(sources['vesti-wordmark-dark.svg'], path.join(IMAGES, 'brand-wordmark-dark.png'), wmDark.w * 2)
png(sources['vesti-logo.svg'], path.join(BRAND, 'vesti-logo.png'), 1200)
png(sources['vesti-logo-dark.svg'], path.join(BRAND, 'vesti-logo-dark.png'), 1200)

// Geometria do lockup para o app (src/ui/brand/brand-assets.ts), em múltiplos da largura do símbolo.
const PAD = 8 // margem interna de wordmarkSvg
const round = (value) => Math.round(value * 10000) / 10000
const metrics = {
  splashSymbolWidth: SPLASH_IMAGE_WIDTH * SPLASH_RATIO,
  symbolAspect: round(SYMBOL.width / SYMBOL.height),
  wordmarkWidth: round(wm.w / symbolWidth),
  wordmarkHeight: round(wm.h / symbolWidth),
  // Da borda direita do símbolo até a borda esquerda da imagem do wordmark.
  wordmarkOffsetX: round((GAP + wordBox.x1 - PAD) / symbolWidth),
  // Do topo do símbolo até o topo da imagem do wordmark (negativo: começa acima).
  wordmarkOffsetY: round((wordBox.y1 - PAD + capHeight) / symbolWidth),
}
fs.writeFileSync(path.join(BRAND, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)
console.log(metrics)
