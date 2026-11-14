// Render the original procedurally composed melody as WAV and play it via
// HTMLAudioElement. iOS Safari can mute Web Audio oscillators on the speaker
// while still allowing explicitly initiated media playback.
const RATE = 22050
const BAR = 4.5
const chords = [[50,57,62,66,69],[47,54,59,62,66],[43,50,55,59,66],[45,52,57,62,64]]
const hz = n => 440 * 2 ** ((n - 69) / 12)

let player = null
let musicUrl = null
let chimeUrl = null
let playing = false

function addNote(buffer, note, start, duration, loudness, pad = false) {
  const startSample = Math.floor(start * RATE)
  const length = Math.floor(duration * RATE)
  const step = 2 * Math.PI * hz(note) / RATE
  const attack = pad ? .75 : .02
  const release = pad ? .8 : .48
  for (let i = 0; i < length; i++) {
    const t = i / RATE
    const envelope = Math.min(1, t / attack, (duration - t) / release)
    const phase = step * i
    const wave = pad ? .7 * Math.sin(phase) + .3 * Math.sin(phase * 2) : Math.sin(phase)
    let offset = startSample + i
    if (offset >= buffer.length) offset %= buffer.length
    buffer[offset] += wave * Math.max(0, envelope) * loudness
  }
}

function wavUrl(samples) {
  const bytes = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(bytes)
  const string = (at, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i))
  }
  string(0, 'RIFF')
  view.setUint32(4, bytes.byteLength - 8, true)
  string(8, 'WAVE')
  string(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono: compatible with phone speakers
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  string(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.tanh(samples[i] * 2.7) * .82
    view.setInt16(44 + i * 2, Math.round(v * 32767), true)
  }
  return URL.createObjectURL(new Blob([bytes], {type:'audio/wav'}))
}

function getMusicUrl() {
  if (musicUrl) return musicUrl
  const samples = new Float32Array(Math.floor(BAR * chords.length * RATE))
  chords.forEach((chord, bar) => {
    const start = bar * BAR
    chord.slice(0,3).forEach(note => addNote(samples,note,start,4.8,.067,true))
    const melody = bar % 2 ? [4,2,3] : [2,4,3]
    melody.forEach((index,i) => {
      const t = start + .23 + [0,1.3,2.85][i]
      addNote(samples,chord[index]+12,t,1.8,.13)
      addNote(samples,chord[index]+24,t,.45,.025)
      addNote(samples,chord[index]+12,t+.27,1.7,.028)
    })
  })
  musicUrl = wavUrl(samples)
  return musicUrl
}

function getChimeUrl() {
  if (chimeUrl) return chimeUrl
  const samples = new Float32Array(Math.floor(2.1 * RATE))
  ;[78,81,85].forEach((note,i) => addNote(samples,note,i*.16,1.6,.17))
  chimeUrl = wavUrl(samples)
  return chimeUrl
}

let stopVersion = 0

function getPlayer() {
  if (!player) {
    player = new Audio(getMusicUrl())
    player.loop = true
    player.preload = 'auto'
    player.volume = .9
  }
  return player
}

export function isMusicPlaying() {
  return playing && player !== null && !player.paused
}

// Try immediately on page load. If autoplay is blocked, calling this again
// synchronously from the user's first touch/click unlocks it on mobile.
export async function startMusic() {
  if (isMusicPlaying()) return true
  const generation = stopVersion
  try {
    const audio = getPlayer()
    await audio.play()
    if (generation !== stopVersion) return false
    playing = true
    return true
  } catch {
    if (generation === stopVersion) playing = false
    return false
  }
}

export function stopMusic() {
  stopVersion += 1
  player?.pause()
  playing = false
  return false
}

export function toggleMusic() {
  return isMusicPlaying() ? Promise.resolve(stopMusic()) : startMusic()
}

export async function resumeMusic() {
  if (!playing || !player) return false
  if (!player.paused) return true
  try {
    await player.play()
    return true
  } catch { return false }
}

export function chime() {
  if (!playing) return
  const sound = new Audio(getChimeUrl())
  sound.volume = .65
  sound.play().catch(() => {})
}
