/**
 * Shared Phaser 2D → faux-3D drawing helpers.
 * Phaser remains the engine; we fake depth with extruded faces, shadows, and gradients.
 */

export type G = Phaser.GameObjects.Graphics

export function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * factor)))
  const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * factor)))
  return (r << 16) | (g << 8) | b
}

/** Vertical sky gradient (top → bottom). */
export function drawSky(g: G, w: number, h: number, top: number, bottom: number, bands = 18) {
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1)
    const c = lerpColor(top, bottom, t)
    g.fillStyle(c, 1)
    g.fillRect(0, (h * i) / bands, w, h / bands + 1)
  }
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

/** Soft elliptical ground shadow under an object. */
export function drawShadow(g: G, cx: number, cy: number, rw: number, rh: number, alpha = 0.28) {
  g.fillStyle(0x000000, alpha)
  g.fillEllipse(cx, cy, rw, rh)
}

/**
 * Extruded box. (`x`,`y`) is the top-left of the front face.
 * Depth is drawn up-right (classic arcade isometric tilt).
 */
export function drawBox(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  color: number,
  opts?: { round?: number }
) {
  const d = Math.max(2, depth)
  const topC = shade(color, 1.22)
  const sideC = shade(color, 0.62)
  const frontC = color
  const r = opts?.round ?? 0

  // Top face (parallelogram)
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

  // Rim highlight
  g.lineStyle(1, shade(color, 1.35), 0.35)
  g.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1))
}

/** Box whose bottom sits on `bottomY` (useful for grounded sprites). */
export function drawBoxOnGround(
  g: G,
  x: number,
  bottomY: number,
  w: number,
  h: number,
  depth: number,
  color: number,
  opts?: { round?: number; shadow?: boolean }
) {
  if (opts?.shadow !== false) {
    drawShadow(g, x + w / 2 + depth * 0.3, bottomY + 2, w * 0.9, Math.max(4, depth))
  }
  drawBox(g, x, bottomY - h, w, h, depth, color, opts)
}

/** Thick disc / coin (cylinder seen from above-front). */
export function drawDisc3d(
  g: G,
  cx: number,
  cy: number,
  r: number,
  depth: number,
  color: number
) {
  const d = Math.max(2, depth)
  const side = shade(color, 0.55)
  const top = shade(color, 1.15)
  // Side stack
  for (let i = d; i >= 1; i--) {
    g.fillStyle(side, 1)
    g.fillEllipse(cx, cy + i * 0.55, r * 2, r * 1.15)
  }
  g.fillStyle(top, 1)
  g.fillEllipse(cx, cy, r * 2, r * 1.15)
  g.fillStyle(0xffffff, 0.22)
  g.fillEllipse(cx - r * 0.28, cy - r * 0.22, r * 0.7, r * 0.35)
}

/** Sphere with specular highlight. */
export function drawSphere(g: G, cx: number, cy: number, r: number, color: number) {
  drawShadow(g, cx + r * 0.15, cy + r * 0.75, r * 1.6, r * 0.55, 0.25)
  g.fillStyle(shade(color, 0.75), 1)
  g.fillCircle(cx, cy, r)
  g.fillStyle(color, 1)
  g.fillCircle(cx - r * 0.08, cy - r * 0.08, r * 0.92)
  g.fillStyle(0xffffff, 0.35)
  g.fillCircle(cx - r * 0.32, cy - r * 0.35, r * 0.28)
}

/** Perspective floor strip with vanishing lines. */
export function drawPerspectiveFloor(
  g: G,
  w: number,
  h: number,
  horizonY: number,
  color: number,
  lineColor?: number
) {
  drawSky(g, w, horizonY, shade(color, 0.35), shade(color, 0.55), 10)
  g.fillStyle(color, 1)
  g.fillRect(0, horizonY, w, h - horizonY)

  const lc = lineColor ?? shade(color, 1.25)
  g.lineStyle(1, lc, 0.22)
  const vanishingX = w / 2
  for (let i = -6; i <= 6; i++) {
    g.beginPath()
    g.moveTo(vanishingX + i * 8, horizonY)
    g.lineTo(vanishingX + i * (w / 5), h)
    g.strokePath()
  }
  for (let t = 0.15; t < 1; t += 0.12) {
    const y = horizonY + (h - horizonY) * t * t
    const spread = (t * t * w) / 2
    g.beginPath()
    g.moveTo(vanishingX - spread, y)
    g.lineTo(vanishingX + spread, y)
    g.strokePath()
  }
}

/** Flat board slab with thickness (Connect 4 / Memory table). */
export function drawSlab(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  color: number
) {
  drawBox(g, x, y, w, h, depth, color, { round: 8 })
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
  const top = shade(color, 1.18)
  const left = shade(color, 0.7)
  const right = shade(color, 0.55)

  if (elev > 0) {
    // Left riser
    g.fillStyle(left, 1)
    g.beginPath()
    g.moveTo(cx - halfW, cy)
    g.lineTo(cx, cy + halfH)
    g.lineTo(cx, cy + halfH + elev)
    g.lineTo(cx - halfW, cy + elev)
    g.closePath()
    g.fillPath()
    // Right riser
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
}
