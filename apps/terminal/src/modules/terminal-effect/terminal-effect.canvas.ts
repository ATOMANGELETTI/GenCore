import type { ThemeName } from "@gencore/ui-kit";
import type { BackgroundEffectType, EffectInteractionMode } from "../config/config.types";
import type { PointerState, SimulationState } from "./terminal-effect.types";

const POLAR_COLORS = ["#8fbcbb", "#88c0d0", "#81a1c1", "#5e81ac", "#b48ead", "#4c566a"] as const;
const SNOW_COLORS = ["#3b4252", "#4c566a", "#81a1c1", "#5e81ac", "#d8dee9"] as const;

function getPalette(theme: ThemeName): readonly string[] {
  return theme === "snow-storm" ? SNOW_COLORS : POLAR_COLORS;
}

function randomColor(palette: readonly string[]): string {
  return palette[Math.floor(Math.random() * palette.length)] ?? palette[0] ?? "#88c0d0";
}

export function createSimulation(
  width: number,
  height: number,
  type: BackgroundEffectType,
  theme: ThemeName,
): SimulationState {
  const state: SimulationState = {
    type,
    theme,
    width,
    height,
    particles: [],
    molecules: [],
    orbs: [],
    ripples: [],
  };

  if (type === "none" || width <= 0 || height <= 0) {
    return state;
  }

  const palette = getPalette(theme);
  const area = width * height;

  if (type === "particles") {
    const count = Math.max(40, Math.min(90, Math.floor(area / 8000)));
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 16,
        vy: -12 - Math.random() * 24,
        radius: 1.0 + Math.random() * 1.8,
        baseAlpha: 0.35 + Math.random() * 0.45,
        pulseSpeed: 1.2 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2,
        color: randomColor(palette),
      });
    }
  } else if (type === "molecules") {
    const count = Math.max(25, Math.min(55, Math.floor(area / 14000)));
    for (let i = 0; i < count; i++) {
      state.molecules.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 32,
        vy: (Math.random() - 0.5) * 32,
        radius: 1.8 + Math.random() * 1.8,
        alpha: 0.5 + Math.random() * 0.35,
        color: randomColor(palette),
      });
    }
  } else if (type === "orbs") {
    const count = Math.max(5, Math.min(8, Math.floor(area / 60000) + 4));
    const orbColors =
      theme === "snow-storm"
        ? [
            { r: 94, g: 129, b: 172 }, // frost-10
            { r: 129, g: 161, b: 193 }, // frost-9
            { r: 76, g: 86, b: 106 }, // polar-3
          ]
        : [
            { r: 136, g: 192, b: 208 }, // frost-8
            { r: 129, g: 161, b: 193 }, // frost-9
            { r: 180, g: 142, b: 173 }, // aurora-15
            { r: 143, g: 188, b: 187 }, // frost-7
          ];

    for (let i = 0; i < count; i++) {
      const col = orbColors[i % orbColors.length] ?? { r: 136, g: 192, b: 208 };
      const baseRadius = 70 + Math.random() * 110;
      state.orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        baseRadius,
        currentRadius: baseRadius,
        alpha: 0.22 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.6 + Math.random() * 0.8,
        color: `rgb(${col.r}, ${col.g}, ${col.b})`,
        colorStop0: `rgba(${col.r}, ${col.g}, ${col.b}, 0.28)`,
        colorStop50: `rgba(${col.r}, ${col.g}, ${col.b}, 0.10)`,
        colorStop100: `rgba(${col.r}, ${col.g}, ${col.b}, 0)`,
      });
    }
  }

  return state;
}

export function resizeSimulation(state: SimulationState, width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    return;
  }
  const oldWidth = state.width || width;
  const oldHeight = state.height || height;
  state.width = width;
  state.height = height;

  const scaleX = width / oldWidth;
  const scaleY = height / oldHeight;

  for (const p of state.particles) {
    p.x *= scaleX;
    p.y *= scaleY;
  }
  for (const m of state.molecules) {
    m.x *= scaleX;
    m.y *= scaleY;
  }
  for (const o of state.orbs) {
    o.x *= scaleX;
    o.y *= scaleY;
  }
}

