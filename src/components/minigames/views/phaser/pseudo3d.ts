/**
 * Shared Phaser faux-3D / PlayStation-arcade drawing helpers.
 * Depth via extruded faces, layered lighting, glow, and vignette.
 */

export type G = Phaser.GameObjects.Graphics

export function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * factor)))
  const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * factor)))
  return (r << 16) | (g << 8) | b
}

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

/** Rich vertical sky with optional haze bloom at the horizon. */
export function drawSky(
  g: G,
  w: number,
  h: number,
  top: number,
  bottom: number,
  bands = 24,
  opts?: { haze?: number; hazeColor?: number }
) {
  for (let i = 0; i < bands; i++) {
    const t = i / Math.max(1, bands - 1)
    const c = lerpColor(top, bottom, t * t * 0.35 + t * 0.65)
    g.fillStyle(c, 1)
    g.fillRect(0, (h * i) / bands, w, h / bands + 1)
  }
  if (opts?.haze) {
    const haze = opts.hazeColor ?? shade(bottom, 1.4)
    g.fillStyle(haze, 0.18)
    g.fillEllipse(w / 2, h * 0.92, w * 1.2, h * 0.55)
    g.fillStyle(haze, 0.1)
    g.fillEllipse(w / 2, h * 0.75, w * 0.7, h * 0.35)
  }
}

/** Twinkling starfield for night / space arenas. */
export function drawStars(g: G, w: number, h: number, count = 40, seed = 7) {
  for (let i = 0; i < count; i++) {
    const x = ((i * 97 + seed * 13) % w) + 0.5
    const y = ((i * 53 + seed * 29) % Math.max(1, h - 8)) + 0.5
    const bright = i % 5 === 0
    g.fillStyle(0xffffff, bright ? 0.85 : 0.35 + (i % 3) * 0.12)
    g.fillCircle(x, y, bright ? 1.6 : 1)
    if (bright) {
      g.fillStyle(0xa5f3fc, 0.25)
      g.fillCircle(x, y, 3.2)
    }
  }
}

/** Soft elliptical ground shadow under an object. */
export function drawShadow(g: G, cx: number, cy: number, rw: number, rh: number, alpha = 0.32) {
  g.fillStyle(0x000000, alpha * 0.55)
  g.fillEllipse(cx, cy + 1, rw * 1.15, rh * 1.2)
  g.fillStyle(0x000000, alpha)
  g.fillEllipse(cx, cy, rw, rh)
}

/** Soft colored glow (for neon / energy props). */
export function drawGlow(g: G, cx: number, cy: number, r: number, color: number, alpha = 0.22) {
  g.fillStyle(color, alpha * 0.35)
  g.fillCircle(cx, cy, r * 1.65)
  g.fillStyle(color, alpha)
  g.fillCircle(cx, cy, r)
}

/**
 * Extruded box with specular rim — PlayStation arcade plastic look.
 * (`x`,`y`) is the top-left of the front face.
 */
export function drawBox(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  color: number,
  opts?: { round?: number; glow?: boolean }
) {
  const d = Math.max(2, depth)
  const topC = shade(color, 1.28)
  const sideC = shade(color, 0.55)
  const frontC = color
  const r = opts?.round ?? 0

  if (opts?.glow) {
    drawGlow(g, x + w / 2 + d * 0.3, y + h / 2 - d * 0.2, Math.max(w, h) * 0.7, color, 0.16)
  }

  // Top face
  g.fillStyle(topC, 1)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w, y)
  g.lineTo(x + w + d, y - d)
  g.lineTo(x + d, y - d)
  g.closePath()
  g.fillPath()

  // Right face
  g.fillStyle(sideC, 1)
  g.beginPath()
  g.moveTo(x + w, y)
  g.lineTo(x + w + d, y - d)
  g.lineTo(x + w + d, y - d + h)
  g.lineTo(x + w, y + h)
  g.closePath()
  g.fillPath()

  // Front face
  g.fillStyle(frontC, 1)
  if (r > 0) g.fillRoundedRect(x, y, w, h, r)
  else g.fillRect(x, y, w, h)

  // Specular strip across top of front
  g.fillStyle(0xffffff, 0.16)
  if (r > 0) g.fillRoundedRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(2, h * 0.22), Math.min(r, 4))
  else g.fillRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(2, h * 0.22))

  // Rim
  g.lineStyle(1.25, shade(color, 1.45), 0.45)
  g.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1))
}

