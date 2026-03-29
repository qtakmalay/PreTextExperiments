import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '../../src/layout.ts'

// --- Constants ---
const FONT_STR = '18px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const LH = 28
const GUTTER = 48
const TOP_PAD = 80
const MIN_SLOT = 30
const DRAGON_SEGS = 80
const HEAD_R = 28
const TAIL_R = 4
const SEG_DIST = 6
const COL_GAP = 60

// --- Text content (two columns) ---
const TEXT_L = `The universe is under no obligation to make sense to you. Yet here we stand, pattern-seeking creatures on a pale blue dot, weaving stories from starlight and mathematics. Every civilization that has ever looked up at the night sky has asked the same questions: Where did we come from? Are we alone? What does it all mean?

The answers, when they come, are never what we expect. The universe is stranger than we can suppose, stranger than we can imagine. It operates on principles that seem absurd at human scales — particles that exist in two places at once, time that bends near massive objects, space itself that stretches and warps.

Consider the light reaching your eyes right now. Those photons began their journey at the surface of the sun eight minutes ago, but before that they spent perhaps a hundred thousand years bouncing through the solar interior, a random walk from core to surface. The sunlight warming your face is older than civilization.

Or consider the atoms in your body. The iron in your blood was forged in the heart of a dying star. The calcium in your bones was scattered across space by a supernova. The hydrogen in every glass of water you drink was created in the first three minutes after the Big Bang. You are, quite literally, made of star stuff — the universe experiencing itself.

These are not metaphors. These are precise physical facts, confirmed by decades of observation and measurement. The poetic truth and the scientific truth are, for once, exactly the same thing. We are the cosmos made conscious, matter that has organized itself into patterns complex enough to contemplate their own origins.`

const TEXT_R = `What distinguishes science from every other human endeavor is not its subject matter but its method. Science is not a body of knowledge, though it produces one. It is a way of thinking, a way of interrogating nature that demands evidence, embraces uncertainty, and never claims to have the final answer.

The method is deceptively simple: observe, hypothesize, test, repeat. But within that cycle lies a radical idea — that our beliefs should be proportional to the evidence, and that any belief, no matter how cherished, must yield to better data. No authority is immune. No tradition is sacred. No intuition is trustworthy without verification.

This is profoundly uncomfortable. Humans are not naturally skeptical creatures. We evolved to find patterns, even where none exist. We see faces in clouds, hear voices in static, and assign causes to coincidences. Our brains are prediction machines, optimized for a world of predators and prey, not for the subtle statistical reasoning that science demands.

And yet we do it. Against every cognitive bias, against every instinct for comfortable certainty, we build instruments that extend our senses, design experiments that control for our biases, and develop mathematical frameworks that reveal truths invisible to intuition.

The result is a picture of reality that no single human mind could have imagined. Quantum mechanics, general relativity, molecular biology, plate tectonics — each of these frameworks was resisted, ridiculed, and eventually accepted because the evidence left no other option.

This is the greatest story ever told: how a species of clever primates, armed with curiosity and rigor, slowly assembled a picture of a universe far grander, far stranger, and far more beautiful than any myth.`

// --- Wait for fonts ---
await document.fonts.ready

const prepL = prepareWithSegments(TEXT_L, FONT_STR)
const prepR = prepareWithSegments(TEXT_R, FONT_STR)
const stage = document.getElementById('stage')!

// --- Dragon segments ---
type Seg = { x: number; y: number }
const segs: Seg[] = []
for (let i = 0; i < DRAGON_SEGS; i++) segs.push({ x: -200, y: -200 })

let mouseX = -200
let mouseY = -200
let firing = false
const flames: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = []

// --- Input ---
stage.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY })
stage.addEventListener('touchmove', (e) => {
  mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; e.preventDefault()
}, { passive: false })
stage.addEventListener('mousedown', () => { firing = true })
stage.addEventListener('mouseup', () => { firing = false })
stage.addEventListener('touchstart', () => { firing = true })
stage.addEventListener('touchend', () => { firing = false })

