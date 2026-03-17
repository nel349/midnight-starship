import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config';
import { playEnemyHit, playBossHurt, playBossDeath, playPlayerDeath, playDiving, playLevelStart } from './audio';
import {
  SHIP,
  ENEMY_BEE,
  ENEMY_BUTTERFLY,
  ENEMY_BOSS,
  TORPEDO,
  ENEMY_TORPEDO,
  drawSprite,
  type Sprite,
} from './sprites';

// ── Types ──

export type Vec2 = { x: number; y: number };

export type EnemyType = 'bee' | 'butterfly' | 'boss';

export type Enemy = {
  type: EnemyType;
  pos: Vec2;
  formationPos: Vec2;
  alive: boolean;
  hp: number;
  diving: boolean;
  divePath: Vec2[];
  diveIndex: number;
  fireTimer: number;
  spriteFrame: number;
  spriteTimer: number;
};

export type Projectile = {
  pos: Vec2;
  vel: Vec2;
  alive: boolean;
};

export type Particle = {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type Fighter = {
  pos: Vec2;
  alive: boolean;
  lives: number;
  invulnTimer: number;
  respawnTimer: number;
};

// ── Constants ──

const SHIP_SPEED = 120; // px/sec at virtual resolution
const TORPEDO_SPEED = 180;
const ENEMY_TORPEDO_SPEED = 70;
const ENEMY_DIVE_SPEED = 60;
const FIRE_COOLDOWN = 0.8; // seconds between enemy shots
const MAX_PLAYER_TORPEDOS = 2;

const ENEMY_SPRITES: Record<EnemyType, Sprite> = {
  bee: ENEMY_BEE,
  butterfly: ENEMY_BUTTERFLY,
  boss: ENEMY_BOSS,
};

const SCORE_VALUES: Record<EnemyType, { formation: number; diving: number }> = {
  bee: { formation: 50, diving: 100 },
  butterfly: { formation: 80, diving: 160 },
  boss: { formation: 150, diving: 400 },
};

// ── Entity collections ──

export let fighter: Fighter;
export let enemies: Enemy[] = [];
export let playerTorpedos: Projectile[] = [];
export let enemyTorpedos: Projectile[] = [];
export let particles: Particle[] = [];
export let score = 0;
export let stage = 1;
export let formationOffset = 0;

let formationDir = 1;
let stageTimer = 0;
let stageSpawnTimer = 0;
let allSpawned = false;

// ── Stars (background) ──

export type Star = { x: number; y: number; speed: number; brightness: number };
export let stars: Star[] = [];

export function initStars(): void {
  stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * VIRTUAL_WIDTH,
      y: Math.random() * VIRTUAL_HEIGHT,
      speed: 10 + Math.random() * 30,
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
}

// ── Init ──

export function initEntities(): void {
  fighter = {
    pos: { x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT - 20 },
    alive: true,
    lives: 3,
    invulnTimer: 0,
    respawnTimer: 0,
  };
  enemies = [];
  playerTorpedos = [];
  enemyTorpedos = [];
  particles = [];
  score = 0;
  stage = 1;
  formationOffset = 0;
  formationDir = 1;
  stageTimer = 0;
  stageSpawnTimer = 0;
  allSpawned = false;
  initStars();
  spawnWave();
}

export function resetScore(): void {
  score = 0;
}

// ── Wave spawning ──

function getWaveLayout(stageNum: number): Array<{ type: EnemyType; row: number; col: number }> {
  const layout: Array<{ type: EnemyType; row: number; col: number }> = [];

  // Row 0: bosses (2-4 depending on stage)
  const bossCount = Math.min(2 + Math.floor(stageNum / 3), 6);
  for (let i = 0; i < bossCount; i++) {
    layout.push({ type: 'boss', row: 0, col: i });
  }

  // Row 1-2: butterflies
  const butterflyPerRow = Math.min(4 + Math.floor(stageNum / 2), 8);
  for (let row = 1; row <= 2; row++) {
    for (let i = 0; i < butterflyPerRow; i++) {
      layout.push({ type: 'butterfly', row, col: i });
    }
  }

  // Row 3-4: bees
  const beePerRow = Math.min(5 + Math.floor(stageNum / 2), 10);
  for (let row = 3; row <= 4; row++) {
    for (let i = 0; i < beePerRow; i++) {
      layout.push({ type: 'bee', row, col: i });
    }
  }

  return layout;
}

function spawnWave(): void {
  const layout = getWaveLayout(stage);
  allSpawned = false;
  stageSpawnTimer = 0;

  for (const entry of layout) {
    const colWidth = 24;
    const rowHeight = 18;
    const startX = VIRTUAL_WIDTH / 2 - ((entry.type === 'boss' ? Math.min(2 + Math.floor(stage / 3), 6) :
      entry.type === 'butterfly' ? Math.min(4 + Math.floor(stage / 2), 8) :
        Math.min(5 + Math.floor(stage / 2), 10)) * colWidth) / 2;
    const fx = startX + entry.col * colWidth + colWidth / 2;
    const fy = 30 + entry.row * rowHeight;

    enemies.push({
      type: entry.type,
      pos: { x: fx, y: -20 - entry.row * 15 - entry.col * 5 },
      formationPos: { x: fx, y: fy },
      alive: true,
      hp: entry.type === 'boss' ? 2 : 1,
      diving: false,
      divePath: [],
      diveIndex: 0,
      fireTimer: 2 + Math.random() * 3,
      spriteFrame: 0,
      spriteTimer: 0,
    });
  }
}

// ── Update ──

export function updateEntities(dt: number): number {
  let scoreGained = 0;

  // Stars
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > VIRTUAL_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * VIRTUAL_WIDTH;
    }
  }

  // Formation oscillation
  formationOffset += formationDir * 15 * dt;
  if (formationOffset > 20) formationDir = -1;
  if (formationOffset < -20) formationDir = 1;

  // Fighter
  if (!fighter.alive) {
    fighter.respawnTimer -= dt;
    if (fighter.respawnTimer <= 0 && fighter.lives > 0) {
      fighter.alive = true;
      fighter.pos = { x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT - 20 };
      fighter.invulnTimer = 1.5;
    }
  } else {
    fighter.invulnTimer = Math.max(0, fighter.invulnTimer - dt);
  }

  // Enemies — move toward formation or along dive path
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    enemy.spriteTimer += dt;
    if (enemy.spriteTimer > 0.4) {
      enemy.spriteFrame = 1 - enemy.spriteFrame;
      enemy.spriteTimer = 0;
    }

    if (enemy.diving && enemy.divePath.length > 0) {
      const target = enemy.divePath[enemy.diveIndex];
      const dx = target.x - enemy.pos.x;
      const dy = target.y - enemy.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) {
        enemy.diveIndex++;
        if (enemy.diveIndex >= enemy.divePath.length) {
          enemy.diving = false;
          enemy.diveIndex = 0;
          enemy.divePath = [];
        }
      } else {
        const speed = ENEMY_DIVE_SPEED * (1 + stage * 0.1);
        enemy.pos.x += (dx / dist) * speed * dt;
        enemy.pos.y += (dy / dist) * speed * dt;
      }

      // Wrap around bottom
      if (enemy.pos.y > VIRTUAL_HEIGHT + 20) {
        enemy.pos.y = -20;
      }
    } else {
      // Slide toward formation position
      const targetX = enemy.formationPos.x + formationOffset;
      const targetY = enemy.formationPos.y;
      enemy.pos.x += (targetX - enemy.pos.x) * Math.min(1, 3 * dt);
      enemy.pos.y += (targetY - enemy.pos.y) * Math.min(1, 3 * dt);
    }

    // Enemy firing
    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && fighter.alive) {
      enemy.fireTimer = FIRE_COOLDOWN + Math.random() * 2;

      // Only fire if in reasonable position
      if (enemy.pos.y > 10 && enemy.pos.y < VIRTUAL_HEIGHT - 40) {
        const dx = fighter.pos.x - enemy.pos.x;
        const dy = fighter.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        enemyTorpedos.push({
          pos: { x: enemy.pos.x, y: enemy.pos.y + 5 },
          vel: {
            x: (dx / dist) * ENEMY_TORPEDO_SPEED * 0.3,
            y: ENEMY_TORPEDO_SPEED,
          },
          alive: true,
        });
      }
    }

    // Randomly start diving
    if (!enemy.diving && Math.random() < 0.001 * (1 + stage * 0.3) && Math.abs(enemy.pos.y - enemy.formationPos.y) < 5) {
      enemy.diving = true;
      enemy.diveIndex = 0;
      enemy.divePath = generateDivePath(enemy.pos, fighter.pos, enemy.formationPos);
      playDiving();
    }
  }

  // Player torpedos
  for (const t of playerTorpedos) {
    if (!t.alive) continue;
    t.pos.x += t.vel.x * dt;
    t.pos.y += t.vel.y * dt;
    if (t.pos.y < -10) t.alive = false;
  }

  // Enemy torpedos
  for (const t of enemyTorpedos) {
    if (!t.alive) continue;
    t.pos.x += t.vel.x * dt;
    t.pos.y += t.vel.y * dt;
    if (t.pos.y > VIRTUAL_HEIGHT + 10 || t.pos.x < -10 || t.pos.x > VIRTUAL_WIDTH + 10) {
      t.alive = false;
    }
  }

  // Particles
  for (const p of particles) {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.life -= dt;
  }

  // ── Collisions ──

  // Player torpedo vs enemy
  for (const t of playerTorpedos) {
    if (!t.alive) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      const sprite = ENEMY_SPRITES[e.type];
      const hw = sprite.width / 2 + 2;
      const hh = sprite.height / 2 + 2;
      if (
        Math.abs(t.pos.x - e.pos.x) < hw &&
        Math.abs(t.pos.y - e.pos.y) < hh
      ) {
        t.alive = false;
        e.hp--;
        if (e.hp <= 0) {
          e.alive = false;
          const pts = e.diving
            ? SCORE_VALUES[e.type].diving
            : SCORE_VALUES[e.type].formation;
          scoreGained += pts;
          spawnExplosion(e.pos, e.type === 'boss' ? 30 : 15);
          if (e.type === 'boss') {
            playBossDeath();
          } else {
            playEnemyHit();
          }
        } else {
          // Boss took a hit but survived
          playBossHurt();
        }
        break;
      }
    }
  }

  // Enemy torpedo vs fighter
  if (fighter.alive && fighter.invulnTimer <= 0) {
    for (const t of enemyTorpedos) {
      if (!t.alive) continue;
      if (
        Math.abs(t.pos.x - fighter.pos.x) < 6 &&
        Math.abs(t.pos.y - fighter.pos.y) < 5
      ) {
        t.alive = false;
        killFighter();
      }
    }
  }

  // Enemy body vs fighter
  if (fighter.alive && fighter.invulnTimer <= 0) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const sprite = ENEMY_SPRITES[e.type];
      const hw = (SHIP.width + sprite.width) / 2 - 2;
      const hh = (SHIP.height + sprite.height) / 2 - 2;
      if (
        Math.abs(e.pos.x - fighter.pos.x) < hw &&
        Math.abs(e.pos.y - fighter.pos.y) < hh
      ) {
        e.alive = false;
        spawnExplosion(e.pos, 15);
        killFighter();
      }
    }
  }

  // Cleanup dead entities
  playerTorpedos = playerTorpedos.filter((t) => t.alive);
  enemyTorpedos = enemyTorpedos.filter((t) => t.alive);
  particles = particles.filter((p) => p.life > 0);

  // Stage progression
  stageTimer += dt;
  const aliveEnemies = enemies.filter((e) => e.alive);
  if (aliveEnemies.length === 0 && stageTimer > 1) {
    stage++;
    stageTimer = 0;
    spawnWave();
    playLevelStart();
  }

  score += scoreGained;
  return scoreGained;
}

