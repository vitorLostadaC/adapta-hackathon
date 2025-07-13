import console from 'console'
import http from 'http'
import { Server, Socket } from 'socket.io'
import { supabase } from './lib/supabase'
import { createSpeechToTextStream } from './services/speech-to-text'

const httpServer = http.createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

io.on('connection', (socket: Socket) => {
  console.log('Client connected', socket.handshake.query.sessionId)
  socket.sessionId = socket.handshake.query.sessionId as string

  const createRecognizeStream = () => {
    console.log('[STT] Creating new recognize stream')

    const stream = createSpeechToTextStream()
      .on('error', (err) => {
        console.error(err)
        socket.disconnect()
      })
      .on('data', (data) => {
        const result = data.results[0]

        if (result) {
          const transcript = result.alternatives[0].transcript
          const isFinal = result.isFinal

          socket.emit('transcription', { transcript, isFinal })
          console.log(`[STT] Transcript: "${transcript}" | isFinal=${isFinal}`)

          if (isFinal) {
            supabase
              .from('transcriptions')
              .insert({
                session_id: socket.sessionId,
                transcript,
                type: socket.currentType
              })
              .then(({ error }) => {
                if (error) {
                  console.error(error)
                }
              })
          }
        }
      })

      // Debug when Google finishes the stream
      .on('end', () => {
        console.log('[STT] Google recognize stream ended (readable end)')
      })
      .on('close', () => {
        console.log('[STT] Google recognize stream closed')
      })

    // Debug writable finish
    stream.on('finish', () => {
      console.log('[STT] Recognize stream finished (writable finish)')
    })

    return stream
  }

  let recognizeStream = createRecognizeStream()

  socket.on('audio', (data) => {
    // Restart stream if user switched speaking role OR if current stream is already closed
    const streamEnded =
      recognizeStream.writableEnded || !recognizeStream.writable

    console.log(
      `[AUDIO] Received chunk - size: ${
        data.data?.byteLength ?? data.data?.size ?? 'unknown'
      } bytes | type: ${data.type} | streamEnded: ${streamEnded}`
    )

    if (socket.currentType !== data.type || streamEnded) {
      // End the previous stream if it is still open
      if (!recognizeStream.writableEnded) {
        recognizeStream.end()
      }

      socket.currentType = data.type
      recognizeStream = createRecognizeStream()
    }

    // At this point we are guaranteed to have a writable stream
    if (recognizeStream.writable) {
      recognizeStream.write(data.data)
    }
  })

  socket.on('end', () => {
    recognizeStream.end()
    // prepare new stream for potential next segment
    recognizeStream = createRecognizeStream()
  })

  socket.on('disconnect', () => {
    recognizeStream.end()
  })
})

httpServer.listen(3333, () => {
  console.log('Server listening on 3333')
})
