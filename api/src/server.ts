import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { initTranscriptionListener } from './listeners/transcriptionListener'
import transcriptionRouter from './routes/transcription'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

app.use('/', transcriptionRouter)

initTranscriptionListener(io)

server.listen(3333, () => {
  console.log(`Server running on port ${3333}`)
})