function killFighter(): void {
  fighter.alive = false;
  fighter.lives--;
  fighter.respawnTimer = 2;
  spawnExplosion(fighter.pos, 40);
  playPlayerDeath();
}

function spawnExplosion(pos: Vec2, count: number): void {
  const colors = ['#ef4444', '#f97316', '#eab308', '#ffffff', '#64748b'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 60;
    particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1 + Math.random() * 2,
    });
  }
}

function generateDivePath(from: Vec2, toward: Vec2, formationPos: Vec2): Vec2[] {
  const path: Vec2[] = [];
  // Dive down toward player, then loop back up
  const midX = from.x + (toward.x - from.x) * 0.5 + (Math.random() - 0.5) * 60;
  path.push({ x: midX, y: from.y + 40 });
  path.push({ x: toward.x + (Math.random() - 0.5) * 40, y: VIRTUAL_HEIGHT - 30 });
  path.push({ x: from.x + (Math.random() - 0.5) * 30, y: VIRTUAL_HEIGHT + 30 });
  // Wrap and return to formation
  path.push({ x: formationPos.x, y: -20 });
  return path;
}

// ── Player actions ──

export function moveShip(dir: number, dt: number): void {
  if (!fighter.alive) return;
  fighter.pos.x += dir * SHIP_SPEED * dt;
  fighter.pos.x = Math.max(8, Math.min(VIRTUAL_WIDTH - 8, fighter.pos.x));
}

