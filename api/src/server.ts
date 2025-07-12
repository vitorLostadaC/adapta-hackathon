import http from 'http'
import { Server } from 'socket.io'
import { speechToText } from './services/speech-to-text'

const httpServer = http.createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

io.on('connection', (socket) => {
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
