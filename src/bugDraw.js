import { expand } from './lsystem'

function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

export function bugHue(lsystem) {
  return hashStr(lsystem.axiom + JSON.stringify(lsystem.rules)) % 360
}

export function drawBug(canvas, lsystem) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const str = expand(lsystem)
  const angleRad = (lsystem.angle * Math.PI) / 180

  let x = 0, y = 0, a = -Math.PI / 2, depth = 0
  const stack = []
  const lines = []

  for (const c of str) {
    if (c === 'F') {
      const nx = x + Math.cos(a)
      const ny = y + Math.sin(a)
      lines.push([x, y, nx, ny, depth])
      x = nx
      y = ny
    } else if (c === '+') {
      a += angleRad
    } else if (c === '-') {
      a -= angleRad
    } else if (c === '[') {
      stack.push({ x, y, a })
      depth++
    } else if (c === ']') {
      if (stack.length > 0) ({ x, y, a } = stack.pop())
      depth = Math.max(0, depth - 1)
    }
  }

  if (lines.length === 0) return

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x1, y1, x2, y2] of lines) {
    minX = Math.min(minX, x1, x2)
    minY = Math.min(minY, y1, y2)
    maxX = Math.max(maxX, x1, x2)
    maxY = Math.max(maxY, y1, y2)
  }

  const bw = maxX - minX || 1
  const bh = maxY - minY || 1
  const pad = 20
  const scale = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh)
  const offX = (W - bw * scale) / 2 - minX * scale
  const offY = (H - bh * scale) / 2 - minY * scale

  const hue = bugHue(lsystem)
  ctx.lineCap = 'round'

  // Group lines by depth so we can vary thickness and brightness
  const byDepth = new Map()
  for (const seg of lines) {
    const d = seg[4]
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d).push(seg)
  }
  const maxDepth = byDepth.size > 0 ? Math.max(...byDepth.keys()) : 0

  for (const [d, segs] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    const t = maxDepth > 0 ? d / maxDepth : 0
    ctx.lineWidth = Math.max(0.5, 2.5 - t * 2)
    ctx.strokeStyle = `hsl(${hue}, 70%, ${48 + t * 22}%)`
    ctx.shadowColor = `hsl(${hue}, 90%, ${55 + t * 15}%)`
    ctx.shadowBlur = d === 0 ? 8 : 3

    ctx.beginPath()
    for (const [x1, y1, x2, y2] of segs) {
      const px1 = x1 * scale + offX, py1 = y1 * scale + offY
      const px2 = x2 * scale + offX, py2 = y2 * scale + offY
      ctx.moveTo(px1, py1)
      ctx.lineTo(px2, py2)
      ctx.moveTo(W - px1, py1)
      ctx.lineTo(W - px2, py2)
    }
    ctx.stroke()
  }
}
