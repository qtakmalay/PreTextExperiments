import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '../../src/layout.ts'

// --- Constants ---
const FONT_STR = '17px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const LH = 26
const GUTTER = 56
const TOP_PAD = 48
const COL_GAP = 48
const MIN_SLOT = 30
const CHAR_W = 100
const CHAR_H = 160
const CHAR_PAD = 16 // extra padding around character for text

// --- Text content (magazine-style) ---
const TEXT = `The universe is under no obligation to make sense to you. Yet here we stand, pattern-seeking creatures on a pale blue dot, weaving stories from starlight and mathematics. Every civilization that has ever looked up at the night sky has asked the same questions: Where did we come from? Are we alone? What does it all mean? The answers, when they come, are never what we expect. The universe is stranger than we can suppose, stranger than we can imagine. It operates on principles that seem absurd at human scales \u2014 particles that exist in two places at once, time that bends near massive objects, space itself that stretches and warps. Consider the light reaching your eyes right now. Those photons began their journey at the surface of the sun eight minutes ago, but before that they spent perhaps a hundred thousand years bouncing through the solar interior, a random walk from core to surface. The sunlight warming your face is older than civilization. Or consider the atoms in your body. The iron in your blood was forged in the heart of a dying star. The calcium in your bones was scattered across space by a supernova. The hydrogen in every glass of water you drink was created in the first three minutes after the Big Bang. You are, quite literally, made of star stuff \u2014 the universe experiencing itself. These are not metaphors. These are precise physical facts, confirmed by decades of observation and measurement. The poetic truth and the scientific truth are, for once, exactly the same thing. We are the cosmos made conscious, matter that has organized itself into patterns complex enough to contemplate their own origins. What distinguishes science from every other human endeavor is not its subject matter but its method. Science is not a body of knowledge, though it produces one. It is a way of thinking, a way of interrogating nature that demands evidence, embraces uncertainty, and never claims to have the final answer. The method is deceptively simple: observe, hypothesize, test, repeat. But within that cycle lies a radical idea \u2014 that our beliefs should be proportional to the evidence, and that any belief, no matter how cherished, must yield to better data. No authority is immune. No tradition is sacred. No intuition is trustworthy without verification. This is profoundly uncomfortable. Humans are not naturally skeptical creatures. We evolved to find patterns, even where none exist. We see faces in clouds, hear voices in static, and assign causes to coincidences. Our brains are prediction machines, optimized for a world of predators and prey, not for the subtle statistical reasoning that science demands. And yet we do it. Against every cognitive bias, against every instinct for comfortable certainty, we build instruments that extend our senses, design experiments that control for our biases, and develop mathematical frameworks that reveal truths invisible to intuition. The result is a picture of reality that no single human mind could have imagined. Quantum mechanics, general relativity, molecular biology, plate tectonics \u2014 each of these frameworks was resisted, ridiculed, and eventually accepted because the evidence left no other option. This is the greatest story ever told: how a species of clever primates, armed with curiosity and rigor, slowly assembled a picture of a universe far grander, far stranger, and far more beautiful than any myth. Every generation adds a chapter. Every experiment, every observation, every failed hypothesis is a sentence in a story that has no ending. And the most remarkable thing is not what we have discovered, but that we can discover at all \u2014 that the universe is comprehensible, that mathematics maps onto reality, that the laws of physics are the same here as in a galaxy ten billion light-years away.`

