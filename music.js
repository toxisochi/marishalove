let context
let master
let timer
let playing = false
let starting = false
let bar = 0
let nextBar = 0

const progression = [[50,57,62,66,69],[47,54,59,62,66],[43,50,55,59,66],[45,52,57,62,64]]
const pitch = note => 440 * 2 ** ((note - 69) / 12)
const AudioContextClass = () => window.AudioContext || window.webkitAudioContext

function voice(note, start, duration, volume, pad = false) {
  if (!context || !master || context.state !== 'running') return
  const source = context.createOscillator()
  const gain = context.createGain()
  source.type = pad ? 'triangle' : 'sine'
  source.frequency.value = pitch(note)
  gain.gain.setValueAtTime(.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + (pad ? .85 : .014))
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration)
  source.connect(gain).connect(master)
  source.start(start)
  source.stop(start + duration + .05)
  source.onended = () => { source.disconnect(); gain.disconnect() }
}

function schedule() {
  if (!playing || !context || context.state !== 'running') return
  const now = context.currentTime
  if (nextBar < now) nextBar = now + .04
  if (nextBar > now + .35) return
  const chord = progression[bar % progression.length]
  chord.slice(0,3).forEach(note => voice(note, nextBar, 4.8, .075, true))
  const melody = bar % 2 ? [4,2,3] : [2,4,3]
  melody.forEach((index, i) => {
    const start = nextBar + .23 + [0,1.3,2.85][i]
    voice(chord[index]+12,start,1.8,.17)
    voice(chord[index]+24,start,.45,.035)
    voice(chord[index]+12,start+.27,1.7,.04)
  })
  bar++
  nextBar += 4.5
}

function stopMusic() {
  playing = false
  starting = false
  clearInterval(timer)
  timer = undefined
  const old = context
  const oldMaster = master
  context = undefined
  master = undefined
  if (old && oldMaster) {
    try { oldMaster.gain.setTargetAtTime(.0001, old.currentTime, .07) } catch {}
    setTimeout(() => old.close().catch(() => {}), 400)
  }
}

export async function toggleMusic() {
  if (playing || starting) {
    stopMusic()
    return false
  }
  const Audio = AudioContextClass()
  if (!Audio) return false
  starting = true
  let audio
  try {
    // Called directly from the sound button's tap/click handler.
    audio = new Audio()
    context = audio
    master = audio.createGain()
    master.gain.value = .58
    master.connect(audio.destination)

    // Start a quiet oscillator synchronously inside the tap handler.
    // This unlocks Web Audio on iOS Safari and some in-app browsers.
    const unlock = audio.createOscillator()
    const unlockGain = audio.createGain()
    unlockGain.gain.value = .0001
    unlock.connect(unlockGain).connect(master)
    unlock.start()
    unlock.stop(audio.currentTime + .06)
    unlock.onended = () => { unlock.disconnect(); unlockGain.disconnect() }

    await Promise.race([
      audio.resume(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Audio unlock timed out')), 3500))
    ])
    if (context !== audio || !starting) {
      await audio.close().catch(() => {})
      return false
    }
    if (audio.state !== 'running') {
      stopMusic()
      return false
    }
    starting = false
    playing = true
    bar = 0
    nextBar = audio.currentTime + .04
    schedule()
    // Gentle audible confirmation, so a phone user knows music started.
    voice(81, audio.currentTime + .04, .55, .09)
    timer = setInterval(schedule, 180)
    return true
  } catch {
    stopMusic()
    return false
  }
}

export async function resumeMusic() {
  if (!playing || !context) return false
  try {
    if (context.state !== 'running') await context.resume()
    if (context.state !== 'running') return false
    nextBar = context.currentTime + .04
    schedule()
    return true
  } catch { return false }
}

export function chime() {
  if (!playing || !context || context.state !== 'running') return
  const start = context.currentTime + .015
  ;[78,81,85].forEach((note,i) => voice(note,start+i*.16,1.7,.13))
}
