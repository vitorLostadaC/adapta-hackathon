import { useEffect, useRef, useState } from 'react'
import socket from '../services/socket'

interface TranscriptionPayload {
  transcript: string
  isFinal: boolean
}

interface UseRecorder {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  finalTranscription: string
  interimTranscription: string
}

function useRecorder(): UseRecorder {
  const [isRecording, setIsRecording] = useState(false)
  const [finalTranscription, setFinalTranscription] = useState('')
  const [interimTranscription, setInterimTranscription] = useState('')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)

  const startRecording = async () => {
    try {
      console.log('[Recorder] Requesting user media...')
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true
      })
      console.log('[Recorder] Media stream obtained')
      mediaRecorder.current = new MediaRecorder(stream.current, {
        mimeType: 'audio/webm'
      })

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log(
            `[Recorder] ondataavailable: sending chunk (${e.data.size} bytes)`
          )
          socket.emit('audio', { data: e.data, type: 'user' })
        }
      }

      mediaRecorder.current.onstop = () => {
        console.log('[Recorder] MediaRecorder stopped, emitting "end"')
        socket.emit('end')
      }

      console.log('[Recorder] Starting MediaRecorder with 250ms chunks')
      mediaRecorder.current.start(250) // Send chunks every 250ms
      setIsRecording(true)
      console.log('[Recorder] Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    console.log('[Recorder] stopRecording invoked')
    mediaRecorder.current?.stop()
    stream.current?.getTracks().forEach((track) => track.stop())
    setIsRecording(false)
    console.log('[Recorder] Recording stopped')
  }

  useEffect(() => {
    const handleTranscription = ({
      transcript,
      isFinal
    }: TranscriptionPayload) => {
      if (isFinal) {
        console.log(`[Transcription] FINAL: "${transcript}"`)
        setFinalTranscription((prev) => `${prev} ${transcript}`.trim())
        setInterimTranscription('')
      } else {
        console.log(`[Transcription] INTERIM: "${transcript}"`)
        setInterimTranscription(transcript)
      }
    }

    socket.on('transcription', handleTranscription)
    return () => {
      socket.off('transcription', handleTranscription)
    }
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    finalTranscription,
    interimTranscription
  }
}

export default useRecorder
