// The exhibition accent color (admin-picked via a free <input type="color">,
// see admin/exhibitions) is used as a card header background with white text
// on top. Some admin-chosen colors (e.g. lighter blues) don't give white
// text enough contrast against the raw color -- rather than trusting every
// future admin color choice to happen to be dark enough, darken it just
// enough (and no more) to guarantee a safe contrast margin.

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(clean.substring(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Targets a luminance low enough that opaque white text reaches roughly a
// 6:1 contrast ratio against it -- comfortably above WCAG AA's 4.5:1 for
// normal text, leaving margin for anti-aliasing and the exact color chosen.
const TARGET_LUMINANCE = 0.12;

export function ensureDarkEnoughForWhiteText(hex: string): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;

  const srcLuminance = relativeLuminance(hex);
  if (srcLuminance <= TARGET_LUMINANCE) return hex;

  // Blending each channel toward black by `factor` scales its linearized
  // (gamma-decoded) contribution by roughly (1-factor)^2.4, so luminance
  // scales the same way -- solve for the factor that lands on the target.
  const factor = 1 - Math.pow(TARGET_LUMINANCE / srcLuminance, 1 / 2.4);
  const channels = [0, 2, 4].map((i) => Math.round(parseInt(clean.substring(i, i + 2), 16) * (1 - factor)));
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}
