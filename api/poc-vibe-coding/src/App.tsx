import axios from 'axios'
import { useEffect, useRef, useState } from 'react'

// Utility to create a File from a Blob with a timestamped filename
const createAudioFile = (blob: Blob) =>
  new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })

function App() {
  const [recording, setRecording] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // --- Helpers -------------------------------------------------------------
  const stopCurrentRecorder = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    recorder.stop()
    mediaRecorderRef.current = null
  }

  const startNewRecorder = () => {
    if (!stream) return
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    recorder.onstop = () => {
      if (!chunks.length) return
      const blob = new Blob(chunks, { type: 'audio/webm' })
      sendChunk(blob)
    }

    recorder.start()
    mediaRecorderRef.current = recorder
  }

  const sendChunk = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', createAudioFile(blob))
      await axios.post('http://localhost:3333/transcribe?type=user', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
       
      console.error('Failed to send audio chunk', error)
    }
  }

  // --- Voice activity detection -------------------------------------------
  useEffect(() => {
    if (!recording || !stream) return

    // Set up AudioContext + Analyser when we start recording
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.fftSize)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const SILENCE_THRESHOLD = 0.02 // Adjust this (0..1) – lower => more sensitive
    const SILENCE_DURATION_MS = 600 // How long (ms) of silence before we cut the chunk

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray)
      // Compute RMS volume
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / dataArray.length)

      if (rms > SILENCE_THRESHOLD) {
        // Speaking
        silenceStartRef.current = null
        if (!mediaRecorderRef.current) {
          startNewRecorder()
        }
      } else if (mediaRecorderRef.current) {
        // Possibly silence
        if (silenceStartRef.current === null) {
          silenceStartRef.current = performance.now()
        } else if (performance.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
          // Considered silence long enough → finalize current chunk
          stopCurrentRecorder()
          silenceStartRef.current = null
        }
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    tick()

    // Cleanup on stop recording
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      audioContext.close()
    }
  }, [recording, stream])

  // --- Public controls -----------------------------------------------------
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(mediaStream)
      setRecording(true)
    } catch (error) {
       
      console.error('Could not access microphone', error)
    }
  }

  const stopRecording = () => {
    setRecording(false)

    // Stop VAD loop
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

    stopCurrentRecorder()

    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)

    analyserRef.current?.disconnect()
    audioContextRef.current?.close()
    analyserRef.current = null
    audioContextRef.current = null
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 24 }}>
      <button onClick={startRecording} disabled={recording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!recording}>
        Stop Recording
      </button>
    </div>
  )
}

export default App
