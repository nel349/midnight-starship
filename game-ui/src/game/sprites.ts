// Pixel art sprites as typed arrays — no image assets needed
// Each sprite is a 2D grid where each number maps to a color index
// 0 = transparent, 1+ = palette colors

export type Sprite = {
  width: number;
  height: number;
  pixels: number[][];
};

// Color palettes (RGBA hex strings)
export const PALETTE = {
  0: 'transparent',
  1: '#ffffff', // white
  2: '#6366f1', // indigo (primary accent)
  3: '#22c55e', // green
  4: '#ef4444', // red
  5: '#eab308', // yellow
  6: '#06b6d4', // cyan
  7: '#f97316', // orange
  8: '#8b5cf6', // purple
  9: '#64748b', // gray
} as const;

// Player ship — 11×9 arrow-like starship
export const SHIP: Sprite = {
  width: 11,
  height: 9,
  pixels: [
    [0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 6, 1, 6, 0, 0, 0, 0],
    [0, 0, 0, 0, 6, 1, 6, 0, 0, 0, 0],
    [0, 0, 0, 6, 2, 1, 2, 6, 0, 0, 0],
    [0, 0, 6, 2, 2, 1, 2, 2, 6, 0, 0],
    [0, 6, 2, 2, 1, 1, 1, 2, 2, 6, 0],
    [6, 2, 2, 1, 1, 1, 1, 1, 2, 2, 6],
    [6, 9, 2, 2, 1, 1, 1, 2, 2, 9, 6],
    [0, 0, 6, 0, 0, 4, 0, 0, 6, 0, 0],
  ],
};

// Enemy type 1 — Bee (small, fast)
export const ENEMY_BEE: Sprite = {
  width: 9,
  height: 7,
  pixels: [
    [0, 0, 0, 5, 0, 5, 0, 0, 0],
    [0, 0, 5, 5, 5, 5, 5, 0, 0],
    [0, 5, 5, 1, 5, 1, 5, 5, 0],
    [5, 5, 5, 5, 5, 5, 5, 5, 5],
    [0, 5, 7, 5, 5, 5, 7, 5, 0],
    [0, 0, 5, 0, 5, 0, 5, 0, 0],
    [0, 5, 0, 0, 0, 0, 0, 5, 0],
  ],
};

// Enemy type 2 — Butterfly (medium, swooping)
export const ENEMY_BUTTERFLY: Sprite = {
  width: 9,
  height: 7,
  pixels: [
    [0, 0, 4, 0, 0, 0, 4, 0, 0],
    [0, 4, 4, 4, 0, 4, 4, 4, 0],
    [4, 4, 1, 4, 4, 4, 1, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4],
    [0, 4, 4, 4, 4, 4, 4, 4, 0],
    [0, 0, 4, 0, 4, 0, 4, 0, 0],
    [0, 4, 0, 0, 0, 0, 0, 4, 0],
  ],
};

// Enemy type 3 — Boss (large, tough)
export const ENEMY_BOSS: Sprite = {
  width: 11,
  height: 9,
  pixels: [
    [0, 0, 0, 8, 8, 8, 8, 8, 0, 0, 0],
    [0, 0, 8, 8, 8, 8, 8, 8, 8, 0, 0],
    [0, 8, 1, 8, 8, 8, 8, 1, 8, 8, 0],
    [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    [0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 0],
    [0, 0, 8, 0, 8, 8, 8, 0, 8, 0, 0],
    [0, 8, 0, 0, 0, 0, 0, 0, 0, 8, 0],
    [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8],
  ],
};

// Torpedo — player projectile
export const TORPEDO: Sprite = {
  width: 3,
  height: 5,
  pixels: [
    [0, 1, 0],
    [0, 1, 0],
    [6, 1, 6],
    [0, 6, 0],
    [0, 6, 0],
  ],
};

// Enemy torpedo
export const ENEMY_TORPEDO: Sprite = {
  width: 3,
  height: 5,
  pixels: [
    [0, 4, 0],
    [0, 4, 0],
    [7, 4, 7],
    [0, 7, 0],
    [0, 7, 0],
  ],
};

// Render a sprite to a canvas context at the given position (centered)
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  cx: number,
  cy: number,
  scale: number = 1,
): void {
  const startX = cx - (sprite.width * scale) / 2;
  const startY = cy - (sprite.height * scale) / 2;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const colorIdx = sprite.pixels[y][x];
      if (colorIdx === 0) continue;
      const color = PALETTE[colorIdx as keyof typeof PALETTE];
      if (color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        startX + x * scale,
        startY + y * scale,
        scale,
        scale,
      );
    }
  }
}
