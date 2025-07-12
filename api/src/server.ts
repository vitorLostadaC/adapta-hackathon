import http from 'http'
import { Server, Socket } from 'socket.io'
import { speechToText } from './services/speech-to-text'

const httpServer = http.createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

io.on('connection', (socket: Socket) => {
  console.log('Client connected', socket.handshake.query.sessionId)
  socket.sessionId = socket.handshake.query.sessionId as string

  const recognizeStream = speechToText
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
        console.log(`Transcript: ${transcript} [isFinal: ${isFinal}]`)
      }
    })

  socket.on('audio', (data) => {
    if (recognizeStream.writable) {
      recognizeStream.write(data)
    }
  })

  socket.on('end', () => {
    recognizeStream.end()
  })

  socket.on('disconnect', () => {
    recognizeStream.end()
  })
})

httpServer.listen(3333, () => {
  console.log('Server listening on 3333')
})
