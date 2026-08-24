import type { ThemeName } from "@gencore/ui-kit";
import type { BackgroundEffectType, EffectInteractionMode } from "../config/config.types";

export interface BaseEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

export interface ParticleEntity extends BaseEntity {
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  phase: number;
}

export interface MoleculeNode extends BaseEntity {
  radius: number;
  alpha: number;
}

export interface OrbEntity extends BaseEntity {
  baseRadius: number;
  currentRadius: number;
  alpha: number;
  phase: number;
  wobbleSpeed: number;
  colorStop0: string;
  colorStop50: string;
  colorStop100: string;
}

export interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export interface PointerState {
  x: number;
  y: number;
  active: boolean;
}

export interface SimulationState {
  type: BackgroundEffectType;
  theme: ThemeName;
  width: number;
  height: number;
  particles: ParticleEntity[];
  molecules: MoleculeNode[];
  orbs: OrbEntity[];
  ripples: ClickRipple[];
}

export type { BackgroundEffectType, EffectInteractionMode, ThemeName };
