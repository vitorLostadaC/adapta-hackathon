import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { createServer } from 'http'
import multer from 'multer'
import path from 'path'
import { openai } from './services/open-ai'

const app = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    // Preserve original extension so OpenAI can detect the audio format
    const ext = path.extname(file.originalname) || '.webm'
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({ storage })
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }

    const audioPath = file.path

    console.time('openai')
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: 'pt'
    })
    console.timeEnd('openai')

    console.log(transcription.text)

    // Remove temporary uploaded file
    fs.unlinkSync(audioPath)

    return res.json({ transcription: transcription.text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

server.listen(3333, () => {
  console.log(`Server running on port ${3333}`)
})