export function triggerClickRipple(state: SimulationState, x: number, y: number): void {
  state.ripples.push({
    x,
    y,
    radius: 0,
    maxRadius: 220,
    alpha: 0.85,
    speed: 340,
  });
}

export function stepSimulation(
  state: SimulationState,
  dt: number,
  pointer: PointerState,
  interaction: EffectInteractionMode,
  speed: number,
): void {
  if (state.type === "none" || state.width <= 0 || state.height <= 0) {
    return;
  }

  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const effectiveDt = clampedDt * speed;
  const repelRadius = 120;
  const isRepelActive = (interaction === "repel" || interaction === "ripple") && pointer.active;

  // Step ripples
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const rip = state.ripples[i];
    if (!rip) {
      continue;
    }
    rip.radius += rip.speed * effectiveDt;
    rip.alpha = Math.max(0, 0.85 * (1 - rip.radius / rip.maxRadius));
    if (rip.radius >= rip.maxRadius || rip.alpha <= 0) {
      state.ripples.splice(i, 1);
    }
  }

  if (state.type === "particles") {
    for (const p of state.particles) {
      p.phase += p.pulseSpeed * effectiveDt;
      p.x += p.vx * effectiveDt;
      p.y += p.vy * effectiveDt;

      // Cursor repulsion
      if (isRepelActive) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < repelRadius && dist > 0.01) {
          const force = ((repelRadius - dist) / repelRadius) * 220;
          p.vx += (dx / dist) * force * effectiveDt;
          p.vy += (dy / dist) * force * effectiveDt;
        }
      }

      // Ripple shockwave
      if (interaction === "ripple" && state.ripples.length > 0) {
        for (const rip of state.ripples) {
          const dx = p.x - rip.x;
          const dy = p.y - rip.y;
          const dist = Math.hypot(dx, dy);
          const diff = Math.abs(dist - rip.radius);
          if (diff < 28 && dist > 0.01) {
            const force = (1 - diff / 28) * 180;
            p.vx += (dx / dist) * force * effectiveDt;
            p.vy += (dy / dist) * force * effectiveDt;
          }
        }
      }

      // Velocity damping towards base drift
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + -18 * 0.04;

      // Wrap boundaries
      if (p.y < -15) {
        p.y = state.height + 10;
        p.x = Math.random() * state.width;
      } else if (p.y > state.height + 15) {
        p.y = -10;
      }
      if (p.x < -15) {
        p.x = state.width + 10;
      } else if (p.x > state.width + 15) {
        p.x = -10;
      }
    }
  } else if (state.type === "molecules") {
    for (const m of state.molecules) {
      m.x += m.vx * effectiveDt;
      m.y += m.vy * effectiveDt;

      if (isRepelActive) {
        const dx = m.x - pointer.x;
        const dy = m.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < repelRadius && dist > 0.01) {
          const force = ((repelRadius - dist) / repelRadius) * 260;
          m.vx += (dx / dist) * force * effectiveDt;
          m.vy += (dy / dist) * force * effectiveDt;
        }
      }

      if (interaction === "ripple" && state.ripples.length > 0) {
        for (const rip of state.ripples) {
          const dx = m.x - rip.x;
          const dy = m.y - rip.y;
          const dist = Math.hypot(dx, dy);
          const diff = Math.abs(dist - rip.radius);
          if (diff < 32 && dist > 0.01) {
            const force = (1 - diff / 32) * 220;
            m.vx += (dx / dist) * force * effectiveDt;
            m.vy += (dy / dist) * force * effectiveDt;
          }
        }
      }

      // Bounce off walls smoothly
      if (m.x < 10) {
        m.x = 10;
        m.vx = Math.abs(m.vx);
      } else if (m.x > state.width - 10) {
        m.x = state.width - 10;
        m.vx = -Math.abs(m.vx);
      }
      if (m.y < 10) {
        m.y = 10;
        m.vy = Math.abs(m.vy);
      } else if (m.y > state.height - 10) {
        m.y = state.height - 10;
        m.vy = -Math.abs(m.vy);
      }
    }
  } else if (state.type === "orbs") {
    for (const o of state.orbs) {
      o.phase += o.wobbleSpeed * effectiveDt;
      o.currentRadius = o.baseRadius + Math.sin(o.phase) * (o.baseRadius * 0.22);
      o.x += o.vx * effectiveDt;
      o.y += o.vy * effectiveDt;

      if (isRepelActive) {
        const dx = o.x - pointer.x;
        const dy = o.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < repelRadius * 1.5 && dist > 0.01) {
          const force = ((repelRadius * 1.5 - dist) / (repelRadius * 1.5)) * 90;
          o.vx += (dx / dist) * force * effectiveDt;
          o.vy += (dy / dist) * force * effectiveDt;
        }
      }

      // Soft boundary reflection
      const margin = o.baseRadius * 0.5;
      if (o.x < -margin) {
        o.vx = Math.abs(o.vx);
      } else if (o.x > state.width + margin) {
        o.vx = -Math.abs(o.vx);
      }
      if (o.y < -margin) {
        o.vy = Math.abs(o.vy);
      } else if (o.y > state.height + margin) {
        o.vy = -Math.abs(o.vy);
      }
    }
  }
}

