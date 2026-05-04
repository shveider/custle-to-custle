name: Change Battlefield Width
description: Change the battlefield width across JS config and CSS styles. Updates 4 values in 2 files. Use when the user asks to resize the battlefield, change field width, or adjust map size.

---

## Instructions

To change the battlefield width, update these **4 values in 2 files**:

### 1. `js/main.js` — Game config (line ~33)

```js
const GAME_CONFIG = {
    battlefieldWidth: W,        // ← total field width in pixels
    // ...
    aiCastleX: W - 40,          // ← must equal battlefieldWidth - aiCastleXOffset (40)
    // ...
};
```

- `battlefieldWidth` — the primary value. Controls the logical game world size.
- `aiCastleX` — derived value: `battlefieldWidth - aiCastleXOffset` (which is `40`). Must be updated to match.
  - Note: `startGame()` at line ~161 also computes `aiCastleX` dynamically via `GAME_CONFIG.battlefieldWidth - GAME_CONFIG.aiCastleXOffset`, so the hardcoded `aiCastleX` in `GAME_CONFIG` is unused but should be kept consistent for clarity.

### 2. `css/styles.css` — Visual container (line ~24 and ~117)

```css
#game {
    max-width: (W + 200)px;     /* ← battlefieldWidth + 200px buffer */
}

#field {
    min-width: W px;            /* ← must match battlefieldWidth exactly */
}
```

- `#field min-width` — must **exactly match** `battlefieldWidth` in pixels.
- `#game max-width` — should be `battlefieldWidth + 200px` to allow slight overflow without clipping the game container.

### Quick formula

```
battlefieldWidth = W
aiCastleX        = W - 40
#field min-width = W px
#game max-width  = (W + 200) px
```

### Checklist when changing

1. [ ] `js/main.js` → `battlefieldWidth`
2. [ ] `js/main.js` → `aiCastleX` (= battlefieldWidth - 40)
3. [ ] `css/styles.css` → `#field min-width`
4. [ ] `css/styles.css` → `#game max-width`

### What auto-adjusts (DO NOT touch these)

All other code references `this.game.config.battlefieldWidth` dynamically and will adapt automatically:

| File | Usage |
|------|-------|
| `js/core/GameEngine.js:89` | Castle creation uses `cfg.battlefieldWidth - cfg.aiCastleXOffset` |
| `js/ai/AIManager.js:98,124,182,195` | Boundary checks use `this.game.config.battlefieldWidth` |
| `js/fx/FXSystem.js:57` | Projectile out-of-bounds uses `this.game.config.battlefieldWidth` |
| `js/entities/Projectile.js:37` | `isOutOfBounds(battlefieldWidth)` receives it as a param |
| `js/main.js:161` | `aiCastleX` computed dynamically as `battlefieldWidth - aiCastleXOffset` |
