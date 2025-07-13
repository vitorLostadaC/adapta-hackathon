import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { FaCircleStop, FaMicrophone } from 'react-icons/fa6'

// Utility to create a File from a Blob with a timestamped filename
const createAudioFile = (blob: Blob) =>
  new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })

export const Header = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [elapsed, setElapsed] = useState(0)

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

  // --- Voice activity detection -------------------------------------------
  useEffect(() => {
    if (!isRecording || !stream) return

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

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      audioContext.close()
    }
  }, [isRecording, stream])

  // --- Timer --------------------------------------------------------------
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording) {
      interval = setInterval(() => setElapsed((prev) => prev + 1), 1000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  // --- Public controls -----------------------------------------------------
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(mediaStream)
      setIsRecording(true)
    } catch (error) {
      console.error('Could not access microphone', error)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)

    stopCurrentRecorder()

    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)

    analyserRef.current?.disconnect()
    audioContextRef.current?.close()
    analyserRef.current = null
    audioContextRef.current = null
  }

  const handleToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const secs = String(totalSeconds % 60).padStart(2, '0')
    return `${hrs}:${mins}:${secs}`
  }

  return (
    <div className="w-full flex items-center justify-center shadow-xl region-drag bg-gray-950 h-20 rounded-md px-10">
      <button
        type="button"
        className="region-noDrag"
        onClick={handleToggle}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <FaCircleStop className="text-red-700 hover:text-red-800" size={20} />
        ) : (
          <FaMicrophone className="text-green-600 hover:text-green-700" size={20} />
        )}
      </button>

      <span className="text-gray-500 region-noDrag ml-4">{formatTime(elapsed)}</span>
    </div>
  )
}
