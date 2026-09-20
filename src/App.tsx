import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Shield, Trophy, Zap, RefreshCcw, Volume2, VolumeX, Music, Info, Gamepad2, ChevronRight, ChevronLeft, Lock, CheckCircle2 } from 'lucide-react';

// --- Constants ---
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 28;
const BULLET_SPEED = 8;
const PLAYER_SPEED = 2.0;
const KNIFE_SPEED = 2.5; // 25% faster than 2.0
const GHOST_SPEED = 1.2; // 60% of 2.0
const ROTATION_SPEED = 0.025;
const MAX_KILLS = 7;
const MAX_HP = 10;
const RESPAWN_TIME = 3000;
const MATCH_DURATION = 300;
const SUPER_COOLDOWN = 10000; // 10 seconds

type Rarity = 'common' | 'rare' | 'epic' | 'mythic' | 'legendary';

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#7dd3fc', // light blue
  rare: '#86efac',   // light green
  epic: '#c084fc',   // purple
  mythic: '#e11d48', // ruby color
  legendary: '#fbbf24', // gold color
};

type GameMode = 'classic' | 'training' | 'shoot-n-shoot' | 'tech-hungry' | 'traditional-duel' | 'super-zoner' | 'gun-game' | 'payload-panic';

type View = 'main' | 'loadout' | 'modes' | 'weapon-detail' | 'game' | 'joystick';

type Loadout = {
  main: number;
  super: number;
};

type WeaponType = 'pistol' | 'knife' | 'rifle' | 'dynamite' | 'kick' | 'laser' | 'boomerang' | 'launcher' | 'bow' | 'thirusoolam' | 'ammunicion';

type Weapon = {
  type: WeaponType;
  name: string;
  description: string;
  reload: number;
  damage: number;
  range: number;
  isMelee: boolean;
  rarity: Rarity;
  moveSpeed: number;
  projSpeed?: number;
};

const WEAPONS: Weapon[] = ([
  { type: 'pistol', name: 'Pistol', description: 'Reliable semi-auto sidearm with infinite range.', reload: 500, damage: 2.5, range: Infinity, isMelee: false, rarity: 'common', moveSpeed: 2.0, projSpeed: 8 },
  { type: 'rifle', name: 'Rifle', description: 'Rapid-fire automatic rifle for sustained pressure.', reload: 100, damage: 1.0, range: 500, isMelee: false, rarity: 'rare', moveSpeed: 2.0, projSpeed: 8 },
  { type: 'knife', name: 'Knife', description: 'Swift melee strikes. Increases movement speed.', reload: 300, damage: 4.0, range: 60, isMelee: true, rarity: 'common', moveSpeed: 2.5 },
  { type: 'dynamite', name: 'Dynamite', description: 'Throws explosive bundles that deal area damage.', reload: 600, damage: 2.5, range: 250, isMelee: false, rarity: 'rare', moveSpeed: 2.0, projSpeed: 6 },
  { type: 'laser', name: 'Laser', description: 'High-power beam that pierces through targets.', reload: 700, damage: 3.3, range: Infinity, isMelee: false, rarity: 'mythic', moveSpeed: 2.0 },
  { type: 'boomerang', name: 'Boomerang', description: 'Returns to sender, hitting enemies twice.', reload: 0, damage: 2.0, range: 400, isMelee: false, rarity: 'epic', moveSpeed: 2.5, projSpeed: 7.2 },
  { type: 'launcher', name: 'Launcher', description: 'Fires projectiles that splash on impact or at max range.', reload: 600, damage: 3.0, range: 600, isMelee: false, rarity: 'rare', moveSpeed: 2.0, projSpeed: 7.5 },
  { type: 'bow', name: 'Bow and Arrow', description: 'Hold to charge damage. 20% damage reduction while held.', reload: 1000, damage: 1.0, range: 400, isMelee: false, rarity: 'epic', moveSpeed: 2.0, projSpeed: 10 },
  { type: 'thirusoolam', name: 'Thirusoolam', description: 'Divine trident strike. Pierces enemies and heals on hit.', reload: 400, damage: 3.0, range: 75, isMelee: false, rarity: 'legendary', moveSpeed: 2.5, projSpeed: 10 },
  { type: 'ammunicion', name: 'AMMUSICION', description: 'Bouncing music notes. 2500px range, infinite bounces.', reload: 550, damage: 2.0, range: 2500, isMelee: false, rarity: 'legendary', moveSpeed: 2.0, projSpeed: 7.3 },
] as Weapon[]).sort((a, b) => a.name.localeCompare(b.name));

type SuperType = 'mine' | 'turret' | 'ghost' | 'drill' | 'poison' | 'dash' | 'regen' | 'aura' | 'booster';

type SuperStat = {
  label: string;
  value: number;
  max: number;
  unit?: string;
};

type SuperWeapon = {
  type: SuperType;
  name: string;
  description: string;
  isAimable: boolean;
  rarity: Rarity;
  stats: SuperStat[];
  // Keep these for logic if needed, or extract from stats
  damage?: number;
  range?: number;
  moveSpeed?: number;
  projSpeed?: number;
  duration?: number;
  heal?: number;
  health?: number;
};

const SUPERS: SuperWeapon[] = ([
  { 
    type: 'mine', name: 'Mine', description: 'Hidden explosive. 7 HP damage.', isAimable: false, rarity: 'rare',
    stats: [
      { label: 'Damage', value: 7, max: 10 },
      { label: 'Radius', value: 2, max: 5 },
      { label: 'Count', value: 3, max: 5 }
    ],
    damage: 7, range: 2
  },
  { 
    type: 'turret', name: 'Turret', description: 'Auto-sentry. 5 HP health.', isAimable: false, rarity: 'epic',
    stats: [
      { label: 'Health', value: 5, max: 10 },
      { label: 'Damage', value: 4, max: 10 },
      { label: 'Range', value: 6, max: 10 }
    ],
    damage: 4, range: 6, health: 5
  },
  { 
    type: 'ghost', name: 'Ghost', description: 'Stuns and damages enemy.', isAimable: false, rarity: 'mythic',
    stats: [
      { label: 'Health', value: 5, max: 10 },
      { label: 'Damage', value: 3, max: 10 },
      { label: 'Range', value: 4, max: 10 }
    ],
    damage: 3, range: 4, health: 5, projSpeed: 8
  },
  { 
    type: 'drill', name: 'Drill', description: 'Speed boost & melee shred.', isAimable: false, rarity: 'epic',
    stats: [
      { label: 'Damage', value: 6, max: 10 },
      { label: 'Speed', value: 4, max: 10 },
      { label: 'Duration', value: 7, max: 10, unit: 's' }
    ],
    damage: 6, moveSpeed: 4.0, duration: 7000
  },
  { 
    type: 'poison', name: 'Poison', description: 'Slows and damages enemies.', isAimable: false, rarity: 'epic',
    stats: [
      { label: 'Damage', value: 5, max: 10 },
      { label: 'Radius', value: 5, max: 10 },
      { label: 'Duration', value: 5, max: 10, unit: 's' }
    ],
    damage: 5, range: 5, duration: 5000
  },
  { 
    type: 'dash', name: 'Dash', description: 'Sudden dash that stuns.', isAimable: true, rarity: 'common',
    stats: [
      { label: 'Damage', value: 2, max: 10 },
      { label: 'Distance', value: 4, max: 10 },
      { label: 'Speed', value: 12, max: 20 }
    ],
    damage: 2, range: 4, moveSpeed: 12.0
  },
  { 
    type: 'regen', name: 'Regen', description: 'Instantly heals 5 HP.', isAimable: false, rarity: 'rare',
    stats: [
      { label: 'Heal', value: 5, max: 10 }
    ],
    heal: 5
  },
  { 
    type: 'aura', name: 'Aura', description: 'Deploys a healing turret (7 HP) with a wide healing zone.', isAimable: false, rarity: 'mythic',
    stats: [
      { label: 'Heal/s', value: 2, max: 5 },
      { label: 'Radius', value: 4, max: 10 },
      { label: 'Health', value: 7, max: 10 }
    ],
    heal: 2, range: 4, health: 7
  },
  { 
    type: 'booster', name: 'Booster', description: 'Deploys a zone that boosts your damage by 40%.', isAimable: false, rarity: 'epic',
    stats: [
      { label: 'Boost %', value: 40, max: 100 },
      { label: 'Radius', value: 4, max: 10 },
      { label: 'Health', value: 7, max: 10 }
    ],
    range: 4, health: 7
  },
] as SuperWeapon[]).sort((a, b) => a.name.localeCompare(b.name));

type Player = {
  id: 1 | 2;
  x: number;
  y: number;
  angle: number;
  hp: number;
  kills: number;
  deaths: number;
  goalsScored: number;
  chipsCollected: number;
  zonePoints: number;
  immunityUntil: number;
  lastShot: number;
  color: string;
  keys: { [key: string]: boolean };
  isDead: boolean;
  respawnAt: number;
  mainWeaponIndex: number;
  superWeaponIndex: number;
  superCharge: number; // 0 to 1
  lastSuperAt: number;
  stunnedUntil: number;
  drillActiveUntil: number;
  dashActiveUntil: number;
  dashAngle: number;
  heldBall: boolean;
  laserShotUntil: number;
  laserLingerUntil: number;
  thirusoolamShotUntil: number;
  thirusoolamLingerUntil: number;
  isAimingSuper: boolean;
  damageDealt: number;
  bowChargeStart: number;
  isChargingBow: boolean;
  gunGameLevel: number;
  payloadProgress: number; // 0 to 1
  superReadyPlayed: boolean;
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heldBy: 1 | 2 | null;
};

type Chip = {
  x: number;
  y: number;
  id: string;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: 1 | 2;
  damage: number;
  range: number;
  startX: number;
  startY: number;
  isLauncher?: boolean;
  isArrow?: boolean;
  isMusic?: boolean;
  bounces?: number;
  totalDist?: number;
};

type Mine = { x: number; y: number; ownerId: 1 | 2; id: string };
type Turret = { x: number; y: number; hp: number; ownerId: 1 | 2; lastShot: number; id: string };
type AuraTurret = { x: number; y: number; hp: number; ownerId: 1 | 2; lastHeal: number; id: string };
type BoosterTurret = { x: number; y: number; hp: number; ownerId: 1 | 2; id: string };
type Ghost = { x: number; y: number; hp: number; ownerId: 1 | 2; id: string; lastAngle: number; path?: { x: number; y: number }[]; pathTarget?: { x: number; y: number }; pathTimer?: number };
type SlowingCircle = { x: number; y: number; ownerId: 1 | 2; expiresAt: number; id: string };
type Explosion = { x: number; y: number; radius: number; expiresAt: number; id: string; ownerId: 1 | 2; damage: number; hasDamaged: boolean };
type Grenade = { x: number; y: number; ownerId: 1 | 2; explodesAt: number; id: string; damage: number };
type BoomerangObj = { 
  x: number; 
  y: number; 
  vx: number; 
  vy: number; 
  ownerId: 1 | 2; 
  damage: number; 
  isReturning: boolean; 
  id: string; 
  startX: number; 
  startY: number; 
  range: number;
  damagedIds: Set<string>;
};

type Wall = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const GUN_GAME_LOADOUTS = [
  { main: 7, super: 7 }, // RIFLE + TURRET
  { main: 5, super: 5 }, // LAUNCHER + POISON
  { main: 4, super: 0 }, // LASER + AURA
  { main: 2, super: 3 }, // DYNAMITE + GHOST
  { main: 0, super: 2 }, // BOOMERANG + DRILL
  { main: 6, super: 6 }, // PISTOL + REGEN
  { main: 1, super: 4 }, // BOW-N-ARROW + MINE
  { main: 3, super: 1 }, // KNIFE + DASH
];

const WALLS_CLASSIC: Wall[] = [
  // Outer boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
  
  // Center structures
  { x: 200, y: 150, w: 20, h: 300 },
  { x: 780, y: 150, w: 20, h: 300 },
  { x: 400, y: 100, w: 200, h: 20 },
  { x: 400, y: 480, w: 200, h: 20 },
  
  // Small covers
  { x: 450, y: 250, w: 100, h: 100 },
];

const WALLS_SHOOT_N_SHOOT: Wall[] = [
  // Outer boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
  
  // Obstacles in front of goals
  { x: 120, y: 200, w: 20, h: 200 },
  { x: 860, y: 200, w: 20, h: 200 },
  
  // Center obstacles
  { x: 480, y: 80, w: 40, h: 120 },
  { x: 480, y: 400, w: 40, h: 120 },
];

const WALLS_TECH_HUNGRY: Wall[] = [
  // Outer boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
  
  // Cyberpunk obstacles
  { x: 200, y: 120, w: 120, h: 20 },
  { x: 680, y: 120, w: 120, h: 20 },
  { x: 200, y: 460, w: 120, h: 20 },
  { x: 680, y: 460, w: 120, h: 20 },
];

const WALLS_TRAINING: Wall[] = [
  // Outer boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
  
  // Center structures (removed the middle one)
  { x: 200, y: 150, w: 20, h: 300 },
  { x: 780, y: 150, w: 20, h: 300 },
  { x: 400, y: 100, w: 200, h: 20 },
  { x: 400, y: 480, w: 200, h: 20 },
  
  // Wall tightly close to target (target is at 500, 300)
  { x: 440, y: 250, w: 10, h: 100 },
];

const WALLS_SUPER_ZONER: Wall[] = [
  // Outer boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
  
  // Hellish obstacles
  { x: 150, y: 150, w: 40, h: 40 },
  { x: 810, y: 150, w: 40, h: 40 },
  { x: 150, y: 410, w: 40, h: 40 },
  { x: 810, y: 410, w: 40, h: 40 },
  
  { x: 300, y: 50, w: 400, h: 10 },
  { x: 300, y: 540, w: 400, h: 10 },
];

const WALLS_PAYLOAD: Wall[] = [
  // Outer boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: CANVAS_HEIGHT - 10, w: CANVAS_WIDTH, h: 10 },
  { x: 0, y: 0, w: 10, h: CANVAS_HEIGHT },
  { x: CANVAS_WIDTH - 10, y: 0, w: 10, h: CANVAS_HEIGHT },
  
  // Center block
  { x: 475, y: 275, w: 50, h: 50 },
  
  // Top-left block
  { x: 200, y: 140, w: 100, h: 100 },
  
  // Bottom-right block (symmetric)
  { x: 700, y: 360, w: 100, h: 100 },
  
  // Vertical dividers
  { x: 300, y: 400, w: 30, h: 100 },
  { x: 670, y: 100, w: 30, h: 100 },
  
  // Horizontal bars
  { x: 450, y: 400, w: 100, h: 30 },
  { x: 450, y: 170, w: 100, h: 30 },
];

const PAYLOAD_TRACK_P1 = [
  { x: 900, y: 100 },
  { x: 900, y: 250 },
  { x: 600, y: 250 },
  { x: 600, y: 500 },
  { x: 100, y: 500 },
];

const PAYLOAD_TRACK_P2 = [
  { x: 100, y: 500 },
  { x: 100, y: 350 },
  { x: 400, y: 350 },
  { x: 400, y: 100 },
  { x: 900, y: 100 },
];

const getWalls = (mode: GameMode) => {
  if (mode === 'shoot-n-shoot') return WALLS_SHOOT_N_SHOOT;
  if (mode === 'tech-hungry') return WALLS_TECH_HUNGRY;
  if (mode === 'training') return WALLS_TRAINING;
  if (mode === 'super-zoner') return WALLS_SUPER_ZONER;
  if (mode === 'payload-panic') return WALLS_PAYLOAD;
  return WALLS_CLASSIC;
};

const NAV_GRID_SIZE = 25;
const NAV_COLS = Math.ceil(CANVAS_WIDTH / NAV_GRID_SIZE);
const NAV_ROWS = Math.ceil(CANVAS_HEIGHT / NAV_GRID_SIZE);

const getNavGrid = (walls: Wall[]) => {
  const grid: boolean[][] = Array(NAV_ROWS).fill(null).map(() => Array(NAV_COLS).fill(true));
  for (let r = 0; r < NAV_ROWS; r++) {
    for (let c = 0; c < NAV_COLS; c++) {
      const x = c * NAV_GRID_SIZE + NAV_GRID_SIZE / 2;
      const y = r * NAV_GRID_SIZE + NAV_GRID_SIZE / 2;
      const buffer = 22; // Increased buffer to prevent clipping corners
      for (const wall of walls) {
        if (
          x + buffer > wall.x &&
          x - buffer < wall.x + wall.w &&
          y + buffer > wall.y &&
          y - buffer < wall.y + wall.h
        ) {
          grid[r][c] = false;
          break;
        }
      }
    }
  }
  return grid;
};

const findPath = (startX: number, startY: number, endX: number, endY: number, grid: boolean[][]) => {
  const startCol = Math.floor(startX / NAV_GRID_SIZE);
  const startRow = Math.floor(startY / NAV_GRID_SIZE);
  const endCol = Math.floor(endX / NAV_GRID_SIZE);
  const endRow = Math.floor(endY / NAV_GRID_SIZE);

  if (startCol < 0 || startCol >= NAV_COLS || startRow < 0 || startRow >= NAV_ROWS) return null;
  if (endCol < 0 || endCol >= NAV_COLS || endRow < 0 || endRow >= NAV_ROWS) return null;
  
  // If end is blocked, try to find nearest walkable cell
  let finalEndCol = endCol;
  let finalEndRow = endRow;
  if (!grid[endRow][endCol]) {
    let found = false;
    for (let d = 1; d < 5 && !found; d++) {
      for (let dr = -d; dr <= d && !found; dr++) {
        for (let dc = -d; dc <= d && !found; dc++) {
          if (Math.abs(dr) !== d && Math.abs(dc) !== d) continue;
          const nr = endRow + dr;
          const nc = endCol + dc;
          if (nr >= 0 && nr < NAV_ROWS && nc >= 0 && nc < NAV_COLS && grid[nr][nc]) {
            finalEndRow = nr;
            finalEndCol = nc;
            found = true;
          }
        }
      }
    }
    if (!found) return null;
  }

  const openSet: { r: number, c: number, g: number, h: number, f: number, parent?: any }[] = [];
  const closedSet = new Set<string>();
  
  const startNode = {
    r: startRow,
    c: startCol,
    g: 0,
    h: Math.abs(finalEndCol - startCol) + Math.abs(finalEndRow - startRow),
    f: 0
  };
  startNode.f = startNode.h;
  openSet.push(startNode);

  while (openSet.length > 0) {
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
    }
    const current = openSet.splice(lowestIdx, 1)[0];
    
    if (current.r === finalEndRow && current.c === finalEndCol) {
      const path = [];
      let temp: any = current;
      while (temp) {
        path.push({ x: temp.c * NAV_GRID_SIZE + NAV_GRID_SIZE / 2, y: temp.r * NAV_GRID_SIZE + NAV_GRID_SIZE / 2 });
        temp = temp.parent;
      }
      return path.reverse();
    }

    closedSet.add(`${current.r},${current.c}`);

    const neighbors = [
      { r: current.r - 1, c: current.c },
      { r: current.r + 1, c: current.c },
      { r: current.r, c: current.c - 1 },
      { r: current.r, c: current.c + 1 },
      { r: current.r - 1, c: current.c - 1 },
      { r: current.r - 1, c: current.c + 1 },
      { r: current.r + 1, c: current.c - 1 },
      { r: current.r + 1, c: current.c + 1 },
    ];

    for (const neighbor of neighbors) {
      if (neighbor.r < 0 || neighbor.r >= NAV_ROWS || neighbor.c < 0 || neighbor.c >= NAV_COLS) continue;
      if (!grid[neighbor.r][neighbor.c] || closedSet.has(`${neighbor.r},${neighbor.c}`)) continue;

      // Prevent cutting corners diagonally
      if (neighbor.r !== current.r && neighbor.c !== current.c) {
        if (!grid[current.r][neighbor.c] || !grid[neighbor.r][current.c]) continue;
      }

      const gScore = current.g + (neighbor.r !== current.r && neighbor.c !== current.c ? 1.4 : 1);
      let neighborNode = openSet.find(n => n.r === neighbor.r && n.c === neighbor.c);

      if (!neighborNode) {
        neighborNode = {
          r: neighbor.r,
          c: neighbor.c,
          g: gScore,
          h: Math.abs(finalEndCol - neighbor.c) + Math.abs(finalEndRow - neighbor.r),
          f: 0,
          parent: current
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        openSet.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        neighborNode.g = gScore;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    }
    
    if (closedSet.size > 400) break;
  }

  return null;
};

const getPayloadPos = (track: {x: number, y: number}[], progress: number) => {
  if (progress <= 0) return track[0];
  if (progress >= 100) return track[track.length - 1];
  
  // Calculate total length
  let totalLen = 0;
  const segmentLens = [];
  for (let i = 0; i < track.length - 1; i++) {
    const len = Math.hypot(track[i+1].x - track[i].x, track[i+1].y - track[i].y);
    segmentLens.push(len);
    totalLen += len;
  }
  
  let targetLen = (progress / 100) * totalLen;
  let currentLen = 0;
  for (let i = 0; i < segmentLens.length; i++) {
    if (currentLen + segmentLens[i] >= targetLen) {
      const segmentProgress = (targetLen - currentLen) / segmentLens[i];
      return {
        x: track[i].x + (track[i+1].x - track[i].x) * segmentProgress,
        y: track[i].y + (track[i+1].y - track[i].y) * segmentProgress
      };
    }
    currentLen += segmentLens[i];
  }
  return track[track.length - 1];
};

const drawTrain = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isFlipped: boolean) => {
  ctx.save();
  ctx.translate(x, y);
  if (isFlipped) ctx.scale(-1, 1);
  
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  
  // Main body
  ctx.fillStyle = color;
  ctx.beginPath();
  // Using roundRect if available, otherwise fallback to rect
  if (ctx.roundRect) {
    ctx.roundRect(-25, -12, 45, 24, 4);
  } else {
    ctx.rect(-25, -12, 45, 24);
  }
  ctx.fill();
  ctx.stroke();
  
  // Cabin
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(5, -30, 20, 20, 2);
  } else {
    ctx.rect(5, -30, 20, 20);
  }
  ctx.fill();
  ctx.stroke();
  
  // Window
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(10, -25, 10, 10);
  
  // Chimney
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.rect(-18, -28, 10, 16);
  ctx.fill();
  ctx.stroke();
  
  // Funnel top
  ctx.beginPath();
  ctx.ellipse(-13, -28, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Wheels
  ctx.fillStyle = '#0f172a';
  for (let i = -15; i <= 15; i += 15) {
    ctx.beginPath();
    ctx.arc(i, 15, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Hubcap
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(i, 15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
  }
  
  // Front cowcatcher
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(35, 15);
  ctx.lineTo(20, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
};

// --- Sound Synthesis ---
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let musicSource: AudioBufferSourceNode | null = null;
let musicGain: GainNode | null = null;

const playPistolSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150 * pitchMult, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40 * pitchMult, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

const playChipSpawnSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

const playChipPickupSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const playBallPickupSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

const playBallKickSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

const playBallBounceSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const playRifleSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(400 * pitchMult, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100 * pitchMult, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const playKnifeSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const now = audioCtx.currentTime;
  const duration = 0.15;

  // The "Sing" - metallic resonance
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(3500 * pitchMult, now);
  osc.frequency.exponentialRampToValueAtTime(1500 * pitchMult, now + duration);

  oscGain.gain.setValueAtTime(0.15, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  // The "Slash" - air movement
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(4000 * pitchMult, now);
  filter.frequency.exponentialRampToValueAtTime(1000 * pitchMult, now + duration);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  osc.start(now);
  noise.start(now);
  osc.stop(now + duration);
  noise.stop(now + duration);
};

const playMineSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

const playTurretSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

const playGhostSound = (muted: boolean) => {
  if (muted) return;
  // A shimmering aura sound (swapped from Regen)
  const now = audioCtx.currentTime;
  const duration = 1.0;
  
  // Multiple oscillators for a rich "aura" chord
  const frequencies = [329.63, 415.30, 493.88, 659.25]; // E major chord
  
  frequencies.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.2, now + duration);
    
    // Subtle shimmering vibrato
    lfo.frequency.value = 5 + i;
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.2);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    lfo.start(now);
    osc.stop(now + duration);
    lfo.stop(now + duration);
  });
};

const playDrillSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(50, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

const playArrowSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400 * pitchMult, now);
  osc.frequency.exponentialRampToValueAtTime(100 * pitchMult, now + 0.05);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
};

const activeBowSounds: { [key: number]: { osc: OscillatorNode, gain: GainNode } } = {};

const startBowChargeSound = (playerId: number, muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  if (activeBowSounds[playerId]) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(100 * pitchMult, now);
  // Continuous rising pitch over 3 seconds (max charge is usually less but this covers it)
  osc.frequency.linearRampToValueAtTime(400 * pitchMult, now + 3);
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  
  activeBowSounds[playerId] = { osc, gain };
};

const stopBowChargeSound = (playerId: number) => {
  const sound = activeBowSounds[playerId];
  if (sound) {
    const now = audioCtx.currentTime;
    sound.gain.gain.linearRampToValueAtTime(0, now + 0.05);
    sound.osc.stop(now + 0.05);
    delete activeBowSounds[playerId];
  }
};

const playExplosionSound = (muted: boolean) => {
  if (muted) return;
  const now = audioCtx.currentTime;
  const duration = 0.6;
  
  // Noise part (the "D" and "A")
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(40, now + duration);
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.6, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  // Sine part (the "MMM" tail)
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + duration);
  
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  
  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  
  noise.start(now);
  osc.start(now);
  noise.stop(now + duration);
  osc.stop(now + duration);
};

const playStartSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

const playSwitchSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const playAmmunicionSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const now = audioCtx.currentTime;
  
  // Guitar-like sound (plucked string)
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // Use a sawtooth for richer harmonics, then filter it
  osc.type = 'sawtooth';
  
  // Random piano note MIDI numbers: [60,62,64,65,67,69,71,72]
  const midiNotes = [60, 62, 64, 65, 67, 69, 71, 72];
  const randomMidi = midiNotes[Math.floor(Math.random() * midiNotes.length)];
  const frequency = 440 * Math.pow(2, (randomMidi - 69) / 12);
  
  osc.frequency.setValueAtTime(frequency * pitchMult, now);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000 * pitchMult, now);
  filter.frequency.exponentialRampToValueAtTime(100 * pitchMult, now + 0.5);
  
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.5);
};

const playDuelSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

const playEndSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 1);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1);
};

const playDeathSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

const playGoalSound = (muted: boolean) => {
  if (muted) return;
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(220, audioCtx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + 0.5);
  osc2.stop(audioCtx.currentTime + 0.5);
};

const playPoisonSound = (muted: boolean) => {
  if (muted) return;
  const now = audioCtx.currentTime;
  const duration = 1.5;

  // Low ominous drone
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(40, now);
  osc1.frequency.exponentialRampToValueAtTime(30, now + duration);
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.linearRampToValueAtTime(0, now + duration);

  // Bubbling/Toxic effect
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(200, now);
  
  lfo.type = 'square';
  lfo.frequency.value = 12;
  lfoGain.gain.value = 100;
  
  lfo.connect(lfoGain);
  lfoGain.connect(osc2.frequency);

  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now);
  lfo.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  lfo.stop(now + duration);
};

const playDashSound = (muted: boolean) => {
  if (muted) return;
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3000, audioCtx.currentTime + 0.2);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
};

const playDynamiteSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150 * pitchMult, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50 * pitchMult, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

const playThirusoolamSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55 * pitchMult, audioCtx.currentTime); // Low A
  osc.frequency.exponentialRampToValueAtTime(40 * pitchMult, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

const playChooChooSound = (muted: boolean) => {
  if (muted) return;
  const now = audioCtx.currentTime;
  
  // Two-tone steam whistle
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(440, now);
  osc1.frequency.exponentialRampToValueAtTime(460, now + 0.3);
  
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(554, now); // Major third
  osc2.frequency.exponentialRampToValueAtTime(580, now + 0.3);
  
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.3);
};

const playLaserSound = (muted: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880 * pitchMult, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110 * pitchMult, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};

const playBoomerangSpinSound = (muted: boolean, progress: number, isReturning: boolean, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  
  // "gugugugu" sound (wind spin)
  // Base frequency depends on progress
  const baseFreq = 150 * pitchMult;
  const maxFreq = 400 * pitchMult;
  
  let freqStart, freqEnd;
  if (!isReturning) {
    // Flying away: pitch goes up
    freqStart = baseFreq + (maxFreq - baseFreq) * progress;
    freqEnd = freqStart * 1.1;
  } else {
    // Returning: pitch goes down (reversed)
    freqStart = maxFreq - (maxFreq - baseFreq) * progress;
    freqEnd = freqStart * 0.9;
  }
  
  osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + 0.05);
  
  // Modulator for "gugugugu" rhythm
  const mod = audioCtx.createOscillator();
  mod.type = 'sine';
  mod.frequency.value = 18 * pitchMult; // Fast enough for "gugugugu"
  const modGain = audioCtx.createGain();
  modGain.gain.value = 35 * pitchMult;
  mod.connect(modGain);
  modGain.connect(osc.frequency);
  
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  mod.start();
  osc.stop(audioCtx.currentTime + 0.05);
  mod.stop(audioCtx.currentTime + 0.05);
};

const playRegenSound = (muted: boolean) => {
  if (muted) return;
  // Simple sine sweep (swapped from Ghost)
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

const playLauncherFlySound = (muted: boolean, progress: number, pitchMult: number = 1) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  
  // Descending pitch (1500-600Hz range)
  // OOOO0000oooo (descending)
  const startFreq = (1500 - 900 * progress) * pitchMult;
  const endFreq = startFreq - 45 * pitchMult;
  
  osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), audioCtx.currentTime + 0.05);
  
  gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const playAuraHealSound = (muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
};