export function renderSimulation(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  opacity: number,
): void {
  if (state.type === "none" || state.width <= 0 || state.height <= 0) {
    ctx.clearRect(0, 0, state.width, state.height);
    return;
  }

  ctx.clearRect(0, 0, state.width, state.height);
  ctx.save();
  ctx.globalAlpha = Math.min(Math.max(opacity, 0.05), 1.0);

  if (state.type === "particles") {
    for (const p of state.particles) {
      const alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.phase));
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (state.type === "molecules") {
    const maxDist = 110;
    const maxDistSq = maxDist * maxDist;
    const count = state.molecules.length;

    // Draw filaments
    ctx.lineWidth = 1.0;
    for (let i = 0; i < count; i++) {
      const a = state.molecules[i];
      if (!a) {
        continue;
      }
      for (let j = i + 1; j < count; j++) {
        const b = state.molecules[j];
        if (!b) {
          continue;
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < maxDistSq) {
          const ratio = 1 - Math.sqrt(distSq) / maxDist;
          const lineAlpha = ratio * ratio * 0.45 * opacity;
          ctx.strokeStyle = state.theme === "snow-storm" ? "#81a1c1" : "#88c0d0";
          ctx.globalAlpha = lineAlpha;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const m of state.molecules) {
      ctx.fillStyle = m.color;
      ctx.globalAlpha = m.alpha * opacity;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (state.type === "orbs") {
    ctx.globalCompositeOperation = state.theme === "polar-night" ? "screen" : "source-over";

    for (const o of state.orbs) {
      const rad = Math.max(o.currentRadius, 10);
      const gradient = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, rad);
      gradient.addColorStop(0, o.colorStop0);
      gradient.addColorStop(0.5, o.colorStop50);
      gradient.addColorStop(1, o.colorStop100);

      ctx.fillStyle = gradient;
      ctx.globalAlpha = o.alpha * opacity;
      ctx.beginPath();
      ctx.arc(o.x, o.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw ripples
  if (state.ripples.length > 0) {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1.5;
    for (const rip of state.ripples) {
      ctx.strokeStyle = state.theme === "snow-storm" ? "#5e81ac" : "#88c0d0";
      ctx.globalAlpha = rip.alpha * opacity;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
