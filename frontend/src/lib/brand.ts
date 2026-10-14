/** Shown wherever the brand appears until the settings record is available (signed out, not set up, loading). */
export const FALLBACK_BRAND_NAME = 'Jarvis'

/** A rounded-square SVG favicon showing the brand's first letter. */
export function brandFaviconHref(brandName: string) {
  const letter = (brandName.trim()[0] ?? FALLBACK_BRAND_NAME[0]).toUpperCase().replace(/[<>&"']/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#171717"/><text x="16" y="22.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="19" font-weight="700" fill="#fafafa">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
