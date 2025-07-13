import { googleSpeechClient } from '../lib/google-speech'

export const createSpeechToTextStream = () =>
  googleSpeechClient.streamingRecognize({
    config: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 16000,
      languageCode: 'pt-BR',
      model: 'latest_short',
      enableAutomaticPunctuation: true
    },
    interimResults: true,
    singleUtterance: true
  })
