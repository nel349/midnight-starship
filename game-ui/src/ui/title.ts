// Midnight logo and wordmark with materialize animation
// Everything rendered as pixel art via fillRect — true retro arcade look

import { VIRTUAL_WIDTH } from '../config';

// Logo pixel grid: 1 = filled (20×16, each cell = 3px)
const LOGO: number[][] = [
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0],
  [0,0,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,0,0],
  [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0],
  [0,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1,0],
  [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0],
  [0,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1,0],
  [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0],
  [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0],
  [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
];

const LOGO_CELL = 3;
const LOGO_PX_W = LOGO[0].length * LOGO_CELL;
const LOGO_PX_H = LOGO.length * LOGO_CELL;

// 5×7 pixel font bitmaps for each letter we need
const PIXEL_FONT: Record<string, number[][]> = {
  M: [
    [1,0,0,0,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  I: [
    [1,1,1],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [0,1,0],
    [1,1,1],
  ],
  D: [
    [1,1,1,0],
    [1,0,0,1],
    [1,0,0,1],
    [1,0,0,1],
    [1,0,0,1],
    [1,0,0,1],
    [1,1,1,0],
  ],
  N: [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,0,1,0,1],
    [1,0,1,0,1],
    [1,0,0,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  G: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  H: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  T: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
  S: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [0,1,1,1,0],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  A: [
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  R: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1],
  ],
  P: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
};

const LETTER_SCALE = 3; // pixels per font pixel
const LETTER_GAP = 4;   // gap between letters
const FONT_H = 7;       // font bitmap height

function getWordWidth(word: string): number {
  let w = 0;
  for (const ch of word) {
    const glyph = PIXEL_FONT[ch];
    if (glyph) w += glyph[0].length * LETTER_SCALE + LETTER_GAP;
  }
  return w - LETTER_GAP; // no trailing gap
}

function renderPixelWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  cx: number,
  y: number,
  color: string,
  progress: number,
  seed: number,
  rowOffset: number,
): void {
  const totalW = getWordWidth(word);
  let x = cx - totalW / 2;

  for (let ci = 0; ci < word.length; ci++) {
    const ch = word[ci];
    const glyph = PIXEL_FONT[ch];
    if (!glyph) continue;

    const charThreshold = ci / word.length;
    const charVisible = progress > charThreshold;

    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === 0) continue;

        const px = x + col * LETTER_SCALE;
        const py = y + row * LETTER_SCALE;

        if (charVisible) {
          ctx.fillStyle = color;
        } else if (progress > 0) {
          // Noise pixel
          const hash = (((rowOffset + row) * 131 + (ci * 10 + col) * 997 + seed * 7919) % 65537) / 65537;
          const b = Math.floor(hash * 100) + 30;
          ctx.fillStyle = `rgb(${b},${b},${Math.floor(b * 1.5)})`;
        } else {
          continue;
        }

        ctx.fillRect(px, py, LETTER_SCALE, LETTER_SCALE);
      }
    }

    // Noise for unrevealed letters
    if (!charVisible && progress > 0) {
      for (let row = 0; row < FONT_H; row++) {
        for (let col = 0; col < glyph[0].length; col++) {
          if (glyph[row][col] === 1) continue; // already drawn
          const hash = (((rowOffset + row) * 131 + (ci * 10 + col) * 997 + seed * 3571) % 65537) / 65537;
          if (hash < 0.15) {
            const b = Math.floor(hash * 60) + 15;
            ctx.fillStyle = `rgb(${b},${b},${b})`;
            ctx.fillRect(x + col * LETTER_SCALE, y + row * LETTER_SCALE, LETTER_SCALE, LETTER_SCALE);
          }
        }
      }
    }

    x += glyph[0].length * LETTER_SCALE + LETTER_GAP;
  }
}

/**
 * Renders the Midnight logo + wordmarks with materialize animation.
 *
 * Animation timeline:
 *   0.0–1.5s  Logo materializes from noise pixels
 *   1.2–2.0s  MIDNIGHT letters reveal left-to-right
 *   2.0–2.8s  STARSHIP letters reveal left-to-right
 */
export function renderTitle(
  ctx: CanvasRenderingContext2D,
  timer: number,
  startY: number = 5,
): void {
  const seed = Math.floor(timer * 60);
  const logoCx = Math.floor((VIRTUAL_WIDTH - LOGO_PX_W) / 2);

  // Phase 1: Logo materialize
  const logoProgress = Math.min(1, timer / 1.5);
  renderLogo(ctx, logoCx, startY, logoProgress, seed);

  // Phase 2: MIDNIGHT — Galaga red
  const midnightY = startY + LOGO_PX_H + 10;
  const midnightProgress = timer > 1.2 ? Math.min(1, (timer - 1.2) / 0.8) : 0;
  renderPixelWord(ctx, 'MIDNIGHT', VIRTUAL_WIDTH / 2, midnightY, '#ef4444', midnightProgress, seed, 20);

  // Phase 3: STARSHIP — Galaga cyan
  const starshipY = midnightY + FONT_H * LETTER_SCALE + 8;
  const starshipProgress = timer > 2.0 ? Math.min(1, (timer - 2.0) / 0.8) : 0;
  renderPixelWord(ctx, 'STARSHIP', VIRTUAL_WIDTH / 2, starshipY, '#22d3ee', starshipProgress, seed, 30);
}

function renderLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  seed: number,
): void {
  for (let row = 0; row < LOGO.length; row++) {
    for (let col = 0; col < LOGO[row].length; col++) {
      const px = x + col * LOGO_CELL;
      const py = y + row * LOGO_CELL;

      if (LOGO[row][col] === 1) {
        const threshold = ((row * 131 + col * 997) % 100) / 100;
        if (progress >= threshold) {
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(px, py, LOGO_CELL, LOGO_CELL);
        } else if (progress > 0) {
          const hash = ((row * 131 + col * 997 + seed * 7919) % 65537) / 65537;
          const b = Math.floor(hash * 150) + 50;
          ctx.fillStyle = `rgb(${b},${b},${b})`;
          ctx.fillRect(px, py, LOGO_CELL, LOGO_CELL);
        }
      } else if (progress < 1 && progress > 0) {
        const hash = ((row * 131 + col * 997 + seed * 3571) % 65537) / 65537;
        if (hash < progress * 0.12) {
          const b = Math.floor(hash * 60) + 15;
          ctx.fillStyle = `rgb(${b},${b},${b})`;
          ctx.fillRect(px, py, LOGO_CELL, LOGO_CELL);
        }
      }
    }
  }
}

/** Default startY used by renderTitle */
export const TITLE_START_Y = 5;

/** Y position where content below the title should begin */
export const TITLE_BOTTOM = TITLE_START_Y + LOGO_PX_H + 10 + FONT_H * LETTER_SCALE + 8 + FONT_H * LETTER_SCALE + 8;