// --- SVG anime character (simple silhouette with walk animation) ---
function createCharacterSVG(): string {
  // A simple anime-style girl silhouette in black dress
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100" height="160">
    <!-- Hair -->
    <ellipse cx="50" cy="28" rx="22" ry="26" fill="#1a1a2e"/>
    <ellipse cx="50" cy="24" rx="20" ry="22" fill="#2d2d44"/>
    <!-- Hair sides -->
    <path d="M28 28 Q24 60 30 80 L34 60 Q32 40 30 28Z" fill="#1a1a2e"/>
    <path d="M72 28 Q76 60 70 80 L66 60 Q68 40 70 28Z" fill="#1a1a2e"/>
    <!-- Face -->
    <ellipse cx="50" cy="30" rx="16" ry="18" fill="#fce4d6"/>
    <!-- Eyes -->
    <ellipse cx="43" cy="28" rx="3.5" ry="4" fill="#1a1a2e"/>
    <ellipse cx="57" cy="28" rx="3.5" ry="4" fill="#1a1a2e"/>
    <ellipse cx="43.8" cy="27.5" rx="1.5" ry="1.8" fill="#fff"/>
    <ellipse cx="57.8" cy="27.5" rx="1.5" ry="1.8" fill="#fff"/>
    <!-- Mouth -->
    <path d="M46 36 Q50 39 54 36" stroke="#d4967a" stroke-width="1" fill="none"/>
    <!-- Blush -->
    <ellipse cx="39" cy="34" rx="4" ry="2" fill="rgba(255,150,150,0.3)"/>
    <ellipse cx="61" cy="34" rx="4" ry="2" fill="rgba(255,150,150,0.3)"/>
    <!-- Neck -->
    <rect x="46" y="46" width="8" height="8" rx="2" fill="#fce4d6"/>
    <!-- Dress body -->
    <path d="M34 54 Q32 56 30 80 L38 80 Q42 68 50 68 Q58 68 62 80 L70 80 Q68 56 66 54 Q58 50 50 50 Q42 50 34 54Z" fill="#2a2a2a"/>
    <!-- Collar -->
    <path d="M40 52 L50 58 L60 52" stroke="#fff" stroke-width="1.5" fill="none"/>
    <!-- Skirt -->
    <path d="M28 80 Q26 105 24 110 L76 110 Q74 105 72 80Z" fill="#2a2a2a"/>
    <!-- Skirt folds -->
    <path d="M40 80 L38 110" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <path d="M50 80 L50 110" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <path d="M60 80 L62 110" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <!-- Legs -->
    <line x1="42" y1="110" x2="40" y2="142" stroke="#fce4d6" stroke-width="6" stroke-linecap="round"/>
    <line x1="58" y1="110" x2="60" y2="142" stroke="#fce4d6" stroke-width="6" stroke-linecap="round"/>
    <!-- Shoes -->
    <ellipse cx="39" cy="145" rx="7" ry="4" fill="#1a1a2e"/>
    <ellipse cx="61" cy="145" rx="7" ry="4" fill="#1a1a2e"/>
    <!-- Arms -->
    <line x1="34" y1="56" x2="24" y2="82" stroke="#fce4d6" stroke-width="5" stroke-linecap="round"/>
    <line x1="66" y1="56" x2="76" y2="82" stroke="#fce4d6" stroke-width="5" stroke-linecap="round"/>
    <!-- Hands -->
    <circle cx="24" cy="83" r="3.5" fill="#fce4d6"/>
    <circle cx="76" cy="83" r="3.5" fill="#fce4d6"/>
    <!-- Hair bangs -->
    <path d="M30 18 Q35 8 42 16 Q44 8 50 14 Q52 6 58 14 Q62 8 68 16 Q72 10 70 22 L30 22Z" fill="#1a1a2e"/>
  </svg>`
}

// --- Init ---
await document.fonts.ready

const prep = prepareWithSegments(TEXT, FONT_STR)
const stage = document.getElementById('stage')!

// Create character element
const charEl = document.createElement('div')
charEl.className = 'character'
charEl.innerHTML = createCharacterSVG()
charEl.style.width = CHAR_W + 'px'
charEl.style.height = CHAR_H + 'px'
stage.appendChild(charEl)

// Column rule
const ruleEl = document.createElement('div')
ruleEl.className = 'col-rule'
stage.appendChild(ruleEl)

// Header
const headerEl = document.createElement('div')
headerEl.className = 'header'
headerEl.textContent = 'On the Nature of Things'
stage.appendChild(headerEl)

// --- Character movement state ---
let charX = -200
let charY = -200
let walkPhase = 0
let facingRight = true

// Walk bob for simple animation
function getWalkBob(phase: number): number {
  return Math.sin(phase * 6) * 3
}

// Figure-8 path across the page
function getCharPos(t: number, W: number, H: number): { x: number; y: number } {
  const cx = W / 2
  const cy = H / 2
  const rx = W * 0.32
  const ry = H * 0.25
  // Lemniscate of Bernoulli (figure-8)
  const sint = Math.sin(t)
  const cost = Math.cos(t)
  const denom = 1 + sint * sint
  return {
    x: cx + (rx * cost) / denom,
    y: cy + (ry * sint * cost) / denom,
  }
}

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

function rectInterval(
  rx: number, ry: number, rw: number, rh: number, pad: number,
  bandTop: number, bandBot: number,
): Interval | null {
  const top = ry - pad
  const bot = ry + rh + pad
  if (bandTop >= bot || bandBot <= top) return null
  return { left: rx - pad, right: rx + rw + pad }
}

function carveSlots(baseL: number, baseR: number, blocked: Interval[]): Interval[] {
  let slots: Interval[] = [{ left: baseL, right: baseR }]
  for (const b of blocked) {
    const next: Interval[] = []
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) { next.push(s); continue }
      if (b.left > s.left) next.push({ left: s.left, right: b.left })
      if (b.right < s.right) next.push({ left: b.right, right: s.right })
    }
    slots = next
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT)
}

// --- Two-column layout with character obstacle ---
function layoutAllColumns(W: number, H: number): { text: string; x: number; y: number }[] {
  const colW = (W - GUTTER * 2 - COL_GAP) / 2
  const colLeft1 = GUTTER
  const colRight1 = GUTTER + colW
  const colLeft2 = GUTTER + colW + COL_GAP
  const colRight2 = W - GUTTER
  const startY = TOP_PAD
  const endY = H - 30

  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  const lines: { text: string; x: number; y: number }[] = []
  let y = startY
  let col = 0 // 0 = left, 1 = right

  while (y < endY) {
    const colL = col === 0 ? colLeft1 : colLeft2
    const colR = col === 0 ? colRight1 : colRight2
    const bandTop = y
    const bandBot = y + LH

    // Check character obstacle
    const blocked: Interval[] = []
    const iv = rectInterval(charX, charY, CHAR_W, CHAR_H, CHAR_PAD, bandTop, bandBot)
    if (iv) blocked.push(iv)

    const slots = carveSlots(colL, colR, blocked)
    if (slots.length === 0) { y += LH; continue }

    let advanced = false
    for (const slot of slots) {
      const slotW = slot.right - slot.left
      const line = layoutNextLine(prep, cursor, slotW)
      if (line === null) {
        // Text exhausted — wrap if in left column
        if (col === 0) {
          col = 1
          y = startY
          advanced = true
        }
        break
      }
      lines.push({ text: line.text, x: slot.left, y })
      cursor = line.end
      advanced = true
    }
    if (!advanced) break
    y += LH

    // Overflow to next column
    if (y >= endY && col === 0) {
      col = 1
      y = startY
    }
  }
  return lines
}

// --- Render ---
const startTime = performance.now()

function render() {
  const W = innerWidth
  const H = innerHeight
  const elapsed = (performance.now() - startTime) / 1000

  // Character path
  const speed = 0.3
  const pos = getCharPos(elapsed * speed, W, H)
  const prevPos = getCharPos(elapsed * speed - 0.01, W, H)
  facingRight = pos.x > prevPos.x

  // Smooth follow
  charX += (pos.x - CHAR_W / 2 - charX) * 0.08
  charY += (pos.y - CHAR_H / 2 - charY) * 0.08

  walkPhase = elapsed * speed
  const bob = getWalkBob(walkPhase)

  // Position character
  charEl.style.transform = `translate(${charX}px, ${charY + bob}px) scaleX(${facingRight ? 1 : -1})`

  // Column rule
  const colW = (W - GUTTER * 2 - COL_GAP) / 2
  const ruleX = GUTTER + colW + COL_GAP / 2
  ruleEl.style.left = ruleX + 'px'
  ruleEl.style.top = TOP_PAD + 'px'
  ruleEl.style.height = (H - TOP_PAD - 30) + 'px'

  // Header
  headerEl.style.left = GUTTER + 'px'
  headerEl.style.top = '20px'

  // Layout
  const allLines = layoutAllColumns(W, H)

  let lineIdx = 0
  for (const l of allLines) {
    const el = getLine(lineIdx)
    el.textContent = l.text
    el.style.left = l.x + 'px'
    el.style.top = l.y + 'px'
    el.style.display = 'block'
    lineIdx++
  }
  for (let i = lineIdx; i < linePool.length; i++) linePool[i].style.display = 'none'

  requestAnimationFrame(render)
}

requestAnimationFrame(render)