// --- Dragon DOM ---
const segEls: HTMLDivElement[] = []
for (let i = 0; i < DRAGON_SEGS; i++) {
  const el = document.createElement('div')
  el.className = 'dragon-seg'
  const t = 1 - i / DRAGON_SEGS
  const r = TAIL_R + (HEAD_R - TAIL_R) * t * t
  const gold = Math.floor(160 + t * 95)
  const green = Math.floor(130 + t * 70)
  const red = Math.floor(60 + t * 120)
  const alpha = (0.3 + t * 0.55).toFixed(2)
  el.style.width = el.style.height = r * 2 + 'px'
  el.style.background = `radial-gradient(circle at 38% 32%, rgba(${red},${gold},${Math.floor(t * 30)},${alpha}), rgba(${Math.floor(red * 0.3)},${green},${Math.floor(t * 20)},${(Number(alpha) * 0.3).toFixed(2)}) 55%, transparent 72%)`
  if (i === 0) el.style.boxShadow = '0 0 40px 12px rgba(200,170,50,0.25), 0 0 80px 25px rgba(34,197,94,0.1)'
  stage.appendChild(el)
  segEls.push(el)
}

// Eyes
const eye1 = document.createElement('div')
eye1.className = 'eye'
eye1.style.cssText = 'width:10px;height:10px;background:radial-gradient(circle,#fff 15%,#ffd700 40%,#ff4400 70%,transparent 75%);border-radius:50%'
const eye2 = eye1.cloneNode() as HTMLDivElement
stage.appendChild(eye1)
stage.appendChild(eye2)

// Fire canvas
const flameCanvas = document.createElement('canvas')
flameCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:15;pointer-events:none'
stage.appendChild(flameCanvas)
const fctx = flameCanvas.getContext('2d')!
const dpr = Math.min(devicePixelRatio || 1, 2)

// --- Line pool ---
const linePool: HTMLDivElement[] = []
function getLine(idx: number): HTMLDivElement {
  while (linePool.length <= idx) {
    const el = document.createElement('div')
    el.className = 'line'
    stage.appendChild(el)
    linePool.push(el)
  }
  return linePool[idx]
}

// --- Geometry ---
type Interval = { left: number; right: number }

function circleInterval(cx: number, cy: number, r: number, bandTop: number, bandBot: number): Interval | null {
  if (bandTop >= cy + r || bandBot <= cy - r) return null
  const minDy = cy >= bandTop && cy <= bandBot ? 0 : cy < bandTop ? bandTop - cy : cy - bandBot
  if (minDy >= r) return null
  const dx = Math.sqrt(r * r - minDy * minDy)
  return { left: cx - dx, right: cx + dx }
}

function mergeIntervals(ivs: Interval[]): Interval[] {
  if (ivs.length <= 1) return ivs
  ivs.sort((a, b) => a.left - b.left)
  const m = [ivs[0]]
  for (let i = 1; i < ivs.length; i++) {
    const last = m[m.length - 1]
    const cur = ivs[i]
    if (cur.left <= last.right) last.right = Math.max(last.right, cur.right)
    else m.push(cur)
  }
  return m
}

function carveSlots(baseL: number, baseR: number, blocked: Interval[]): Interval[] {
  let slots: Interval[] = [{ left: baseL, right: baseR }]
  for (let bi = 0; bi < blocked.length; bi++) {
    const b = blocked[bi]
    const next: Interval[] = []
    for (let si = 0; si < slots.length; si++) {
      const s = slots[si]
      if (b.right <= s.left || b.left >= s.right) { next.push(s); continue }
      if (b.left > s.left) next.push({ left: s.left, right: b.left })
      if (b.right < s.right) next.push({ left: b.right, right: s.right })
    }
    slots = next
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT)
}

// --- Column layout ---
function layoutColumn(
  prep: PreparedTextWithSegments,
  colLeft: number,
  colRight: number,
  startY: number,
  endY: number,
): { text: string; x: number; y: number }[] {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = startY
  const lines: { text: string; x: number; y: number }[] = []

  while (y < endY) {
    const bandTop = y
    const bandBot = y + LH
    const blocked: Interval[] = []
    for (let si = 0; si < DRAGON_SEGS; si++) {
      const s = segs[si]
      const t = 1 - si / DRAGON_SEGS
      const r = TAIL_R + (HEAD_R - TAIL_R) * t * t + 8
      const iv = circleInterval(s.x, s.y, r, bandTop, bandBot)
      if (iv) blocked.push(iv)
    }
    const merged = mergeIntervals(blocked)
    const slots = carveSlots(colLeft, colRight, merged)
    if (slots.length === 0) { y += LH; continue }

    let advanced = false
    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si]
      const slotW = slot.right - slot.left
      const line = layoutNextLine(prep, cursor, slotW)
      if (line === null) break
      lines.push({ text: line.text, x: slot.left, y })
      cursor = line.end
      advanced = true
    }
    if (!advanced) break
    y += LH
  }
  return lines
}

