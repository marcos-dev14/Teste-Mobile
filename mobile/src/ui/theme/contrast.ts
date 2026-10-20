/** Razão de contraste WCAG 2.x entre duas cores hexadecimais (#RRGGBB). */
export function contrastRatio(foreground: string, background: string): number {
  const [l1, l2] = [relativeLuminance(foreground), relativeLuminance(background)]
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Cor de texto legível sobre um fundo arbitrário (ex.: amostra de cor do produto). */
export function readableOn(background: string, light = '#FFFFFF', dark = '#1A1714'): string {
  return contrastRatio(light, background) >= contrastRatio(dark, background) ? light : dark
}
