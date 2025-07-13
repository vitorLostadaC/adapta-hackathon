import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { createServer } from 'http'
import multer from 'multer'
import path from 'path'
import { Server } from 'socket.io'
import { mockedRag } from './data/data'
import { speedAudio } from './lib/audio'
import { groq } from './lib/groq'
import { supabase } from './lib/supabase'

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

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({ storage })
app.post('/transcribe', upload.single('audio'), async (req, res) => {
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

    console.log(type, transcription.text)

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

// supabase
//   .channel('schema-db-changes')
//   .on(
//     'postgres_changes',
//     {
//       schema: 'public', // Subscribes to the "public" schema in Postgres
//       event: '*' // Listen to all changes
//     },
//     (payload) => console.log(payload)
//   )
//   .subscribe()

supabase.realtime
  .channel('transcriptions')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'transcriptions' },
    async (payload) => {
      const lastMessage = payload.new

      if (lastMessage.type !== 'customer') return

      const lastsMessages = await supabase
        .from('transcriptions')
        .select('*')
        .eq('session_id', lastMessage.session_id)
        .order('created_at', { ascending: true })
        .limit(30)

      const messages = lastsMessages.data?.map((message) => ({
        role: 'user',
        name: message.type,
        content: message.transcript
      }))

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `<instructions>
    <identity>
        - Você é um assistente de atendimento ao cliente especializado em fornecer insights valiosos para vendedores durante chamadas.
    </identity>
    <purpose>
        - Seu principal objetivo é auxiliar os vendedores oferecendo insights e informações relevantes que possam melhorar seu desempenho durante as chamadas de vendas.
    </purpose>
    <context>
        - Você opera em um ambiente de atendimento ao cliente onde as chamadas de vendas são uma parte crucial do processo de negócios.
        - Os vendedores contam com você para fornecer insights e dados em tempo real para ajudá-los a fechar negócios e melhorar a satisfação do cliente.
    </context>
    <task>
        - Analisar o contexto da chamada de vendas e extrair informações-chave que possam ser usadas para fornecer insights acionáveis.
        - Entregar insights concisos e relevantes que possam ser imediatamente aplicados pelo vendedor durante a chamada.
        - Garantir que os insights sejam adaptados às necessidades e objetivos específicos da chamada de vendas.
    </task>
    <constraints>
        - Não forneça qualquer introdução, preâmbulo ou comentário; apenas entregue os insights.
        - Caso nao tenha nada relevante para responder, e ja tenha respondido sobre assunto anterior, não responda nada.
        - Respostas curtas e diretas.
        - Assegure-se de que os insights sejam claros, concisos e diretamente aplicáveis ao contexto de vendas.
        - Evite usar jargões técnicos, a menos que sejam necessários e compreendidos pelo vendedor.
    </constraints>
    <examples>
        <example>
            <input>
                - O vendedor está em uma chamada com um cliente potencial interessado no produto X.
            </input>
            <output>
                - Destaque as características únicas do produto X que o diferenciam dos concorrentes.
                - Mencione quaisquer promoções ou descontos atuais disponíveis para o produto X.
                - Forneça dados sobre as classificações recentes de satisfação do cliente para o produto X.
                - Não forneça qualquer informação da qual não tenha certeza.
            </output>
        </example>
    </examples>
</instructions>`
          },
          {
            role: 'tool',
            tool_call_id: '123',
            content: mockedRag
          },
          // shiii 🤫
          ...((messages as any) || [])
        ],
        max_completion_tokens: 50,
        model: 'llama3-8b-8192'
      })

      const response = chatCompletion.choices[0]?.message.content

      const connectedSockets = io.sockets.sockets

      if (!response) return

      // I'm doing a broadcast because I dont want put the sessionId now, just focus on the demo
      connectedSockets.forEach((socket) => {
        socket.emit('message', response)
      })
    }
  )
  .subscribe()

server.listen(3333, () => {
  console.log(`Server running on port ${3333}`)
})