// --- Render loop ---
function render() {
  const W = innerWidth
  const H = innerHeight

  // Dragon physics
  segs[0].x += (mouseX - segs[0].x) * 0.12
  segs[0].y += (mouseY - segs[0].y) * 0.12
  for (let i = 1; i < DRAGON_SEGS; i++) {
    const prev = segs[i - 1]
    const seg = segs[i]
    const dx = prev.x - seg.x
    const dy = prev.y - seg.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > SEG_DIST) {
      const nx = dx / dist
      const ny = dy / dist
      seg.x = prev.x - nx * SEG_DIST
      seg.y = prev.y - ny * SEG_DIST
    }
  }

  // Position dragon DOM
  const time = Date.now() * 0.003
  for (let i = 0; i < DRAGON_SEGS; i++) {
    const s = segs[i]
    const t = 1 - i / DRAGON_SEGS
    const r = TAIL_R + (HEAD_R - TAIL_R) * t * t
    const wave = Math.sin(time + i * 0.3) * 2.5 * (1 - t * 0.5)
    const pAngle = i > 0 ? Math.atan2(segs[i].y - segs[i - 1].y, segs[i].x - segs[i - 1].x) + 1.57 : 0
    segEls[i].style.transform = `translate(${s.x + Math.cos(pAngle) * wave - r}px, ${s.y + Math.sin(pAngle) * wave - r}px)`
  }

  // Eyes
  const hx = segs[0].x
  const hy = segs[0].y
  const angle = Math.atan2(mouseY - hy, mouseX - hx)
  eye1.style.transform = `translate(${hx + Math.cos(angle - 0.5) * 14 - 5}px, ${hy + Math.sin(angle - 0.5) * 14 - 5}px)`
  eye2.style.transform = `translate(${hx + Math.cos(angle + 0.5) * 14 - 5}px, ${hy + Math.sin(angle + 0.5) * 14 - 5}px)`

  // Layout columns
  const colW = (W - GUTTER * 2 - COL_GAP) / 2
  const leftLines = layoutColumn(prepL, GUTTER, GUTTER + colW, TOP_PAD, H - 40)
  const rightLines = layoutColumn(prepR, GUTTER + colW + COL_GAP, W - GUTTER, TOP_PAD, H - 40)
  const allLines = leftLines.concat(rightLines)

  let lineIdx = 0
  for (let i = 0; i < allLines.length; i++) {
    const el = getLine(lineIdx)
    el.textContent = allLines[i].text
    el.style.left = allLines[i].x + 'px'
    el.style.top = allLines[i].y + 'px'
    el.style.display = 'block'
    lineIdx++
  }
  for (let i = lineIdx; i < linePool.length; i++) linePool[i].style.display = 'none'

  // Fire breath
  if (firing && mouseX > 0) {
    for (let fi = 0; fi < 4; fi++) {
      const spread = angle + (Math.random() - 0.5) * 0.7
      const spd = 5 + Math.random() * 7
      flames.push({
        x: hx + Math.cos(angle) * 30,
        y: hy + Math.sin(angle) * 30,
        vx: Math.cos(spread) * spd,
        vy: Math.sin(spread) * spd,
        life: 1,
        size: 3 + Math.random() * 5,
      })
    }
  }

  // Render flames
  flameCanvas.width = W * dpr
  flameCanvas.height = H * dpr
  flameCanvas.style.width = W + 'px'
  flameCanvas.style.height = H + 'px'
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  fctx.clearRect(0, 0, W, H)
  for (let fi = flames.length - 1; fi >= 0; fi--) {
    const f = flames[fi]
    f.x += f.vx
    f.y += f.vy
    f.vy += 0.05
    f.life -= 0.02
    f.vx *= 0.99
    if (f.life <= 0) { flames.splice(fi, 1); continue }
    const gr = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * f.life * 1.5)
    gr.addColorStop(0, `rgba(255,${Math.floor(150 + f.life * 105)},30,${f.life.toFixed(2)})`)
    gr.addColorStop(1, 'rgba(200,50,0,0)')
    fctx.fillStyle = gr
    fctx.beginPath()
    fctx.arc(f.x, f.y, f.size * f.life * 1.5, 0, 6.28)
    fctx.fill()
  }

  requestAnimationFrame(render)
}

requestAnimationFrame(render)