/** Box whose bottom sits on `bottomY`. */
export function drawBoxOnGround(
  g: G,
  x: number,
  bottomY: number,
  w: number,
  h: number,
  depth: number,
  color: number,
  opts?: { round?: number; shadow?: boolean; glow?: boolean }
) {
  if (opts?.shadow !== false) {
    drawShadow(g, x + w / 2 + depth * 0.3, bottomY + 2, w * 0.95, Math.max(5, depth + 1))
  }
  drawBox(g, x, bottomY - h, w, h, depth, color, opts)
}

/** Thick disc / coin with rim light. */
export function drawDisc3d(
  g: G,
  cx: number,
  cy: number,
  r: number,
  depth: number,
  color: number
) {
  const d = Math.max(2, depth)
  const side = shade(color, 0.5)
  const top = shade(color, 1.2)
  drawGlow(g, cx, cy, r * 1.4, color, 0.12)
  for (let i = d; i >= 1; i--) {
    g.fillStyle(side, 1)
    g.fillEllipse(cx, cy + i * 0.55, r * 2, r * 1.15)
  }
  g.fillStyle(top, 1)
  g.fillEllipse(cx, cy, r * 2, r * 1.15)
  g.fillStyle(0xffffff, 0.28)
  g.fillEllipse(cx - r * 0.28, cy - r * 0.22, r * 0.75, r * 0.38)
  g.lineStyle(1.5, shade(color, 1.4), 0.4)
  g.strokeEllipse(cx, cy, r * 2, r * 1.15)
}

/** Sphere with multi-layer specular — billiard / energy orb. */
export function drawSphere(g: G, cx: number, cy: number, r: number, color: number) {
  drawShadow(g, cx + r * 0.12, cy + r * 0.78, r * 1.7, r * 0.58, 0.3)
  drawGlow(g, cx, cy, r * 1.35, color, 0.14)
  g.fillStyle(shade(color, 0.55), 1)
  g.fillCircle(cx, cy, r)
  g.fillStyle(shade(color, 0.85), 1)
  g.fillCircle(cx - r * 0.06, cy - r * 0.08, r * 0.92)
  g.fillStyle(color, 1)
  g.fillCircle(cx - r * 0.12, cy - r * 0.14, r * 0.72)
  g.fillStyle(0xffffff, 0.42)
  g.fillCircle(cx - r * 0.34, cy - r * 0.38, r * 0.3)
  g.fillStyle(0xffffff, 0.18)
  g.fillCircle(cx + r * 0.22, cy + r * 0.28, r * 0.16)
}

/** Perspective floor strip with neon vanishing lines. */
export function drawPerspectiveFloor(
  g: G,
  w: number,
  h: number,
  horizonY: number,
  color: number,
  lineColor?: number
) {
  drawSky(g, w, horizonY, shade(color, 0.25), shade(color, 0.55), 16, {
    haze: 1,
    hazeColor: lineColor ?? shade(color, 1.6),
  })

  // Floor body
  g.fillStyle(color, 1)
  g.fillRect(0, horizonY, w, h - horizonY)

  // Subtle center glow on the court
  const lc = lineColor ?? shade(color, 1.35)
  g.fillStyle(lc, 0.08)
  g.fillEllipse(w / 2, horizonY + (h - horizonY) * 0.55, w * 0.9, (h - horizonY) * 0.7)

  g.lineStyle(1.5, lc, 0.28)
  const vanishingX = w / 2
  for (let i = -7; i <= 7; i++) {
    g.beginPath()
    g.moveTo(vanishingX + i * 6, horizonY)
    g.lineTo(vanishingX + i * (w / 4.5), h)
    g.strokePath()
  }
  for (let t = 0.12; t < 1; t += 0.1) {
    const y = horizonY + (h - horizonY) * t * t
    const spread = (t * t * w) / 2
    g.lineStyle(1, lc, 0.18 + t * 0.2)
    g.beginPath()
    g.moveTo(vanishingX - spread, y)
    g.lineTo(vanishingX + spread, y)
    g.strokePath()
  }

  // Horizon neon rail
  g.lineStyle(2, lc, 0.55)
  g.beginPath()
  g.moveTo(0, horizonY)
  g.lineTo(w, horizonY)
  g.strokePath()
}

