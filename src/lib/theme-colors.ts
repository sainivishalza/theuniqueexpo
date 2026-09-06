// Turns one admin-picked hex color into a full Tailwind-style 50..950
// tint/shade scale, by keeping the picked color's hue/saturation fixed and
// walking lightness along a fixed curve. The curve is anchored so the step
// the admin is conceptually picking (e.g. 600 for a "primary" color) comes
// out close to the color they actually chose, rather than the curve's own
// canonical lightness for that step.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const LIGHTNESS_CURVE = [96, 91, 82, 70, 55, 42, 34, 28, 22, 15, 8];

export type ColorScale = Record<(typeof STEPS)[number], string>;

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const match = HEX_RE.exec(hex);
  const clean = match ? match[1] : "000000";
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rN: h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6; break;
    case gN: h = ((bN - rN) / d + 2) / 6; break;
    default: h = ((rN - gN) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100, lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

// anchorStep is which step in STEPS the input hex is treated as -- e.g. a
// "primary brand color" picker anchors at 600, a "background" picker at 50.
export function generateScale(baseHex: string, anchorStep: (typeof STEPS)[number] = 600): ColorScale {
  const safeHex = isValidHex(baseHex) ? baseHex : "#075b4f";
  const [r, g, b] = hexToRgb(safeHex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const anchorIndex = STEPS.indexOf(anchorStep);
  const offset = l - LIGHTNESS_CURVE[anchorIndex];

  const scale = {} as ColorScale;
  STEPS.forEach((step, i) => {
    const targetL = Math.min(98, Math.max(2, LIGHTNESS_CURVE[i] + offset));
    scale[step] = i === anchorIndex ? safeHex : hslToHex(h, s, targetL);
  });
  return scale;
}

// A couple of nearby tints for a standalone color (e.g. the footer), which
// doesn't need a full 11-step scale -- just a slightly lighter "surface"
// tone for inputs/icon chips and an even lighter one for hairline borders.
export function deriveTints(baseHex: string): { base: string; surface: string; border: string } {
  const safeHex = isValidHex(baseHex) ? baseHex : "#011714";
  const [r, g, b] = hexToRgb(safeHex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return {
    base: safeHex,
    surface: hslToHex(h, Math.max(0, s - 5), Math.min(96, l + 6)),
    border: hslToHex(h, Math.max(0, s - 8), Math.min(96, l + 11)),
  };
}
