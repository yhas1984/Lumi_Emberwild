import Phaser from "phaser";
import { rgba } from "./math";

type CanvasDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: CanvasDraw): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) {
    return;
  }
  const ctx = tex.getContext();
  if (!ctx) {
    return;
  }
  draw(ctx, w, h);
  tex.refresh();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function triangle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, stroke: string | CanvasGradient, width: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

// Browser-compatible rounded rectangle path (no ctx.roundRect dependency).
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function glowCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: number, core: string): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, core);
  g.addColorStop(0.45, rgba(color, 0.85));
  g.addColorStop(1, rgba(color, 0));
  circle(ctx, cx, cy, r, g);
}

function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, spread: number, size: number, pupil: string): void {
  circle(ctx, x - spread, y, size, "#ffffff");
  circle(ctx, x + spread, y, size, "#ffffff");
  circle(ctx, x - spread, y, size * 0.55, pupil);
  circle(ctx, x + spread, y, size * 0.55, pupil);
}

function drawShadowTexture(scene: Phaser.Scene): void {
  makeTexture(scene, "shadow", 72, 36, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,0.38)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    circle(ctx, w / 2, h / 2, w / 2, g);
  });
}

function drawGround(scene: Phaser.Scene): void {
  makeTexture(scene, "ground_tile", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#1d2a45";
    ctx.fillRect(0, 0, w, h);
    const patches: Array<[number, number, number, number]> = [
      [18, 22, 30, 0.22],
      [86, 34, 26, 0.18],
      [40, 84, 34, 0.2],
      [100, 96, 24, 0.16],
      [64, 60, 20, 0.14],
      [12, 110, 22, 0.18],
      [116, 14, 18, 0.16],
    ];
    for (const [px, py, pr, pa] of patches) {
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, "rgba(120,150,210," + pa + ")");
      g.addColorStop(1, "rgba(120,150,210,0)");
      circle(ctx, px, py, pr, g);
    }
  });
}

function drawLumi(scene: Phaser.Scene): void {
  makeTexture(scene, "lumi", 72, 72, (ctx, w, h) => {
    const c = w / 2;
    glowCircle(ctx, c, c, 34, 0xffc94d, "rgba(255,255,255,0.95)");
    const g = ctx.createRadialGradient(c, c, 0, c, c, 16);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#ffd76b");
    circle(ctx, c, c, 15, g);
    circle(ctx, c - 5, c - 4, 2.6, "#3a2c14");
    circle(ctx, c + 5, c - 4, 2.6, "#3a2c14");
    ctx.fillStyle = "#ff9d5c";
    ctx.beginPath();
    ctx.arc(c, c + 3, 3.4, 0.15, Math.PI - 0.15);
    ctx.fill();
  });
}

