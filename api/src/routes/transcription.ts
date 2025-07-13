import express, { Router } from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { speedAudio } from '../lib/audio'
import { groq } from '../lib/groq'
import { supabase } from '../lib/supabase'

const router: Router = express.Router()

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({ storage })

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const { type } = req.query
    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }

    const audioPath = file.path

    const speededPath = speedAudio(audioPath, 2)

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(speededPath),
      model: 'whisper-large-v3-turbo',
      language: 'pt'
    })

    fs.unlinkSync(audioPath)
    fs.unlinkSync(speededPath)

    await supabase.from('transcriptions').insert({
      transcript: transcription.text,
      session_id: '123',
      type: type as 'user' | 'customer'
    })

    return res.json({ transcription: transcription.text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
})

export default router
