/**
 * OpeningScene — interactive turn-based chat → narration → world
 *
 * POV: The girlfriend (Moncakesss) waking up and seeing the boyfriend's texts.
 *   LEFT  = boyfriend's incoming messages (auto-display)
 *   RIGHT = her replies (player taps to send each one)
 *
 * Flow:
 *   BEDROOM → NOTIFICATION → ZOOM → CHAT (interactive) → NARRATION → DONE
 *
 * "Ignore" at any chat turn → explosion → game over screen
 * All replies sent → narration plays → world loads
 */

// ── Script ───────────────────────────────────────────────────────────────

const SCRIPT = [
  {
    incoming: [{ side: 'left', text: 'Uy haha' }],
    reply:    { side: 'right', text: 'Uy ka din hahaha' },
  },
  {
    incoming: [
      { side: 'left', text: 'Labor Day na HAHHA' },
      { side: 'left', text: 'magpahinga kana HAHAH' },
    ],
    reply:    { side: 'right', text: 'Ano yan' },
  },
  {
    incoming: [{ side: 'left', text: 'baka Pagod kana sa buhay haha' }],
    reply:    { side: 'right', text: 'Wala kami nyan dto' },
  },
  {
    incoming: [],
    reply:    { side: 'right', text: 'Hahahaha' },
  },
]

// Each line is one paragraph — tap to advance, auto-advances after 5 s
const NARRATION = [
  "That conversation you just read...\nIt looks so ordinary, right?",
  '"Uy haha." Just two words.\nI almost didn\'t even send it.',
  "But that one message changed everything for me.",
  "Before you came, I was already praying for you.\nNot for a name or a face — just for the feeling of someone real.\nSomeone who\'d actually stay.",
  "And then there you were.\nJust like that.",
  "You became my mornings, my late nights,\nevery random thought I wanted to share,\nevery song that somehow sounds like you.",
  "I didn\'t just fall in love with you, Moncakesss.\nI made you part of my everything.\nAnd you already know that.",
  "I\'d choose you again.\nIn every version of this story, without hesitation.",
  "This world is yours.\n\nHappy Anniversary. 🌸",
]

// ── Constants ─────────────────────────────────────────────────────────────

const INCOMING_DELAY = 500
const NARRATION_MIN  = 1800   // minimum ms before tap can advance
const NARRATION_AUTO = 5500   // auto-advance after this many ms
const BOOM_COLORS    = ['#ff4422','#ff7700','#ffcc00','#ff5500','#ff2244','#ffffff','#ffaa00']
const BOOM_COUNT     = 65

// ── Class ─────────────────────────────────────────────────────────────────

export class OpeningScene {
  constructor() {
    this._resolve       = null
    this._state         = 'IDLE'
    this._pendingChoice = null

    this._el = {
      bedroom:  document.getElementById('bedroom-overlay'),
      phone:    document.getElementById('bedroom-phone'),
      hint:     document.getElementById('bedroom-hint'),
      overlay:  document.getElementById('phone-overlay'),
      messages: document.getElementById('chat-messages'),
      choices:  document.getElementById('chat-choices'),
      ignore:   document.getElementById('choice-ignore'),
      reply:    document.getElementById('choice-reply'),
    }

    this._el.ignore.addEventListener('click', () => this._choose('ignore'))
    this._el.reply.addEventListener('click',  () => this._choose('reply'))
    document.getElementById('chat-back')
      ?.addEventListener('click', () => this._choose('ignore'))
    document.getElementById('gameover-retry')
      ?.addEventListener('click', () => location.reload())
  }

  play() {
    return new Promise(resolve => {
      this._resolve = resolve
      this._run()
    })
  }

  // ── Sequence ──────────────────────────────────────────────────────────

  async _run() {
    await this._runBedroom()
    await this._runZoom()
    const allReplied = await this._runChat()
    if (!allReplied) return  // explosion path — don't continue

    await this._runNarration()

    this._state = 'DONE'
    this._resolve('reply')
  }

  async _runBedroom() {
    this._state = 'BEDROOM'
    const { bedroom, phone, hint } = this._el

    bedroom.style.display = 'flex'
    await this._frame()
    bedroom.classList.add('faded-in')
    await this._wait(1000)

    this._state = 'NOTIFICATION'
    phone.classList.add('ringing')
    await this._wait(1400)

    hint.classList.add('visible')
    await Promise.race([
      new Promise(r => bedroom.addEventListener('click', r, { once: true })),
      this._wait(2800),
    ])
    hint.classList.remove('visible')
  }

  async _runZoom() {
    this._state = 'ZOOM'
    const { bedroom, overlay } = this._el

    bedroom.classList.add('zooming')
    overlay.classList.add('zoom-in')
    await this._wait(950)

    bedroom.style.display = 'none'
    overlay.classList.add('revealed')
  }

  /** Returns true if all replies sent, false if player chose to ignore */
  async _runChat() {
    this._state = 'CHAT'
    const container = this._el.messages

    for (let t = 0; t < SCRIPT.length; t++) {
      const { incoming, reply } = SCRIPT[t]

      for (let i = 0; i < incoming.length; i++) {
        await this._wait(t === 0 && i === 0 ? 400 : INCOMING_DELAY)
        this._addBubble(container, incoming[i])
      }

      await this._wait(350)
      const sent = await this._promptChoice(reply.text)

      if (!sent) return false

      this._addBubble(container, reply)
      await this._wait(250)
    }

    // Fade out phone UI before narration
    this._el.overlay.classList.add('fade-exit')
    await this._wait(500)
    this._el.overlay.style.display = 'none'

    return true
  }

