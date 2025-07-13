import { useEffect, useRef } from 'react'

interface Options {
  silenceThreshold?: number
  silenceDurationMs?: number
}

/**
 * useVoiceActivatedRecorder
 * -------------------------
 * Records audio from a MediaStream only while speech is detected.
 * Once silence lasts longer than `silenceDurationMs`, the current
 * chunk is finalised and delivered through the `onChunk` callback.
 *
 * @param stream The audio source (MediaStream).
 * @param active When false, any ongoing recording is stopped and the hook is disabled.
 * @param onChunk Callback that receives each recorded Blob once the user stops speaking.
 * @param options Configuration for VAD thresholds.
 */
export const useVoiceActivatedRecorder = (
  stream: MediaStream | null,
  active: boolean,
  onChunk: (blob: Blob) => void | Promise<void>,
  { silenceThreshold = 0.02, silenceDurationMs = 500 }: Options = {}
) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !stream) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.fftSize)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const stopCurrentRecorder = () => {
      const rec = mediaRecorderRef.current
      if (!rec) return
      rec.stop()
      mediaRecorderRef.current = null
    }

    const startNewRecorder = () => {
      if (!stream) return
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        if (!chunks.length) return
        const blob = new Blob(chunks, { type: 'audio/webm' })
        onChunk(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
    }

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / dataArray.length)

      if (rms > silenceThreshold) {
        // Speaking detected
        silenceStartRef.current = null
        if (!mediaRecorderRef.current) startNewRecorder()
      } else if (mediaRecorderRef.current) {
        // Potential silence
        if (silenceStartRef.current === null) {
          silenceStartRef.current = performance.now()
        } else if (performance.now() - silenceStartRef.current > silenceDurationMs) {
          stopCurrentRecorder()
          silenceStartRef.current = null
        }
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      stopCurrentRecorder()
      analyser.disconnect()
      audioContext.close()
    }
  }, [active, stream, silenceThreshold, silenceDurationMs, onChunk])
}
