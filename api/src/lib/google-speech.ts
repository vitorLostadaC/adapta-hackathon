import speech from "@google-cloud/speech";

 const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export const googleSpeechClient = new speech.SpeechClient({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey
  }
});