  async _runNarration() {
    this._state = 'NARRATION'

    const overlay  = document.getElementById('narration-overlay')
    const textEl   = document.getElementById('narration-text')
    const dotsEl   = document.getElementById('narration-dots')
    const hintEl   = document.getElementById('narration-hint')
    const btnEl    = document.getElementById('narration-continue')
    const starsEl  = document.getElementById('narration-stars')

    // Spawn star field once
    for (let i = 0; i < 35; i++) {
      const s    = document.createElement('div')
      const size = 1 + Math.random() * 2.2
      s.className = 'nstar'
      s.style.cssText =
        `left:${(Math.random()*100).toFixed(1)}%;` +
        `top:${(Math.random()*100).toFixed(1)}%;` +
        `width:${size}px;height:${size}px;` +
        `animation-duration:${(2 + Math.random()*2.5).toFixed(2)}s;` +
        `animation-delay:${(Math.random()*3).toFixed(2)}s;`
      starsEl.appendChild(s)
    }

    // Fade in narration overlay
    overlay.style.display = 'flex'
    await this._frame()
    overlay.classList.add('visible')
    await this._wait(600)

    // Tap-to-advance handler (persistent across paragraphs)
    let tapResolve = null
    const onTap = () => { if (tapResolve) { const r = tapResolve; tapResolve = null; r() } }
    overlay.addEventListener('click', onTap)

    for (let i = 0; i < NARRATION.length; i++) {
      const isLast = i === NARRATION.length - 1

      // Update progress dots
      dotsEl.innerHTML = NARRATION.map((_, j) => {
        const cls = j < i ? 'ndot done' : j === i ? 'ndot active' : 'ndot'
        return `<span class="${cls}"></span>`
      }).join('')

      // Fade in paragraph
      textEl.textContent = NARRATION[i]
      await this._frame()
      await this._frame()
      textEl.classList.add('shown')

      if (isLast) {
        // Hide hint, show continue button (not tappable via overlay)
        hintEl.style.display = 'none'
        tapResolve = null
        await this._wait(900)
        btnEl.classList.add('visible')
        await new Promise(r => btnEl.addEventListener('click', r, { once: true }))
      } else {
        // Wait for tap (after minimum read time) or auto-advance
        await this._wait(NARRATION_MIN)
        await Promise.race([
          new Promise(r => { tapResolve = r }),
          this._wait(NARRATION_AUTO - NARRATION_MIN),
        ])
        tapResolve = null
      }

      // Fade out before next paragraph
      if (!isLast) {
        textEl.classList.remove('shown')
        await this._wait(400)
      }
    }

    overlay.removeEventListener('click', onTap)

    // Fade out narration
    overlay.classList.add('fade-out')
    await this._wait(800)
    overlay.style.display = 'none'
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  _promptChoice(replyText) {
    return new Promise(resolve => {
      this._pendingChoice = resolve
      this._el.reply.textContent = replyText
      this._el.choices.classList.add('visible')
    })
  }

  _choose(choice) {
    if (!this._pendingChoice) return
    const cb = this._pendingChoice
    this._pendingChoice = null
    this._el.choices.classList.remove('visible')

    if (choice === 'ignore') {
      this._state = 'DONE'
      this._explode()
      cb(false)
    } else {
      cb(true)
    }
  }

  _addBubble(container, { side, text }) {
    const el = document.createElement('div')
    el.className = `chat-bubble ${side}`
    el.textContent = text
    container.appendChild(el)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.classList.add('shown')
        container.scrollTop = container.scrollHeight
      })
    )
  }

  // ── Explosion ────────────────────────────────────────────────────────

  _explode() {
    this._el.overlay.classList.add('shake')

    setTimeout(() => {
      const boom = document.getElementById('explosion-overlay')
      boom.style.display = 'block'

      for (let i = 0; i < BOOM_COUNT; i++) {
        const angle = (i / BOOM_COUNT) * 360 + (Math.random() - 0.5) * 12
        const dist  = 100 + Math.random() * 380
        const size  = 5 + Math.random() * 20
        const color = BOOM_COLORS[i % BOOM_COLORS.length]
        const delay = Math.floor(Math.random() * 100)

        const p = document.createElement('div')
        p.className = 'boom-particle'
        p.style.cssText =
          `left:50%;top:50%;` +
          `width:${size}px;height:${size}px;` +
          `background:${color};` +
          `border-radius:${Math.random() > 0.45 ? '50%' : '3px'};` +
          `--dx:${(Math.cos(angle * Math.PI / 180) * dist).toFixed(1)}px;` +
          `--dy:${(Math.sin(angle * Math.PI / 180) * dist).toFixed(1)}px;` +
          `animation-delay:${delay}ms;`
        boom.appendChild(p)
      }

      boom.classList.add('flash')
    }, 140)

    setTimeout(() => {
      document.getElementById('explosion-overlay').classList.add('darkening')
    }, 480)

    setTimeout(() => {
      document.getElementById('gameover-screen').classList.add('visible')
    }, 1150)
  }

  _wait(ms) { return new Promise(r => setTimeout(r, ms)) }
  _frame()  { return new Promise(r => requestAnimationFrame(r)) }
}
