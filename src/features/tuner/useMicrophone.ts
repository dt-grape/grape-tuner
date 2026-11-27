import { useEffect, useRef, useState } from 'react'
import { BUFFER_SIZE, createPitchAnalyzer, quietSignal, type Signal } from './pitch'

export type MicError = 'denied' | 'missing' | 'busy' | 'unsupported' | 'insecure' | 'interrupted'
export type MicStatus = 'off' | 'requesting' | 'on' | 'paused'
interface Session {
  context: AudioContext
  stream?: MediaStream
  frame?: number
}

function release(session: Session) {
  if (session.frame !== undefined) cancelAnimationFrame(session.frame)
  session.context.onstatechange = null
  for (const track of session.stream?.getTracks() ?? []) {
    track.onended = null
    track.onmute = null
    track.onunmute = null
    track.stop()
  }
  if (session.context.state !== 'closed') void session.context.close().catch(() => undefined)
}

function audioError(error: unknown): MicError {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'missing'
  return 'busy'
}

export function useMicrophone(sensitivity: number) {
  const [status, setStatus] = useState<MicStatus>('off')
  const [error, setError] = useState<MicError | null>(null)
  const [signal, setSignal] = useState<Signal>(quietSignal)
  const sessionRef = useRef<Session | null>(null)
  const sensitivityRef = useRef(sensitivity)
  useEffect(() => { sensitivityRef.current = sensitivity }, [sensitivity])

  function stop(reason: MicError | null = null) {
    const session = sessionRef.current
    sessionRef.current = null
    if (session) release(session)
    setSignal(quietSignal)
    setStatus('off')
    setError(reason)
  }

  async function start() {
    if (sessionRef.current) return
    setError(null)
    if (!window.isSecureContext) return setError('insecure')
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio || !navigator.mediaDevices?.getUserMedia) return setError('unsupported')

    let context: AudioContext
    try {
      context = new Audio()
    } catch (reason) {
      setError(audioError(reason))
      return
    }

    const session: Session = { context }
    sessionRef.current = session
    setStatus('requesting')
    void context.resume().catch(() => undefined)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      if (sessionRef.current !== session) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      session.stream = stream
      const source = context.createMediaStreamSource(stream)
      const highPass = context.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 29
      const lowPass = context.createBiquadFilter()
      lowPass.type = 'lowpass'
      lowPass.frequency.value = 2600
      const analyser = context.createAnalyser()
      analyser.fftSize = context.sampleRate > 96000 ? BUFFER_SIZE * 2 : BUFFER_SIZE
      source.connect(highPass).connect(lowPass).connect(analyser)

      const samples = new Float32Array(analyser.fftSize)
      const pitch = createPitchAnalyzer(samples.length)
      let last = -Infinity

      function frame(time: number) {
        if (sessionRef.current !== session) return
        session.frame = requestAnimationFrame(frame)
        if (document.hidden || context.state !== 'running' || time - last < 42) return
        last = time
        analyser.getFloatTimeDomainData(samples)
        setSignal(pitch.analyze(samples, context.sampleRate, sensitivityRef.current, time))
      }

      function syncState() {
        if (sessionRef.current !== session) return
        const paused = document.hidden || context.state !== 'running' || stream.getAudioTracks().every((track) => track.muted)
        setStatus(paused ? 'paused' : 'on')
        if (paused) {
          pitch.reset()
          setSignal(quietSignal)
          if (session.frame !== undefined) cancelAnimationFrame(session.frame)
          session.frame = undefined
        } else if (session.frame === undefined) {
          session.frame = requestAnimationFrame(frame)
        }
      }

      for (const track of stream.getAudioTracks()) {
        track.onended = () => { if (sessionRef.current === session) stop('interrupted') }
        track.onmute = syncState
        track.onunmute = syncState
      }
      context.onstatechange = syncState
      syncState()
    } catch (reason) {
      if (sessionRef.current === session) stop(audioError(reason))
    }
  }

  function resume() {
    const session = sessionRef.current
    if (!session?.stream) return
    if (session.stream.getAudioTracks().every((track) => track.muted || track.readyState === 'ended')) {
      stop()
      void start()
      return
    }
    void session.context.resume().catch(() => { if (sessionRef.current === session) stop('interrupted') })
  }

  useEffect(() => {
    function restore() {
      const session = sessionRef.current
      if (!session?.stream) return
      const { context } = session
      context.onstatechange?.(new Event('statechange'))
      if (!document.hidden && context.state !== 'running') void context.resume().catch(() => undefined)
    }

    function onPageHide(event: PageTransitionEvent) {
      if (event.persisted) restore()
      else stop()
    }

    document.addEventListener('visibilitychange', restore)
    window.addEventListener('pageshow', restore)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', restore)
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('pagehide', onPageHide)
      const session = sessionRef.current
      sessionRef.current = null
      if (session) release(session)
    }
  }, [])

  return { status, error, signal, start, stop, resume }
}
