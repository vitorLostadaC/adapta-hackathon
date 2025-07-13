import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { FaCircleStop, FaMicrophone } from 'react-icons/fa6'
import { useVoiceActivatedRecorder } from '../../hooks/useVoiceActivatedRecorder'

// Helper to capture system/desktop audio inside Electron
type ElectronType = typeof import('electron')

const captureSystemAudio = async (): Promise<MediaStream | null> => {
  // Access Electron desktopCapturer exposed via preload (electronAPI)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (window as any).electron as ElectronType | undefined
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

// Utility to wrap a blob in a File with a timestamped name
const createAudioFile = (blob: Blob) =>
  new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })

export const Header = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [sysStream, setSysStream] = useState<MediaStream | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // ---------- Networking helpers ----------------------------------------
  const sendUserChunk = useCallback(async (blob: Blob) => {
    const formData = new FormData()
    formData.append('audio', createAudioFile(blob))
    try {
      await axios.post('http://localhost:3333/transcribe?type=user', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
      console.error('Failed to send USER audio chunk', error)
    }
  }, [])

  const sendCustomerChunk = useCallback(async (blob: Blob) => {
    const formData = new FormData()
    formData.append('audio', createAudioFile(blob))
    try {
      await axios.post('http://localhost:3333/transcribe?type=customer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
      console.error('Failed to send CUSTOMER audio chunk', error)
    }
  }, [])

  // ---------- Voice-activated recording ----------------------------------
  useVoiceActivatedRecorder(micStream, isRecording, sendUserChunk)
  useVoiceActivatedRecorder(sysStream, isRecording, sendCustomerChunk)

  // ---------- Timer ------------------------------------------------------
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

  // ---------- Controls ---------------------------------------------------
  const startRecording = async () => {
    try {
      // Microphone stream
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(mic)

      // Attempt to capture system/desktop audio as well (no video)
      try {
        let sys: MediaStream | null = await captureSystemAudio()
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

    micStream?.getTracks().forEach((t) => t.stop())
    sysStream?.getTracks().forEach((t) => t.stop())
    setMicStream(null)
    setSysStream(null)
  }

  const handleToggle = () => {
    if (isRecording) stopRecording()
    else startRecording()
  }

  // HH:MM:SS
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
