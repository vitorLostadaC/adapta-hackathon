import speech from '@google-cloud/speech'
import { env } from '../env'

const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

export const googleSpeechClient = new speech.SpeechClient({
  projectId: env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey
  }
})