const playPointSound = (playerId: 1 | 2, muted: boolean) => {
  if (muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  // Player 1: Higher pitch (880Hz), Player 2: Lower pitch (440Hz)
  const frequency = playerId === 1 ? 880 : 440;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(frequency * 1.2, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

const playSuperReadySound = (playerId: 1 | 2, muted: boolean) => {
  if (muted) return;
  const notes = playerId === 1 ? [72, 76, 81] : [81, 76, 72];
  const startTime = audioCtx.currentTime;
  notes.forEach((midi, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const time = startTime + i * 0.15;
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(time);
    osc.stop(time + 0.4);
  });
};

const startMusic = (type: 'menu' | 'battle', muted: boolean) => {
  if (musicSource) {
    try { musicSource.stop(); } catch(e) {}
  }
  
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    const t = i / audioCtx.sampleRate;
    if (type === 'menu') {
      // Techy ambient
      data[i] = Math.sin(2 * Math.PI * 50 * t) * 0.5 + Math.sin(2 * Math.PI * 150 * t) * 0.2;
      if (i % (audioCtx.sampleRate / 2) < 100) data[i] += Math.random() * 0.5;
    } else {
      // Battle beat
      data[i] = Math.sin(2 * Math.PI * 60 * t) * 0.7;
      if (i % (audioCtx.sampleRate / 4) < 1000) data[i] += Math.random() * 0.3;
    }
  }
  
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buffer;
  musicSource.loop = true;
  musicGain = audioCtx.createGain();
  musicGain.gain.value = muted ? 0 : 0.1;
  musicSource.connect(musicGain);
  musicGain.connect(audioCtx.destination);
  musicSource.start();
};

const checkLineOfSight = (x1: number, y1: number, x2: number, y2: number, walls: Wall[]) => {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(dist / 5);
  for (let i = 0; i <= steps; i++) {
    const px = x1 + (x2 - x1) * (i / steps);
    const py = y1 + (y2 - y1) * (i / steps);
    for (const wall of walls) {
      if (px > wall.x && px < wall.x + wall.w && py > wall.y && py < wall.y + wall.h) {
        return false;
      }
    }
  }
  return true;
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-red-600 scale-110' : 'text-white/40 hover:text-white/60'}`}
  >
    <div className={`p-3 rounded-sm border transition-all ${active ? 'bg-red-600/10 border-red-600/50' : 'bg-white/5 border-white/10'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{label}</span>
  </button>
);

const StatBar = ({ label, value, max }: { label: string, value: number, max: number }) => (
  <div className="w-full">
    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
      <span className="text-white/40">{label}</span>
      <span className="text-white">{value.toFixed(1)}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
      />
    </div>
  </div>
);

const WeaponVisual = ({ type, index, size = 120, color = '#f8fafc' }: { type: 'main' | 'super', index: number, size?: number, color?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Scale factor to make it "big"
    const scale = size / 60; 
    ctx.scale(scale, scale);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    if (type === 'main') {
      const weapon = WEAPONS[index];
      // Drawing logic from gameLoop...
      // Adjusting to center it better
      const offset = -PLAYER_SIZE / 2;
      
      if (weapon.type === 'rifle') {
        ctx.fillRect(offset + PLAYER_SIZE / 3, -3, PLAYER_SIZE, 6);
        ctx.strokeRect(offset + PLAYER_SIZE / 3, -3, PLAYER_SIZE, 6);
      } else if (weapon.type === 'pistol') {
        ctx.fillRect(offset + PLAYER_SIZE / 3, -2, PLAYER_SIZE / 2, 4);
        ctx.strokeRect(offset + PLAYER_SIZE / 3, -2, PLAYER_SIZE / 2, 4);
      } else if (weapon.type === 'knife') {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 3, -2);
        ctx.lineTo(offset + PLAYER_SIZE / 3 + 15, 0);
        ctx.lineTo(offset + PLAYER_SIZE / 3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (weapon.type === 'dynamite') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(offset + PLAYER_SIZE / 3, -4, 10, 8);
        ctx.strokeRect(offset + PLAYER_SIZE / 3, -4, 10, 8);
      } else if (weapon.type === 'laser') {
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(offset + PLAYER_SIZE / 3, -2, PLAYER_SIZE, 4);
        ctx.strokeRect(offset + PLAYER_SIZE / 3, -2, PLAYER_SIZE, 4);
      } else if (weapon.type === 'boomerang') {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 3, -10);
        ctx.lineTo(offset + PLAYER_SIZE / 3 + 12, 0);
        ctx.lineTo(offset + PLAYER_SIZE / 3, 10);
        ctx.stroke();
      } else if (weapon.type === 'bow') {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(offset + PLAYER_SIZE / 4, 0, 15, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 4, -15);
        ctx.lineTo(offset + PLAYER_SIZE / 4, 15);
        ctx.stroke();
      } else if (weapon.type === 'launcher') {
        ctx.fillRect(offset + PLAYER_SIZE / 3, -5, PLAYER_SIZE * 0.8, 10);
        ctx.strokeRect(offset + PLAYER_SIZE / 3, -5, PLAYER_SIZE * 0.8, 10);
        ctx.fillStyle = '#334155';
        ctx.fillRect(offset + PLAYER_SIZE / 3 + PLAYER_SIZE * 0.8 - 4, -6, 6, 12);
      } else if (weapon.type === 'thirusoolam') {
        ctx.strokeStyle = '#fbbf24';
        ctx.fillStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 3, 0);
        ctx.lineTo(offset + PLAYER_SIZE / 3 + 12, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(offset + PLAYER_SIZE / 3 + 12, 0, 8, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 3 + 12, 0);
        ctx.lineTo(offset + PLAYER_SIZE / 3 + 25, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 3 + 12 + 4, -7);
        ctx.lineTo(offset + PLAYER_SIZE / 3 + 12 + 10, -7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offset + PLAYER_SIZE / 3 + 12 + 4, 7);
        ctx.lineTo(offset + PLAYER_SIZE / 3 + 12 + 10, 7);
        ctx.stroke();
      } else if (weapon.type === 'ammunicion') {
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(offset + PLAYER_SIZE / 3 + 10, 0, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(offset + PLAYER_SIZE / 3 + 10, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.fillRect(offset + PLAYER_SIZE / 3 + 18, -2, 15, 4);
        ctx.strokeRect(offset + PLAYER_SIZE / 3 + 18, -2, 15, 4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(offset + PLAYER_SIZE / 3 + 33, -3, 6, 6);
        ctx.strokeRect(offset + PLAYER_SIZE / 3 + 33, -3, 6, 6);
      }
    } else {
      const s = SUPERS[index];
      if (s.type === 'turret') {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2, -15, 4, 15);
      } else if (s.type === 'ghost') {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.type === 'poison') {
        ctx.fillStyle = '#4ade80';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
      } else if (s.type === 'dash') {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.lineTo(5, -10);
        ctx.moveTo(15, 0);
        ctx.lineTo(5, 10);
        ctx.stroke();
      } else if (s.type === 'regen') {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-4, -12, 8, 24);
        ctx.fillRect(-12, -4, 24, 8);
      } else if (s.type === 'aura') {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 6);
        ctx.stroke();
      } else if (s.type === 'booster') {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.type === 'drill') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(15, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [type, index, size, color]);

  return <canvas ref={canvasRef} width={size} height={size} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />;
};

const FightingIllustration = () => {
  return (
    <div className="relative w-full h-80 flex items-center justify-center overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent opacity-30" />
      
      {/* Player 1 (Rifle + Turret) */}
      <div className="relative z-10 flex flex-col items-center -translate-x-32">
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 bg-green-500 rounded-full border-4 border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)]"
        >
          <div className="w-12 h-3 bg-zinc-800 rounded-full rotate-12 translate-x-6 border border-white/10" /> {/* Rifle */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-700 rounded-full border border-white/20 flex items-center justify-center">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
        </motion.div>
        <div className="mt-6 w-12 h-12 bg-zinc-800 rounded-sm border-2 border-white/10 flex flex-col items-center justify-center relative">
          <div className="absolute -top-4 w-1 h-4 bg-zinc-600" />
          <div className="w-6 h-2 bg-zinc-600 rounded-full mb-1" />
          <div className="w-8 h-4 bg-red-600/20 rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> {/* Turret eye */}
          </div>
        </div>
      </div>

      {/* VS Text */}
      <div className="absolute z-20 text-8xl font-black italic text-white/5 select-none pointer-events-none tracking-tighter">VS</div>

      {/* Player 2 (Boomerang + Ghost) */}
      <div className="relative z-10 flex flex-col items-center translate-x-32">
        <motion.div 
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 bg-red-500 rounded-full border-4 border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]"
        >
          {/* Boomerang flying out */}
          <motion.div 
            animate={{ rotate: 360, x: [0, -150, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          />
        </motion.div>
        {/* Ghost flying out */}
        <motion.div 
          animate={{ 
            y: [0, -60, 0], 
            x: [0, 40, 0], 
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5]
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="mt-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full border border-white/5 flex items-center justify-center"
        >
          <div className="w-8 h-8 bg-white/20 rounded-full blur-md" />
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full left-4 top-5 shadow-[0_0_5px_cyan]" />
          <div className="absolute w-1 h-1 bg-cyan-400 rounded-full right-4 top-5 shadow-[0_0_5px_cyan]" />
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [view, setView] = useState<View>('main');
  const [gameMode, setGameMode] = useState<GameMode>(() => {
    const saved = localStorage.getItem('frontline_mode');
    return (saved as GameMode) || 'classic';
  });
  const [p1Loadouts, setP1Loadouts] = useState<Loadout[]>(() => {
    const saved = localStorage.getItem('frontline_p1_loadouts');
    return saved ? JSON.parse(saved) : [{ main: 0, super: 0 }, { main: 1, super: 1 }];
  });
  const [p2Loadouts, setP2Loadouts] = useState<Loadout[]>(() => {
    const saved = localStorage.getItem('frontline_p2_loadouts');
    return saved ? JSON.parse(saved) : [{ main: 0, super: 0 }, { main: 1, super: 1 }];
  });
  const [p1ActiveSlot, setP1ActiveSlot] = useState<number>(0);
  const [p2ActiveSlot, setP2ActiveSlot] = useState<number>(1);
  const [activeWeaponDetail, setActiveWeaponDetail] = useState<{ player: 1 | 2, type: 'main' | 'super', slot: number } | null>(null);
  const [modeTab, setModeTab] = useState<'CORE' | 'PRACTICE'>('CORE');

  const p1Loadout = p1Loadouts[p1ActiveSlot];
  const p2Loadout = p2Loadouts[p2ActiveSlot];

  const setP1Loadout = (update: (prev: Loadout) => Loadout) => {
    setP1Loadouts(prev => {
      const next = [...prev];
      next[p1ActiveSlot] = update(next[p1ActiveSlot]);
      return next;
    });
  };
  const setP2Loadout = (update: (prev: Loadout) => Loadout) => {
    setP2Loadouts(prev => {
      const next = [...prev];
      next[p2ActiveSlot] = update(next[p2ActiveSlot]);
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('frontline_mode', gameMode);
    localStorage.setItem('frontline_p1_loadouts', JSON.stringify(p1Loadouts));
    localStorage.setItem('frontline_p2_loadouts', JSON.stringify(p2Loadouts));
    localStorage.setItem('frontline_p1_slot', '0');
    localStorage.setItem('frontline_p2_slot', '1');
  }, [gameMode, p1Loadouts, p2Loadouts, p1ActiveSlot, p2ActiveSlot]);

  const [musicMuted, setMusicMuted] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const soundMutedRef = useRef(false);
  useEffect(() => {
    soundMutedRef.current = soundMuted;
  }, [soundMuted]);
  const [isTraining, setIsTraining] = useState(false);
  const isTrainingRef = useRef(false);
  useEffect(() => {
    isTrainingRef.current = isTraining;
  }, [isTraining]);
  const [isEditingLoadout, setIsEditingLoadout] = useState(false);
  const isEditingLoadoutRef = useRef(false);
  useEffect(() => {
    isEditingLoadoutRef.current = isEditingLoadout;
  }, [isEditingLoadout]);
  const [winner, setWinner] = useState<number | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [p1Hp, setP1Hp] = useState(MAX_HP);
  const [p2Hp, setP2Hp] = useState(MAX_HP);
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION);
  const [p1SuperCharge, setP1SuperCharge] = useState(0);
  const [p2SuperCharge, setP2SuperCharge] = useState(0);

  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  const gameModeRef = useRef(gameMode);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);

  // Game state refs for the loop
  const playersRef = useRef<Player[]>([
    {
      id: 1,
      x: 100,
      y: CANVAS_HEIGHT / 2,
      angle: 0,
      hp: MAX_HP,
      kills: 0,
      deaths: 0,
      lastShot: 0,
      color: '#4ade80',
      keys: {},
      isDead: false,
      respawnAt: 0,
      mainWeaponIndex: 0,
      superWeaponIndex: 0,
      superCharge: 0,
      lastSuperAt: 0,
      stunnedUntil: 0,
      drillActiveUntil: 0,
      dashActiveUntil: 0,
      dashAngle: 0,
      heldBall: false,
      chipsCollected: 0,
      zonePoints: 0,
      immunityUntil: 0,
      laserShotUntil: 0,
      laserLingerUntil: 0,
      isAimingSuper: false,
      damageDealt: 0,
      bowChargeStart: 0,
      isChargingBow: false,
      gunGameLevel: 0,
      superReadyPlayed: false,
    },
    {
      id: 2,
      x: CANVAS_WIDTH - 100,
      y: CANVAS_HEIGHT / 2,
      angle: Math.PI,
      hp: MAX_HP,
      kills: 0,
      deaths: 0,
      lastShot: 0,
      color: '#f87171',
      keys: {},
      isDead: false,
      respawnAt: 0,
      mainWeaponIndex: 0,
      superWeaponIndex: 0,
      superCharge: 0,
      lastSuperAt: 0,
      stunnedUntil: 0,
      drillActiveUntil: 0,
      dashActiveUntil: 0,
      dashAngle: 0,
      heldBall: false,
      chipsCollected: 0,
      zonePoints: 0,
      immunityUntil: 0,
      laserShotUntil: 0,
      laserLingerUntil: 0,
      isAimingSuper: false,
      damageDealt: 0,
      bowChargeStart: 0,
      isChargingBow: false,
      gunGameLevel: 0,
      superReadyPlayed: false,
    },
  ]);
  const bulletsRef = useRef<Bullet[]>([]);
  const minesRef = useRef<Mine[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const auraTurretsRef = useRef<AuraTurret[]>([]);
  const ghostsRef = useRef<Ghost[]>([]);
  const navGridRef = useRef<boolean[][] | null>(null);
  const slowingCirclesRef = useRef<SlowingCircle[]>([]);
  const grenadesRef = useRef<Grenade[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const boomerangsRef = useRef<BoomerangObj[]>([]);
  const boosterTurretsRef = useRef<BoosterTurret[]>([]);
  const ballRef = useRef<Ball>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, heldBy: null });
  const chipsRef = useRef<Chip[]>([]);
  const lastChipSpawnRef = useRef<number>(0);
  const trainingTargetRef = useRef<{ x: number, y: number, hp: number, maxHp: number } | null>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const matchTimeRef = useRef<number>(MATCH_DURATION);

  const getMaxHp = (mode: GameMode) => {
    if (mode === 'traditional-duel') return 100;
    return MAX_HP;
  };

  const resetPlayer = (id: 1 | 2, time: number, immediate: boolean = false) => {
    const p = playersRef.current[id - 1];
    p.drillActiveUntil = 0;
    p.stunnedUntil = 0;
    p.dashActiveUntil = 0;
    p.dashAngle = 0;
    p.laserShotUntil = 0;
    p.laserLingerUntil = 0;
    p.thirusoolamShotUntil = 0;
    p.thirusoolamLingerUntil = 0;
    p.isAimingSuper = false;
    p.lastSuperAt = time;
    p.superReadyPlayed = false;
    
    if (p.heldBall) {
      ballRef.current.heldBy = null;
      p.heldBall = false;
      if (!immediate) {
        ballRef.current.vx = (Math.random() - 0.5) * 4;
        ballRef.current.vy = (Math.random() - 0.5) * 4;
      }
    }

    const maxHp = getMaxHp(gameModeRef.current);

    if (immediate) {
      p.hp = maxHp;
      p.isDead = false;
      p.respawnAt = 0;
      p.immunityUntil = time + 2000; // 2 seconds immunity
      if (id === 1) {
        p.x = 100;
        p.y = CANVAS_HEIGHT / 2;
        p.angle = 0;
        setP1Hp(maxHp);
      } else {
        p.x = CANVAS_WIDTH - 100;
        p.y = CANVAS_HEIGHT / 2;
        p.angle = Math.PI;
        setP2Hp(maxHp);
      }
    } else {
      p.isDead = true;
      p.deaths += 1;
      p.hp = 0;
      if (id === 1) setP1Hp(0);
      else setP2Hp(0);
      playDeathSound(soundMutedRef.current);

      if (gameModeRef.current === 'traditional-duel') {
        // Only 1 life in Traditional Duel
        p.isDead = true;
      } else {
        // In other modes, just respawn
        p.respawnAt = time + RESPAWN_TIME;
      }
    }
  };

  const handleKill = (killerId: 1 | 2) => {
    const killer = playersRef.current[killerId - 1];
    killer.kills += 1;
    
    if (gameModeRef.current === 'gun-game') {
      if (killer.gunGameLevel === GUN_GAME_LOADOUTS.length - 1) {
        setWinner(killerId);
        playEndSound(soundMutedRef.current);
        setGameState('gameover');
      } else {
        killer.gunGameLevel += 1;
        const nextLoadout = GUN_GAME_LOADOUTS[killer.gunGameLevel];
        killer.mainWeaponIndex = nextLoadout.main;
        killer.superWeaponIndex = nextLoadout.super;
        playPointSound(killerId, soundMutedRef.current);
      }
    } else if (gameModeRef.current === 'traditional-duel') {
      playPointSound(killerId, soundMutedRef.current);
      setWinner(killerId);
      playEndSound(soundMutedRef.current);
      setGameState('gameover');
    } else if (gameModeRef.current === 'classic' && killer.kills >= MAX_KILLS) {
      playPointSound(killerId, soundMutedRef.current);
      setWinner(killerId);
      playEndSound(soundMutedRef.current);
      setGameState('gameover');
    } else {
      playPointSound(killerId, soundMutedRef.current);
    }
    setScores({ p1: playersRef.current[0].kills, p2: playersRef.current[1].kills });
  };

  const resetRound = (time: number) => {
    bulletsRef.current = [];
    minesRef.current = [];
    turretsRef.current = [];
    auraTurretsRef.current = [];
    ghostsRef.current = [];
    slowingCirclesRef.current = [];
    grenadesRef.current = [];
    explosionsRef.current = [];
    boomerangsRef.current = [];
    ballRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, heldBy: null };
    playersRef.current.forEach(p => {
      p.drillActiveUntil = 0;
      p.dashActiveUntil = 0;
      p.laserShotUntil = 0;
      p.laserLingerUntil = 0;
      p.thirusoolamShotUntil = 0;
      p.thirusoolamLingerUntil = 0;
      resetPlayer(p.id, time, true);
    });
  };

  useEffect(() => {
    navGridRef.current = null;
  }, [gameMode]);

  const checkCollision = (x: number, y: number, size: number, walls: Wall[]) => {
    for (const wall of walls) {
      // Find the closest point on the rectangle to the circle center
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.h));

      // Calculate the distance between the circle center and this closest point
      const distanceX = x - closestX;
      const distanceY = y - closestY;

      // If the distance is less than the circle's radius, an intersection occurs
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
      if (distanceSquared < (size * size)) {
        return true;
      }
    }
    return false;
  };

  const applyDamageToPlayer = (p: Player, damage: number, time: number) => {
    if (p.isDead || time < p.immunityUntil) return;
    let finalDamage = damage;
    if (WEAPONS[p.mainWeaponIndex].type === 'bow') {
      finalDamage *= 0.8;
    }
    p.hp -= finalDamage;
    if (p.id === 1) setP1Hp(Math.max(0, p.hp));
    else setP2Hp(Math.max(0, p.hp));
  };

  const getNearestEnemyTarget = (ownerId: number, x: number, y: number, range: number, walls: Wall[], mustHaveLOS: boolean = true) => {
    let nearestTarget: { x: number, y: number, hp: number, id?: number, type: string } | null = null;
    let minDist = range;

    const enemyId = ownerId === 1 ? 2 : 1;
    const enemy = playersRef.current[enemyId - 1];

    // Check enemy player
    if (!enemy.isDead) {
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < minDist && (!mustHaveLOS || checkLineOfSight(x, y, enemy.x, enemy.y, walls))) {
        minDist = dist;
        nearestTarget = { x: enemy.x, y: enemy.y, hp: enemy.hp, id: enemy.id, type: 'player' };
      }
    }

    // Check enemy turrets
    const allEnemyTurrets = [
      ...turretsRef.current, 
      ...auraTurretsRef.current, 
      ...boosterTurretsRef.current
    ];
    allEnemyTurrets.forEach(t => {
      if (t.ownerId !== ownerId && t.hp > 0) {
        const dist = Math.hypot(t.x - x, t.y - y);
        if (dist < minDist && (!mustHaveLOS || checkLineOfSight(x, y, t.x, t.y, walls))) {
          minDist = dist;
          nearestTarget = { x: t.x, y: t.y, hp: t.hp, type: 'turret' };
        }
      }
    });

    // Check enemy ghosts
    ghostsRef.current.forEach(g => {
      if (g.ownerId !== ownerId && g.hp > 0) {
        const dist = Math.hypot(g.x - x, g.y - y);
        if (dist < minDist && (!mustHaveLOS || checkLineOfSight(x, y, g.x, g.y, walls))) {
          minDist = dist;
          nearestTarget = { x: g.x, y: g.y, hp: g.hp, type: 'ghost' };
        }
      }
    });

    return nearestTarget;
  };

  const gameLoop = (time: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || gameStateRef.current !== 'playing' || isEditingLoadoutRef.current) {
      if (requestRef.current) requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    let walls = getWalls(gameModeRef.current);
    if (gameModeRef.current === 'payload-panic') {
      const p1Pos = getPayloadPos(PAYLOAD_TRACK_P1, playersRef.current[0].payloadProgress);
      const p2Pos = getPayloadPos(PAYLOAD_TRACK_P2, playersRef.current[1].payloadProgress);
      walls = [
        ...walls,
        { x: p1Pos.x - 20, y: p1Pos.y - 20, w: 40, h: 40 },
        { x: p2Pos.x - 20, y: p2Pos.y - 20, w: 40, h: 40 }
      ];
    }

    // --- Timer Update ---
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
      playersRef.current.forEach(p => p.immunityUntil = time + 2000);
    }
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;
    
    if (!isTraining) {
      matchTimeRef.current -= dt;
      if (matchTimeRef.current <= 0) {
        matchTimeRef.current = 0;
        setTimeLeft(0);
        
        let p1Score = 0;
        let p2Score = 0;
        
        if (gameModeRef.current === 'tech-hungry') {
          p1Score = playersRef.current[0].chipsCollected;
          p2Score = playersRef.current[1].chipsCollected;
        } else if (gameModeRef.current === 'shoot-n-shoot') {
          p1Score = playersRef.current[0].goalsScored;
          p2Score = playersRef.current[1].goalsScored;
        } else if (gameModeRef.current === 'super-zoner') {
          p1Score = Math.floor(playersRef.current[0].zonePoints);
          p2Score = Math.floor(playersRef.current[1].zonePoints);
        } else if (gameModeRef.current === 'traditional-duel') {
          p1Score = playersRef.current[0].hp;
          p2Score = playersRef.current[1].hp;
        } else if (gameModeRef.current === 'gun-game') {
          p1Score = playersRef.current[0].gunGameLevel;
          p2Score = playersRef.current[1].gunGameLevel;
        } else if (gameModeRef.current === 'payload-panic') {
          p1Score = playersRef.current[0].payloadProgress;
          p2Score = playersRef.current[1].payloadProgress;
        } else {
          p1Score = playersRef.current[0].kills;
          p2Score = playersRef.current[1].kills;
        }

        if (p1Score > p2Score) setWinner(1);
        else if (p2Score > p1Score) setWinner(2);
        else setWinner(0);
        
        playEndSound(soundMutedRef.current);
        setGameState('gameover');
        return;
      }
      setTimeLeft(Math.ceil(matchTimeRef.current));
    } else {
      setTimeLeft(999); // Placeholder for training
    }

    // --- Update ---
    playersRef.current.forEach((p) => {
      if (p.isDead) {
        if (p.isChargingBow) {
          p.isChargingBow = false;
          p.bowChargeStart = 0;
          stopBowChargeSound(p.id);
        }
        if (time >= p.respawnAt) {
          resetPlayer(p.id, time, true);
        }
        return;
      }

      // Sync HP and Super Charge
      if (p.id === 1) setP1Hp(p.hp);
      if (p.id === 2) setP2Hp(p.hp);
      if (p.id === 1) setP1SuperCharge(p.superCharge);
      else setP2SuperCharge(p.superCharge);

      // Super Zoner Scoring
      if (gameModeRef.current === 'super-zoner') {
        const zoneSize = 250;
        const zoneX = CANVAS_WIDTH / 2 - zoneSize / 2;
        const zoneY = CANVAS_HEIGHT / 2 - zoneSize / 2;
        
        const p1 = playersRef.current[0];
        const p2 = playersRef.current[1];
        
        const p1In = p1.x > zoneX && p1.x < zoneX + zoneSize && p1.y > zoneY && p1.y < zoneY + zoneSize;
        const p2In = p2.x > zoneX && p2.x < zoneX + zoneSize && p2.y > zoneY && p2.y < zoneY + zoneSize;
        
        if (p1In && !p2In && p.id === 1) {
          const oldPoints = Math.floor(p.zonePoints);
          p.zonePoints += dt;
          if (Math.floor(p.zonePoints) > oldPoints) {
            playPointSound(1, soundMutedRef.current);
          }
        } else if (p2In && !p1In && p.id === 2) {
          const oldPoints = Math.floor(p.zonePoints);
          p.zonePoints += dt;
          if (Math.floor(p.zonePoints) > oldPoints) {
            playPointSound(2, soundMutedRef.current);
          }
        }
      }

      // Check Ball Pickup
      if (gameModeRef.current === 'shoot-n-shoot' && !p.heldBall && ballRef.current.heldBy === null) {
        const dist = Math.hypot(p.x - ballRef.current.x, p.y - ballRef.current.y);
        if (dist < 30) {
          ballRef.current.heldBy = p.id;
          p.heldBall = true;
          ballRef.current.vx = 0;
          ballRef.current.vy = 0;
          playBallPickupSound(soundMutedRef.current);
        }
      }

      // Check Chip Pickup
      if (gameModeRef.current === 'tech-hungry') {
        chipsRef.current = chipsRef.current.filter(chip => {
          const dist = Math.hypot(p.x - chip.x, p.y - chip.y);
          if (dist < 30) {
            p.chipsCollected += 1;
            playPointSound(p.id, soundMutedRef.current);
            playChipPickupSound(soundMutedRef.current);
            if (p.chipsCollected >= 15) {
              setWinner(p.id);
              playEndSound(soundMutedRef.current);
              setGameState('gameover');
            }
            return false;
          }
          return true;
        });
      }

      // Check Slowing Circles
      let speedMult = 1.0;
      slowingCirclesRef.current.forEach(c => {
        const dist = Math.hypot(p.x - c.x, p.y - c.y);
        if (dist < 200 && c.ownerId !== p.id) {
          speedMult = 1/3;
          // Damage over time: 2.5 over 5s = 0.5 per second
          applyDamageToPlayer(p, 0.5 * dt, time);
          playersRef.current[c.ownerId - 1].damageDealt += (0.5 * dt);
          
          if (p.hp <= 0) {
            handleKill(c.ownerId);
            if (p.heldBall) {
              ballRef.current.heldBy = null;
              p.heldBall = false;
            }
            resetPlayer(p.id, time);
          }
        }
      });

      // Super Charge
      if (time - p.lastSuperAt > SUPER_COOLDOWN) {
        p.superCharge = 1;
      } else {
        p.superCharge = (time - p.lastSuperAt) / SUPER_COOLDOWN;
      }
      
      if (p.superCharge >= 1 && !p.superReadyPlayed) {
        playSuperReadySound(p.id, soundMutedRef.current);
        p.superReadyPlayed = true;
      }

      if (p.id === 1) setP1Hp(p.hp); // Sync HP state
      if (p.id === 2) setP2Hp(p.hp);
      if (p.id === 1) setP1SuperCharge(p.superCharge);
      else setP2SuperCharge(p.superCharge);

      // Stun check
      if (time < p.stunnedUntil || time < p.laserShotUntil) {
        if (p.isChargingBow) {
          p.isChargingBow = false;
          p.bowChargeStart = 0;
          stopBowChargeSound(p.id);
        }
        p.isAimingSuper = false;
        if (p.heldBall && time < p.stunnedUntil) {
          ballRef.current.heldBy = null;
          p.heldBall = false;
          ballRef.current.vx = (Math.random() - 0.5) * 4;
          ballRef.current.vy = (Math.random() - 0.5) * 4;
        }
        return;
      }

      // Dash logic
      if (time < p.dashActiveUntil) {
        const dashSpeed = 12;
        const vx = Math.cos(p.dashAngle) * dashSpeed;
        const vy = Math.sin(p.dashAngle) * dashSpeed;
        if (!checkCollision(p.x + vx, p.y + vy, PLAYER_SIZE / 2, walls)) {
          p.x += vx;
          p.y += vy;
        }
        
        // Check hit during dash
        const enemy = playersRef.current[p.id === 1 ? 1 : 0];
        if (!enemy.isDead) {
          const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (dist < PLAYER_SIZE) {
            enemy.stunnedUntil = time + 1000;
            if (time >= enemy.immunityUntil) {
              applyDamageToPlayer(enemy, 1, time);
              p.damageDealt += 1;
            }
            p.dashActiveUntil = 0; // Stop dash on hit
            
            if (enemy.hp <= 0) {
              handleKill(p.id);
              if (enemy.heldBall) {
                ballRef.current.heldBy = null;
                enemy.heldBall = false;
              }
              resetPlayer(enemy.id, time);
            }
          }
        }
        return;
      }

      let dx = 0;
      let dy = 0;
      let currentSpeed = PLAYER_SPEED * speedMult;
      if (time < p.drillActiveUntil) {
        currentSpeed = PLAYER_SPEED * 2 * speedMult;
        if (time % 200 < 50) playDrillSound(soundMutedRef.current);
      } else if (WEAPONS[p.mainWeaponIndex].type === 'knife') {
        currentSpeed = KNIFE_SPEED * speedMult;
      } else if (WEAPONS[p.mainWeaponIndex].type === 'boomerang' || WEAPONS[p.mainWeaponIndex].type === 'thirusoolam') {
        currentSpeed = 2.5 * speedMult; // 25% faster than 2.0
      }

      if (p.id === 1) {
        if (p.keys['ShiftLeft']) {
          if (p.keys['KeyA']) {
            dx = Math.cos(p.angle - Math.PI / 2) * currentSpeed;
            dy = Math.sin(p.angle - Math.PI / 2) * currentSpeed;
          }
          if (p.keys['KeyD']) {
            dx = Math.cos(p.angle + Math.PI / 2) * currentSpeed;
            dy = Math.sin(p.angle + Math.PI / 2) * currentSpeed;
          }
        } else {
          if (p.keys['KeyA']) p.angle -= ROTATION_SPEED;
          if (p.keys['KeyD']) p.angle += ROTATION_SPEED;
        }
        
        if (p.keys['KeyW']) {
          dx = Math.cos(p.angle) * currentSpeed;
          dy = Math.sin(p.angle) * currentSpeed;
        }
        if (p.keys['KeyS']) {
          dx = -Math.cos(p.angle) * currentSpeed;
          dy = -Math.sin(p.angle) * currentSpeed;
        }
        
        // Ball Kick P1
        if (p.heldBall && p.keys['Digit1']) {
          ballRef.current.heldBy = null;
          p.heldBall = false;
          ballRef.current.vx = Math.cos(p.angle) * 15;
          ballRef.current.vy = Math.sin(p.angle) * 15;
          playBallKickSound(soundMutedRef.current);
        }
        
        // Super Activation P1
        const superKeyP1 = p.keys['KeyQ'];
        const superWeaponP1 = SUPERS[p.superWeaponIndex];
        if (superWeaponP1.isAimable) {
          if (superKeyP1 && p.superCharge >= 1) {
            p.isAimingSuper = true;
          } else if (!superKeyP1 && p.isAimingSuper) {
            activateSuper(p, time);
            p.isAimingSuper = false;
          }
        } else {
          if (superKeyP1 && p.superCharge >= 1) {
            activateSuper(p, time);
            p.keys['KeyQ'] = false;
          }
        }

        const weapon = time < p.drillActiveUntil ? { type: 'drill', reload: 100, damage: 1.0, range: 60, isMelee: true } : WEAPONS[p.mainWeaponIndex];
        const shootKey = p.id === 1 ? 'Digit1' : 'Digit0';
        
        if (weapon.type === 'bow') {
          if (p.keys[shootKey] && !p.isDead && (time >= p.stunnedUntil)) {
            if (!p.isChargingBow && time - p.lastShot > weapon.reload) {
              p.isChargingBow = true;
              p.bowChargeStart = time;
              startBowChargeSound(p.id, soundMutedRef.current);
            }
            // Auto-release after 3 seconds at max charge (level 8)
            if (p.isChargingBow && time - p.bowChargeStart >= 5625) {
              const holdDuration = time - p.bowChargeStart;
              const damage = Math.min(8, Math.floor(holdDuration / 375) + 1);
              handleShoot(p, { ...weapon, damage }, time);
              p.isChargingBow = false;
              p.bowChargeStart = 0;
              stopBowChargeSound(p.id);
              playArrowSound(soundMutedRef.current);
            }
          } else if (p.isChargingBow) {
            // Fire!
            const holdDuration = time - p.bowChargeStart;
            const damage = Math.min(8, Math.floor(holdDuration / 375) + 1);
            handleShoot(p, { ...weapon, damage }, time);
            p.isChargingBow = false;
            p.bowChargeStart = 0;
            stopBowChargeSound(p.id);
            playArrowSound(soundMutedRef.current);
          }
        } else {
          if (p.keys[shootKey] && time - p.lastShot > weapon.reload) {
            handleShoot(p, weapon, time);
          }
        }
      } else {
        if (p.keys['ShiftRight']) {
          if (p.keys['ArrowLeft']) {
            dx = Math.cos(p.angle - Math.PI / 2) * currentSpeed;
            dy = Math.sin(p.angle - Math.PI / 2) * currentSpeed;
          }
          if (p.keys['ArrowRight']) {
            dx = Math.cos(p.angle + Math.PI / 2) * currentSpeed;
            dy = Math.sin(p.angle + Math.PI / 2) * currentSpeed;
          }
        } else {
          if (p.keys['ArrowLeft']) p.angle -= ROTATION_SPEED;
          if (p.keys['ArrowRight']) p.angle += ROTATION_SPEED;
        }

        if (p.keys['ArrowUp']) {
          dx = Math.cos(p.angle) * currentSpeed;
          dy = Math.sin(p.angle) * currentSpeed;
        }
        if (p.keys['ArrowDown']) {
          dx = -Math.cos(p.angle) * currentSpeed;
          dy = -Math.sin(p.angle) * currentSpeed;
        }

        // Ball Kick P2
        if (p.heldBall && p.keys['Digit0']) {
          ballRef.current.heldBy = null;
          p.heldBall = false;
          ballRef.current.vx = Math.cos(p.angle) * 15;
          ballRef.current.vy = Math.sin(p.angle) * 15;
          playBallKickSound(soundMutedRef.current);
        }

        // Super Activation P2
        const superKeyP2 = p.keys['KeyL'];
        const superWeaponP2 = SUPERS[p.superWeaponIndex];
        if (superWeaponP2.isAimable) {
          if (superKeyP2 && p.superCharge >= 1) {
            p.isAimingSuper = true;
          } else if (!superKeyP2 && p.isAimingSuper) {
            activateSuper(p, time);
            p.isAimingSuper = false;
          }
        } else {
          if (superKeyP2 && p.superCharge >= 1) {
            activateSuper(p, time);
            p.keys['KeyL'] = false;
          }
        }

        const weapon = time < p.drillActiveUntil ? { type: 'drill', reload: 100, damage: 1.0, range: 60, isMelee: true } : WEAPONS[p.mainWeaponIndex];
        const shootKey = p.id === 1 ? 'Digit1' : 'Digit0';
        
        if (weapon.type === 'bow') {
          if (p.keys[shootKey] && !p.isDead && (time >= p.stunnedUntil)) {
            if (!p.isChargingBow && time - p.lastShot > weapon.reload) {
              p.isChargingBow = true;
              p.bowChargeStart = time;
              startBowChargeSound(p.id, soundMutedRef.current);
            }
            // Auto-release after 3 seconds at max charge (level 8)
            if (p.isChargingBow && time - p.bowChargeStart >= 5625) {
              const holdDuration = time - p.bowChargeStart;
              const damage = Math.min(8, Math.floor(holdDuration / 375) + 1);
              handleShoot(p, { ...weapon, damage }, time);
              p.isChargingBow = false;
              p.bowChargeStart = 0;
              stopBowChargeSound(p.id);
              playArrowSound(soundMutedRef.current);
            }
          } else if (p.isChargingBow) {
            // Fire!
            const holdDuration = time - p.bowChargeStart;
            const damage = Math.min(8, Math.floor(holdDuration / 375) + 1);
            handleShoot(p, { ...weapon, damage }, time);
            p.isChargingBow = false;
            p.bowChargeStart = 0;
            stopBowChargeSound(p.id);
            playArrowSound(soundMutedRef.current);
          }
        } else {
          if (p.keys[shootKey] && time - p.lastShot > weapon.reload) {
            handleShoot(p, weapon, time);
          }
        }
      }

      if (!checkCollision(p.x + dx, p.y, PLAYER_SIZE / 2, walls)) p.x += dx;
      if (!checkCollision(p.x, p.y + dy, PLAYER_SIZE / 2, walls)) p.y += dy;
    });

    // Update Ball
    if (gameModeRef.current === 'shoot-n-shoot') {
      const b = ballRef.current;
      if (b.heldBy !== null) {
        const holder = playersRef.current[b.heldBy - 1];
        b.x = holder.x + Math.cos(holder.angle) * 20;
        b.y = holder.y + Math.sin(holder.angle) * 20;
      } else {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.95; // Friction increased to slow down faster
        b.vy *= 0.95;
        
        // Wall bounce
        if (checkCollision(b.x + b.vx, b.y, 10, walls)) {
          b.vx *= -0.8;
          playBallBounceSound(soundMutedRef.current);
        }
        if (checkCollision(b.x, b.y + b.vy, 10, walls)) {
          b.vy *= -0.8;
          playBallBounceSound(soundMutedRef.current);
        }
        
        // Goal detection
        if (b.x < 40 && b.y > 200 && b.y < 400) {
          // Player 2 Goal (Left) -> Player 2 scores
          playersRef.current[1].goalsScored += 1;
          playPointSound(2, soundMutedRef.current);
          setScores({ p1: playersRef.current[0].goalsScored, p2: playersRef.current[1].goalsScored });
          playGoalSound(soundMutedRef.current);
          if (playersRef.current[1].goalsScored >= 5) {
            setWinner(2);
            playEndSound(soundMutedRef.current);
            setGameState('gameover');
          } else {
            resetRound(time);
          }
        } else if (b.x > CANVAS_WIDTH - 40 && b.y > 200 && b.y < 400) {
          // Player 1 Goal (Right) -> Player 1 scores
          playersRef.current[0].goalsScored += 1;
          playPointSound(1, soundMutedRef.current);
          setScores({ p1: playersRef.current[0].goalsScored, p2: playersRef.current[1].goalsScored });
          playGoalSound(soundMutedRef.current);
          if (playersRef.current[0].goalsScored >= 5) {
            setWinner(1);
            playEndSound(soundMutedRef.current);
            setGameState('gameover');
          } else {
            resetRound(time);
          }
        }
      }
    }

    // Update Chips
    if (gameModeRef.current === 'tech-hungry') {
      if (time - lastChipSpawnRef.current > 8000) {
        lastChipSpawnRef.current = time;
        // Spawn chip EQUALLY in left and right sides of the mine
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 150;
        let cx, cy;
        if (side === 'left') {
          cx = CANVAS_WIDTH / 2 - dist;
        } else {
          cx = CANVAS_WIDTH / 2 + dist;
        }
        cy = CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 300;
        
        if (!checkCollision(cx, cy, 10, walls)) {
          chipsRef.current.push({ x: cx, y: cy, id: Math.random().toString() });
          playChipSpawnSound(soundMutedRef.current);
        }
      }
    }

    // Update Payload Panic
    if (gameModeRef.current === 'payload-panic') {
      playersRef.current.forEach(p => {
        const track = p.id === 1 ? PAYLOAD_TRACK_P1 : PAYLOAD_TRACK_P2;
        const pos = getPayloadPos(track, p.payloadProgress);
        const distToPayload = Math.hypot(p.x - pos.x, p.y - pos.y);
        const enemy = playersRef.current[p.id === 1 ? 1 : 0];
        const distEnemyToPayload = Math.hypot(enemy.x - pos.x, enemy.y - pos.y);
        
        const zoneRadius = 60;
        const isPlayerInZone = distToPayload < zoneRadius && !p.isDead && time >= p.stunnedUntil;
        const isEnemyInZone = distEnemyToPayload < zoneRadius && !enemy.isDead;
        
        if (isPlayerInZone && !isEnemyInZone) {
          // Pushing
          p.payloadProgress += 3.33 * dt;
          if (time % 1000 < 50) playChooChooSound(soundMutedRef.current);
        }
        
        if (p.payloadProgress >= 100) {
          p.payloadProgress = 100;
          setWinner(p.id);
          playEndSound(soundMutedRef.current);
          setGameState('gameover');
        }
      });
    }

    // Update Mines
    minesRef.current = minesRef.current.filter(mine => {
      const enemy = playersRef.current[mine.ownerId === 1 ? 1 : 0];
      if (!enemy.isDead) {
        const dist = Math.hypot(enemy.x - mine.x, enemy.y - mine.y);
        if (dist < PLAYER_SIZE / 2 + 20) {
          if (time >= enemy.immunityUntil) {
            enemy.hp -= 7;
            playersRef.current[mine.ownerId - 1].damageDealt += 7;
          }
          playExplosionSound(soundMutedRef.current);
          if (enemy.id === 1) setP1Hp(Math.max(0, enemy.hp));
          else setP2Hp(Math.max(0, enemy.hp));
          if (enemy.hp <= 0) {
            handleKill(mine.ownerId);
            resetPlayer(enemy.id, time);
          }
          return false;
        }
      }
      return true;
    });

    // Update Turrets
    turretsRef.current = turretsRef.current.filter(turret => {
      if (turret.hp <= 0) return false;
      
      // Damage from slowing circles
      slowingCirclesRef.current.forEach(c => {
        const dist = Math.hypot(turret.x - c.x, turret.y - c.y);
        if (dist < 200 && c.ownerId !== turret.ownerId) {
          turret.hp -= (0.5 * dt);
        }
      });
      if (turret.hp <= 0) return false;
      const target = getNearestEnemyTarget(turret.ownerId, turret.x, turret.y, 300, walls);
      if (target) {
        if (time - turret.lastShot > 500) {
          playPistolSound(soundMutedRef.current);
          const angle = Math.atan2(target.y - turret.y, target.x - turret.x);
          bulletsRef.current.push({
            x: turret.x + Math.cos(angle) * 20,
            y: turret.y + Math.sin(angle) * 20,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
            ownerId: turret.ownerId,
            damage: 2.5,
            range: Infinity,
            startX: turret.x,
            startY: turret.y,
            totalDist: 0,
          });
          turret.lastShot = time;
        }
      }
      return true;
    });

    // Update Aura Turrets
    auraTurretsRef.current = auraTurretsRef.current.filter(turret => {
      if (turret.hp <= 0) return false;
      
      // Damage from slowing circles
      slowingCirclesRef.current.forEach(c => {
        const dist = Math.hypot(turret.x - c.x, turret.y - c.y);
        if (dist < 200 && c.ownerId !== turret.ownerId) {
          turret.hp -= (0.5 * dt);
        }
      });
      if (turret.hp <= 0) return false;

      // Healing logic (1 HP per second)
      if (time - turret.lastHeal > 1000) {
        const zoneRadius = 125; // 250px diameter
        let healed = false;
        playersRef.current.forEach(p => {
          if (!p.isDead && p.id === turret.ownerId) {
            const dist = Math.hypot(p.x - turret.x, p.y - turret.y);
            if (dist < zoneRadius) {
              const maxHp = getMaxHp(gameModeRef.current);
              p.hp = Math.min(maxHp, p.hp + 1);
              if (p.id === 1) setP1Hp(p.hp);
              else setP2Hp(p.hp);
              healed = true;
            }
          }
        });
        if (healed) {
          playAuraHealSound(soundMutedRef.current);
        }
        turret.lastHeal = time;
      }
      return true;
    });

    // Update Booster Turrets
    boosterTurretsRef.current = boosterTurretsRef.current.filter(turret => {
      if (turret.hp <= 0) return false;
      
      // Damage from slowing circles
      slowingCirclesRef.current.forEach(c => {
        const dist = Math.hypot(turret.x - c.x, turret.y - c.y);
        if (dist < 200 && c.ownerId !== turret.ownerId) {
          turret.hp -= (0.5 * dt);
        }
      });
      return turret.hp > 0;
    });

    // Update Ghosts
    if (!navGridRef.current) {
      navGridRef.current = getNavGrid(walls);
    }

    ghostsRef.current = ghostsRef.current.filter(ghost => {
      if (ghost.hp <= 0) return false;
      const target = getNearestEnemyTarget(ghost.ownerId, ghost.x, ghost.y, Infinity, walls, false);
      if (!target) return true;
      
      let ghostSpeedMult = 1.0;
      slowingCirclesRef.current.forEach(c => {
        const dist = Math.hypot(ghost.x - c.x, ghost.y - c.y);
        if (dist < 200 && c.ownerId !== ghost.ownerId) {
          ghostSpeedMult = 1/3;
          ghost.hp -= (0.5 * dt);
        }
      });

      // A* Pathfinding logic
      if (!ghost.path || (ghost.pathTimer || 0) <= 0 || !ghost.pathTarget || Math.hypot(target.x - ghost.pathTarget.x, target.y - ghost.pathTarget.y) > 50) {
        const newPath = findPath(ghost.x, ghost.y, target.x, target.y, navGridRef.current!);
        if (newPath && newPath.length > 1) {
          ghost.path = newPath.slice(1); // Skip current position
          ghost.pathTarget = { x: target.x, y: target.y };
          ghost.pathTimer = 30 + Math.floor(Math.random() * 20); // Recalculate every 30-50 frames
        }
      }
      if (ghost.pathTimer !== undefined) ghost.pathTimer--;

      // Path smoothing: skip nodes if we have a clear line of sight to a further node
      if (ghost.path && ghost.path.length > 1) {
        for (let i = ghost.path.length - 1; i > 0; i--) {
          const node = ghost.path[i];
          const dist = Math.hypot(node.x - ghost.x, node.y - ghost.y);
          if (dist < 150) { // Only smooth nearby nodes
            const steps = 10;
            let clear = true;
            for (let s = 1; s <= steps; s++) {
              const tx = ghost.x + (node.x - ghost.x) * (s / steps);
              const ty = ghost.y + (node.y - ghost.y) * (s / steps);
              if (checkCollision(tx, ty, 18, walls)) { // Use slightly larger radius for safety
                clear = false;
                break;
              }
            }
            if (clear) {
              ghost.path = ghost.path.slice(i);
              break;
            }
          }
        }
      }

      let moved = false;
      if (ghost.path && ghost.path.length > 0) {
        const nextNode = ghost.path[0];
        const distToNode = Math.hypot(nextNode.x - ghost.x, nextNode.y - ghost.y);
        
        if (distToNode < 10) {
          ghost.path.shift();
        } else {
          const angle = Math.atan2(nextNode.y - ghost.y, nextNode.x - ghost.x);
          const vx = Math.cos(angle) * GHOST_SPEED * ghostSpeedMult;
          const vy = Math.sin(angle) * GHOST_SPEED * ghostSpeedMult;
          
          if (!checkCollision(ghost.x + vx, ghost.y + vy, 15, walls)) {
            ghost.x += vx;
            ghost.y += vy;
            ghost.lastAngle = angle;
            moved = true;
          } else {
            // Path node is blocked (maybe a dynamic wall or precision issue), fallback to direct move
            ghost.path = undefined;
          }
        }
      }

      // Fallback to direct movement if no path or stuck
      if (!moved) {
        const targetAngle = Math.atan2(target.y - ghost.y, target.x - ghost.x);
        const searchOffsets = [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6, 0.8, -0.8, 1.0, -1.0, 1.2, -1.2, 1.4, -1.4, Math.PI];
        
        for (let offset of searchOffsets) {
          const testAngle = targetAngle + offset;
          const vx = Math.cos(testAngle) * GHOST_SPEED * ghostSpeedMult;
          const vy = Math.sin(testAngle) * GHOST_SPEED * ghostSpeedMult;
          
          if (!checkCollision(ghost.x + vx, ghost.y + vy, 15, walls)) {
            ghost.x += vx;
            ghost.y += vy;
            ghost.lastAngle = testAngle;
            moved = true;
            break;
          }
        }

        if (!moved) {
          const vx = Math.cos(targetAngle) * GHOST_SPEED * ghostSpeedMult;
          const vy = Math.sin(targetAngle) * GHOST_SPEED * ghostSpeedMult;
          
          const canMoveX = !checkCollision(ghost.x + vx, ghost.y, 15, walls);
          const canMoveY = !checkCollision(ghost.x, ghost.y + vy, 15, walls);
          
          if (canMoveX) {
            ghost.x += vx;
            moved = true;
          }
          if (canMoveY) {
            ghost.y += vy;
            moved = true;
          }
          if (moved) ghost.lastAngle = targetAngle;
        }
      }

      // 3. If still stuck, try to push out of walls (last resort)
      if (!moved) {
        const pushAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];
        for (let a of pushAngles) {
          const px = Math.cos(a) * 2;
          const py = Math.sin(a) * 2;
          if (!checkCollision(ghost.x + px, ghost.y + py, 15, walls)) {
            ghost.x += px;
            ghost.y += py;
            break;
          }
        }
      }

      const dist = Math.hypot(target.x - ghost.x, target.y - ghost.y);
      if (dist < 40) {
        if (target.type === 'player') {
          const p = playersRef.current[target.id! - 1];
          if (time >= p.immunityUntil) {
            p.hp -= 3;
            playersRef.current[ghost.ownerId - 1].damageDealt += 3;
          }
          p.stunnedUntil = time + 3000;
          if (p.id === 1) setP1Hp(Math.max(0, p.hp));
          else setP2Hp(Math.max(0, p.hp));
          if (p.hp <= 0) {
            handleKill(ghost.ownerId);
            resetPlayer(p.id, time);
          }
        } else {
          // Target is another turret/ghost
          // Find the actual object in the refs
          const findAndDamage = (list: any[]) => {
            const item = list.find(i => i.x === target.x && i.y === target.y);
            if (item) {
              item.hp -= 3;
              playersRef.current[ghost.ownerId - 1].damageDealt += 3;
            }
          };
          findAndDamage(turretsRef.current);
          findAndDamage(auraTurretsRef.current);
          findAndDamage(boosterTurretsRef.current);
          findAndDamage(ghostsRef.current);
        }
        playExplosionSound(soundMutedRef.current);
        return false;
      }
      return true;
    });

    // Update Bullets
    bulletsRef.current = bulletsRef.current.filter((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.totalDist = (b.totalDist || 0) + Math.hypot(b.vx, b.vy);
      const distTraveled = b.totalDist;
      
      if (b.isLauncher) {
        const progress = Math.min(1, distTraveled / b.range);
        playLauncherFlySound(soundMutedRef.current, progress, b.pitchMult || 1);
      }

      const createSplash = () => {
        playExplosionSound(soundMutedRef.current);
        explosionsRef.current.push({
          x: b.x,
          y: b.y,
          radius: 40, // splash radius = mine radius (20) but hardcode it. 40 is better for gameplay.
          expiresAt: time + 300,
          id: Math.random().toString(),
          ownerId: b.ownerId,
          damage: b.damage,
          hasDamaged: false
        });
      };

      if (distTraveled > b.range) {
        if (b.isLauncher) createSplash();
        return false;
      }
      
      // Wall Collision for Bouncing (Ammunicion)
      if (b.isMusic) {
        const radius = 6;
        for (const w of walls) {
          if (b.x + radius > w.x && b.x - radius < w.x + w.w &&
              b.y + radius > w.y && b.y - radius < w.y + w.h) {
            
            const overlapX = Math.min(b.x + radius - w.x, w.x + w.w - (b.x - radius));
            const overlapY = Math.min(b.y + radius - w.y, w.y + w.h - (b.y - radius));

            if (overlapX < overlapY) {
              b.vx *= -1;
              b.x += b.vx;
            } else {
              b.vy *= -1;
              b.y += b.vy;
            }
            
            b.bounces = (b.bounces || 0) + 1;
            playBallBounceSound(soundMutedRef.current);
            break; 
          }
        }
      } else if (checkCollision(b.x, b.y, 2, walls)) {
        if (b.isLauncher) createSplash();
        return false;
      }

      // Hit Turrets
      for (const t of turretsRef.current) {
        if (t.ownerId !== b.ownerId) {
          const dist = Math.hypot(t.x - b.x, t.y - b.y);
          if (dist < 20) {
            if (b.isLauncher) createSplash();
            else {
              t.hp -= b.damage;
              playersRef.current[b.ownerId - 1].damageDealt += b.damage;
            }
            return false;
          }
        }
      }

      // Hit Aura Turrets
      for (const t of auraTurretsRef.current) {
        if (t.ownerId !== b.ownerId) {
          const dist = Math.hypot(t.x - b.x, t.y - b.y);
          if (dist < 20) {
            if (b.isLauncher) createSplash();
            else {
              t.hp -= b.damage;
              playersRef.current[b.ownerId - 1].damageDealt += b.damage;
            }
            return false;
          }
        }
      }

      // Hit Booster Turrets
      for (const t of boosterTurretsRef.current) {
        if (t.ownerId !== b.ownerId) {
          const dist = Math.hypot(t.x - b.x, t.y - b.y);
          if (dist < 20) {
            if (b.isLauncher) createSplash();
            else {
              t.hp -= b.damage;
              playersRef.current[b.ownerId - 1].damageDealt += b.damage;
            }
            return false;
          }
        }
      }

      // Hit Ghosts
      for (const g of ghostsRef.current) {
        if (g.ownerId !== b.ownerId) {
          const dist = Math.hypot(g.x - b.x, g.y - b.y);
          if (dist < 15) {
            if (b.isLauncher) createSplash();
            else {
              g.hp -= b.damage;
              playersRef.current[b.ownerId - 1].damageDealt += b.damage;
            }
            return false;
          }
        }
      }

      // Hit Training Target
      if (trainingTargetRef.current) {
        const target = trainingTargetRef.current;
        if (target.hp > 0) {
          const dist = Math.hypot(target.x - b.x, target.y - b.y);
          if (dist < 40) {
            if (b.isLauncher) createSplash();
            else {
              target.hp -= b.damage;
              playersRef.current[b.ownerId - 1].damageDealt += b.damage;
              if (target.hp <= 0) {
                target.hp = target.maxHp;
                playPointSound(b.ownerId, soundMutedRef.current);
              }
            }
            return false;
          }
        }
      }

      for (const p of playersRef.current) {
        if (!p.isDead && p.id !== b.ownerId) {
          const dist = Math.hypot(p.x - b.x, p.y - b.y);
          if (dist < PLAYER_SIZE / 2 + 4) {
            if (b.isLauncher) createSplash();
            else {
              applyDamageToPlayer(p, b.damage, time);
              playersRef.current[b.ownerId - 1].damageDealt += b.damage;
              if (p.hp <= 0) {
                handleKill(b.ownerId);
                resetPlayer(p.id, time);
              }
            }
            return false;
          }
        }
      }
      return b.x > 0 && b.x < CANVAS_WIDTH && b.y > 0 && b.y < CANVAS_HEIGHT;
    });

    // Update Boomerangs
    boomerangsRef.current = boomerangsRef.current.filter(b => {
      const owner = playersRef.current[b.ownerId - 1];
      
      if (!b.isReturning) {
        b.x += b.vx;
        b.y += b.vy;
        
        const dist = Math.hypot(b.x - b.startX, b.y - b.startY);
        const progress = Math.min(1, dist / b.range);
        playBoomerangSpinSound(soundMutedRef.current, progress, false, b.pitchMult || 1);

        if (dist > b.range || checkCollision(b.x, b.y, 10, walls)) {
          b.isReturning = true;
          b.damagedIds.clear(); // Reset for return trip
        }
      } else {
        // Return through walls
        const angle = Math.atan2(owner.y - b.y, owner.x - b.x);
        const speed = 7.2;
        b.x += Math.cos(angle) * speed;
        b.y += Math.sin(angle) * speed;
        
        const distToOwner = Math.hypot(owner.x - b.x, owner.y - b.y);
        const progress = Math.min(1, distToOwner / 400); // Inverse progress for return
        playBoomerangSpinSound(soundMutedRef.current, 1 - progress, true, b.pitchMult || 1);

        if (distToOwner < 20) {
          return false;
        }
      }
      
      // Damage players
      playersRef.current.forEach(target => {
        if (!target.isDead && target.id !== b.ownerId) {
          const dist = Math.hypot(target.x - b.x, target.y - b.y);
          if (dist < PLAYER_SIZE / 2 + 10 && !b.damagedIds.has(target.id.toString())) {
            if (time >= target.immunityUntil) {
              target.hp -= b.damage;
              owner.damageDealt += b.damage;
            }
            b.damagedIds.add(target.id.toString());
            if (target.id === 1) setP1Hp(Math.max(0, target.hp));
            else setP2Hp(Math.max(0, target.hp));
            
            if (target.hp <= 0) {
              handleKill(b.ownerId);
              resetPlayer(target.id, time);
            }
          }
        }
      });

      // Damage Turrets/Ghosts/Auras with Boomerang
      turretsRef.current.forEach(t => {
        if (t.ownerId !== b.ownerId) {
          const dist = Math.hypot(t.x - b.x, t.y - b.y);
          if (dist < 20 + 10 && !b.damagedIds.has('turret-' + t.id)) {
            t.hp -= b.damage;
            owner.damageDealt += b.damage;
            b.damagedIds.add('turret-' + t.id);
          }
        }
      });
      auraTurretsRef.current.forEach(t => {
        if (t.ownerId !== b.ownerId) {
          const dist = Math.hypot(t.x - b.x, t.y - b.y);
          if (dist < 20 + 10 && !b.damagedIds.has('aura-' + t.id)) {
            t.hp -= b.damage;
            owner.damageDealt += b.damage;
            b.damagedIds.add('aura-' + t.id);
          }
        }
      });
      boosterTurretsRef.current.forEach(t => {
        if (t.ownerId !== b.ownerId) {
          const dist = Math.hypot(t.x - b.x, t.y - b.y);
          if (dist < 20 + 10 && !b.damagedIds.has('booster-' + t.id)) {
            t.hp -= b.damage;
            owner.damageDealt += b.damage;
            b.damagedIds.add('booster-' + t.id);
          }
        }
      });
      ghostsRef.current.forEach(g => {
        if (g.ownerId !== b.ownerId) {
          const dist = Math.hypot(g.x - b.x, g.y - b.y);
          if (dist < 15 + 10 && !b.damagedIds.has('ghost-' + g.id)) {
            g.hp -= b.damage;
            owner.damageDealt += b.damage;
            b.damagedIds.add('ghost-' + g.id);
          }
        }
      });

      // Damage Training Target
      if (trainingTargetRef.current) {
        const target = trainingTargetRef.current;
        if (target.hp > 0) {
          const dist = Math.hypot(target.x - b.x, target.y - b.y);
          if (dist < 40 + 10 && !b.damagedIds.has('training-target')) {
            target.hp -= b.damage;
            owner.damageDealt += b.damage;
            b.damagedIds.add('training-target');
            if (target.hp <= 0) {
              setTimeout(() => {
                if (trainingTargetRef.current) {
                  trainingTargetRef.current.hp = trainingTargetRef.current.maxHp;
                }
              }, 3000);
            }
          }
        }
      }
      
      return true;
    });

    // --- Draw ---
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background
    if (gameModeRef.current === 'shoot-n-shoot') {
      ctx.fillStyle = '#15803d'; // Football green
    } else if (gameModeRef.current === 'tech-hungry') {
      ctx.fillStyle = '#2e1065'; // Cyberpunk purple
    } else if (gameModeRef.current === 'super-zoner') {
      ctx.fillStyle = '#450a0a'; // Hellish dark red
    } else if (gameModeRef.current === 'payload-panic') {
      ctx.fillStyle = '#1a1614'; // Dark sand/earth
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Subtle sand texture
      ctx.fillStyle = '#241d1a';
      for (let i = 0; i < 200; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * CANVAS_WIDTH;
        const y = (Math.cos(i * 678.9) * 0.5 + 0.5) * CANVAS_HEIGHT;
        ctx.fillRect(x, y, 2, 2);
      }
    } else {
      ctx.fillStyle = '#0f172a'; // Classic dark
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid
    ctx.strokeStyle = gameModeRef.current === 'payload-panic' ? '#2d241e' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw Super Zoner Zone
    if (gameModeRef.current === 'super-zoner') {
      const zoneSize = 250;
      const zoneX = CANVAS_WIDTH / 2 - zoneSize / 2;
      const zoneY = CANVAS_HEIGHT / 2 - zoneSize / 2;
      
      // Hellish background effect for zone
      ctx.save();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)'; // Light yellow
      ctx.fillRect(zoneX, zoneY, zoneSize, zoneSize);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(zoneX, zoneY, zoneSize, zoneSize);
      
      // Hellish streaks
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const offset = (time / 20 + i * 25) % zoneSize;
        ctx.beginPath();
        ctx.moveTo(zoneX + offset, zoneY);
        ctx.lineTo(zoneX + offset, zoneY + zoneSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(zoneX, zoneY + offset);
        ctx.lineTo(zoneX + zoneSize, zoneY + offset);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Goals (Shoot n' Shoot)
    if (gameModeRef.current === 'shoot-n-shoot') {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 200, 40, 200);
      ctx.strokeRect(CANVAS_WIDTH - 40, 200, 40, 200);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 200, 40, 200);
      ctx.fillRect(CANVAS_WIDTH - 40, 200, 40, 200);
    }

    // Draw Walls
    walls.forEach((w) => {
      const baseColor = gameModeRef.current === 'tech-hungry' ? '#7c3aed' : (gameModeRef.current === 'payload-panic' ? '#3e2723' : '#334155');
      const borderColor = gameModeRef.current === 'tech-hungry' ? '#a78bfa' : (gameModeRef.current === 'payload-panic' ? '#1a1614' : '#475569');
      
      ctx.fillStyle = baseColor;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      
      // 3D Highlight for Payload Panic
      if (gameModeRef.current === 'payload-panic') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(w.x, w.y, w.w, 3);
        ctx.fillRect(w.x, w.y, 3, w.h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(w.x + w.w - 3, w.y, 3, w.h);
        ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
      }
      
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    // Draw Payload Tracks
    if (gameModeRef.current === 'payload-panic') {
      [PAYLOAD_TRACK_P1, PAYLOAD_TRACK_P2].forEach((track, idx) => {
        const color = idx === 0 ? '#3b82f6' : '#ef4444';
        ctx.save();
        
        // Main track bed
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 32;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(track[0].x, track[0].y);
        for (let i = 1; i < track.length; i++) {
          ctx.lineTo(track[i].x, track[i].y);
        }
        ctx.stroke();
        
        // Sleepers (Dashed line)
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#4b3621';
        ctx.lineWidth = 14;
        ctx.setLineDash([4, 12]);
        ctx.stroke();
        
        // Side rails
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();

        // Draw circles at nodes
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = color;
        track.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        ctx.restore();
      });

      // Draw Bases
      // Blue Base (Start at Top-Right)
      ctx.save();
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(880, 80, 40, 40);
      ctx.fillStyle = '#1a1614';
      ctx.beginPath();
      ctx.arc(880, 100, 15, Math.PI/2, -Math.PI/2);
      ctx.fill();
      ctx.restore();
      
      // Red Base (Start at Bottom-Left)
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(80, 480, 40, 40);
      ctx.fillStyle = '#1a1614';
      ctx.beginPath();
      ctx.arc(120, 500, 15, -Math.PI/2, Math.PI/2);
      ctx.fill();
      ctx.restore();

      // Draw Minecarts and Status
      playersRef.current.forEach(p => {
        const track = p.id === 1 ? PAYLOAD_TRACK_P1 : PAYLOAD_TRACK_P2;
        const pos = getPayloadPos(track, p.payloadProgress);
        const enemy = playersRef.current[p.id === 1 ? 1 : 0];
        
        const distToPayload = Math.hypot(p.x - pos.x, p.y - pos.y);
        const distEnemyToPayload = Math.hypot(enemy.x - pos.x, enemy.y - pos.y);
        const zoneRadius = 60;
        const isPlayerInZone = distToPayload < zoneRadius && !p.isDead && time >= p.stunnedUntil;
        const isEnemyInZone = distEnemyToPayload < zoneRadius && !enemy.isDead;

        // Draw Push Zone Circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, zoneRadius, 0, Math.PI * 2);
        
        const zoneColor = p.id === 1 ? '#3b82f6' : '#ef4444';
        ctx.fillStyle = `${zoneColor}1a`; // 10% opacity
        ctx.fill();
        
        ctx.strokeStyle = `${zoneColor}4d`; // 30% opacity
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        
        // Pulsing effect
        const pulse = Math.sin(time / 10) * 2;
        ctx.shadowBlur = 10 + pulse;
        ctx.shadowColor = zoneColor;
        
        ctx.stroke();
        ctx.restore();

        // Draw Minecart (Flip Blue as it now moves right-to-left)
        drawTrain(ctx, pos.x, pos.y, p.color, p.id === 1);
        
        // Status Indicators
        ctx.save();
        ctx.globalAlpha = 0.8;
        if (isPlayerInZone && isEnemyInZone) {
          // Contested: yellow X
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(pos.x - 30, pos.y - 30);
          ctx.lineTo(pos.x + 30, pos.y + 30);
          ctx.moveTo(pos.x + 30, pos.y - 30);
          ctx.lineTo(pos.x - 30, pos.y + 30);
          ctx.stroke();
        } else if (isPlayerInZone) {
          // Pushing: green arrow
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(pos.x - 20, pos.y - 30);
          ctx.lineTo(pos.x + 20, pos.y - 30);
          ctx.lineTo(pos.x, pos.y - 50);
          ctx.closePath();
          ctx.fill();
        } else {
          // Idle: red dot
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        
        // Progress Text
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(p.payloadProgress)}%`, pos.x, pos.y - 35);
      });
    }

    // Draw Aiming Line
    playersRef.current.forEach(p => {
      if (p.isAimingSuper && !p.isDead) {
        const s = SUPERS[p.superWeaponIndex];
        if (s.type === 'dash') {
          const dashSpeed = 12;
          const dashDuration = 300;
          const dashLength = dashSpeed * (dashDuration / 16.67);
          
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = PLAYER_SIZE;
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(p.angle) * dashLength, p.y + Math.sin(p.angle) * dashLength);
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // Draw Ball
    if (gameModeRef.current === 'shoot-n-shoot') {
      const b = ballRef.current;
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Draw Chips
    if (gameModeRef.current === 'tech-hungry') {
      // Draw Mine in center
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(CANVAS_WIDTH / 2 - 15, CANVAS_HEIGHT / 2 - 15, 30, 30);
      ctx.strokeStyle = '#c084fc';
      ctx.strokeRect(CANVAS_WIDTH / 2 - 15, CANVAS_HEIGHT / 2 - 15, 30, 30);

      chipsRef.current.forEach(chip => {
        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(chip.x, chip.y - 8);
        ctx.lineTo(chip.x + 8, chip.y);
        ctx.lineTo(chip.x, chip.y + 8);
        ctx.lineTo(chip.x - 8, chip.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.restore();
      });
    }

    // Draw Mines
    minesRef.current.forEach(m => {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Update Grenades
    grenadesRef.current = grenadesRef.current.filter(g => {
      if (time >= g.explodesAt) {
        playExplosionSound(soundMutedRef.current);
        explosionsRef.current.push({
          x: g.x,
          y: g.y,
          radius: 60,
          expiresAt: time + 300,
          id: Math.random().toString(),
          ownerId: g.ownerId,
          damage: g.damage,
          hasDamaged: false
        });
        return false;
      }
      return true;
    });

    // Update Explosions
    explosionsRef.current = explosionsRef.current.filter(e => {
      if (!e.hasDamaged) {
        // Damage players
        playersRef.current.forEach(p => {
          if (!p.isDead && p.id !== e.ownerId) {
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < e.radius + PLAYER_SIZE / 2) {
              applyDamageToPlayer(p, e.damage, time);
              playersRef.current[e.ownerId - 1].damageDealt += e.damage;
              
              if (p.hp <= 0) {
                handleKill(e.ownerId);
                resetPlayer(p.id, time);
              }
            }
          }
        });
        
        // Damage turrets/ghosts
        turretsRef.current.forEach(t => {
          if (t.ownerId !== e.ownerId) {
            const dist = Math.hypot(t.x - e.x, t.y - e.y);
            if (dist < e.radius + 20) {
              t.hp -= e.damage;
              playersRef.current[e.ownerId - 1].damageDealt += e.damage;
            }
          }
        });
        auraTurretsRef.current.forEach(t => {
          if (t.ownerId !== e.ownerId) {
            const dist = Math.hypot(t.x - e.x, t.y - e.y);
            if (dist < e.radius + 20) {
              t.hp -= e.damage;
              playersRef.current[e.ownerId - 1].damageDealt += e.damage;
            }
          }
        });
        boosterTurretsRef.current.forEach(t => {
          if (t.ownerId !== e.ownerId) {
            const dist = Math.hypot(t.x - e.x, t.y - e.y);
            if (dist < e.radius + 20) {
              t.hp -= e.damage;
              playersRef.current[e.ownerId - 1].damageDealt += e.damage;
            }
          }
        });
        ghostsRef.current.forEach(g => {
          if (g.ownerId !== e.ownerId) {
            const dist = Math.hypot(g.x - e.x, g.y - e.y);
            if (dist < e.radius + 15) {
              g.hp -= e.damage;
              playersRef.current[e.ownerId - 1].damageDealt += e.damage;
            }
          }
        });

        // Damage Training Target
        if (trainingTargetRef.current) {
          const target = trainingTargetRef.current;
          if (target.hp > 0) {
            const dist = Math.hypot(target.x - e.x, target.y - e.y);
            if (dist < e.radius + 40) {
              target.hp -= e.damage;
              playersRef.current[e.ownerId - 1].damageDealt += e.damage;
              if (target.hp <= 0) {
                setTimeout(() => {
                  if (trainingTargetRef.current) {
                    trainingTargetRef.current.hp = trainingTargetRef.current.maxHp;
                  }
                }, 3000);
              }
            }
          }
        }
        
        e.hasDamaged = true;
      }
      return time < e.expiresAt;
    });

    // Update Slowing Circles
    slowingCirclesRef.current = slowingCirclesRef.current.filter(c => time < c.expiresAt);

    // Draw Slowing Circles
    slowingCirclesRef.current.forEach(c => {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = c.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.restore();
    });

    // Draw Booster Turrets
    boosterTurretsRef.current.forEach(t => {
      const zoneRadius = 125;
      ctx.save();
      ctx.beginPath();
      ctx.arc(t.x, t.y, zoneRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.ownerId === 1 ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Health bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(t.x - 15, t.y - 25, 30, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(t.x - 15, t.y - 25, (t.hp / 7) * 30, 3);
    });

    // Draw Turrets
    turretsRef.current.forEach(t => {
      ctx.fillStyle = t.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.fillRect(t.x - 10, t.y - 10, 20, 20);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(t.x - 2, t.y - 15, 4, 15);
      
      // Health bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(t.x - 10, t.y - 20, 20, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(t.x - 10, t.y - 20, (t.hp / 5) * 20, 3);
    });

    // Draw Aura Turrets
    auraTurretsRef.current.forEach(t => {
      // Healing Zone
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = t.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 125, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = t.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.restore();

      // Turret Body
      ctx.fillStyle = t.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cross icon for healing
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.x - 6, t.y);
      ctx.lineTo(t.x + 6, t.y);
      ctx.moveTo(t.x, t.y - 6);
      ctx.lineTo(t.x, t.y + 6);
      ctx.stroke();
      
      // Health bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(t.x - 12, t.y - 22, 24, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(t.x - 12, t.y - 22, (t.hp / 7) * 24, 3);
    });

    // Draw Grenades
    grenadesRef.current.forEach(g => {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // Draw Explosions
    explosionsRef.current.forEach(e => {
      ctx.save();
      const progress = 1 - (e.expiresAt - time) / 300;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    });

    // Draw Ghosts
    ghostsRef.current.forEach(g => {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = g.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(g.x - 5, g.y - 5, 3, 0, Math.PI * 2);
      ctx.arc(g.x + 5, g.y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Health bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(g.x - 15, g.y - 25, 30, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(g.x - 15, g.y - 25, (g.hp / 5) * 30, 3);
    });

    bulletsRef.current.forEach((b) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      const angle = Math.atan2(b.vy, b.vx);
      ctx.rotate(angle);

      ctx.fillStyle = b.ownerId === 1 ? '#4ade80' : '#f87171';
      
      if (b.isLauncher) {
        // Pointed rocket shape
        ctx.beginPath();
        ctx.moveTo(10, 0); // Tip
        ctx.lineTo(-5, 6);
        ctx.lineTo(-8, 6);
        ctx.lineTo(-8, -6);
        ctx.lineTo(-5, -6);
        ctx.closePath();
        ctx.fill();
        
        // Internal detail (lighter line)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-5, 0);
        ctx.stroke();
      } else if (b.isMusic) {
        // Draw Music Note
        ctx.beginPath();
        ctx.arc(-2, 4, 4, 0, Math.PI * 2); // Note head
        ctx.fill();
        ctx.fillRect(2, -8, 2, 12); // Stem
        ctx.fillRect(2, -8, 6, 3); // Flag
      } else if (b.isArrow) {
        // Arrow shape
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();
        // Fletching
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 3);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw Boomerangs
    boomerangsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(time / 50); // Spin
      
      ctx.fillStyle = b.ownerId === 1 ? '#4ade80' : '#f87171';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      
      // V-shaped boomerang
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(15, -15);
      ctx.lineTo(20, -10);
      ctx.lineTo(5, 5);
      ctx.lineTo(20, 20);
      ctx.lineTo(15, 25);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Draw Training Target
    if (trainingTargetRef.current) {
      const target = trainingTargetRef.current;
      ctx.save();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(target.x, target.y, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(target.x, target.y, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(target.x, target.y, 10, 0, Math.PI * 2); ctx.stroke();
      
      const barWidth = 80;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(target.x - barWidth/2, target.y - 60, barWidth, 6);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(target.x - barWidth/2, target.y - 60, (target.hp / target.maxHp) * barWidth, 6);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(target.hp)} / ${target.maxHp}`, target.x, target.y - 65);
      ctx.restore();
    }

    playersRef.current.forEach((p) => {
      if (p.isDead) {
        const remaining = Math.ceil((p.respawnAt - time) / 1000);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`RESPAWNING IN ${remaining}S`, p.x, p.y);
        return;
      }

      // Dynamite Scope
      if (WEAPONS[p.mainWeaponIndex].type === 'dynamite') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 250, 0, Math.PI * 2);
        ctx.stroke();
        
        const scopeX = p.x + Math.cos(p.angle) * 250;
        const scopeY = p.y + Math.sin(p.angle) * 250;
        ctx.strokeStyle = p.id === 1 ? '#4ade80' : '#f87171';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(scopeX, scopeY, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Bow Aiming Line
      if (WEAPONS[p.mainWeaponIndex].type === 'bow' && p.isChargingBow) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.angle) * 400, p.y + Math.sin(p.angle) * 400);
        ctx.stroke();
        
        // Charge indicator
        const holdDuration = time - p.bowChargeStart;
        const chargeLevel = Math.min(8, Math.floor(holdDuration / 375) + 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LVL ${chargeLevel}`, p.x + Math.cos(p.angle) * 50, p.y + Math.sin(p.angle) * 50 - 10);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      // Immunity shield
      if (time < p.immunityUntil) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_SIZE * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Stun effect
      if (time < p.stunnedUntil) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.strokeRect(-PLAYER_SIZE/2-2, -PLAYER_SIZE/2-2, PLAYER_SIZE+4, PLAYER_SIZE+4);
      }

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-PLAYER_SIZE / 2 - 4, -PLAYER_SIZE / 3, 6, PLAYER_SIZE / 1.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE, 4);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(PLAYER_SIZE / 6, -PLAYER_SIZE / 6, 4, PLAYER_SIZE / 3);

      const weapon = time < p.drillActiveUntil ? { type: 'drill' } : WEAPONS[p.mainWeaponIndex];
      
      // Weapon Drawing
      ctx.fillStyle = '#f8fafc'; // Light color
      ctx.strokeStyle = '#1e293b'; // Dark border
      ctx.lineWidth = 1;

      if (weapon.type === 'rifle') {
        ctx.fillRect(PLAYER_SIZE / 3, -3, PLAYER_SIZE, 6);
        ctx.strokeRect(PLAYER_SIZE / 3, -3, PLAYER_SIZE, 6);
      } else if (weapon.type === 'pistol') {
        ctx.fillRect(PLAYER_SIZE / 3, -2, PLAYER_SIZE / 2, 4);
        ctx.strokeRect(PLAYER_SIZE / 3, -2, PLAYER_SIZE / 2, 4);
      } else if (weapon.type === 'knife') {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 3, -2);
        ctx.lineTo(PLAYER_SIZE / 3 + 15, 0);
        ctx.lineTo(PLAYER_SIZE / 3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (weapon.type === 'drill') {
        ctx.fillStyle = '#fef08a'; // Light yellow for drill
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 3, -5);
        ctx.lineTo(PLAYER_SIZE / 3 + 20, 0);
        ctx.lineTo(PLAYER_SIZE / 3, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (weapon.type === 'dynamite') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(PLAYER_SIZE / 3, -4, 10, 8);
        ctx.strokeRect(PLAYER_SIZE / 3, -4, 10, 8);
      } else if (weapon.type === 'laser') {
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(PLAYER_SIZE / 3, -2, PLAYER_SIZE, 4);
        ctx.strokeRect(PLAYER_SIZE / 3, -2, PLAYER_SIZE, 4);
      } else if (weapon.type === 'boomerang') {
        const hasOut = boomerangsRef.current.some(b => b.ownerId === p.id);
        const isBoomerangInHand = !hasOut;
        if (isBoomerangInHand) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(PLAYER_SIZE / 3, -10);
          ctx.lineTo(PLAYER_SIZE / 3 + 12, 0);
          ctx.lineTo(PLAYER_SIZE / 3, 10);
          ctx.stroke();
        }
      } else if (weapon.type === 'bow') {
        // Draw Bow
        ctx.strokeStyle = '#78350f'; // Brown wood
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(PLAYER_SIZE / 4, 0, 15, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        
        // Draw String
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 4, -15);
        
        const chargeOffset = p.isChargingBow ? Math.min(15, (time - p.bowChargeStart) / 25) : 0;
        ctx.lineTo(PLAYER_SIZE / 4 - chargeOffset, 0);
        ctx.lineTo(PLAYER_SIZE / 4, 15);
        ctx.stroke();

        // Draw Arrow if charging
        if (p.isChargingBow) {
          ctx.strokeStyle = '#d4d4d8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(PLAYER_SIZE / 4 - chargeOffset, 0);
          ctx.lineTo(PLAYER_SIZE / 4 - chargeOffset + 20, 0);
          ctx.stroke();
          // Arrow head
          ctx.fillStyle = '#d4d4d8';
          ctx.beginPath();
          ctx.moveTo(PLAYER_SIZE / 4 - chargeOffset + 20, 0);
          ctx.lineTo(PLAYER_SIZE / 4 - chargeOffset + 15, -3);
          ctx.lineTo(PLAYER_SIZE / 4 - chargeOffset + 15, 3);
          ctx.fill();
        }
      } else if (weapon.type === 'launcher') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(PLAYER_SIZE / 3, -5, PLAYER_SIZE * 0.8, 10);
        ctx.strokeRect(PLAYER_SIZE / 3, -5, PLAYER_SIZE * 0.8, 10);
        // Barrel detail
        ctx.fillStyle = '#334155';
        ctx.fillRect(PLAYER_SIZE / 3 + PLAYER_SIZE * 0.8 - 4, -6, 6, 12);
      } else if (weapon.type === 'thirusoolam') {
        // Draw Golden Trident
        ctx.strokeStyle = '#fbbf24'; // Gold
        ctx.fillStyle = '#fbbf24';
        ctx.lineWidth = 2;
        
        // Main shaft
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 3, 0);
        ctx.lineTo(PLAYER_SIZE / 3 + 12, 0);
        ctx.stroke();
        
        // Trident head base (curved)
        ctx.beginPath();
        ctx.arc(PLAYER_SIZE / 3 + 12, 0, 8, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        
        // 3 Prongs
        ctx.lineWidth = 2;
        // Center
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 3 + 12, 0);
        ctx.lineTo(PLAYER_SIZE / 3 + 25, 0);
        ctx.stroke();
        
        // Left
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 3 + 12 + 4, -7);
        ctx.lineTo(PLAYER_SIZE / 3 + 12 + 10, -7);
        ctx.stroke();
        
        // Right
        ctx.beginPath();
        ctx.moveTo(PLAYER_SIZE / 3 + 12 + 4, 7);
        ctx.lineTo(PLAYER_SIZE / 3 + 12 + 10, 7);
        ctx.stroke();
      } else if (weapon.type === 'ammunicion') {
        // Draw Guitar
        ctx.fillStyle = '#78350f'; // Brown body
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1;
        
        // Body (pear shape)
        ctx.beginPath();
        ctx.ellipse(PLAYER_SIZE / 3 + 10, 0, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Sound hole
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(PLAYER_SIZE / 3 + 10, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Neck
        ctx.fillStyle = '#451a03';
        ctx.fillRect(PLAYER_SIZE / 3 + 18, -2, 15, 4);
        ctx.strokeRect(PLAYER_SIZE / 3 + 18, -2, 15, 4);
        
        // Headstock
        ctx.fillStyle = '#78350f';
        ctx.fillRect(PLAYER_SIZE / 3 + 33, -3, 6, 6);
        ctx.strokeRect(PLAYER_SIZE / 3 + 33, -3, 6, 6);
      }
      ctx.restore();

      const barWidth = 40;
      const maxHp = getMaxHp(gameModeRef.current);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(p.x - barWidth / 2, p.y - PLAYER_SIZE - 15, barWidth, 6);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(p.x - barWidth / 2, p.y - PLAYER_SIZE - 15, (p.hp / maxHp) * barWidth, 6);
      
      if ((weapon.type === 'knife' || weapon.type === 'drill') && time - p.lastShot < 100) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = weapon.type === 'drill' ? 'rgba(254, 240, 138, 0.6)' : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (time < p.laserLingerUntil) {
        ctx.save();
        const alpha = (p.laserLingerUntil - time) / 300;
        ctx.strokeStyle = p.id === 1 ? `rgba(74, 222, 128, ${alpha})` : `rgba(248, 113, 113, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.angle) * 2000, p.y + Math.sin(p.angle) * 2000);
        ctx.stroke();
        
        // Inner white beam
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.angle) * 2000, p.y + Math.sin(p.angle) * 2000);
        ctx.stroke();
        ctx.restore();
      }

      if (time < p.thirusoolamLingerUntil) {
        ctx.save();
        const alpha = (p.thirusoolamLingerUntil - time) / 300;
        const range = WEAPONS.find(w => w.type === 'thirusoolam')?.range || 75;
        const walls = getWalls(gameModeRef.current);
        
        // Calculate actual range based on walls
        let actualRange = range;
        const cos = Math.cos(p.angle);
        const sin = Math.sin(p.angle);
        for (let d = 0; d < range; d += 5) {
          if (checkCollision(p.x + cos * d, p.y + sin * d, 2, walls)) {
            actualRange = d;
            break;
          }
        }

        // Legendary Gold color
        ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.lineWidth = 24; // Doubled width
        
        // Draw Single Thick Beam
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + cos * actualRange, p.y + sin * actualRange);
        ctx.stroke();
        
        // Inner white beam for center
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + cos * actualRange, p.y + sin * actualRange);
        ctx.stroke();
        
        ctx.restore();
      }
    });

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleShoot = (p: Player, weapon: any, time: number) => {
    const walls = getWalls(gameModeRef.current);
    if (p.heldBall) {
      ballRef.current.heldBy = null;
      p.heldBall = false;
      ballRef.current.vx = Math.cos(p.angle) * 15;
      ballRef.current.vy = Math.sin(p.angle) * 15;
      p.lastShot = time;
      return;
    }

    // Booster logic: check if player is inside any of their own booster turrets
    let damageMult = 1.0;
    let pitchMult = 1.0;
    const inBooster = boosterTurretsRef.current.some(t => {
      if (t.ownerId !== p.id) return false;
      const dist = Math.hypot(p.x - t.x, p.y - t.y);
      return dist < 125; // Same radius as aura
    });

    if (inBooster) {
      damageMult = 1.4;
      pitchMult = 1.3; // Noticeably higher pitch
    }

    if (weapon.isMelee) {
      playKnifeSound(soundMutedRef.current, pitchMult);
      playersRef.current.forEach(target => {
        if (target.id !== p.id && !target.isDead) {
          const dist = Math.hypot(target.x - p.x, target.y - p.y);
          if (dist < weapon.range + PLAYER_SIZE / 2) {
            if (time >= target.immunityUntil) {
              const finalDamage = weapon.damage * damageMult;
              applyDamageToPlayer(target, finalDamage, time);
              p.damageDealt += finalDamage;
            }
            if (target.hp <= 0) {
              handleKill(p.id);
              resetPlayer(target.id, time);
            }
          }
        }
      });

      // Hit Turrets/Ghosts/Auras with Melee
      turretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dist = Math.hypot(t.x - p.x, t.y - p.y);
          if (dist < weapon.range + 20) {
            const finalDamage = weapon.damage * damageMult;
            t.hp -= finalDamage;
            p.damageDealt += finalDamage;
          }
        }
      });
      auraTurretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dist = Math.hypot(t.x - p.x, t.y - p.y);
          if (dist < weapon.range + 20) {
            const finalDamage = weapon.damage * damageMult;
            t.hp -= finalDamage;
            p.damageDealt += finalDamage;
          }
        }
      });
      boosterTurretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dist = Math.hypot(t.x - p.x, t.y - p.y);
          if (dist < weapon.range + 20) {
            const finalDamage = weapon.damage * damageMult;
            t.hp -= finalDamage;
            p.damageDealt += finalDamage;
          }
        }
      });
      ghostsRef.current.forEach(g => {
        if (g.ownerId !== p.id) {
          const dist = Math.hypot(g.x - p.x, g.y - p.y);
          if (dist < weapon.range + 15) {
            const finalDamage = weapon.damage * damageMult;
            g.hp -= finalDamage;
            p.damageDealt += finalDamage;
          }
        }
      });

      // Hit Training Target with Melee
      if (trainingTargetRef.current) {
        const target = trainingTargetRef.current;
        const dist = Math.hypot(target.x - p.x, target.y - p.y);
        if (dist < weapon.range + 40) {
          const finalDamage = weapon.damage * damageMult;
          target.hp -= finalDamage;
          p.damageDealt += finalDamage;
          if (target.hp <= 0) {
            target.hp = target.maxHp;
            playPointSound(p.id, soundMutedRef.current);
          }
        }
      }
      p.lastShot = time;
    } else if (weapon.type === 'bow') {
      const spawnX = p.x + Math.cos(p.angle) * (PLAYER_SIZE / 2 + 5);
      const spawnY = p.y + Math.sin(p.angle) * (PLAYER_SIZE / 2 + 5);
      const speed = 10;
      
      bulletsRef.current.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(p.angle) * speed,
        vy: Math.sin(p.angle) * speed,
        ownerId: p.id,
        damage: weapon.damage * damageMult,
        range: weapon.range,
        startX: p.x,
        startY: p.y,
        isArrow: true,
        pitchMult,
        totalDist: 0,
      });
      p.lastShot = time;
    } else if (weapon.type === 'dynamite') {
      playDynamiteSound(soundMutedRef.current, pitchMult);
      const targetX = p.x + Math.cos(p.angle) * 250;
      const targetY = p.y + Math.sin(p.angle) * 250;
      
      grenadesRef.current.push({
        x: targetX,
        y: targetY,
        ownerId: p.id,
        explodesAt: time + 10,
        id: Math.random().toString(),
        damage: weapon.damage * damageMult,
        pitchMult,
      });
      p.lastShot = time;
    } else if (weapon.type === 'boomerang') {
      const hasOut = boomerangsRef.current.some(b => b.ownerId === p.id);
      if (!hasOut) {
        const speed = 7.2; // 10% slower than 8.0
        boomerangsRef.current.push({
          x: p.x + Math.cos(p.angle) * 20,
          y: p.y + Math.sin(p.angle) * 20,
          vx: Math.cos(p.angle) * speed,
          vy: Math.sin(p.angle) * speed,
          ownerId: p.id,
          damage: weapon.damage * damageMult,
          isReturning: false,
          id: Math.random().toString(),
          startX: p.x,
          startY: p.y,
          range: weapon.range,
          damagedIds: new Set(),
          pitchMult,
        });
        p.lastShot = time;
      }
    } else if (weapon.type === 'laser') {
      playLaserSound(soundMutedRef.current, pitchMult);
      p.laserShotUntil = time + 100;
      p.laserLingerUntil = time + 300;
      
      const angle = p.angle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const finalDamage = weapon.damage * damageMult;
      
      // Hit detection for Laser (Infinite range, passes through walls)
      playersRef.current.forEach(target => {
        if (target.id !== p.id && !target.isDead) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dot = dx * cos + dy * sin;
          if (dot > 0) { // In front
            const distToLine = Math.abs(dx * sin - dy * cos);
            if (distToLine < PLAYER_SIZE / 2 + 5) {
              if (time >= target.immunityUntil) {
                applyDamageToPlayer(target, finalDamage, time);
                p.damageDealt += finalDamage;
              }
              if (target.hp <= 0) {
                handleKill(p.id);
                resetPlayer(target.id, time);
              }
            }
          }
        }
      });

      // Hit Turrets/Ghosts/Auras with Laser
      turretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dot = dx * cos + dy * sin;
          if (dot > 0) {
            const distToLine = Math.abs(dx * sin - dy * cos);
            if (distToLine < 25) {
              t.hp -= finalDamage;
              p.damageDealt += finalDamage;
            }
          }
        }
      });
      auraTurretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dot = dx * cos + dy * sin;
          if (dot > 0) {
            const distToLine = Math.abs(dx * sin - dy * cos);
            if (distToLine < 25) {
              t.hp -= finalDamage;
              p.damageDealt += finalDamage;
            }
          }
        }
      });
      boosterTurretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dot = dx * cos + dy * sin;
          if (dot > 0) {
            const distToLine = Math.abs(dx * sin - dy * cos);
            if (distToLine < 25) {
              t.hp -= finalDamage;
              p.damageDealt += finalDamage;
            }
          }
        }
      });
      ghostsRef.current.forEach(g => {
        if (g.ownerId !== p.id) {
          const dx = g.x - p.x;
          const dy = g.y - p.y;
          const dot = dx * cos + dy * sin;
          if (dot > 0) {
            const distToLine = Math.abs(dx * sin - dy * cos);
            if (distToLine < 20) {
              g.hp -= finalDamage;
              p.damageDealt += finalDamage;
            }
          }
        }
      });

      // Hit Training Target with Laser
      if (trainingTargetRef.current) {
        const target = trainingTargetRef.current;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dot = dx * cos + dy * sin;
        if (dot > 0) {
          const distToLine = Math.abs(dx * sin - dy * cos);
          if (distToLine < 45) {
            target.hp -= finalDamage;
            p.damageDealt += finalDamage;
            if (target.hp <= 0) {
              target.hp = target.maxHp;
              playPointSound(p.id, soundMutedRef.current);
            }
          }
        }
      }
      p.lastShot = time;
    } else if (weapon.type === 'thirusoolam') {
      playThirusoolamSound(soundMutedRef.current, pitchMult);
      p.thirusoolamShotUntil = time + 100;
      p.thirusoolamLingerUntil = time + 300;
      
      const angle = p.angle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let range = weapon.range;
      const walls = getWalls(gameModeRef.current);
      const finalDamage = weapon.damage * damageMult;

      // Wall collision check for Thirusoolam (Stops at walls)
      for (let d = 0; d < range; d += 5) {
        if (checkCollision(p.x + cos * d, p.y + sin * d, 2, walls)) {
          range = d;
          break;
        }
      }

      let hits = 0;
      
      // Hit detection for Thirusoolam (Limited range, piercing)
      playersRef.current.forEach(target => {
        if (target.id !== p.id && !target.isDead) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= range + PLAYER_SIZE / 2) {
            const dot = dx * cos + dy * sin;
            if (dot > 0) { // In front
              const distToLine = Math.abs(dx * sin - dy * cos);
              if (distToLine < PLAYER_SIZE / 2 + 30) { // Doubled width
                if (time >= target.immunityUntil) {
                  applyDamageToPlayer(target, finalDamage, time);
                  p.damageDealt += finalDamage;
                  hits++;
                }
                if (target.hp <= 0) {
                  handleKill(p.id);
                  resetPlayer(target.id, time);
                }
              }
            }
          }
        }
      });

      // Hit Turrets/Ghosts/Auras
      turretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= range + 25) {
            const dot = dx * cos + dy * sin;
            if (dot > 0) {
              const distToLine = Math.abs(dx * sin - dy * cos);
              if (distToLine < 50) { // Doubled width
                t.hp -= finalDamage;
                p.damageDealt += finalDamage;
                hits++;
              }
            }
          }
        }
      });
      auraTurretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= range + 25) {
            const dot = dx * cos + dy * sin;
            if (dot > 0) {
              const distToLine = Math.abs(dx * sin - dy * cos);
              if (distToLine < 50) { // Doubled width
                t.hp -= finalDamage;
                p.damageDealt += finalDamage;
                hits++;
              }
            }
          }
        }
      });
      boosterTurretsRef.current.forEach(t => {
        if (t.ownerId !== p.id) {
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= range + 25) {
            const dot = dx * cos + dy * sin;
            if (dot > 0) {
              const distToLine = Math.abs(dx * sin - dy * cos);
              if (distToLine < 50) { // Doubled width
                t.hp -= finalDamage;
                p.damageDealt += finalDamage;
                hits++;
              }
            }
          }
        }
      });
      ghostsRef.current.forEach(g => {
        if (g.ownerId !== p.id) {
          const dx = g.x - p.x;
          const dy = g.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= range + 20) {
            const dot = dx * cos + dy * sin;
            if (dot > 0) {
              const distToLine = Math.abs(dx * sin - dy * cos);
              if (distToLine < 45) { // Doubled width
                g.hp -= finalDamage;
                p.damageDealt += finalDamage;
                hits++;
              }
            }
          }
        }
      });

      // Hit Training Target
      if (trainingTargetRef.current) {
        const target = trainingTargetRef.current;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= range + 45) {
          const dot = dx * cos + dy * sin;
          if (dot > 0) {
            const distToLine = Math.abs(dx * sin - dy * cos);
            if (distToLine < 80) { // Doubled width
              target.hp -= finalDamage;
              p.damageDealt += finalDamage;
              hits++;
              if (target.hp <= 0) {
                target.hp = target.maxHp;
                playPointSound(p.id, soundMutedRef.current);
              }
            }
          }
        }
      }

      // Healing logic: 1hp per target hit
      if (hits > 0) {
        const maxHp = getMaxHp(gameModeRef.current);
        p.hp = Math.min(maxHp, p.hp + hits);
        if (p.id === 1) setP1Hp(p.hp);
        else setP2Hp(p.hp);
      }

      p.lastShot = time;
    } else if (weapon.type === 'launcher') {
      const spawnX = p.x + Math.cos(p.angle) * (PLAYER_SIZE / 2 + 5);
      const spawnY = p.y + Math.sin(p.angle) * (PLAYER_SIZE / 2 + 5);
      const speed = 7.5; // 450px/s at 60fps
      
      bulletsRef.current.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(p.angle) * speed,
        vy: Math.sin(p.angle) * speed,
        ownerId: p.id,
        damage: weapon.damage * damageMult,
        range: weapon.range,
        startX: p.x,
        startY: p.y,
        isLauncher: true,
        pitchMult,
        totalDist: 0,
      });
      p.lastShot = time;
    } else if (weapon.type === 'ammunicion') {
      playAmmunicionSound(soundMutedRef.current, pitchMult);
      const spawnX = p.x + Math.cos(p.angle) * (PLAYER_SIZE / 2 + 5);
      const spawnY = p.y + Math.sin(p.angle) * (PLAYER_SIZE / 2 + 5);
      const speed = 7.3; // slightly slower than launcher (7.5)
      
      bulletsRef.current.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(p.angle) * speed,
        vy: Math.sin(p.angle) * speed,
        ownerId: p.id,
        damage: weapon.damage * damageMult,
        range: weapon.range,
        startX: p.x,
        startY: p.y,
        isMusic: true,
        bounces: 0,
        totalDist: 0,
      });
      p.lastShot = time;
    } else {
      if (weapon.type === 'pistol') playPistolSound(soundMutedRef.current, pitchMult);
      else playRifleSound(soundMutedRef.current, pitchMult);
      
      const spawnX = p.x + Math.cos(p.angle) * (PLAYER_SIZE / 2 + 5);
      const spawnY = p.y + Math.sin(p.angle) * (PLAYER_SIZE / 2 + 5);
      
      if (!checkCollision(spawnX, spawnY, 2, walls)) {
        bulletsRef.current.push({
          x: spawnX,
          y: spawnY,
          vx: Math.cos(p.angle) * BULLET_SPEED,
          vy: Math.sin(p.angle) * BULLET_SPEED,
          ownerId: p.id,
          damage: weapon.damage * damageMult,
          range: weapon.range,
          startX: p.x,
          startY: p.y,
          totalDist: 0,
        });
      }
      p.lastShot = time;
    }
  };

  const activateSuper = (p: Player, time: number) => {
    const s = SUPERS[p.superWeaponIndex];
    p.lastSuperAt = time;
    p.superCharge = 0;
    p.superReadyPlayed = false;
    
    if (s.type === 'mine') {
      playMineSound(soundMutedRef.current);
      // Limit to 3 mines per player
      const playerMines = minesRef.current.filter(m => m.ownerId === p.id);
      if (playerMines.length >= 3) {
        // Remove the oldest mine for this player
        const oldestMineIndex = minesRef.current.findIndex(m => m.ownerId === p.id);
        if (oldestMineIndex !== -1) {
          minesRef.current.splice(oldestMineIndex, 1);
        }
      }
      minesRef.current.push({ x: p.x, y: p.y, ownerId: p.id, id: Math.random().toString() });
    } else if (s.type === 'turret' || s.type === 'ghost') {
      // Spawnables (Ghosts, Turrets) - only one can exist on the field at a time per player.
      // Activating a super when one already exists, will make the old spawnable disappear.
      turretsRef.current = turretsRef.current.filter(t => t.ownerId !== p.id);
      ghostsRef.current = ghostsRef.current.filter(g => g.ownerId !== p.id);
      
      if (s.type === 'turret') {
        playTurretSound(soundMutedRef.current);
        turretsRef.current.push({ x: p.x, y: p.y, hp: s.health || 5, ownerId: p.id, lastShot: 0, id: Math.random().toString() });
      } else if (s.type === 'ghost') {
        playGhostSound(soundMutedRef.current);
        ghostsRef.current.push({ x: p.x, y: p.y, hp: s.health || 5, ownerId: p.id, id: Math.random().toString(), lastAngle: 0, pathTimer: 0 });
      }
    } else if (s.type === 'drill') {
      p.drillActiveUntil = time + (s.duration || 7000);
    } else if (s.type === 'poison') {
      playPoisonSound(soundMutedRef.current);
      slowingCirclesRef.current.push({ x: p.x, y: p.y, ownerId: p.id, expiresAt: time + (s.duration || 5000), id: Math.random().toString() });
    } else if (s.type === 'dash') {
      playDashSound(soundMutedRef.current);
      p.dashActiveUntil = time + 300;
      p.dashAngle = p.angle;
    } else if (s.type === 'regen') {
      playRegenSound(soundMutedRef.current);
      const maxHp = getMaxHp(gameModeRef.current);
      p.hp = Math.min(maxHp, p.hp + (s.heal || 5));
      if (p.id === 1) setP1Hp(p.hp);
      else setP2Hp(p.hp);
      // Visual feedback: brief blue flash or something?
      // For now just the HP update is enough as per request.
    } else if (s.type === 'aura') {
      playAuraHealSound(soundMutedRef.current);
      // Only one aura turret per player
      auraTurretsRef.current = auraTurretsRef.current.filter(t => t.ownerId !== p.id);
      auraTurretsRef.current.push({ x: p.x, y: p.y, hp: s.health || 7, ownerId: p.id, lastHeal: 0, id: Math.random().toString() });
    } else if (s.type === 'booster') {
      // Only one booster per player
      boosterTurretsRef.current = boosterTurretsRef.current.filter(t => t.ownerId !== p.id);
      boosterTurretsRef.current.push({ x: p.x, y: p.y, hp: s.health || 7, ownerId: p.id, id: Math.random().toString() });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      playersRef.current.forEach((p) => {
        const isP1 = p.id === 1;
        const p1Keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Digit1', 'KeyQ', 'KeyE', 'KeyR', 'Digit2', 'Digit3', 'Digit4'];
        const p2Keys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftRight', 'Digit0', 'KeyL', 'KeyE', 'KeyR'];
        
        if (isP1 && p1Keys.includes(e.code)) p.keys[e.code] = true;
        if (!isP1 && p2Keys.includes(e.code)) p.keys[e.code] = true;
      });
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      playersRef.current.forEach((p) => {
        const isP1 = p.id === 1;
        const p1Keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Digit1', 'KeyQ', 'KeyE', 'KeyR', 'Digit2', 'Digit3', 'Digit4'];
        const p2Keys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftRight', 'Digit0', 'KeyL', 'KeyE', 'KeyR'];
        
        if (isP1 && p1Keys.includes(e.code)) p.keys[e.code] = false;
        if (!isP1 && p2Keys.includes(e.code)) p.keys[e.code] = false;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(gameLoop);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    const resumeAudio = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          // Restart music if it was supposed to be playing
          if (gameState === 'playing') {
            startMusic('battle', musicMuted);
          } else {
            startMusic('menu', musicMuted);
          }
        });
      }
    };
    window.addEventListener('click', resumeAudio);
    return () => window.removeEventListener('click', resumeAudio);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      startMusic('battle', musicMuted);
    } else {
      startMusic('menu', musicMuted);
    }
  }, [gameState, musicMuted]);

  useEffect(() => {
    if (musicGain) {
      musicGain.gain.value = musicMuted ? 0 : 0.1;
    }
  }, [musicMuted]);

  const startGame = () => {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const isResumingTraining = isTraining && (view === 'loadout' || view === 'weapon-detail') && trainingTargetRef.current !== null;
    
    playDuelSound(soundMutedRef.current);
    
    if (!isResumingTraining) {
      playersRef.current[0].kills = 0;
      playersRef.current[1].kills = 0;
      playersRef.current[0].deaths = 0;
      playersRef.current[1].deaths = 0;
      playersRef.current[0].chipsCollected = 0;
      playersRef.current[1].chipsCollected = 0;
      playersRef.current[0].zonePoints = 0;
      playersRef.current[1].zonePoints = 0;
      playersRef.current[0].payloadProgress = 0;
      playersRef.current[1].payloadProgress = 0;
      playersRef.current[0].goalsScored = 0;
      playersRef.current[1].goalsScored = 0;
      playersRef.current[0].heldBall = false;
      playersRef.current[1].heldBall = false;
      playersRef.current[0].stunnedUntil = 0;
      playersRef.current[1].stunnedUntil = 0;
      playersRef.current[0].damageDealt = 0;
      playersRef.current[1].damageDealt = 0;
      playersRef.current[0].drillActiveUntil = 0;
      playersRef.current[1].drillActiveUntil = 0;
      playersRef.current[0].dashActiveUntil = 0;
      playersRef.current[1].dashActiveUntil = 0;
      playersRef.current[0].dashAngle = 0;
      playersRef.current[1].dashAngle = 0;
      
      setScores({ p1: 0, p2: 0 });
      lastTimeRef.current = 0;
      
      if (gameMode === 'gun-game') {
        playersRef.current[0].gunGameLevel = 0;
        playersRef.current[1].gunGameLevel = 0;
        matchTimeRef.current = 600;
        setTimeLeft(600);
      } else {
        matchTimeRef.current = MATCH_DURATION;
        setTimeLeft(MATCH_DURATION);
      }

      resetPlayer(1, performance.now(), true);
      resetPlayer(2, performance.now(), true);
      minesRef.current = [];
      turretsRef.current = [];
      ghostsRef.current = [];
      bulletsRef.current = [];
      slowingCirclesRef.current = [];
      grenadesRef.current = [];
      explosionsRef.current = [];
      boomerangsRef.current = [];
      ballRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0, heldBy: null };
      chipsRef.current = [];
      lastChipSpawnRef.current = 0;
      if (gameMode === 'training') {
        trainingTargetRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, hp: 150, maxHp: 150 };
      } else {
        trainingTargetRef.current = null;
      }
    }
    
    if (gameMode === 'gun-game') {
      playersRef.current[0].mainWeaponIndex = GUN_GAME_LOADOUTS[0].main;
      playersRef.current[0].superWeaponIndex = GUN_GAME_LOADOUTS[0].super;
      playersRef.current[1].mainWeaponIndex = GUN_GAME_LOADOUTS[0].main;
      playersRef.current[1].superWeaponIndex = GUN_GAME_LOADOUTS[0].super;
    } else {
      playersRef.current[0].mainWeaponIndex = p1Loadouts[p1ActiveSlot].main;
      playersRef.current[0].superWeaponIndex = p1Loadouts[p1ActiveSlot].super;
      playersRef.current[1].mainWeaponIndex = p2Loadouts[p2ActiveSlot].main;
      playersRef.current[1].superWeaponIndex = p2Loadouts[p2ActiveSlot].super;
    }
    
    setGameState('playing');
    window.focus();
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white overflow-hidden font-mono">
      <div className="scanline" />
      
      {/* Audio Controls */}
      <div className="absolute bottom-6 right-6 flex gap-2 z-50">
        <button 
          onClick={() => setMusicMuted(!musicMuted)}
          className={`p-3 rounded-full backdrop-blur-md border transition-all ${musicMuted ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'}`}
        >
          {musicMuted ? <Music size={20} className="opacity-50" /> : <Music size={20} />}
        </button>
        <button 
          onClick={() => setSoundMuted(!soundMuted)}
          className={`p-3 rounded-full backdrop-blur-md border transition-all ${soundMuted ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'}`}
        >
          {soundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-black/60 border-l-4 border-green-500 p-3 backdrop-blur-md">
              <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center rounded">
                <Shield className="text-green-500" size={24} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-green-500/70">Player 1</div>
                <div className="text-2xl font-bold font-display leading-none">
                  {gameMode === 'shoot-n-shoot' ? `${scores.p1} GOALS` : 
                   gameMode === 'tech-hungry' ? `${playersRef.current[0].chipsCollected} CHIPS` : 
                   gameMode === 'super-zoner' ? `${Math.floor(playersRef.current[0].zonePoints)} PTS` :
                   gameMode === 'gun-game' ? `LEVEL ${playersRef.current[0].gunGameLevel + 1}` :
                   `${scores.p1} KILLS`}
                </div>
              </div>
            </div>
            <div className="w-48 h-1.5 bg-green-900/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(p1Hp / getMaxHp(gameMode)) * 100}%` }}
              />
            </div>
            {/* Super Charge P1 */}
            <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${p1SuperCharge >= 1 ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-blue-500'}`}
                style={{ width: `${p1SuperCharge * 100}%` }}
              />
            </div>
            <div className="text-[8px] font-display text-white/50 uppercase flex gap-1">
              <span>Weapon:</span>
              <span style={{ color: playersRef.current[0].heldBall ? 'white' : RARITY_COLORS[WEAPONS[playersRef.current[0].mainWeaponIndex].rarity] }}>
                {playersRef.current[0].heldBall ? 'GOAL KICK' : WEAPONS[playersRef.current[0].mainWeaponIndex].name}
              </span>
              <span>| Super:</span>
              <span style={{ color: RARITY_COLORS[SUPERS[playersRef.current[0].superWeaponIndex].rarity] }}>
                {SUPERS[playersRef.current[0].superWeaponIndex].name}
              </span>
              {p1SuperCharge >= 1 && <span className="text-yellow-400 font-bold ml-1 animate-pulse">[READY - Q]</span>}
            </div>
          </div>

          {/* Center Timer / Training Exit */}
          <div className="flex flex-col items-center gap-2">
            {isTraining ? (
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => {
                    setGameState('menu');
                    setView('main');
                    setIsTraining(false);
                    resetRound(performance.now());
                    playSwitchSound(soundMutedRef.current);
                  }}
                  className="pointer-events-auto bg-red-600 hover:bg-red-500 text-white px-6 py-2 font-display font-bold text-sm tracking-widest rounded-sm border border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                >
                  EXIT TRAINING
                </button>
                <button 
                  onClick={() => { 
                    setIsEditingLoadout(true);
                    playSwitchSound(soundMutedRef.current); 
                  }}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-all rounded text-[10px] font-bold uppercase tracking-widest backdrop-blur-md"
                >
                  <RefreshCcw size={14} /> Edit Loadout
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="bg-black/80 px-6 py-2 border-b-2 border-white/20 backdrop-blur-md">
                  <div className="text-3xl font-bold font-mono tracking-tighter text-white">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-display">Match Time</div>
              </div>
            )}
            {isTraining && (
              <div className="bg-black/40 px-4 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-widest text-white/60 backdrop-blur-sm">
                Training Mode Active
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-3 bg-black/60 border-r-4 border-red-500 p-3 backdrop-blur-md text-right">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-red-500/70">Player 2</div>
                <div className="text-2xl font-bold font-display leading-none">
                  {gameMode === 'shoot-n-shoot' ? `${scores.p2} GOALS` : 
                   gameMode === 'tech-hungry' ? `${playersRef.current[1].chipsCollected} CHIPS` : 
                   gameMode === 'super-zoner' ? `${Math.floor(playersRef.current[1].zonePoints)} PTS` :
                   gameMode === 'gun-game' ? `LEVEL ${playersRef.current[1].gunGameLevel + 1}` :
                   `${scores.p2} KILLS`}
                </div>
              </div>
              <div className="w-10 h-10 bg-red-500/20 flex items-center justify-center rounded">
                <Shield className="text-red-500" size={24} />
              </div>
            </div>
            <div className="w-48 h-1.5 bg-red-900/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(p2Hp / getMaxHp(gameMode)) * 100}%` }}
              />
            </div>
            {/* Super Charge P2 */}
            <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${p2SuperCharge >= 1 ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-blue-500'}`}
                style={{ width: `${p2SuperCharge * 100}%` }}
              />
            </div>
            <div className="text-[8px] font-display text-white/50 uppercase flex gap-1 justify-end">
              <span>Weapon:</span>
              <span style={{ color: playersRef.current[1].heldBall ? 'white' : RARITY_COLORS[WEAPONS[playersRef.current[1].mainWeaponIndex].rarity] }}>
                {playersRef.current[1].heldBall ? 'GOAL KICK' : WEAPONS[playersRef.current[1].mainWeaponIndex].name}
              </span>
              <span>| Super:</span>
              <span style={{ color: RARITY_COLORS[SUPERS[playersRef.current[1].superWeaponIndex].rarity] }}>
                {SUPERS[playersRef.current[1].superWeaponIndex].name}
              </span>
              {p2SuperCharge >= 1 && <span className="text-yellow-400 font-bold ml-1 animate-pulse">[READY - L]</span>}
            </div>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <div className="relative border-4 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-sm"
        />
        
        {/* Overlays */}
        <AnimatePresence>
          {(gameState === 'menu' || isEditingLoadout) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col z-30 overflow-hidden"
            >
              {/* Top Navigation / Header */}
              <div className="w-full p-6 flex justify-end items-center border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                  {isEditingLoadout && (
                    <button
                      onClick={() => {
                        setIsEditingLoadout(false);
                        playSwitchSound(soundMutedRef.current);
                        // Update player weapon indices from loadouts
                        playersRef.current[0].mainWeaponIndex = p1Loadouts[0].main;
                        playersRef.current[0].superWeaponIndex = p1Loadouts[0].super;
                        playersRef.current[1].mainWeaponIndex = p2Loadouts[1].main;
                        playersRef.current[1].superWeaponIndex = p2Loadouts[1].super;
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded-sm font-display font-black italic tracking-widest text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                    >
                      RESUME TRAINING
                    </button>
                  )}
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Current Mode</div>
                    <div className="text-sm font-display font-bold text-red-500 uppercase italic tracking-tighter">
                      {gameMode.replace('-', ' ')}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setView('joystick'); playSwitchSound(soundMutedRef.current); }}
                    className={`p-3 rounded-sm border transition-all ${view === 'joystick' ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    <Gamepad2 size={20} />
                  </button>
                </div>
              </div>

              {/* View Content */}
              <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {view === 'main' && (
                    <motion.div
                      key="main"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-12"
                    >
                      <FightingIllustration />
                      <div className="mt-8 text-center max-w-2xl">
                        <h2 className="text-7xl font-display font-black italic tracking-tighter mb-4 text-white uppercase leading-none">
                          FRONTLINE <span className="text-red-600">DUEL</span>
                        </h2>
                        <p className="text-white/40 uppercase tracking-[0.4em] text-xs mb-12 italic font-bold">
                          Never mess with he who has nothing to lose.
                        </p>
                        
                        <button
                          onClick={() => {
                            setIsTraining(gameMode === 'training');
                            startGame(); // All selections pre-selected now
                            playStartSound(soundMutedRef.current);
                          }}
                          className="group relative px-24 py-6 bg-red-600 hover:bg-red-500 transition-all duration-300 rounded-sm overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.3)]"
                        >
                          <div className="relative z-10 flex items-center justify-center gap-4 font-display font-black text-3xl tracking-widest italic">
                            DUEL! <Zap size={32} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {view === 'loadout' && (
                    <motion.div
                      key="loadout"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
                    >
                      <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-end mb-12">
                          <div>
                            <h2 className="text-4xl font-display font-black italic tracking-tighter uppercase">Loadout Selection</h2>
                            <p className="text-white/40 uppercase tracking-widest text-xs mt-2">Slot 1 for Player 1, Slot 2 for Player 2</p>
                          </div>
                          {isEditingLoadout && (
                            <button
                              onClick={() => {
                                setIsEditingLoadout(false);
                                playSwitchSound(soundMutedRef.current);
                                playersRef.current[0].mainWeaponIndex = p1Loadouts[0].main;
                                playersRef.current[0].superWeaponIndex = p1Loadouts[0].super;
                                playersRef.current[1].mainWeaponIndex = p2Loadouts[1].main;
                                playersRef.current[1].superWeaponIndex = p2Loadouts[1].super;
                              }}
                              className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-sm font-display font-black italic tracking-widest text-lg shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                            >
                              RESUME TRAINING
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                          {/* Player 1 Loadout */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black font-black">1</div>
                              <h3 className="text-2xl font-display font-black italic uppercase tracking-tighter">Player 1</h3>
                            </div>
                            
                            <div 
                              onClick={() => setActiveWeaponDetail({ player: 1, type: 'main', slot: 0 })}
                              className="group relative bg-zinc-900/50 border-2 border-white/5 hover:border-green-500/50 p-6 rounded-sm transition-all cursor-pointer overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 p-4 text-[8px] text-white/20 font-bold uppercase tracking-widest">Main</div>
                              <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-20">
                                <WeaponVisual type="main" index={p1Loadouts[0].main} size={100} />
                              </div>
                              <div className="relative z-10">
                                <div className="text-2xl font-display font-black italic tracking-tighter uppercase mb-1" style={{ color: RARITY_COLORS[WEAPONS[p1Loadouts[0].main].rarity] }}>
                                  {WEAPONS[p1Loadouts[0].main].name}
                                </div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">
                                  {WEAPONS[p1Loadouts[0].main].rarity}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[7px] text-white/20 uppercase font-bold mb-0.5">Dmg</div>
                                    <div className="text-lg font-display font-bold">{WEAPONS[p1Loadouts[0].main].damage}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-white/20 uppercase font-bold mb-0.5">Reload</div>
                                    <div className="text-lg font-display font-bold">{WEAPONS[p1Loadouts[0].main].reload}ms</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div 
                              onClick={() => setActiveWeaponDetail({ player: 1, type: 'super', slot: 0 })}
                              className="group relative bg-zinc-900/50 border-2 border-white/5 hover:border-green-500/50 p-6 rounded-sm transition-all cursor-pointer overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 p-4 text-[8px] text-white/20 font-bold uppercase tracking-widest">Super</div>
                              <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-20">
                                <WeaponVisual type="super" index={p1Loadouts[0].super} size={100} />
                              </div>
                              <div className="relative z-10">
                                <div className="text-2xl font-display font-black italic tracking-tighter uppercase mb-1" style={{ color: RARITY_COLORS[SUPERS[p1Loadouts[0].super].rarity] }}>
                                  {SUPERS[p1Loadouts[0].super].name}
                                </div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">
                                  {SUPERS[p1Loadouts[0].super].rarity}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {SUPERS[p1Loadouts[0].super].stats.slice(0, 2).map((stat, i) => (
                                    <div key={i}>
                                      <div className="text-[7px] text-white/20 uppercase font-bold mb-0.5">{stat.label}</div>
                                      <div className="text-lg font-display font-bold">{stat.value}{stat.unit}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Player 2 Loadout */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4 justify-end">
                              <h3 className="text-2xl font-display font-black italic uppercase tracking-tighter">Player 2</h3>
                              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-black">2</div>
                            </div>

                            <div 
                              onClick={() => setActiveWeaponDetail({ player: 2, type: 'main', slot: 1 })}
                              className="group relative bg-zinc-900/50 border-2 border-white/5 hover:border-red-500/50 p-6 rounded-sm transition-all cursor-pointer overflow-hidden text-right"
                            >
                              <div className="absolute top-0 left-0 p-4 text-[8px] text-white/20 font-bold uppercase tracking-widest">Main</div>
                              <div className="absolute top-1/2 left-4 -translate-y-1/2 opacity-20">
                                <WeaponVisual type="main" index={p2Loadouts[1].main} size={100} />
                              </div>
                              <div className="relative z-10">
                                <div className="text-2xl font-display font-black italic tracking-tighter uppercase mb-1" style={{ color: RARITY_COLORS[WEAPONS[p2Loadouts[1].main].rarity] }}>
                                  {WEAPONS[p2Loadouts[1].main].name}
                                </div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">
                                  {WEAPONS[p2Loadouts[1].main].rarity}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[7px] text-white/20 uppercase font-bold mb-0.5">Dmg</div>
                                    <div className="text-lg font-display font-bold">{WEAPONS[p2Loadouts[1].main].damage}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-white/20 uppercase font-bold mb-0.5">Reload</div>
                                    <div className="text-lg font-display font-bold">{WEAPONS[p2Loadouts[1].main].reload}ms</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div 
                              onClick={() => setActiveWeaponDetail({ player: 2, type: 'super', slot: 1 })}
                              className="group relative bg-zinc-900/50 border-2 border-white/5 hover:border-red-500/50 p-6 rounded-sm transition-all cursor-pointer overflow-hidden text-right"
                            >
                              <div className="absolute top-0 left-0 p-4 text-[8px] text-white/20 font-bold uppercase tracking-widest">Super</div>
                              <div className="absolute top-1/2 left-4 -translate-y-1/2 opacity-20">
                                <WeaponVisual type="super" index={p2Loadouts[1].super} size={100} />
                              </div>
                              <div className="relative z-10">
                                <div className="text-2xl font-display font-black italic tracking-tighter uppercase mb-1" style={{ color: RARITY_COLORS[SUPERS[p2Loadouts[1].super].rarity] }}>
                                  {SUPERS[p2Loadouts[1].super].name}
                                </div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">
                                  {SUPERS[p2Loadouts[1].super].rarity}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {SUPERS[p2Loadouts[1].super].stats.slice(0, 2).map((stat, i) => (
                                    <div key={i}>
                                      <div className="text-[7px] text-white/20 uppercase font-bold mb-0.5">{stat.label}</div>
                                      <div className="text-lg font-display font-bold">{stat.value}{stat.unit}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {view === 'modes' && (
                    <motion.div
                      key="modes"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
                    >
                      <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-end mb-12">
                          <div>
                            <h2 className="text-4xl font-display font-black italic tracking-tighter uppercase">Game Modes</h2>
                            <p className="text-white/40 uppercase tracking-widest text-xs mt-2">Choose your battlefield</p>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex bg-white/5 p-1 rounded-sm border border-white/10">
                              {['CORE', 'PRACTICE'].map(tab => (
                                <button
                                  key={tab}
                                  onClick={() => { setModeTab(tab as any); playSwitchSound(soundMutedRef.current); }}
                                  className={`px-12 py-2 rounded-sm font-black text-sm transition-all tracking-widest ${modeTab === tab ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'text-white/40 hover:text-white/60'}`}
                                >
                                  {tab}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                          {(modeTab === 'CORE' 
                            ? (['classic', 'traditional-duel', 'shoot-n-shoot', 'tech-hungry', 'super-zoner', 'gun-game', 'payload-panic'] as GameMode[])
                            : (['training'] as GameMode[])
                          ).map(mode => {
                            const isSelected = gameMode === mode;
                            return (
                              <div 
                                key={mode}
                                onClick={() => { setGameMode(mode); playSwitchSound(soundMutedRef.current); }}
                                className={`group relative bg-zinc-900/50 border-2 p-6 rounded-sm transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-red-600 bg-red-600/5' : 'border-white/5 hover:border-white/20'}`}
                              >
                                <div className="relative z-10">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-sm ${isSelected ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40'}`}>
                                      {mode === 'classic' && <Trophy size={20} />}
                                      {mode === 'traditional-duel' && <Shield size={20} />}
                                      {mode === 'training' && <Gamepad2 size={20} />}
                                      {mode === 'shoot-n-shoot' && <Crosshair size={20} />}
                                      {mode === 'tech-hungry' && <Zap size={20} />}
                                      {mode === 'super-zoner' && <RefreshCcw size={20} />}
                                      {mode === 'gun-game' && <Zap size={20} />}
                                      {mode === 'payload-panic' && <Zap size={20} />}
                                    </div>
                                    {isSelected && <CheckCircle2 size={20} className="text-red-500" />}
                                  </div>
                                  <h3 className="text-xl font-display font-black italic uppercase tracking-tighter mb-2">{mode.replace('-', ' ')}</h3>
                                  <p className="text-[10px] text-white/40 leading-relaxed uppercase font-bold tracking-widest">
                                    {mode === 'classic' && 'Standard combat. First to 7 kills wins.'}
                                    {mode === 'traditional-duel' && 'One life. 100 HP. High stakes.'}
                                    {mode === 'training' && 'Practice your aim and movement.'}
                                    {mode === 'shoot-n-shoot' && 'Combat with a ball. Score goals to win.'}
                                    {mode === 'tech-hungry' && 'Collect chips to win. Fast paced.'}
                                    {mode === 'super-zoner' && 'Control the zone to earn points.'}
                                    {mode === 'gun-game' && 'Level up weapons with every kill.'}
                                    {mode === 'payload-panic' && 'Escort the payload to victory.'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {view === 'joystick' && (
                    <motion.div
                      key="joystick"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
                    >
                      <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-12">
                          <h2 className="text-4xl font-display font-black italic tracking-tighter uppercase">Joystick Controls</h2>
                          <button 
                            onClick={() => setView('main')}
                            className="px-6 py-2 bg-white/5 border border-white/10 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-white/10"
                          >
                            Close
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-12">
                          <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-sm">
                            <h3 className="text-green-500 font-bold mb-6 uppercase tracking-widest text-sm flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full" /> Player 1 Controls
                            </h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Movement</span>
                                <span className="font-mono font-bold text-white">W, A, S, D</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Aim / Rotate</span>
                                <span className="font-mono font-bold text-white">MOUSE</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Fire Weapon</span>
                                <span className="font-mono font-bold text-white">LEFT CLICK</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Super Ability</span>
                                <span className="font-mono font-bold text-white">SPACE</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-sm">
                            <h3 className="text-red-500 font-bold mb-6 uppercase tracking-widest text-sm flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full" /> Player 2 Controls
                            </h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Movement</span>
                                <span className="font-mono font-bold text-white">ARROW KEYS</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Aim / Rotate</span>
                                <span className="font-mono font-bold text-white">K, L (Rotate)</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Fire Weapon</span>
                                <span className="font-mono font-bold text-white">ENTER / P</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                                <span className="text-xs text-white/40 uppercase font-bold">Super Ability</span>
                                <span className="font-mono font-bold text-white">R-SHIFT / O</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Weapon Detail Modal */}
              <AnimatePresence>
                {activeWeaponDetail && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-12"
                  >
                    {/* Back Button - Top Left */}
                    <button 
                      onClick={() => setActiveWeaponDetail(null)}
                      className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-all font-bold uppercase tracking-widest text-xs group"
                    >
                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-red-500 group-hover:bg-red-500/10 transition-all">
                        <ChevronLeft size={16} />
                      </div>
                      Back to Loadout Selection
                    </button>

                    <div className="max-w-6xl w-full grid grid-cols-12 gap-12">
                      {/* Left Side: Stats & Info */}
                      <div className="col-span-4 flex flex-col justify-center">
                        <motion.div
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                        >
                          <div className="text-[10px] text-red-500 font-black uppercase tracking-[0.4em] mb-4">Weapon Specifications</div>
                          <h2 className="text-6xl font-display font-black italic tracking-tighter uppercase mb-2">
                            {activeWeaponDetail.type === 'main' 
                              ? WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].name
                              : SUPERS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].super : p2Loadouts[activeWeaponDetail.slot].super].name
                            }
                          </h2>
                          <div className="text-sm font-bold uppercase tracking-widest mb-8" style={{ color: RARITY_COLORS[activeWeaponDetail.type === 'main' ? WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].rarity : SUPERS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].super : p2Loadouts[activeWeaponDetail.slot].super].rarity] }}>
                            {activeWeaponDetail.type === 'main' ? WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].rarity : SUPERS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].super : p2Loadouts[activeWeaponDetail.slot].super].rarity} TIER
                          </div>
                          
                          <p className="text-white/60 text-sm leading-relaxed mb-12 uppercase font-bold tracking-tight">
                            {activeWeaponDetail.type === 'main' 
                              ? WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].description
                              : SUPERS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].super : p2Loadouts[activeWeaponDetail.slot].super].description
                            }
                          </p>

                          <div className="space-y-6">
                            {activeWeaponDetail.type === 'main' ? (
                              <>
                                <StatBar label="Damage" value={WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].damage} max={5} />
                                <StatBar label="Reload" value={WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].reload} max={1000} />
                                <StatBar label="Range" value={WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].range === Infinity ? 10 : WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].range / 100} max={10} />
                                <StatBar label="Move Speed" value={WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].moveSpeed} max={5} />
                                {WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].projSpeed && (
                                  <StatBar label="Proj Speed" value={WEAPONS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].main].projSpeed!} max={15} />
                                )}
                              </>
                            ) : (
                              <>
                                {SUPERS[activeWeaponDetail.player === 1 ? p1Loadouts[activeWeaponDetail.slot].super : p2Loadouts[activeWeaponDetail.slot].super].stats.map((stat, i) => (
                                  <div key={i}>
                                    <StatBar label={stat.label} value={stat.value} max={stat.max} />
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </motion.div>
                      </div>

                      {/* Center: Visual */}
                      <div className="col-span-5 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-red-600/5 rounded-full blur-3xl" />
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative z-10 w-full aspect-square flex items-center justify-center"
                        >
                          <div className="w-64 h-64 bg-zinc-800 rounded-full border-4 border-white/10 flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden">
                            <WeaponVisual 
                              type={activeWeaponDetail.type} 
                              index={activeWeaponDetail.player === 1 
                                ? (activeWeaponDetail.type === 'main' ? p1Loadouts[activeWeaponDetail.slot].main : p1Loadouts[activeWeaponDetail.slot].super)
                                : (activeWeaponDetail.type === 'main' ? p2Loadouts[activeWeaponDetail.slot].main : p2Loadouts[activeWeaponDetail.slot].super)
                              } 
                              size={200}
                            />
                          </div>
                        </motion.div>
                      </div>

                      {/* Right Side: Selection List */}
                      <div className="col-span-3 flex flex-col max-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Available Arsenal</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                          {(activeWeaponDetail.type === 'main' ? WEAPONS : SUPERS).map((item, idx) => {
                            const isEquipped = activeWeaponDetail.player === 1 
                              ? (activeWeaponDetail.type === 'main' ? p1Loadouts[activeWeaponDetail.slot].main === idx : p1Loadouts[activeWeaponDetail.slot].super === idx)
                              : (activeWeaponDetail.type === 'main' ? p2Loadouts[activeWeaponDetail.slot].main === idx : p2Loadouts[activeWeaponDetail.slot].super === idx);
                            
                            return (
                              <div 
                                key={idx}
                                onClick={() => {
                                  if (activeWeaponDetail.player === 1) {
                                    setP1Loadouts(prev => {
                                      const next = [...prev];
                                      if (activeWeaponDetail.type === 'main') next[activeWeaponDetail.slot].main = idx;
                                      else next[activeWeaponDetail.slot].super = idx;
                                      return next;
                                    });
                                  } else {
                                    setP2Loadouts(prev => {
                                      const next = [...prev];
                                      if (activeWeaponDetail.type === 'main') next[activeWeaponDetail.slot].main = idx;
                                      else next[activeWeaponDetail.slot].super = idx;
                                      return next;
                                    });
                                  }
                                  playSwitchSound(soundMutedRef.current);
                                }}
                                className={`p-4 rounded-sm border transition-all cursor-pointer flex justify-between items-center group ${isEquipped ? 'bg-red-600 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-black/20 rounded flex items-center justify-center overflow-hidden">
                                    <WeaponVisual type={activeWeaponDetail.type} index={idx} size={30} />
                                  </div>
                                  <div className="font-display font-bold uppercase italic text-sm">{item.name}</div>
                                </div>
                                {isEquipped ? (
                                  <div className="bg-white text-red-600 text-[8px] font-black px-2 py-1 rounded-sm">EQUIPPED</div>
                                ) : (
                                  <div className="text-white/20 text-[8px] font-black px-2 py-1 border border-white/10 rounded-sm group-hover:bg-white group-hover:text-black transition-all">EQUIP</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Navigation */}
              <div className="w-full h-24 bg-black border-t border-white/5 flex items-center justify-center gap-12 px-12 relative z-40">
                <NavButton 
                  active={view === 'main'} 
                  onClick={() => setView('main')} 
                  icon={<RefreshCcw size={20} />} 
                  label="Base" 
                />
                <NavButton 
                  active={view === 'loadout'} 
                  onClick={() => setView('loadout')} 
                  icon={<Crosshair size={20} />} 
                  label="Loadout" 
                />
                <NavButton 
                  active={view === 'modes'} 
                  onClick={() => setView('modes')} 
                  icon={<Trophy size={20} />} 
                  label="Modes" 
                />
              </div>
            </motion.div>
          )}

          {gameState === 'loadout' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
            >
              <div className="w-full max-w-6xl flex justify-start mb-4">
                <button 
                  onClick={() => { setGameState('menu'); playSwitchSound(soundMutedRef.current); }}
                  className="text-white/40 hover:text-white flex items-center gap-2 font-bold uppercase tracking-widest text-xs transition-all"
                >
                  <RefreshCcw size={16} /> Back to Base
                </button>
              </div>
              
              <div className="max-w-6xl w-full grid grid-cols-2 gap-8 pr-2">
                {/* P1 Loadout */}
                <div className="bg-zinc-900 border-2 border-green-500/30 p-8 rounded-xl h-fit">
                  <h2 className="text-2xl font-display font-bold text-green-500 mb-8 uppercase tracking-widest">Player 1 Loadout</h2>
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-3 block font-bold tracking-tighter">Main Weapon</label>
                      <div className="relative group">
                        <select 
                          value={p1Loadout.main}
                          onChange={(e) => { setP1Loadout(prev => ({ ...prev, main: parseInt(e.target.value) })); playSwitchSound(soundMutedRef.current); }}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none focus:border-green-500/50"
                          style={{ color: RARITY_COLORS[WEAPONS[p1Loadout.main].rarity] }}
                        >
                          {WEAPONS.map((w, i) => (
                            <option key={i} value={i} className="bg-zinc-900" style={{ color: RARITY_COLORS[w.rarity] }}>{w.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">▼</div>
                      </div>
                      <p className="mt-2 text-[10px] text-white/40 italic">{WEAPONS[p1Loadout.main].description}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-3 block font-bold tracking-tighter">Super Weapon</label>
                      <div className="relative group">
                        <select 
                          value={p1Loadout.super}
                          onChange={(e) => { setP1Loadout(prev => ({ ...prev, super: parseInt(e.target.value) })); playSwitchSound(soundMutedRef.current); }}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none focus:border-green-500/50"
                          style={{ color: RARITY_COLORS[SUPERS[p1Loadout.super].rarity] }}
                        >
                          {SUPERS.map((s, i) => (
                            <option key={i} value={i} className="bg-zinc-900" style={{ color: RARITY_COLORS[s.rarity] }}>{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">▼</div>
                      </div>
                      <p className="mt-2 text-[10px] text-white/40 italic">{SUPERS[p1Loadout.super].description}</p>
                    </div>
                  </div>
                </div>

                {/* P2 Loadout */}
                <div className="bg-zinc-900 border-2 border-red-500/30 p-8 rounded-xl h-fit">
                  <h2 className="text-2xl font-display font-bold text-red-500 mb-8 uppercase tracking-widest text-right">Player 2 Loadout</h2>
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-3 block text-right font-bold tracking-tighter">Main Weapon</label>
                      <div className="relative group">
                        <select 
                          value={p2Loadout.main}
                          onChange={(e) => { setP2Loadout(prev => ({ ...prev, main: parseInt(e.target.value) })); playSwitchSound(soundMutedRef.current); }}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none focus:border-red-500/50 text-right"
                          style={{ color: RARITY_COLORS[WEAPONS[p2Loadout.main].rarity] }}
                        >
                          {WEAPONS.map((w, i) => (
                            <option key={i} value={i} className="bg-zinc-900" style={{ color: RARITY_COLORS[w.rarity] }}>{w.name}</option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">▼</div>
                      </div>
                      <p className="mt-2 text-[10px] text-white/40 italic text-right">{WEAPONS[p2Loadout.main].description}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase mb-3 block text-right font-bold tracking-tighter">Super Weapon</label>
                      <div className="relative group">
                        <select 
                          value={p2Loadout.super}
                          onChange={(e) => { setP2Loadout(prev => ({ ...prev, super: parseInt(e.target.value) })); playSwitchSound(soundMutedRef.current); }}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded font-bold uppercase tracking-widest appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none focus:border-red-500/50 text-right"
                          style={{ color: RARITY_COLORS[SUPERS[p2Loadout.super].rarity] }}
                        >
                          {SUPERS.map((s, i) => (
                            <option key={i} value={i} className="bg-zinc-900" style={{ color: RARITY_COLORS[s.rarity] }}>{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">▼</div>
                      </div>
                      <p className="mt-2 text-[10px] text-white/40 italic text-right">{SUPERS[p2Loadout.super].description}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex justify-center mt-4">
                  <button 
                    onClick={startGame}
                    className="bg-white text-black font-black py-4 px-24 hover:bg-red-600 hover:text-white transition-all uppercase tracking-[0.5em] text-xl italic"
                  >
                    {isTraining ? 'Train!' : 'Duel!'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-40"
            >
              {winner !== 0 ? (
                <>
                  <Trophy className={winner === 1 ? 'text-green-500' : 'text-red-500'} size={80} />
                  <h2 className="text-5xl font-display font-bold mt-6 mb-2">
                    PLAYER {winner} VICTORIOUS
                  </h2>
                </>
              ) : (
                <>
                  <Shield className="text-white/40" size={80} />
                  <h2 className="text-5xl font-display font-bold mt-6 mb-2">
                    DRAW
                  </h2>
                </>
              )}
              <p className="text-white/40 uppercase tracking-widest mb-8">
                {winner !== 0 ? 'Enemy forces neutralized' : 'Stalemate reached'}
              </p>

              {/* Stats Screen */}
              <div className="grid grid-cols-2 gap-12 mb-12 w-full max-w-2xl">
                {[1, 2].map(id => {
                  const p = playersRef.current[id - 1];
                  return (
                    <div key={id} className={`p-6 bg-white/5 border-t-4 ${id === 1 ? 'border-green-500' : 'border-red-500'} rounded`}>
                      <div className="text-xs text-white/40 uppercase tracking-widest mb-4">Player {id} Stats</div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">KILLS</span>
                          <span className="font-bold text-white">{p.kills}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">DEATHS</span>
                          <span className="font-bold text-white">{p.deaths}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">DAMAGE</span>
                          <span className="font-bold text-white">{p.damageDealt.toFixed(1)}</span>
                        </div>
                        {gameMode === 'shoot-n-shoot' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">GOALS</span>
                            <span className="font-bold text-white">{p.goalsScored}</span>
                          </div>
                        )}
                        {gameMode === 'tech-hungry' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">CHIPS</span>
                            <span className="font-bold text-white">{p.chipsCollected}</span>
                          </div>
                        )}
                        {gameMode === 'super-zoner' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">POINTS</span>
                            <span className="font-bold text-white">{Math.floor(p.zonePoints)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsEditingLoadout(false);
                    setView('loadout');
                    setGameState('menu');
                  }}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-sm hover:bg-white/90 transition-colors"
                >
                  <RefreshCcw size={20} /> REMATCH
                </button>
                <button
                  onClick={() => {
                    setView('main');
                    setGameState('menu');
                  }}
                  className="px-8 py-3 border border-white/20 font-bold rounded-sm hover:bg-white/5 transition-colors"
                >
                  MAIN MENU
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Decoration */}
      <div className="mt-8 flex gap-12 text-[10px] text-white/20 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          System Active
        </div>
        <div>Sector 7-G / Urban Warfare</div>
        <div>Encrypted Link Established</div>
      </div>
    </div>
  );
}
