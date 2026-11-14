let context
let master
let timer
let playing = false
let bar = 0
let nextBar = 0
const progression = [[50,57,62,66,69],[47,54,59,62,66],[43,50,55,59,66],[45,52,57,62,64]]
const pitch = note => 440 * 2 ** ((note - 69) / 12)

function voice(note, start, duration, volume, pad = false) {
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
  const now = context.currentTime
  if (nextBar < now) nextBar = now + .04
  if (nextBar > now + .35) return
  const chord = progression[bar % progression.length]
  chord.slice(0,3).forEach(note => voice(note, nextBar, 4.8, .048, true))
  const melody = bar % 2 ? [4,2,3] : [2,4,3]
  melody.forEach((index, i) => {
    const start = nextBar + .23 + [0,1.3,2.85][i]
    voice(chord[index]+12,start,1.8,.12)
    voice(chord[index]+24,start, .45,.025)
    voice(chord[index]+12,start+.27,1.7,.027)
  })
  bar++
  nextBar += 4.5
}

export function toggleMusic() {
  if (playing) {
    playing = false
    clearInterval(timer)
    const previous = context
    master.gain.setTargetAtTime(.0001, previous.currentTime, .07)
    setTimeout(() => previous.close().catch(() => {}), 400)
    return false
  }
  const Audio = window.AudioContext || window.webkitAudioContext
  if (!Audio) return false
  context = new Audio()
  context.resume().catch(() => {})
  master = context.createGain()
  master.gain.value = .38
  master.connect(context.destination)
  playing = true
  nextBar = context.currentTime + .03
  schedule()
  timer = setInterval(schedule, 180)
  return true
}

export function chime() {
  if (!playing) return
  const start = context.currentTime + .015
  ;[78,81,85].forEach((note,i) => voice(note,start+i*.16,1.7,.13))
}
