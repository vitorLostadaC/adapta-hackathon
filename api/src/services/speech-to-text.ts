import { googleSpeechClient } from "../lib/google-speech";

export const speechToText =  googleSpeechClient
.streamingRecognize({
  config: {
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 16000,
    languageCode: 'pt-BR',
    enableSpeakerDiarization: true,
    model: 'latest_long',
    diarizationConfig: {
      enableSpeakerDiarization: true,
      minSpeakerCount: 2,
      maxSpeakerCount: 2,
    }
  },
  interimResults: true,
})

