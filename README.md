# Frontline Duel

A fast-paced, top-down tactical arena shooter designed for two-player local multiplayer combat on a shared keyboard. Choose your loadout from a diverse arsenal of weapons and tactical Super abilities, enter the arena, and outmaneuver your opponent across multiple competitive game modes.

---

## Game Overview

In **Frontline Duel**, two players battle inside a high-contrast cyber arena featuring tight corridors, cover walls, and dynamic objectives:

- **Local 1v1 Combat**: Built specifically for side-by-side keyboard dueling with responsive movement, directional aiming, and strafing.
- **Customizable Loadouts**: Mix and match from 10 distinct primary weapons and 9 tactical Super abilities to define your combat archetype (agile assassin, heavy artillery, zone-denial trapper, or long-range sniper).
- **Gradual Super Meter**: Charges continuously during battle. When full, an unmistakable auditory and visual cue alerts both players that a Super is armed and ready to deploy.
- **Web Audio Soundscape**: Fully synthesized real-time audio generated via the browser Web Audio API, including firing effects, hit markers, dynamic battle music, and custom jingles.

---

## Game Modes

1. **Classic Duel**: The standard competitive deathmatch. First player to reach 7 kills (or highest kills when time expires) wins.
2. **Traditional Duel**: A rapid duel mode with 100 HP pools and instant respawns.
3. **Shoot-n-Shoot**: Ball-control sports mode. Contest the neutral energy orb and kick it into your opponent's goal net while under fire.
4. **Tech Hungry**: High-mobility scavenger mode. Race across the arena to collect 15 scattered data chips before your rival.
5. **Super Zoner**: King-of-the-hill territory control. Secure and hold the glowing active capture zone to rack up points.
6. **Gun Game**: Tiered escalation challenge. Every elimination automatically promotes you to the next weapon in the rotation.
7. **Payload Panic**: Tug-of-war objective escort. Stand near the payload to push it forward along the track toward the enemy base.
8. **Training Grounds**: Safe solo practice range featuring an interactive test dummy and on-the-fly loadout reconfiguration.

---

## Controls

Playable directly on a single shared keyboard:

| Action | Player 1 (Green) | Player 2 (Red) |
| :--- | :--- | :--- |
| **Move Forward / Backward** | `W` / `S` | `Up Arrow` / `Down Arrow` |
| **Turn Left / Right** | `A` / `D` | `Left Arrow` / `Right Arrow` |
| **Strafe (Sidestep)** | `Left Shift` + `A` / `D` | `Right Shift` + `Left` / `Right` |
| **Primary Fire / Action** | `1` (Digit 1) | `0` (Digit 0) |
| **Charge Bow / Kick Ball** | Hold & release `1` | Hold & release `0` |
| **Activate Super Ability** | `Q` | `L` |

> *Tip: For aimable supers (such as Dash), hold down the Super key to aim your trajectory line, then release to launch!*

---

## Weapons & Supers

### Primary Weapons
- **Pistol**: Semi-automatic sidearm with balanced projectile speed and infinite range.
- **Rifle**: High fire-rate assault rifle designed for sustained suppression.
- **Knife**: Agile melee blade that boosts base movement speed by 25%.
- **Dynamite**: High-arc explosive bundles with area-of-effect splash damage.
- **Laser**: High-damage piercing beam that ignores intermediate cover.
- **Boomerang**: Returning projectile that can strike an opponent on both outbound and return flight.
- **Launcher**: Heavy projectile that triggers a shockwave explosion at destination.
- **Bow & Arrow**: Chargeable weapon providing damage reduction while drawn and high velocity on release.
- **Thirusoolam**: Divine piercing trident that siphons health back on confirmed hits.
- **AMMUSICION**: Bouncing harmonic waves that ricochet off walls across long distances.

### Super Abilities
- **Mine**: Deploys cloaked proximity charges that detonate when stepped on.
- **Turret**: Automated sentry that acquires and fires upon enemy targets.
- **Ghost**: Autonomous homing malware spirit that stalks, stuns, and damages opponents.
- **Drill**: Temporary high-speed melee mode that shreds nearby enemies.
- **Poison**: Toxic slowing circle that restricts enemy movement and applies damage over time.
- **Dash**: High-velocity thrust in the facing direction that deals impact damage and stuns.
- **Regen**: Instant field repair restoring 5 HP immediately.
- **Aura**: Deploys a stationary healing station that repairs allies within its radius.
- **Booster**: Deploys a station enhancing outgoing weapon damage by 40%.

---

## Local Setup Instructions

Follow these steps to run the game locally on your machine:

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ LTS recommended)
- **npm** (comes bundled with Node.js) or any modern package manager (`pnpm`, `yarn`, `bun`)

### 1. Clone or Download the Repository
```bash
git clone <repository-url>
cd frontline-duel
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000` (or the address printed in your terminal). Open that URL in any modern desktop browser (Chrome, Firefox, Edge, Safari).

### 4. Build for Production
To generate a compiled and optimized production bundle:
```bash
npm run build
```
The output files will be created in the `dist/` directory.

### 5. Preview the Production Build
To test the generated production bundle locally:
```bash
npm run preview
```

---

## Available Scripts

- `npm run dev`: Starts the local Vite development server on port 3000.
- `npm run build`: Compiles TypeScript and creates the production distribution bundle.
- `npm run preview`: Spins up a local server to preview the built `dist` directory.
- `npm run lint`: Runs the TypeScript compiler (`tsc --noEmit`) to validate type safety.
- `npm run clean`: Cleans up the `dist` directory.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS
- **Animations**: Motion (`motion/react`)
- **Icons**: Lucide React
- **Audio Engine**: Web Audio API (Synthesized oscillators and procedural sound FX)
- **Graphics**: HTML5 2D Canvas rendering engine with custom collision detection