/** Flat board slab with thickness. */
export function drawSlab(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  color: number
) {
  drawBox(g, x, y, w, h, depth, color, { round: 10, glow: true })
}

/** Screen vignette for cinematic console framing. */
export function drawVignette(g: G, w: number, h: number, strength = 0.45) {
  const steps = 10
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const inset = t * Math.min(w, h) * 0.12
    g.lineStyle(Math.max(2, 14 - i), 0x000000, strength * (1 - t) * 0.35)
    g.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
  }
}

/** Distant mountain / skyline silhouettes. */
export function drawSkyline(
  g: G,
  w: number,
  groundY: number,
  color: number,
  peaks: Array<[number, number, number]>
) {
  g.fillStyle(color, 0.85)
  for (const [x0, peak, x1] of peaks) {
    g.fillTriangle(x0, groundY, (x0 + x1) / 2, groundY - peak, x1, groundY)
  }
  g.fillStyle(shade(color, 1.25), 0.2)
  for (const [x0, peak, x1] of peaks) {
    g.fillTriangle(x0 + 8, groundY, (x0 + x1) / 2, groundY - peak * 0.7, x1 - 8, groundY)
  }
}

/** Isometric diamond tile centered at (cx, cy). */
export function drawIsoTile(
  g: G,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  elev: number,
  color: number
) {
  const top = shade(color, 1.22)
  const left = shade(color, 0.68)
  const right = shade(color, 0.5)

  if (elev > 0) {
    g.fillStyle(left, 1)
    g.beginPath()
    g.moveTo(cx - halfW, cy)
    g.lineTo(cx, cy + halfH)
    g.lineTo(cx, cy + halfH + elev)
    g.lineTo(cx - halfW, cy + elev)
    g.closePath()
    g.fillPath()
    g.fillStyle(right, 1)
    g.beginPath()
    g.moveTo(cx + halfW, cy)
    g.lineTo(cx, cy + halfH)
    g.lineTo(cx, cy + halfH + elev)
    g.lineTo(cx + halfW, cy + elev)
    g.closePath()
    g.fillPath()
  }

  g.fillStyle(top, 1)
  g.beginPath()
  g.moveTo(cx, cy - halfH)
  g.lineTo(cx + halfW, cy)
  g.lineTo(cx, cy + halfH)
  g.lineTo(cx - halfW, cy)
  g.closePath()
  g.fillPath()

  g.fillStyle(0xffffff, 0.12)
  g.beginPath()
  g.moveTo(cx, cy - halfH)
  g.lineTo(cx + halfW * 0.35, cy - halfH * 0.2)
  g.lineTo(cx, cy)
  g.lineTo(cx - halfW * 0.35, cy - halfH * 0.2)
  g.closePath()
  g.fillPath()
}

/** Shared HUD text style for mini-games. */
export const HUD_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '15px',
  color: '#e2e8f0',
  stroke: '#020617',
  strokeThickness: 3,
} as const

export const HUD_BANNER = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '34px',
  color: '#fef08a',
  fontStyle: 'bold' as const,
  stroke: '#0f172a',
  strokeThickness: 6,
} as const
