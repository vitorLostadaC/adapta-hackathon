import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { FaCircleStop, FaMicrophone } from 'react-icons/fa6'

// Helper to capture system/desktop audio inside Electron
const captureSystemAudio = async (): Promise<MediaStream | null> => {
  // Access Electron desktopCapturer exposed via preload (electronAPI)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron as typeof import('electron') | undefined
  if (!electron?.desktopCapturer) return null

  try {
    const sources = await electron.desktopCapturer.getSources({ types: ['screen'] })
    if (!sources.length) return null

    // Use first screen; adjust if you need a specific screen
    const sourceId = sources[0].id

    // @ts-ignore - chromium proprietary constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          // Capture system audio of the selected screen
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      }
    } as unknown as MediaStreamConstraints)

    // Drop video track – only need audio
    stream.getVideoTracks().forEach((t) => t.stop())
    return stream
  } catch (err) {
    console.warn('Failed to capture system audio', err)
    return null
  }
}

// Utility to create a File from a Blob with a timestamped filename
const createAudioFile = (blob: Blob) =>
  new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })

export const Header = () => {
  const [isRecording, setIsRecording] = useState(false)
  // Separate streams for mic (user) and system audio (customer)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [sysStream, setSysStream] = useState<MediaStream | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // ------ Mic (user) refs ------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // ------ System (customer) refs ------
  const sysMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const sysAudioContextRef = useRef<AudioContext | null>(null)
  const sysAnalyserRef = useRef<AnalyserNode | null>(null)
  const sysDataArrayRef = useRef<Uint8Array | null>(null)
  const sysSilenceStartRef = useRef<number | null>(null)
  const sysRafIdRef = useRef<number | null>(null)

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

  // --- System audio helpers -------------------------------------------
  const sendSysChunk = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', createAudioFile(blob))
      await axios.post('http://localhost:3333/transcribe?type=customer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
      console.error('Failed to send SYSTEM audio chunk', error)
    }
  }

  const stopCurrentSysRecorder = () => {
    const rec = sysMediaRecorderRef.current
    if (!rec) return
    rec.stop()
    sysMediaRecorderRef.current = null
  }

  const startNewSysRecorder = () => {
    if (!sysStream) return
    const recorder = new MediaRecorder(sysStream, { mimeType: 'audio/webm' })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = () => {
      if (!chunks.length) return
      const blob = new Blob(chunks, { type: 'audio/webm' })
      console.log('sending CUSTOMER chunk')
      sendSysChunk(blob)
    }

    recorder.start()
    sysMediaRecorderRef.current = recorder
  }

  const startNewRecorder = () => {
    if (!micStream) return
    const recorder = new MediaRecorder(micStream, { mimeType: 'audio/webm' })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    recorder.onstop = () => {
      if (!chunks.length) return
      const blob = new Blob(chunks, { type: 'audio/webm' })
      console.log('sending USER chunk')
      sendChunk(blob)
    }

    recorder.start()
    mediaRecorderRef.current = recorder
  }

  // --- Voice activity detection (MIC) ----------------------------------
  useEffect(() => {
    if (!isRecording || !micStream) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(micStream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.fftSize)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const SILENCE_THRESHOLD = 0.02 // Adjust this (0..1) – lower => more sensitive
    const SILENCE_DURATION_MS = 500 // How long (ms) of silence before we cut the chunk

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
  }, [isRecording, micStream])

  // --- Voice activity detection (SYSTEM) -------------------------------
  useEffect(() => {
    if (!isRecording || !sysStream) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(sysStream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.fftSize)

    sysAudioContextRef.current = audioContext
    sysAnalyserRef.current = analyser
    sysDataArrayRef.current = dataArray

    const SILENCE_THRESHOLD = 0.02
    const SILENCE_DURATION_MS = 500

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / dataArray.length)

      if (rms > SILENCE_THRESHOLD) {
        sysSilenceStartRef.current = null
        if (!sysMediaRecorderRef.current) startNewSysRecorder()
      } else if (sysMediaRecorderRef.current) {
        if (sysSilenceStartRef.current === null) {
          sysSilenceStartRef.current = performance.now()
        } else if (performance.now() - sysSilenceStartRef.current > SILENCE_DURATION_MS) {
          stopCurrentSysRecorder()
          sysSilenceStartRef.current = null
        }
      }

      sysRafIdRef.current = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (sysRafIdRef.current) cancelAnimationFrame(sysRafIdRef.current)
      audioContext.close()
    }
  }, [isRecording, sysStream])

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
      // Mic stream
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(mic)

      // Attempt to capture system/desktop audio as well (no video)
      try {
        let sys: MediaStream | null = null
        // Prefer desktopCapturer method
        sys = await captureSystemAudio()
        if (!sys) {
          // Fallback: prompt user to share screen with audio
          sys = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
          sys.getVideoTracks().forEach((t) => t.stop())
        }
        setSysStream(sys)
      } catch (err) {
        console.warn('System audio capture not granted or failed', err)
      }

      setIsRecording(true)
    } catch (error) {
      console.error('Could not access microphone', error)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    if (sysRafIdRef.current) cancelAnimationFrame(sysRafIdRef.current)

    stopCurrentRecorder()
    stopCurrentSysRecorder()

    micStream?.getTracks().forEach((t) => t.stop())
    sysStream?.getTracks().forEach((t) => t.stop())
    setMicStream(null)
    setSysStream(null)

    analyserRef.current?.disconnect()
    audioContextRef.current?.close()
    analyserRef.current = null
    audioContextRef.current = null

    sysAnalyserRef.current?.disconnect()
    sysAudioContextRef.current?.close()
    sysAnalyserRef.current = null
    sysAudioContextRef.current = null
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