function drawEnemies(scene: Phaser.Scene): void {
  const defs: Record<string, { radius: number; draw: (ctx: CanvasRenderingContext2D, c: number, r: number) => void }> = {
    slime: {
      radius: 22,
      draw: (ctx, c, r) => {
        ellipse(ctx, c, c + 3, r * 1.05, r * 0.85, "#4ecb6f");
        ellipse(ctx, c - r * 0.35, c - r * 0.4, r * 0.4, r * 0.28, "rgba(255,255,255,0.3)");
        drawEyes(ctx, c, c + 2, r * 0.42, r * 0.2, "#1c5c33");
      },
    },
    bat: {
      radius: 20,
      draw: (ctx, c, r) => {
        ellipse(ctx, c - r * 1.25, c + r * 0.15, r * 0.55, r * 0.32, "#7a4fd0");
        ellipse(ctx, c + r * 1.25, c + r * 0.15, r * 0.55, r * 0.32, "#7a4fd0");
        circle(ctx, c, c, r * 0.85, "#8b5cf6");
        triangle(ctx, c - r * 0.6, c - r * 0.55, c - r * 0.3, c - r * 1.15, c, c - r * 0.55, "#5b3aa8");
        triangle(ctx, c + r * 0.6, c - r * 0.55, c + r * 0.3, c - r * 1.15, c, c - r * 0.55, "#5b3aa8");
        drawEyes(ctx, c, c + 1, r * 0.32, r * 0.18, "#2c1658");
      },
    },
    spider: {
      radius: 20,
      draw: (ctx, c, r) => {
        const leg = "#2c2c3d";
        for (let i = 0; i < 4; i++) {
          const a = -0.9 + i * 0.45;
          line(ctx, c, c, c + Math.cos(a) * r * 1.7, c + Math.sin(a) * r * 1.7, leg, 3);
          line(ctx, c, c, c - Math.cos(a) * r * 1.7, c + Math.sin(a) * r * 1.7, leg, 3);
        }
        circle(ctx, c, c, r * 0.9, "#3c3c4d");
        circle(ctx, c, c + r * 0.5, r * 0.45, "#31313f");
        drawEyes(ctx, c, c - r * 0.15, r * 0.28, r * 0.16, "#ff4d6d");
      },
    },
    wolf: {
      radius: 24,
      draw: (ctx, c, r) => {
        circle(ctx, c, c + 2, r * 0.92, "#8b8f9e");
        triangle(ctx, c - r * 0.75, c - r * 0.55, c - r * 0.5, c - r * 1.2, c - r * 0.15, c - r * 0.6, "#6e7280");
        triangle(ctx, c + r * 0.75, c - r * 0.55, c + r * 0.5, c - r * 1.2, c + r * 0.15, c - r * 0.6, "#6e7280");
        ellipse(ctx, c, c + r * 0.75, r * 0.5, r * 0.35, "#a9adba");
        ellipse(ctx, c - r * 0.38, c - r * 0.25, r * 0.16, r * 0.12, "#ffffff");
        ellipse(ctx, c + r * 0.38, c - r * 0.25, r * 0.16, r * 0.12, "#ffffff");
        circle(ctx, c - r * 0.38, c - r * 0.25, r * 0.08, "#22242c");
        circle(ctx, c + r * 0.38, c - r * 0.25, r * 0.08, "#22242c");
      },
    },
    spitter: {
      radius: 18,
      draw: (ctx, c, r) => {
        circle(ctx, c, c, r, "#6bd6a0");
        ellipse(ctx, c - r * 0.3, c - r * 0.35, r * 0.35, r * 0.22, "rgba(255,255,255,0.35)");
        drawEyes(ctx, c, c - r * 0.1, r * 0.3, r * 0.18, "#1c5c33");
        ctx.strokeStyle = "#2f8a63";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c + r * 0.45, r * 0.28, 0.1, Math.PI - 0.1);
        ctx.stroke();
      },
    },
    mimic: {
      radius: 14,
      draw: (ctx, c, r) => {
        circle(ctx, c, c, r, "#7a6f9e");
        ellipse(ctx, c - r * 0.3, c - r * 0.4, r * 0.4, r * 0.28, "rgba(255,255,255,0.3)");
        circle(ctx, c - r * 0.4, c - r * 0.15, r * 0.3, "#ffffff");
        circle(ctx, c + r * 0.4, c - r * 0.15, r * 0.3, "#ffffff");
        circle(ctx, c - r * 0.4, c - r * 0.15, r * 0.16, "#2a2140");
        circle(ctx, c + r * 0.4, c - r * 0.15, r * 0.16, "#2a2140");
        ctx.strokeStyle = "#4c4468";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c + r * 0.5, r * 0.3, 0.15, Math.PI - 0.15);
        ctx.stroke();
      },
    },
  };

  for (const key of Object.keys(defs)) {
    const def = defs[key];
    const size = def.radius * 2 + 12;
    makeTexture(scene, "enemy_" + key, size, size, (ctx, w, h) => {
      def.draw(ctx, w / 2, def.radius);
    });
    // Elite variant: golden ring + glow
    makeTexture(scene, "enemy_" + key + "_elite", size + 16, size + 16, (ctx, w, h) => {
      const c = w / 2;
      def.draw(ctx, c, def.radius);
      ctx.strokeStyle = "rgba(255,200,80,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(c, c, def.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,200,80,0.25)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(c, c, def.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

function drawGolem(scene: Phaser.Scene): void {
  makeTexture(scene, "boss_golem", 150, 150, (ctx, w, h) => {
    const c = w / 2;
    const r = 62;
    const g = ctx.createRadialGradient(c - 12, c - 14, 10, c, c, r * 1.4);
    g.addColorStop(0, "#6b7280");
    g.addColorStop(0.6, "#4b5563");
    g.addColorStop(1, "#374151");
    ctx.fillStyle = g;
    ctx.beginPath();
    const rr = 34;
    ctx.moveTo(c - r, c - r + rr);
    ctx.arcTo(c - r, c - r, c + r, c - r, rr);
    ctx.arcTo(c + r, c - r, c + r, c + r, rr);
    ctx.arcTo(c + r, c + r, c - r, c + r, rr);
    ctx.arcTo(c - r, c + r, c - r, c - r, rr);
    ctx.closePath();
    ctx.fill();
    // cracks
    ctx.strokeStyle = "rgba(20,22,28,0.55)";
    ctx.lineWidth = 3;
    line(ctx, c - 26, c - 12, c - 8, c + 10, "rgba(20,22,28,0.55)", 3);
    line(ctx, c - 8, c + 10, c - 18, c + 28, "rgba(20,22,28,0.55)", 3);
    line(ctx, c + 14, c - 26, c + 6, c - 8, "rgba(20,22,28,0.55)", 3);
    // eyes + core
    glowCircle(ctx, c - 18, c - 12, 12, 0xff6b35, "rgba(255,180,120,0.95)");
    glowCircle(ctx, c + 18, c - 12, 12, 0xff6b35, "rgba(255,180,120,0.95)");
    glowCircle(ctx, c, c + 26, 14, 0xffd76b, "rgba(255,240,180,0.95)");
  });
}

function drawProjectiles(scene: Phaser.Scene): void {
  makeTexture(scene, "proj_player", 26, 26, (ctx, w, h) => {
    glowCircle(ctx, w / 2, h / 2, 12, 0xffb02e, "rgba(255,255,235,0.98)");
  });
  makeTexture(scene, "proj_enemy", 20, 20, (ctx, w, h) => {
    glowCircle(ctx, w / 2, h / 2, 9, 0xb14dff, "rgba(255,200,255,0.9)");
  });
  makeTexture(scene, "blade", 34, 14, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, "rgba(140,255,230,0)");
    g.addColorStop(0.4, "rgba(140,255,230,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0.98)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(0, -h / 2, w / 2, 0);
    ctx.quadraticCurveTo(0, h / 2, -w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawPickups(scene: Phaser.Scene): void {
  makeTexture(scene, "xp_gem", 24, 24, (ctx, w, h) => {
    const c = w / 2;
    glowCircle(ctx, c, c, 11, 0x38d9ff, "rgba(220,250,255,0.98)");
    ctx.fillStyle = "#b8f4ff";
    ctx.beginPath();
    ctx.moveTo(c, c - 6);
    ctx.lineTo(c + 4.5, c);
    ctx.lineTo(c, c + 6);
    ctx.lineTo(c - 4.5, c);
    ctx.closePath();
    ctx.fill();
  });
  makeTexture(scene, "coin", 26, 26, (ctx, w, h) => {
    const c = w / 2;
    circle(ctx, c, c, 11, "#b8860b");
    const g = ctx.createRadialGradient(c - 3, c - 4, 2, c, c, 11);
    g.addColorStop(0, "#ffe28a");
    g.addColorStop(1, "#f5b93a");
    circle(ctx, c, c, 9, g);
    ctx.strokeStyle = "rgba(255,240,190,0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(c, c, 6, 0.2, 2.4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(150,110,20,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, 10.5, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawChests(scene: Phaser.Scene): void {
  const chests: Record<string, { body: string; lid: string; glow?: [number, number] }> = {
    wooden: { body: "#8a5a33", lid: "#a06a3c" },
    silver: { body: "#9aa3b5", lid: "#b6bfd1" },
    gold: { body: "#d99a2b", lid: "#f0b73f" },
    mythic: { body: "#7b3fbf", lid: "#9a5fe0", glow: [0xff6bff, 40] },
  };
  for (const key of Object.keys(chests)) {
    const def = chests[key];
    const size = 84;
    makeTexture(scene, "chest_" + key, size, size, (ctx, w, h) => {
      const c = w / 2;
      if (def.glow) {
        glowCircle(ctx, c, h / 2, def.glow[1], 0xff4dff, "rgba(255,180,255,0.5)");
      }
      const bx = c - 26;
      const by = h / 2 - 6;
      ctx.fillStyle = def.body;
      roundRectPath(ctx, bx, by, 52, 34, 6);
      ctx.fill();
      ctx.fillStyle = def.lid;
      roundRectPath(ctx, bx - 2, by - 10, 56, 16, 8);
      ctx.fill();
      // lock
      circle(ctx, c, by + 4, 6, "#f7d774");
      circle(ctx, c, by + 4, 3, "#7a5a18");
      // shine
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      roundRectPath(ctx, bx + 6, by + 4, 10, 6, 3);
      ctx.fill();
    });
  }
}

function drawEgg(scene: Phaser.Scene): void {
  makeTexture(scene, "egg", 44, 56, (ctx, w, h) => {
    ctx.fillStyle = "#f2ddc4";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 17, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(w / 2 - 5, h / 2 - 8, 6, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b88fd8";
    circle(ctx, w / 2 - 6, h / 2 + 2, 3, "#b88fd8");
    circle(ctx, w / 2 + 8, h / 2 - 6, 2.4, "#b88fd8");
    circle(ctx, w / 2 + 2, h / 2 + 12, 2, "#b88fd8");
  });
}

function drawGem(scene: Phaser.Scene): void {
  makeTexture(scene, "gem", 26, 26, (ctx, w, h) => {
    const c = w / 2;
    ctx.fillStyle = "#5ee0f5";
    ctx.beginPath();
    ctx.moveTo(c, 2);
    ctx.lineTo(24, c);
    ctx.lineTo(c, 24);
    ctx.lineTo(2, c);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(c, 4);
    ctx.lineTo(20, c);
    ctx.lineTo(c, 13);
    ctx.lineTo(6, c);
    ctx.closePath();
    ctx.fill();
  });
}

function drawUi(scene: Phaser.Scene): void {
  makeTexture(scene, "particle", 8, 8, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    circle(ctx, w / 2, h / 2, w / 2, g);
  });
  makeTexture(scene, "joystick_base", 150, 150, (ctx, w, h) => {
    circle(ctx, w / 2, h / 2, w / 2, "rgba(255,255,255,0.10)");
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  });
  makeTexture(scene, "joystick_thumb", 84, 84, (ctx, w, h) => {
    circle(ctx, w / 2, h / 2, w / 2, "rgba(255,255,255,0.35)");
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  });
  makeTexture(scene, "ui_round", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, 2, 2, 60, 60, 18);
    ctx.fill();
  });
  makeTexture(scene, "ui_dot", 12, 12, (ctx, w, h) => {
    circle(ctx, w / 2, h / 2, w / 2, "#ffffff");
  });
}

// Creates a rounded-rect gradient texture (cached by params). Used for buttons and panels.
export function roundedRectTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  radius: number,
  topColor: number,
  bottomColor: number,
  strokeColor: number | null
): void {
  makeTexture(scene, key, w, h, (ctx, cw, ch) => {
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, rgba(topColor, 1));
    g.addColorStop(1, rgba(bottomColor, 1));
    ctx.fillStyle = g;
    roundRectPath(ctx, 0, 0, cw, ch, radius);
    ctx.fill();
    if (strokeColor !== null) {
      ctx.strokeStyle = rgba(strokeColor, 0.9);
      ctx.lineWidth = 3;
      roundRectPath(ctx, 1.5, 1.5, cw - 3, ch - 3, radius);
      ctx.stroke();
    }
    // soft top highlight
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRectPath(ctx, 3, 3, cw - 6, Math.max(8, ch * 0.28), radius);
    ctx.fill();
  });
}

export function createAllTextures(scene: Phaser.Scene): void {
  drawShadowTexture(scene);
  drawGround(scene);
  drawLumi(scene);
  drawEnemies(scene);
  drawGolem(scene);
  drawProjectiles(scene);
  drawPickups(scene);
  drawChests(scene);
  drawEgg(scene);
  drawGem(scene);
  drawUi(scene);
}