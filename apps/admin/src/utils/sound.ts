/**
 * 新订单提示音：WebAudio 合成（无音频资源依赖）。
 * 浏览器自动播放策略：首次用户交互后才生效，失败静默忽略。
 */
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 双音提示：叮-咚 */
export function playDing(): void {
  const audio = getContext()
  if (!audio) return
  try {
    const now = audio.currentTime
    const notes: Array<[number, number]> = [
      [880, 0],
      [1318, 0.16],
    ]
    for (const [freq, offset] of notes) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
      osc.connect(gain).connect(audio.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    }
  } catch {
    // 自动播放被拦截等情况，忽略
  }
}
