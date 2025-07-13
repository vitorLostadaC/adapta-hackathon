/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import vad from 'voice-activity-detection'

function AudioVADRecorder() {
  const [recording, setRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const vadHandleRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (vadHandleRef.current) vadHandleRef.current.destroy()
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create a dedicated AudioContext – required by the VAD helper
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Initialise MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = handleSendAudio

      // Setup Voice Activity Detection
      vadHandleRef.current = vad(audioContext, stream, {
        onVoiceStart: () => {
          if (mediaRecorder.state === 'inactive') mediaRecorder.start()
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        },
        onVoiceStop: () => {
          // small delay to avoid cutting words when user makes short pauses
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorder.state === 'recording') mediaRecorder.stop()
          }, 500)
        },
        // other VAD options can be set here (see library docs)
      })

      setRecording(true)
    } catch (err) {
      alert('Error accessing microphone: ' + (err as Error).message)
    }
  }

  const stopRecording = () => {
    if (vadHandleRef.current) vadHandleRef.current.destroy()
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    setRecording(false)
  }

  const handleSendAudio = async () => {
    if (!chunksRef.current.length) return

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', blob, 'audio.webm')

    try {
      const response = await axios.post('http://localhost:3333/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTranscription(response.data.transcription)
    } catch (err) {
      alert('Error sending audio: ' + (err as Error).message)
    }

    // Prepare for next recording session
    chunksRef.current = []
    setRecording(false)
  }

  return (
    <div className="app-container">
      <h1>Voice Transcription</h1>

      <div className="btn-wrapper">
        <button
          onClick={startRecording}
          disabled={recording}
          className={`record-btn ${recording ? 'recording' : ''}`}
        >
          {recording ? (
            <>
              <span className="recording-dot"></span> Recording...
            </>
          ) : (
            '🎤 Start Recording'
          )}
        </button>
        {recording && (
          <button onClick={stopRecording} className="record-btn" style={{ marginLeft: 8 }}>
            Stop
          </button>
        )}
      </div>

      <div className="transcription-container">
        <h3>Transcription:</h3>
        <p>{transcription || 'Click the record button to start transcribing...'}</p>
      </div>
    </div>
  )
}

export default AudioVADRecorder 
