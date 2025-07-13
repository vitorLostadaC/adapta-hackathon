import { Server as SocketIOServer } from 'socket.io'
import { mockedRag } from '../data/data'
import { groq } from '../lib/groq'
import { supabase } from '../lib/supabase'

export function initTranscriptionListener(io: SocketIOServer): void {
  supabase.realtime
    .channel('transcriptions')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'transcriptions' },
      async (payload) => {
        const lastMessage = payload.new as {
          type: 'user' | 'customer'
          session_id: string
        }

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
            // shii 🤫
            ...((messages as any) || [])
          ],
          max_completion_tokens: 50,
          model: 'llama3-8b-8192'
        })

        const response = chatCompletion.choices[0]?.message.content

        if (!response) return

        // Broadcast the response to all connected clients (demo purpose)
        io.sockets.sockets.forEach((socket) => {
          socket.emit('message', response)
        })
      }
    )
    .subscribe()
}