export function firePlayerTorpedo(): boolean {
  if (!fighter.alive) return false;
  if (playerTorpedos.length >= MAX_PLAYER_TORPEDOS) return false;

  playerTorpedos.push({
    pos: { x: fighter.pos.x, y: fighter.pos.y - 6 },
    vel: { x: 0, y: -TORPEDO_SPEED },
    alive: true,
  });
  return true;
}

// ── Render ──

export function renderEntities(ctx: CanvasRenderingContext2D): void {
  // Stars
  for (const star of stars) {
    ctx.globalAlpha = star.brightness;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1);
  }
  ctx.globalAlpha = 1;

  // Enemies
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const sprite = ENEMY_SPRITES[enemy.type];
    drawSprite(ctx, sprite, Math.floor(enemy.pos.x), Math.floor(enemy.pos.y));
  }

  // Fighter
  if (fighter.alive) {
    // Blink during invulnerability
    if (fighter.invulnTimer > 0 && Math.floor(fighter.invulnTimer * 10) % 2 === 0) {
      // skip render (blink)
    } else {
      drawSprite(ctx, SHIP, Math.floor(fighter.pos.x), Math.floor(fighter.pos.y));
    }
  }

  // Player torpedos
  for (const t of playerTorpedos) {
    if (!t.alive) continue;
    drawSprite(ctx, TORPEDO, Math.floor(t.pos.x), Math.floor(t.pos.y));
  }

  // Enemy torpedos
  for (const t of enemyTorpedos) {
    if (!t.alive) continue;
    drawSprite(ctx, ENEMY_TORPEDO, Math.floor(t.pos.x), Math.floor(t.pos.y));
  }

  // Particles
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(
      Math.floor(p.pos.x - p.size / 2),
      Math.floor(p.pos.y - p.size / 2),
      Math.ceil(p.size),
      Math.ceil(p.size),
    );
  }
  ctx.globalAlpha = 1;
}
